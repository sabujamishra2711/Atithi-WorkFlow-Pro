"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, ArrowLeft, Mail, CheckCircle } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import publicApi from '@/lib/publicApi'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1) // 1: Enter empId, 2: Enter OTP, 3: Reset password, 4: Success
  const [empId, setEmpId] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasEmail, setHasEmail] = useState(false)
  const [resetToken, setResetToken] = useState("")

  const handleEmpIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      // Just check if user exists and has email
      const response = await publicApi.post("/users/check-user", { empId })
      setHasEmail(response.data.data.hasEmail)
      
      if (!response.data.data.hasEmail) {
        toast.error("Please add email in profile")
        setIsLoading(false)
        return
      }
      
      // Automatically send OTP via email
      await publicApi.post("/users/forgot-password", { empId })
      toast.success("OTP sent to your email")
      setStep(2)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "User not found")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await publicApi.post("/users/verify-otp", { empId, otp })
      setResetToken(response.data.data.resetToken)
      setStep(3)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid OTP")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setIsLoading(true)
    try {
      await publicApi.post("/users/reset-password", { empId, resetToken, newPassword })
      setStep(4)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setIsLoading(true)
    try {
      await publicApi.post("/users/forgot-password", { empId })
      toast.success("OTP resent to your email")
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to resend OTP")
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Password Reset Successful</CardTitle>
              <CardDescription>Your password has been reset successfully</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                You can now sign in with your new password
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Back to Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/login"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-white rounded-lg border-2 border-[#8B0000] flex items-center justify-center overflow-hidden shadow-lg">
              <img 
                src="/atithi-logo.png" 
                alt="Atithi LLP Logo" 
                className="w-14 h-14 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <Building2 className="h-10 w-10 text-[#8B0000] hidden" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">WorkFlow Pro</h1>
          </div>
        </div>

        {/* Reset Password Card */}
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              {step === 1 && <Mail className="h-6 w-6 text-blue-600" />}
              {step === 2 && <Mail className="h-6 w-6 text-blue-600" />}
              {step === 3 && <Mail className="h-6 w-6 text-blue-600" />}
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === 1 && "Reset Password"}
              {step === 2 && "Verify OTP"}
              {step === 3 && "Reset Password"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Enter your employee ID to reset your password"}
              {step === 2 && "Enter the OTP sent to your email"}
              {step === 3 && "Enter your new password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <form onSubmit={handleEmpIdSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="empId">Employee ID</Label>
                  <Input
                    id="empId"
                    type="text"
                    placeholder="Enter your employee ID"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading || !empId}
                >
                  {isLoading ? "Sending..." : "Continue"}
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    className="h-11"
                    maxLength={6}
                  />
                  <p className="text-xs text-gray-500">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </Button>
                
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="h-9"
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    variant="link"
                    onClick={handleResendOtp}
                    className="h-9 text-blue-600"
                    disabled={isLoading}
                  >
                    Resend OTP
                  </Button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                
                {newPassword && newPassword.length < 6 && (
                  <p className="text-xs text-red-500">
                    Password must be at least 6 characters
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading || !newPassword || !confirmPassword}
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="w-full"
                  disabled={isLoading}
                >
                  Back
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{" "}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}