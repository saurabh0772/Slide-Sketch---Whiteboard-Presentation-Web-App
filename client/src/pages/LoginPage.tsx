import React, { useState } from 'react';
import {
  Presentation,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { loginUser } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (user: { username: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await loginUser(username.trim(), password);
      setIsLoading(false);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Invalid username or password. Access denied.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-50 via-indigo-50/40 to-blue-50/30 text-neutral-800 select-none">
      {/* Top Header / Brand banner */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-neutral-200/70 bg-white/70 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-neutral-900 tracking-tight text-lg">SlideSketch</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                PRO
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-medium">Presentation Viewer & Annotation Canvas</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs font-medium text-neutral-600 bg-neutral-100/80 px-3 py-1.5 rounded-full border border-neutral-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Protected Workspace</span>
        </div>
      </header>

      {/* Main Login Card Center */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-200/90 shadow-xl shadow-indigo-900/5 p-7 sm:p-9 space-y-6">
          {/* Card Title & Intro */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Authentication Required</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-sm text-neutral-500 font-normal leading-relaxed max-w-sm mx-auto">
              Please enter your authorized credentials to access your presentation slides and annotation tools.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start space-x-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-normal">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-neutral-700 block">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white text-neutral-900 text-sm rounded-xl border border-neutral-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-neutral-700 block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white text-neutral-900 text-sm rounded-xl border border-neutral-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 30-day session info banner */}
            <div className="flex items-center space-x-2 py-1 px-2.5 bg-emerald-50/80 border border-emerald-100 rounded-lg text-emerald-800 text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Session will stay securely active for <strong>30 days</strong></span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl font-semibold text-sm shadow-md shadow-indigo-600/25 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to SlideSketch</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer with Saurabh */}
      <footer className="py-4 text-center text-xs text-neutral-500 border-t border-neutral-200/60 bg-white/50">
        <p className="flex items-center justify-center space-x-1 font-medium">
          <span>Developed with</span>
          <span className="text-rose-500 animate-pulse">❤️</span>
          <span>by</span>
          <span className="font-semibold text-neutral-800">Saurabh</span>
        </p>
      </footer>
    </div>
  );
};
