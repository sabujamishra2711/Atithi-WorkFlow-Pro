import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: { employeeId: string; year: string } }
) {
  try {
    const { employeeId, year } = params;
    const body = await request.json();
    const token = request.headers.get('authorization');

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authorization token is required'
        },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/v1/leave/apply/${employeeId}/${year}`, {
      method: 'POST',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in leave application API:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to submit leave application: ${(error as Error).message}`
      },
      { status: 500 }
    );
  }
}