"use client";

import { useEffect, useMemo, useState } from "react";
import { X, PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { logTelemetryEvent } from "@/lib/telemetry";

export interface QuickFactsHints {
  missingCandidates?: string[];
  presentItems?: string[];
  inoperableReasons?: string[];
}

interface QuickFactsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (value: string, kind: "comesWith" | "missing") => void;
  onDeclareInoperable: (value: string) => void;
  hints?: QuickFactsHints;
  userId?: string | null;
  category?: string | null;
  existingNotes?: string | null;
  partsPrice?: number | null;
  listingId: string;
}

interface QuickFactsMemory {
  comesWith: string[];
  missing: string[];
  inoperable: string[];
}

const DEFAULT_MEMORY: QuickFactsMemory = {
  comesWith: [],
  missing: [],
  inoperable: [],
};

const formatLineForKind = (kind: "comesWith" | "missing", text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return kind === "comesWith"
    ? `Comes with: ${trimmed}`
    : `Missing: ${trimmed}`;
};

const storageKeyFor = (userId?: string | null, category?: string | null) => {
  const userPart = userId || "anon";
  const categoryPart = category?.toLowerCase().replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || "general";
  return `gister.quickFacts.${userPart}.${categoryPart}`;
};

export default function QuickFactsPanel({
  isOpen,
  onClose,
  onInsert,
  onDeclareInoperable,
  hints,
  userId,
  category,
  existingNotes,
  partsPrice,
  listingId,
}: QuickFactsPanelProps) {
  const [memory, setMemory] = useState<QuickFactsMemory>(DEFAULT_MEMORY);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [input, setInput] = useState({
    comesWith: "",
    missing: "",
    inoperable: "",
  });
  const [sessionAdds, setSessionAdds] = useState<string[]>([]);

  const storageKey = storageKeyFor(userId, category);
  const presentItems = useMemo(() => (hints?.presentItems || []).map((item) => item.toLowerCase().trim()), [hints?.presentItems]);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingMemory(true);
    try {
      if (typeof window === "undefined") return;
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as QuickFactsMemory;
        setMemory({
          comesWith: parsed.comesWith || [],
          missing: parsed.missing || [],
          inoperable: parsed.inoperable || [],
        });
      } else {
        setMemory(DEFAULT_MEMORY);
      }
    } catch (error) {
      console.error("Failed to load Quick Facts memory", error);
    } finally {
      setLoadingMemory(false);
    }
  }, [isOpen, storageKey]);

  const persistMemory = (next: QuickFactsMemory) => {
    setMemory(next);
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (error) {
      console.error("Failed to persist Quick Facts memory", error);
    }
  };

  const registerSessionAdd = (line: string) => {
    setSessionAdds((prev) => (prev.includes(line) ? prev : [...prev, line]));
  };

  const handleApply = (kind: "comesWith" | "missing", value: string, source: "memory" | "hint" | "custom") => {
    const formattedLine = formatLineForKind(kind, value);
    if (!formattedLine) return;

    if (kind === "missing" && value) {
      const normalized = value.toLowerCase().trim();
      if (presentItems.includes(normalized)) {
        toast.error("We already spotted that in your photos – no need to add it again.");
        return;
      }
    }

    onInsert(formattedLine, kind);
    registerSessionAdd(formattedLine);
    void logTelemetryEvent({
      listingId,
      eventType: "quickfacts_insert",
      metadata: {
        kind,
        source,
        value: value.trim(),
        formattedLine,
      },
    });

    if (source === "custom") {
      const nextMemory: QuickFactsMemory = {
        ...memory,
        [kind]: Array.from(new Set([value.trim(), ...memory[kind]])).slice(0, 6),
      };
      persistMemory(nextMemory);
    }

    setInput((prev) => ({ ...prev, [kind]: "" }));
  };

  const handleInoperable = (value: string, source: "memory" | "hint" | "custom") => {
    const trimmed = value.trim();
    if (!trimmed) return;

    onDeclareInoperable(trimmed);
    registerSessionAdd(`Inoperable: ${trimmed}`);
    void logTelemetryEvent({
      listingId,
      eventType: "quickfacts_insert",
      metadata: {
        kind: "inoperable",
        source,
        value: trimmed,
      },
    });

    if (source === "custom") {
      const nextMemory: QuickFactsMemory = {
        ...memory,
        inoperable: Array.from(new Set([trimmed, ...memory.inoperable])).slice(0, 6),
      };
      persistMemory(nextMemory);
    }

    setInput((prev) => ({ ...prev, inoperable: "" }));
  };

  const suggestions = useMemo(() => {
    const missing = new Set<string>();
    const comesWith = new Set<string>();
    const inoperable = new Set<string>();

    memory.comesWith.forEach((item) => comesWith.add(item));
    memory.missing.forEach((item) => missing.add(item));
    memory.inoperable.forEach((item) => inoperable.add(item));

    (hints?.missingCandidates || []).forEach((item) => missing.add(item));
    (hints?.inoperableReasons || []).forEach((item) => inoperable.add(item));

    return {
      comesWith: Array.from(comesWith),
      missing: Array.from(missing),
      inoperable: Array.from(inoperable),
    };
  }, [memory, hints?.missingCandidates, hints?.inoperableReasons]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out animate-slide-up max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-emerald-50">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900">Quick Facts</h3>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Add buyer-friendly facts without leaving this screen. We remember your usual details per category.
          </p>
        </div>

        {loadingMemory && (
          <div className="flex items-center gap-2 px-6 py-3 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading saved Quick Facts…
          </div>
        )}

        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          <section>
            <header className="mb-2 flex items-center justify-between">
              <span className="font-medium text-gray-800">Comes with</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Boosts trust
              </Badge>
            </header>
            <p className="text-xs text-gray-500 mb-3">List accessories, paperwork, or extras included in your photos.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestions.comesWith.map((item) => (
                <Button
                  key={`comesWith-${item}`}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleApply("comesWith", item, memory.comesWith.includes(item) ? "memory" : "hint")}
                  className="rounded-full border border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                >
                  {item}
                </Button>
              ))}
              {suggestions.comesWith.length === 0 && (
                <span className="text-xs text-gray-400">No saved items yet.</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={input.comesWith}
                onChange={(e) => setInput((prev) => ({ ...prev, comesWith: e.target.value }))}
                placeholder="Game manual, original box, charger…"
              />
              <Button
                onClick={() => handleApply("comesWith", input.comesWith, "custom")}
                className="bg-green-600 hover:bg-green-700"
              >
                <PlusCircle className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </section>

          <section>
            <header className="mb-2 flex items-center justify-between">
              <span className="font-medium text-gray-800">Missing</span>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Sets expectations
              </Badge>
            </header>
            <p className="text-xs text-gray-500 mb-3">
              Call out anything buyers should know is absent. We’ll skip items already visible in photos.
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestions.missing.map((item) => (
                <Button
                  key={`missing-${item}`}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleApply("missing", item, memory.missing.includes(item) ? "memory" : "hint")}
                  className="rounded-full border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                >
                  {item}
                </Button>
              ))}
              {suggestions.missing.length === 0 && (
                <span className="text-xs text-gray-400">No typical missing pieces logged yet.</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={input.missing}
                onChange={(e) => setInput((prev) => ({ ...prev, missing: e.target.value }))}
                placeholder="Power cord, manual, mounting hardware…"
              />
              <Button
                onClick={() => handleApply("missing", input.missing, "custom")}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <PlusCircle className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </section>

          <section>
            <header className="mb-2 flex items-center justify-between">
              <span className="font-medium text-gray-800">Inoperable</span>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Flags parts-only
              </Badge>
            </header>
            <p className="text-xs text-gray-500 mb-3">
              Tell buyers what’s wrong. We’ll flip condition to “For parts / not working” and update the price
              {partsPrice != null
                ? ` (${partsPrice.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: partsPrice >= 100 ? 0 : 2,
                })})`
                : ""}
              .
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestions.inoperable.map((item) => (
                <Button
                  key={`inoperable-${item}`}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleInoperable(item, memory.inoperable.includes(item) ? "memory" : "hint")}
                  className="rounded-full border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                >
                  {item}
                </Button>
              ))}
              {suggestions.inoperable.length === 0 && (
                <span className="text-xs text-gray-400">No saved inoperable reasons yet.</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={input.inoperable}
                onChange={(e) => setInput((prev) => ({ ...prev, inoperable: e.target.value }))}
                placeholder="Won’t power on, screen flickers, missing key…"
              />
              <Button
                onClick={() => handleInoperable(input.inoperable, "custom")}
                className="bg-red-600 hover:bg-red-700"
              >
                <PlusCircle className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </section>

          {sessionAdds.length > 0 && (
            <section className="pt-2 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Added this session</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                {sessionAdds.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </section>
          )}

          {existingNotes && existingNotes.trim().length > 0 && (
            <section className="pt-2 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Current condition notes</h4>
              <p className="text-sm text-gray-600 whitespace-pre-line bg-gray-50 rounded-md p-3 border border-gray-100">
                {existingNotes}
              </p>
            </section>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-white flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} className="text-gray-600">
            Close
          </Button>
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
