'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMsg('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'patient', // Explicitly set role to patient
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled, session exists → go straight to dashboard
    if (data.session) {
      setMsg('Account created! Redirecting…');
      setTimeout(() => router.push('/dashboard'), 1500);
    } else {
      // Email confirmation is enabled → wait for user to confirm
      setMsg('Check your email to confirm your account, then log in.');
      setLoading(false);
      setTimeout(() => router.push('/login'), 4000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 gradient-bg">
      <form
        onSubmit={submit}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-6 h-6 text-indigo-600" />
          <h1 className="text-3xl font-bold">Create Account</h1>
        </div>
        <p className="text-slate-500 mb-6">Join HemaSight AI as a Patient</p>

        {error && (
          <div className="flex items-start gap-2 mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {msg && (
          <div className="flex items-start gap-2 mb-4 p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        <label className="block text-sm font-medium mb-1">Full Name</label>
        <input
          type="text"
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full p-3 mb-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
        />

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-3 mb-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
        />

        <label className="block text-sm font-medium mb-1">
          Password <span className="text-slate-400 font-normal">(min 6 chars)</span>
        </label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full p-3 mb-6 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating…
            </>
          ) : (
            'Register'
          )}
        </button>

        {/* --- UPDATED LINKS SECTION --- */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center space-y-3">
          <p className="text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
              Login here
            </Link>
          </p>
          <p className="text-xs text-slate-500">
            Are you a Doctor?{' '}
            <Link href="/doctor/register" className="text-teal-600 font-semibold hover:underline">
              Register as a Doctor
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}