import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { authAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { validateEmail } from '@/utils/helpers';
import { ButtonSpinner } from '@/components/Spinner';

export default function AdminLogin() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    const emailErr = validateEmail(email);
    if (emailErr) newErrors.email = emailErr;
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await authAPI.adminLogin({ email, password });
      if (res.data.user.role !== 'admin') {
        toast.error('This account does not have admin privileges.');
        return;
      }
      login(res.data.access_token, res.data.user);
      toast.success('Welcome, Administrator!');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Admin login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(64,61,136,0.1)' }}>
            <Shield size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 className="text-2xl font-heading font-bold mb-1" style={{ color: 'var(--text)' }}>Admin Login</h1>
          <p className="text-sm text-muted">Authorized personnel only</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="admin-email">Admin Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input id="admin-email" type="email" className="input pl-10" placeholder="admin@careercraft.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="label" htmlFor="admin-password">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input id="admin-password" type={showPassword ? 'text' : 'password'} className="input pl-10 pr-10" placeholder="Admin password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <ButtonSpinner /> : <><LogIn size={18} /> Admin Login</>}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          <Link to="/" className="link">Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
