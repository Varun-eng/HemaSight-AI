'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTheme } from './theme-provider';
import { createClient } from '@/lib/supabase/client';
import { Moon, Sun, Activity, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) =>
      setUser(s?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl text-indigo-600 dark:text-indigo-400"
        >
          <Activity className="w-6 h-6" />
          HemaSight AI
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/#workflow" className="hidden md:inline hover:text-indigo-600">
            Workflow
          </Link>
          <Link href="/#about" className="hidden md:inline hover:text-indigo-600">
            About
          </Link>

          <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {user ? (
            <>
              <Link
                href="/dashboard/report"
                className="hidden md:inline-flex items-center gap-1 font-medium hover:text-indigo-600"
              >
                <FileText className="w-4 h-4" />
                Report
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="text-sm text-slate-600 dark:text-slate-400"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-indigo-600">
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}