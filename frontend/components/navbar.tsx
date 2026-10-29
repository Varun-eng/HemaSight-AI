'use client';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useTheme } from './theme-provider';
import { createClient } from '@/lib/supabase/client';
import { Moon, Sun, Activity, FileText, Stethoscope, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const supabase = createClient();
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setRole(profile?.role ?? 'patient');
      } else {
        setRole(null);
      }
    };

    loadUser();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_, s) => {
      setUser(s?.user ?? null);
      if (s?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', s.user.id)
          .single();
        setRole(profile?.role ?? 'patient');
      } else {
        setRole(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const isDoctor = role === 'doctor' || role === 'admin';

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
              {isDoctor ? (
                <Link
                  href="/doctor/dashboard"
                  className="hidden md:inline-flex items-center gap-1 font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700"
                >
                  <Stethoscope className="w-4 h-4" />
                  Doctor Dashboard
                </Link>
              ) : (
                <Link
                  href="/dashboard/report"
                  className="hidden md:inline-flex items-center gap-1 font-medium hover:text-indigo-600"
                >
                  <FileText className="w-4 h-4" />
                  Report
                </Link>
              )}

              <Link
                href={isDoctor ? '/doctor/dashboard' : '/dashboard'}
                className={`px-4 py-2 rounded-lg text-white ${
                  isDoctor
                    ? 'bg-teal-600 hover:bg-teal-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isDoctor ? 'Doctor Panel' : 'Dashboard'}
              </Link>

              <button
                onClick={logout}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/doctor/login"
                className="hidden md:inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 dark:hover:text-teal-400"
              >
                <Stethoscope className="w-4 h-4" />
                Doctor Login
              </Link>
              
              <Link href="/login" className="hover:text-indigo-600 font-medium">
                Login
              </Link>

              {/* --- REGISTER DROPDOWN --- */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1 font-medium"
                >
                  Register
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-2 z-50">
                    <Link 
                      href="/register" 
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-slate-900 dark:text-white">Patient</p>
                        <p className="text-[10px] text-slate-500">Track your blood tests</p>
                      </div>
                    </Link>
                    
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    
                    <Link 
                      href="/doctor/register" 
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium"
                    >
                      <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                        <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="text-slate-900 dark:text-white">Doctor</p>
                        <p className="text-[10px] text-slate-500">Manage patient records</p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}