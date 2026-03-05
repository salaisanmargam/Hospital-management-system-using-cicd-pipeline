import React, { useState } from 'react';
import { Activity, Mail, Lock, User as UserIcon, ArrowRight, Heart, Shield, Stethoscope, Pill } from 'lucide-react';
import { User, UserRole } from '../types';
import { loginWithProfile, registerAndLogin } from '../services/api';

interface AuthProps {
  onAuthSuccess: (user: User, token: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const result = await loginWithProfile({ email, password });
        onAuthSuccess(result.user, result.token);
        return;
      }

      const result = await registerAndLogin({
        full_name: name,
        email,
        password,
        role: UserRole.PATIENT,
      });
      onAuthSuccess(result.user, result.token);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl"></div>

        {/* Floating medical icons */}
        <div className="absolute top-[15%] left-[10%] text-white/5 animate-float">
          <Heart size={48} />
        </div>
        <div className="absolute top-[20%] right-[15%] text-white/5 animate-float-delayed">
          <Shield size={40} />
        </div>
        <div className="absolute bottom-[25%] left-[20%] text-white/5 animate-float-delayed">
          <Stethoscope size={44} />
        </div>
        <div className="absolute bottom-[15%] right-[10%] text-white/5 animate-float">
          <Pill size={36} />
        </div>
        <div className="absolute top-[60%] left-[5%] text-white/5 animate-float">
          <Activity size={32} />
        </div>
      </div>

      {/* Auth Card */}
      <div className="max-w-md w-full animate-scale-in relative z-10">
        <div className="glass-dark rounded-3xl shadow-2xl shadow-black/30 overflow-hidden border border-white/10">
          {/* Header */}
          <div className="px-8 pt-10 pb-8 text-center relative">
            <div className="flex justify-center mb-5">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-teal-400 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity animate-pulse-glow"></div>
                <div className="relative bg-gradient-to-br from-sky-500 to-teal-500 p-4 rounded-2xl shadow-xl shadow-sky-500/20">
                  <Activity size={32} className="text-white" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-display font-bold text-white">MedCore HMS</h2>
            <p className="text-slate-400 text-sm mt-1 font-medium">Hospital Management System</p>
          </div>

          <div className="px-8 pb-10">
            {/* Tab Switcher */}
            <div className="flex gap-1 mb-8 bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${isLogin ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-white'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${!isLogin ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-white'}`}
              >
                Register
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="animate-fade-in-up">
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Full Name</label>
                  <div className="relative group">
                    <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                    <input
                      type="text"
                      required={!isLogin}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 focus:bg-white/10 transition-all duration-300"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Email Address</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 focus:bg-white/10 transition-all duration-300"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Password</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 focus:bg-white/10 transition-all duration-300"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="animate-fade-in-up">
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    Register As
                  </label>
                  <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 font-medium">
                    Patient
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">Staff accounts are created by the hospital administrator.</p>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400 animate-fade-in flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-sky-500/20 hover:shadow-sky-500/30 hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isSubmitting ? (
                    <>
                      <div className="spinner !w-5 !h-5 !border-2 !border-white/30 !border-t-white"></div>
                      Please wait...
                    </>
                  ) : (
                    <>
                      {isLogin ? 'Sign In to Account' : 'Create Account'}
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {isLogin && (
              <p className="text-center mt-6 text-xs text-slate-500">
                Forgot your password? <a href="#" className="text-sky-400 hover:text-sky-300 hover:underline transition-colors">Reset here</a>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-slate-600">
          © 2026 MedCore HMS. Secure & HIPAA Compliant.
        </p>
      </div>
    </div>
  );
};