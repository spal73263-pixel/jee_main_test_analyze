import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, Mail, Sparkles, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('demo@jeemain.ai');
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-primary-500 flex items-center justify-center text-white shadow-lg shadow-indigo-100 font-extrabold text-2xl">
            Ω
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          JEE Main Performance Analyzer
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          AI-Powered Diagnostic Mock Test Analytics & Dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-xs text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
            </button>
          </form>

          {/* Quick Sign-In Option */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDemoFill}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-700 text-xs font-semibold transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Fill Om Pal Account</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              demo@jeemain.ai • password123 (Clean account — enter your own tests & plans)
            </p>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Register as New Student
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
