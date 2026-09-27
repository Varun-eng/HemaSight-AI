'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setMsg('Check your email to confirm your account.');
    setLoading(false);
    setTimeout(() => router.push('/login'), 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 gradient-bg">
      <form
        onSubmit={submit}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        <h1 className="text-3xl font-bold mb-2">Create Account</h1>
        <p className="text-slate-500 mb-6">Join HemaSight AI</p>

        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        {msg && <p className="text-green-500 mb-4 text-sm">{msg}</p>}

        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full p-3 mb-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-3 mb-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
        />
        <input
          type="password"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full p-3 mb-6 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Register'}
        </button>
        <p className="text-center text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-semibold">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}