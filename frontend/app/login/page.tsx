"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import toast from "react-hot-toast"
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import api from "@/lib/apiClient"

function LoginContent() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    empId: "",
    password: "",
    rememberMe: false,
  })
  const [errorMsg, setErrorMsg] = useState("")
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthenticated, loading: authLoading, role: userRole } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (userRole === "ADMIN" || userRole === "HR") {
        router.replace("/hr")
      } else {
        router.replace("/")
      }
    }
  }, [authLoading, isAuthenticated, userRole, router])

  if (authLoading || isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Checking authentication...</div>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg("")

    try {
      const response = await api.post("/users/login", {
        empId: formData.empId,
        password: formData.password,
      })

      toast.success("Login successful")

      localStorage.setItem("accessToken", response.data.data.accessToken)
      localStorage.setItem("refreshToken", response.data.data.refreshToken)
      localStorage.setItem("empId", response.data.data.user.empId)
      localStorage.setItem("role", response.data.data.user.role)
      localStorage.setItem("loginTime", Date.now().toString())

      setTimeout(() => {
        const role = localStorage.getItem("role")
        if (role === "ADMIN" || role === "HR") {
          router.push("/hr")
        } else {
          setErrorMsg("Access denied: Only HR and Admin roles are allowed.")
          toast.error("Access denied: Only HR and Admin roles are allowed.")
        }
      }, 500)
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Login failed"
      toast.error(msg)
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex flex-col items-center justify-center space-y-4 mb-6">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
              <img src="/atithi-logo.png" alt="Atithi LLP Logo" className="w-16 h-16 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Work Flow Pro</h1>
              <p className="text-sm text-gray-500 font-medium">Enterprise Management System</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">Enter your credentials to access your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="empId">Employee ID or Username</Label>
                <Input
                  id="empId"
                  type="text"
                  placeholder="Enter your Employee ID"
                  value={formData.empId}
                  onChange={(e) => handleInputChange("empId", e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {errorMsg && <div className="text-red-600 text-sm text-center mt-2 font-medium">{errorMsg}</div>}

              <Button
                type="submit"
                className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white transition-colors"
                disabled={isLoading || !formData.empId || !formData.password}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>

              <div className="text-center mt-4">
                <Link href="/forgot-password" disabled className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Forgot Password?
                </Link>
              </div>
            </form>

            <div className="flex items-center mt-6">
              <Checkbox
                id="rememberMe"
                checked={formData.rememberMe}
                onCheckedChange={(value) => handleInputChange("rememberMe", !!value)}
              />
              <Label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600">
                Remember me for 30 days
              </Label>
            </div>

            <div className="mt-8 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Support Resources</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/support"
                  className="text-sm text-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-md border border-gray-100 hover:bg-gray-50"
                >
                  Contact Support
                </Link>
                <Link
                  href="/support/new-user"
                  className="text-sm text-center text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-md border border-gray-100 hover:bg-gray-50"
                >
                  New User Setup
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Atithi Paper LLP. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
