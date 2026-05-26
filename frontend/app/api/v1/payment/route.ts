import { NextResponse } from 'next/server';

// Function to get the backend URL
const getBackendUrl = () => {
  const backendUrl = process.env.NODE_ENV === 'production'
    ? 'https://atithi-workflow-pro.onrender.com'
    : 'http://localhost:8000';
  return backendUrl.replace(/\/$/, '').replace(/\/api\/v1$/, '');
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const backendUrl = getBackendUrl();

    // Forward the request to the backend payment endpoint
    // If path is provided (e.g. ?path=/status), it uses that, otherwise defaults to base payment endpoint
    const backendResponse = await fetch(`${backendUrl}/api/v1/payment${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({}));
        return NextResponse.json(errorData, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying payment request:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error connecting to payment service',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
