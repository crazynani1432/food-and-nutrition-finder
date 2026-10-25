import React, { useState } from 'react';
import { 
  LogIn, 
  UserPlus, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export default function AuthScreen({ onLoginSuccess, isOnline }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

  const resetForm = (newMode) => {
    setMode(newMode);
    setErrorMsg('');
    setSuccessMsg('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Please enter your username or email');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password');
      return;
    }
    if (mode === 'register') {
      if (password.length < 4) {
        setErrorMsg('Password must be at least 4 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please re-check.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: identifier.trim(),
            password,
            name: name.trim() || identifier.trim().split('@')[0]
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        setSuccessMsg('Account created successfully! Welcome to FoodPlate.');
        setTimeout(() => {
          onLoginSuccess(data.user, data.token, rememberMe);
        }, 600);
      } else {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: identifier.trim(),
            password
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Invalid credentials');
        }

        setSuccessMsg(`Welcome back, ${data.user.name || data.user.email}!`);
        setTimeout(() => {
          onLoginSuccess(data.user, data.token, rememberMe);
        }, 500);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication error. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click test login for effortless demonstration of individual logins
  const handleQuickDemo = async (demoUser) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      // Try login first
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoUser.email, password: demoUser.password })
      });
      const loginData = await loginRes.json();

      if (loginRes.ok && loginData.token) {
        setSuccessMsg(`Logged in as ${demoUser.name}!`);
        setTimeout(() => {
          onLoginSuccess(loginData.user, loginData.token, true);
        }, 500);
        return;
      }

      // If not registered yet, auto-register
      const regRes = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: demoUser.email,
          password: demoUser.password,
          name: demoUser.name
        })
      });
      const regData = await regRes.json();
      if (regRes.ok && regData.token) {
        setSuccessMsg(`Created individual account for ${demoUser.name}!`);
        setTimeout(() => {
          onLoginSuccess(regData.user, regData.token, true);
        }, 500);
      } else {
        throw new Error(regData.error || 'Demo login failed');
      }
    } catch (err) {
      setErrorMsg(`Quick login error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-950/80 shadow-2xl relative border-x border-slate-800/40 px-6 py-8 justify-center">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-indigo-500/30 border border-indigo-400/20">
            F
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xs shadow-md">
            <Sparkles size={12} />
          </span>
        </div>

        <h1 className="font-extrabold text-slate-100 text-2xl tracking-tight font-display">
          FoodPlate
        </h1>
        <p className="text-xs text-indigo-400 font-semibold tracking-wider uppercase mt-0.5">
          AI Nutrition & Calorie Tracker
        </p>
        <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
          Log in with your personal account to track your individual meals, customized macros, and nutrition goals.
        </p>
      </div>

      {/* Main Glass Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 shadow-xl backdrop-blur-xl">
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-xl mb-6 border border-slate-800/60">
          <button
            type="button"
            onClick={() => resetForm('login')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn size={14} />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => resetForm('register')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus size={14} />
            Create Account
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2 animate-fade-in">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-start gap-2 animate-fade-in">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                Your Full Name <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input pl-10 pr-3 py-2.5 rounded-xl text-xs text-slate-100 placeholder:text-slate-500"
                />
                <UserIcon size={16} className="absolute left-3 top-3 text-slate-500" />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
              Username or Email
            </label>
            <div className="relative">
              <input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder={mode === 'register' ? 'e.g. rahul or rahul@gmail.com' : 'Enter your username or email'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full glass-input pl-10 pr-3 py-2.5 rounded-xl text-xs text-slate-100 placeholder:text-slate-500"
                required
              />
              <Mail size={16} className="absolute left-3 top-3 text-slate-500" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'At least 4 characters' : 'Enter password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input pl-10 pr-10 py-2.5 rounded-xl text-xs text-slate-100 placeholder:text-slate-500"
                required
              />
              <Lock size={16} className="absolute left-3 top-3 text-slate-500" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1 block">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password to confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full glass-input pl-10 pr-3 py-2.5 rounded-xl text-xs text-slate-100 placeholder:text-slate-500"
                  required
                />
                <Lock size={16} className="absolute left-3 top-3 text-slate-500" />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                <span className="text-[11px]">Remember me</span>
              </label>
              <span className="text-[10px] text-slate-500">Basic secure session</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : mode === 'login' ? (
              <>
                <span>Sign In to FoodPlate</span>
                <ArrowRight size={14} />
              </>
            ) : (
              <>
                <UserPlus size={14} />
                <span>Create Account & Start Tracking</span>
              </>
            )}
          </button>
        </form>

        {/* Security / Privacy reassurance banner */}
        <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-center gap-2 text-[10px] text-slate-500">
          <ShieldCheck size={13} className="text-indigo-400" />
          <span>Basic secure password storage & isolated personal data</span>
        </div>
      </div>

      {/* One-Click Quick Demo Switcher */}
      <div className="mt-6 glass-panel rounded-2xl p-4 border border-slate-800/60 text-center">
        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
          ⚡ Quick 1-Click Test Individuals
        </p>
        <p className="text-[10px] text-slate-400 mb-3">
          Test multiple user profiles to see how each individual's data and meals remain completely isolated:
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleQuickDemo({ email: 'rahul@foodplate.local', password: 'password123', name: 'Rahul Sharma' })}
            className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                R
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-200 truncate">Rahul</p>
                <p className="text-[9px] text-slate-500 truncate">User 1</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleQuickDemo({ email: 'priya@foodplate.local', password: 'password123', name: 'Priya Patel' })}
            className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                P
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-200 truncate">Priya</p>
                <p className="text-[9px] text-slate-500 truncate">User 2</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
