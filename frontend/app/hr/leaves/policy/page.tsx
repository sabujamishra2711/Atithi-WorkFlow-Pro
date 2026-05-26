"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function LeavePolicyPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Leave Policy</h1>
        <Button onClick={() => window.location.href = '/hr/leaves'}>
          Back to Dashboard
        </Button>
      </div>

      {/* Policy Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Policy Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="text-muted-foreground mb-4">
              Our leave management system follows a comprehensive policy designed to ensure fair allocation 
              and proper utilization of leave benefits. The policy is effective from April 1st of each year.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Leave Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PL - Paid Leave */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">PL</Badge>
              Paid Leave
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Allocation Rules:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>Allocated when employee has 20+ present days</li>
                <li>Maximum 12 PL per year</li>
                <li>Requires 240+ working days for full allocation</li>
                <li>Reserved for next year if criteria met</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Validity:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>Valid for up to 3 years</li>
                <li>Can carry forward remaining balance</li>
                <li>Maximum carry forward: 36 days (3 years)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Important Notes:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>If 240 working days not achieved, reserved PL lapses</li>
                <li>PL is paid leave with full salary</li>
                <li>Allocation starts from April 1st</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* CL - Casual Leave */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">CL</Badge>
              Casual Leave
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Allocation Rules:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>Fixed 6 CL per year</li>
                <li>1 leave allocated per month</li>
                <li>Automatic monthly allocation</li>
                <li>No carry forward to next year</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Validity:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>Valid for 1 year</li>
                <li>Lapses after 1 year</li>
                <li>New allocation every month</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Important Notes:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>CL is paid leave</li>
                <li>Cannot be accumulated beyond 6 months</li>
                <li>Monthly allocation ensures regular availability</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* SL - Sick Leave */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className="bg-orange-100 text-orange-800">SL</Badge>
              Sick Leave
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Allocation Rules:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>Fixed 6 SL per year</li>
                <li>1 leave allocated per month</li>
                <li>Automatic monthly allocation</li>
                <li>No carry forward to next year</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Validity:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>Valid for 1 year</li>
                <li>Lapses after 1 year</li>
                <li>New allocation every month</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Important Notes:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>SL is paid leave</li>
                <li>Requires medical certificate for extended periods</li>
                <li>Cannot be accumulated beyond 6 months</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* LWP - Leave Without Pay */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800">LWP</Badge>
              Leave Without Pay
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Allocation Rules:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>Same allocation rules as PL</li>
                <li>Allocated when employee has 20+ present days</li>
                <li>Maximum 12 LWP per year</li>
                <li>Requires 240+ working days for full allocation</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Validity:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>Valid for up to 3 years</li>
                <li>Can carry forward remaining balance</li>
                <li>Maximum carry forward: 36 days (3 years)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium">Important Notes:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>LWP is unpaid leave</li>
                <li>No salary during LWP period</li>
                <li>Requires prior approval</li>
                <li>Same carry forward rules as PL</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* General Rules */}
      <Card>
        <CardHeader>
          <CardTitle>General Leave Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Application Process</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Leave applications must be submitted in advance</li>
                <li>Emergency leaves require immediate notification</li>
                <li>All applications are subject to approval</li>
                <li>Balance verification is mandatory</li>
                <li>Insufficient balance will result in rejection</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Approval Process</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>HR reviews all leave applications</li>
                <li>Approval depends on leave balance availability</li>
                <li>Rejection requires valid reason</li>
                <li>Approved leaves are automatically deducted</li>
                <li>Balance is updated in real-time</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Features */}
      <Card>
        <CardHeader>
          <CardTitle>System Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Automatic Allocation</h4>
              <p className="text-sm text-muted-foreground">
                Leaves are automatically allocated based on attendance and working days.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Real-time Balance</h4>
              <p className="text-sm text-muted-foreground">
                Leave balances are updated in real-time when leaves are applied.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Carry Forward</h4>
              <p className="text-sm text-muted-foreground">
                PL and LWP can be carried forward for up to 3 years.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Monthly Allocation</h4>
              <p className="text-sm text-muted-foreground">
                CL and SL are allocated monthly (1 per month).
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Automatic Lapse</h4>
              <p className="text-sm text-muted-foreground">
                CL and SL automatically lapse after 6 months.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Balance Checking</h4>
              <p className="text-sm text-muted-foreground">
                System prevents leave application if balance is insufficient.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            For any questions regarding leave policies or system usage, please contact the HR department.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.href = '/hr/support'}>
              Contact Support
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/hr/leaves/balance'}>
              Check Balances
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 