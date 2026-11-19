// ============================================================
// BIZTRACK NIGERIA — AUTHENTICATION & MULTI-DEVICE ACCOUNT MODAL
// Sign In, Register, Forgot Password, Account Overview
// ============================================================

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  X,
  User,
  Lock,
  Mail,
  Building2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { BizTrackLogo } from './BizTrackLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, business, signIn, signUp, signOut, resetPassword, isConfigured } = useAuth();
  const { syncStatus, syncNow, lastSyncedAt, pendingCount } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const res = await signIn(email, password);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMessage('Welcome back! Synchronising your business records...');
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!businessName.trim()) {
      setError('Please provide your business or shop name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const res = await signUp(email, password, businessName, fullName);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMessage(res.message || 'Account created. Your records will sync after setup completes.');
      if (!res.message?.startsWith('Check your email')) {
        setTimeout(() => onClose(), 1500);
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const res = await resetPassword(email);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMessage(res.message || 'Password reset email sent! Check your inbox.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-navy-950 text-white">
          <div className="flex items-center space-x-2.5">
            <BizTrackLogo size="sm" />
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                {user ? 'Business Account' : mode === 'signin' ? 'Sign In to BizTrack' : mode === 'signup' ? 'Create Business Account' : 'Reset Password'}
              </h3>
              <p className="text-[11px] text-slate-300">Multi-Device Cloud Synchronisation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User is Logged In: Account Overview */}
        {user ? (
          <div className="p-5 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Cloud Account Active
                </span>
                <p className="font-bold text-slate-900 text-sm truncate">{user.email}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Business: <strong>{business?.name || 'Main Shop'}</strong>
                </p>
              </div>
            </div>

            {/* Sync Information */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  Multi-Device Sync Status:
                </span>
                <span className="font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                  {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'offline' ? 'Offline' :
                    syncStatus === 'failed' ? 'Failed' : syncStatus === 'pending' ? `${pendingCount} Pending` : 'Synced'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-200/60">
                <span>Last Synchronised:</span>
                <span className="font-medium text-slate-700">
                  {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Recently'}
                </span>
              </div>
            </div>

            {/* Sync Now Button */}
            <button
              onClick={async () => {
                setError('');
                const result = await syncNow();
                if (!result.success) setError(result.error || 'Cloud sync failed');
              }}
              disabled={syncStatus === 'syncing' || !navigator.onLine}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{syncStatus === 'syncing' ? 'Synchronising Records...' : 'Sync Now with Cloud'}</span>
            </button>

            {/* Sign Out Button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  void signOut().then((result) => {
                    if (result.error) {
                      setError(result.error);
                      return;
                    }
                    onClose();
                  });
                }}
                className="w-full py-2 px-3 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-rose-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out from this Device</span>
              </button>
            </div>
          </div>
        ) : (
          /* User is NOT Logged In: Form */
          <div className="p-5 sm:p-6 space-y-4">
            {/* Mode Tabs */}
            {mode !== 'forgot' && (
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className={`py-2 rounded-lg transition ${mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className={`py-2 rounded-lg transition ${mode === 'signup' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'}`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Error & Success Alerts */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* SIGN IN FORM */}
            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="owner@mybusiness.ng"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError('');
                        setSuccessMessage('');
                      }}
                      className="text-[11px] text-emerald-700 font-semibold hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition shadow-sm mt-2 flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Sign In</span>
                </button>
              </form>
            )}

            {/* SIGN UP FORM */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business / Shop Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alaba Electronics & Provisions"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner's Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Alhaji Babatunde Adeleke"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="shop@biztrack.ng"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password * (Min 6 characters)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition shadow-sm mt-2 flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Account & Enable Cloud Sync</span>
                </button>
              </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === 'forgot' && (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <p className="text-xs text-slate-500">
                  Enter your email address and we will send you a secure link to reset your account password.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="owner@mybusiness.ng"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="flex-1 py-2 px-3 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}

            <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-400">
              BizTrack works 100% offline. Records sync automatically when you reconnect.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
