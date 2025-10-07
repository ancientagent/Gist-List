
'use client';

import { TrendingUp, Clock, Package, DollarSign, Sparkles, AlertCircle, ThumbsUp, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface Listing {
  avgMarketPrice: number | null;
  suggestedPriceMin: number | null;
  suggestedPriceMax: number | null;
  price: number | null;
  shippingCostEst: number | null;
  category: string | null;
  marketInsights: string | null;
  conditionNotes: string | null;
  user?: {
    subscriptionTier: string;
  };
}

export default function InsightsSection({ listing }: { listing: Listing & { usePremium?: boolean } }) {
  // Only show insights when premium features are unlocked for this listing
  const isPremiumUnlocked = listing.usePremium === true;
  
  if (!isPremiumUnlocked) {
    return null;
  }
  const [showBestTimePrompt, setShowBestTimePrompt] = useState(false);

  const hasPriceInsights =
    listing.avgMarketPrice !== null ||
    listing.suggestedPriceMin !== null ||
    listing.suggestedPriceMax !== null;

  // Calculate price intelligence
  const getPriceIntelligence = () => {
    if (!listing.price || !listing.avgMarketPrice) return null;

    const priceDiff = listing.price - listing.avgMarketPrice;
    const percentDiff = (priceDiff / listing.avgMarketPrice) * 100;

    if (percentDiff > 20) {
      return {
        type: 'warning',
        message: `Your price is ${Math.abs(percentDiff).toFixed(0)}% higher than market average. Consider lowering to $${listing.avgMarketPrice.toFixed(2)} for faster sale.`,
        icon: AlertCircle,
        color: 'amber',
      };
    } else if (percentDiff < -20) {
      return {
        type: 'info',
        message: `Your price is ${Math.abs(percentDiff).toFixed(0)}% lower than market average. You could price it higher at $${listing.avgMarketPrice.toFixed(2)}.`,
        icon: TrendingUp,
        color: 'emerald',
      };
    } else {
      return {
        type: 'success',
        message: 'Your price is within market range. Good pricing strategy!',
        icon: ThumbsUp,
        color: 'emerald',
      };
    }
  };

  const priceIntelligence = getPriceIntelligence();

  // Best time to post (premium feature)
  const bestTimeMessage = 'Based on market trends, posting this item on Thursday evening (6-9 PM) will get 40% more views.';

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="font-medium">AI Insights</h3>
      </div>

      <div className="space-y-3">
        {/* Price Insights */}
        {hasPriceInsights && (
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-medium text-purple-900 mb-1">Market Price Analysis</div>
                {listing.avgMarketPrice && (
                  <div className="text-purple-700">
                    Average: <span className="font-semibold">${listing.avgMarketPrice.toFixed(2)}</span>
                  </div>
                )}
                {listing.suggestedPriceMin && listing.suggestedPriceMax && (
                  <div className="text-purple-700">
                    Suggested range: ${listing.suggestedPriceMin.toFixed(2)} - $
                    {listing.suggestedPriceMax.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Price Intelligence (only if user entered a price) */}
        {priceIntelligence && (
          <div className={`bg-${priceIntelligence.color}-50 rounded-lg p-3 border border-${priceIntelligence.color}-200`}>
            <div className="flex items-start gap-2">
              <priceIntelligence.icon className={`w-4 h-4 text-${priceIntelligence.color}-600 mt-0.5 flex-shrink-0`} />
              <div className="flex-1 text-sm">
                <div className={`font-medium text-${priceIntelligence.color}-900 mb-1`}>Price Recommendation</div>
                <div className={`text-${priceIntelligence.color}-700`}>{priceIntelligence.message}</div>
              </div>
            </div>
          </div>
        )}

        {/* Market Insights */}
        {listing.marketInsights && (
          <div className="bg-indigo-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-medium text-indigo-900 mb-1">Market Trends</div>
                <div className="text-indigo-700 whitespace-pre-line">{listing.marketInsights}</div>
              </div>
            </div>
          </div>
        )}

        {/* Best Time to Post - Premium Feature */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-purple-900">Best Time to Post</span>
                <Crown className="w-3 h-3 text-amber-500" />
                <span className="text-xs bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-2 py-0.5 rounded-full">
                  Premium
                </span>
              </div>
              <div className="text-purple-700 mb-2">
                {bestTimeMessage}
              </div>
              {showBestTimePrompt ? (
                <div className="bg-white/80 rounded p-2 space-y-2">
                  <p className="text-xs text-gray-700">
                    Would you like to schedule this post for the best time?
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-xs"
                      onClick={() => alert('Premium feature - Schedule posting coming soon!')}
                    >
                      Yes, Schedule It
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 text-xs"
                      onClick={() => setShowBestTimePrompt(false)}
                    >
                      Post Now
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-xs border-purple-300 text-purple-700 hover:bg-purple-100"
                  onClick={() => setShowBestTimePrompt(true)}
                >
                  Learn More
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Shipping Estimate */}
        {listing.shippingCostEst && (
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-medium text-green-900 mb-1">Shipping Estimate</div>
                <div className="text-green-700">
                  Est. ${listing.shippingCostEst.toFixed(2)} via USPS
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Insights */}
        {listing.category && (
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-medium text-amber-900 mb-1">Category Trends</div>
                <div className="text-amber-700">
                  {listing.category} items are in moderate demand
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
