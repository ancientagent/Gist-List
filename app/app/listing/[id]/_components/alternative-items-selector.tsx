
'use client';

import { useState } from 'react';
import { Lightbulb, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showError, setShowError] = useState(false);

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
    setShowError(false);

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

  const handleCustomSubmit = async () => {
    if (!customInput.trim()) return;

    setIsReanalyzing(true);
    setShowError(false);

    try {
      const response = await fetch(`/api/listings/${listingId}/reanalyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedItem: customInput.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.itemIdentified) {
        // AI couldn't identify the item
        setShowError(true);
        setIsReanalyzing(false);
        return;
      }

      // Success - item identified
      toast.success('Item identified!');
      setIsOpen(false);
      setCustomInput('');
      onItemSelected();
    } catch (error) {
      console.error('Re-analysis error:', error);
      setShowError(true);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleStartOver = () => {
    setIsOpen(false);
    setShowError(false);
    setCustomInput('');
    router.push('/camera');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
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
              ?
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          {!showError ? (
            <>
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
                    disabled={isReanalyzing}
                    className="w-full text-left p-3 rounded-lg border hover:bg-accent hover:border-primary transition-colors disabled:opacity-50"
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
              
              {/* Custom text entry */}
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs text-muted-foreground">
                  Or enter brand/model manually:
                </p>
                <Input
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter brand/model"
                  disabled={isReanalyzing}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCustomSubmit();
                    }
                  }}
                />
                <Button
                  onClick={handleCustomSubmit}
                  disabled={!customInput.trim() || isReanalyzing}
                  className="w-full"
                  size="sm"
                >
                  {isReanalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Submit'
                  )}
                </Button>
              </div>
            </>
          ) : (
            // Error state
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-red-900 mb-1">
                    Hmm, looks like we're having some trouble here
                  </h4>
                  <p className="text-xs text-red-700">
                    Let's start over with a new photo
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowError(false);
                    setCustomInput('');
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button
                  onClick={handleStartOver}
                  size="sm"
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Start Over
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
