import Tesseract from 'tesseract.js';

export interface ParsedCBC {
  wbc?: number;
  rbc?: number;
  hemoglobin?: number;
  platelets?: number;
  blast_percentage?: number;
  total_count?: number;
  sgot?: number;
  sgpt?: number;
  creatinine?: number;
  potassium?: number;
  chimerism?: number;
  gvhd?: string;
  rdw?: number;
  neutrophils?: number;
  lymphocytes?: number;
  monocytes?: number;
  raw_text: string;
}

/**
 * Extract values from OCR'd blood report text.
 * Handles common formats like:
 *   "WBC: 7.2"
 *   "WBC  7.2  K/uL"
 *   "Haemoglobin  14.8 g/dL"
 */
export function parseCBCFromText(text: string): ParsedCBC {
  const t = text.replace(/\s+/g, ' ');
  const out: ParsedCBC = { raw_text: text };

  const num = (s: string | undefined): number | undefined => {
    if (!s) return undefined;
    const v = parseFloat(s.replace(/[^0-9.\-]/g, ''));
    return isNaN(v) ? undefined : v;
  };

  const find = (patterns: RegExp[]): number | undefined => {
    for (const p of patterns) {
      const m = t.match(p);
      if (m && m[1]) {
        const v = num(m[1]);
        if (v !== undefined) return v;
      }
    }
    return undefined;
  };

  // WBC — "WBC", "TLC", "Total Leucocyte Count", "Total WBC"
  out.wbc = find([
    /WBC[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
    /TLC[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
    /Total\s*(?:Leucocyte|WBC|Leukocyte)\s*Count[^0-9\-]{0,30}?([0-9]+\.?[0-9]*)/i,
  ]);

  // RBC — "RBC", "Total RBC"
  out.rbc = find([
    /RBC[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
    /Total\s*RBC[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
  ]);

  // Hemoglobin — "Hb", "Hgb", "Haemoglobin", "Hemoglobin"
  out.hemoglobin = find([
    /(?:Hb|Hgb|Haemoglobin|Hemoglobin)[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
  ]);

  // Platelets — "PLT", "Platelets", "Platelet Count"
  out.platelets = find([
    /PLT[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
    /Platelets?[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
  ]);

  // Total Count (often in CBC header)
  out.total_count = find([
    /Total\s*Count[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
  ]);

  // Blasts — "Blasts", "Blast %", "Blast Cells"
  out.blast_percentage = find([
    /Blasts?[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)\s*%?/i,
    /Blast\s*Cells?[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
  ]);

  // SGOT / AST
  out.sgot = find([
    /SGOT[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
    /AST[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
  ]);

  // SGPT / ALT
  out.sgpt = find([
    /SGPT[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
    /ALT[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
  ]);

  // Creatinine
  out.creatinine = find([
    /Creatinine[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
    /Creat[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
  ]);

  // Potassium
  out.potassium = find([
    /Potassium[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
    /\bK\+?[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
  ]);

  // Chimerism
  out.chimerism = find([
    /Chimerism[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
    /Donor[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)\s*%/i,
  ]);

  // RDW
  out.rdw = find([
    /RDW[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
  ]);

  // Neutrophils
  out.neutrophils = find([
    /Neutrophils?[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
  ]);

  // Lymphocytes
  out.lymphocytes = find([
    /Lymphocytes?[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
  ]);

  // Monocytes
  out.monocytes = find([
    /Monocytes?[^0-9\-]{0,20}?([0-9]+\.?[0-9]*)/i,
  ]);

  // GVHD — text detection
  if (/GVHD|graft[-\s]?versus[-\s]?host/i.test(t)) {
    if (/skin/i.test(t)) out.gvhd = 'skin';
    else if (/gut|intestin/i.test(t)) out.gvhd = 'gut';
    else if (/liver|hepat/i.test(t)) out.gvhd = 'liver';
    else out.gvhd = 'none';
  }

  return out;
}

/**
 * Run OCR on an image file and return parsed CBC values.
 */
export async function extractCBCFromImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ParsedCBC> {
  const result = await Tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  return parseCBCFromText(result.data.text);
}

/**
 * Run OCR on a PDF file — extracts page 1 as image first.
 * Requires pdfjs-dist.
 */
export async function extractCBCFromPDF(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ParsedCBC> {
  // Dynamic import to avoid bundling if unused
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;

  await page.render({
  canvasContext: ctx,
  viewport,
  canvas,             
} as any).promise;
  // Convert canvas → blob → OCR
  const blob: Blob = await new Promise((res) =>
    canvas.toBlob((b) => res(b!), 'image/png')
  );
  const imageFile = new File([blob], 'report.png', { type: 'image/png' });
  return extractCBCFromImage(imageFile, onProgress);
}