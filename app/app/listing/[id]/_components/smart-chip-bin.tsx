
'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getChipSuggestions, formatChipToText, ChipOption } from '@/lib/chipContext';
import { toast } from 'sonner';

interface SmartChipBinProps {
  isOpen: boolean;
  onClose: () => void;
  onChipSelect: (text: string) => void;
  notificationMessage?: string;
  itemCategory?: string | null;
  listingId: string;
  notificationData?: any; // Additional data from the notification (e.g., possibleYears)
  allowMultiple?: boolean; // Allow multiple entries before closing
}

export default function SmartChipBin({
  isOpen,
  onClose,
  onChipSelect,
  notificationMessage,
  itemCategory,
  listingId,
  notificationData,
  allowMultiple = false,
}: SmartChipBinProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [customChipText, setCustomChipText] = useState('');
  const [userChips, setUserChips] = useState<Record<string, ChipOption[]>>({});
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [selectedDecade, setSelectedDecade] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<string[]>([]); // Track items added in multi-entry mode
  
  const chipSuggestions = getChipSuggestions(itemCategory);
  
  // Check if this is a year/version notification
  const isYearNotification = notificationMessage?.toLowerCase().includes('year/version');

  // Check if this is a question with specific answer options
  const isQuestionWithOptions = notificationMessage?.includes('?') &&
    (notificationMessage.includes(' or ') || notificationData?.options);

  // Parse answer options from notification message or data
  const parseAnswerOptions = (): string[] => {
    // Check if options provided in notificationData
    if (notificationData?.options && Array.isArray(notificationData.options)) {
      return notificationData.options;
    }

    // Parse from message - look for pattern like "A, B, or C?"
    if (!notificationMessage) return [];

    // Extract text between punctuation and question mark
    const match = notificationMessage.match(/(?:from|is|are)\s+([^?]+)\?/i);
    if (!match) return [];

    const optionsText = match[1];

    // Split by commas and 'or'
    const options = optionsText
      .split(/,\s*(?:or\s+)?|\s+or\s+/)
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0 && opt.length < 50) // Reasonable length
      .map(opt => {
        // Handle "the X" patterns (e.g., "the US" -> "The US", "the us" -> "The US")
        if (opt.toLowerCase().startsWith('the ')) {
          const country = opt.slice(4).trim(); // Get country name after "the "
          // Special case for acronyms like US, UK, EU (2-3 letters, all alphabetic)
          if (/^[a-zA-Z]{2,3}$/.test(country)) {
            return 'The ' + country.toUpperCase();
          }
          return 'The ' + country.charAt(0).toUpperCase() + country.slice(1).toLowerCase();
        }
        // Capitalize first letter for regular options
        return opt.charAt(0).toUpperCase() + opt.slice(1).toLowerCase();
      });

    return options;
  };
  
  // Load user's custom chips
  useEffect(() => {
    if (isOpen) {
      loadUserChips();
    }
  }, [isOpen]);
  
  const loadUserChips = async () => {
    try {
      const response = await fetch('/api/chips');
      if (response.ok) {
        const data = await response.json();
        setUserChips(data);
      }
    } catch (error) {
      console.error('Failed to load user chips:', error);
    }
  };
  
  const handleParentChipClick = (category: string) => {
    setActiveCategory(activeCategory === category ? null : category);
    setIsAddingCustom(false);
  };
  
  const handleChipClick = async (parentCategory: string, chip: ChipOption) => {
    const formattedText = formatChipToText(parentCategory, chip.text);

    // Save chip usage
    try {
      await fetch('/api/chips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: parentCategory,
          text: chip.text,
          itemCategory: itemCategory,
        }),
      });
    } catch (error) {
      console.error('Failed to save chip usage:', error);
    }

    onChipSelect(formattedText);

    if (allowMultiple) {
      // In multi-entry mode, add to list and reset for next entry
      setAddedItems(prev => [...prev, formattedText]);
      setActiveCategory(null);
      setIsAddingCustom(false);
      toast.success('Detail added! Add more or tap Done.');
    } else {
      // Single entry mode - close immediately
      onClose();
    }
  };
  
  const handleCustomChipAdd = async () => {
    if (!customChipText.trim() || !activeCategory) return;

    const formattedText = formatChipToText(activeCategory, customChipText.trim());

    // Save custom chip
    try {
      await fetch('/api/chips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeCategory,
          text: customChipText.trim(),
          itemCategory: itemCategory,
        }),
      });

      toast.success('Custom detail saved!');
    } catch (error) {
      console.error('Failed to save custom chip:', error);
    }

    onChipSelect(formattedText);
    setCustomChipText('');
    setIsAddingCustom(false);

    if (allowMultiple) {
      // In multi-entry mode, add to list and reset for next entry
      setAddedItems(prev => [...prev, formattedText]);
      setActiveCategory(null);
      toast.success('Detail added! Add more or tap Done.');
    } else {
      // Single entry mode - close immediately
      onClose();
    }
  };
  
  if (!isOpen) return null;

  // For questions with specific answer options, show direct answer chips
  if (isQuestionWithOptions && !isYearNotification) {
    const answerOptions = parseAnswerOptions();

    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out animate-slide-up max-h-[70vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Select Answer</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            {notificationMessage && (
              <p className="text-sm text-gray-600">{notificationMessage}</p>
            )}
          </div>

          {/* Content - Answer Options */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-3">Select your answer:</p>
              <div className="flex flex-wrap gap-2">
                {answerOptions.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onChipSelect(option);
                      onClose();
                    }}
                    className="px-4 py-2.5 rounded-full border-2 border-purple-400 bg-purple-50 text-purple-800 font-medium text-sm transition-all hover:scale-105 hover:bg-purple-100"
                  >
                    {option}
                  </button>
                ))}
                <button
                  onClick={() => {
                    onChipSelect('Unknown');
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-full border-2 border-dashed border-gray-400 text-gray-700 font-medium text-sm transition-all hover:scale-105"
                >
                  Unknown
                </button>
              </div>

              {/* Custom answer option */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 mb-2">Or type your own answer:</p>
                <div className="flex gap-2">
                  <Input
                    value={customChipText}
                    onChange={(e) => setCustomChipText(e.target.value)}
                    placeholder="Type custom answer..."
                    className="text-base flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customChipText.trim()) {
                        onChipSelect(customChipText.trim());
                        setCustomChipText('');
                        onClose();
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (customChipText.trim()) {
                        onChipSelect(customChipText.trim());
                        setCustomChipText('');
                        onClose();
                      }
                    }}
                    disabled={!customChipText.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For year/version notifications, show year chips directly
  if (isYearNotification) {
    const possibleYears = notificationData?.possibleYears || [];
    
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div 
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out animate-slide-up max-h-[70vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Select Year/Version</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            {notificationMessage && (
              <p className="text-sm text-gray-600">{notificationMessage}</p>
            )}
          </div>
          
          {/* Content - Year Selection */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {!selectedDecade ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-3">Select a timeframe:</p>
                
                {/* Show AI-suggested years first if available */}
                {possibleYears.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-purple-600 mb-2">Based on our research:</p>
                    <div className="flex flex-wrap gap-2">
                      {possibleYears.map((year: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            onChipSelect(year);
                            onClose();
                          }}
                          className="px-4 py-2.5 rounded-full border-2 border-purple-400 bg-purple-50 text-purple-800 font-medium text-sm transition-all hover:scale-105 hover:bg-purple-100"
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Decade selection */}
                <p className="text-xs font-semibold text-gray-700 mb-2">Or select a decade:</p>
                <div className="flex flex-wrap gap-2">
                  {['2020s', '2010s', '2000s', '1990s', '1980s', '1970s', 'Earlier'].map((decade) => (
                    <button
                      key={decade}
                      onClick={() => setSelectedDecade(decade)}
                      className="px-4 py-2.5 rounded-full border-2 border-gray-300 bg-gray-50 text-gray-800 font-medium text-sm transition-all hover:scale-105 hover:border-purple-400 hover:bg-purple-50"
                    >
                      {decade}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      onChipSelect('Unknown');
                      onClose();
                    }}
                    className="px-4 py-2.5 rounded-full border-2 border-dashed border-gray-400 text-gray-700 font-medium text-sm transition-all hover:scale-105"
                  >
                    Unknown
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDecade(null)}
                  className="text-purple-600 hover:text-purple-700"
                >
                  ← Back
                </Button>
                
                <p className="text-sm text-gray-600 mb-3">Select specific year from {selectedDecade}:</p>
                <div className="flex flex-wrap gap-2">
                  {getYearsForDecade(selectedDecade).map((year) => (
                    <button
                      key={year}
                      onClick={() => {
                        onChipSelect(year.toString());
                        setSelectedDecade(null);
                        onClose();
                      }}
                      className="px-4 py-2 rounded-full bg-gray-100 hover:bg-purple-100 border border-gray-300 hover:border-purple-400 text-gray-800 hover:text-purple-900 font-medium text-sm transition-all"
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Parent categories to show
  const parentCategories = [
    { key: 'missing', label: 'Missing', color: 'bg-red-100 text-red-800 border-red-300' },
    { key: 'comes_with', label: 'Comes With', color: 'bg-green-100 text-green-800 border-green-300' },
    { key: 'condition_details', label: 'Condition', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { key: 'functional', label: 'Functional', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  ];
  
  // Add fit_notes for clothing
  if (itemCategory?.toLowerCase().includes('cloth') || itemCategory?.toLowerCase().includes('shoe')) {
    parentCategories.push({ key: 'fit_notes', label: 'Fit Notes', color: 'bg-purple-100 text-purple-800 border-purple-300' });
  }
  
  // Helper function to generate years for a decade
  function getYearsForDecade(decade: string): number[] {
    switch (decade) {
      case '2020s':
        return [2029, 2028, 2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020];
      case '2010s':
        return [2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010];
      case '2000s':
        return [2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000];
      case '1990s':
        return [1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992, 1991, 1990];
      case '1980s':
        return [1989, 1988, 1987, 1986, 1985, 1984, 1983, 1982, 1981, 1980];
      case '1970s':
        return [1979, 1978, 1977, 1976, 1975, 1974, 1973, 1972, 1971, 1970];
      case 'Earlier':
        return [1969, 1968, 1967, 1966, 1965, 1964, 1963, 1962, 1961, 1960];
      default:
        return [];
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out animate-slide-up max-h-[70vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Add Details</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          {notificationMessage && (
            <p className="text-sm text-gray-600">{notificationMessage}</p>
          )}
        </div>
        
        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!activeCategory ? (
            // Show parent categories
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-3">What would you like to add?</p>
              <div className="flex flex-wrap gap-2">
                {parentCategories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => handleParentChipClick(cat.key)}
                    className={`px-4 py-2.5 rounded-full border-2 font-medium text-sm transition-all hover:scale-105 ${cat.color}`}
                  >
                    {cat.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setActiveCategory('custom');
                    setIsAddingCustom(true);
                  }}
                  className="px-4 py-2.5 rounded-full border-2 border-dashed border-gray-400 text-gray-700 font-medium text-sm transition-all hover:scale-105 hover:border-purple-400 hover:text-purple-700"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Custom
                </button>
              </div>
            </div>
          ) : (
            // Show child chips for selected category
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActiveCategory(null);
                    setIsAddingCustom(false);
                    setCustomChipText('');
                  }}
                  className="text-purple-600 hover:text-purple-700"
                >
                  ← Back
                </Button>
                {!isAddingCustom && activeCategory !== 'custom' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingCustom(true)}
                    className="text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Custom
                  </Button>
                )}
              </div>
              
              {isAddingCustom ? (
                <div className="space-y-3">
                  <Input
                    value={customChipText}
                    onChange={(e) => setCustomChipText(e.target.value)}
                    placeholder="Type your custom detail..."
                    className="text-base"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCustomChipAdd();
                      }
                    }}
                  />
                  <Button
                    onClick={handleCustomChipAdd}
                    disabled={!customChipText.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    Add Custom Detail
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {/* Show preset chips */}
                  {chipSuggestions[activeCategory]?.map((chip, idx) => (
                    <button
                      key={`preset-${idx}`}
                      onClick={() => handleChipClick(activeCategory, chip)}
                      className="px-4 py-2 rounded-full bg-gray-100 hover:bg-purple-100 border border-gray-300 hover:border-purple-400 text-gray-800 hover:text-purple-900 font-medium text-sm transition-all"
                    >
                      {chip.text}
                    </button>
                  ))}
                  
                  {/* Show user's custom chips for this category */}
                  {userChips[activeCategory]?.map((chip, idx) => (
                    <button
                      key={`user-${idx}`}
                      onClick={() => handleChipClick(activeCategory, chip)}
                      className="px-4 py-2 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-800 font-medium text-sm transition-all"
                    >
                      {chip.text}
                      <Badge className="ml-2 bg-purple-600 text-white text-xs">Custom</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
