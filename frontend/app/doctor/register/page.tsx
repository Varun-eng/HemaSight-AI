'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Stethoscope } from 'lucide-react';

export default function DoctorRegister() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    licenseNumber: '',
    specialization: '',
    hospital: '',
  });
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
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          role: 'doctor',
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Update the profile with doctor-specific info
    if (data.user) {
      await supabase
        .from('profiles')
        .update({
          license_number: form.licenseNumber,
          specialization: form.specialization,
          hospital: form.hospital,
        })
        .eq('id', data.user.id);
    }

    setMsg('Account created! Check your email to confirm, then log in.');
    setLoading(false);
    setTimeout(() => router.push('/doctor/login'), 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-gradient-to-br from-teal-600 to-emerald-700">
      <form
        onSubmit={submit}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-6">
          <Stethoscope className="w-8 h-8 text-teal-600" />
          <h1 className="text-2xl font-bold">Doctor Registration</h1>
        </div>

        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        {msg && <p className="text-green-500 mb-4 text-sm">{msg}</p>}

        <input
          type="text"
          placeholder="Full Name (Dr.)"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
          className="w-full p-3 mb-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
        />
        <input
          type="email"
          placeholder="Professional Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="w-full p-3 mb-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
        />
        <input
          type="password"
          placeholder="Password (min 6 chars)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={6}
          className="w-full p-3 mb-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
        />
        <input
          type="text"
          placeholder="Medical License Number"
          value={form.licenseNumber}
          onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
          required
          className="w-full p-3 mb-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
        />
        <select
  value={form.specialization}
  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
  required
  className="w-full p-3 mb-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
>
  <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
    Select Specialization
  </option>
  <option value="Hematology" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
    Hematology
  </option>
  <option value="Oncology" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
    Oncology
  </option>
  <option value="Pediatric Oncology" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
    Pediatric Oncology
  </option>
  <option value="Internal Medicine" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
    Internal Medicine
  </option>
  <option value="Pathology" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
    Pathology
  </option>
  <option value="Other" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
    Other
  </option>
</select>
        <input
          type="text"
          placeholder="Hospital / Clinic"
          value={form.hospital}
          onChange={(e) => setForm({ ...form, hospital: e.target.value })}
          required
          className="w-full p-3 mb-6 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Register as Doctor'}
        </button>

        <p className="text-center text-sm mt-6">
          Already registered?{' '}
          <Link href="/doctor/login" className="text-teal-600 font-semibold">
            Doctor login
          </Link>
        </p>
      </form>
    </div>
  );
}