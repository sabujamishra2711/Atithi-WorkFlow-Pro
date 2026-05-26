import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const backendUrl = `${BACKEND_URL}/api/hr/export/salary-sheet${month ? `?month=${month}` : ''}`;
  const backendRes = await fetch(backendUrl);
  const blob = await backendRes.blob();
  return new Response(blob, {
    status: backendRes.status,
    headers: {
      'Content-Type': backendRes.headers.get('content-type') || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': backendRes.headers.get('content-disposition') || `attachment; filename=salary-sheet-${month}.xlsx`,
    },
  });
} 