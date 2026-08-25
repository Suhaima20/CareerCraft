import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Phone, Calendar, Briefcase, UserPlus } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { validateName, validateEmail, validatePassword, validateAge, validatePhone, getPasswordStrength, PROFESSIONS, COUNTRY_CODES } from '../utils/helpers';
import { ButtonSpinner } from '../components/Spinner';

export default function Register() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', age: '', phone: '', profession: 'Student', email: '', password: '' });
  const [countryCode, setCountryCode] = useState('+91');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const strength = getPasswordStrength(form.password);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    const nameErr = validateName(form.name);
    if (nameErr) newErrors.name = nameErr;
    const ageErr = validateAge(form.age);
    if (ageErr) newErrors.age = ageErr;
    const phoneErr = validatePhone(form.phone, countryCode);
    if (phoneErr) newErrors.phone = phoneErr;
    const emailErr = validateEmail(form.email);
    if (emailErr) newErrors.email = emailErr;
    const passErr = validatePassword(form.password);
    if (passErr) newErrors.password = passErr;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await authAPI.register({
        name: form.name.trim(),
        age: Number(form.age),
        phone: `${countryCode}${form.phone}`,
        profession: form.profession,
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      login(res.data.access_token, res.data.user);
      toast.success("Account created! Let's set up your career path.");
      navigate('/onboarding/career');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold mb-2" style={{ color: 'var(--text)' }}>Create Your Account</h1>
          <p className="text-muted">Start your personalized career journey today</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="name">Full Name</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input id="name" type="text" className="input pl-10" placeholder="John Doe" value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
            </div>
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="age">Age</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input id="age" type="number" min="13" max="120" className="input pl-10" placeholder="18" value={form.age} onChange={(e) => handleChange('age', e.target.value)} />
              </div>
              {errors.age && <p className="text-xs text-red-600 mt-1">{errors.age}</p>}
            </div>
            <div>
              <label className="label" htmlFor="profession">Profession</label>
              <div className="relative">
                <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <select id="profession" className="input pl-10" value={form.profession} onChange={(e) => handleChange('profession', e.target.value)}>
                  {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="phone">Phone Number</label>
            <div className="flex gap-2">
              <select className="input w-32" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
              <div className="relative flex-1">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input id="phone" type="tel" className="input pl-10" placeholder="9876543210" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
              </div>
            </div>
            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input id="email" type="email" className="input pl-10" placeholder="you@example.com" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
            </div>
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input id="password" type={showPassword ? 'text' : 'password'} className="input pl-10 pr-10" placeholder="Min 8 characters" value={form.password} onChange={(e) => handleChange('password', e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= strength.score ? strength.color : 'var(--border)' }} />
                  ))}
                </div>
                <p className="text-xs mt-1" style={{ color: strength.color }}>{strength.label}</p>
              </div>
            )}
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <ButtonSpinner /> : <><UserPlus size={18} /> Create Account</>}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account? <Link to="/login" className="link">Log in</Link>
        </p>
      </div>
    </div>
  );
}
