import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DeleteButton } from "@/components/shared-buttons";

interface AttendanceRecord {
  empId: string;
  name: string;
  department: string;
  designation?: string;
  checkIn: string;
  checkOut: string;
  status: string;
  imageUrl?: string;
  inPunchId?: string;
  outPunchId?: string;
  sessionId?: string; // Add sessionId for session-based records
  leaveReason?: string;
  checkInFromPreviousDay?: boolean;
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  onDeletePunch: (punchId: string) => void;
  getStatusBadge: (status: string, leaveReason?: string) => React.ReactNode;
}

export function AttendanceTable({ records, onDeletePunch, getStatusBadge }: AttendanceTableProps) {
  // Create a map to track empId occurrences and generate unique keys
  const empIdCounts = new Map<string, number>();

  const getUniqueKey = (record: AttendanceRecord, index: number) => {
    // Create a unique key based on empId and index to ensure uniqueness
    return `${record.empId}-${index}`;
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Check In</TableHead>
            <TableHead>Check Out</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => {
            const uniqueKey = getUniqueKey(record, index);
            return (
              <TableRow key={uniqueKey} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={record.name} />
                      <AvatarFallback className="text-xs">{record.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{record.name}</div>
                      <div className="text-sm text-muted-foreground">{record.empId}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{record.department}</div>
                    <div className="text-sm text-muted-foreground">{record.designation || "N/A"}</div>
                  </div>
                </TableCell>
                <TableCell className="font-mono">
                  {record.checkIn}
                  {record.checkInFromPreviousDay && (
                    <span className="ml-1 text-xs text-muted-foreground">(prev day)</span>
                  )}
                </TableCell>
                <TableCell className="font-mono">
                  {record.checkOut}
                  {record.checkInFromPreviousDay && (
                    <span className="ml-1 text-xs text-muted-foreground">(prev day)</span>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(record.status, record.leaveReason)}</TableCell>
                <TableCell>
                  {record.imageUrl ? (
                    <div className="flex justify-center">
                      <img
                        src={record.imageUrl}
                        alt="Punch"
                        className="w-10 h-10 object-cover rounded border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-xs">No image</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {record.inPunchId && (
                      <DeleteButton
                        size="sm"
                        showText={true}
                        text="IN"
                        onConfirm={() => onDeletePunch(record.inPunchId!)}
                        confirmTitle="Delete IN Punch"
                        confirmDescription="Are you sure you want to delete this IN punch record? This action cannot be undone."
                      />
                    )}
                    {record.outPunchId && (
                      <DeleteButton
                        size="sm"
                        showText={true}
                        text="OUT"
                        onConfirm={() => onDeletePunch(record.outPunchId!)}
                        confirmTitle="Delete OUT Punch"
                        confirmDescription="Are you sure you want to delete this OUT punch record? This action cannot be undone."
                      />
                    )}
                    {/* For session-based data, we use a session delete action */}
                    {!record.inPunchId && !record.outPunchId && record.sessionId && (
                      <DeleteButton
                        size="sm"
                        showText={true}
                        text="Session"
                        onConfirm={() => record.sessionId && onDeletePunch(record.sessionId)} // Use sessionId for sessions
                        confirmTitle="Delete Session"
                        confirmDescription="Are you sure you want to delete this session record? This action cannot be undone."
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}