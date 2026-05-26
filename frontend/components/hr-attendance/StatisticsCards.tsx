import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle, Clock, AlertCircle, XCircle, TrendingUp } from "lucide-react";

interface StatisticsCardsProps {
  stats: {
    total: number;
    present: number;
    partial: number;
    leave: number;
    absent: number;
    otHours: string;
  };
}

export function StatisticsCards({ stats }: StatisticsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Employees</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Present</p>
              <p className="text-2xl font-bold text-green-900">{stats.present}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Partial</p>
              <p className="text-2xl font-bold text-orange-900">{stats.partial}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">On Leave</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.leave}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Absent</p>
              <p className="text-2xl font-bold text-red-900">{stats.absent}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total OT Hours</p>
              <p className="text-2xl font-bold text-purple-900">{stats.otHours}h</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}