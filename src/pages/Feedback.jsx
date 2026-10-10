import { useState } from 'react';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';

import { feedbackAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { ButtonSpinner } from '../components/Spinner';


export default function Feedback() {
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);


  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedMessage = message.trim();

    // ------------------------------------------------------
    // Frontend validation
    // ------------------------------------------------------
    if (!trimmedMessage) {
      toast.error('Please enter your feedback before submitting.');
      return;
    }

    if (trimmedMessage.length > 2000) {
      toast.error('Feedback must be under 2000 characters.');
      return;
    }

    setLoading(true);
    setSubmitted(false);

    try {
      // ----------------------------------------------------
      // Prepare feedback payload
      // ----------------------------------------------------
      const payload = {
        message: trimmedMessage,
        name: user?.name?.trim() || 'Guest',
        email: user?.email || null,
      };

      // ----------------------------------------------------
      // Submit feedback
      // ----------------------------------------------------
      const response = await feedbackAPI.submit(payload);

      // ----------------------------------------------------
      // Successful submission
      // ----------------------------------------------------
      if (response?.data?.feedback) {
        setSubmitted(true);
      }

      setMessage('');

      toast.success(
        'Thank you for your feedback!'
      );

    } catch (err) {
      // ----------------------------------------------------
      // Get backend error safely
      // ----------------------------------------------------
      const backendMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message;

      if (err?.response?.status === 400) {
        toast.error(
          backendMessage ||
          'Please check your feedback and try again.'
        );
      } else if (err?.response?.status === 500) {
        toast.error(
          'Server error while saving feedback. Please try again.'
        );
      } else if (!err?.response) {
        toast.error(
          'Unable to connect to the CareerCraft server.'
        );
      } else {
        toast.error(
          backendMessage ||
          'Failed to submit feedback. Please try again.'
        );
      }

    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">

      {/* ====================================================
          HEADER
      ==================================================== */}
      <div className="text-center mb-8">

        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: 'rgba(64, 61, 136, 0.1)',
          }}
        >
          <MessageSquare
            size={32}
            style={{
              color: 'var(--primary)',
            }}
          />
        </div>

        <h1
          className="text-3xl font-heading font-bold mb-2"
          style={{
            color: 'var(--text)',
          }}
        >
          Feedback
        </h1>

        <p className="text-muted">
          We'd love to hear your thoughts about CareerCraft
        </p>
      </div>


      {/* ====================================================
          SUCCESS MESSAGE
      ==================================================== */}
      {submitted && (
        <div
          className="mb-6 rounded-xl p-4 flex items-start gap-3"
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <CheckCircle2
            size={22}
            style={{
              color: 'var(--success)',
              flexShrink: 0,
            }}
          />

          <div>
            <p
              className="font-semibold"
              style={{
                color: 'var(--text)',
              }}
            >
              Feedback submitted successfully
            </p>

            <p className="text-sm text-muted mt-1">
              Thank you for helping us improve CareerCraft.
            </p>
          </div>
        </div>
      )}


      {/* ====================================================
          FORM
      ==================================================== */}
      <form
        onSubmit={handleSubmit}
        className="card p-6 space-y-5"
      >

        {/* Feedback message */}
        <div>

          <label
            className="label"
            htmlFor="feedback"
          >
            Your Feedback
          </label>

          <textarea
            id="feedback"
            name="feedback"
            rows={6}
            className="input resize-none"
            placeholder="Share your experience, suggestions, or report an issue..."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setSubmitted(false);
            }}
            maxLength={2000}
            disabled={loading}
          />

          <div className="flex justify-between items-center mt-1">

            <p className="text-xs text-muted">
              {message.length}/2000 characters
            </p>

            {message.length >= 1800 && (
              <p
                className="text-xs"
                style={{
                  color: 'var(--warning)',
                }}
              >
                Approaching character limit
              </p>
            )}

          </div>
        </div>


        {/* Guest information */}
        {!isAuthenticated && (
          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--surface-soft)',
              border: '1px solid var(--border)',
            }}
          >
            <p className="text-sm text-muted">
              You are submitting as a guest.
            </p>

            <p className="text-xs text-muted mt-1">
              Your feedback will be stored without an account
              association.
            </p>
          </div>
        )}


        {/* Logged-in user information */}
        {isAuthenticated && user && (
          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--surface-soft)',
              border: '1px solid var(--border)',
            }}
          >
            <p className="text-sm text-muted">
              Submitting as
            </p>

            <p
              className="font-medium mt-1"
              style={{
                color: 'var(--text)',
              }}
            >
              {user.name || 'CareerCraft User'}
            </p>

            {user.email && (
              <p className="text-xs text-muted mt-1">
                {user.email}
              </p>
            )}
          </div>
        )}


        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <ButtonSpinner />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Submit Feedback</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}