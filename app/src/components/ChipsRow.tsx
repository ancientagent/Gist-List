"use client";

import { HelpCircle, AlertCircle, Lightbulb, Camera } from "lucide-react";
import { getMoodTooltip } from "@/src/notifications/moods";
import { ChipSection, GisterNotification } from "@/src/notifications/types";

export default function ChipsRow({
  title,
  section,
  notifications,
  onApply,
  onJump,
}: {
  title: string;
  section: ChipSection;
  notifications: GisterNotification[];
  onApply: (n: GisterNotification) => void;
  onJump: (field: string) => void;
}) {
  if (!notifications || notifications.length === 0) return null;

  const visible = notifications.slice(0, 3);

  const iconFor = (type: string) => {
    if (type === 'ALERT') return <AlertCircle className="w-4 h-4" />;
    if (type === 'INSIGHT') return <Lightbulb className="w-4 h-4" />;
    if (type === 'PHOTO') return <Camera className="w-4 h-4" />;
    return <HelpCircle className="w-4 h-4" />;
  };

  const baseColorFor = (type: string) => {
    if (type === 'ALERT') return 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100';
    if (type === 'INSIGHT') return 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100';
    if (type === 'PHOTO') return 'border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100';
    return 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100';
  };

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">{title}</span>
        {notifications.length > 3 && (
          <span className="text-[11px] text-gray-500">+{notifications.length - 3} more</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {visible.map((n) => {
          const tone = getMoodTooltip(n.mood);
          return (
            <button
              key={n.id}
              title={tone}
              onClick={() => {
                if (n.type === 'PHOTO') {
                  // PHOTO chips always trigger camera
                  onApply(n);
                } else if (n.type === 'ALERT' && n.field) {
                  onJump(n.field);
                } else {
                  onApply(n);
                }
              }}
              className={`px-3 py-1.5 rounded-full border text-sm transition ${baseColorFor(n.type)} flex items-center gap-1`}
            >
              {iconFor(n.type)}
              <span className="whitespace-nowrap">{n.message}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


