import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')

    // Extract id from query parameters instead of route parameters
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Leave request ID is required' },
        { status: 400 }
      )
    }

    const backendUrl = `${BACKEND_URL}/api/v1/leave/request/${id}`

    const response = await fetch(backendUrl, {
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error in leave request API route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const body = await request.json()

    // Extract id and action from query parameters instead of route parameters
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action') // approve, reject, cancel

    if (!id) {
      return NextResponse.json(
        { error: 'Leave request ID is required' },
        { status: 400 }
      )
    }

    const backendUrl = `${BACKEND_URL}/api/v1/leave/request/${id}/${action}`

    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error in leave request API route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}