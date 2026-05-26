"use client"

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Clock, User, Phone, FileText, Camera, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api from "@/lib/apiClient";
import { SidebarInset } from "@/components/ui/sidebar";

interface VisitorData {
  _id: string;
  name: string;
  phone?: string;
  purpose?: string;
  timeIn?: string;
  timeOut?: string;
  company?: string;
  hostName?: string;
  code: string;
  date: string;
  photo?: string;
}

// Modern Visitor Pass Component - B&W version for printing
const VisitorPass = ({ visitor, passNumber }: { visitor: VisitorData; passNumber: number }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="visitor-pass w-full h-[280px] bg-white border-2 border-gray-800 rounded-lg overflow-hidden mx-auto mb-4">
      <div className="flex h-full">
        {/* Left Section - Logo and Header (B&W version) */}
        <div className="w-1/4 bg-white text-black p-4 flex flex-col items-center justify-center relative border-r border-gray-300">
          {/* Company Logo */}
          <div className="mb-4">
            <div className="w-20 h-20 bg-white flex items-center justify-center overflow-hidden rounded-lg border border-gray-300">
              <img
                src="/atithi-logo.png"
                alt="Atithi LLP Logo"
                className="w-18 h-18 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <Building2 className="h-12 w-12 text-gray-800 hidden" />
            </div>
          </div>
          <div className="text-center">
            <div className="bg-gray-100 rounded-full px-3 pb-2 text-xs font-semibold">
              VISITOR PASS
            </div>
          </div>
        </div>

        {/* Center Section - Photo */}
        <div className="w-1/4 bg-gray-50 flex flex-col items-center justify-center p-4 border-r border-gray-300">
          <div className="w-24 h-24 bg-gray-200 rounded-full border-2 border-gray-800 flex items-center justify-center mb-2 overflow-hidden">
            {visitor.photo ? (
              <img
                src={visitor.photo}
                alt="Visitor Photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-gray-500" />
            )}
          </div>
          <Badge variant="outline" className="text-xs border-gray-800 text-gray-800 px-2 pt-0 pb-3">
            PASS #{visitor.code ? visitor.code.replace('VISIT', '') : String(passNumber).padStart(3, '0')}
          </Badge>
        </div>

        {/* Right Section - Visitor Information */}
        <div className="w-1/2 p-4 flex flex-col justify-between">
          <div>
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">{visitor.name}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-gray-800 mr-2 flex-shrink-0" />
                <div>
                  <span className="font-medium block">Phone:</span>
                  <span className="text-xs">{visitor.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center">
                <Clock className="h-4 w-4 text-gray-800 mr-2 flex-shrink-0" />
                <div>
                  <span className="font-medium block">Time In:</span>
                  <span className="text-xs">{visitor.timeIn || currentTime}</span>
                </div>
              </div>

              <div className="flex items-center col-span-2">
                <FileText className="h-4 w-4 text-gray-800 mr-2 flex-shrink-0" />
                <div>
                  <span className="font-medium block">Purpose:</span>
                  <span className="text-xs">{visitor.purpose || 'General Visit'}</span>
                </div>
              </div>

              {visitor.company && (
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 text-gray-800 mr-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium block">Company:</span>
                    <span className="text-xs">{visitor.company}</span>
                  </div>
                </div>
              )}

              {visitor.hostName && (
                <div className="flex items-center">
                  <User className="h-4 w-4 text-gray-800 mr-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium block">Host:</span>
                    <span className="text-xs">{visitor.hostName}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <Separator className="mb-3 bg-gray-300" />
            <div className="text-center text-xs text-gray-600">
              <div className="font-medium">{currentDate}</div>
              <div className="mt-1 text-gray-800 font-semibold">
                Please return this pass when leaving
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function VisitorPassPage() {
  const router = useRouter();
  const [visitor, setVisitor] = useState<VisitorData>({
    _id: '1',
    name: '',
    phone: '',
    purpose: '',
    timeIn: '',
    company: '',
    hostName: '',
    photo: '',
    code: '',
    date: new Date().toISOString().split('T')[0]
  });

  const passRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [saving, setSaving] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const updateVisitor = (field: keyof VisitorData, value: string) => {
    setVisitor(prev => ({ ...prev, [field]: value }));
  };

  // Auto-start camera when component mounts (always-on camera)
  useEffect(() => {
    let isMounted = true;
    let localStream: MediaStream | null = null;

    async function initializeCamera() {
      try {
        console.log('🎥 Auto-initializing camera...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320, max: 320 },
            height: { ideal: 240, max: 240 },
            frameRate: { ideal: 30, max: 30 },
            facingMode: 'user'
          }
        });

        localStream = stream;
        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream;
          setStream(stream);
          setCameraActive(true);
          console.log('✅ Camera auto-initialized successfully');
        }
      } catch (error) {
        console.error('❌ Camera auto-initialization failed:', error);
        if (isMounted) {
          setStream(null);
          setCameraActive(false);
        }
      }
    }

    // Start camera automatically after a short delay
    const timer = setTimeout(initializeCamera, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Camera functions with enhanced debugging

  const startCamera = async () => {
    try {
      console.log('🎥 Starting camera...');
      console.log('📹 Video ref current:', videoRef.current);
      console.log('🌐 Navigator mediaDevices:', navigator.mediaDevices);

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ Camera not supported in this browser');
        throw new Error('Camera not supported in this browser');
      }

      // Request camera permissions
      const constraints = {
        video: {
          width: { ideal: 320, max: 640 },
          height: { ideal: 240, max: 480 },
          facingMode: 'user'
        },
        audio: false
      };

      console.log('📱 Requesting camera access with constraints:', constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('📺 Media stream obtained:', mediaStream);

      if (videoRef.current) {
        console.log('🎬 Setting video source...');
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setCameraActive(true);

        // Wait for video to load
        videoRef.current.onloadedmetadata = () => {
          console.log('✅ Video metadata loaded, playing video...');
          videoRef.current?.play();
        };

        console.log('✅ Camera initialized successfully');
        toast.success("Camera initialized successfully");
      } else {
        console.error('❌ Video element not found');
        throw new Error('Video element not found');
      }
    } catch (error: any) {
      console.error('❌ Camera error:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);

      let userMessage = 'Unable to access camera';
      if (error.name === 'NotAllowedError') {
        userMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        userMessage = 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        userMessage = 'Camera is being used by another application.';
      } else if (error.name === 'OverconstrainedError') {
        userMessage = 'Camera constraints not supported. Trying with basic settings...';
        // Try with simpler constraints
        try {
          const simpleStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 320 },
              height: { ideal: 240 }
            }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = simpleStream;
            setStream(simpleStream);
            setCameraActive(true);
            toast.success("Camera initialized with basic settings");
            return;
          }
        } catch (simpleError) {
          console.error('❌ Simple camera access also failed:', simpleError);
        }
      }

      toast.error(userMessage);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        context.drawImage(video, 0, 0);
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setVisitor(prev => ({ ...prev, photo: photoDataUrl }));
        stopCamera();
        toast.success("Visitor photo has been captured successfully.");
      }
    }
  };

  // Save visitor to database
  const saveVisitorRecord = async () => {
    if (!visitor.name.trim()) {
      toast.error("Visitor name is required.");
      return;
    }

    setSaving(true);
    try {
      console.log('💾 Saving visitor record...');

      const visitorData = {
        name: visitor.name.trim(),
        phone: visitor.phone?.trim() || '',
        purpose: visitor.purpose?.trim() || 'General Visit',
        timeIn: visitor.timeIn || new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        company: visitor.company?.trim() || '',
        hostName: visitor.hostName?.trim() || '',
        photo: visitor.photo || '',
        visitDate: new Date().toISOString().split('T')[0],
        status: 'active',
        createdAt: new Date().toISOString()
      };

      console.log('📤 Visitor data to save:', { ...visitorData, photo: visitorData.photo ? '[BASE64_IMAGE]' : 'none' });

      // Try multiple API endpoints for visitor registration
      const endpoints = [
        '/visitors',
      ];

      let success = false;
      let responseData = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`📡 Trying endpoint: ${endpoint}`);
          const response = await api.post(endpoint, visitorData);
          console.log(`✅ Success with endpoint ${endpoint}:`, response.data);
          success = true;
          responseData = response.data;
          break;
        } catch (error: any) {
          console.log(`❌ Failed with endpoint ${endpoint}:`, error.message);
          // Continue to next endpoint if this one fails
        }
      }

      if (success && responseData) {
        // Update visitor with the returned data (including generated code)
        if (responseData.data && responseData.data.code) {
          setVisitor(prev => ({
            ...prev,
            code: responseData.data.code,
            _id: responseData.data._id || prev._id
          }));
        }
        // Show success dialog
        setShowSuccessDialog(true);
        toast.success("Visitor record saved successfully!");
      } else {
        throw new Error("Failed to save visitor record to any endpoint");
      }
    } catch (error: any) {
      console.error('❌ Error saving visitor:', error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to save visitor record";
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDialogClose = () => {
    setShowSuccessDialog(false);
    // Redirect to visitor page
    router.push('/visitor');
  };

  const isFormValid = visitor.name.trim() !== '';

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-lg font-semibold">Visitor Management</h1>
      </header>
      <div className="flex-1 space-y-6 p-6 overflow-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Visitor Pass Generator</h1>
            <p className="text-muted-foreground">Create professional visitor passes with live photo capture</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Input Fields */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Visitor Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Visitor Name *</label>
                    <Input
                      placeholder="Visitor Name"
                      value={visitor.name}
                      onChange={(e) => updateVisitor('name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input
                      placeholder="Phone Number"
                      value={visitor.phone || ''}
                      onChange={(e) => updateVisitor('phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Purpose of Visit</label>
                    <Input
                      placeholder="Purpose of Visit"
                      value={visitor.purpose || ''}
                      onChange={(e) => updateVisitor('purpose', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time In (e.g., 10:30 AM)</label>
                    <Input
                      placeholder="Time In"
                      value={visitor.timeIn}
                      onChange={(e) => updateVisitor('timeIn', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company (Optional)</label>
                    <Input
                      placeholder="Company"
                      value={visitor.company || ''}
                      onChange={(e) => updateVisitor('company', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Host Name (Optional)</label>
                    <Input
                      placeholder="Host Name"
                      value={visitor.hostName || ''}
                      onChange={(e) => updateVisitor('hostName', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex gap-4">
              <Button
                onClick={saveVisitorRecord}
                disabled={!isFormValid || saving}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Record'}
              </Button>
            </div>
          </div>

          {/* Right Column - Camera */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Visitor Photo - Live Camera</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {/* Camera feed with same dimensions as pass photo */}
                  <div className="relative mx-auto bg-black rounded-full overflow-hidden border-4 border-gray-800"
                       style={{ width: '256px', height: '256px' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="object-cover w-full h-full"
                      style={{ transform: 'scaleX(-1)' }} // Mirror the video
                    />
                    {cameraActive && (
                      <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                        LIVE
                      </div>
                    )}
                    {!cameraActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                        <div className="text-center text-white">
                          <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Initializing camera...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Show captured photo if available */}
                  {visitor.photo && (
                    <div className="text-center pt-4">
                      <p className="text-sm text-muted-foreground mb-2">Captured Photo:</p>
                      <div className="w-24 h-24 mx-auto rounded-full border-4 border-gray-800 overflow-hidden">
                        <img
                          src={visitor.photo}
                          alt="Captured visitor photo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 justify-center pt-4">
                    <Button
                      onClick={capturePhoto}
                      disabled={!cameraActive}
                      className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Photo
                    </Button>
                    {visitor.photo && (
                      <Button
                        onClick={() => setVisitor(prev => ({ ...prev, photo: '' }))}
                        variant="outline"
                      >
                        Clear Photo
                      </Button>
                    )}
                  </div>
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visitor Record Saved</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Visitor record has been saved successfully!</p>
            <p className="mt-2">Click OK to return to the visitor list.</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleDialogClose}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .visitor-pass, .visitor-pass * {
            visibility: visible !important;
          }
          .visitor-pass {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 280px !important;
            margin: 0 0 10px 0 !important;
            page-break-inside: avoid !important;
            border: 2px solid gray !important;
            border-radius: 8px !important;
            background: white !important;
            box-shadow: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          /* Ensure the container takes full width */
          div[ref] {
            width: 100% !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </SidebarInset>
  );
}
