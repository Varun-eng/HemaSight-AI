'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { analyzeTimeSeries } from '@/lib/ai';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Monitoring() {
  const supabase = createClient();
  const [records, setRecords] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('blood_tests')
        .select('*')
        .eq('patient_id', user.id)
        .order('test_date', { ascending: true });
      setRecords(data || []);
    })();
  }, []);

  const runAnalysis = async () => {
    if (records.length < 3) { alert('Need at least 3 records.'); return; }
    setLoading(true);
    try {
      const res = await analyzeTimeSeries(
        records.map((r) => ({
          date: r.test_date, wbc: r.wbc, rbc: r.rbc,
          hemoglobin: r.hemoglobin, platelets: r.platelets,
          blast_percentage: r.blast_percentage,
        }))
      );
      setAnalysis(res);
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">📈 Relapse Monitoring</h1>
      <p className="text-slate-500 mb-8">Time-series analysis detects early relapse signals.</p>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow mb-6">
        <h2 className="font-bold mb-4">Blood Marker Trends</h2>
        <div style={{ height: 350 }}>
          <ResponsiveContainer>
            <LineChart data={records}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="test_date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="wbc" stroke="#6366f1" />
              <Line type="monotone" dataKey="hemoglobin" stroke="#ef4444" />
              <Line type="monotone" dataKey="platelets" stroke="#10b981" />
              <Line type="monotone" dataKey="blast_percentage" stroke="#f59e0b" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <button
          onClick={runAnalysis} disabled={loading}
          className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
        >
          {loading ? 'Analyzing…' : 'Run Relapse Analysis'}
        </button>
      </div>

      {analysis && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow">
          <h2 className="font-bold text-xl mb-2">Relapse Risk: {(analysis.relapse_risk * 100).toFixed(1)}%</h2>
          <p className="mb-4">{analysis.status}</p>
          <h3 className="font-bold mb-2">Marker Trends</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {Object.entries(analysis.trends).map(([k, v]: any) => (
              <div key={k} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <p className="font-semibold">{k}</p>
                <p className="text-sm">{v.direction} (slope {v.slope})</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}