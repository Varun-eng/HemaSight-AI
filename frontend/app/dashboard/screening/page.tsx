'use client';
import { useState } from 'react';
import { runXGBoost } from '@/lib/ai';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { UploadReport } from '@/components/upload-report';
import type { ParsedCBC } from '@/lib/reportOCR';

const CORE_FIELDS = [
  { key: 'wbc', label: 'WBC (10³/µL)', placeholder: 'e.g., 7.2', hint: 'Normal: 4.5 – 11.0' },
  { key: 'rbc', label: 'RBC (10⁶/µL)', placeholder: 'e.g., 5.1', hint: 'Normal: 4.2 – 6.0' },
  { key: 'hemoglobin', label: 'Hemoglobin (g/dL)', placeholder: 'e.g., 14.8', hint: 'Normal: 12.0 – 16.0' },
  { key: 'platelets', label: 'Platelets (10³/µL)', placeholder: 'e.g., 250', hint: 'Normal: 150 – 450' },
  { key: 'blast_percentage', label: 'Blast %', placeholder: 'e.g., 1.2', hint: 'Normal: 0 – 0.5' },
];

const EXTENDED_FIELDS = [
  { key: 'total_count', label: 'Total Count', placeholder: 'e.g., 7500' },
  { key: 'neutrophils', label: 'Neutrophils %', placeholder: 'e.g., 60' },
  { key: 'lymphocytes', label: 'Lymphocytes %', placeholder: 'e.g., 30' },
  { key: 'monocytes', label: 'Monocytes %', placeholder: 'e.g., 6' },
  { key: 'eosinophils', label: 'Eosinophils %', placeholder: 'e.g., 3' },
  { key: 'basophils', label: 'Basophils %', placeholder: 'e.g., 1' },
  { key: 'rdw', label: 'RDW %', placeholder: 'e.g., 13.5' },
  { key: 'sgot', label: 'SGOT (AST) U/L', placeholder: 'e.g., 24' },
  { key: 'sgpt', label: 'SGPT (ALT) U/L', placeholder: 'e.g., 26' },
  { key: 'creatinine', label: 'Creatinine mg/dL', placeholder: 'e.g., 0.9' },
  { key: 'potassium', label: 'Potassium mmol/L', placeholder: 'e.g., 4.2' },
  { key: 'chimerism', label: 'Chimerism %', placeholder: 'e.g., 99.5' },
];

const GVHD_OPTIONS = ['none', 'skin', 'gut', 'liver', 'multi'];

const EMPTY_FORM = {
  wbc: '', rbc: '', hemoglobin: '', platelets: '', blast_percentage: '',
  total_count: '', neutrophils: '', lymphocytes: '', monocytes: '',
  eosinophils: '', basophils: '', rdw: '',
  sgot: '', sgpt: '', creatinine: '', potassium: '', chimerism: '',
  gvhd: 'none', notes: '',
};

