
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

  const handleQuestionClick = (notification: Notification) => {
    // For buyer_disclosure notifications, scroll to description field
    if (notification.actionType === 'buyer_disclosure') {
      if (onScrollToField) {
        onScrollToField('description');
      }
      // Show chip bin for filling disclosure details
      setActiveNotification(notification);
      setShowChipBin(true);
      return;
    }
    
    // Scroll to the field if it exists
    if (notification.field && onScrollToField) {
      onScrollToField(notification.field);
    }
    
    // Show chip bin for filling the field
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
    
    toast.success('Detail added');
    setShowChipBin(false);
    setActiveNotification(null);
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
                    onClick={() => handleQuestionClick(notification)}
                    className="border-2 border-red-400 bg-red-50 rounded-lg p-3 cursor-pointer hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">
                          {notification.message}
                        </p>
                        {notification.field && (
                          <p className="text-xs text-red-700 mt-1 font-medium">
                            ⚠️ Tap to fill: {notification.field}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveNotification(notification.id);
                        }}
                        className="flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Questions (blue - actionable insights) */}
                {questions.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleQuestionClick(notification)}
                    className="border-2 border-blue-300 bg-blue-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm text-blue-900">
                          {notification.message}
                        </p>
                        <p className="text-xs text-blue-700 mt-1 font-medium">
                          {notification.actionType === 'buyer_disclosure' 
                            ? '👆 Press to address.' 
                            : '💡 Tap to add details with smart chips'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveNotification(notification.id);
                        }}
                        className="flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
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
        notificationData={activeNotification?.actionData ? JSON.parse(activeNotification.actionData) : null}
      />
    </div>
  );
}
