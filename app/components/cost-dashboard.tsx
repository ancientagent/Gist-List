
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Package, Zap } from 'lucide-react';

interface CostSummary {
  totalTokensUsed: number;
  totalStorageBytes: string;
  totalApiCost: number;
  totalStorageCost: number;
  totalCost: number;
  listingCount: number;
  avgCostPerListing: number;
}

interface RecentListing {
  id: string;
  title: string;
  tokensUsed: number;
  storageBytes: number;
  apiCost: number;
  storageCost: number;
  totalCost: number;
  createdAt: string;
}

export function CostDashboard() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [recentListings, setRecentListings] = useState<RecentListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCosts();
  }, []);

  async function fetchCosts() {
    try {
      const response = await fetch('/api/user/costs');
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setRecentListings(data.recentListings);
      }
    } catch (error) {
      console.error('Failed to fetch costs:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading cost data...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No cost data available</div>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              Across {summary.listingCount} listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Per Listing</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.avgCostPerListing)}</div>
            <p className="text-xs text-muted-foreground">
              Average cost per item
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Cost</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalApiCost)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalTokensUsed.toLocaleString()} tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Cost</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalStorageCost)}</div>
            <p className="text-xs text-muted-foreground">
              {formatBytes(Number(summary.totalStorageBytes))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Listings</CardTitle>
          <CardDescription>Cost breakdown for your last 20 listings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentListings.map((listing) => (
              <div
                key={listing.id}
                className="flex items-center justify-between border-b pb-3 last:border-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{listing.title}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>AI: {formatCurrency(listing.apiCost)}</span>
                    <span>Storage: {formatCurrency(listing.storageCost)}</span>
                    <span>{formatBytes(listing.storageBytes)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatCurrency(listing.totalCost)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
