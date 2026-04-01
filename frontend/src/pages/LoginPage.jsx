import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import useAuthStore from '../context/authStore';

function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-cream flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-forest-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-forest-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-display font-bold">G</span>
            </div>
            <span className="font-display font-semibold text-white text-lg">GolfCharity</span>
          </Link>
        </div>
        <div className="relative z-10">
          <blockquote className="font-display text-3xl text-white font-bold leading-snug mb-4">
            "Every round is a chance to do some good."
          </blockquote>
          <p className="text-forest-300 text-sm">Golf. Prizes. Impact.</p>
        </div>
        <div className="relative z-10 text-forest-600 text-xs">
          © {new Date().getFullYear()} GolfCharity
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 bg-forest-700 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">G</span>
            </div>
            <span className="font-display font-semibold text-charcoal">GolfCharity</span>
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="font-display text-3xl font-bold text-charcoal mb-1">{title}</h1>
            <p className="text-gray-500 text-sm mb-8">{subtitle}</p>
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setAuth, refreshMe } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      setAuth(data.token, data.user);
      await refreshMe();
      toast.success(`Welcome back, ${data.user.full_name.split(' ')[0]}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account to continue">
      {params.get('session') === 'expired' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
          Your session expired. Please sign in again.
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email address</label>
          <input
            type="email"
            className="input"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">
        Don't have an account?{' '}
        <Link to="/signup" className="text-forest-700 font-medium hover:underline">
          Sign up free
        </Link>
      </p>
    </AuthLayout>
  );
}

export function SignupPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', form);
      setAuth(data.token, data.user);
      toast.success('Account created! Welcome to GolfCharity 🎉');
      navigate('/subscribe');
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Signup failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 8) return { label: 'Too short', color: 'bg-red-400' };
    if (!/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { label: 'Weak', color: 'bg-orange-400' };
    if (!/[@$!%*?&]/.test(p)) return { label: 'Moderate', color: 'bg-yellow-400' };
    return { label: 'Strong', color: 'bg-forest-500' };
  };

  const strength = passwordStrength();

  return (
    <AuthLayout title="Join GolfCharity" subtitle="Create your free account — subscribe after signup">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Full name</label>
          <input
            type="text"
            className="input"
            placeholder="Your name"
            value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })}
            required
            minLength={2}
          />
        </div>
        <div>
          <label className="label">Email address</label>
          <input
            type="email"
            className="input"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            className="input"
            placeholder="Min 8 chars, uppercase, number & symbol"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />
          {strength && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${strength.color} transition-all duration-300`}
                  style={{ width: strength.label === 'Too short' ? '25%' : strength.label === 'Weak' ? '50%' : strength.label === 'Moderate' ? '75%' : '100%' }}
                />
              </div>
              <span className="text-xs text-gray-500">{strength.label}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-forest-700 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;
