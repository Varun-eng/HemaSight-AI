'use client';
import Link from 'next/link';
import { Activity, Heart, Code, Mail, ArrowUp, MapPin } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pt-12 pb-6 mt-auto relative">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        
        {/* Brand & Description */}
        <div className="md:col-span-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600 dark:text-indigo-400 mb-4">
            <Activity className="w-6 h-6" />
            HemaSight AI
          </Link>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-sm mb-4">
            An advanced AI-powered platform for early leukemia detection, microscopic image visualization, 
            and post-transplant relapse monitoring.
          </p>
          
          {/* Contact & Location */}
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <a href="mailto:varunsd1212@gmail.com" className="flex items-center gap-2 hover:text-indigo-600 transition-colors">
              <Mail className="w-4 h-4" />
              varunsd1212@gmail.com
            </a>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>Made in India 🇮🇳</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Platform</h3>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li><Link href="/dashboard/screening" className="hover:text-indigo-600">Blood Screening</Link></li>
            <li><Link href="/dashboard/images" className="hover:text-indigo-600">Image Visualization</Link></li>
            <li><Link href="/dashboard/monitoring" className="hover:text-indigo-600">Relapse Monitoring</Link></li>
            <li><Link href="/dashboard/report" className="hover:text-indigo-600">Clinical Reports</Link></li>
          </ul>
        </div>

        {/* Credentials & Info */}
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Project Credentials</h3>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>Model: XGBoost + cGAN + ResNet18</li>
            <li>LLM: Google Gemini 3.8 Flash</li>
            <li>Data: ALL-IDB & ASH Datasets</li>
            <li>Stack: Next.js · Supabase · FastAPI</li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-6 border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <p>© {currentYear} HemaSight AI. All rights reserved.</p>
        
        {/* Highlighted Designer Credit */}
        <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-full border border-indigo-100 dark:border-indigo-900">
          <Code className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            Designed & Developed by <strong className="text-indigo-600 dark:text-indigo-400">Varun D</strong>
          </span>
        </div>

        <p className="flex items-center gap-1">
          Built with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> for medical advancement.
        </p>
      </div>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className="absolute -top-5 right-8 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:-translate-y-1 transition-all"
        aria-label="Back to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </footer>
  );
}