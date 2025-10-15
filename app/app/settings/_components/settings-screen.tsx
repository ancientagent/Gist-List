
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, LogOut, Bell, Shield, HelpCircle, Crown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function SettingsScreen() {
  const { data: session } = useSession() || {};
  const router = useRouter();

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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/listings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 pb-24">
        {/* User Profile Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">{session?.user?.name || 'User'}</h2>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
              <Badge className={`${tierColor} text-white flex items-center gap-1 w-fit mt-1`}>
                {subscriptionTier === 'PRO' && <Crown className="w-3 h-3" />}
                {subscriptionTier} Tier
              </Badge>
            </div>
          </div>
          {subscriptionTier === 'FREE' && (
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
              <Crown className="mr-2 h-4 w-4" />
              Upgrade to Premium
            </Button>
          )}
        </div>

        {/* Settings Options */}
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {/* Account Settings */}
          <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
            <User className="w-5 h-5 text-gray-600" />
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Account</p>
              <p className="text-xs text-gray-500">Manage your account settings</p>
            </div>
          </button>

          {/* Notifications */}
          <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500">Configure notification preferences</p>
            </div>
          </button>

          {/* Privacy & Security */}
          <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
            <Shield className="w-5 h-5 text-gray-600" />
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Privacy & Security</p>
              <p className="text-xs text-gray-500">Manage your privacy settings</p>
            </div>
          </button>

          {/* Help & Support */}
          <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
            <HelpCircle className="w-5 h-5 text-gray-600" />
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900">Help & Support</p>
              <p className="text-xs text-gray-500">Get help and contact support</p>
            </div>
          </button>
        </div>

        {/* Sign Out */}
        <div className="mt-6">
          <Button
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* App Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">GISTer v1.0.0</p>
          <p className="text-xs text-gray-400 mt-1">Say-Snap-Sell</p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-10 pb-safe">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-center">
          <Link href="/listings">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <span className="text-sm">Back to Listings</span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
