'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Loader2, Coffee } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' as const : 'login' as const;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setError(null);
        alert('Check your email for the confirmation link!');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (error) {
        setError(error.message);
      } else {
        alert('Check your email for the password reset link!');
        setMode('login');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Back to Home */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>

        {/* Card */}
        <div className="bg-white rounded-xl border border-stone-200 p-7">
          {/* Logo */}
          <div className="text-center mb-7">
            <div className="w-12 h-12 bg-stone-900 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-stone-900">
              {mode === 'login' && 'Sign in to CafeOS'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot' && 'Reset password'}
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              {mode === 'login' && 'Welcome back'}
              {mode === 'signup' && 'Free forever, no credit card needed'}
              {mode === 'forgot' && 'We\'ll send you a reset link'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgotPassword}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-11 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="mb-5 text-right">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-stone-500 hover:text-stone-700"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' && (isLoading ? 'Signing in...' : 'Sign in')}
              {mode === 'signup' && (isLoading ? 'Creating account...' : 'Create account')}
              {mode === 'forgot' && (isLoading ? 'Sending...' : 'Send reset link')}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="mt-5 text-center text-sm text-stone-500">
            {mode === 'login' && (
              <>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-stone-900 font-medium hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-stone-900 font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === 'forgot' && (
              <button
                onClick={() => setMode('login')}
                className="text-stone-900 font-medium hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-5">
          By continuing, you agree to our{' '}
          <Link href="/legal/terms" className="hover:text-stone-600 underline">Terms</Link>
          {' '}and{' '}
          <Link href="/legal/privacy" className="hover:text-stone-600 underline">Privacy Policy</Link>
        </p>
      </div>
    </main>
  );
}
