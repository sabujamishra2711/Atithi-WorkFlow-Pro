"use client"

import { useAuth } from "@/lib/hooks/useAuth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

const roleRedirects: Record<string, string> = {
  admin: "/admin",
  hr: "/hr",
  employee: "/employee",
}

export default function RoleProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: string[]
  children: React.ReactNode
}) {
  const { isAuthenticated, role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!isAuthenticated) {
      router.push("/login")
    } else if (!allowedRoles.includes(role || "")) {
      // 🚀 Redirect to the correct dashboard based on role
      if (role && roleRedirects[role]) {
        router.push(roleRedirects[role])
      } else {
        router.push("/unauthorized")
      }
    }
  }, [isAuthenticated, role, loading, allowedRoles, router])

  if (loading) return <div>Loading...</div>

  return <>{children}</>
}
