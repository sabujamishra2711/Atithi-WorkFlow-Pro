import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { empId: string } }) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');

        if (!month) {
            return new Response(JSON.stringify({ error: 'Month parameter is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Proxy to backend server
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
        const backendEndpoint = `${backendUrl}/api/v1/hr/payroll/payslip/${params.empId}?month=${month}`;

        console.log('Proxying to backend:', backendEndpoint);

        const response = await fetch(backendEndpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/pdf',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend error response:', errorText);
            return new Response(JSON.stringify({ error: 'Failed to generate payslip', details: errorText }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const pdfBuffer = await response.arrayBuffer();
        const filename = `payslip_${params.empId}_${month}.pdf`;

        return new Response(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error('Payslip download API error:', error);
        return new Response(JSON.stringify({ error: 'Failed to download payslip', details: error.message || 'Unknown error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}