import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    const body = await request.json();

    // Extract empId and applicationId from query parameters instead of route parameters
    const { searchParams } = new URL(request.url);
    const empId = searchParams.get('empId');
    const applicationId = searchParams.get('applicationId');

    if (!empId || !applicationId) {
      return NextResponse.json(
        { error: 'Employee ID and Application ID are required' },
        { status: 400 }
      );
    }

    // Proxy to the correct backend endpoint
    const url = `${BACKEND_URL}/api/v1/leave/application/${empId}/${applicationId}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in update leave application status API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}