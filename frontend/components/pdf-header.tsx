import React from 'react';
import { Building2 } from 'lucide-react';

interface PDFHeaderProps {
  title: string;
  subtitle?: string;
  showDate?: boolean;
  className?: string;
}

export const PDFHeader: React.FC<PDFHeaderProps> = ({
  title,
  subtitle,
  showDate = true,
  className = ""
}) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className={`pdf-header border-b-2 border-[#8B0000] pb-4 mb-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Company Logo */}
          <div className="w-20 h-20 bg-white rounded-lg border-2 border-[#8B0000] flex items-center justify-center overflow-hidden shadow-lg">
            <img
              src="/atithi-logo.png"
              alt="Atithi LLP Logo"
              className="w-18 h-18 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <Building2 className="h-12 w-12 text-[#8B0000] hidden" />
          </div>
          {/* Title and Subtitle */}
          <div>
            <h1 className="text-3xl font-bold text-[#8B0000] mb-1">ATITHI LLP</h1>
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          </div>
        </div>
        {/* Date */}
        {showDate && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Generated on</p>
            <p className="text-lg font-semibold text-[#8B0000]">{currentDate}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFHeader;