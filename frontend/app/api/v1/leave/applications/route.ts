import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const empId = searchParams.get('empId');
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const month = searchParams.get('month');
    const status = searchParams.get('status');

    // Fix: Use correct backend endpoint (/api/v1/leave/applications instead of /api/v1/leaves/applications)
    let url = `${BACKEND_URL}/api/v1/leave/applications?year=${year}`;
    if (empId) url += `&empId=${empId}`;
    if (month) url += `&month=${month}`;
    if (status) url += `&status=${status}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in leave applications API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}