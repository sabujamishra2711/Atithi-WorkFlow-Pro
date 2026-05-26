"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { IdCard, Download, Calendar, Users, Building2, Clock, User, Phone, FileText, Plus } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import api from "@/lib/apiClient";
import { SidebarInset } from "@/components/ui/sidebar";

interface Visitor {
  _id: string;
  name: string;
  phone?: string;
  purpose?: string;
  timeIn?: string;
  timeOut?: string;
  company?: string;
  hostName?: string;
  code: string;
  date: string;
  photo?: string;
}

// Modern Visitor Pass Component for PDF generation
const VisitorPassForPDF = ({ visitor }: { visitor: Visitor }) => {
  const currentDate = new Date(visitor.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="visitor-pass w-full h-[280px] bg-white border-2 border-[#8B0000] rounded-lg shadow-lg overflow-hidden mx-auto mb-4">
      <div className="flex h-full">
        {/* Left Section - Logo and Header */}
        <div className="w-1/4 bg-gradient-to-b from-[#8B0000] to-[#a80000] text-white p-4 flex flex-col items-center justify-center relative">
          {/* Company Logo */}
          <div className="mb-4">
            <div className="w-20 h-20 bg-white flex items-center justify-center shadow-lg overflow-hidden rounded-lg">
              <img
                src="/atithi-logo.png"
                alt="Atithi LLP Logo"
                className="w-18 h-18 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <Building2 className="h-12 w-12 text-[#8B0000] hidden" />
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs font-semibold backdrop-blur-sm">
              VISITOR PASS
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-2 right-2 w-2 h-2 bg-white/30 rounded-full"></div>
          <div className="absolute bottom-2 left-2 w-2 h-2 bg-white/20 rounded-full"></div>
        </div>

        {/* Center Section - Photo */}
        <div className="w-1/4 bg-gray-50 flex flex-col items-center justify-center p-4">
          <div className="w-24 h-24 bg-gray-200 rounded-full border-4 border-[#8B0000] flex items-center justify-center mb-2 overflow-hidden">
            {visitor.photo ? (
              <img
                src={visitor.photo}
                alt="Visitor Photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-gray-500" />
            )}
          </div>
          <div className="text-xs text-[#8B0000] px-2 py-1 rounded bg-white font-semibold">
            PASS #{visitor.code.replace('VISIT', '')}
          </div>
        </div>

        {/* Right Section - Visitor Information */}
        <div className="w-1/2 p-4 flex flex-col justify-between">
          <div>
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-[#8B0000] mb-1">{visitor.name}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-[#8B0000] mr-2 flex-shrink-0" />
                <div>
                  <span className="font-medium block">Phone:</span>
                  <span className="text-xs">{visitor.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center">
                <Clock className="h-4 w-4 text-[#8B0000] mr-2 flex-shrink-0" />
                <div>
                  <span className="font-medium block">Time In:</span>
                  <span className="text-xs">{visitor.timeIn || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center col-span-2">
                <FileText className="h-4 w-4 text-[#8B0000] mr-2 flex-shrink-0" />
                <div>
                  <span className="font-medium block">Purpose:</span>
                  <span className="text-xs">{visitor.purpose || 'General Visit'}</span>
                </div>
              </div>

              {visitor.company && (
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 text-[#8B0000] mr-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium block">Company:</span>
                    <span className="text-xs">{visitor.company}</span>
                  </div>
                </div>
              )}

              {visitor.hostName && (
                <div className="flex items-center">
                  <User className="h-4 w-4 text-[#8B0000] mr-2 flex-shrink-0" />
                  <div>
                    <span className="font-medium block">Host:</span>
                    <span className="text-xs">{visitor.hostName}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="border-t border-gray-300 mb-3"></div>
            <div className="text-center text-xs text-gray-600">
              <div className="font-medium">{currentDate}</div>
              <div className="mt-1 text-[#8B0000] font-semibold">
                Please return this pass when leaving
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function VisitorEntryPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [downloading, setDownloading] = useState<string | null>(null);

  // Fetch visitors for selected date
  const fetchVisitors = async (date: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/visitors?date=${date}`);
      if (response.status === 200) {
        // Handle both direct array responses and ApiResponse wrapper
        const visitorsData = response.data?.data || response.data || [];
        // Ensure we're working with an array
        if (Array.isArray(visitorsData)) {
          setVisitors(visitorsData);
        } else {
          console.warn('Visitors data is not an array:', visitorsData);
          setVisitors([]);
        }
      } else {
        setVisitors([]);
      }
    } catch (error) {
      console.error('Error fetching visitors:', error);
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors(selectedDate);
  }, [selectedDate]);

  // Download visitor pass as PDF
  const downloadVisitorPass = async (visitor: Visitor) => {
    setDownloading(visitor._id);
    try {
      // Create a temporary container for the pass
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '800px';
      tempContainer.style.height = '300px';
      document.body.appendChild(tempContainer);

      // Render the pass component
      const passElement = document.createElement('div');
      passElement.innerHTML = `
        <div class="visitor-pass" style="width: 800px; height: 280px; background: white; border: 2px solid #8B0000; border-radius: 8px; overflow: hidden; display: flex;">
          <div style="width: 200px; background: linear-gradient(to bottom, #8B0000, #a80000); color: white; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
            <div style="margin-bottom: 16px;">
              <div style="width: 64px; height: 64px; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
                <img src="/atithi-logo.png" alt="Atithi LLP Logo" style="width: 56px; height: 56px; object-fit: contain;" />
              </div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 12px; font-weight: 600;">
                VISITOR PASS
              </div>
            </div>
          </div>
          <div style="width: 200px; background: #f9fafb; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px;">
            <div style="width: 96px; height: 96px; background: #e5e7eb; border-radius: 50%; border: 4px solid #8B0000; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; overflow: hidden;">
              ${visitor.photo ? `<img src="${visitor.photo}" alt="Visitor Photo" style="width: 100%; height: 100%; object-fit: cover;" />` : '<div style="width: 48px; height: 48px; background: #9ca3af;"></div>'}
            </div>
            <div style="font-size: 12px; color: #8B0000; padding: 2px 8px; border-radius: 4px; font-weight: 600;">
              PASS #${visitor.code.replace('VISIT', '')}
            </div>
          </div>
          <div style="flex: 1; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="text-align: center; margin-bottom: 16px;">
                <h2 style="font-size: 24px; font-weight: bold; color: #8B0000; margin: 0 0 4px 0;">${visitor.name}</h2>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
                <div style="display: flex; align-items: center;">
                  <div>
                    <span style="font-weight: 500; display: block;">Phone:</span>
                    <span style="font-size: 12px;">${visitor.phone || 'N/A'}</span>
                  </div>
                </div>
                <div style="display: flex; align-items: center;">
                  <div>
                    <span style="font-weight: 500; display: block;">Time In:</span>
                    <span style="font-size: 12px;">${visitor.timeIn || 'N/A'}</span>
                  </div>
                </div>
                <div style="grid-column: span 2; display: flex; align-items: center;">
                  <div>
                    <span style="font-weight: 500; display: block;">Purpose:</span>
                    <span style="font-size: 12px;">${visitor.purpose || 'General Visit'}</span>
                  </div>
                </div>
                ${visitor.company ? `<div style="display: flex; align-items: center;"><div><span style="font-weight: 500; display: block;">Company:</span><span style="font-size: 12px;">${visitor.company}</span></div></div>` : ''}
                ${visitor.hostName ? `<div style="display: flex; align-items: center;"><div><span style="font-weight: 500; display: block;">Host:</span><span style="font-size: 12px;">${visitor.hostName}</span></div></div>` : ''}
              </div>
            </div>
            <div style="margin-top: 16px;">
              <div style="border-top: 1px solid #d1d5db; margin-bottom: 12px;"></div>
              <div style="text-align: center; font-size: 12px; color: #6b7280;">
                <div style="font-weight: 500;">${new Date(visitor.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div style="margin-top: 4px; color: #8B0000; font-weight: 600;">
                  Please return this pass when leaving
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      tempContainer.appendChild(passElement);

      // Generate PDF
      const canvas = await html2canvas(passElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 800,
        height: 280
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [105, 297] // A4 landscape dimensions
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`visitor_pass_${visitor.code}_${visitor.name.replace(/\s+/g, '_')}.pdf`);

      // Clean up
      document.body.removeChild(tempContainer);

      toast.success(`Visitor pass for ${visitor.name} downloaded successfully!`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to generate visitor pass PDF. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-lg font-semibold">Visitor Management</h1>
      </header>
      <div className="flex-1 space-y-6 p-6">
        {/* Header with Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Visitor Management</h1>
            <p className="text-muted-foreground">Manage and track all visitor activities</p>
          </div>
          <div className="flex gap-3">
            <Link href="/visitor/pass">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate New Pass
              </Button>
            </Link>
            <Link href="/hr/visitors">
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                HR View
              </Button>
            </Link>
          </div>
        </div>

        {/* Visitor Records Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Visitor Records
            </CardTitle>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading visitor records...</p>
              </div>
            ) : visitors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted" />
                <p>No visitors recorded for {new Date(selectedDate).toLocaleDateString()}.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <table className="min-w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Code</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Company</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Purpose</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Time In</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Host</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.map((visitor, index) => (
                      <tr key={visitor._id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3 font-mono text-sm font-medium">{visitor.code}</td>
                        <td className="px-4 py-3 text-sm font-medium">{visitor.name}</td>
                        <td className="px-4 py-3 text-sm">{visitor.phone || "-"}</td>
                        <td className="px-4 py-3 text-sm">{visitor.company || "-"}</td>
                        <td className="px-4 py-3 text-sm">{visitor.purpose || "-"}</td>
                        <td className="px-4 py-3 text-sm">{visitor.timeIn || "-"}</td>
                        <td className="px-4 py-3 text-sm">{visitor.hostName || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            onClick={() => downloadVisitorPass(visitor)}
                            disabled={downloading === visitor._id}
                            variant="secondary"
                          >
                            {downloading === visitor._id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-1" />
                                Download Pass
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}