export default function Screening() {
  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY_FORM });
  const [showExtended, setShowExtended] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Apply OCR result
  const applyExtracted = (parsed: ParsedCBC) => {
    const updates: Record<string, string> = {};
    const keys = [
      'wbc', 'rbc', 'hemoglobin', 'platelets', 'blast_percentage',
      'total_count', 'neutrophils', 'lymphocytes', 'monocytes',
      'eosinophils', 'basophils', 'rdw',
      'sgot', 'sgpt', 'creatinine', 'potassium', 'chimerism',
    ];
    keys.forEach((k) => {
      const v = (parsed as any)[k];
      if (v !== undefined && v !== null) updates[k] = String(v);
    });
    if (parsed.gvhd) updates.gvhd = parsed.gvhd;
    setForm((prev) => ({ ...prev, ...updates }));
    setShowExtended(true); // Show extended section since we filled it
  };

  const submit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setResult(null);

  try {
    // 1. Build the payload — strip empty strings and NaN
    const rawData: any = {
      wbc: parseFloat(form.wbc),
      rbc: parseFloat(form.rbc),
      hemoglobin: parseFloat(form.hemoglobin),
      platelets: parseFloat(form.platelets),
      blast_percentage: parseFloat(form.blast_percentage),
    };

    // Optional numeric fields
    const optionalNumericKeys = [
      'total_count', 'neutrophils', 'lymphocytes', 'monocytes',
      'eosinophils', 'basophils', 'rdw', 'sgot', 'sgpt',
      'creatinine', 'potassium', 'chimerism',
    ];
    optionalNumericKeys.forEach((k) => {
      const v = form[k];
      if (v && v.trim() !== '') {
        const num = parseFloat(v);
        if (!isNaN(num)) rawData[k] = num;
      }
    });
    if (form.gvhd && form.gvhd !== 'none') rawData.gvhd = form.gvhd;
    if (form.notes) rawData.notes = form.notes;

    // 2. Validate required fields aren't NaN
    const required = ['wbc', 'rbc', 'hemoglobin', 'platelets', 'blast_percentage'];
    for (const k of required) {
      if (isNaN(rawData[k])) {
        throw new Error(`Invalid ${k} — please enter a number`);
      }
    }

    // 3. Call XGBoost API
    const res = await runXGBoost(rawData);
    setResult(res);

    // 4. Save to Supabase
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    console.log('[Screening] Auth user:', user);
    console.log('[Screening] User error:', userErr);

    if (!user) {
      console.error('[Screening] No logged-in user — cannot save');
      alert('⚠️ You must be logged in to save results. Please log in again.');
      setLoading(false);
      return;
    }

    // Only include columns that exist in the schema
    const insertPayload: any = {
      patient_id: user.id,
      test_date: new Date().toISOString().split('T')[0],
      wbc: rawData.wbc,
      rbc: rawData.rbc,
      hemoglobin: rawData.hemoglobin,
      platelets: rawData.platelets,
      blast_percentage: rawData.blast_percentage,
      risk_score: res.risk_score,
      risk_flag: res.risk_flag,
    };

    // Add optional fields if present
    optionalNumericKeys.forEach((k) => {
      if (rawData[k] !== undefined) insertPayload[k] = rawData[k];
    });
    if (rawData.gvhd) insertPayload.gvhd = rawData.gvhd;
    if (rawData.notes) insertPayload.notes = rawData.notes;

    console.log('[Screening] Inserting payload:', insertPayload);

    const { data: bt, error: insertErr } = await supabase
      .from('blood_tests')
      .insert(insertPayload)
      .select()
      .single();

    console.log('[Screening] Insert result:', bt);
    console.log('[Screening] Insert error:', insertErr);

    if (insertErr) {
      console.error('[Screening] ❌ Failed to save:');
console.error('Message:', insertErr?.message);
console.error('Code:', insertErr?.code);
console.error('Details:', insertErr?.details);
console.error('Hint:', insertErr?.hint);
console.error('Full error JSON:', JSON.stringify(insertErr, null, 2));
      alert(`⚠️ Result computed but not saved: ${insertErr.message}`);
      setLoading(false);
      return;
    }

    // 5. Create analysis session
    const { error: sessionErr } = await supabase
      .from('analysis_sessions')
      .insert({
        patient_id: user.id,
        blood_test_id: bt.id,
        current_stage: res.risk_flag ? 'cgan' : 'completed',
        result_summary: res.interpretation,
      });

    if (sessionErr) {
      console.warn('[Screening] Session save warning:', sessionErr);
      // Don't block — session is optional
    } else {
      console.log('[Screening] ✅ Saved successfully');
    }
  } catch (err: any) {
    console.error('[Screening] Error:', err);
    alert('Error: ' + err.message);
  }
  setLoading(false);
};
  const fillHealthySample = () => {
    setForm({
      ...EMPTY_FORM,
      wbc: '7.2', rbc: '5.1', hemoglobin: '14.8',
      platelets: '290', blast_percentage: '1.2',
      total_count: '7500', neutrophils: '60', lymphocytes: '30',
      rdw: '13.5', sgot: '24', sgpt: '26', creatinine: '0.9',
      potassium: '4.2', chimerism: '99.5',
    });
    setShowExtended(true);
  };

  const fillHighRiskSample = () => {
    setForm({
      ...EMPTY_FORM,
      wbc: '48.5', rbc: '2.8', hemoglobin: '8.2',
      platelets: '55', blast_percentage: '72',
      total_count: '48000', neutrophils: '15', lymphocytes: '10',
      rdw: '18', sgot: '85', sgpt: '92', creatinine: '1.8',
      potassium: '5.8', chimerism: '78', gvhd: 'liver',
    });
    setShowExtended(true);
  };

  const clearForm = () => {
    setForm({ ...EMPTY_FORM });
    setResult(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">🔬 Blood Test Screening</h1>
      <p className="text-slate-500 mb-6">
        Enter values manually, or upload a photo of your lab report to auto-fill.
      </p>

      {/* OCR Upload */}
      <UploadReport onExtracted={applyExtracted} />

      {/* Quick fill */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button type="button" onClick={fillHealthySample}
          className="px-3 py-1.5 text-sm rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300">
          ✅ Fill Healthy Sample
        </button>
        <button type="button" onClick={fillHighRiskSample}
          className="px-3 py-1.5 text-sm rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          🚨 Fill High-Risk Sample
        </button>
        <button type="button" onClick={clearForm}
          className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400">
          Clear
        </button>
      </div>

      <form onSubmit={submit} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow space-y-4">
        {/* Core */}
        <div>
          <h2 className="font-bold text-sm text-slate-600 dark:text-slate-400 mb-3">
            Core CBC (required)
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {CORE_FIELDS.map(({ key, label, placeholder, hint }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  type="number" step="0.01" required
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-400 mt-1">{hint}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Toggle extended */}
        <button
          type="button"
          onClick={() => setShowExtended(!showExtended)}
          className="text-sm text-indigo-600 dark:text-indigo-400 font-medium"
        >
          {showExtended ? '− Hide' : '+ Show'} extended parameters (differential, liver, kidney, transplant markers)
        </button>

        {showExtended && (
          <>
            <div>
              <h2 className="font-bold text-sm text-slate-600 dark:text-slate-400 mb-3">
                Extended CBC & Differential
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {EXTENDED_FIELDS.slice(0, 7).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium mb-1">{label}</label>
                    <input
                      type="number" step="0.01"
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-bold text-sm text-slate-600 dark:text-slate-400 mb-3">
                Organ Function & Post-Transplant
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {EXTENDED_FIELDS.slice(7).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium mb-1">{label}</label>
                    <input
                      type="number" step="0.01"
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium mb-1">GVHD Type</label>
                  <select
                    value={form.gvhd}
                    onChange={(e) => setForm({ ...form, gvhd: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm"
                  >
                    {GVHD_OPTIONS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Notes</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any symptoms or clinical notes…"
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm"
              />
            </div>
          </>
        )}

        <button
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Analyzing…' : 'Run Screening'}
        </button>
      </form>

      {result && (
        <div className={`mt-6 p-6 rounded-2xl shadow-lg ${
          result.risk_flag
            ? 'bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500'
            : 'bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500'
        }`}>
          <p className="text-2xl font-bold mb-2">
            Risk Score: {(result.risk_score * 100).toFixed(2)}%
          </p>
          <p className="mb-2">{result.interpretation}</p>

          {result.predicted_class_name && (
            <p className="text-sm mb-4">
              Detected: <strong>{result.predicted_class_name}</strong>
              {result.predicted_class_full && ` — ${result.predicted_class_full}`}
            </p>
          )}

          {result.extended_flags && Object.keys(result.extended_flags).length > 0 && (
            <div className="mt-4 p-3 bg-white/60 dark:bg-slate-900/40 rounded-lg">
              <p className="text-xs font-bold mb-2 text-slate-600 dark:text-slate-400">
                ⚕️ Clinical Flags
              </p>
              <ul className="space-y-1 text-sm">
                {Object.entries(result.extended_flags).map(([k, v]: any) => (
                  <li key={k} className="flex items-start gap-2">
                    <span className="text-amber-600">•</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => router.push(`/dashboard/images?class=${result.predicted_class ?? 4}`)}
            className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
          >
            🧬 View Generated Image →
          </button>
        </div>
      )}
    </div>
  );
}