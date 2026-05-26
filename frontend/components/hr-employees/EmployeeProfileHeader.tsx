import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStatusBadge } from "@/components/hr-employees/utils";
import { Loader2 } from "lucide-react"; // Add this import

interface EmployeeProfileHeaderProps {
  selectedEmployee: any;
  getProfileImageUrl: (employee: any) => string;
  generateBioDataPDF: () => void;
  isGeneratingPDF?: boolean; // Add this prop
}

export function EmployeeProfileHeader({
  selectedEmployee,
  getProfileImageUrl,
  generateBioDataPDF,
  isGeneratingPDF = false // Add this prop with default value
}: EmployeeProfileHeaderProps) {
  // Add safety checks
  if (!selectedEmployee) {
    return (
      <div className="flex justify-center mb-6">
        <Card className="w-full max-w-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg">
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <p>No employee selected</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safe access to employee properties
  const firstName = selectedEmployee.firstName || '';
  const middleName = selectedEmployee.middleName || '';
  const lastName = selectedEmployee.lastName || '';
  const position = selectedEmployee.position || '';
  const email = selectedEmployee.email || '';
  const department = selectedEmployee.department || '';
  const status = selectedEmployee.status || '';
  const empId = selectedEmployee.empId || '';

  return (
    <div className="flex justify-center mb-6">
      <Card className="w-full max-w-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <img
                src={getProfileImageUrl(selectedEmployee)}
                alt={`${firstName} ${middleName} ${lastName}`}
                className="w-24 h-24 rounded-full border-4 border-blue-200 bg-gray-100 object-cover shadow-md"
                onError={(e) => {
                  // Handle image loading errors
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder-user.jpg";
                }}
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {firstName} {middleName} {lastName}
              </h2>
              <p className="text-lg text-gray-600 mb-2">{position}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>📧 {email}</span>
                <span>🏢 {department}</span>
                <span>{getStatusBadge(status)}</span>
              </div>
              {empId && (
                <>
                  <p className="text-sm text-blue-600 font-medium mt-2">
                    Employee ID: {empId}
                  </p>
                  <div className="flex gap-3 mt-3">
                    <Link href={`/hr/employees/id-card?empId=${empId}`}>
                      <Button variant="default">ID Card</Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={generateBioDataPDF}
                      className="border-gray-300 hover:bg-gray-50"
                      disabled={isGeneratingPDF} // Disable button when generating PDF
                    >
                      {isGeneratingPDF ? ( // Show loader when generating PDF
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Download Bio Data"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}