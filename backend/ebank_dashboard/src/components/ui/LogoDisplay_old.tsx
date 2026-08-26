import React, { useState, useEffect } from 'react';

interface LogoDisplayProps {
  logoUrl: string;
  companyName: string;
  fallbackIcon: React.ReactNode;
  className?: string;
}

const LogoDisplay: React.FC<LogoDisplayProps> = ({ 
  logoUrl, 
  companyName, 
  fallbackIcon, 
  className = "" 
}) => {
  const [imageError, setImageError] = useState(false);

  // Simple approach: if no URL or empty, show fallback immediately
  if (!logoUrl || logoUrl.trim() === '') {
    console.log('🔄 LogoDisplay: No logo URL, showing fallback');
    return (
      <div className="flex items-center justify-center">
        {fallbackIcon}
      </div>
    );
  }

  // Show fallback if we've detected an error
  if (imageError) {
    console.log('🔄 LogoDisplay: Image error detected, showing fallback');
    return (
      <div className="flex items-center justify-center">
        {fallbackIcon}
      </div>
    );
  }

  // Try to show the image directly
  console.log('�️ LogoDisplay: Attempting to display image:', logoUrl);
  return (
    <img 
      src={logoUrl}
      alt={companyName}
      className={className}
      onLoad={() => {
        console.log('✅ LogoDisplay: Image loaded successfully:', logoUrl);
        setImageError(false);
      }}
      onError={(e) => {
        console.error('❌ LogoDisplay: Image failed to load:', logoUrl, e);
        setImageError(true);
      }}
      style={{ 
        display: imageError ? 'none' : 'block' 
      }}
    />
  );
};

export default LogoDisplay;