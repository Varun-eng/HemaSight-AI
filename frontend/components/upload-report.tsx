'use client';
import { useRef, useState } from 'react';
import { Upload, Camera, FileText, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { extractCBCFromImage, extractCBCFromPDF, ParsedCBC } from '@/lib/reportOCR';

interface Props {
  onExtracted: (data: ParsedCBC) => void;
}

export function UploadReport({ onExtracted }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ParsedCBC | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setResult(null);
    setError('');
    setProgress(0);

    // Preview for images
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }

    setProcessing(true);
    try {
      const parsed = f.type === 'application/pdf'
        ? await extractCBCFromPDF(f, setProgress)
        : await extractCBCFromImage(f, setProgress);

      setResult(parsed);
      onExtracted(parsed);
    } catch (e: any) {
      setError(e.message || 'Extraction failed');
    }
    setProcessing(false);
  };

  const clear = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const fieldCount = result
    ? Object.entries(result).filter(
        ([k, v]) => k !== 'raw_text' && v !== undefined && v !== null
      ).length
    : 0;

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow mb-6">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-indigo-600" />
        <h2 className="font-bold">Auto-fill from Physical Report</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Upload a photo or PDF of your lab report. We'll extract the values automatically.
      </p>

      {!file && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
          >
            <Camera className="w-8 h-8 text-indigo-600" />
            <span className="text-sm font-medium">Take Photo</span>
            <span className="text-xs text-slate-500">Use camera</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
          >
            <Upload className="w-8 h-8 text-slate-500" />
            <span className="text-sm font-medium">Upload File</span>
            <span className="text-xs text-slate-500">Image or PDF</span>
          </button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {file && (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            {preview ? (
              <img
                src={preview}
                alt="preview"
                className="w-24 h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-xs text-slate-500">
                {(file.size / 1024).toFixed(0)} KB
              </p>

              {processing && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-sm text-indigo-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting… {progress}%
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {result && !processing && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Extracted {fieldCount} values
                </div>
              )}

              {error && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            <button
              onClick={clear}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {result && (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg text-xs space-y-1">
              <p className="font-bold mb-2">Extracted values:</p>
              {result.wbc !== undefined && <p>WBC: {result.wbc}</p>}
              {result.rbc !== undefined && <p>RBC: {result.rbc}</p>}
              {result.hemoglobin !== undefined && <p>Hemoglobin: {result.hemoglobin}</p>}
              {result.platelets !== undefined && <p>Platelets: {result.platelets}</p>}
              {result.blast_percentage !== undefined && <p>Blasts: {result.blast_percentage}%</p>}
              {result.sgot !== undefined && <p>SGOT: {result.sgot}</p>}
              {result.sgpt !== undefined && <p>SGPT: {result.sgpt}</p>}
              {result.creatinine !== undefined && <p>Creatinine: {result.creatinine}</p>}
              {result.potassium !== undefined && <p>Potassium: {result.potassium}</p>}
              {result.chimerism !== undefined && <p>Chimerism: {result.chimerism}%</p>}
              {result.gvhd && <p>GVHD: {result.gvhd}</p>}
            </div>
          )}

          {result?.raw_text && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500">
                Show raw OCR text
              </summary>
              <pre className="mt-2 p-2 bg-slate-50 dark:bg-slate-900 rounded text-[10px] overflow-auto max-h-40 whitespace-pre-wrap">
                {result.raw_text}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}