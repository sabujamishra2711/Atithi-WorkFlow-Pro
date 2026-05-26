import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { empId: string } }) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');

        if (!month) {
            return new Response('Month parameter is required', { status: 400 });
        }

        // Proxy to backend server
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/v1/hr/payroll/preview/${params.empId}?month=${month}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'text/html',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(errorText, {
                status: response.status,
                headers: { 'Content-Type': 'text/html' }
            });
        }

        const htmlContent = await response.text();
        return new Response(htmlContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
            },
        });
    } catch (error) {
        console.error('Payslip preview API error:', error);
        return new Response('Failed to fetch payslip preview', { status: 500 });
    }
}