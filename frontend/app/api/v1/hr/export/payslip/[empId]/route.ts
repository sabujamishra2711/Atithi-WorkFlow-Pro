import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { empId: string } }) {
  const { empId } = params;
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const backendUrl = `http://localhost:8000/api/v1/hr/export/payslip/${empId}?month=${month}`;
  const res = await fetch(backendUrl);

  // Proxy the PDF response
  if (res.ok) {
    const blob = await res.blob();
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Payslip_${empId}_${month}.pdf"`
      }
    });
  } else {
    return NextResponse.json({ error: "Payslip not found" }, { status: res.status });
  }
} 