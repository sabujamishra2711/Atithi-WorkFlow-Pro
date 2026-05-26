// lib/hooks/useAuth.ts
"use client"
import { useState, useEffect } from "react"

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("accessToken")
    const userRole = localStorage.getItem("role")
    const loginTime = localStorage.getItem("loginTime")
    const now = Date.now()
    if (token && userRole) {
      setIsAuthenticated(true)
      setRole(userRole)
      // Check for session expiry (3 hours)
      if (loginTime && now - parseInt(loginTime, 10) > 3 * 60 * 60 * 1000) {
        localStorage.clear()
        setIsAuthenticated(false)
        setRole(null)
        window.location.href = "/login"
      }
    }
    setLoading(false)
  }, [])

  return { isAuthenticated, role, loading }
}
