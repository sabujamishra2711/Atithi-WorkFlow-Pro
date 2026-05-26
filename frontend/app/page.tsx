"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Clock, Shield, Users, Loader2, FileText, Headphones, Phone, Mail } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"

const Index = () => {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Reset loading state when component mounts or pathname changes
    setLoading(false)
  }, [pathname])

  const handleCardClick = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Set a timeout to reset loading state after 3 seconds
    setTimeout(() => {
        setLoading(false)
    }, 3000)
    
    router.push(href)
  }

  const loginOptions = [
    {
      title: "HR Portal",
      description: "Access employee management, payroll, and HR analytics",
      icon: Users,
      href: "/login?role=hr",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Punch In/Out",
      description: "Quick time tracking and attendance management",
      icon: Clock,
      href: "/punch",
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Visitor Portal",
      description: "Security entry for visitors",
      icon: Shield,
      href: "/visitor",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="relative border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Atithi Paper LLP Logo - Added by AI for homepage enhancement */}
              <div className="p-2 bg-white flex items-center justify-center overflow-hidden shadow-lg rounded-lg">
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
                <div className="hidden text-2xl font-bold text-gray-700">A</div>
              </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    WorkFlow Pro
                  </h1>
                  {/* Software name + tagline - Added by AI for homepage enhancement */}
                  <p className="text-sm text-gray-500 font-medium">Built by MS Coders for Atithi Paper LLP</p>
                </div>
            </div>
            <nav className="hidden md:flex items-center space-x-4">
              {/* Contact Button - Added by AI for homepage enhancement */}
              <Link href="https://ms-coders.web.app/contact" aria-label="Contact page" className="text-gray-600 hover:text-gray-900 transition-all duration-300 font-medium hover:scale-105 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact
              </Link>
              {/* Support Button - Added by AI for homepage enhancement */}
              <Link href="/support" passHref>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Headphones className="w-4 h-4" />
                  Support
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Access Points - Moved to top for better visibility */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Access Point</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Select the appropriate portal based on your role and responsibilities within the organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {loginOptions.map((option, index) => {
              const IconComponent = option.icon

              return (
                <div 
                  key={index} 
                  onClick={handleCardClick(option.href)} 
                  className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white cursor-pointer border border-gray-100"
                >
                  <div className={`absolute inset-0 bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                  
                  <div className="p-8 text-center relative z-10">
                    <div className={`w-24 h-24 rounded-2xl ${option.bgColor} flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-all duration-300 shadow-sm mx-auto`}>
                      <IconComponent className={`h-12 w-12 ${option.iconColor}`} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4 transition-colors">
                      {option.title}
                    </h3>
                    <p className="text-gray-600 text-base leading-relaxed">
                      {option.description}
                    </p>
                    <div className="mt-6">
                      <Button 
                        variant="default" 
                        size="lg" 
                        className="bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
                      >
                        Access Portal
                        <span className="ml-2">→</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Key Service Highlights - Moved below main access points */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Why WorkFlow Pro?</h3>
            <p className="text-gray-600">Trusted by Atithi Paper LLP for seamless operations</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 mb-8">
            <div className="flex items-center space-x-2 bg-white px-6 py-3 rounded-full shadow-sm">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium">99.9% Uptime</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-6 py-3 rounded-full shadow-sm">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="font-medium">Enterprise Security</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-6 py-3 rounded-full shadow-sm">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="font-medium">24/7 Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Help Section - Need Assistance - Added by AI for homepage enhancement */}
      <section className="py-20 px-4 bg-white border-t border-gray-100">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Need Assistance?</h3>
          <p className="text-gray-600 mb-12 max-w-2xl mx-auto">
            We're here to help you get the most out of your workspace experience.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div 
              className="group text-center p-8 rounded-2xl bg-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-gray-50"
              onClick={() => router.push('/documentation')}
            >
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors duration-300">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-900 mb-3 text-lg">User Documentation</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Comprehensive guide to using all features of the HRMS system.
              </p>
            </div>

            <div 
              className="group text-center p-8 rounded-2xl bg-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-gray-50"
              onClick={() => router.push('/support/new-user')}
            >
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors duration-300">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-900 mb-3 text-lg">New User Setup</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Contact your system administrator for account creation and initial configuration.
              </p>
            </div>

            <div 
              className="group text-center p-8 rounded-2xl bg-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-gray-50"
              onClick={() => router.push('/support/account-recovery')}
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-emerald-200 transition-colors duration-300">
                <Shield className="h-8 w-8 text-emerald-600" />
              </div>
              <h4 className="font-bold text-gray-900 mb-3 text-lg">Account Recovery</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                Use the password reset feature or contact support for account recovery assistance.
              </p>
            </div>

            <div 
              className="group text-center p-8 rounded-2xl bg-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-gray-50"
              onClick={() => router.push('/support/technical-support')}
            >
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-200 transition-colors duration-300">
                <Building2 className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="font-bold text-gray-900 mb-3 text-lg">Technical Support</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                24/7 technical support for system issues, bugs, and performance optimization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Added by AI for homepage enhancement */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="flex items-center space-x-4 mb-6 md:mb-0">
              <div className="p-2 bg-white rounded-lg">
                <img 
                    src="/atithi-logo.png" 
                    alt="Atithi LLP Logo" 
                    className="w-14 h-14 object-contain"
                  />
              </div>
              <div>
                <span className="text-2xl font-bold">WorkFlow Pro</span>
                <p className="text-sm text-gray-400">Built for Atithi Paper LLP</p>
              </div>
            </div>
            <div className="flex space-x-8 text-sm">
              <Link href="/privacy" className="hover:text-gray-300 transition-colors duration-300 font-medium">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-gray-300 transition-colors duration-300 font-medium">
                Terms of Service
              </Link>
              <Link href="/help" className="hover:text-gray-300 transition-colors duration-300 font-medium">
                Help Center
              </Link>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Atithi WorkFlow Pro
            </p>
          </div>
        </div>
      </footer>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <Loader2 className="animate-spin h-12 w-12 text-blue-600 mb-4" />
            <span className="text-lg font-semibold text-blue-700">Loading...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Index