
'use client';

import { useState } from 'react';
import { AlertCircle, HelpCircle, ChevronDown, ChevronUp, X, Check, Camera, Lightbulb } from 'lucide-react';
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
  onPhotoRequest,
  fulfillmentType,
}: {
  notifications: Notification[];
  listingId: string;
  onResolve: () => void;
  onScrollToField?: (field: string) => void;
  itemCategory?: string | null;
  onAddDetail?: (text: string) => void;
  onPhotoRequest?: (requirement: string) => void;
  fulfillmentType?: string | null;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showChipBin, setShowChipBin] = useState(false);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [activePhotoNotification, setActivePhotoNotification] = useState<Notification | null>(null);

  // Filter out shipping-related notifications if fulfillment type is "local"
  const filteredNotifications = fulfillmentType === 'local'
    ? notifications.filter(n => n.field !== 'shipping')
    : notifications;

  if (filteredNotifications.length === 0) return null;

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

  // Extract action keyword from PHOTO notification message
  const extractPhotoAction = (message: string): string => {
    // Extract key action words from the message
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('close-up') || lowerMessage.includes('closeup')) {
      return 'closeup';
    }
    if (lowerMessage.includes('detailed')) {
      return 'detailed photo';
    }
    if (lowerMessage.includes('full view') || lowerMessage.includes('overall')) {
      return 'full view';
    }
    if (lowerMessage.includes('serial') || lowerMessage.includes('tag') || lowerMessage.includes('label')) {
      return 'serial/tags';
    }
    return 'photo';
  };

  // Generate contextual helper text for PHOTO notifications
  const getPhotoHelperText = (message: string): string => {
    const action = extractPhotoAction(message);
    return `Select to add ${action}`;
  };

  const handlePhotoNotificationClick = (notification: Notification) => {
    setActivePhotoNotification(notification);
    setShowPhotoDialog(true);
  };

  const handleNotificationClick = (notification: Notification) => {
    // PHOTO notifications handled separately
    if (notification.type === 'PHOTO') {
      handlePhotoNotificationClick(notification);
      return;
    }

    // Scroll to the specific field if it exists, otherwise default to description
    if (onScrollToField) {
      if (notification.field) {
        onScrollToField(notification.field);
      } else {
        // No specific field - add to description
        onScrollToField('description');
      }
    }

    // Show chip bin for filling the field or description
    setActiveNotification(notification);
    setShowChipBin(true);
  };

  const handleChipSelect = (text: string) => {
    if (onAddDetail) {
      // If notification has no specific field, add to description in list form
      if (activeNotification && !activeNotification.field) {
        // Add as bullet point list item
        onAddDetail(`\n• ${text}`);
      } else {
        // Add directly to specified field
        onAddDetail(text);
      }
    }

    // Resolve the notification after chip selection
    if (activeNotification) {
      resolveNotification(activeNotification.id);
    }

    toast.success('Detail added');
    setShowChipBin(false);
    setActiveNotification(null);
  };

  const alerts = filteredNotifications.filter(n => n.type === 'ALERT');
  const questions = filteredNotifications.filter(n => n.type === 'QUESTION');
  const photos = filteredNotifications.filter(n => n.type === 'PHOTO');
  const insights = filteredNotifications.filter(n => n.type === 'INSIGHT');

  return (
    <div className="space-y-3">
      {/* Notifications */}
      {(alerts.length > 0 || questions.length > 0 || photos.length > 0 || insights.length > 0) && (
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
                {photos.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Camera className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">{photos.length}</span>
                  </div>
                )}
                {insights.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-medium text-amber-900">{insights.length}</span>
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
                {/* Alerts first (red - required fields) */}
                {alerts.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="border-2 border-red-400 bg-red-50 rounded-lg p-3 cursor-pointer hover:bg-red-100 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">
                          {notification.message}
                        </p>
                        <p className="text-xs text-red-700 mt-1 font-medium">
                          💡 Tap to address
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

                {/* PHOTO notifications (purple - triggers camera/upload dialog) */}
                {photos.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handlePhotoNotificationClick(notification)}
                    className="border-2 border-purple-300 bg-purple-50 rounded-lg p-3 cursor-pointer hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Camera className="w-5 h-5 flex-shrink-0 mt-0.5 text-purple-600" />
                      <div className="flex-1">
                        <p className="text-sm text-purple-900">
                          {notification.message}
                        </p>
                        <p className="text-xs text-purple-700 mt-1 font-medium">
                          📸 {getPhotoHelperText(notification.message)}
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

                {/* Insights (amber - optimization tips) */}
                {insights.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="border-2 border-amber-300 bg-amber-50 rounded-lg p-3 cursor-pointer hover:bg-amber-100 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                      <div className="flex-1">
                        <p className="text-sm text-amber-900">
                          {notification.message}
                        </p>
                        <p className="text-xs text-amber-700 mt-1 font-medium">
                          💡 Tap to address
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

                {/* Questions (blue - clarifications) */}
                {questions.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="border-2 border-blue-300 bg-blue-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm text-blue-900">
                          {notification.message}
                        </p>
                        <p className="text-xs text-blue-700 mt-1 font-medium">
                          💡 Tap to address
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

      {/* Photo Upload/Camera Dialog */}
      {showPhotoDialog && activePhotoNotification && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowPhotoDialog(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <Camera className="w-12 h-12 mx-auto mb-3 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {activePhotoNotification.message}
              </h3>
              <p className="text-sm text-gray-600">
                Choose how you'd like to add this photo
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => {
                  if (onPhotoRequest) {
                    onPhotoRequest(activePhotoNotification.message);
                  }
                  setShowPhotoDialog(false);
                  setActivePhotoNotification(null);
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg"
              >
                📷 Camera
              </Button>

              <Button
                onClick={() => {
                  if (onPhotoRequest) {
                    onPhotoRequest(activePhotoNotification.message);
                  }
                  setShowPhotoDialog(false);
                  setActivePhotoNotification(null);
                }}
                variant="outline"
                className="w-full border-2 border-purple-300 text-purple-700 hover:bg-purple-50 py-6 text-lg"
              >
                📤 Upload
              </Button>

              <Button
                onClick={() => {
                  setShowPhotoDialog(false);
                  setActivePhotoNotification(null);
                }}
                variant="ghost"
                className="w-full text-gray-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
