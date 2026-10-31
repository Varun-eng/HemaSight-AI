'use client';
import Link from 'next/link';
import { Activity, Heart, Code, Mail, ArrowUp } from 'lucide-react';

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
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-sm mb-6">
            An advanced AI-powered platform for early leukemia detection, microscopic image visualization, 
            and post-transplant relapse monitoring.
          </p>
          
          {/* Graphic "Made in India" Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm">
            {/* SVG Indian Flag */}
            <svg width="20" height="14" viewBox="0 0 900 600" xmlns="http://www.w3.org/2000/svg" className="rounded-sm overflow-hidden border border-slate-300 dark:border-slate-600">
              <rect width="900" height="200" fill="#FF9933"/>
              <rect y="200" width="900" height="200" fill="#FFFFFF"/>
              <rect y="400" width="900" height="200" fill="#138808"/>
              <circle cx="450" cy="300" r="60" fill="none" stroke="#000080" strokeWidth="8"/>
              {/* Ashoka Chakra Spokes */}
              <g stroke="#000080" strokeWidth="4">
                <line x1="450" y1="240" x2="450" y2="360"/>
                <line x1="390" y1="300" x2="510" y2="300"/>
                <line x1="408" y1="258" x2="492" y2="342"/>
                <line x1="492" y1="258" x2="408" y2="342"/>
                <line x1="425" y1="243" x2="475" y2="357"/>
                <line x1="475" y1="243" x2="425" y2="357"/>
                <line x1="395" y1="275" x2="505" y2="325"/>
                <line x1="395" y1="325" x2="505" y2="275"/>
              </g>
              <circle cx="450" cy="300" r="15" fill="#000080"/>
            </svg>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Made in India
            </span>
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
        
        {/* Highlighted Designer Credit with Email */}
        <div className="flex flex-col items-center px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-100 dark:border-indigo-900">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Designed & Developed by <strong className="text-indigo-600 dark:text-indigo-400">Varun D</strong>
            </span>
          </div>
          <a 
            href="mailto:varunsd1212@gmail.com" 
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 flex items-center gap-1 mt-1 transition-colors"
          >
            <Mail className="w-3 h-3" />
            varunsd1212@gmail.com
          </a>
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