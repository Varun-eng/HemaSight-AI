'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, FileText, AlertCircle, TrendingUp,
  Search, Stethoscope, LogOut, Activity,
} from 'lucide-react';

interface PatientRow {
  id: string;
  full_name: string;
  created_at: string;
  last_test?: {
    test_date: string;
    risk_score: number;
    risk_flag: boolean;
    blast_percentage: number;
  };
  test_count: number;
}

export default function DoctorDashboard() {
  const [doctor, setDoctor] = useState<any>(null);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [filtered, setFiltered] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    highRisk: 0,
    totalTests: 0,
  });
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      patients.filter(
        (p) =>
          p.full_name?.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      )
    );
  }, [search, patients]);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/doctor/login'); return; }

    // Verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'doctor' && profile?.role !== 'admin') {
      router.push('/login');
      return;
    }

    setDoctor(profile);

    // Fetch all patients
    const { data: patientList } = await supabase
      .from('profiles')
      .select('id, full_name, created_at')
      .eq('role', 'patient')
      .order('created_at', { ascending: false });

    if (!patientList) { setLoading(false); return; }

    // Enrich with latest blood test info
    const enriched = await Promise.all(
      patientList.map(async (p) => {
        const { data: tests, count } = await supabase
          .from('blood_tests')
          .select('test_date, risk_score, risk_flag, blast_percentage', {
            count: 'exact',
          })
          .eq('patient_id', p.id)
          .order('test_date', { ascending: false })
          .limit(1);

        return {
          ...p,
          last_test: tests?.[0] || undefined,
          test_count: count || 0,
        };
      })
    );

    setPatients(enriched);
    setStats({
      totalPatients: enriched.length,
      highRisk: enriched.filter((p) => p.last_test?.risk_flag).length,
      totalTests: enriched.reduce((sum, p) => sum + p.test_count, 0),
    });
    setLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/doctor/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading patients…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/50 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg">
                Dr. {doctor?.full_name || 'Doctor'}
              </h1>
              <p className="text-xs text-slate-500">
                {doctor?.specialization || 'Hematology'} ·{' '}
                {doctor?.hospital || 'HemaSight Partner'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={Users}
            label="Total Patients"
            value={stats.totalPatients}
            color="teal"
          />
          <StatCard
            icon={AlertCircle}
            label="High-Risk Patients"
            value={stats.highRisk}
            color="red"
          />
          <StatCard
            icon={FileText}
            label="Total Blood Tests"
            value={stats.totalTests}
            color="indigo"
          />
        </div>

        {/* Search */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient by name or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
          <span className="text-sm text-slate-500">
            {filtered.length} of {patients.length}
          </span>
        </div>

        {/* Patients Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-left text-xs text-slate-500 uppercase">
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Tests</th>
                <th className="px-6 py-3">Last Test</th>
                <th className="px-6 py-3">Risk Score</th>
                <th className="px-6 py-3">Blasts</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-4">
                    <p className="font-medium">{p.full_name || 'Anonymous'}</p>
                    <p className="text-xs text-slate-400 font-mono">
                      {p.id.slice(0, 8)}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm">{p.test_count}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {p.last_test?.test_date || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {p.last_test
                      ? `${(p.last_test.risk_score * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {p.last_test
                      ? `${p.last_test.blast_percentage ?? 0}%`
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {p.last_test ? (
                      p.last_test.risk_flag ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400">
                          High Risk
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">
                          Stable
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-slate-400">No tests</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/doctor/patient/${p.id}`}
                      className="text-sm text-teal-600 dark:text-teal-400 font-medium hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">
              {patients.length === 0
                ? 'No patients registered yet.'
                : 'No patients match your search.'}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: 'teal' | 'red' | 'indigo';
}) {
  const colors = {
    teal: 'bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400',
    red: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400',
  };
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}