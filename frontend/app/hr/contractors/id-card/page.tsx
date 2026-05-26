"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import html2canvas from "html2canvas"
import api from "@/lib/apiClient"


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Download, ArrowLeft, Building2, Users, IdCard, CreditCard, Printer } from "lucide-react"
import Barcode from 'react-barcode'
import PDFHeader from "@/components/pdf-header"

interface Contractor {
  _id: string;
  name: string;
  contractorNo: string;
  phoneNo: string;
  numEmployees: number;
  contractorIds: string[];
  createdAt: string;
}

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

// --- Contractor ID Card Front ---
const ContractorIDCardFront = ({ contractor, employeeNumber, contractorId }: {
  contractor: Contractor;
  employeeNumber: number;
  contractorId: string;
}) => {
  return (
    <div className="idcard-font relative w-[1572px] h-[2490px] overflow-hidden shadow-2xl"
      style={{
        backgroundImage: 'url(/images/id-contra-front.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'left',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Logo */}
      <div className="absolute left-[49.845%] top-[320px] -translate-x-1/2">
        <div className="w-[570px] flex items-center justify-center">
          <img src={"/atithi-logo.png"} alt="Profile" className="w-full h-full object-cover" />
        </div>
      </div>
      {/* Contractor Name */}
      <div className="absolute left-[52%] top-[1200px] -translate-x-1/2 flex flex-row items-left text-[75px] font-bold whitespace-nowrap">
        <span className="font-extrabold uppercase tracking-wide">{contractor.name}</span>
      </div>
      {/* Details */}
      <div className="absolute left-[28%] top-[1500px] text-[60px]">
        <div className="flex items-center mb-5">
          <span className="font-semibold">Phone No:</span>&nbsp;{contractor.phoneNo}
        </div>
        <div className="flex items-center mb-6">
          <span className="font-semibold">Contractor ID:</span>&nbsp;{contractorId}
        </div>
        <div className="flex items-center">
          <span className="font-semibold">Employee:</span>&nbsp;{employeeNumber} of {contractor.numEmployees}
        </div>
      </div>
      {/* Barcode */}
      <div className="absolute left-1/2 bottom-[180px] -translate-x-1/2 flex flex-col items-center">
        <div className="bg-transparent">
          <Barcode value={contractorId} height={240} width={7.2} fontSize={10} displayValue={false} />
        </div>
      </div>
    </div>
  );
};

// --- Contractor ID Card Back ---
const ContractorIDCardBack = ({ contractor }: { contractor: Contractor }) => (
  <div className="idcard-font relative w-[1572px] h-[2490px] overflow-hidden shadow-2xl flex flex-col justify-between"
    style={{
      backgroundImage: 'url(/images/id-card-contractor-back.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}
  >
    {/* Back side content can be added here */}
  </div>
);

export default function ContractorIDCardPage() {
  // Use query parameters instead of route parameters
  const searchParams = useSearchParams()
  const contractorId = searchParams.get('contractorId')
  
  const [contractor, setContractor] = useState<Contractor | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBack, setShowBack] = useState(false)
  const [currentEmployeeIndex, setCurrentEmployeeIndex] = useState(0)

  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchContractor() {
      if (!contractorId) {
        setError("No contractor ID provided in query parameters")
        setLoading(false)
        return;
      }
      
      try {
        setLoading(true)
        const res = await api.get(`/contractors/${contractorId}`)

        // Handle ApiResponse structure from backend
        let contractorData = null;
        if (res.data && res.data.data) {
          contractorData = res.data.data
        } else if (res.data) {
          // Handle direct response
          contractorData = res.data
        }
        
        if (contractorData) {
          // Ensure all required fields are present with fallback values
          const safeContractorData = {
            _id: contractorData._id || '',
            name: contractorData.name || 'Unknown Contractor',
            contractorNo: contractorData.contractorNo || 'N/A',
            phoneNo: contractorData.phoneNo || 'N/A',
            numEmployees: contractorData.numEmployees || 1,
            contractorIds: Array.isArray(contractorData.contractorIds) ? contractorData.contractorIds : [],
            createdAt: contractorData.createdAt || new Date().toISOString()
          };
          
          setContractor(safeContractorData);
        } else {
          setError("Invalid contractor data received")
        }
      } catch (err: any) {
        console.error('Error fetching contractor:', err)
        setError(err.response?.data?.message || err.response?.data?.error || err.message || 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (contractorId) {
      fetchContractor()
    }
  }, [contractorId])

  const handleDownload = async () => {
    if (!frontRef.current || !backRef.current || !contractor) return;
    setDownloading(true);
    try {
      const frontCanvas = await html2canvas(frontRef.current, { backgroundColor: null, scale: 4, useCORS: true, allowTaint: true });
      const backCanvas = await html2canvas(backRef.current, { backgroundColor: null, scale: 4, useCORS: true, allowTaint: true });

      // Safely generate contractor ID with null checks
      const contractorName = contractor?.name || 'UNKNOWN';
      const contractorIds = Array.isArray(contractor?.contractorIds) ? contractor.contractorIds : [];
      
      // Generate fallback ID if contractorIds array is empty or index is out of bounds
      let currentContractorId = '';
      if (contractorIds.length > currentEmployeeIndex) {
        currentContractorId = contractorIds[currentEmployeeIndex];
      } else {
        // Generate a fallback ID using the contractor name and employee index
        const namePrefix = contractorName.substring(0, 3).toUpperCase();
        currentContractorId = `${namePrefix}${String(currentEmployeeIndex + 1).padStart(5, '0')}`;
      }

      const linkFront = document.createElement('a');
      linkFront.download = `id_card_front_${currentContractorId}.png`;
      linkFront.href = frontCanvas.toDataURL('image/png');
      linkFront.click();

      const linkBack = document.createElement('a');
      linkBack.download = `id_card_back_${currentContractorId}.png`;
      linkBack.href = backCanvas.toDataURL('image/png');
      linkBack.click();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download ID cards. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">
          
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Loading...</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B0000] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading contractor information...</p>
          </div>
        </div>
      </SidebarInset>
    )
  }

  if (error || !contractor) {
    return (
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">
          
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Contractor Not Found</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Contractor Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The requested contractor does not exist.'}</p>
            <Button asChild className="bg-[#8B0000] text-[#FFF9E3] hover:bg-[#a80000]">
              <Link href="/hr/contractors">Back to Contractors</Link>
            </Button>
          </div>
        </div>
      </SidebarInset>
    )
  }

  // Safely generate contractor ID with null checks
  const contractorName = contractor?.name || 'UNKNOWN';
  const contractorNo = contractor?.contractorNo || 'N/A';
  const contractorPhone = contractor?.phoneNo || 'N/A';
  const contractorIds = Array.isArray(contractor?.contractorIds) ? contractor.contractorIds : [];
  const numEmployees = contractor?.numEmployees || 1;
  
  // Generate fallback ID if contractorIds array is empty or index is out of bounds
  let currentContractorId = '';
  if (contractorIds.length > currentEmployeeIndex) {
    currentContractorId = contractorIds[currentEmployeeIndex];
  } else {
    // Generate a fallback ID using the contractor name and employee index
    const namePrefix = contractorName.substring(0, 3).toUpperCase();
    currentContractorId = `${namePrefix}${String(currentEmployeeIndex + 1).padStart(5, '0')}`;
  }

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-2 border-b px-4">
        
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Link href="/hr/contractors" className="flex items-center text-blue-600">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Link>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">ID Card Generator</h1>
      </header>

      <div className="flex-1 space-y-6 p-6">
        <div className="flex justify-between">
          <div>
            <h2 className="text-2xl font-bold">Contractor ID Cards</h2>
            <p className="text-muted-foreground">For {contractorName} - Employee {currentEmployeeIndex + 1} of {numEmployees}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBack(!showBack)}>
              <CreditCard className="h-4 w-4 mr-1" />
              {showBack ? "Show Front" : "Show Back"}
            </Button>
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <span className="flex items-center"><span className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full mr-2"></span>Frontend...</span>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download </>
              )}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contractor Information</CardTitle>
            <CardDescription>Details used in the ID cards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
              <div><label>Contractor Name</label><p>{contractorName}</p></div>
              <div><label>Contractor Number</label><p>{contractorNo}</p></div>
              <div><label>Phone Number</label><p>{contractorPhone}</p></div>
              <div><label>Contractor ID</label><p>{currentContractorId}</p></div>
              <div><label>Employee Number</label><p>{currentEmployeeIndex + 1} of {numEmployees}</p></div>
              <div><label>Created Date</label><p>{formatDate(contractor?.createdAt || '')}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Navigation */}
        {numEmployees > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Employee Navigation</CardTitle>
              <CardDescription>Preview different contractor employee cards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: numEmployees }, (_, i) => (
                  <Button
                    key={i}
                    variant={currentEmployeeIndex === i ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentEmployeeIndex(i)}
                  >
                    Employee {i + 1}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visible Card */}
        <div className="printable flex justify-center">
          {showBack ? (
            <ContractorIDCardBack contractor={contractor} />
          ) : (
            <ContractorIDCardFront
              contractor={contractor}
              employeeNumber={currentEmployeeIndex + 1}
              contractorId={currentContractorId}
            />
          )}
        </div>

        {/* Offscreen Card for PDF generation */}
        <div className="absolute left-[-9999px] top-0">
          <div ref={frontRef}>
            <ContractorIDCardFront
              contractor={contractor}
              employeeNumber={currentEmployeeIndex + 1}
              contractorId={currentContractorId}
            />
          </div>
          <div ref={backRef}>
            <ContractorIDCardBack contractor={contractor} />
          </div>
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