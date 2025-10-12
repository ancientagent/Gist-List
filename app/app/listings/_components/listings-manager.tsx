
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Camera,
  Package,
  Settings,
  LogOut,
  Loader2,
  Clock,
  CheckCircle,
  Archive,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Listing {
  id: string;
  title: string | null;
  status: string;
  price: number | null;
  createdAt: string;
  photos: any[];
}

export default function ListingsManager() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const response = await fetch('/api/listings');
      if (!response.ok) throw new Error('Failed to fetch listings');
      const data = await response.json();
      setListings(data);

      // Fetch photo URLs
      for (const listing of data) {
        if (listing.photos?.[0]?.id) {
          fetchPhotoUrl(listing.id, listing.photos[0].id);
        }
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPhotoUrl = async (listingId: string, photoId: string) => {
    try {
      const response = await fetch(`/api/photos/${photoId}/url`);
      const data = await response.json();
      if (data.url) {
        setPhotoUrls((prev) => ({ ...prev, [listingId]: data.url }));
      }
    } catch (error) {
      console.error('Failed to fetch photo URL:', error);
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
          <div>
            <h1 className="text-xl font-bold text-indigo-600">Gister</h1>
            <p className="text-xs text-gray-500">{session?.user?.name || 'User'}</p>
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
        {/* Subscription Info */}
        {subscriptionTier === 'FREE' && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 mb-4 border border-indigo-200">
            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-indigo-900 mb-1">
                  Free Tier - Unlimited Posts
                </h3>
                <p className="text-sm text-indigo-700 mb-2">
                  Upgrade to Basic or Pro for premium features, cloud sync, and more!
                </p>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  Upgrade Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Listings Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-500 mb-4">Start by capturing your first item</p>
            <Button onClick={() => router.push('/camera')} className="bg-green-600 hover:bg-green-700">
              <Camera className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listing/${listing.id}`}
                className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="flex gap-3 p-3">
                  {/* Photo Thumbnail */}
                  <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {photoUrls[listing.id] ? (
                      <Image
                        src={photoUrls[listing.id]}
                        alt={listing.title || 'Item'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {listing.title || 'Untitled Listing'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {listing.price ? (
                        <span className="text-lg font-semibold text-indigo-600">
                          ${listing.price.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">No price set</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={listing.status} />
                      <span className="text-xs text-gray-400">
                        {new Date(listing.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* FAB - New Post */}
      <Link
        href="/camera"
        className="fixed bottom-24 right-6 bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        title="New Post"
      >
        <Camera className="w-6 h-6" />
      </Link>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-around">
          <Link href="/listings">
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-indigo-600">
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
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1">
              <Settings className="w-5 h-5" />
              <span className="text-xs">Connections</span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    DRAFT: { icon: Clock, color: 'bg-gray-100 text-gray-700', label: 'Draft' },
    ACTIVE: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Active' },
    POSTED: { icon: CheckCircle, color: 'bg-blue-100 text-blue-700', label: 'Posted' },
    ARCHIVED: { icon: Archive, color: 'bg-gray-100 text-gray-500', label: 'Archived' },
  };

  const { icon: Icon, color, label } = config[status as keyof typeof config] || config.DRAFT;

  return (
    <Badge className={`${color} flex items-center gap-1 text-xs`} variant="secondary">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}
