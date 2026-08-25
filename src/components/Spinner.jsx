import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 24, className = '' }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} style={{ color: 'var(--primary)' }} />;
}

export function FullPageSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Spinner size={40} />
      <p className="text-muted text-sm">{label}</p>
    </div>
  );
}

export function ButtonSpinner() {
  return <Loader2 size={16} className="animate-spin" />;
}
