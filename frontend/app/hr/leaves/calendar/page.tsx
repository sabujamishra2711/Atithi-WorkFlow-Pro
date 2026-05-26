"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import proxyApi from '@/lib/proxyApiClient';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

interface LeaveEntry {
  empId: string;
  name: string;
  leaveType: string;
  status: string;
}

interface CalendarDay {
  date: string;
  employees: LeaveEntry[];
}

export default function LeaveCalendarPage() {
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth, currentYear]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const response = await proxyApi.get(`/api/v1/leave/calendar?month=${currentMonth}&year=${currentYear}`);
      if (response.data.success) {
        setCalendarData(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar data.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'PL': return 'bg-blue-500';
      case 'CL': return 'bg-green-500';
      case 'SL': return 'bg-orange-500';
      case 'LWP': return 'bg-red-500';
      case 'COFF': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const calendarMap = new Map<string, LeaveEntry[]>();
  calendarData.forEach(day => {
    calendarMap.set(day.date, day.employees);
  });

  const renderCalendarDays = () => {
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50"></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const leaves = calendarMap.get(dateStr) || [];
      const isToday = new Date().toISOString().slice(0, 10) === dateStr;
      
      days.push(
        <div key={day} className={`h-24 border border-gray-200 p-1 overflow-hidden ${isToday ? 'bg-blue-50 ring-2 ring-blue-500' : 'bg-white'}`}>
          <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day}</div>
          <div className="space-y-0.5 overflow-y-auto max-h-16">
            {leaves.slice(0, 3).map((leave, idx) => (
              <div key={idx} className={`text-xs px-1 py-0.5 rounded text-white truncate ${getLeaveTypeColor(leave.leaveType)}`}>
                {leave.name.split(' ')[0]} - {leave.leaveType}
              </div>
            ))}
            {leaves.length > 3 && (
              <div className="text-xs text-gray-500">+{leaves.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Leave Calendar</h1>
          <p className="text-sm text-muted-foreground">View employee leaves on calendar</p>
        </div>
      </header>

      <div className="flex-1 space-y-6 p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{monthNames[currentMonth - 1]} {currentYear}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Badge className="bg-blue-500">PL</Badge>
              <Badge className="bg-green-500">CL</Badge>
              <Badge className="bg-orange-500">SL</Badge>
              <Badge className="bg-red-500">LWP</Badge>
              <Badge className="bg-purple-500">COFF</Badge>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-gray-400 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-0">
                {dayNames.map(day => (
                  <div key={day} className="h-10 flex items-center justify-center bg-gray-100 font-medium text-sm">
                    {day}
                  </div>
                ))}
                {renderCalendarDays()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}
