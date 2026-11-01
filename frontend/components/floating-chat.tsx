'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, useDragControls } from 'framer-motion';

type Msg = { role: 'user' | 'bot'; content: string };

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'bot', content: "Hi! I'm HemaSight AI. Ask me anything about leukemia or your blood test results." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [language, setLanguage] = useState('en');

  const bottomRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const supabase = createClient();

  // Fetch latest screening context
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const CHATBOT_API = process.env.NEXT_PUBLIC_CHATBOT_API!;
      const res = await fetch(`${CHATBOT_API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context, language, history: messages }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessages((m) => [...m, { role: 'bot', content: data.reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'bot', content: 'Sorry, I am having trouble connecting right now.' }]);
    }
    setLoading(false);
  };

  const languages = [
    { code: 'en', label: 'English' }, { code: 'hi', label: 'हिन्दी' },
    { code: 'te', label: 'తెలుగు' }, { code: 'ta', label: 'தமிழ்' },
    { code: 'kn', label: 'ಕನ್ನಡ' }, { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
  ];

  return (
    <>
      {/* Draggable Floating Icon */}
      {!isOpen && (
        <motion.div
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.2}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
          className="fixed bottom-6 right-6 z-[99999]"
          style={{ touchAction: 'none' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <div className="relative group">
            <div
              onPointerDown={(e) => dragControls.start(e)}
              onClick={() => {
                if (!isDragging) setIsOpen(true);
              }}
              role="button"
              aria-label="Open HemaSight AI assistant"
              className="relative flex items-center justify-center w-16 h-16 rounded-full cursor-grab active:cursor-grabbing transition-transform duration-300 hover:scale-105"
              style={{
                backgroundColor: '#4f46e5', // Hardcoded Indigo-600
                boxShadow: '0 8px 30px rgba(79, 70, 229, 0.4)', // Explicit shadow
                border: '2px solid white'
              }}
            >
              {/* Custom Inline SVG Assistant Icon (Immune to global CSS conflicts) */}
              <div className="relative pointer-events-none flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8V4H8" />
                  <rect width="16" height="12" x="4" y="8" rx="2" />
                  <path d="M2 14h2" />
                  <path d="M20 14h2" />
                  <path d="M15 13v2" />
                  <path d="M9 13v2" />
                </svg>
                {/* Sparkle SVG */}
                <svg className="absolute -top-2 -right-2 w-5 h-5 drop-shadow-md" fill="#fbbf24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                </svg>
              </div>

              {/* Online indicator dot */}
              <span 
                className="absolute top-0 right-0 w-4 h-4 rounded-full border-2 border-white animate-pulse pointer-events-none" 
                style={{ backgroundColor: '#10b981' }} // Hardcoded Emerald-500
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-[99999] w-full max-w-[380px] h-[550px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100 visible' : 'scale-0 opacity-0 invisible pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-indigo-600 text-white">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8V4H8" />
                  <rect width="16" height="12" x="4" y="8" rx="2" />
                  <path d="M2 14h2" />
                  <path d="M20 14h2" />
                  <path d="M15 13v2" />
                  <path d="M9 13v2" />
                </svg>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-1">
                HemaSight AI
                <svg className="w-3 h-3 text-yellow-300" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                </svg>
              </h3>
              <p className="text-[10px] text-indigo-200">RAG Medical Assistant</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full text-xs p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 outline-none">
            {languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'bot' && (
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mr-1.5 mt-1 shrink-0">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8V4H8" />
                    <rect width="16" height="12" x="4" y="8" rx="2" />
                    <path d="M2 14h2" />
                    <path d="M20 14h2" />
                    <path d="M15 13v2" />
                    <path d="M9 13v2" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mr-1.5 mt-1 shrink-0">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8V4H8" />
                  <rect width="16" height="12" x="4" y="8" rx="2" />
                  <path d="M2 14h2" />
                  <path d="M20 14h2" />
                  <path d="M15 13v2" />
                  <path d="M9 13v2" />
                </svg>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-bl-sm">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 pr-2">
            <input
              type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask about your results…" className="flex-1 bg-transparent p-2 text-sm outline-none dark:text-white"
            />
            <button onClick={send} disabled={loading || !input.trim()} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}