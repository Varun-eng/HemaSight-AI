'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 gradient-bg">
      <form onSubmit={submit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
        <p className="text-slate-500 mb-6">Login to HemaSight AI</p>

        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

        <input
          type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          className="w-full p-3 mb-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} required
          className="w-full p-3 mb-6 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
        />
        <button
          type="submit" disabled={loading}
          className="w-full p-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>
        <p className="text-center text-sm mt-6">
          Don't have an account? <Link href="/register" className="text-indigo-600 font-semibold">Register</Link>
        </p>
      </form>
    </div>
  );
}