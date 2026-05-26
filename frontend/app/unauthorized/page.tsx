"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-800 px-4 text-center">
      <AlertTriangle size={64} className="text-red-500 mb-4" />
      <h1 className="text-4xl font-bold mb-2">403 - Unauthorized</h1>
      <p className="text-lg mb-6">
        You do not have permission to access this page.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => router.back()} variant="outline">
          Go Back
        </Button>
        <Button onClick={() => router.push("/login")}>
          Login with Different Account
        </Button>
      </div>
    </div>
  )
}
