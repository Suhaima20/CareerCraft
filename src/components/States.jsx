import { AlertCircle, RefreshCw } from 'lucide-react';

export function ErrorState({ message = 'Something went wrong', onRetry, compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle size={16} />
        <span>{message}</span>
        {onRetry && <button onClick={onRetry} className="link text-xs">Retry</button>}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <AlertCircle size={48} className="text-red-500" />
      <p className="text-muted">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          <RefreshCw size={16} /> Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      {Icon && <Icon size={48} className="text-muted opacity-50" />}
      <p className="font-medium" style={{ color: 'var(--text)' }}>{title}</p>
      {message && <p className="text-sm text-muted max-w-md">{message}</p>}
      {action}
    </div>
  );
}
