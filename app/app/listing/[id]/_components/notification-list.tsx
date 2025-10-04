
'use client';

import { useState } from 'react';
import { AlertCircle, HelpCircle, ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import SmartChipBin from './smart-chip-bin';

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
  itemCategory,
  onAddDetail,
}: {
  notifications: Notification[];
  listingId: string;
  onResolve: () => void;
  onScrollToField?: (field: string) => void;
  itemCategory?: string | null;
  onAddDetail?: (text: string) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showChipBin, setShowChipBin] = useState(false);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);

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

  const handleAddDetailsClick = (notification: Notification) => {
    setActiveNotification(notification);
    setShowChipBin(true);
  };

  const handleChipSelect = (text: string) => {
    if (onAddDetail) {
      onAddDetail(text);
    }
    
    // Resolve the notification after chip selection
    if (activeNotification) {
      resolveNotification(activeNotification.id);
    }
    
    toast.success('Detail added to description');
    setShowChipBin(false);
    setActiveNotification(null);
  };

  const handleActionClick = async (notification: Notification) => {
    if (!notification.actionType) return;

    // Handle special actions
    switch (notification.actionType) {
      case 'retake_photo':
      case 'add_photo':
        // Navigate to gallery section (scroll to photo gallery)
        document.getElementById('photo-gallery')?.scrollIntoView({ behavior: 'smooth' });
        await resolveNotification(notification.id);
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
        } else {
          await resolveNotification(notification.id);
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
  const questions = notifications.filter(n => n.type === 'QUESTION');

  return (
    <div className="space-y-3">
      {/* Notifications */}
      {(alerts.length > 0 || questions.length > 0) && (
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
                {questions.length > 0 && (
                  <div className="flex items-center gap-1">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">{questions.length}</span>
                  </div>
                )}
              </div>
              <span className="font-medium text-gray-900">
                Notifications
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
                {/* Alerts first (red - required) */}
                {alerts.map((notification) => (
                  <div
                    key={notification.id}
                    className="border-2 border-red-400 bg-red-50 rounded-lg p-3"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                      <div className="flex-1 cursor-pointer" onClick={() => handleAlertClick(notification)}>
                        <p className="text-sm font-medium text-red-900">
                          {notification.message}
                        </p>
                        {notification.field && (
                          <p className="text-xs text-red-700 mt-1 font-medium">
                            ⚠️ Tap to jump to: {notification.field}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAlertClick(notification)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Yes
                        </Button>
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
                ))}

                {/* Questions (blue - actionable insights) */}
                {questions.map((notification) => {
                  const isClickable = notification.actionType && ['retake_photo', 'add_photo', 'inoperable_check'].includes(notification.actionType);
                  const allowAddDetails = notification.message?.toLowerCase().includes('buyer should know') || 
                                         notification.message?.toLowerCase().includes('details') ||
                                         notification.message?.toLowerCase().includes('anything else');
                  
                  return (
                    <div
                      key={notification.id}
                      className="border-2 border-blue-300 bg-blue-50 rounded-lg p-3"
                    >
                      <div className="flex items-start gap-3">
                        <HelpCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm text-blue-900">
                            {notification.message}
                          </p>
                          {allowAddDetails && (
                            <p className="text-xs text-blue-700 mt-1 font-medium">
                              💡 Use smart chips to quickly add details
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {allowAddDetails && (
                            <Button
                              size="sm"
                              onClick={() => handleAddDetailsClick(notification)}
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              Add Details
                            </Button>
                          )}
                          {isClickable && !allowAddDetails && (
                            <Button
                              size="sm"
                              onClick={() => handleActionClick(notification)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
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
      )}
      
      {/* Smart Chip Bin */}
      <SmartChipBin
        isOpen={showChipBin}
        onClose={() => {
          setShowChipBin(false);
          setActiveNotification(null);
        }}
        onChipSelect={handleChipSelect}
        notificationMessage={activeNotification?.message}
        itemCategory={itemCategory}
        listingId={listingId}
      />
    </div>
  );
}
