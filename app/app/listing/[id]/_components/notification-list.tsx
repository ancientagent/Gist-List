
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
  type,
  listingId,
  onResolve,
}: {
  notifications: Notification[];
  type: 'alert' | 'preference';
  listingId: string;
  onResolve: () => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (notifications.length === 0) return null;

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

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

  const Icon = type === 'alert' ? AlertCircle : HelpCircle;
  const colorClass = type === 'alert' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200';
  const iconColorClass = type === 'alert' ? 'text-red-600' : 'text-blue-600';
  const textColorClass = type === 'alert' ? 'text-red-900' : 'text-blue-900';

  return (
    <div className="space-y-2">
      {notifications.map((notification) => {
        const isExpanded = expandedIds.has(notification.id);
        
        return (
          <div
            key={notification.id}
            className={`border rounded-lg overflow-hidden ${colorClass}`}
          >
            <button
              onClick={() => toggleExpand(notification.id)}
              className="w-full p-3 flex items-center gap-3 hover:bg-black/5 transition-colors"
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${iconColorClass}`} />
              {!isExpanded ? (
                <span className={`flex-1 text-left text-sm font-medium ${textColorClass}`}>
                  {type === 'alert' ? 'Action Required' : 'Question'}
                </span>
              ) : (
                <span className={`flex-1 text-left text-sm ${textColorClass}`}>
                  {notification.message}
                </span>
              )}
              {isExpanded ? (
                <ChevronUp className={`w-4 h-4 ${iconColorClass}`} />
              ) : (
                <ChevronDown className={`w-4 h-4 ${iconColorClass}`} />
              )}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resolveNotification(notification.id)}
                  className={`${type === 'alert' ? 'text-red-600 hover:text-red-700' : 'text-blue-600 hover:text-blue-700'}`}
                >
                  <X className="w-4 h-4 mr-1" />
                  Resolve
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
