import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    
    if (!month) {
      return NextResponse.json({ error: 'Month parameter is required' }, { status: 400 });
    }

    // Proxy to backend server
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/v1/hr/payroll/fast?month=${month}&year=${year || new Date().getFullYear()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Payroll fast API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payroll data' },
      { status: 500 }
    );
  }
} 