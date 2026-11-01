'use client';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useTheme } from './theme-provider';
import { createClient } from '@/lib/supabase/client';
import { Moon, Sun, Activity, FileText, Stethoscope, ChevronDown, User, Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  
  // Dropdown & Mobile Menu State
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLoginDropdownOpen(false);
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
    <nav className="sticky top-0 z-[999] backdrop-blur-lg bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600 dark:text-indigo-400">
          <Activity className="w-6 h-6" />
          HemaSight AI
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/#workflow" className="hover:text-indigo-600">Workflow</Link>
          <Link href="/#about" className="hover:text-indigo-600">About</Link>

          <button onClick={toggle} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <>
              {isDoctor ? (
                <Link href="/doctor/dashboard" className="flex items-center gap-1 font-medium text-teal-600 dark:text-teal-400">
                  <Stethoscope className="w-4 h-4" /> Doctor Dashboard
                </Link>
              ) : (
                <Link href="/dashboard/report" className="flex items-center gap-1 font-medium hover:text-indigo-600">
                  <FileText className="w-4 h-4" /> Report
                </Link>
              )}

              <Link
                href={isDoctor ? '/doctor/dashboard' : '/dashboard'}
                className={`px-4 py-2 rounded-lg text-white ${
                  isDoctor ? 'bg-teal-600 hover:bg-teal-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isDoctor ? 'Doctor Panel' : 'Dashboard'}
              </Link>

              <button onClick={logout} className="text-sm text-slate-600 dark:text-slate-400 hover:text-red-600">
                Logout
              </button>
            </>
          ) : (
            <>
              {/* Login Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-medium py-2"
                >
                  Login <ChevronDown className={`w-4 h-4 transition-transform ${loginDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {loginDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-2 z-50">
                    <Link 
                      href="/login" 
                      onClick={() => setLoginDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium"
                    >
                      <User className="w-4 h-4 text-indigo-500" />
                      Patient Login
                    </Link>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                    <Link 
                      href="/doctor/login" 
                      onClick={() => setLoginDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium"
                    >
                      <Stethoscope className="w-4 h-4 text-teal-500" />
                      Doctor Login
                    </Link>
                  </div>
                )}
              </div>

              <Link href="/register" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-4">
          <button onClick={toggle} className="p-2 rounded-lg">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-700 dark:text-slate-200">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-4 space-y-4 shadow-lg absolute w-full left-0">
          <Link href="/#workflow" onClick={() => setMobileMenuOpen(false)} className="block font-medium">Workflow</Link>
          <Link href="/#about" onClick={() => setMobileMenuOpen(false)} className="block font-medium">About</Link>
          
          <div className="h-px bg-slate-100 dark:bg-slate-800 w-full my-2"></div>

          {user ? (
            <div className="space-y-3">
              <Link 
                href={isDoctor ? '/doctor/dashboard' : '/dashboard'} 
                onClick={() => setMobileMenuOpen(false)}
                className={`block text-center px-4 py-2 rounded-lg text-white font-medium ${
                  isDoctor ? 'bg-teal-600' : 'bg-indigo-600'
                }`}
              >
                {isDoctor ? 'Doctor Panel' : 'Dashboard'}
              </Link>
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="block w-full text-center text-red-500 font-medium py-2">
                Logout
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block font-medium text-indigo-600">Patient Login</Link>
              <Link href="/doctor/login" onClick={() => setMobileMenuOpen(false)} className="block font-medium text-teal-600">Doctor Login</Link>
              <Link 
                href="/register" 
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}