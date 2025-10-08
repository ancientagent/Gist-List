
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Camera, Mic, Loader2 } from 'lucide-react';
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
  const [isPressHolding, setIsPressHolding] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showStartButton, setShowStartButton] = useState(false); // Changed to false - auto-start
  const recognitionRef = useRef<any>(null);
  const isRecognitionActive = useRef(false);
  const hasAttemptedInit = useRef(false);

  // Initialize camera function
  const initCamera = async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(mediaStream);
      setShowStartButton(false);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error: any) {
      console.error('Camera access error:', error);
      setCameraError(error?.message || 'Unable to access camera. Please grant camera permissions in your browser settings.');
      setShowStartButton(true); // Show button on error
      toast.error('Unable to access camera. Please grant camera permissions.');
    }
  };

  // Auto-initialize camera on mount
  useEffect(() => {
    if (!hasAttemptedInit.current) {
      hasAttemptedInit.current = true;
      initCamera();
    }
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false; // Changed to false to prevent doubling
        recognitionRef.current.interimResults = false; // Changed to false for final results only
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onresult = (event: any) => {
          // Get only the final result to avoid doubling
          const last = event.results.length - 1;
          const transcript = event.results[last][0].transcript;
          
          setTheGist(prev => {
            // If previous gist exists, add space before new text
            return prev ? `${prev} ${transcript}`.trim() : transcript;
          });
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          isRecognitionActive.current = false;
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          isRecognitionActive.current = false;
        };
      }
    }
  }, []);

  // Separate handlers for voice recording (mobile)
  const handleMicPressStart = () => {
    if (isCapturing || isRecognitionActive.current) return;
    
    // Start voice recording only
    if (recognitionRef.current) {
      try {
        setIsListening(true);
        isRecognitionActive.current = true;
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setIsListening(false);
        isRecognitionActive.current = false;
      }
    }
  };

  const handleMicPressEnd = () => {
    // Stop voice recording only (no photo capture)
    if (recognitionRef.current && isRecognitionActive.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop speech recognition:', error);
      }
    }
  };

  // Desktop handler (hold to record + capture on release)
  const handlePressStart = () => {
    if (isCapturing || isRecognitionActive.current) return;
    
    setIsPressHolding(true);
    
    // Start voice recording
    if (recognitionRef.current) {
      try {
        setIsListening(true);
        isRecognitionActive.current = true;
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setIsListening(false);
        isRecognitionActive.current = false;
      }
    }
  };

  const handlePressEnd = async () => {
    setIsPressHolding(false);
    
    // Stop voice recording
    if (recognitionRef.current && isRecognitionActive.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop speech recognition:', error);
      }
      // Don't reset isRecognitionActive here - let onend handle it
    }
    
    // Capture photo
    await capturePhoto();
  };

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [retakeMessage, setRetakeMessage] = useState<string | null>(null);

  const capturePhoto = async () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    setIsListening(false);

    try {
      // Create canvas to capture photo
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Show captured image in viewfinder
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage(imageDataUrl);
        
        // Convert to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
        });

        // Upload photo and create listing
        setIsAnalyzing(true);
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

        // Check AI confidence
        if (data.confidence && data.confidence > 0.7 && data.itemIdentified) {
          // Confident - proceed to List Mode
          toast.success('Item identified!');
          router.push(`/listing/${data.listingId}`);
        } else {
          // Not confident - ask to retake
          setIsAnalyzing(false);
          setRetakeMessage(
            data.imageQualityIssue || 
            'Unable to identify item clearly. Please retake with better lighting and focus.'
          );
        }
      }
    } catch (error: any) {
      console.error('Capture error:', error);
      toast.error(error?.message || 'Failed to capture photo');
      setIsAnalyzing(false);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = async () => {
    setCapturedImage(null);
    setRetakeMessage(null);
    setIsAnalyzing(false);
    // Re-initialize camera to fix black screen issue
    await initCamera();
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Camera Viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        {capturedImage ? (
          // Show captured image
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-full object-cover"
          />
        ) : showStartButton ? (
          // Show start camera button
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center p-8">
              <Camera className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Camera Access Required</h2>
              <p className="text-gray-400 mb-6 max-w-sm">
                {cameraError || 'Click the button below to start the camera and begin capturing items.'}
              </p>
              <Button 
                onClick={initCamera}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Camera className="mr-2 h-5 w-5" />
                Start Camera
              </Button>
            </div>
          </div>
        ) : (
          // Show live camera feed
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Camera overlay indicators */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-sm">
            {session?.user?.name || 'Guest'}
          </div>
          {isListening && (
            <div className="bg-emerald-500 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-sm flex items-center gap-2 animate-pulse">
              <Mic className="w-4 h-4" />
              <span className="animate-listening">Listening</span>
              <span className="animate-listening-dots">...</span>
            </div>
          )}
          {isAnalyzing && (
            <div className="bg-green-600 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-sm flex items-center gap-2 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing</span>
              <span className="animate-listening-dots">...</span>
            </div>
          )}
        </div>

        {/* Retake Message */}
        {retakeMessage && (
          <div className="absolute bottom-24 left-4 right-4 bg-red-500/90 backdrop-blur-sm rounded-lg p-4 text-white">
            <p className="text-sm font-medium mb-2">Photo Quality Issue</p>
            <p className="text-xs mb-3">{retakeMessage}</p>
            <Button 
              onClick={handleRetake}
              size="sm"
              className="w-full bg-white text-red-600 hover:bg-gray-100"
            >
              Retake Photo
            </Button>
          </div>
        )}
      </div>

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
          disabled={isCapturing || isListening}
        />
        
        {/* Mobile: Combined hold-to-record and capture button */}
        <div className="mt-4 block md:hidden">
          <button
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            disabled={isCapturing || !stream}
            className={`w-full h-16 text-lg rounded-lg font-semibold flex items-center justify-center transition-all ${
              isCapturing
                ? 'bg-gray-400 cursor-not-allowed'
                : isPressHolding
                ? 'bg-emerald-600 text-white scale-95 animate-pulse'
                : 'bg-green-600 active:bg-green-700 text-white active:scale-95'
            }`}
          >
            {isCapturing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Capturing...
              </>
            ) : isPressHolding ? (
              <>
                <Mic className="mr-2 h-5 w-5" />
                Recording... Release to Snap
              </>
            ) : (
              <>
                <Camera className="mr-2 h-5 w-5" />
                Hold to Record, Release to Snap
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-3">
            Press & hold to use voice, release to capture image
          </p>
        </div>

        {/* Desktop: Combined hold-to-record and capture button */}
        <div className="mt-4 hidden md:block">
          <button
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={() => {
              if (isPressHolding) handlePressEnd();
            }}
            disabled={isCapturing || !stream}
            className={`w-full h-16 text-lg rounded-lg font-semibold flex items-center justify-center transition-all ${
              isCapturing
                ? 'bg-gray-400 cursor-not-allowed'
                : isPressHolding
                ? 'bg-emerald-600 text-white scale-95'
                : 'bg-green-600 hover:bg-green-700 text-white active:scale-95'
            }`}
          >
            {isCapturing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Capturing...
              </>
            ) : isPressHolding ? (
              <>
                <Mic className="mr-2 h-5 w-5" />
                Recording... Release to Snap
              </>
            ) : (
              <>
                <Camera className="mr-2 h-5 w-5" />
                Hold to Record, Release to Snap
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-3">
            Press & hold to use voice, release to capture image
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes listening-dots {
          0%, 20% { opacity: 0; }
          40% { opacity: 0.5; }
          60%, 100% { opacity: 1; }
        }
        .animate-listening-dots {
          animation: listening-dots 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
