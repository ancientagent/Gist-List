
'use client';

import { useState } from 'react';
import { AlertCircle, HelpCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  message: string;
  field: string | null;
  resolved: boolean;
}

export default function NotificationList({
  notifications,
  listingId,
  onResolve,
}: {
  notifications: Notification[];
  listingId: string;
  onResolve: () => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (notifications.length === 0) return null;

  const resolveNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/resolve`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to resolve');

      toast.success('Notification resolved');
      onResolve();
    } catch (error) {
      toast.error('Failed to resolve notification');
    }
  };

  const alertCount = notifications.filter(n => n.type === 'ALERT').length;
  const preferenceCount = notifications.filter(n => n.type === 'PREFERENCE').length;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {alertCount > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">{alertCount}</span>
              </div>
            )}
            {preferenceCount > 0 && (
              <div className="flex items-center gap-1">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">{preferenceCount}</span>
              </div>
            )}
          </div>
          <span className="font-medium text-gray-900">
            {alertCount > 0 && preferenceCount > 0
              ? 'Actions & Questions'
              : alertCount > 0
              ? 'Actions Required'
              : 'Questions for You'}
          </span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Notification List - Collapsible */}
      {!isCollapsed && (
        <div className="border-t">
          <div className="p-4 space-y-3">
            {notifications.map((notification) => {
              const isAlert = notification.type === 'ALERT';
              const Icon = isAlert ? AlertCircle : HelpCircle;
              const bgClass = isAlert ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200';
              const iconClass = isAlert ? 'text-red-600' : 'text-blue-600';
              const textClass = isAlert ? 'text-red-900' : 'text-blue-900';
              
              return (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-3 ${bgClass}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconClass}`} />
                    <div className="flex-1">
                      <p className={`text-sm ${textClass}`}>
                        {notification.message}
                      </p>
                      {notification.field && (
                        <p className="text-xs text-gray-600 mt-1">
                          Field: {notification.field}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resolveNotification(notification.id)}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
