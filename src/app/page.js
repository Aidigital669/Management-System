'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  HelpCircle,
  UserCheck,
  ArrowRight,
  Globe,
  User,
  Building
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  // Sign Up states
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Social Media Marketing');

  // Client states
  const [isClient, setIsClient] = useState(false);
  const [clientEmail, setClientEmail] = useState('');

  const isSpecialRole = email === 'nikhil@aidigital.com' || email === 'praveen@aidigital.com' || email === 'admin@workforce.com';

  const [hasWelcomedNikhil, setHasWelcomedNikhil] = useState(false);

  useEffect(() => {
    const trimmedEmail = email.toLowerCase().trim();
    if (trimmedEmail === 'nikhil@aidigital.com' && !hasWelcomedNikhil) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Welcome back Nikhil Sir! Please enter your email and password.");
        const voices = window.speechSynthesis.getVoices();
        const engVoice = voices.find(v => v.lang.startsWith('en-') && (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural')));
        if (engVoice) utterance.voice = engVoice;
        window.speechSynthesis.speak(utterance);
        setHasWelcomedNikhil(true);
      }
    } else if (trimmedEmail !== 'nikhil@aidigital.com') {
      setHasWelcomedNikhil(false);
    }
  }, [email, hasWelcomedNikhil]);

  // Check if user is already logged in
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          router.push('/dashboard');
        } else {
          setCheckingSession(false);
        }
      } catch (err) {
        setCheckingSession(false);
      }
    }
    checkSession();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isClient) {
      if (!clientEmail) {
        setError('Please enter your registered email address.');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/auth/client-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: clientEmail })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Client email not found.');
          setLoading(false);
          return;
        }
        router.push('/dashboard');
      } catch (err) {
        setError('Failed to connect to the server.');
        setLoading(false);
      }
      return;
    }

    if (isSignUp) {
      if (!name || !email || !password || !department) {
        setError('Please fill out all fields.');
        return;
      }
    } else {
      if (!email || !password) {
        setError('Please enter both email and password.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Register employee
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, department })
        });

        let regData = {};
        try {
          regData = await res.json();
        } catch (e) {}

        if (!res.ok) {
          setError(regData.error || 'Registration failed.');
          setLoading(false);
          return;
        }

        // Auto login after registration
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (!loginRes.ok) {
          setError('Account created, but automatic login failed. Please log in manually.');
          setIsSignUp(false);
          setLoading(false);
          return;
        }

        router.push('/dashboard');
      } else {
        // Standard login
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        let loginData = {};
        try {
          loginData = await res.json();
        } catch (jsonErr) {
          console.error('Non-JSON response from login API:', jsonErr);
        }

        if (!res.ok) {
          setError(loginData.error || `Login failed (${res.status}: ${res.statusText || 'Server Error'})`);
          setLoading(false);
          return;
        }

        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Login fetch exception:', err);
      setError(`Connection error: ${err.message || 'Failed to reach server'}`);
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">Securing connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-slate-50 text-slate-900">
      {/* Left visual panel */}
      <div
        className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-16 text-white bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: `url('/office_bg.png')` }}
      >
        {/* Dark blur overlay */}
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px] z-0"></div>

        {/* Top brand logo */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-sans font-extrabold text-xl tracking-tight">WorkForce OS</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 max-w-xl my-auto">
          <h1 className="text-5xl font-extrabold tracking-tight leading-tight mb-6 bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent animate-slide-up">
            Empower your global team with clarity.
          </h1>
          <p className="text-lg text-slate-200 leading-relaxed font-light animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            Manage payroll, schedules, and employee lifecycle in one unified, high-performance platform designed for the modern enterprise.
          </p>
        </div>

        {/* Bottom statistics */}
        <div className="relative z-10 flex gap-12 border-t border-white/10 pt-8">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Uptime</div>
            <div className="text-2xl font-black font-sans text-cyan-400">99.99%</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Scale</div>
            <div className="text-2xl font-black font-sans text-cyan-400">10k+ Orgs</div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="lg:col-span-5 flex flex-col justify-between p-5 sm:p-10 md:p-16 bg-white shadow-2xl relative overflow-hidden min-h-screen lg:min-h-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none animate-pulse-soft"></div>
        <div className="w-full max-w-md mx-auto my-auto flex flex-col gap-6 sm:gap-8 relative z-10 animate-scale-in">

          {/* Mobile Brand Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-sans font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              WorkForce OS
            </span>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setIsClient(false); setError(''); }}
              className={`flex-1 py-2 font-bold uppercase rounded-lg transition ${!isSignUp && !isClient ? 'bg-white text-blue-800 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Staff Login
            </button>
            {!isSpecialRole && !isClient && (
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setIsClient(false); setError(''); }}
                className={`flex-1 py-2 font-bold uppercase rounded-lg transition ${isSignUp ? 'bg-white text-blue-800 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sign Up
              </button>
            )}
            <button
              type="button"
              onClick={() => { setIsClient(true); setIsSignUp(false); setError(''); }}
              className={`flex-1 py-2 font-bold uppercase rounded-lg transition ${isClient ? 'bg-white text-blue-800 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Client Portal
            </button>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
              {isClient ? 'Client Portal' : isSignUp ? 'Create account' : 'Welcome back'}
            </h2>
            <p className="text-slate-500 text-sm">
              {isClient ? 'Enter your registered email address to track your plan deliverables.' : isSignUp ? 'Self-register as a new employee to get started.' : 'Enter your credentials to access your dashboard.'}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-shake">
              <span className="w-2 h-2 mt-1.5 rounded-full bg-red-600 shrink-0"></span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" autoComplete="off">
            {isClient ? (
              <div className="flex flex-col gap-1.5 animate-fade-in">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Registered Email ID</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@company.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-900"
                  />
                </div>
              </div>
            ) : (
              <>
                {isSignUp && (
                  <>
                    <div className="flex flex-col gap-1.5 animate-fade-in">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                      <div className="relative flex items-center">
                        <User className="absolute left-3 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 animate-fade-in">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Department</label>
                      <div className="relative flex items-center">
                        <Building className="absolute left-3 w-5 h-5 text-slate-400" />
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-900 appearance-none cursor-pointer"
                        >
                          <option value="Social Media Marketing">Social Media Marketing</option>
                          <option value="Video Editing / Content Creator">Video Editing / Content Creator</option>
                          <option value="Graphics">Graphics</option>
                          <option value="Software Development">Software Development</option>
                          <option value="Sales">Sales</option>
                          <option value="HR">HR</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {isSignUp ? 'Work Email' : 'Corporate Email'}
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoComplete="off"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                    {!isSignUp && (
                      <a href="#" onClick={(e) => { e.preventDefault(); alert("Demo passwords are ceo123, admin123, and emp123"); }} className="text-xs font-bold text-blue-700 hover:underline">Forgot password?</a>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-650 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {!isSignUp && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer py-1">
                    <input type="checkbox" id="stay-signed" className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500" defaultChecked />
                    <label htmlFor="stay-signed" className="cursor-pointer select-none">Stay signed in for 30 days</label>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{isClient ? 'Access Portal' : isSignUp ? 'Register Account' : 'Continue to Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>


        </div>

        {/* Footer */}
        <div className="w-full flex items-center justify-between text-slate-400 text-xs mt-8">
          <button className="flex items-center gap-1 hover:text-slate-600 transition">
            <Globe className="w-4 h-4" />
            English (US)
          </button>
          <a href="#" onClick={(e) => { e.preventDefault(); alert("Contact Workforce support at support@workforce.com"); }} className="flex items-center gap-1 hover:text-slate-600 transition">
            <HelpCircle className="w-4 h-4" />
            Help
          </a>
        </div>
      </div>
    </div>
  );
}
