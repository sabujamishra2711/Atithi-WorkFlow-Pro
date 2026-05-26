"use client"

import { useLoading } from "./LoadingContext"
import { Loader2 } from "lucide-react"

export function LoadingOverlay() {
  const { loading } = useLoading()

  if (!loading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600 mb-4" />
        <span className="text-lg font-semibold text-blue-700">Loading...</span>
        <span className="text-sm text-gray-600 mt-2">Please wait while we load the page</span>
      </div>
    </div>
  )
} 