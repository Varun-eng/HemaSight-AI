'use client';
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, Bot, Stethoscope } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { motion, useDragControls, AnimatePresence } from 'framer-motion';

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
  const [showTooltip, setShowTooltip] = useState(false);

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

  // Show tooltip once after mount, hide after a few seconds
  useEffect(() => {
    const showTimer = setTimeout(() => setShowTooltip(true), 1200);
    const hideTimer = setTimeout(() => setShowTooltip(false), 6500);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

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
          onDragStart={() => {
            setIsDragging(true);
            setShowTooltip(false);
          }}
          onDragEnd={() => setIsDragging(false)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="fixed bottom-6 right-6 z-[9999]"
          style={{ touchAction: 'none' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <div className="relative">
            {/* Tooltip */}
            <AnimatePresence>
              {showTooltip && !isDragging && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="absolute bottom-full right-0 mb-3 w-max max-w-[220px] rounded-xl bg-slate-900 text-white text-xs px-3 py-2 shadow-xl border border-slate-700 pointer-events-none"
                >
                  <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                    <Sparkles className="w-3 h-3 text-indigo-300" />
                    HemaSight AI
                  </div>
                  <span className="text-slate-300">Ask me about your blood test results</span>
                  {/* little arrow */}
                  <span className="absolute top-full right-6 -mt-1 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main button */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              onClick={() => {
                if (!isDragging) setIsOpen(true);
              }}
              role="button"
              aria-label="Open HemaSight AI assistant"
              className="group relative p-4 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xl hover:shadow-2xl hover:from-indigo-600 hover:to-indigo-800 cursor-grab active:cursor-grabbing transition-all"
            >
              {/* Assistant avatar ring */}
              <span className="absolute inset-0 rounded-full ring-2 ring-indigo-300/50 animate-ping pointer-events-none" />
              <span className="absolute inset-0 rounded-full ring-2 ring-indigo-300/40 pointer-events-none" />

              {/* Icon stack: assistant bot + tiny medical sparkle */}
              <div className="relative pointer-events-none">
                <Bot className="w-6 h-6" strokeWidth={2.2} />
                <Sparkles className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-yellow-300 drop-shadow" />
              </div>

              {/* Online / notification dot */}
              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse pointer-events-none" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-[9999] w-full max-w-[380px] h-[550px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
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