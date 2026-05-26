import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'xl' | 'hero';
  variant?: 'default' | 'white-bg' | 'transparent';
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  variant = 'default',
  className = '',
  showText = false 
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12', 
    large: 'w-20 h-20',
    xl: 'w-32 h-32',
    hero: 'w-48 h-48'
  };

  const containerClasses = {
    default: 'bg-white border-2 border-[#8B0000] shadow-md',
    'white-bg': 'bg-white border-2 border-[#8B0000] shadow-lg',
    transparent: 'bg-transparent'
  };

  const imgSizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-10 h-10',
    large: 'w-18 h-18', 
    xl: 'w-28 h-28',
    hero: 'w-44 h-44'
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-xl',
    xl: 'text-3xl', 
    hero: 'text-5xl'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} ${containerClasses[variant]} flex items-center justify-center overflow-hidden rounded-lg`}>
        <img 
          src="/atithi-logo.png" 
          alt="Atithi LLP Logo" 
          className={`${imgSizeClasses[size]} object-contain`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder-logo.png';
          }}
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <h1 className={`font-bold text-[#8B0000] ${textSizeClasses[size]} leading-tight`}>
            ATITHI LLP
          </h1>
          <p className={`text-gray-600 ${size === 'hero' ? 'text-lg' : size === 'xl' ? 'text-base' : 'text-sm'}`}>
            WorkFlow Pro
          </p>
        </div>
      )}
    </div>
  );
};

export default Logo;