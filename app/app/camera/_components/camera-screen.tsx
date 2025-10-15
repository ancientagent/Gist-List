
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Camera, Mic, Loader2, Package, Settings, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [showStartButton, setShowStartButton] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true); // Camera toggle state
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

  // Auto-initialize camera on mount (only if camera is enabled)
  useEffect(() => {
    if (cameraEnabled && !hasAttemptedInit.current) {
      hasAttemptedInit.current = true;
      initCamera();
    }
  }, [cameraEnabled]);

  // Handle camera toggle
  useEffect(() => {
    if (cameraEnabled && !stream) {
      initCamera();
    } else if (!cameraEnabled && stream) {
      // Stop camera when toggled off
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      hasAttemptedInit.current = false;
    }
  }, [cameraEnabled]);

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

  // Desktop handler (hold to record + capture on release if camera is on)
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
    
    // Only capture photo if camera is enabled
    if (cameraEnabled) {
      await capturePhoto();
    } else {
      // If camera is off, submit text only
      if (theGist.trim()) {
        await submitTextOnly();
      }
    }
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
      
      // Validate video dimensions
      if (!video.videoWidth || !video.videoHeight) {
        throw new Error('Camera not ready. Please wait and try again.');
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to create canvas context');
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Show captured image in viewfinder
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(imageDataUrl);
      
      // Convert to blob with error handling
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) {
              resolve(b);
            } else {
              reject(new Error('Failed to create image blob'));
            }
          },
          'image/jpeg',
          0.95
        );
      });

      // Validate blob
      if (blob.size === 0) {
        throw new Error('Captured image is empty');
      }

      // Upload photo and create listing
      setIsAnalyzing(true);
      const formData = new FormData();
      formData.append('photo', blob, 'photo.jpg');
      formData.append('theGist', theGist || '');

      const response = await fetch('/api/listings/create', {
        method: 'POST',
        body: formData,
      });

      // Handle network errors
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to create listing';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Validate response data
      if (!data.listingId) {
        throw new Error('Invalid server response');
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
    } catch (error: any) {
      console.error('Capture error:', error);
      const errorMessage = error?.message || 'Failed to capture photo. Please try again.';
      toast.error(errorMessage);
      setIsAnalyzing(false);
      setCapturedImage(null); // Reset captured image on error
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

  // Submit text-only (without photo) when camera is off
  const submitTextOnly = async () => {
    if (!theGist.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setIsCapturing(true);
    try {
      const response = await fetch('/api/listings/sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theGist: theGist.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create listing');
      }

      const data = await response.json();
      toast.success('Processing your item...');
      router.push('/listings');
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle Enter key for text submission when camera is off
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !cameraEnabled) {
      e.preventDefault();
      submitTextOnly();
    }
  };

  // Development helper: Create sample listing instantly
  const [isCreatingSample, setIsCreatingSample] = useState(false);
  const isDev = process.env.NODE_ENV !== 'production';
  
  const createSampleListing = async () => {
    if (isCreatingSample) return;
    
    setIsCreatingSample(true);
    try {
      const response = await fetch('/api/listings/sample', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create sample listing');
      }

      const data = await response.json();
      toast.success('Processing sample item...');
      // Navigate to listings page where they'll see the AI analyzing the item
      router.push('/listings');
    } catch (error: any) {
      console.error('Sample listing error:', error);
      toast.error(error.message || 'Failed to create sample listing');
      setIsCreatingSample(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Camera Viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        {!cameraEnabled ? (
          // GISTer Assistant Mode (camera off)
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
            <div className="text-center p-8 max-w-md">
              <div className="relative w-32 h-32 mx-auto mb-6">
                {/* GISTer placeholder - will be replaced with actual character */}
                <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl">
                  <Package className="w-16 h-16 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <Mic className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Hey! I'm GISTer!</h2>
              <p className="text-indigo-200 mb-6">
                Tell me about your item and I'll help you create a listing. Just type or speak below!
              </p>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-sm text-white/80">
                💡 Camera is off. Toggle it back on if you want to snap a photo!
              </div>
            </div>
          </div>
        ) : capturedImage ? (
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
          <div className="flex items-center gap-2">
            <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-sm">
              {session?.user?.name || 'Guest'}
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            {isDev && (
              <Button
                onClick={createSampleListing}
                disabled={isCreatingSample}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs"
              >
                {isCreatingSample ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Package className="w-3 h-3 mr-1" />
                    Use Sample
                  </>
                )}
              </Button>
            )}
          </div>
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
      <div className="bg-white p-4 pb-20">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            The Gist
          </label>
          {/* Camera Toggle - moved here */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
            {cameraEnabled ? (
              <Camera className="w-4 h-4 text-green-600" />
            ) : (
              <CameraOff className="w-4 h-4 text-gray-400" />
            )}
            <Switch
              checked={cameraEnabled}
              onCheckedChange={setCameraEnabled}
              className="data-[state=checked]:bg-green-600"
            />
          </div>
        </div>
        
        {/* Textarea with embedded mic icon */}
        <div className="relative">
          <Textarea
            placeholder="Brand, model, condition, preferences... (e.g., 'Sony camera, good condition, will ship')"
            value={theGist}
            onChange={(e) => setTheGist(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full min-h-[80px] resize-none pr-12"
            disabled={isCapturing || isListening}
          />
          {/* Mic icon embedded in textarea */}
          <div className="absolute right-3 top-3">
            <Mic 
              className={`w-5 h-5 transition-colors ${
                isListening ? 'text-green-500' : 'text-gray-400'
              }`}
            />
          </div>
        </div>
        
        {/* Mobile: Combined hold-to-record button (and capture if camera is on) */}
        <div className="mt-4 block md:hidden">
          <button
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            disabled={isCapturing || (!cameraEnabled && !theGist.trim())}
            className={`w-full h-16 text-lg rounded-lg font-semibold flex items-center justify-center transition-all ${
              isCapturing
                ? 'bg-gray-400 cursor-not-allowed'
                : isPressHolding
                ? 'bg-emerald-600 text-white scale-95 animate-pulse'
                : cameraEnabled
                ? 'bg-green-600 active:bg-green-700 text-white active:scale-95'
                : 'bg-indigo-600 active:bg-indigo-700 text-white active:scale-95'
            }`}
          >
            {isCapturing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {cameraEnabled ? 'Capturing...' : 'Processing...'}
              </>
            ) : isPressHolding ? (
              <>
                <Mic className="mr-2 h-5 w-5" />
                {cameraEnabled ? 'Recording... Release to Snap' : 'Recording... Release to Send'}
              </>
            ) : (
              <>
                {cameraEnabled ? (
                  <>
                    <Camera className="mr-2 h-5 w-5" />
                    Hold to Record, Release to Snap
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-5 w-5" />
                    Hold to Record Voice
                  </>
                )}
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-3">
            {cameraEnabled 
              ? 'Press & hold to use voice, release to capture image'
              : 'Type and press Enter, or hold button to use voice'
            }
          </p>
        </div>

        {/* Desktop: Combined hold-to-record button (and capture if camera is on) */}
        <div className="mt-4 hidden md:block">
          <button
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={() => {
              if (isPressHolding) handlePressEnd();
            }}
            disabled={isCapturing || (!cameraEnabled && !theGist.trim())}
            className={`w-full h-16 text-lg rounded-lg font-semibold flex items-center justify-center transition-all ${
              isCapturing
                ? 'bg-gray-400 cursor-not-allowed'
                : isPressHolding
                ? 'bg-emerald-600 text-white scale-95'
                : cameraEnabled
                ? 'bg-green-600 hover:bg-green-700 text-white active:scale-95'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
            }`}
          >
            {isCapturing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {cameraEnabled ? 'Capturing...' : 'Processing...'}
              </>
            ) : isPressHolding ? (
              <>
                <Mic className="mr-2 h-5 w-5" />
                {cameraEnabled ? 'Recording... Release to Snap' : 'Recording... Release to Send'}
              </>
            ) : (
              <>
                {cameraEnabled ? (
                  <>
                    <Camera className="mr-2 h-5 w-5" />
                    Hold to Record, Release to Snap
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-5 w-5" />
                    Hold to Record Voice
                  </>
                )}
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-3">
            {cameraEnabled 
              ? 'Press & hold to use voice, release to capture image'
              : 'Type and press Enter, or hold button to use voice'
            }
          </p>
        </div>
      </div>

      {/* Bottom Actions - Settings (left) and Listings (right) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-10 pb-safe">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between">
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </Button>
          </Link>
          <Link href="/listings">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <span className="text-sm">Listings</span>
            </Button>
          </Link>
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
