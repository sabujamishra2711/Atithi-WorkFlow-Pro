import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const details = searchParams.get('details');

    // Proxy to the correct backend endpoint
    let url = `${BACKEND_URL}/api/v1/leave/pending-allocations`;
    if (details) url += `?details=${details}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in pending allocations API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}