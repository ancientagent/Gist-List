"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuickFactsPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out animate-slide-up max-h-[70vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b bg-gradient-to-r from-amber-50 to-yellow-50">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900">Quick Facts</h3>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">Stub UI for Comes with / Missing / Inoperable. No data saved yet.</p>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" className="border-green-300 text-green-800 bg-green-50 hover:bg-green-100" onClick={onClose}>
              Comes with
            </Button>
            <Button variant="outline" className="border-red-300 text-red-800 bg-red-50 hover:bg-red-100" onClick={onClose}>
              Missing
            </Button>
            <Button variant="outline" className="border-blue-300 text-blue-800 bg-blue-50 hover:bg-blue-100" onClick={onClose}>
              Inoperable
            </Button>
          </div>
          <Button onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    </div>
  );
}


