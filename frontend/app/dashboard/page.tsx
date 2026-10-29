'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Microscope, Dna, TrendingUp, MessageCircle, FileText } from 'lucide-react';

export default function Dashboard() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ tests: 0, images: 0, sessions: 0 });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const [b, m, s] = await Promise.all([
          supabase.from('blood_tests').select('id', { count: 'exact', head: true }).eq('patient_id', user.id),
          supabase.from('microscopic_images').select('id', { count: 'exact', head: true }).eq('patient_id', user.id),
          supabase.from('analysis_sessions').select('id', { count: 'exact', head: true }).eq('patient_id', user.id),
        ]);
        setStats({ tests: b.count || 0, images: m.count || 0, sessions: s.count || 0 });
      }
    })();
  }, []);

      const modules = [
    { 
      href: '/dashboard/screening', 
      icon: Microscope, 
      title: 'Blood Test Screening', 
      desc: 'Run XGBoost risk analysis', 
      color: 'from-blue-500 to-indigo-600' 
    },
    { 
      href: '/dashboard/images', 
      icon: Dna, 
      title: 'Image Visualization', 
      desc: 'Generate & compare cell images', 
      color: 'from-purple-500 to-pink-600' 
    },
    { 
      href: '/dashboard/monitoring', 
      icon: TrendingUp, 
      title: 'Relapse Monitoring', 
      desc: 'Track blood patterns over time', 
      color: 'from-green-500 to-teal-600' 
    },
    { 
      href: '/dashboard/report', 
      icon: FileText, 
      title: 'Clinical Report', 
      desc: 'Download full PDF report', 
      color: 'from-slate-700 to-slate-900' 
    },
    { 
      href: '/dashboard/notes', 
      icon: MessageCircle, 
      title: 'Doctor Notes', 
      desc: 'View clinical observations', 
      color: 'from-amber-500 to-orange-600' 
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">
        Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''} 👋
      </h1>
      <p className="text-slate-500 mb-8">Your leukemia monitoring dashboard</p>

      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Blood Tests', value: stats.tests },
          { label: 'Images', value: stats.images },
          { label: 'Sessions', value: stats.sessions },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow">
            <p className="text-slate-500 text-sm">{s.label}</p>
            <p className="text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-bold mb-4">Modules</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {modules.map((m, i) => (
          <Link
            key={i} href={m.href}
            className={`bg-gradient-to-br ${m.color} p-6 rounded-2xl text-white shadow-lg hover:scale-[1.02] transition-transform`}
          >
            <m.icon className="w-10 h-10 mb-3" />
            <h3 className="font-bold text-xl">{m.title}</h3>
            <p className="opacity-90 text-sm">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}