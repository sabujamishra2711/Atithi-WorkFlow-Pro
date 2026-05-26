import React, { useState } from 'react';
import { Button } from './button';
import { Progress } from './progress';
import { Download, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { handleProductionError } from '@/utils/productionFixes';

// Change the onExport prop type to allow both () => void and () => Promise<void>
export interface ExportButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onExport: () => void | Promise<void>;
  estimatedTime?: string;
  showProgress?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function ExportButton({
  onExport,
  children,
  variant = 'default',
  size = 'default',
  className = '',
  disabled = false,
  estimatedTime,
  showProgress = true
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    setProgress(0);
    setStatus('exporting');

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await onExport();
      setProgress(100);
      setStatus('success');
      toast.success('Export completed successfully!');
    } catch (error) {
      setStatus('error');
      const errorResult = handleProductionError(error, 'Export');
      toast.error(errorResult.error || 'Export failed. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setIsExporting(false);
        setProgress(0);
        setStatus('idle');
      }, 1500);
    }
  };

  const getButtonContent = () => {
    if (status === 'success') {
      return (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          Exported!
        </>
      );
    }

    if (status === 'error') {
      return (
        <>
          <AlertCircle className="h-4 w-4 mr-2" />
          Failed
        </>
      );
    }

    if (isExporting) {
      return (
        <>
          <Clock className="h-4 w-4 mr-2 animate-spin" />
          Exporting...
        </>
      );
    }

    return (
      <>
        <Download className="h-4 w-4 mr-2" />
        {children}
      </>
    );
  };

  const getButtonVariant = () => {
    if (status === 'success') return 'default';
    if (status === 'error') return 'destructive';
    return variant;
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleExport}
        disabled={disabled || isExporting}
        variant={getButtonVariant()}
        size={size}
        className={`transition-all duration-300 ${className}`}
      >
        {getButtonContent()}
      </Button>

      {showProgress && isExporting && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Generating report...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {estimatedTime && !isExporting && (
        <div className="flex items-center justify-center text-xs text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          Est. {estimatedTime}
        </div>
      )}
    </div>
  );
} 