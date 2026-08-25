export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateStr);
}

export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str, n = 100) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '...' : str;
}

export const PROFESSIONS = ['Student', 'Fresher', 'Experienced Professional', 'Career Switcher', 'Other'];

export const COUNTRY_CODES = [
  { code: '+91', label: 'India (+91)', length: 10 },
  { code: '+92', label: 'Pakistan (+92)', length: 10 },
  { code: '+1', label: 'USA/Canada (+1)', length: 10 },
  { code: '+44', label: 'UK (+44)', length: 10 },
  { code: '+61', label: 'Australia (+61)', length: 9 },
  { code: '+971', label: 'UAE (+971)', length: 9 },
  { code: '+966', label: 'Saudi Arabia (+966)', length: 9 },
  { code: '+65', label: 'Singapore (+65)', length: 8 },
];

export function validateName(name) {
  if (!name || name.trim().length < 2) return 'Name must be at least 2 characters';
  if (!/^[a-zA-Z\s.'-]+$/.test(name.trim())) return 'Name can only contain letters';
  if (/\d/.test(name)) return 'Name cannot contain numbers';
  return null;
}

export function validateEmail(email) {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) return 'Password must contain a special character';
  return null;
}

export function validateAge(age) {
  const n = Number(age);
  if (!age) return 'Age is required';
  if (isNaN(n) || n < 13) return 'You must be at least 13 years old';
  if (n > 120) return 'Please enter a valid age';
  return null;
}

export function validatePhone(phone, countryCode) {
  if (!phone) return 'Phone number is required';
  const country = COUNTRY_CODES.find((c) => c.code === countryCode);
  const digits = phone.replace(/\D/g, '');
  if (country && digits.length !== country.length) {
    return `Phone number for ${country.label} must be exactly ${country.length} digits`;
  }
  if (!/^\d+$/.test(digits)) return 'Phone number can only contain digits';
  return null;
}

export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) score++;
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['#B5444B', '#B5444B', '#C99A2E', '#C99A2E', '#3B7A57', '#3B7A57'];
  return { score, label: labels[score], color: colors[score] };
}
