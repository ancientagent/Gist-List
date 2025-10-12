
// Context-aware chip suggestion engine

export interface ChipOption {
  text: string;
  category: string;
  itemCategories?: string[]; // If specified, only show for these item categories
}

// Base chip templates organized by context
const CHIP_TEMPLATES: Record<string, ChipOption[]> = {
  missing: [
    { text: 'Power Supply', category: 'missing', itemCategories: ['electronics', 'appliances', 'tools'] },
    { text: 'Charger', category: 'missing', itemCategories: ['electronics'] },
    { text: 'Manual', category: 'missing', itemCategories: ['electronics', 'appliances', 'tools', 'collectibles'] },
    { text: 'Remote', category: 'missing', itemCategories: ['electronics', 'appliances'] },
    { text: 'Cables', category: 'missing', itemCategories: ['electronics'] },
    { text: 'Battery Cover', category: 'missing', itemCategories: ['electronics', 'toys'] },
    { text: 'Parts', category: 'missing' },
    { text: 'Box', category: 'missing' },
    { text: 'Original Packaging', category: 'missing' },
    { text: 'Tags', category: 'missing', itemCategories: ['clothing', 'accessories'] },
    { text: 'Accessories', category: 'missing' },
    { text: 'Lid', category: 'missing', itemCategories: ['home', 'kitchen'] },
    { text: 'Hardware', category: 'missing', itemCategories: ['furniture', 'home'] },
    { text: 'Certificate', category: 'missing', itemCategories: ['collectibles', 'art'] },
  ],
  
  comes_with: [
    { text: 'Original Box', category: 'comes_with' },
    { text: 'Manual', category: 'comes_with' },
    { text: 'All Accessories', category: 'comes_with' },
    { text: 'Extra Parts', category: 'comes_with' },
    { text: 'Extra Cables', category: 'comes_with', itemCategories: ['electronics'] },
    { text: 'Extra Buttons', category: 'comes_with', itemCategories: ['clothing'] },
    { text: 'Care Instructions', category: 'comes_with', itemCategories: ['clothing', 'accessories'] },
    { text: 'Instructions', category: 'comes_with' },
    { text: 'Display Stand', category: 'comes_with', itemCategories: ['collectibles', 'art'] },
    { text: 'Carrying Case', category: 'comes_with' },
  ],
  
  condition_details: [
    { text: 'Minor Scratches', category: 'condition_details' },
    { text: 'Scratches on Screen', category: 'condition_details', itemCategories: ['electronics'] },
    { text: 'Button Wear', category: 'condition_details', itemCategories: ['electronics', 'clothing'] },
    { text: 'Port Issues', category: 'condition_details', itemCategories: ['electronics'] },
    { text: 'Wear on Corners', category: 'condition_details' },
    { text: 'Minor Pilling', category: 'condition_details', itemCategories: ['clothing'] },
    { text: 'Hem Issues', category: 'condition_details', itemCategories: ['clothing'] },
    { text: 'Zipper Condition', category: 'condition_details', itemCategories: ['clothing', 'bags'] },
    { text: 'Fading', category: 'condition_details' },
    { text: 'Stains', category: 'condition_details', itemCategories: ['clothing', 'home'] },
    { text: 'Chips', category: 'condition_details', itemCategories: ['home', 'collectibles'] },
    { text: 'Cracks', category: 'condition_details', itemCategories: ['home', 'collectibles'] },
    { text: 'Discoloration', category: 'condition_details' },
    { text: 'Paint Wear', category: 'condition_details', itemCategories: ['toys', 'collectibles'] },
    { text: 'Joint Tightness', category: 'condition_details', itemCategories: ['toys', 'collectibles'] },
  ],
  
  functional: [
    { text: 'Tested Working', category: 'functional', itemCategories: ['electronics', 'appliances', 'tools'] },
    { text: 'As-Is', category: 'functional' },
    { text: 'Untested', category: 'functional' },
    { text: 'Needs Repair', category: 'functional' },
    { text: 'All Features Work', category: 'functional', itemCategories: ['electronics', 'appliances'] },
    { text: 'Screen Works', category: 'functional', itemCategories: ['electronics'] },
    { text: 'Buttons Responsive', category: 'functional', itemCategories: ['electronics'] },
  ],

  inoperable: [
    { text: 'Does Not Power On', category: 'inoperable', itemCategories: ['electronics', 'appliances', 'tools'] },
    { text: 'Powers On but Won’t Start', category: 'inoperable', itemCategories: ['electronics', 'appliances'] },
    { text: 'Screen Is Non-Functional', category: 'inoperable', itemCategories: ['electronics'] },
    { text: 'No Audio Output', category: 'inoperable', itemCategories: ['electronics'] },
    { text: 'Mechanical Parts Seized', category: 'inoperable', itemCategories: ['tools', 'collectibles'] },
  ],
  
  fit_notes: [
    { text: 'Runs Small', category: 'fit_notes', itemCategories: ['clothing', 'shoes'] },
    { text: 'Runs Large', category: 'fit_notes', itemCategories: ['clothing', 'shoes'] },
    { text: 'True to Size', category: 'fit_notes', itemCategories: ['clothing', 'shoes'] },
    { text: 'Stretchy', category: 'fit_notes', itemCategories: ['clothing'] },
    { text: 'Tight Fit', category: 'fit_notes', itemCategories: ['clothing'] },
    { text: 'Loose Fit', category: 'fit_notes', itemCategories: ['clothing'] },
  ],
  
  year_version: [
    { text: '20', category: 'year_version' }, // Expands to 2000-2009
    { text: '19', category: 'year_version' }, // Expands to 1990-1999
  ],
};

