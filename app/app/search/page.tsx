
"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Mic, MicOff, Filter, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  category: string;
  location: string;
  primaryPhoto?: string;
  seller: {
    id: string;
    name: string;
  };
  grades: {
    overall: string;
    gradeScore: number;
    verifiedCount: number;
    totalTargets: number;
  } | null;
  createdAt: string;
}

interface SearchResponse {
  results: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: any;
}

const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Home & Garden",
  "Sports & Outdoors",
  "Toys & Games",
  "Books & Media",
  "Automotive",
  "Health & Beauty",
  "Collectibles",
  "Other",
];

const CONDITIONS = ["New", "Like New", "Good", "Fair", "For Parts"];

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [isListening, setIsListening] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [location, setLocation] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Voice recognition
  const startVoiceRecognition = useCallback(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast({
        title: "Not Supported",
        description: "Voice recognition is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      toast({
        title: "Recognition Error",
        description: "Failed to recognize speech. Please try again.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [toast]);

  const stopVoiceRecognition = useCallback(() => {
    setIsListening(false);
  }, []);

  // Search function
  const performSearch = useCallback(
    async (page = 1) => {
      setLoading(true);

      try {
        const params = new URLSearchParams();
        if (query) params.append("query", query);
        if (category) params.append("category", category);
        if (condition) params.append("condition", condition);
        if (priceRange[0] > 0) params.append("minPrice", priceRange[0].toString());
        if (priceRange[1] < 1000) params.append("maxPrice", priceRange[1].toString());
        if (location) params.append("location", location);
        params.append("sortBy", sortBy);
        params.append("page", page.toString());
        params.append("limit", "20");

        const response = await fetch(`/api/search?${params.toString()}`);
        if (!response.ok) throw new Error("Search failed");

        const data: SearchResponse = await response.json();
        setResults(data.results);
        setPagination(data.pagination);
      } catch (error) {
        console.error("Search error:", error);
        toast({
          title: "Search Failed",
          description: "Failed to search listings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [query, category, condition, priceRange, location, sortBy, toast]
  );

  // Search on mount if query param exists
  useEffect(() => {
    const initialQuery = searchParams.get("q");
    if (initialQuery) {
      performSearch();
    }
  }, [searchParams]);

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  // Clear filters
  const clearFilters = () => {
    setCategory("");
    setCondition("");
    setPriceRange([0, 1000]);
    setLocation("");
    setSortBy("relevance");
  };

  const activeFiltersCount = [
    category,
    condition,
    priceRange[0] > 0 || priceRange[1] < 1000,
    location,
  ].filter(Boolean).length;

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

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for items..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-12"
              />
              {isListening ? (
                <button
                  type="button"
                  onClick={stopVoiceRecognition}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <MicOff className="h-5 w-5 text-red-500 animate-pulse" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startVoiceRecognition}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Mic className="h-5 w-5 text-muted-foreground hover:text-primary" />
                </button>
              )}
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Search Filters</SheetTitle>
                  <SheetDescription>
                    Refine your search with filters
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  {/* Category */}
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Condition */}
                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any Condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Condition</SelectItem>
                        {CONDITIONS.map((cond) => (
                          <SelectItem key={cond} value={cond}>
                            {cond}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-2">
                    <Label>
                      Price Range: ${priceRange[0]} - ${priceRange[1]}
                      {priceRange[1] === 1000 && "+"}
                    </Label>
                    <Slider
                      min={0}
                      max={1000}
                      step={10}
                      value={priceRange}
                      onValueChange={(value) =>
                        setPriceRange(value as [number, number])
                      }
                      className="mt-2"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="City, State, or ZIP"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Sort By */}
                  <div className="space-y-2">
                    <Label>Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Relevance</SelectItem>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="price_low">
                          Price: Low to High
                        </SelectItem>
                        <SelectItem value="price_high">
                          Price: High to Low
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="flex-1"
                    >
                      Clear All
                    </Button>
                    <Button
                      onClick={() => {
                        performSearch();
                        setFiltersOpen(false);
                      }}
                      className="flex-1"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </form>
        </div>
      </div>

      {/* Search Results */}
      <div className="container max-w-7xl mx-auto px-4 py-6">
        {/* Results Header */}
        {results.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              Found {pagination.total} results
              {query && (
                <>
                  {" "}
                  for <span className="font-semibold">&quot;{query}&quot;</span>
                </>
              )}
            </p>
          </div>
        )}

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-muted" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map((item) => (
                <Link key={item.id} href={`/listing/${item.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="relative aspect-square bg-muted">
                      {item.primaryPhoto ? (
                        <Image
                          src={item.primaryPhoto}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                      {item.grades && (
                        <Badge
                          className={`absolute top-2 right-2 ${getGradeColor(
                            item.grades.overall
                          )} text-white`}
                        >
                          {item.grades.overall}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-1 mb-1">
                        {item.title}
                      </h3>
                      <p className="text-2xl font-bold text-primary mb-2">
                        ${item.price.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{item.condition}</Badge>
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.location}
                          </span>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="px-4 py-3 border-t bg-muted/50">
                      <p className="text-xs text-muted-foreground">
                        Sold by {item.seller.name}
                      </p>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={pagination.page === 1}
                  onClick={() => performSearch(pagination.page - 1)}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === pagination.totalPages ||
                      Math.abs(page - pagination.page) <= 1
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={
                            page === pagination.page ? "default" : "outline"
                          }
                          onClick={() => performSearch(page)}
                        >
                          {page}
                        </Button>
                      );
                    } else if (Math.abs(page - pagination.page) === 2) {
                      return <span key={page}>...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => performSearch(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground">
              {query
                ? `No listings found for "${query}"`
                : "Start searching to find items"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
