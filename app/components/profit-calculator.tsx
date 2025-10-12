
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, AlertCircle } from 'lucide-react';

interface ProfitBreakdown {
  sellingPrice: number;
  purchasePrice: number;
  platformFee: number;
  paymentProcessingFee: number;
  shippingCost: number;
  gistListCost: number;
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
}

interface Props {
  listingId: string;
  currentPrice: number;
  currentPurchasePrice?: number;
  shippingCost?: number;
  platforms: string[];
}

export function ProfitCalculator({
  listingId,
  currentPrice,
  currentPurchasePrice = 0,
  shippingCost = 0,
  platforms,
}: Props) {
  const [purchasePrice, setPurchasePrice] = useState(currentPurchasePrice);
  const [profitData, setProfitData] = useState<Record<string, ProfitBreakdown> | null>(null);
  const [bestPlatform, setBestPlatform] = useState<{ platform: string; profit: ProfitBreakdown } | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateProfit = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/profit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchasePrice }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfitData(data.profitBreakdowns);
        setBestPlatform(data.bestPlatform);
      }
    } catch (error) {
      console.error('Failed to calculate profit:', error);
    } finally {
      setLoading(false);
    }
  }, [listingId, purchasePrice]);

  useEffect(() => {
    if (purchasePrice > 0) {
      calculateProfit();
    }
  }, [purchasePrice, calculateProfit]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Profit Calculator
        </CardTitle>
        <CardDescription>
          Calculate your potential profit across different platforms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Purchase Price Input */}
        <div className="space-y-2">
          <Label htmlFor="purchasePrice">How much did you pay for this item?</Label>
          <div className="flex gap-2">
            <Input
              id="purchasePrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={purchasePrice || ''}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
            />
            <Button onClick={calculateProfit} disabled={loading || purchasePrice <= 0}>
              Calculate
            </Button>
          </div>
        </div>

        {/* Best Platform */}
        {bestPlatform && (
          <div className="rounded-lg border-2 border-green-500/50 bg-green-50 dark:bg-green-950/20 p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Best Platform: {bestPlatform.platform}
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(bestPlatform.profit.netProfit)}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Net Profit • {formatPercent(bestPlatform.profit.profitMargin)} Margin • {formatPercent(bestPlatform.profit.roi)} ROI
                </p>
              </div>
              <Badge variant="default" className="bg-green-600">Best</Badge>
            </div>
          </div>
        )}

        {/* Profit Breakdown by Platform */}
        {profitData && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Profit by Platform</h4>
            {Object.entries(profitData).map(([platform, breakdown]) => (
              <div
                key={platform}
                className="rounded-lg border p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{platform}</span>
                  <span className={`font-bold ${breakdown.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(breakdown.netProfit)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Platform Fee: {formatCurrency(breakdown.platformFee)}</div>
                  <div>Processing: {formatCurrency(breakdown.paymentProcessingFee)}</div>
                  <div>Shipping: {formatCurrency(breakdown.shippingCost)}</div>
                  <div>GistList: {formatCurrency(breakdown.gistListCost)}</div>
                </div>
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">
                    Margin: {formatPercent(breakdown.profitMargin)}
                  </Badge>
                  <Badge variant="outline">
                    ROI: {formatPercent(breakdown.roi)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">How we calculate profit:</p>
            <p className="text-muted-foreground text-xs">
              Net Profit = Selling Price - Purchase Price - Platform Fees - Payment Processing - Shipping - GistList Costs
            </p>
            <p className="text-muted-foreground text-xs">
              ROI = (Net Profit / Purchase Price) × 100%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
