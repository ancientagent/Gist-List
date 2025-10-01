
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Camera, Mic, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function CameraScreen() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [theGist, setTheGist] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [viewfinderExpanded, setViewfinderExpanded] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Camera access error:', error);
        toast.error('Unable to access camera. Please grant camera permissions.');
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) {
            setTheGist((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
          setIsListening(false);
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const capturePhoto = async () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      // Create canvas to capture photo
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
        });

        // Start voice recognition if available
        if (recognitionRef.current && !theGist) {
          try {
            setIsListening(true);
            recognitionRef.current.start();
            
            // Timeout after 5 seconds
            setTimeout(() => {
              if (isListening && recognitionRef.current) {
                try {
                  recognitionRef.current.stop();
                } catch (e) {
                  // Ignore errors
                }
                setIsListening(false);
              }
            }, 5000);
          } catch (error) {
            console.error('Speech recognition error:', error);
            setIsListening(false);
          }
        }

        // Upload photo and create listing
        const formData = new FormData();
        formData.append('photo', blob, 'photo.jpg');
        formData.append('theGist', theGist);

        const response = await fetch('/api/listings/create', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create listing');
        }

        toast.success('Photo captured! Analyzing...');
        router.push(`/listing/${data.listingId}`);
      }
    } catch (error: any) {
      console.error('Capture error:', error);
      toast.error(error?.message || 'Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Camera Viewfinder */}
      <div
        className={`relative overflow-hidden transition-all duration-300 ${
          viewfinderExpanded ? 'flex-1' : 'h-32'
        }`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Camera overlay indicators */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-sm">
            {session?.user?.name || 'Guest'}
          </div>
          {isListening && (
            <div className="bg-red-500 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-sm flex items-center gap-2">
              <Mic className="w-4 h-4 animate-pulse" />
              Listening...
            </div>
          )}
        </div>
      </div>

      {/* Pull Tab */}
      <button
        onClick={() => setViewfinderExpanded(!viewfinderExpanded)}
        className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 flex items-center justify-center text-white transition-colors"
      >
        {viewfinderExpanded ? (
          <ChevronDown className="w-5 h-5" />
        ) : (
          <ChevronUp className="w-5 h-5" />
        )}
      </button>

      {/* The Gist Input Section */}
      <div className="bg-white p-4 pb-safe">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          The Gist
        </label>
        <Textarea
          placeholder="Brand, model, condition, preferences... (e.g., 'Sony camera, good condition, will ship')"
          value={theGist}
          onChange={(e) => setTheGist(e.target.value)}
          className="w-full min-h-[80px] resize-none"
          disabled={isCapturing}
        />
        
        <div className="mt-4">
          <Button
            onClick={capturePhoto}
            disabled={isCapturing || !stream}
            className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-700"
          >
            {isCapturing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Capturing...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-5 w-5" />
                Capture & Analyze
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-3">
          Tap capture to take photo and activate voice-to-text
        </p>
      </div>
    </div>
  );
}
