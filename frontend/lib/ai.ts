const XGBOOST_API = process.env.NEXT_PUBLIC_XGBOOST_API!;
const CGAN_API = process.env.NEXT_PUBLIC_CGAN_API!;
const TIMESERIES_API = process.env.NEXT_PUBLIC_TIMESERIES_API!;
const CHATBOT_API = process.env.NEXT_PUBLIC_CHATBOT_API!;

export async function runXGBoost(data: {
  wbc: number;
  rbc: number;
  hemoglobin: number;
  platelets: number;
  blast_percentage: number;
  [key: string]: any;
}) {
  const res = await fetch(`${XGBOOST_API}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateImage(data: { class_id: number; cbc?: any }) {
  const res = await fetch(`${CGAN_API}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function analyzeTimeSeries(records: any[]) {
  const res = await fetch(`${TIMESERIES_API}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function askChatbot(
  message: string,
  context?: any,
  history: any[] = [],
  language = 'en'
) {
  const res = await fetch(`${CHATBOT_API}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context, history, language }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}