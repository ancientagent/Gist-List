
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  Camera,
  Package,
  Settings,
  LogOut,
  Loader2,
  Crown,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Link2,
  ExternalLink,
  Store,
  Music,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface PlatformStatus {
  platform: string;
  connected: boolean;
  lastSync?: string;
  username?: string;
}

const PLATFORMS = [
  {
    id: 'ebay',
    name: 'eBay',
    icon: Store,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    description: 'Connect to post on the world\'s largest marketplace',
    authType: 'oauth',
    tier: 'FREE',
  },
  {
    id: 'reverb',
    name: 'Reverb',
    icon: Music,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    description: 'Perfect for musical instruments and audio gear',
    authType: 'apikey',
    tier: 'FREE',
  },
  {
    id: 'etsy',
    name: 'Etsy',
    icon: ShoppingBag,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    description: 'Sell handmade, vintage, and unique items',
    authType: 'oauth',
    tier: 'FREE',
  },
];

export default function ConnectionsManager() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, PlatformStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [reverbApiKey, setReverbApiKey] = useState('');
  const [showReverbDialog, setShowReverbDialog] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  useEffect(() => {
    fetchPlatformStatuses();
  }, []);

  const fetchPlatformStatuses = async () => {
    setIsLoading(true);
    try {
      const responses = await Promise.all([
        fetch('/api/marketplace/ebay/status').then(r => r.json()),
        fetch('/api/marketplace/reverb/status').then(r => r.json()),
        fetch('/api/marketplace/etsy/status').then(r => r.json()),
      ]);

      const statuses: Record<string, PlatformStatus> = {
        ebay: responses[0],
        reverb: responses[1],
        etsy: responses[2],
      };

      setPlatformStatuses(statuses);
    } catch (error) {
      console.error('Failed to fetch platform statuses:', error);
      toast.error('Failed to load connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (platformId: string, authType: string) => {
    if (authType === 'oauth') {
      // Redirect to OAuth flow
      window.location.href = `/api/marketplace/${platformId}/auth`;
    } else if (authType === 'apikey') {
      // Show API key dialog
      setShowReverbDialog(true);
    }
  };

  const handleDisconnect = async (platformId: string) => {
    if (!confirm(`Are you sure you want to disconnect ${platformId.toUpperCase()}?`)) {
      return;
    }

    setConnectingPlatform(platformId);
    try {
      const response = await fetch(`/api/marketplace/${platformId}/disconnect`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      toast.success(`${platformId.toUpperCase()} disconnected successfully`);
      await fetchPlatformStatuses();
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error(`Failed to disconnect ${platformId.toUpperCase()}`);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleReverbConnect = async () => {
    if (!reverbApiKey.trim()) {
      toast.error('Please enter your Reverb API key');
      return;
    }

    setConnectingPlatform('reverb');
    try {
      const response = await fetch('/api/marketplace/reverb/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: reverbApiKey }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect');
      }

      toast.success('Reverb connected successfully!');
      setShowReverbDialog(false);
      setReverbApiKey('');
      await fetchPlatformStatuses();
    } catch (error) {
      console.error('Reverb connect error:', error);
      toast.error('Failed to connect Reverb. Please check your API key.');
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };

  const subscriptionTier = (session?.user as any)?.subscriptionTier || 'FREE';
  const tierColor = subscriptionTier === 'PRO' ? 'bg-amber-500' : subscriptionTier === 'BASIC' ? 'bg-blue-500' : 'bg-gray-500';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/listings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-indigo-600">Platform Connections</h1>
              <p className="text-xs text-gray-500">Manage your marketplace integrations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${tierColor} text-white flex items-center gap-1`}>
              {subscriptionTier === 'PRO' && <Crown className="w-3 h-3" />}
              {subscriptionTier}
            </Badge>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 pb-24">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Link2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Connect Your Marketplaces</h3>
              <p className="text-sm text-blue-700">
                Link your marketplace accounts to start posting your listings. All platforms below are available on the FREE tier!
              </p>
            </div>
          </div>
        </div>

        {/* Platform Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const status = platformStatuses[platform.id];
              const isConnected = status?.connected || false;
              const isConnecting = connectingPlatform === platform.id;

              return (
                <Card key={platform.id} className="overflow-hidden">
                  <CardHeader className={`${platform.bgColor} pb-3`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-3 bg-white rounded-lg ${platform.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {platform.name}
                            <Badge variant="secondary" className="text-xs">
                              {platform.tier}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {platform.description}
                          </CardDescription>
                        </div>
                      </div>
                      {isConnected ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        {isConnected ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium text-green-700">Connected</span>
                            </div>
                            {status?.username && (
                              <p className="text-xs text-gray-600">Account: {status.username}</p>
                            )}
                            {status?.lastSync && (
                              <p className="text-xs text-gray-500">
                                Last sync: {new Date(status.lastSync).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="text-sm text-gray-600">Not connected</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isConnected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(platform.id)}
                            disabled={isConnecting}
                          >
                            {isConnecting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Disconnect'
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => handleConnect(platform.id, platform.authType)}
                            disabled={isConnecting}
                          >
                            {isConnecting ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <ExternalLink className="w-4 h-4 mr-2" />
                            )}
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-gray-100 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Need Help?</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• eBay: Requires developer account and OAuth credentials</li>
            <li>• Reverb: Requires API key from your Reverb account settings</li>
            <li>• Etsy: Requires Etsy developer account and OAuth app</li>
          </ul>
          <p className="text-xs text-gray-600 mt-3">
            Visit our documentation for detailed setup instructions for each platform.
          </p>
        </div>
      </div>

      {/* Reverb API Key Dialog */}
      <Dialog open={showReverbDialog} onOpenChange={setShowReverbDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Reverb</DialogTitle>
            <DialogDescription>
              Enter your Reverb API key to connect your account. You can find this in your Reverb account settings under "API Access".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your Reverb API key"
                value={reverbApiKey}
                onChange={(e) => setReverbApiKey(e.target.value)}
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-xs text-blue-800">
                <strong>How to get your API key:</strong>
                <br />
                1. Log in to Reverb.com
                <br />
                2. Go to Settings → API & Applications
                <br />
                3. Generate a new personal access token
                <br />
                4. Copy and paste it here
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReverbDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReverbConnect}
              disabled={!reverbApiKey.trim() || connectingPlatform === 'reverb'}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {connectingPlatform === 'reverb' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                'Connect Reverb'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-around">
          <Link href="/listings">
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1">
              <Package className="w-5 h-5" />
              <span className="text-xs">Listings</span>
            </Button>
          </Link>
          <Link href="/camera">
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1">
              <Camera className="w-5 h-5" />
              <span className="text-xs">Camera</span>
            </Button>
          </Link>
          <Link href="/connections">
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-indigo-600">
              <Settings className="w-5 h-5" />
              <span className="text-xs">Connections</span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
