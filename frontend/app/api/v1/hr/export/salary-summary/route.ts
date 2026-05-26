import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  
  if (!month || !year) {
    return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
  }

  // Construct the backend URL with the month parameter in YYYY-MM format
  const monthParam = `${year}-${month.padStart(2, '0')}`;
  const backendUrl = `http://localhost:8000/api/v1/hr/export/salary-summary?month=${monthParam}`;
  
  try {
    const res = await fetch(backendUrl);

    if (res.ok) {
      const blob = await res.blob();
      return new NextResponse(blob, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="salary-summary-${monthParam}.xlsx"`
        }
      });
    } else {
      const errorData = await res.json();
      return NextResponse.json({ error: errorData.error || "Failed to generate salary summary" }, { status: res.status });
    }
  } catch (error) {
    console.error('Salary summary export error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 