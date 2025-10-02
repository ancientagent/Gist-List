
'use client';

import { useState } from 'react';
import { AlertCircle, Lightbulb, ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  message: string;
  field: string | null;
  actionType: string | null;
  actionData: string | null;
  resolved: boolean;
}

export default function NotificationList({
  notifications,
  listingId,
  onResolve,
  onScrollToField,
}: {
  notifications: Notification[];
  listingId: string;
  onResolve: () => void;
  onScrollToField?: (field: string) => void;
}) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (notifications.length === 0) return null;

  const resolveNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/resolve`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to resolve');

      onResolve();
    } catch (error) {
      toast.error('Failed to resolve notification');
    }
  };

  const handleActionClick = async (notification: Notification) => {
    if (!notification.actionType) return;

    // Handle special actions
    switch (notification.actionType) {
      case 'retake_photo':
      case 'add_photo':
        // Navigate to gallery section (scroll to photo gallery)
        document.getElementById('photo-gallery')?.scrollIntoView({ behavior: 'smooth' });
        break;

      case 'inoperable_check':
        // Show confirmation dialog and update condition to "For Parts"
        if (confirm('Is the item inoperable/broken?')) {
          try {
            await fetch(`/api/listings/${listingId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ condition: 'For Parts' }),
            });
            toast.success('Condition updated to "For Parts"');
            await resolveNotification(notification.id);
            onResolve();
          } catch (error) {
            toast.error('Failed to update condition');
          }
        }
        break;

      default:
        // For other actions, just resolve when clicked (user acknowledges)
        await resolveNotification(notification.id);
    }
  };

  const handleAlertClick = (notification: Notification) => {
    if (notification.field && onScrollToField) {
      onScrollToField(notification.field);
    }
  };

  const alerts = notifications.filter(n => n.type === 'ALERT');
  const actions = notifications.filter(n => n.type === 'ACTION');

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">{alerts.length}</span>
              </div>
            )}
            {actions.length > 0 && (
              <div className="flex items-center gap-1">
                <Lightbulb className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-900">{actions.length}</span>
              </div>
            )}
          </div>
          <span className="font-medium text-gray-900">
            Alerts and Actions
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
            {/* Alerts first */}
            {alerts.map((notification) => (
              <div
                key={notification.id}
                className="border-2 border-red-300 bg-red-50 rounded-lg p-3 cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => handleAlertClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">
                      {notification.message}
                    </p>
                    {notification.field && (
                      <p className="text-xs text-red-700 mt-1">
                        Tap to go to: {notification.field}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Actions */}
            {actions.map((notification) => {
              const isClickable = notification.actionType && ['retake_photo', 'add_photo', 'inoperable_check'].includes(notification.actionType);
              
              return (
                <div
                  key={notification.id}
                  className="border border-emerald-200 bg-emerald-50 rounded-lg p-3"
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
                    <div className="flex-1">
                      <p className="text-sm text-emerald-900">
                        {notification.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isClickable && (
                        <Button
                          size="sm"
                          onClick={() => handleActionClick(notification)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Yes
                        </Button>
                      )}
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
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
