
'use client';

import { TrendingUp, Clock, Package, DollarSign, Sparkles } from 'lucide-react';

interface Listing {
  avgMarketPrice: number | null;
  suggestedPriceMin: number | null;
  suggestedPriceMax: number | null;
  price: number | null;
  shippingCostEst: number | null;
  category: string | null;
}

export default function InsightsSection({ listing }: { listing: Listing }) {
  const hasPriceInsights =
    listing.avgMarketPrice !== null ||
    listing.suggestedPriceMin !== null ||
    listing.suggestedPriceMax !== null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-indigo-600" />
        <h3 className="font-medium">AI Insights</h3>
      </div>

      <div className="space-y-3">
        {/* Price Insights */}
        {hasPriceInsights && (
          <div className="bg-indigo-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-medium text-indigo-900 mb-1">Market Price</div>
                {listing.avgMarketPrice && (
                  <div className="text-indigo-700">
                    Average: ${listing.avgMarketPrice.toFixed(2)}
                  </div>
                )}
                {listing.suggestedPriceMin && listing.suggestedPriceMax && (
                  <div className="text-indigo-700">
                    Suggested range: ${listing.suggestedPriceMin.toFixed(2)} - $
                    {listing.suggestedPriceMax.toFixed(2)}
                  </div>
                )}
                {listing.price && listing.avgMarketPrice && (
                  <div className="text-xs mt-1 text-indigo-600">
                    {listing.price > listing.avgMarketPrice
                      ? '⬆️ Your price is above average'
                      : listing.price < listing.avgMarketPrice
                      ? '⬇️ Your price is below average'
                      : '✓ Your price matches the average'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Best Time to Post */}
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-medium text-purple-900 mb-1">Best Time to Post</div>
              <div className="text-purple-700">
                Weekday evenings (6-9 PM) typically get the most views
              </div>
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
