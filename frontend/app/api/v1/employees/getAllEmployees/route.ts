import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Try different ports where the backend might be running
    const ports = [8000, 5000, 3001, 8080];
    let data = null;
    let error = null;

    for (const port of ports) {
      try {
        const res = await fetch(`http://localhost:${port}/api/v1/employees/getAllEmployees`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          data = await res.json();
          console.log(`Backend found on port ${port}`);
          break;
        }
      } catch (err) {
        console.log(`Backend not found on port ${port}`);
        error = err;
      }
    }

    if (!data) {
      console.error('Backend not found on any port:', error);
      return NextResponse.json({
        success: false,
        message: 'Backend server not found',
        employees: []
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch employees',
      employees: []
    });
  }
}