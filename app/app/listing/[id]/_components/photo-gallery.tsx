
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Photo {
  id: string;
  cdnUrl: string | null;
  cloudStoragePath: string;
  order: number;
  isPrimary: boolean;
}

export default function PhotoGallery({ photos, listingId }: { photos: Photo[]; listingId: string }) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Fetch signed URLs for photos
  useState(() => {
    const fetchUrls = async () => {
      for (const photo of photos) {
        try {
          const response = await fetch(`/api/photos/${photo.id}/url`);
          const data = await response.json();
          if (data.url) {
            setPhotoUrls((prev) => ({ ...prev, [photo.id]: data.url }));
          }
        } catch (error) {
          console.error('Failed to fetch photo URL:', error);
        }
      }
    };
    if (photos.length > 0) {
      fetchUrls();
    }
  });

  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h3 className="font-medium mb-3">Photos ({photos.length})</h3>
        <div className="grid grid-cols-4 gap-2">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all"
            >
              {photoUrls[photo.id] ? (
                <Image
                  src={photoUrls[photo.id]}
                  alt="Product photo"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {photo.isPrimary && (
                <div className="absolute top-1 left-1 bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded">
                  Primary
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <ZoomIn className="w-6 h-6 text-white" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          {selectedPhoto && photoUrls[selectedPhoto.id] && (
            <div className="relative w-full aspect-video">
              <Image
                src={photoUrls[selectedPhoto.id]}
                alt="Product photo"
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
