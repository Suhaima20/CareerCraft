import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
      <Compass size={64} style={{ color: 'var(--primary)' }} className="mb-4" />
      <h1 className="text-6xl font-heading font-bold mb-2" style={{ color: 'var(--text)' }}>404</h1>
      <p className="text-xl text-muted mb-6">This page seems to have taken a career detour.</p>
      <Link to="/" className="btn-primary">Back to Home</Link>
    </div>
  );
}
