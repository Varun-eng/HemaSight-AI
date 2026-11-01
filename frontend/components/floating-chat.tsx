'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Sparkles, Bot } from 'lucide-react';
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
      {/* Draggable Floating Icon with Assistant Badge */}
      {!isOpen && (
        <motion.div
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.2}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setTimeout(() => setIsDragging(false), 100)}
          className="fixed bottom-8 right-8 z-[9999]"
          style={{ touchAction: 'none' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <div className="relative group">
            {/* Main button - Pure White with deep shadow */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              onClick={() => {
                if (!isDragging) setIsOpen(true);
              }}
              role="button"
              aria-label="Open HemaSight AI assistant"
              className="relative flex items-center justify-center w-16 h-16 rounded-full bg-white text-indigo-600 shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-2 border-indigo-50 hover:shadow-[0_8px_30px_rgba(79,70,229,0.3)] hover:scale-105 transition-all duration-300 cursor-grab active:cursor-grabbing"
            >
              {/* Assistant Icon Stack */}
              <div className="relative pointer-events-none flex items-center justify-center">
                <Bot className="w-8 h-8" strokeWidth={2.2} />
                {/* Bright yellow sparkle */}
                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-amber-400 drop-shadow-md" fill="currentColor" />
              </div>

              {/* Online indicator dot */}
              <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse pointer-events-none" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-[9999] w-full max-w-[380px] h-[550px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100 visible' : 'scale-0 opacity-0 invisible pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-indigo-600 text-white">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-1">
                HemaSight AI
                <Sparkles className="w-3 h-3 text-yellow-300" />
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
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full text-xs p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600">
            {languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'bot' && (
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mr-1.5 mt-1 shrink-0">
                  <Bot className="w-3.5 h-3.5" />
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
                <Bot className="w-3.5 h-3.5" />
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