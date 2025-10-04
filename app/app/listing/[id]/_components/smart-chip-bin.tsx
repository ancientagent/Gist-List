
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
}

export default function SmartChipBin({
  isOpen,
  onClose,
  onChipSelect,
  notificationMessage,
  itemCategory,
  listingId,
}: SmartChipBinProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [customChipText, setCustomChipText] = useState('');
  const [userChips, setUserChips] = useState<Record<string, ChipOption[]>>({});
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  
  const chipSuggestions = getChipSuggestions(itemCategory);
  
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
    onClose();
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
    onClose();
  };
  
  if (!isOpen) return null;
  
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
