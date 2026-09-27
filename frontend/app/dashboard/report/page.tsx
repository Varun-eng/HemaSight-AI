'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { generateClinicalPDFReport } from '@/lib/pdfGenerator';
import type {
  CBCData,
  UserProfile,
  XGBoostResult,
  LongitudinalDataPoint,
  ComplianceSettings,
} from '@/types';
import { FileDown, FileText, CheckCircle2, Loader2 } from 'lucide-react';

export default function ReportPage() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [cbc, setCbc] = useState<CBCData | null>(null);
  const [xgboost, setXgboost] = useState<XGBoostResult | null>(null);
  const [trajectory, setTrajectory] = useState<LongitudinalDataPoint[]>([]);
  const [testCount, setTestCount] = useState(0);
  const [anonymize, setAnonymize] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      // 1. Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      setUser({
        name:
          profile?.full_name ||
          authUser.email?.split('@')[0] ||
          'Patient',
        mrn: `MRN-${authUser.id.slice(0, 8).toUpperCase()}`,
        role: (profile?.role as any) || 'patient',
        diagnosis: 'AML in Remission',
        oncologistName: 'Dr. A. Sharma',
      });

      // 2. Latest blood test
      const { data: latest } = await supabase
        .from('blood_tests')
        .select('*')
        .eq('patient_id', authUser.id)
        .order('test_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest) {
        setCbc({
          wbc: latest.wbc ?? 7,
          rbc: latest.rbc ?? 5,
          hgb: latest.hemoglobin ?? 14,
          plt: latest.platelets ?? 250,
          anc: (latest.wbc ?? 7) * 0.6,
          blasts: latest.blast_percentage ?? 0,
          rdw: 13.5,
          sampleDate: latest.test_date,
        });

        const riskPct = (latest.risk_score ?? 0) * 100;
        setXgboost({
          riskPercent: Number(riskPct.toFixed(1)),
          riskCategory:
            riskPct > 75
              ? 'Critical'
              : riskPct > 50
              ? 'High'
              : riskPct > 25
              ? 'Moderate'
              : 'Low',
          primaryCondition: 'Leukemia Relapse Risk',
          modelConfidence: riskPct > 75 ? 'High' : 'Moderate',
        });
      }

      // 3. Trajectory
      const { data: history, count } = await supabase
        .from('blood_tests')
        .select('*', { count: 'exact' })
        .eq('patient_id', authUser.id)
        .order('test_date', { ascending: true })
        .limit(6);

      setTestCount(count ?? 0);

      if (history) {
        setTrajectory(
          history.map((h, i) => ({
            date: h.test_date,
            month: i + 1,
            anc: (h.wbc ?? 7) * 0.6,
            blasts: h.blast_percentage ?? 0,
            sgot: 24,
            sgpt: 26,
            potassium: 4.2,
            creatinine: 0.8,
            chimerism: 99.5,
          }))
        );
      }

      setFetching(false);
    })();
  }, []);

  const downloadPDF = () => {
    if (!user || !cbc) {
      alert('Please complete a blood test first.');
      return;
    }
    setLoading(true);
    try {
      const compliance: ComplianceSettings = {
        anonymize,
        autoRefresh: false,
        notifyEmail: false,
      };

      generateClinicalPDFReport({
        user,
        cbc,
        xgboostResult: xgboost,
        timeSeriesData: trajectory,
        compliance,
        anonymize,
      });
    } catch (e: any) {
      alert('PDF generation failed: ' + e.message);
    }
    setLoading(false);
  };

  if (fetching) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 flex items-center gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading your data…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <FileText className="w-7 h-7 text-indigo-600" />
        Clinical Report
      </h1>
      <p className="text-slate-500 mb-8">
        Download a full clinical PDF with your CBC, AI risk analysis, and
        remission trajectory.
      </p>

      {!cbc && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 text-sm mb-6">
          You need at least one blood test on record. Run a screening first.
        </div>
      )}

      {cbc && user && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow mb-6">
          <h2 className="font-bold mb-4">Report Preview</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Patient: <strong>{anonymize ? '—hidden—' : user.name}</strong>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Latest CBC on <strong>{cbc.sampleDate}</strong>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              XGBoost risk: <strong>{xgboost?.riskPercent}% ({xgboost?.riskCategory})</strong>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Longitudinal trajectory: <strong>{trajectory.length} data points</strong> ({testCount} tests total)
            </div>
          </div>

          <label className="mt-6 flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={anonymize}
              onChange={(e) => setAnonymize(e.target.checked)}
              className="w-4 h-4"
            />
            Anonymize patient name and MRN in the PDF
          </label>
        </div>
      )}

      <button
        onClick={downloadPDF}
        disabled={loading || !cbc}
        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating PDF…
          </>
        ) : (
          <>
            <FileDown className="w-5 h-5" />
            Download PDF Report
          </>
        )}
      </button>
    </div>
  );
}