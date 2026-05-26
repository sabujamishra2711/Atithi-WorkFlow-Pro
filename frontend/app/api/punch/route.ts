import { type NextRequest, NextResponse } from "next/server"

// Temporary in-memory storage (replace with real database in production)
const punchRecords: Array<{
  id: string
  empId: string
  timestamp: string
  type: "in" | "out"
  createdAt: string
}> = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { empId, timestamp, type } = body

    // Validate input
    if (!empId || !timestamp || !type) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: empId, timestamp, type",
        },
        { status: 400 },
      )
    }

    // Validate employee ID format (8 characters)
    if (typeof empId !== "string" || empId.length !== 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Employee ID must be exactly 8 characters",
        },
        { status: 400 },
      )
    }

    // Validate punch type
    if (!["in", "out"].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Punch type must be either "in" or "out"',
        },
        { status: 400 },
      )
    }

    // Create new punch record
    const newPunch = {
      id: `punch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      empId: empId.toUpperCase(),
      timestamp,
      type,
      createdAt: new Date().toISOString(),
    }

    // Save to in-memory storage (replace with database)
    punchRecords.push(newPunch)

    // Log the punch
    console.log("New punch recorded:", {
      empId: newPunch.empId,
      type: newPunch.type,
      timestamp: new Date(timestamp).toLocaleString(),
      id: newPunch.id,
    })

    return NextResponse.json({
      success: true,
      id: newPunch.id,
      message: `Punch ${type} recorded successfully for employee ${empId}`,
      data: {
        empId: newPunch.empId,
        timestamp: newPunch.timestamp,
        type: newPunch.type,
      },
    })
  } catch (error) {
    console.error("Error processing punch:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process punch request",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const empId = searchParams.get("empId")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    let filteredRecords = [...punchRecords]

    // Filter by employee ID if provided
    if (empId) {
      filteredRecords = punchRecords.filter((record) => record.empId === empId.toUpperCase())
    }

    // Sort by timestamp (most recent first) and limit results
    const sortedRecords = filteredRecords
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      data: sortedRecords,
      total: filteredRecords.length,
    })
  } catch (error) {
    console.error("Error fetching punch records:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch punch records",
      },
      { status: 500 },
    )
  }
}
