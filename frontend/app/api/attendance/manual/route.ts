import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const res = await fetch(`http://localhost:8000/api/v1/punch/monthly/manual/${employeeId}/${year}/${month}`);
  const data = await res.json();
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const body = await req.json();
  const res = await fetch(`http://localhost:8000/api/v1/punch/monthly/manual/${employeeId}/${year}/${month}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data);
} 