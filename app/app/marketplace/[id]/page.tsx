

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Share2,
  Heart,
  ChevronLeft,
  Star,
  Shield,
  Package,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";

interface ListingDetails {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  category: string;
  location: string;
  photos: Array<{
    id: string;
    url: string;
    thumbnailUrl?: string;
    isPrimary: boolean;
  }>;
  seller: {
    id: string;
    name: string;
    email: string;
  };
  grades: {
    overall: string;
    gradeScore: number;
    verifiedCount: number;
    totalTargets: number;
  } | null;
  createdAt: string;
}

export default function MarketplaceListingPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession() || {};

  const [listing, setListing] = useState<ListingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    fetchListing();
  }, [params.id]);

  const fetchListing = async () => {
    try {
      const response = await fetch(`/api/listings/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch listing");

      const data = await response.json();
      setListing(data);
    } catch (error) {
      console.error("Error fetching listing:", error);
      toast({
        title: "Error",
        description: "Failed to load listing details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.title,
          text: listing?.description,
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Listing link copied to clipboard",
      });
    }
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    toast({
      title: isFavorited ? "Removed from Favorites" : "Added to Favorites",
      description: isFavorited
        ? "Item removed from your favorites"
        : "Item added to your favorites",
    });
  };

  const handleContactSeller = () => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    // TODO: Implement messaging system
    toast({
      title: "Contact Seller",
      description: "Messaging feature coming soon!",
    });
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-green-500";
      case "B":
        return "bg-blue-500";
      case "C":
        return "bg-yellow-500";
      case "D":
        return "bg-orange-500";
      case "F":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getGradeLabel = (grade: string) => {
    switch (grade) {
      case "A":
        return "Excellent";
      case "B":
        return "Good";
      case "C":
        return "Average";
      case "D":
        return "Below Average";
      case "F":
        return "Poor";
      default:
        return "Not Rated";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Listing Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The listing you&apos;re looking for doesn&apos;t exist
          </p>
          <Button onClick={() => router.push("/search")}>
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-7xl mx-auto px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              {listing.photos.length > 0 ? (
                <Image
                  src={listing.photos[selectedImage]?.url || ""}
                  alt={listing.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No Images Available
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {listing.photos.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {listing.photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square bg-muted rounded-md overflow-hidden ${
                      selectedImage === index
                        ? "ring-2 ring-primary"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={photo.thumbnailUrl || photo.url}
                      alt={`${listing.title} - ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Title and Price */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold">{listing.title}</h1>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleFavorite}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isFavorited ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                  </Button>
                </div>
              </div>
              <p className="text-4xl font-bold text-primary">
                ${listing.price?.toFixed(2) ?? '0.00'}
              </p>
            </div>

            {/* Quality Grade */}
            {listing.grades && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Listing Quality</span>
                    </div>
                    <Badge
                      className={`${getGradeColor(
                        listing.grades.overall
                      )} text-white`}
                    >
                      Grade {listing.grades.overall}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    This listing has been rated as{" "}
                    <span className="font-semibold">
                      {getGradeLabel(listing.grades.overall)}
                    </span>{" "}
                    based on completeness and quality.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Quality Score</span>
                      <span className="font-semibold">
                        {((listing.grades.gradeScore ?? 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    {listing.grades.totalTargets > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Verified Details</span>
                        <span className="font-semibold">
                          {listing.grades.verifiedCount} of {listing.grades.totalTargets}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Item Details */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Condition
                  </span>
                  <Badge>{listing.condition}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Category
                  </span>
                  <span className="text-sm font-medium">
                    {listing.category}
                  </span>
                </div>
                {listing.location && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Location
                      </span>
                      <span className="text-sm font-medium">
                        {listing.location}
                      </span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Listed
                  </span>
                  <span className="text-sm font-medium">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Contact Seller */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleContactSeller}
            >
              Contact Seller
            </Button>

            {/* Seller Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {listing.seller.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{listing.seller.name}</p>
                    <p className="text-xs text-muted-foreground">Seller</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Description */}
        <div className="mt-8">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Description</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {listing.description}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
