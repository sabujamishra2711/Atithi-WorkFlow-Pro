import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const response = await fetch(`https://atithi-workflow-pro.onrender.com//api/v1/leaves/allocate/all`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Failed to allocate leaves' }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error allocating leaves:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 