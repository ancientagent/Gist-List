
'use client';

import { useState } from 'react';
import { Lightbulb, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

interface AlternativeItem {
  item: string;
  confidence: number;
}

export default function AlternativeItemsSelector({
  alternativeItems,
  listingId,
  onItemSelected,
}: {
  alternativeItems: string | null;
  listingId: string;
  onItemSelected: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  if (!alternativeItems) return null;

  let alternatives: AlternativeItem[] = [];
  try {
    alternatives = JSON.parse(alternativeItems);
  } catch (e) {
    return null;
  }

  if (!alternatives || alternatives.length === 0) return null;

  const handleSelectAlternative = async (selectedItem: string) => {
    setIsReanalyzing(true);
    setIsOpen(false);

    try {
      const response = await fetch(`/api/listings/${listingId}/reanalyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedItem }),
      });

      if (!response.ok) {
        throw new Error('Failed to re-analyze');
      }

      toast.success('Item re-analyzed successfully!');
      onItemSelected();
    } catch (error) {
      console.error('Re-analysis error:', error);
      toast.error('Failed to re-analyze item');
    } finally {
      setIsReanalyzing(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-2"
          disabled={isReanalyzing}
        >
          {isReanalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Re-analyzing...
            </>
          ) : (
            <>
              <Lightbulb className="w-4 h-4 mr-1 text-yellow-600" />
              Other possibilities
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">
              AI considered these alternatives:
            </h4>
            <p className="text-xs text-muted-foreground">
              If the current item isn't correct, select the right one:
            </p>
          </div>
          <div className="space-y-2">
            {alternatives.map((alt, index) => (
              <button
                key={index}
                onClick={() => handleSelectAlternative(alt.item)}
                className="w-full text-left p-3 rounded-lg border hover:bg-accent hover:border-primary transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alt.item}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Math.round(alt.confidence * 100)}% confidence
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
