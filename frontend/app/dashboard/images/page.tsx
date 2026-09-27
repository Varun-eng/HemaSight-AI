'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

const CLASS_NAMES = ['ALL', 'AML', 'CLL', 'CML', 'Healthy'];
const CLASS_FULL = [
  'Acute Lymphoblastic Leukemia',
  'Acute Myeloid Leukemia',
  'Chronic Lymphocytic Leukemia',
  'Chronic Myeloid Leukemia',
  'Healthy (Normal Cells)',
];

export default function Images() {
  const [classId, setClassId] = useState<number | null>(null);
  const [cbc, setCbc] = useState<any>(null);
  const [cgan, setCgan] = useState<string | null>(null);
  const [rendered, setRendered] = useState<string | null>(null);   // ← NEW
  const [matched, setMatched] = useState<string | null>(null);
  const [matchedName, setMatchedName] = useState('');
  const [similarity, setSimilarity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Fetch class + CBC
  useEffect(() => {
    (async () => {
      const urlClass = searchParams.get('class');
      if (urlClass !== null && !isNaN(Number(urlClass))) {
        setClassId(Number(urlClass));
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('blood_tests')
        .select('*')
        .eq('patient_id', user.id)
        .order('test_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const cbcData = {
          wbc: data.wbc ?? 7,
          rbc: data.rbc ?? 5,
          hgb: data.hemoglobin ?? 14,
          plt: data.platelets ?? 250,
          anc: (data.wbc ?? 7) * 0.6,
          blasts: data.blast_percentage ?? 0,
          rdw: 13.5,
        };
        setCbc(cbcData);

        if (urlClass === null) {
          setClassId(detectClass(cbcData));
        }
      }
    })();
  }, [searchParams]);

  // Generate when classId + cbc ready
  useEffect(() => {
    if (classId === null) return;
    generate(classId);
  }, [classId, cbc]);

  const detectClass = (d: any) => {
    if (d.blasts < 5 && d.wbc < 11 && d.plt > 150) return 4;
    if (d.blasts >= 20) return d.wbc > 20 ? 1 : 0;
    if (d.wbc > 15) return d.plt < 200 ? 3 : 2;
    return 1;
  };

  const generate = async (cid: number) => {
    setLoading(true);
    setError('');
    setCgan(null);
    setRendered(null);
    setMatched(null);

    try {
      const CGAN_API = process.env.NEXT_PUBLIC_CGAN_API!;
      const body: any = {
        class_id: cid,
        magnification: cid === 4 ? '100x' : '1000x',
        show_annotations: cid !== 4,
      };
      if (cbc) body.cbc = cbc;

      const res = await fetch(`${CGAN_API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      if (data.generated_image_base64) {
        setCgan(`data:image/png;base64,${data.generated_image_base64}`);
      }
      if (data.rendered_image_base64) {
        setRendered(`data:image/png;base64,${data.rendered_image_base64}`);  // ← NEW
      }
      setSimilarity(data.similarity_score || 0);

      if (data.matched_dataset_image_base64) {
        setMatched(`data:image/png;base64,${data.matched_dataset_image_base64}`);
        setMatchedName(data.matched_dataset_filename || 'dataset image');
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  if (classId === null) {
    return <div className="max-w-5xl mx-auto px-6 py-10 text-center">Loading…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">🧬 Microscopic Visualization</h1>
<p className="text-slate-500 mb-6">
  Wright-Giemsa rendered image compared with closest match from our clinical dataset.
</p>

      <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 mb-6">
        <p className="text-sm text-indigo-600 dark:text-indigo-300 font-medium mb-1">
          Detected cell type
        </p>
        <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
          {CLASS_NAMES[classId]} — {CLASS_FULL[classId]}
        </p>
        <div className="flex gap-3 mt-3 items-end">
          <select
            value={classId}
            onChange={(e) => setClassId(Number(e.target.value))}
            className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          >
            {CLASS_NAMES.map((n, i) => (
              <option key={i} value={i}>{n} — {CLASS_FULL[i]}</option>
            ))}
          </select>
          <button
            onClick={() => generate(classId)}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Regenerate'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Wright-Giemsa render */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow">
          <h3 className="font-bold mb-3 text-sm">
            🎨 Wright-Giemsa Render
            <span className="text-xs font-normal text-slate-500 ml-1">(CBC-based)</span>
          </h3>
          <div className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
            {loading && <p className="text-slate-400 text-sm">Rendering…</p>}
            {!loading && rendered && <img src={rendered} alt="rendered" className="w-full h-full object-cover" />}
            {!loading && !rendered && <p className="text-slate-400 text-xs text-center px-4">No render</p>}
          </div>
        </div>

       

        {/* Dataset match */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow">
          <h3 className="font-bold mb-3 text-sm">
            🖼 Dataset Match
            {similarity > 0 && (
              <span className="text-xs font-normal text-green-600 dark:text-green-400 ml-1">
                {(similarity * 100).toFixed(1)}%
              </span>
            )}
          </h3>
          <div className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
            {loading && <p className="text-slate-400 text-sm">Searching…</p>}
            {!loading && matched && <img src={matched} alt="matched" className="w-full h-full object-cover" />}
            {!loading && !matched && <p className="text-slate-400 text-xs text-center px-4">No match</p>}
          </div>
          {matchedName && <p className="text-xs text-slate-500 mt-2 truncate">📄 {matchedName}</p>}
        </div>
      </div>

      {cbc && (
        <div className="mt-6 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow">
          <h3 className="font-bold mb-3 text-sm">📊 CBC Parameters</h3>
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3 text-xs">
            {[
              ['WBC', cbc.wbc, 'k/µL'],
              ['RBC', cbc.rbc, 'M/µL'],
              ['HGB', cbc.hgb, 'g/dL'],
              ['PLT', cbc.plt, 'k/µL'],
              ['ANC', cbc.anc?.toFixed(2), ''],
              ['Blasts', cbc.blasts, '%'],
              ['RDW', cbc.rdw, '%'],
            ].map(([k, v, unit]: any) => (
              <div key={k}>
                <p className="text-slate-500">{k}</p>
                <p className="font-bold">{v} {unit}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}