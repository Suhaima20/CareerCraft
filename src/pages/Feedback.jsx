import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { feedbackAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ButtonSpinner } from '../components/Spinner';

export default function Feedback() {
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      await feedbackAPI.submit({ message: message.trim(), name: user?.name || 'Guest', email: user?.email });
      toast.success('Thank you for your feedback!');
      setMessage('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(64,61,136,0.1)' }}>
          <MessageSquare size={32} style={{ color: 'var(--primary)' }} />
        </div>
        <h1 className="text-3xl font-heading font-bold mb-2" style={{ color: 'var(--text)' }}>Feedback</h1>
        <p className="text-muted">We'd love to hear your thoughts about CareerCraft</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label" htmlFor="feedback">Your Feedback</label>
          <textarea
            id="feedback"
            rows={6}
            className="input resize-none"
            placeholder="Share your experience, suggestions, or report an issue..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
          />
          <p className="text-xs text-muted mt-1">{message.length}/2000 characters</p>
        </div>

        {!isAuthenticated && (
          <p className="text-xs text-muted">You are submitting as a guest. {user ? '' : 'Your feedback will be stored without an account association.'}</p>
        )}

        <button type="submit" disabled={loading || !message.trim()} className="btn-primary w-full">
          {loading ? <ButtonSpinner /> : <><Send size={18} /> Submit Feedback</>}
        </button>
      </form>
    </div>
  );
}
