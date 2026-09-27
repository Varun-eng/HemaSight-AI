'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Microscope, Dna, TrendingUp, MessageCircle, Shield, Zap } from 'lucide-react';

const stages = [
  { icon: Microscope, title: '1. XGBoost Screening', desc: 'Analyzes blood test data to flag leukemia risk with high accuracy.' },
  { icon: Dna, title: '2. cGAN Visualization', desc: 'Generates synthetic microscopic images to visualize cell damage.' },
  { icon: TrendingUp, title: '3. Relapse Monitoring', desc: 'Time-series analysis detects silent relapse before symptoms.' },
  { icon: MessageCircle, title: '4. AI Chatbot', desc: 'Explains complex findings in simple, patient-friendly language.' },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Early <span className="text-indigo-600">Leukemia</span> Detection with AI
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            HemaSight AI automates diagnosis with a four-stage AI workflow — from blood test screening to patient-friendly explanations.
          </p>
          <div className="flex gap-4">
            <Link href="/register" className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
              Get Started Free
            </Link>
            <Link href="#workflow" className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold hover:border-indigo-600 transition">
              Learn More
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative"
        >
          <div className="animate-float bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-12 text-white shadow-2xl">
            <Microscope className="w-32 h-32 mx-auto mb-4 opacity-90" />
            <p className="text-center text-xl font-semibold">AI-Powered Diagnostics</p>
            <p className="text-center text-sm opacity-80 mt-2">Four-stage leukemia detection</p>
          </div>
        </motion.div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="bg-slate-50 dark:bg-slate-900 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-4">The Four-Stage Workflow</h2>
          <p className="text-center text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto">
            Each stage builds on the previous one to deliver a complete diagnostic experience.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stages.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all"
              >
                <s.icon className="w-12 h-12 text-indigo-600 mb-4" />
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="max-w-5xl mx-auto px-6 py-20 text-center">
        <Shield className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
        <h2 className="text-4xl font-bold mb-6">Why HemaSight AI?</h2>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Leukemia is a dangerous blood cancer that requires early and accurate detection. Manual microscopic
          examination is often slow and error-prone. HemaSight AI provides a scalable, automated solution
          that enhances diagnostic accuracy and improves patient care.
        </p>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {[
            { icon: Zap, label: 'Fast', desc: 'Results in seconds' },
            { icon: Shield, label: 'Accurate', desc: 'AI-validated detection' },
            { icon: MessageCircle, label: 'Clear', desc: 'Simple explanations' },
          ].map((f, i) => (
            <div key={i} className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow">
              <f.icon className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
              <p className="font-bold">{f.label}</p>
              <p className="text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}