
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { X, Camera, Trash2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Photo {
  id: string;
  cdnUrl: string | null;
  cloudStoragePath: string;
  order: number;
  isPrimary: boolean;
  status?: string | null;
  requirement?: string | null;
  facetTag?: string | null;
  verificationReason?: string | null;
  analysisData?: Record<string, any> | null;
}

export default function PhotoGallery({ 
  photos, 
  listingId, 
  onPhotoUpdate 
}: { 
  photos: Photo[]; 
  listingId: string;
  onPhotoUpdate?: () => void;
}) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraMode, setCameraMode] = useState<'retake' | 'add'>('retake');

  // Fetch signed URLs for photos
  useEffect(() => {
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
  }, [photos]);

  const openGallery = (index: number) => {
    setSelectedPhotoIndex(index);
    setIsGalleryOpen(true);
  };

  const closeGallery = () => {
    setIsGalleryOpen(false);
    setSelectedPhotoIndex(null);
    setCameraMode('retake');
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handlePrevPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  const handleNextPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const handleRetakePhoto = async () => {
    if (isCapturing) return;

    // Initialize camera for retake mode
    if (!stream) {
      setCameraMode('retake');
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        setStream(mediaStream);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        }, 100);
      } catch (error) {
        console.error('Camera access error:', error);
        toast.error('Unable to access camera');
      }
    }
  };

  const handleAddPhoto = async () => {
    if (photos.length >= 4) {
      toast.error('Maximum 4 photos allowed');
      return;
    }

    // Initialize camera for add mode
    if (!stream) {
      setCameraMode('add');
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        setStream(mediaStream);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        }, 100);
      } catch (error) {
        console.error('Camera access error:', error);
        toast.error('Unable to access camera');
      }
    }
  };

  const captureNewPhoto = async (isRetake: boolean) => {
    if (!videoRef.current) return;

    setIsCapturing(true);

    try {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
        });

        const formData = new FormData();
        formData.append('photo', blob, 'photo.jpg');
        formData.append('listingId', listingId);
        formData.append('isRetake', String(isRetake));
        if (isRetake && selectedPhotoIndex !== null) {
          formData.append('photoId', photos[selectedPhotoIndex].id);
        }

        const response = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload photo');
        }

        toast.success(isRetake ? 'Photo updated!' : 'Photo added!');
        
        // Refresh listing data without full page reload
        if (onPhotoUpdate) {
          onPhotoUpdate();
        }
        
        // Close the gallery
        closeGallery();
      }
    } catch (error: any) {
      console.error('Capture error:', error);
      toast.error('Failed to capture photo');
    } finally {
      setIsCapturing(false);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (photos.length <= 1) {
      toast.error('Cannot delete the last photo');
      return;
    }

    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }

      toast.success('Photo deleted');
      if (onPhotoUpdate) {
        onPhotoUpdate();
      }
      closeGallery();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete photo');
    }
  };

  if (!photos || photos.length === 0) {
    return null;
  }

  const currentPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h3 className="font-medium mb-3">Photos ({photos.length}/4)</h3>
        <div className="flex gap-2 overflow-x-auto">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => openGallery(index)}
              className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
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
                  <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {photo.isPrimary && (
                <div className="absolute top-0.5 left-0.5 bg-purple-600 text-white text-[10px] px-1 py-0.5 rounded">
                  Primary
                </div>
              )}
              {photo.status && (
                <div
                  className={`absolute bottom-0.5 left-0.5 text-[10px] px-1.5 py-0.5 rounded-full text-white ${
                    photo.status === 'accepted'
                      ? 'bg-emerald-600'
                      : photo.status === 'rejected'
                        ? 'bg-red-600'
                        : 'bg-amber-500'
                  }`}
                >
                  {photo.status === 'accepted'
                    ? 'Verified'
                    : photo.status === 'rejected'
                      ? 'Retry needed'
                      : 'Pending QA'}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <Dialog open={isGalleryOpen} onOpenChange={closeGallery}>
        <DialogContent className="max-w-4xl p-0">
          <div className="relative bg-black">
            {/* Show camera or photo */}
            {stream ? (
              <div className="relative w-full aspect-video bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <Button
                    onClick={() => {
                      stream.getTracks().forEach(track => track.stop());
                      setStream(null);
                    }}
                    variant="outline"
                    className="bg-white/90"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => captureNewPhoto(cameraMode === 'retake')}
                    disabled={isCapturing}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isCapturing ? 'Capturing...' : 'Capture'}
                  </Button>
                </div>
              </div>
            ) : currentPhoto && photoUrls[currentPhoto.id] ? (
              <>
                <div className="relative w-full aspect-video">
                  <Image
                    src={photoUrls[currentPhoto.id]}
                    alt="Product photo"
                    fill
                    className="object-contain"
                  />
                </div>

                {/* Navigation Controls */}
                <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                  {selectedPhotoIndex! > 0 && (
                    <Button
                      onClick={handlePrevPhoto}
                      size="icon"
                      className="pointer-events-auto bg-black/50 hover:bg-black/70 text-white"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                  )}
                  <div className="flex-1" />
                  {selectedPhotoIndex! < photos.length - 1 && (
                    <Button
                      onClick={handleNextPhoto}
                      size="icon"
                      className="pointer-events-auto bg-black/50 hover:bg-black/70 text-white"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center justify-between text-white">
                    <span className="text-sm">
                      {selectedPhotoIndex! + 1} / {photos.length}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleRetakePhoto}
                        size="sm"
                        variant="outline"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Retake
                      </Button>
                      {photos.length < 4 && (
                        <Button
                          onClick={handleAddPhoto}
                          size="sm"
                          variant="outline"
                          className="bg-emerald-600/80 hover:bg-emerald-600 text-white border-emerald-600"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Photo
                        </Button>
                      )}
                      {photos.length > 1 && (
                        <Button
                          onClick={() => currentPhoto && handleDeletePhoto(currentPhoto.id)}
                          size="sm"
                          variant="outline"
                          className="bg-red-600/80 hover:bg-red-600 text-white border-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-700 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {currentPhoto.status && (
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          currentPhoto.status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-700'
                            : currentPhoto.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {currentPhoto.status === 'accepted'
                          ? 'Verified photo'
                          : currentPhoto.status === 'rejected'
                            ? 'Needs retry'
                            : 'Pending review'}
                      </span>
                    )}
                    {currentPhoto.requirement && (
                      <span className="text-xs text-gray-500">
                        Requirement: {currentPhoto.requirement.replace(/[_-]+/g, ' ')}
                      </span>
                    )}
                  </div>

                  {currentPhoto.analysisData?.summary && (
                    <div>
                      <p className="font-medium text-gray-900 text-sm">AI Findings</p>
                      <p className="text-sm text-gray-700">{currentPhoto.analysisData.summary}</p>
                    </div>
                  )}

                  {currentPhoto.analysisData?.conditionNotes && (
                    <p className="text-sm text-gray-600">
                      {currentPhoto.analysisData.conditionNotes}
                    </p>
                  )}

                  {(() => {
                    const scoreData = currentPhoto.analysisData?.scores as Record<string, unknown> | undefined;
                    if (!scoreData) return null;
                    return (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      {['surface', 'function', 'clean', 'complete'].map((key) => {
                        const raw = scoreData[key];
                        const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : null;
                        if (value == null || Number.isNaN(value)) return null;
                        const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
                        const label = key.charAt(0).toUpperCase() + key.slice(1);
                        return (
                          <div key={key} className="flex items-center justify-between">
                            <span>{label}</span>
                            <span className="font-medium text-gray-800">{percent}%</span>
                          </div>
                        );
                      })}
                    </div>
                    );
                  })()}

                  {currentPhoto.verificationReason && currentPhoto.status === 'rejected' && (
                    <p className="text-xs text-red-600">
                      {currentPhoto.verificationReason}
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
