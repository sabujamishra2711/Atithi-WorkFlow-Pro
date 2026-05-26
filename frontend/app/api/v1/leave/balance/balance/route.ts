import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract employeeId from query parameters instead of route parameters
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
    }

    const response = await fetch(`https://atithi-workflow-pro.onrender.com//api/v1/leave/balance/${employeeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Failed to fetch leave balance' }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching leave balance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}