/**
 * Get context-aware chip suggestions based on item category
 * @param itemCategory - The category of the item (e.g., "electronics", "clothing")
 * @returns Object with chip categories and their options
 */
export function getChipSuggestions(itemCategory?: string | null): Record<string, ChipOption[]> {
  const normalizedCategory = normalizeCategory(itemCategory);
  const suggestions: Record<string, ChipOption[]> = {};
  
  for (const [key, chips] of Object.entries(CHIP_TEMPLATES)) {
    suggestions[key] = chips.filter(chip => {
      // If chip has no itemCategories restriction, include it
      if (!chip.itemCategories || chip.itemCategories.length === 0) {
        return true;
      }
      
      // If no item category provided, include all chips
      if (!normalizedCategory) {
        return true;
      }
      
      // Check if item category matches chip's restrictions
      return chip.itemCategories.includes(normalizedCategory);
    });
  }
  
  return suggestions;
}

/**
 * Normalize item category to match chip categories
 */
function normalizeCategory(category?: string | null): string | null {
  if (!category) return null;
  
  const cat = category.toLowerCase();
  
  // Map various category names to our chip categories
  if (cat.includes('electronic') || cat.includes('tech') || cat.includes('computer') || 
      cat.includes('phone') || cat.includes('tablet') || cat.includes('gaming')) {
    return 'electronics';
  }
  
  if (cat.includes('cloth') || cat.includes('apparel') || cat.includes('fashion') || 
      cat.includes('shirt') || cat.includes('pant') || cat.includes('dress') || cat.includes('jacket')) {
    return 'clothing';
  }
  
  if (cat.includes('shoe') || cat.includes('sneaker') || cat.includes('boot')) {
    return 'shoes';
  }
  
  if (cat.includes('bag') || cat.includes('purse') || cat.includes('backpack') || cat.includes('luggage')) {
    return 'bags';
  }
  
  if (cat.includes('home') || cat.includes('decor') || cat.includes('furniture') || cat.includes('kitchen')) {
    return 'home';
  }
  
  if (cat.includes('toy') || cat.includes('game') || cat.includes('collectible') || 
      cat.includes('figure') || cat.includes('card')) {
    return 'toys';
  }
  
  if (cat.includes('tool') || cat.includes('hardware')) {
    return 'tools';
  }
  
  if (cat.includes('appliance')) {
    return 'appliances';
  }
  
  if (cat.includes('art') || cat.includes('collectible')) {
    return 'collectibles';
  }
  
  return null;
}

/**
 * Format chip selection into description text
 */
export function formatChipToText(parentChip: string, selectedChip: string): string {
  // Map category to descriptive prefix
  const prefixes: Record<string, string> = {
    missing: 'Missing:',
    comes_with: 'Comes with:',
    condition_details: '',
    functional: '',
    fit_notes: 'Fit:',
    inoperable: 'Inoperable:',
  };
  
  const prefix = prefixes[parentChip] || '';
  
  if (prefix) {
    return `${prefix} ${selectedChip}`;
  }
  
  return selectedChip;
}
