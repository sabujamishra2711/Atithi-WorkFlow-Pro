import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { empId: string; applicationId: string } }
) {
    try {
        console.log('DELETE request received for empId:', params.empId, 'applicationId:', params.applicationId);

        const authHeader = request.headers.get('authorization');
        console.log('Authorization header:', authHeader);

        // Process the token properly
        let authToken = '';
        if (authHeader) {
            // If it already has Bearer prefix, use as is
            if (authHeader.startsWith('Bearer ')) {
                authToken = authHeader;
            } else {
                // Otherwise add the Bearer prefix
                authToken = `Bearer ${authHeader}`;
            }
        }
        console.log('Processed token:', authToken);

        const backendUrl = `${BACKEND_URL}/api/v1/leave/application/${params.empId}/${params.applicationId}`;
        console.log('Backend URL:', backendUrl);

        const response = await fetch(backendUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json',
            },
        });

        console.log('Backend response status:', response.status);
        console.log('Backend response headers:', [...response.headers.entries()]);

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            console.log('Backend response data:', data);
        } else {
            const text = await response.text();
            console.log('Backend response text:', text);
            data = { error: 'Unexpected response format', text };
        }

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Error in remove leave application API route:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}