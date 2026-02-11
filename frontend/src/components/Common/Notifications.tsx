import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useStore } from '../../store/useStore';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'border-studio-success/50 bg-studio-success/10',
  error: 'border-studio-danger/50 bg-studio-danger/10',
  warning: 'border-studio-warning/50 bg-studio-warning/10',
  info: 'border-studio-accent/50 bg-studio-accent/10',
};

export function Notifications() {
  const { notifications, removeNotification } = useStore();

  useEffect(() => {
    notifications.forEach((n) => {
      const timer = setTimeout(() => removeNotification(n.id), 5000);
      return () => clearTimeout(timer);
    });
  }, [notifications, removeNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((n) => {
        const Icon = icons[n.type];
        return (
          <div
            key={n.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${colors[n.type]} animate-in slide-in-from-right`}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm flex-1">{n.message}</p>
            <button
              onClick={() => removeNotification(n.id)}
              className="p-0.5 rounded hover:bg-white/10"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
