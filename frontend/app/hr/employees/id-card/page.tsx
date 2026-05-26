"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import api from "@/lib/apiClient"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import ProfileImageUpload from "@/components/ProfileImageUpload";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Download, Printer, ArrowLeft, CreditCard } from "lucide-react"
import Barcode from 'react-barcode';
import PDFHeader from "@/components/pdf-header";

// Utility to format date as DD-MM-YYYY
function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

// --- ID Card Front ---
const IDCardFront = ({ employee }: { employee: any }) => {
  const firstName = employee.firstName || '';
  const lastName = employee.lastName || '';
  return (
    <div className="idcard-font relative w-[1572px] h-[2490px] overflow-hidden shadow-2xl"
      style={{
        backgroundImage: 'url(/images/id-card-front.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'left',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Profile image */}
      <div className="absolute left-[49.845%] top-[877px] -translate-x-1/2">
        <div className="w-[570px] h-[570px] rounded-full bg-[#D9D9D9] overflow-hidden flex items-center justify-center">
          {/* Profile image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={employee.profileImage ? employee.profileImage : "/placeholder-user.jpg"}
            alt="Profile"
            className="w-full h-full object-cover"
          />
          {console.log("IDCardFront image src:", employee.profileImage ? employee.profileImage : "/placeholder-user.jpg")}
        </div>
      </div>
      {/* Name */}
      <div className="absolute left-[52%] top-[1455px] -translate-x-1/2 flex flex-row items-left text-[75px] font-bold whitespace-nowrap">
        <span className="font-extrabold uppercase tracking-wide">{firstName}</span>
        {lastName && <span className="font-normal ml-2 uppercase tracking-wide">{lastName}</span>}
      </div>
      {/* Details */}
      <div className="absolute left-[28%] top-[1650px] text-[60px]">
        <div className="flex items-center mb-5">
          <span className="font-semibold">Department:</span>&nbsp;{employee.department || ''}
        </div>
        <div className="flex items-center mb-5">
          <span className="font-semibold">Designation:</span>&nbsp;{employee.designation || employee.position || ''}
        </div>
        <div className="flex items-center mb-6">
          <span className="font-semibold">Employee ID:</span>&nbsp;{employee.empId}
        </div>
        <div className="flex items-center">
          <span className="font-semibold">Joining Date:</span>&nbsp;{formatDate(employee.joiningDate)}
        </div>
      </div>
      {/* Barcode */}
      <div className="absolute left-1/2 bottom-[130px] -translate-x-1/2 flex flex-col items-center">
        <div className="bg-transparent">
          <Barcode value={employee.empId} height={240} width={7.2} fontSize={10} displayValue={false} />
        </div>
      </div>
    </div>
  );
};

// --- ID Card Back ---
const IDCardBack = ({ employee }: { employee: any }) => {
  const emergencyContacts = employee?.emergencyContacts || [];
  return (
  <div className="idcard-font relative w-[1572px] h-[2490px] overflow-hidden shadow-2xl flex flex-col justify-between"
    style={{
      backgroundImage: 'url(/images/id-card-back.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}
  >

    <div className="absolute bottom-[300px] right-[80px] text-white text-7xl">
      {emergencyContacts.length > 0 ? (
        emergencyContacts.map((contact: any, index: number) => (
          <p key={index} className="mb-2">
            {contact.mobile}
          </p>
        ))
      ) : (
        <p>N/A.</p>
      )}
    </div>
  </div>
  );
};

export default function IDCardPage() {
  // Use query parameters instead of route parameters
  const searchParams = useSearchParams()
  const empId = searchParams.get('empId')
  
  const [employee, setEmployee] = useState<any>(null)
  const [showBack, setShowBack] = useState(false)
  const [downloading, setDownloading] = useState(false);

  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchEmployee() {
      if (!empId) {
        console.error("No employee ID provided in query parameters")
        return;
      }
      
      try {
        const res = await api.get(`/employees/${empId}`)
        setEmployee(res.data)
      } catch (err) {
        console.error("Error fetching employee:", err)
      }
    }
    fetchEmployee()
  }, [empId])

  const handleDownload = async () => {
    if (!frontRef.current || !backRef.current) return;
    setDownloading(true);
    try {
      const frontCanvas = await html2canvas(frontRef.current, { backgroundColor: null, scale: 4, useCORS: true, allowTaint: true });
      const backCanvas = await html2canvas(backRef.current, { backgroundColor: null, scale: 4, useCORS: true, allowTaint: true });

      const linkFront = document.createElement('a');
      linkFront.download = `id_card_front_${employee.empId}.png`;
      linkFront.href = frontCanvas.toDataURL('image/png');
      linkFront.click();

      const linkBack = document.createElement('a');
      linkBack.download = `id_card_back_${employee.empId}.png`;
      linkBack.href = backCanvas.toDataURL('image/png');
      linkBack.click();
    } finally {
      setDownloading(false);
    }
  }

  if (!employee) {
    return (
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">
          
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Employee Not Found</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Employee Not Found</h2>
            <p className="text-gray-600 mb-4">The requested employee ID does not exist.</p>
            <Button asChild><Link href="/hr/employees">Back to Employees</Link></Button>
          </div>
        </div>
      </SidebarInset>
    )
  }

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-2 border-b px-4">
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Link href="/hr/employees/profiles" className="flex items-center text-blue-600">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Link>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">ID Card Generator</h1>
      </header>

      <div className="flex-1 space-y-6 p-6">
        <div className="flex justify-between">
          <div>
            <h2 className="text-2xl font-bold">Employee ID Card</h2>
            <p className="text-muted-foreground">For {employee.fullName}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBack(!showBack)}>
              <CreditCard className="h-4 w-4 mr-1" />
              {showBack ? "Show Front" : "Show Back"}
            </Button>
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <span className="flex items-center"><span className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full mr-2"></span>Downloading...</span>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download</>
              )}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
            <CardDescription>Details used in the ID card</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
              <div><label>Name</label><p>{employee.firstName} {employee.lastName}</p></div>
              <div><label>Designation</label><p>{employee.designation || employee.position || ''}</p></div>
              <div><label>Employee ID</label><p>{employee.empId}</p></div>
              <div><label>Joining Date</label><p>{formatDate(employee.joiningDate)}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Visible Card */}
        <div className="printable flex justify-center">
          {showBack ? <IDCardBack employee={employee} /> : <IDCardFront employee={employee} />}
        </div>

        {/* Offscreen Card for PDF generation */}
        <div className="absolute left-[-9999px] top-0">
          <div ref={frontRef}><IDCardFront employee={employee} /></div>
          <div ref={backRef}><IDCardBack employee={employee} /></div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .printable, .printable * {
            visibility: visible !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
          }
          @page {
            size: auto;
            margin: 0;
          }
        }
      `}</style>
    </SidebarInset>
  )
}