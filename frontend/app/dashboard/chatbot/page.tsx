'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, Languages } from 'lucide-react';

type Msg = { role: 'user' | 'bot'; content: string };

const LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    greeting: "Hi! I'm HemaSight AI. Ask me anything about your blood test results.",
  },
  {
    code: 'hi',
    name: 'हिन्दी (Hindi)',
    greeting: 'नमस्ते! मैं HemaSight AI हूं। अपने रक्त परीक्षण के बारे में कुछ भी पूछें।',
  },
  {
    code: 'te',
    name: 'తెలుగు (Telugu)',
    greeting: 'నమస్కారం! నేను HemaSight AI. మీ రక్త పరీక్ష ఫలితాల గురించి ఏదైనా అడగండి.',
  },
  {
    code: 'ta',
    name: 'தமிழ் (Tamil)',
    greeting: 'வணக்கம்! நான் HemaSight AI. உங்கள் இரத்த பரிசோதனை முடிவுகளைப் பற்றி எதையும் கேளுங்கள்.',
  },
  {
    code: 'kn',
    name: 'ಕನ್ನಡ (Kannada)',
    greeting: 'ನಮಸ್ಕಾರ! ನಾನು HemaSight AI. ನಿಮ್ಮ ರಕ್ತ ಪರೀಕ್ಷೆಯ ಫಲಿತಾಂಶಗಳ ಬಗ್ಗೆ ಏನನ್ನಾದರೂ ಕೇಳಿ.',
  },
  {
    code: 'es',
    name: 'Español (Spanish)',
    greeting: '¡Hola! Soy HemaSight AI. Pregúntame lo que quieras sobre tus análisis de sangre.',
  },
  {
    code: 'fr',
    name: 'Français (French)',
    greeting: 'Bonjour ! Je suis HemaSight AI. Posez-moi des questions sur vos analyses de sang.',
  },
];

export default function Chatbot() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'bot', content: LANGUAGES[0].greeting },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [context, setContext] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('blood_tests')
        .select('*')
        .eq('patient_id', user.id)
        .order('test_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setContext(data);
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const changeLanguage = (code: string) => {
    setLanguage(code);
    const lang = LANGUAGES.find((l) => l.code === code)!;
    setMessages([{ role: 'bot', content: lang.greeting }]);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: input };
    setMessages((m) => [...m, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const CHATBOT_API = process.env.NEXT_PUBLIC_CHATBOT_API!;
      const res = await fetch(`${CHATBOT_API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          context,
          language,
          history: messages,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessages((m) => [...m, { role: 'bot', content: data.reply }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: 'bot', content: 'Error: ' + e.message },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-2 flex-wrap gap-3">
        <h1 className="text-3xl font-bold">💬 AI Assistant</h1>
        <div className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-indigo-600" />
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-slate-500 mb-6">
        Get clear explanations of your results in your language.
      </p>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-4 h-[600px] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] p-3 rounded-2xl whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <p className="text-slate-400 text-sm">HemaSight is thinking…</p>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask about your results…"
            className="flex-1 p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
          />
          <button
            onClick={send}
            disabled={loading}
            className="p-3 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}