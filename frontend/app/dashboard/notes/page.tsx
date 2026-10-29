'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageSquare, Calendar, Stethoscope } from 'lucide-react';

export default function PatientNotes() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch notes joined with blood test and doctor profile
      const { data } = await supabase
        .from('doctor_notes')
        .select(`
          id,
          note,
          created_at,
          blood_tests (test_date, risk_score),
          profiles:doctor_id (full_name, specialization)
        `)
        .order('created_at', { ascending: false });

      // Filter to only show notes for this patient's tests
      // (The RLS policy handles security, but we filter the view)
      const myNotes = data?.filter((n: any) => n.blood_tests !== null) || [];
      
      setNotes(myNotes);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-500">Loading notes…</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <MessageSquare className="w-8 h-8 text-indigo-600" />
        Doctor Notes
      </h1>
      <p className="text-slate-500 mb-8">Clinical observations from your hematologist.</p>

      {notes.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow text-center">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No notes have been added to your tests yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((n) => (
            <div key={n.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow border-l-4 border-indigo-500">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  <Stethoscope className="w-4 h-4" />
                  {n.profiles?.full_name || 'Doctor'} 
                  <span className="text-xs font-normal text-slate-500">
                    ({n.profiles?.specialization})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="w-3 h-3" />
                  {new Date(n.created_at).toLocaleDateString()}
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                {n.note}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">
                Regarding blood test from: {n.blood_tests?.test_date} (Risk: {(n.blood_tests?.risk_score * 100).toFixed(1)}%)
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}