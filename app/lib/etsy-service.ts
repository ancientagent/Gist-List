
/**
 * Etsy API Integration Service
 * Handles OAuth, listing creation, and shop management
 * Docs: https://developers.etsy.com/documentation/
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ETSY_API_BASE = 'https://openapi.etsy.com/v3';
const ETSY_AUTH_URL = 'https://www.etsy.com/oauth/connect';
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';

interface EtsyConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function getEtsyConfig(): EtsyConfig {
  const clientId = process.env.ETSY_CLIENT_ID;
  const clientSecret = process.env.ETSY_CLIENT_SECRET;
  const redirectUri = process.env.ETSY_REDIRECT_URI || 'https://gistlist.abacusai.app/api/marketplace/etsy/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Etsy API credentials not configured. Set ETSY_CLIENT_ID and ETSY_CLIENT_SECRET in .env');
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Generate Etsy OAuth authorization URL
 */
export function getEtsyAuthUrl(state: string): string {
  const config = getEtsyConfig();
  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: 'listings_w listings_r shops_r', // Write listings, read listings, read shops
    client_id: config.clientId,
    state,
    code_challenge: state, // PKCE - in production, generate proper challenge
    code_challenge_method: 'S256',
  });

  return `${ETSY_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeEtsyCode(code: string, codeVerifier: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const config = getEtsyConfig();

  const response = await fetch(ETSY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Etsy token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Refresh Etsy access token
 */
export async function refreshEtsyToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const config = getEtsyConfig();

  const response = await fetch(ETSY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Etsy token refresh failed: ${error}`);
  }

  return response.json();
}

/**
 * Get user's Etsy shop info
 */
export async function getEtsyShop(accessToken: string, userId: string): Promise<any> {
  const response = await fetch(`${ETSY_API_BASE}/application/users/${userId}/shops`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': getEtsyConfig().clientId,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Etsy shop: ${error}`);
  }

  const data = await response.json();
  return data.results?.[0]; // Return first shop
}

/**
 * Get valid Etsy access token (refresh if expired)
 */
export async function getValidEtsyToken(userId: string): Promise<string> {
  const credential = await prisma.etsyCredential.findUnique({
    where: { userId },
  });

  if (!credential) {
    throw new Error('Etsy not connected. Please authorize Etsy first.');
  }

  // Check if token is expired (with 5 min buffer)
  const now = new Date();
  const expiresAt = new Date(credential.expiresAt);
  const bufferTime = 5 * 60 * 1000; // 5 minutes

  if (now.getTime() >= expiresAt.getTime() - bufferTime) {
    // Token expired, refresh it
    const tokens = await refreshEtsyToken(credential.refreshToken);

    // Update stored tokens
    await prisma.etsyCredential.update({
      where: { userId },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return tokens.access_token;
  }

  return credential.accessToken;
}

/**
 * Create a listing on Etsy
 */
export async function createEtsyListing(
  userId: string,
  listingData: {
    title: string;
    description: string;
    price: number;
    quantity: number;
    taxonomyId?: number;
    tags?: string[];
    shippingProfileId?: number;
    imageUrls?: string[];
  }
) {
  const accessToken = await getValidEtsyToken(userId);
  const credential = await prisma.etsyCredential.findUnique({
    where: { userId },
  });

  if (!credential) {
    throw new Error('Etsy shop info not found');
  }

  const shopId = credential.etsyShopId;

  // Prepare listing data
  const etsyListing = {
    quantity: listingData.quantity || 1,
    title: listingData.title.substring(0, 140), // Etsy max 140 chars
    description: listingData.description,
    price: listingData.price,
    who_made: 'i_did', // or 'someone_else', 'collective'
    when_made: '2020_2024', // or specific year range
    taxonomy_id: listingData.taxonomyId || 1, // Default taxonomy
    shipping_profile_id: listingData.shippingProfileId,
    tags: listingData.tags?.slice(0, 13), // Max 13 tags
    is_supply: false, // true if selling craft supplies
    should_auto_renew: false,
    state: 'draft', // Start as draft, user can publish later
  };

  // Create the listing
  const response = await fetch(`${ETSY_API_BASE}/application/shops/${shopId}/listings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': getEtsyConfig().clientId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(etsyListing),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Etsy listing: ${error}`);
  }

  const listing = await response.json();

  // Upload images if provided
  if (listingData.imageUrls && listingData.imageUrls.length > 0) {
    await uploadEtsyImages(accessToken, shopId, listing.listing_id, listingData.imageUrls);
  }

  return listing;
}

/**
 * Upload images to an Etsy listing
 */
async function uploadEtsyImages(
  accessToken: string,
  shopId: string,
  listingId: number,
  imageUrls: string[]
): Promise<void> {
  const config = getEtsyConfig();

  for (let i = 0; i < Math.min(imageUrls.length, 10); i++) { // Etsy max 10 images
    const imageUrl = imageUrls[i];

    // Download image from URL
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();

    // Create form data
    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer]), `image-${i}.jpg`);
    formData.append('rank', (i + 1).toString());

    // Upload to Etsy
    const uploadResponse = await fetch(
      `${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}/images`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': config.clientId,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      console.error(`Failed to upload image ${i} to Etsy:`, await uploadResponse.text());
      // Continue with other images
    }
  }
}

/**
 * Get listing status from Etsy
 */
export async function getEtsyListingStatus(
  userId: string,
  listingId: number
): Promise<any> {
  const accessToken = await getValidEtsyToken(userId);
  const config = getEtsyConfig();

  const response = await fetch(`${ETSY_API_BASE}/application/listings/${listingId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-api-key': config.clientId,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Etsy listing status: ${error}`);
  }

  return response.json();
}

/**
 * Delete/deactivate Etsy listing
 */
export async function deleteEtsyListing(
  userId: string,
  listingId: number
): Promise<void> {
  const accessToken = await getValidEtsyToken(userId);
  const credential = await prisma.etsyCredential.findUnique({
    where: { userId },
  });

  if (!credential) {
    throw new Error('Etsy shop info not found');
  }

  const shopId = credential.etsyShopId;
  const config = getEtsyConfig();

  const response = await fetch(
    `${ETSY_API_BASE}/application/shops/${shopId}/listings/${listingId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': config.clientId,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete Etsy listing: ${error}`);
  }
}
