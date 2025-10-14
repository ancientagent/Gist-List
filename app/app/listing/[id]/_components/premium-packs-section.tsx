
'use client';

import { useState } from 'react';
import { Crown, Sparkles, Zap, Lock, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface PremiumPacksSectionProps {
  listing: any;
  usePremium: boolean;
  onUpgradePremium: () => void;
  userTier?: string;
  premiumPostsUsed?: number;
  premiumPostsTotal?: number;
}

export default function PremiumPacksSection({
  listing,
  usePremium,
  onUpgradePremium,
  userTier,
  premiumPostsUsed = 0,
  premiumPostsTotal = 0,
}: PremiumPacksSectionProps) {
  // Hide this section completely when premium features are unlocked
  if (usePremium) {
    return null;
  }

  const [activeTab, setActiveTab] = useState<'lister' | 'automation' | 'details'>('automation');

  const isPremiumTier = userTier === 'BASIC' || userTier === 'PRO';
  const isFreeUser = !userTier || userTier === 'FREE';
  
  // Free users get 4 premium posts, premium tier users get more
  const totalPosts = premiumPostsTotal || 4;
  const postsUsed = premiumPostsUsed || 0;
  const postsRemaining = totalPosts - postsUsed;
  const canUsePremium = postsRemaining > 0;

  // Parse premium data
  const usefulLinks = listing.usefulLinks ? (() => {
    try {
      return JSON.parse(listing.usefulLinks);
    } catch {
      return null;
    }
  })() : null;

  const premiumFacts = listing.premiumFacts;

  // Determine if item qualifies as premium
  const itemPrice = listing.price || 0;
  const isPremiumItem = itemPrice > 100;
  const isTechnicalItem = ['Electronics', 'Camera', 'Computer', 'Gaming', 'Musical Instrument'].some(
    cat => listing.category?.toLowerCase().includes(cat.toLowerCase())
  );
  const isCollectible = ['Collectible', 'Antique', 'Vintage', 'Art'].some(
    tag => listing.category?.toLowerCase().includes(tag.toLowerCase())
  );

  // Check what the AI found for Pro Lister Pack
  const hasManual = usefulLinks && usefulLinks.some((l: any) => 
    l.title?.toLowerCase().includes('manual') || l.title?.toLowerCase().includes('instruction')
  );
  const hasSpecs = usefulLinks && usefulLinks.some((l: any) => 
    l.title?.toLowerCase().includes('spec') || l.title?.toLowerCase().includes('specification')
  );
  const hasPartsInfo = usefulLinks && usefulLinks.some((l: any) => 
    l.title?.toLowerCase().includes('parts') || l.title?.toLowerCase().includes('dealer')
  );

  const listerPackFindings = [];
  if (hasManual) listerPackFindings.push('1 link for the operator\'s manual');
  if (hasSpecs) listerPackFindings.push('1 spec sheet');
  if (hasPartsInfo) listerPackFindings.push('Contact information for parts dealers in the area');

  // Additional fields count for Fine Details Pack
  const additionalFieldsCount = 8;
  const seoTagsCount = 20;
  const platformsWithFields = listing.recommendedPlatforms?.slice(0, 3).join(', ') || 'eBay, Mercari, Poshmark';

  return (
    <div className="bg-white rounded-lg shadow-sm mb-4">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 flex">
        <button
          onClick={() => setActiveTab('automation')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'automation'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Zap className="w-4 h-4 inline mr-1" />
          Insights & Automation
        </button>
        <button
          onClick={() => setActiveTab('lister')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'lister'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Crown className="w-4 h-4 inline mr-1" />
          The Professional
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'details'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Sparkles className="w-4 h-4 inline mr-1" />
          The Full Spread
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'lister' && (
          <div>
            {!usePremium ? (
              // FREE TIER - Show what AI found without revealing data
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-purple-600" />
                  <Label className="text-sm font-bold text-gray-900">Pro Lister Pack</Label>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-3">
                  <p className="text-xs text-gray-700">
                    Build your reputation and stand out as a true professional with the Pro Lister Pack - a complimentary package for the buyer complete with helpful resources and information.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-gray-700 mb-3 font-medium">Analyzing your Collectibles for helpful resources...</p>
                  <ul className="space-y-2 text-xs text-gray-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span>Official product manuals or documentation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span>Local repair shops or service centers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span>Parts suppliers or accessories dealers</span>
                    </li>
                  </ul>
                </div>

                {/* Upgrade Button */}
                <Button
                  onClick={onUpgradePremium}
                  disabled={!canUsePremium}
                  className={`w-full mt-3 ${
                    canUsePremium
                      ? 'bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {canUsePremium ? (
                    <>
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Premium Post ({postsRemaining}/{totalPosts} remaining)
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Premium Posts Exhausted
                    </>
                  )}
                </Button>
              </div>
            ) : usefulLinks && usefulLinks.length > 0 ? (
              // PREMIUM ACTIVE - Show actual data
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-green-600" />
                  <Label className="text-sm font-bold text-gray-900">Pro Lister Pack</Label>
                  <Badge className="bg-green-600 text-white text-xs">Active</Badge>
                </div>

                <p className="text-xs text-gray-600">
                  These resources will be included in your listing to help buyers:
                </p>

                <ul className="space-y-2 text-xs">
                  {usefulLinks.map((link: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600 text-sm">✓</span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:text-blue-900 underline hover:no-underline flex-1"
                      >
                        {link.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              // PREMIUM ACTIVE but loading
              <div className="flex items-center justify-center py-6">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Loading pack features...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'automation' && (
          <div>
            {!usePremium ? (
              // FREE TIER
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-purple-600" />
                  <Label className="text-sm font-bold text-gray-900">Insights & Automation Pack</Label>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-3">
                  <p className="text-xs text-gray-700 mb-2">
                    Higher level use of GISTer agent enhanced research to make the most of your post. Apply market insights to assess the value of your items. Schedule time auto-posting for up to 5 different sites!
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-purple-200 mb-3">
                  <p className="text-xs text-gray-700 mb-3 font-medium">
                    Receive the latest 2nd hand market research on your items specifically to discover trends, what's in, what's hot and what's not, and apply it to your assistant's list logic for intelligent, automatic and hassle-free posting for up to 6 sites at 1 time.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-purple-200">
                  <ul className="space-y-2 text-xs text-gray-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Smart scheduling:</strong> Post during peak hours for maximum visibility</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Multi-platform:</strong> Automatically post to 6 sites simultaneously</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Market insights:</strong> Real-time trends and pricing recommendations</span>
                    </li>
                  </ul>
                </div>

                {/* Upgrade Button */}
                <Button
                  onClick={onUpgradePremium}
                  disabled={!canUsePremium}
                  className={`w-full mt-3 ${
                    canUsePremium
                      ? 'bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {canUsePremium ? (
                    <>
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Premium Post ({postsRemaining}/{totalPosts} remaining)
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Premium Posts Exhausted
                    </>
                  )}
                </Button>
              </div>
            ) : (
              // PREMIUM ACTIVE
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  <Label className="text-sm font-bold text-gray-900">Insights & Automation Pack</Label>
                  <Badge className="bg-green-600 text-white text-xs">Active</Badge>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-green-900 mb-3 font-medium">
                    Your listing is now optimized for automatic multi-platform posting!
                  </p>

                  <ul className="space-y-2 text-xs text-green-800">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Smart scheduling enabled for peak hours</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Multi-platform posting ready (up to 6 sites)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Latest market insights applied to pricing and description</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            {!usePremium ? (
              // FREE TIER
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-purple-600" />
                  <Label className="text-sm font-bold text-gray-900">Fine Details Pack</Label>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-3">
                  <p className="text-xs text-gray-700">
                    Includes all the fine details that help your item sell, including 20 SEO-optimized search tags for prime visibility and platform-specific fields.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-gray-700 mb-3 font-medium">Everything where all at once</p>
                  <ul className="space-y-2 text-xs text-gray-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span>SEO Optimization: 20 premium search tags for prime visibility</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span>8+ additional platform-specific fields for eBay, Mercari, Facebook Marketplace</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span>Custom descriptions optimized for each platform</span>
                    </li>
                  </ul>
                </div>

                {/* Upgrade Button */}
                <Button
                  onClick={onUpgradePremium}
                  disabled={!canUsePremium}
                  className={`w-full mt-3 ${
                    canUsePremium
                      ? 'bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {canUsePremium ? (
                    <>
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade to Premium Post ({postsRemaining}/{totalPosts} remaining)
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Premium Posts Exhausted
                    </>
                  )}
                </Button>
              </div>
            ) : (
              // PREMIUM ACTIVE
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <Label className="text-sm font-bold text-gray-900">Full Coverage Pack</Label>
                  <Badge className="bg-green-600 text-white text-xs">Active</Badge>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-green-900 mb-3 font-medium">
                    Your listing now includes all the fine details to maximize visibility and sales!
                  </p>

                  <ul className="space-y-2 text-xs text-green-800">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>20 SEO tags generated and ordered by effectiveness</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Platform-specific fields populated for {platformsWithFields}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>Custom descriptions optimized for each marketplace</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

