import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');

    // Proxy to the correct backend endpoint
    const url = `${BACKEND_URL}/api/v1/leave/allocate/pending`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in allocate pending leaves API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}