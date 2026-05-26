import React from 'react';
import { Building2 } from 'lucide-react';

interface HeroLogoProps {
  showCompanyName?: boolean;
  showTagline?: boolean;
  className?: string;
  animated?: boolean;
}

const HeroLogo: React.FC<HeroLogoProps> = ({ 
  showCompanyName = true,
  showTagline = true,
  className = '',
  animated = true
}) => {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Large Logo */}
      <div className={`w-32 h-32 bg-white border-4 border-[#8B0000] flex items-center justify-center overflow-hidden shadow-2xl rounded-2xl mb-6 ${animated ? 'hover:scale-105 transition-all duration-300' : ''}`}>
        <img 
          src="/atithi-logo.png" 
          alt="Atithi LLP Logo" 
          className="w-28 h-28 object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <Building2 className="h-20 w-20 text-[#8B0000] hidden" />
      </div>
      
      {/* Company Name */}
      {showCompanyName && (
        <h1 className="text-5xl font-bold text-[#8B0000] mb-2 tracking-wide">
          ATITHI LLP
        </h1>
      )}
      
      {/* Tagline */}
      {showTagline && (
        <div className="text-center">
          <p className="text-2xl text-gray-700 font-semibold mb-1">
            WorkFlow Pro
          </p>
          <p className="text-lg text-gray-500">
            Streamlining Business Operations
          </p>
        </div>
      )}
    </div>
  );
};

export default HeroLogo;