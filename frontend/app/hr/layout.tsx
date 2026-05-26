import type React from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { HRSidebar } from "@/components/hr-sidebar"
import RoleProtectedRoute from "@/components/RoleProtectedRoute"
import { LoadingOverlay } from "@/components/LoadingOverlay"

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProtectedRoute allowedRoles={["HR", "ADMIN"]}>
      <style>{`html, body {overflow-y: hidden !important;}`}</style>
      <div className="flex flex-col h-screen">
        {/* Main Content */}
        <div className="flex flex-1 max-h-full overflow-hidden">
          <SidebarProvider>
            <HRSidebar />
            <main className="flex-1 overflow-auto overflow-x-auto max-h-full">{children}</main>
            <LoadingOverlay />
          </SidebarProvider>
        </div>
      </div>
    </RoleProtectedRoute>
  )
}