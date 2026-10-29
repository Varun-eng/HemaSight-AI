'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Stethoscope } from 'lucide-react';

export default function DoctorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Verify the user is actually a doctor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profile?.role !== 'doctor' && profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setError('This account is not registered as a doctor.');
      setLoading(false);
      return;
    }

    router.push('/doctor/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-teal-600 to-emerald-700">
      <form
        onSubmit={submit}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/50 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Doctor Portal</h1>
            <p className="text-sm text-slate-500">HemaSight AI</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Doctor email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-3 mb-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-3 mb-6 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Sign in as Doctor'}
        </button>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center space-y-2">
          <Link
            href="/doctor/register"
            className="block text-sm text-teal-600 font-semibold"
          >
            Register as a doctor →
          </Link>
          <Link href="/login" className="block text-xs text-slate-500">
            Patient login
          </Link>
        </div>
      </form>
    </div>
  );
}