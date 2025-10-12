export type NotificationType = 'ALERT' | 'QUESTION' | 'INSIGHT';

export type ChipSection = 'photos' | 'condition' | 'price' | 'shipping' | 'fineDetails';

export type GisterMood =
  | 'tech'
  | 'luxury'
  | 'doll'
  | 'historic'
  | 'art'
  | 'fashion'
  | 'kitsch'
  | 'neutral';

export interface GisterMoodProfile {
  id: GisterMood;
  intro: string;
  facetFound: string;
  facetMissing: string;
  valueUp: string;
  valueDown: string;
  photoPrompt: string;
  closeout: string;
  avatarAccessory: string;
  themeColor: string;
}

export interface GisterNotificationContext {
  rationale?: string;
  confidence?: number; // 0..1
  impact?: 'value' | 'speed' | 'visibility' | 'required';
  anchorFieldId?: string;
  imageBBox?: [number, number, number, number];
  ttlMs?: number;
}

export interface GisterNotification {
  id: string;
  type: NotificationType;
  message: string;
  actionType?: string | null;
  actionData?: Record<string, any> | null;
  field?: string | null;
  section: ChipSection;
  mood?: GisterMood;
  context?: GisterNotificationContext;
  resolved: boolean;
}


