'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Stethoscope, Plus, Check, Loader2 } from 'lucide-react';

export default function PatientDetail() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for Doctor Notes
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      // Verify doctor role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/doctor/login'); return; }

      const { data: me } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
      if (me?.role !== 'doctor' && me?.role !== 'admin') {
        router.push('/login'); return;
      }

      // Load patient profile
      const { data: p } = await supabase
        .from('profiles').select('*').eq('id', patientId).single();
      setPatient(p);

      // Load blood tests AND their associated doctor notes
      const { data: bt } = await supabase
        .from('blood_tests')
        .select(`
          *,
          doctor_notes (
            id,
            note,
            created_at,
            profiles:doctor_id (full_name)
          )
        `)
        .eq('patient_id', patientId)
        .order('test_date', { ascending: false });
        
      setTests(bt || []);
      setLoading(false);
    })();
  }, [patientId, router]);

  const saveNote = async (testId: string) => {
    if (!noteText.trim()) return;
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('doctor_notes').insert({
      blood_test_id: testId,
      doctor_id: user?.id,
      note: noteText
    });

    if (error) {
      alert("Error saving note: " + error.message);
    } else {
      // Refresh the tests list to show the new note
      const { data: bt } = await supabase
        .from('blood_tests')
        .select(`
          *,
          doctor_notes (
            id,
            note,
            created_at,
            profiles:doctor_id (full_name)
          )
        `)
        .eq('patient_id', patientId)
        .order('test_date', { ascending: false });
        
      setTests(bt || []);
      setNoteText('');
      setActiveTest(null);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Loading patient records…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/doctor/dashboard"
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Stethoscope className="w-6 h-6 text-teal-600" />
          <div>
            <h1 className="font-bold text-lg">{patient?.full_name || 'Patient'}</h1>
            <p className="text-xs text-slate-500 font-mono">
              ID: {patientId.slice(0, 12)}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-4">Blood Test History</h2>
        <p className="text-sm text-slate-500 mb-6">
          {tests.length} test{tests.length !== 1 ? 's' : ''} on record
        </p>

        <div className="space-y-4">
          {tests.map((t) => (
            <div
              key={t.id}
              className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border-l-4 ${
                t.risk_flag ? 'border-red-500' : 'border-green-500'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold">{t.test_date}</p>
                  <p className="text-xs text-slate-500">
                    Risk: {(t.risk_score * 100).toFixed(1)}% ·{' '}
                    {t.risk_flag ? '⚠️ High' : '✅ Normal'}
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {t.id.slice(0, 8)}
                </span>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs mb-4">
                <Param label="WBC" value={t.wbc} unit="k/µL" />
                <Param label="RBC" value={t.rbc} unit="M/µL" />
                <Param label="Hgb" value={t.hemoglobin} unit="g/dL" />
                <Param label="PLT" value={t.platelets} unit="k/µL" />
                <Param label="Blasts" value={t.blast_percentage} unit="%" />
                {t.chimerism !== null && (
                  <Param label="Chimerism" value={t.chimerism} unit="%" />
                )}
              </div>

              {/* Render existing notes */}
              {t.doctor_notes && t.doctor_notes.length > 0 && (
                <div className="mb-4 space-y-2">
                  {t.doctor_notes.map((note: any) => (
                    <div key={note.id} className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg text-sm border border-teal-100 dark:border-teal-800">
                      <p className="text-xs font-bold text-teal-700 dark:text-teal-400 mb-1">
                        📝 Note by {note.profiles?.full_name || 'Doctor'}
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 italic">
                        "{note.note}"
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new note UI */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                {activeTest === t.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Write clinical observation…"
                      className="w-full p-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => saveNote(t.id)} 
                        disabled={saving} 
                        className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 flex items-center gap-2 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4"/>}
                        {saving ? 'Saving…' : 'Save Note'}
                      </button>
                      <button 
                        onClick={() => setActiveTest(null)} 
                        className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => { setActiveTest(t.id); setNoteText(''); }} 
                    className="text-sm text-teal-600 dark:text-teal-400 font-medium hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add Doctor Note
                  </button>
                )}
              </div>

            </div>
          ))}

          {tests.length === 0 && (
            <p className="text-center py-10 text-slate-500">
              No blood tests recorded for this patient yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function Param({ label, value, unit }: any) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-bold">
        {value ?? '—'} {unit}
      </p>
    </div>
  );
}