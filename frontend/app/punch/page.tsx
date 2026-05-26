"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Clock,
  Building2,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Timer,
  Camera,
  Upload
} from "lucide-react"

import api from "@/lib/apiClient"

// Define type for recent records
interface RecentRecord {
  _id?: string;
  employeeId: string;
  punchType: string;
  createdAt: string;
  imageUrl?: string;
}

export default function PunchPortal() {
  const {
    register,
    watch,
    reset,
    setValue,
    formState: { errors }
  } = useForm({ defaultValues: { empId: "" } })

  const [punchType, setPunchType] = useState<"IN" | "OUT">("IN")
  const [punchResult, setPunchResult] = useState<{
    type: "success" | "failure" | "info"
    message: string
  } | null>(null)
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [isPunching, setIsPunching] = useState(false);
  const [isCheckingId, setIsCheckingId] = useState(false);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Auto capture timer
  const autoCaptureTimerRef = useRef<NodeJS.Timeout | null>(null);

  const empIdInputRef = useRef<HTMLInputElement>(null)

  const empId = watch("empId")

  // Ref to track if a punch is currently in progress
  const isPunchInProgress = useRef(false);
  // Ref to track the last punch timestamp for debounce
  const lastPunchTimestamp = useRef(0);
  // Ref to track the scanner input timeout
  const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch recent records
  const fetchRecentRecords = useCallback(async () => {
    try {
      const res = await api.get("/punch/recent");
      setRecentRecords(res.data.data || []);
    } catch (error) {
      console.error("Error fetching recent records:", error);
      setRecentRecords([]); // Set to empty array on error
    }
  }, []);

  // Fetch recent records on component mount
  useEffect(() => {
    fetchRecentRecords();
  }, [fetchRecentRecords])

  // 🔄 Always keep the scanner input focused
  useEffect(() => {
    // focus after each render
    empIdInputRef.current?.focus()
  }, [])

  // Optional: also ensure focus every 2 s in case user tabs away
  useEffect(() => {
    const id = setInterval(() => empIdInputRef.current?.focus(), 2000)
    return () => clearInterval(id)
  }, [])

  // Automatically convert empId to uppercase
  useEffect(() => {
    if (typeof empId === "string" && empId !== empId.toUpperCase()) {
      setValue("empId", empId.toUpperCase(), { shouldValidate: true });
    }
  }, [empId, setValue]);

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);

        // Auto capture photo after 2 seconds
        if (autoCaptureTimerRef.current) {
          clearTimeout(autoCaptureTimerRef.current);
        }
        autoCaptureTimerRef.current = setTimeout(() => {
          capturePhoto();
        }, 2000);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setPunchResult({
        type: "failure",
        message: "Failed to access camera. Please check permissions."
      });
      setTimeout(() => setPunchResult(null), 3000);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);

    // Clear auto capture timer
    if (autoCaptureTimerRef.current) {
      clearTimeout(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
    }
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
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageDataUrl);
        stopCamera();

        console.log("Photo captured:");
        console.log("- Image data URL length:", imageDataUrl.length);
        console.log("- Image data URL starts with:", imageDataUrl.substring(0, 50) + "...");

        // Validate that this is a proper base64 image
        if (imageDataUrl.startsWith('data:image/')) {
          console.log("Image data URL format is correct");

          // Check if it contains actual image data
          const base64Part = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
          if (base64Part.length > 0) {
            console.log("Base64 data length:", base64Part.length);

            // Try to decode a small portion to check validity
            try {
              const sampleBuffer = Buffer.from(base64Part.substring(0, 100), 'base64');
              console.log("Sample buffer decoded successfully, length:", sampleBuffer.length);

              // Check for common image signatures
              const hexSignature = sampleBuffer.slice(0, 4).toString('hex');
              console.log("Image signature (first 4 bytes hex):", hexSignature);

              if (hexSignature.startsWith('ffd8')) {
                console.log("Detected JPEG image");
              } else if (hexSignature.startsWith('89504e47')) {
                console.log("Detected PNG image");
              } else {
                console.warn("Unrecognized image format signature");
              }
            } catch (decodeError: any) {
              console.error("Failed to decode base64 data:", decodeError.message);
            }
          } else {
            console.error("Base64 data is empty!");
          }
        } else {
          console.error("Image data URL format is incorrect!");
          console.error("Expected to start with 'data:image/', but got:", imageDataUrl.substring(0, 20));
        }

        // Auto submit punch after capturing photo
        if (empId && empId.length >= 5) {
          // Pass the captured image data directly to handlePunch
          handlePunch(empId, imageDataUrl);
        }

        // Auto hide camera after 3 seconds to ensure punch is sent
        setTimeout(() => {
          setShowCamera(false);
          setCapturedImage(null);
        }, 3000);
      } else {
        console.error("Failed to get canvas context for photo capture");
      }
    } else {
      console.error("Video or canvas element not available for photo capture");
    }
  };

  const handlePunch = async (id: string, capturedImageData?: string) => {
    console.log("handlePunch called with:", id, "punchType:", punchType);

    // Additional check to prevent multiple simultaneous punches
    if (isPunchInProgress.current) {
      console.log("Punch already in progress, ignoring duplicate request");
      return;
    }

    // Debounce check to prevent rapid successive scans
    const now = Date.now();
    if (now - lastPunchTimestamp.current < 1000) { // 1 second debounce
      console.log("Too fast, ignoring duplicate request");
      return;
    }
    lastPunchTimestamp.current = now;

    setPunchResult({ type: "info", message: "Processing..." })
    setIsPunching(true);
    isPunchInProgress.current = true; // Set the ref to true when starting punch

    try {
      // Prepare punch data
      const punchData: any = {
        employeeId: id,
        punchType
      };

      // Add image data if captured (only use the passed parameter, not state)
      if (capturedImageData) {
        punchData.base64Image = capturedImageData;
        console.log("Including image data in punch request:");
        console.log("- Image data length:", capturedImageData.length);
        console.log("- Image data preview:", capturedImageData.substring(0, 100) + "...");
      } else {
        console.log("No image data to include in punch request");
      }

      console.log("Sending punch request with data:", punchData);

      // Try employee punch first
      try {
        const punchResponse = await api.post("/punch/record", punchData);
        console.log("Employee punch response:", punchResponse);
        // Refresh recent records after successful punch
        await fetchRecentRecords();
        const data = punchResponse.data;
        setPunchResult({ type: "success", message: data.message })
      } catch (employeeError: any) {
        console.log("Employee punch failed, trying contractor punch:", employeeError);
        // If employee punch fails, try contractor punch
        if (employeeError.response?.status === 404) {
          try {
            // Get contractor details
            const contractorRes = await api.get(`/contractors/employee/${id}`);
            const contractorData = contractorRes.data.data;

            if (!contractorData) {
              throw new Error("Contractor not found");
            }

            // Make contractor punch
            const contractorPunchData = {
              contractorId: contractorData.contractor._id,
              contractorEmployeeId: id,
              employeeName: contractorData.contractor.name,
              punchType,
              base64Image: capturedImageData // Include image data for contractor punches too
            };

            console.log("Sending contractor punch request with data:", contractorPunchData);

            const punchResponse = await api.post("/punch/contractor", contractorPunchData);
            console.log("Contractor punch response:", punchResponse);

            // Refresh recent records after successful punch
            await fetchRecentRecords();
            const data = punchResponse.data;
            setPunchResult({ type: "success", message: data.message || data.data.message })
          } catch (contractorError: any) {
            console.error("Contractor punch error:", contractorError);
            throw contractorError;
          }
        } else {
          // Re-throw non-404 errors
          throw employeeError;
        }
      }

      // Store last punch info
      localStorage.setItem("lastPunch", JSON.stringify({ empId: id, punchType }))
      localStorage.setItem("lastPunchMeta", JSON.stringify({ empId: id, punchType, timestamp: Date.now() }))
    } catch (err: any) {
      console.error("Punch error:", err);
      // More specific error handling
      if (err.message && err.message.includes('Network Error')) {
        setPunchResult({ type: "failure", message: "Network error. Please check your internet connection and try again." })
      } else if (err.response && err.response.data && err.response.data.error) {
        setPunchResult({ type: "failure", message: err.response.data.error })
      } else if (err.response && err.response.data && err.response.data.message) {
        setPunchResult({ type: "failure", message: err.response.data.message })
      } else {
        setPunchResult({ type: "failure", message: "Server error. Please try again." })
      }
    } finally {
      setIsPunching(false);
      isPunchInProgress.current = false; // Set the ref to false when punch completes
      setTimeout(() => {
        reset()
        empIdInputRef.current?.focus()
      }, 100) // Small delay to ensure proper reset
      setTimeout(() => setPunchResult(null), 3000)
    }
  }

  // Function to check if ID exists in database
  const checkIdExists = async (id: string) => {
    try {
      // First try to find as employee
      const employeeRes = await api.get(`/employees/${id}`);
      if (employeeRes.data && (employeeRes.data.data || employeeRes.data._id)) {
        return { exists: true, type: 'employee' };
      }
    } catch (employeeError: any) {
      // If not found as employee, check if it's a contractor
      if (employeeError.response?.status === 404) {
        try {
          const contractorRes = await api.get(`/contractors/employee/${id}`);
          if (contractorRes.data && (contractorRes.data.data || contractorRes.data.contractor)) {
            return { exists: true, type: 'contractor' };
          }
        } catch (contractorError: any) {
          if (contractorError.response?.status === 404) {
            return { exists: false, type: null };
          }
          console.error("Contractor lookup error:", contractorError);
          throw contractorError;
        }
      } else {
        console.error("Employee lookup error:", employeeError);
        throw employeeError;
      }
    }
    return { exists: false, type: null };
  };

  // Function to process and validate ID from scanner input
  const processScannerInput = (input: string): { id: string; isValid: boolean; error?: string } => {
    // Trim whitespace and special characters
    const raw = input.trim();

    // Take only first 8 characters
    const id = raw.slice(0, 8);

    // Validate length
    if (id.length !== 8) {
      return {
        id: "",
        isValid: false,
        error: "Invalid ID format - must be exactly 8 characters"
      };
    }

    return { id, isValid: true };
  };

  // Auto trigger punch when ID reaches appropriate length (8 chars for standard IDs, or when user presses Enter)
  useEffect(() => {
    const safeEmpId = typeof empId === "string" ? empId : "";

    // Clear any existing scanner timeout
    if (scannerTimeoutRef.current) {
      clearTimeout(scannerTimeoutRef.current);
    }

    // Set a new timeout to debounce the scanner input
    scannerTimeoutRef.current = setTimeout(() => {
      // Process the input to handle scanner input correctly
      const processedInput = processScannerInput(safeEmpId);

      // Auto-trigger for standard 8-character IDs
      if (processedInput.isValid && !isPunchInProgress.current) {
        // Check if ID exists in database before triggering punch
        setIsCheckingId(true);
        checkIdExists(processedInput.id).then((result) => {
          if (result.exists) {
            console.log("Triggering handlePunch for:", processedInput.id);
            // Check localStorage for last punch
            const lastPunch = localStorage.getItem("lastPunch")
            if (lastPunch) {
              try {
                const { empId: lastEmpId, punchType: lastType } = JSON.parse(lastPunch)
                if (lastEmpId === processedInput.id) {
                  setPunchType(lastType === "IN" ? "OUT" : "IN")
                }
              } catch { }
            }

            // Auto show camera and start capture
            setShowCamera(true);
            startCamera();
          } else {
            // Show error for ID not found
            setPunchResult({
              type: "failure",
              message: "ID not found in database. Please check and try again."
            })
          }
        }).catch((error) => {
          console.error("Error checking ID:", error);
          setPunchResult({
            type: "failure",
            message: "Error validating ID. Please try again."
          })
        }).finally(() => {
          setIsCheckingId(false);
        });
      }
      // For invalid inputs, show error
      else if (!processedInput.isValid && safeEmpId.length >= 5 && !isPunchInProgress.current) {
        setPunchResult({
          type: "failure",
          message: processedInput.error || "Invalid ID format"
        });
        setTimeout(() => setPunchResult(null), 3000);
      }
    }, 100); // 100ms delay to allow full ID to be scanned

    // Cleanup timeout on unmount
    return () => {
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, [empId])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <SidebarInset>
      {/* Modern Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-semibold tracking-tight">Employee & Contractor Punch Portal</h1>
        </div>
        <div className="flex items-center gap-4">
          <CurrentTime />
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6">
        {/* Main Punch Card */}
        <div className="grid gap-6 md:grid-cols-1">
          {/* Punch Input Section */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-blue-600" />
                Punch {punchType}
              </CardTitle>
              <CardDescription>
                Enter your Employee ID or Contractor ID to punch in or out
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="space-y-4"
                onSubmit={async e => {
                  e.preventDefault();
                  const safeEmpId = typeof empId === "string" ? empId : "";

                  // Process the input to handle scanner input correctly
                  const processedInput = processScannerInput(safeEmpId);

                  // Allow submission only for valid IDs
                  if (processedInput.isValid && !isPunching && !isPunchInProgress.current) {
                    // Check if ID exists in database before submitting
                    try {
                      setIsCheckingId(true);
                      const result = await checkIdExists(processedInput.id);
                      if (result.exists) {
                        // Auto show camera and start capture
                        setShowCamera(true);
                        startCamera();
                      } else {
                        setPunchResult({
                          type: "failure",
                          message: "ID not found in database. Please check and try again."
                        });
                      }
                    } catch (error) {
                      console.error("Error checking ID:", error);
                      setPunchResult({
                        type: "failure",
                        message: "Error validating ID. Please try again."
                      });
                    } finally {
                      setIsCheckingId(false);
                    }
                  } else if (!processedInput.isValid) {
                    setPunchResult({
                      type: "failure",
                      message: processedInput.error || "Invalid ID format"
                    });
                    setTimeout(() => setPunchResult(null), 3000);
                  }
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="empId">Employee/Contractor ID</Label>
                  <div className="relative">
                    <Input
                      id="empId"
                      type="text"
                      maxLength={12} // Increased from 8 to 12 to accommodate longer contractor IDs
                      autoFocus
                      autoComplete="off"
                      className="text-lg text-center tracking-widest font-mono pr-10" // Add padding for spinner
                      {...register("empId")}
                      ref={e => {
                        register("empId").ref(e);
                        empIdInputRef.current = e;
                      }}
                      placeholder="A0000001 or C0000001"
                      aria-label="Employee or Contractor ID"
                      disabled={isPunching || isCheckingId} // Disable input when punching or checking
                    />
                    {(isPunching || isCheckingId) && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                  {errors.empId && <span className="text-red-600 text-xs">{errors.empId.message}</span>}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  // Enable button for any ID length (not just 8 characters)
                  disabled={isPunching || isCheckingId || (typeof empId === "string" ? empId.length < 5 : true)}
                >
                  {isPunching ? "Punching..." : isCheckingId ? "Checking ID..." : "Submit Punch"}
                </Button>
              </form>

              {/* Camera Section */}
              <div className="pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Capture Photo</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (showCamera) {
                        stopCamera();
                        setShowCamera(false);
                        setCapturedImage(null);
                      } else {
                        setShowCamera(true);
                        startCamera();
                      }
                    }}
                  >
                    {showCamera ? "Hide Camera" : "Show Camera"}
                  </Button>
                </div>

                {showCamera && (
                  <div className="mt-4 space-y-4">
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                      {!cameraActive && !capturedImage && (
                        <div className="text-white text-center">
                          <Camera className="h-8 w-8 mx-auto mb-2" />
                          <p>Initializing camera...</p>
                        </div>
                      )}

                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className={`${cameraActive ? 'block' : 'hidden'} w-full h-full object-cover`}
                      />

                      {capturedImage && (
                        <img
                          src={capturedImage}
                          alt="Captured"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex justify-center gap-2">
                      {!capturedImage ? (
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            Photo will be automatically captured in 2 seconds...
                          </p>
                          <Button
                            type="button"
                            onClick={capturePhoto}
                            disabled={!cameraActive}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Capture Now
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            Photo captured successfully!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                {/* Updated instructions to reflect that any valid ID format works */}
                Enter your Employee ID or Contractor ID and click Submit Punch. Punch type is automatically alternated. Minimum 5 minutes required between punches.
              </div>

              {/* Punch Result */}
              {punchResult && (
                <div className={`rounded-lg px-4 py-3 text-center font-medium shadow-sm transition-all duration-300 ${punchResult.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : punchResult.type === "failure"
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
                  }`}>
                  <div className="flex items-center justify-center gap-2">
                    {punchResult.type === "success" && <CheckCircle className="h-4 w-4" />}
                    {punchResult.type === "failure" && <XCircle className="h-4 w-4" />}
                    {punchResult.type === "info" && <AlertCircle className="h-4 w-4" />}
                    <span>
                      {punchResult.type === "success"
                        ? `Success: ${punchResult.message}`
                        : punchResult.type === "info"
                          ? punchResult.message
                          : punchResult.type === "failure"
                            ? punchResult.message.includes("Camera")
                              ? "Camera error. Please check your device camera and permissions."
                              : punchResult.message.includes("inactive")
                                ? "Access denied. Inactive user cannot punch."
                                : punchResult.message === "Missing fields"
                                  ? "Please enter a valid ID."
                                  : punchResult.message.includes("Invalid ID format")
                                    ? punchResult.message // Show the specific invalid ID format message
                                    : punchResult.message.includes("ID not found")
                                      ? punchResult.message // Show the specific ID not found message
                                      : punchResult.message.includes("Employee or contractor not found")
                                        ? "ID not found in database. Please check and try again."
                                        : punchResult.message
                            : punchResult.message}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Records Table */}
        <Card className="border-2 border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Recent Punches
            </CardTitle>
            <CardDescription>
              Your latest punch records and attendance history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-center font-semibold">Date</TableHead>
                  <TableHead className="text-center font-semibold">Time</TableHead>
                  <TableHead className="text-center font-semibold">Employee ID</TableHead>
                  <TableHead className="text-center font-semibold">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!recentRecords || recentRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No recent punches found
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRecords.map((rec, idx) => {
                    const dateObj = new Date(rec.createdAt);
                    const dateStr = dateObj.toLocaleDateString();
                    const timeStr = dateObj.toLocaleTimeString();
                    return (
                      <TableRow key={rec._id || idx} className={rec.punchType === 'LEAVE' ? 'bg-yellow-50' : 'hover:bg-blue-50'}>
                        <TableCell className="text-center font-medium">{dateStr}</TableCell>
                        <TableCell className="text-center font-mono">{timeStr}</TableCell>
                        <TableCell className="text-center font-mono">{rec.employeeId}</TableCell>
                        <TableCell className="text-center">
                          {rec.punchType === 'LEAVE' ? (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                              On Leave
                            </Badge>
                          ) : (
                            <Badge
                              variant={rec.punchType === 'IN' ? 'default' : 'outline'}
                              className={rec.punchType === 'IN'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                              }
                            >
                              {rec.punchType}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Hidden canvas for capturing photos */}
      <canvas ref={canvasRef} className="hidden" />
    </SidebarInset>
  )
}

// Live clock
function CurrentTime() {
  const [time, setTime] = React.useState("");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const tick = () => setTime(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return <span className="font-mono text-5xl md:text-6xl text-blue-700 block my-2 text-center select-none drop-shadow-lg">&nbsp;</span>;

  return (
    <span className="font-mono text-5xl md:text-6xl text-blue-700 block my-2 text-center select-none drop-shadow-lg">
      {time}
    </span>
  );
}