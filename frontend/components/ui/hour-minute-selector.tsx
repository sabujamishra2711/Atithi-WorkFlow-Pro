import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HourMinuteSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const HourMinuteSelector = React.forwardRef<HTMLDivElement, HourMinuteSelectorProps>(
  ({ value, onChange, placeholder = "00:00", disabled = false, className = "" }, ref) => {
    // Extract hours and minutes from value
    const hours = value && value.includes(':') ? value.split(':')[0] : "";
    const minutes = value && value.includes(':') ? value.split(':')[1] : "";

    // Handle hour change
    const handleHourChange = (newHour: string) => {
      const currentMinutes = minutes || "00";
      if (newHour) {
        onChange(`${newHour.padStart(2, '0')}:${currentMinutes.padStart(2, '0')}`);
      } else if (currentMinutes !== "00") {
        onChange(`00:${currentMinutes.padStart(2, '0')}`);
      } else {
        onChange(null);
      }
    };

    // Handle minute change
    const handleMinuteChange = (newMinute: string) => {
      const currentHours = hours || "00";
      if (newMinute) {
        onChange(`${currentHours.padStart(2, '0')}:${newMinute.padStart(2, '0')}`);
      } else if (currentHours !== "00") {
        onChange(`${currentHours.padStart(2, '0')}:00`);
      } else {
        onChange(null);
      }
    };

    // Generate hour options (0-23)
    const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    
    // Generate minute options (0-59, in 5-minute increments)
    const minuteOptions = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

    return (
      <div className={`flex items-start gap-1 ${className}`} ref={ref as any}>
        {/* Hour Selector */}
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Hour</label>
          <Select 
            value={hours || undefined} 
            onValueChange={handleHourChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-16 h-8 text-sm border border-gray-300 rounded shadow-sm focus:ring-1 focus:ring-primary focus:border-primary">
              {hours ? <SelectValue /> : <span className="text-muted-foreground text-xs">HH</span>}
            </SelectTrigger>
            <SelectContent>
              {hourOptions.map(hour => (
                <SelectItem key={hour} value={hour} className="text-sm">
                  {hour}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-center pt-5">
          <span className="text-gray-400 font-bold">:</span>
        </div>

        {/* Minute Selector */}
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Minute</label>
          <Select 
            value={minutes || undefined} 
            onValueChange={handleMinuteChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-16 h-8 text-sm border border-gray-300 rounded shadow-sm focus:ring-1 focus:ring-primary focus:border-primary">
              {minutes ? <SelectValue /> : <span className="text-muted-foreground text-xs">MM</span>}
            </SelectTrigger>
            <SelectContent>
              {minuteOptions.map(minute => (
                <SelectItem key={minute} value={minute} className="text-sm">
                  {minute}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }
);

HourMinuteSelector.displayName = 'HourMinuteSelector';

export { HourMinuteSelector };