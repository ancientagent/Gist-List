
'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { AlertCircle, HelpCircle, ChevronDown, ChevronUp, X, Camera, Lightbulb, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import SmartChipBin from './smart-chip-bin';
import { type NotificationType } from '@/src/notifications/types';
import { logTelemetryEvent } from '@/lib/telemetry';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  field: string | null;
  actionType: string | null;
  actionData: string | null;
  resolved: boolean;
}

interface NotificationActionData {
  requirement?: string;
  facetTag?: string;
  section?: string;
  [key: string]: any;
}

export interface QuickFactsPayload {
  notification: Notification;
  actionData: Record<string, unknown> | null;
}

export default function NotificationList({
  notifications,
  listingId,
  onResolve,
  onScrollToField,
  itemCategory,
  onAddDetail,
  fulfillmentType,
  onQuickFacts,
}: {
  notifications: Notification[];
  listingId: string;
  onResolve: () => void;
  onScrollToField?: (field: string) => void;
  itemCategory?: string | null;
  onAddDetail?: (text: string) => void;
  fulfillmentType?: string | null;
  onQuickFacts?: (payload: QuickFactsPayload) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showChipBin, setShowChipBin] = useState(false);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  const [allowMultipleEntries, setAllowMultipleEntries] = useState(false);
  const [activeNotificationData, setActiveNotificationData] = useState<NotificationActionData | null>(null);
  const [photoWorkflow, setPhotoWorkflow] = useState({
    isOpen: false,
    notification: null as Notification | null,
    data: null as NotificationActionData | null,
    isSubmitting: false,
    error: '' as string,
    reasons: [] as string[],
  });
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const parseActionData = (raw: string | null): NotificationActionData => {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  };

  const shouldAllowMultiEntry = (
    notification: Notification,
    data: NotificationActionData,
  ): boolean => {
    if (notification.type !== 'QUESTION') {
      return false;
    }

    if (data?.allowMultiple === true) {
      return true;
    }

    const options = Array.isArray(data?.options) ? data.options : [];
    const message = notification.message?.toLowerCase() ?? '';

    const hasInlineOptions =
      message.includes('?') && (message.includes(' or ') || message.includes(','));

    const isYearPrompt = message.includes('year/version');

    return options.length === 0 && !hasInlineOptions && !isYearPrompt;
  };

  const formatRequirement = (value: string | undefined) => {
    if (!value) return '';
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const resetPhotoWorkflow = () => {
    setPhotoWorkflow({
      isOpen: false,
      notification: null,
      data: null,
      isSubmitting: false,
      error: '',
      reasons: [],
    });
  };

  const triggerFileSelection = (mode: 'camera' | 'upload') => {
    if (photoWorkflow.isSubmitting) return;
    if (mode === 'camera') {
      cameraInputRef.current?.click();
    } else {
      uploadInputRef.current?.click();
    }
  };

  const submitPhotoFile = async (file: File) => {
    if (!photoWorkflow.notification) return;
    if (!listingId) {
      toast.error('Listing not available');
      return;
    }

    setPhotoWorkflow((prev) => ({ ...prev, isSubmitting: true, error: '', reasons: [] }));

    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('listingId', listingId);
      formData.append('notificationId', photoWorkflow.notification.id);

      if (photoWorkflow.data?.requirement) {
        formData.append('requirement', photoWorkflow.data.requirement);
      }
      if (photoWorkflow.data?.facetTag) {
        formData.append('facetTag', photoWorkflow.data.facetTag);
      }

      const uploadResponse = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const payload = await uploadResponse.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to upload photo');
      }

      const uploadJson = await uploadResponse.json();
      const newPhotoId = uploadJson.photoId as string | undefined;

      if (!newPhotoId) {
        toast.success('Photo uploaded');
        resetPhotoWorkflow();
        onResolve();
        return;
      }

      const verifyResponse = await fetch(`/api/photos/${newPhotoId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      });

      if (verifyResponse.status === 422) {
        const payload = await verifyResponse.json();
        setPhotoWorkflow((prev) => ({
          ...prev,
          isSubmitting: false,
          error: 'We need a clearer shot. Try the tips below and retake the photo.',
          reasons: payload.reasons || [],
        }));
        return;
      }

      if (!verifyResponse.ok) {
        const payload = await verifyResponse.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to verify photo');
      }

      await verifyResponse.json();
      toast.success('Photo verified and notification resolved');
      resetPhotoWorkflow();
      onResolve();
    } catch (error: any) {
      console.error('Photo workflow error:', error);
      setPhotoWorkflow((prev) => ({
        ...prev,
        isSubmitting: false,
        error: error?.message || 'Failed to process photo',
      }));
    }
  };

  const handleWorkflowFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await submitPhotoFile(file);
    event.target.value = '';
  };

  // Filter out shipping-related notifications if fulfillment type is "local"
  const filteredNotifications = fulfillmentType === 'local'
    ? notifications.filter(n => n.field !== 'shipping')
    : notifications;

  if (filteredNotifications.length === 0) return null;

  const resolveNotification = async (notificationId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/resolve`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to resolve');

      onResolve();
      return true;
    } catch (error) {
      toast.error('Failed to resolve notification');
      return false;
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
  const getPhotoHelperText = (notification: Notification): string => {
    const data = parseActionData(notification.actionData);
    if (data.requirement) {
      return `Capture ${formatRequirement(data.requirement)}`;
    }
    const action = extractPhotoAction(notification.message);
    return `Select to add ${action}`;
  };

  const handlePhotoNotificationClick = (notification: Notification) => {
    const parsed = parseActionData(notification.actionData);

    void logTelemetryEvent({
      listingId,
      eventType: 'notification_tap',
      metadata: {
        notificationId: notification.id,
        notificationType: notification.type,
        field: notification.field,
        actionType: notification.actionType,
        section: parsed?.section ?? null,
        mode: 'photo_workflow',
      },
    });

    setPhotoWorkflow({
      isOpen: true,
      notification,
      data: parsed,
      isSubmitting: false,
      error: '',
      reasons: [],
    });
  };

  const handleNotificationClick = (notification: Notification) => {
    const parsed = parseActionData(notification.actionData);

    void logTelemetryEvent({
      listingId,
      eventType: 'notification_tap',
      metadata: {
        notificationId: notification.id,
        notificationType: notification.type,
        field: notification.field,
        actionType: notification.actionType,
        section: parsed?.section ?? null,
      },
    });

    if (notification.actionType === 'buyer_disclosure' && onQuickFacts) {
      setAllowMultipleEntries(false);
      setActiveNotification(null);
      setActiveNotificationData(null);
      onQuickFacts({ notification, actionData: parsed });
      return;
    }

    // PHOTO notifications handled separately
    if (notification.type === 'PHOTO') {
      setAllowMultipleEntries(false);
      setActiveNotification(null);
      setActiveNotificationData(null);
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
    setActiveNotificationData(parsed);
    setAllowMultipleEntries(shouldAllowMultiEntry(notification, parsed));
    setShowChipBin(true);
  };

  const handleChipSelect = (text: string) => {
    if (onAddDetail) {
      const targetsDescription =
        !activeNotification?.field ||
        activeNotification.field === 'description';

      if (targetsDescription) {
        onAddDetail(`\n• ${text}`);
      } else {
        onAddDetail(text);
      }
    }

    if (allowMultipleEntries) {
      return;
    }

    // Resolve the notification after chip selection
    if (activeNotification) {
      void resolveNotification(activeNotification.id);
    }

    toast.success('Detail added');
    setShowChipBin(false);
    setActiveNotification(null);
    setActiveNotificationData(null);
    setAllowMultipleEntries(false);
  };

  const alerts = filteredNotifications.filter(n => n.type === 'ALERT');
  const questions = filteredNotifications.filter(n => n.type === 'QUESTION');
  const photos = filteredNotifications.filter(n => n.type === 'PHOTO');
  const insights = filteredNotifications.filter(n => n.type === 'INSIGHT');

  const handleMultiEntryComplete = async (): Promise<boolean> => {
    const resolved = activeNotification
      ? await resolveNotification(activeNotification.id)
      : true;

    if (!resolved) {
      return false;
    }

    toast.success('Details added');
    setShowChipBin(false);
    setActiveNotification(null);
    setActiveNotificationData(null);
    setAllowMultipleEntries(false);
    return true;
  };

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
                          void resolveNotification(notification.id);
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
                          📸 {getPhotoHelperText(notification)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void resolveNotification(notification.id);
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
                          void resolveNotification(notification.id);
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
                          void resolveNotification(notification.id);
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
          setActiveNotificationData(null);
          setAllowMultipleEntries(false);
        }}
        onChipSelect={handleChipSelect}
        notificationMessage={activeNotification?.message}
        itemCategory={itemCategory}
        listingId={listingId}
        notificationData={activeNotificationData}
        allowMultiple={allowMultipleEntries}
        notificationId={activeNotification?.id}
        notificationType={activeNotification?.type}
        notificationField={activeNotification?.field ?? null}
        onCompleteMultiEntry={handleMultiEntryComplete}
      />

      {photoWorkflow.isOpen && photoWorkflow.notification && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center"
          onClick={() => {
            if (!photoWorkflow.isSubmitting) {
              resetPhotoWorkflow();
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-4 w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Capture requested photo</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {photoWorkflow.notification.message}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (!photoWorkflow.isSubmitting) resetPhotoWorkflow();
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {photoWorkflow.data?.requirement && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-800 mb-4">
                Requirement: <span className="font-medium">{formatRequirement(photoWorkflow.data.requirement)}</span>
              </div>
            )}

            {photoWorkflow.error && (
              <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700 mb-4">
                <p className="font-medium">{photoWorkflow.error}</p>
                {photoWorkflow.reasons.length > 0 && (
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {photoWorkflow.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={() => triggerFileSelection('camera')}
                disabled={photoWorkflow.isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4"
              >
                <Camera className="w-4 h-4 mr-2" /> Use Camera
              </Button>
              <Button
                onClick={() => triggerFileSelection('upload')}
                disabled={photoWorkflow.isSubmitting}
                variant="outline"
                className="w-full border-2 border-purple-200 text-purple-700 hover:bg-purple-50 py-4"
              >
                Upload from device
              </Button>
              <Button
                onClick={() => {
                  if (!photoWorkflow.isSubmitting) resetPhotoWorkflow();
                }}
                variant="ghost"
                className="w-full text-gray-600"
                disabled={photoWorkflow.isSubmitting}
              >
                Cancel
              </Button>
            </div>

            {photoWorkflow.isSubmitting && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing photo...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleWorkflowFileChange}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleWorkflowFileChange}
      />
    </div>
  );
}
