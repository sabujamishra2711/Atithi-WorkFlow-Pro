"use client"

import { useState, useEffect } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  BarChart3,
  Building2,
  Clock,
  DollarSign,
  FileText,
  Home,
  Settings,
  Users,
  LogOut,
  Headphones,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import api from "@/lib/apiClient"
import { useLoading } from "@/components/LoadingContext"
import { getUserProfile } from "@/utils/productionFixes"

const menuItems = [
  {
    title: "Dashboard",
    url: "/hr",
    icon: Home,
  },
  {
    title: "Employees",
    url: "/hr/employees",
    icon: Users,
    submenu: [
      { title: "All Employees", url: "/hr/employees" },
      { title: "Add Employee", url: "/hr/employees/add" },
      { title: "Employee Profiles", url: "/hr/employees/profiles" },
    ],
  },
  {
    title: "Attendance",
    url: "/hr/attendance",
    icon: Clock,
    submenu: [
      { title: "Daily Attendance", url: "/hr/attendance" },
      { title: "Manual Attendance", url: "/hr/manual-attendance" },
      { title: "Monthly Reports", url: "/hr/attendance/monthly" },
      { title: "Manual Monthly Attendance", url: "/hr/attendance/monthly/manual" },
      {
        title: "Contractor Daily Attendance",
        url: "/hr/attendance/contractor/daily"
      },
      {
        title: "Contractor Manual Attendance",
        url: "/hr/attendance/contractor/manual"
      },
      {
        title: "Contractor Monthly Reports",
        url: "/hr/attendance/contractor/monthly"
      },
      {
        title: "Contractor Manual Monthly",
        url: "/hr/attendance/contractor/monthly/manual"
      },
    ],
  },
  {
    title: "Payroll",
    url: "/hr/payroll",
    icon: DollarSign,
    submenu: [
      { title: "Payroll Dashboard", url: "/hr/payroll" },
      { title: "Deductions", url: "/hr/deductions" },
    ],
  },
  {
    title: "Leave Management",
    url: "/hr/leaves",
    icon: FileText,
    submenu: [
      { title: "Leave Dashboard", url: "/hr/leaves" },
      { title: "Leave Allocation", url: "/hr/leaves/allocation" },
      { title: "Leave Applications", url: "/hr/leaves/applications" },
      { title: "All Applications", url: "/hr/leaves/all-applications" },
      { title: "Leave Balance", url: "/hr/leaves/balance" },
      { title: "Leave Policy", url: "/hr/leaves/policy" },
      { title: "Paid Holidays", url: "/hr/holidays" },
    ],
  },
  {
    title: "Contractors",
    url: "/hr/contractors",
    icon: Users,
    submenu: [
      { title: "Manage Contractors", url: "/hr/contractors" },
    ],
  },
  {
    title: "Visitors",
    url: "/hr/visitors",
    icon: Users,
    submenu: [
      { title: "Visitor Records", url: "/hr/visitors" },
    ],
  },
  {
    title: "Reports",
    url: "/hr/reports",
    icon: FileText,
  },
  {
    title: "Settings",
    url: "/hr/settings",
    icon: Settings,
  },
  {
    title: "Support",
    url: "/support",
    icon: Headphones,
  },
]

export function HRSidebar() {
  const pathname = usePathname()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const { setLoading } = useLoading()

  const handleToggle = (title: string) => {
    setOpenMenu((prev) => (prev === title ? null : title))
  }

  useEffect(() => {
    async function fetchUser() {
      try {
        // Try the production-safe method first
        const result = await getUserProfile()
        if (result.success && result.data) {
          setUser(result.data)
        } else {
          // Fallback to axios method
          const res = await api.get("/users/me")
          setUser(res.data.data)
        }
      } catch (err) {
        console.error('Error fetching user info:', err)
        // Try to get user info from localStorage as fallback
        try {
          const storedUser = localStorage.getItem('user')
          if (storedUser) {
            setUser(JSON.parse(storedUser))
          } else {
            setUser(null)
          }
        } catch (parseErr) {
          console.error('Error parsing stored user:', parseErr)
          setUser(null)
        }
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    try {
      await api.post("/users/logout")
    } catch { }
    localStorage.clear()
    router.replace("/login")
  }

  const handleLinkClick = (url: string) => {
    // Don't navigate if already on the same page
    if (url === pathname) {
      console.log('Already on the same page:', url)
      return
    }

    console.log('Navigating to:', url)

    // Set loading state with a small delay to ensure it's visible
    setTimeout(() => {
      setLoading(true)
    }, 50)
  }

  return (
    <Sidebar collapsible="none">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/hr" onClick={() => handleLinkClick("/hr")}>
                <div className="flex aspect-square size-10 items-center justify-center bg-white border border-gray-200 overflow-hidden rounded-lg shadow-sm">
                  <img
                    src="/atithi-logo.png"
                    alt="Atithi LLP Logo"
                    className="size-8 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <Building2 className="size-4 text-blue-600 hidden" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Atithi LLP</span>
                  <span className="truncate text-xs">HR Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname.startsWith(item.url)
                const isOpen = openMenu === item.title

                return (
                  <SidebarMenuItem key={item.title}>
                    {item.submenu ? (
                      <>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => handleToggle(item.title)}
                          className={isOpen ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>

                        {isOpen && (
                          <SidebarMenuSub>
                            {item.submenu.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === subItem.url}
                                >
                                  <Link href={subItem.url} onClick={() => handleLinkClick(subItem.url)}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        )}
                      </>
                    ) : (
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <Link href={item.url} onClick={() => handleLinkClick(item.url)}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm w-full">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user?.profileImageUrl || "/placeholder.svg?height=32&width=32"} alt={user?.firstName || "User"} />
                <AvatarFallback className="rounded-lg">{user?.firstName?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user ? `${user.firstName} ${user.lastName}` : "..."}</span>
                <span className="truncate text-xs">{user?.position || user?.role || "-"}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout} title="Logout">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
