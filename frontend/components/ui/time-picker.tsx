import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface TimePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(
  ({ value, onChange, placeholder = "00:00", disabled = false, className = "" }, ref) => {
    const [inputValue, setInputValue] = useState(value || "");
    const [isOpen, setIsOpen] = useState(false);
    const timePickerRef = useRef<HTMLDivElement>(null);

    // Update input value when prop value changes
    useEffect(() => {
      setInputValue(value || "");
    }, [value]);

    // Handle clicks outside the time picker
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    // Format time input as user types
    const formatTimeInput = (input: string): string => {
      // Remove any non-digit characters
      let digits = input.replace(/[^\d]/g, '');
      
      // Limit to 4 digits max
      if (digits.length > 4) {
        digits = digits.substring(0, 4);
      }
      
      // Format as HH:MM
      if (digits.length >= 3) {
        const hours = digits.substring(0, 2);
        const minutes = digits.substring(2);
        return `${hours}:${minutes}`;
      } else if (digits.length > 0) {
        return digits;
      }
      
      return "";
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatTimeInput(e.target.value);
      setInputValue(formatted);
      
      // If we have a complete time (HH:MM), call onChange
      if (formatted.length === 5 && formatted.includes(':')) {
        onChange(formatted);
      } else if (formatted === "") {
        onChange(null);
      }
    };

    // Handle input blur
    const handleInputBlur = () => {
      // Format the final value
      if (inputValue && inputValue.length > 0) {
        let [hours, minutes] = inputValue.includes(':') 
          ? inputValue.split(':') 
          : [inputValue.padEnd(2, '0'), '00'];
        
        // Pad with zeros if needed
        hours = hours.padStart(2, '0').substring(0, 2);
        minutes = minutes.padStart(2, '0').substring(0, 2);
        
        // Validate ranges
        const hourNum = parseInt(hours, 10);
        const minuteNum = parseInt(minutes, 10);
        
        if (hourNum > 23) hours = '23';
        if (minuteNum > 59) minutes = '59';
        
        const formatted = `${hours}:${minutes}`;
        setInputValue(formatted);
        onChange(formatted);
      } else {
        onChange(null);
      }
      
      // Close the dropdown after a short delay to allow for clicks
      setTimeout(() => setIsOpen(false), 200);
    };

    // Handle key down events
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        handleInputBlur();
      }
    };

    // Select time from dropdown
    const selectTime = (hours: number, minutes: number) => {
      const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      setInputValue(formatted);
      onChange(formatted);
      setIsOpen(false);
    };

    return (
      <div className="relative" ref={timePickerRef}>
        <Input
          ref={ref}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary ${className}`}
        />
        
        {isOpen && !disabled && (
          <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg w-48 max-h-60 overflow-y-auto">
            {/* Common time options */}
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                SELECT TIME
              </div>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(hour => (
                <div key={hour} className="flex border-b border-gray-100 last:border-b-0">
                  {[0, 15, 30, 45].map(minute => (
                    <button
                      key={`${hour}-${minute}`}
                      type="button"
                      className="w-1/4 px-3 py-2 text-sm hover:bg-primary hover:text-white transition-colors"
                      onClick={() => selectTime(hour, minute)}
                    >
                      {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

TimePicker.displayName = 'TimePicker';

export { TimePicker };