import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";

interface DateSelectorProps {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
}

export function DateSelector({ selectedDate, setSelectedDate }: DateSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Select Date
        </CardTitle>
        <CardDescription>Choose a date to view attendance records</CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          type="date"
          value={selectedDate ? selectedDate.toISOString().slice(0, 10) : ""}
          onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
          className="w-fit"
        />
      </CardContent>
    </Card>
  );
}