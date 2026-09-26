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
  
  // Default static logo path - always available immediately
  const defaultLogoPath = '/logo.png';
  
  // Determine which logo to use with priority:
  // 1. Static default logo (immediate, no flickering)
  // 2. Custom logo from SystemConfig (if available)
  // 3. Fallback icon (if both fail)
  const getLogoToDisplay = (): string => {
    // Always start with static logo to prevent flickering
    if (!logoUrl || logoUrl.trim() === '' || imageError) {
      console.log('🎯 LogoDisplay: Using default static logo');
      return defaultLogoPath;
    }
    
    // If we have a valid custom logo URL, use it
    if (isValidLogoUrl(logoUrl)) {
      console.log('🎯 LogoDisplay: Using custom logo from SystemConfig');
      return logoUrl;
    }
    
    console.log('🎯 LogoDisplay: Invalid custom logo, using default static logo');
    return defaultLogoPath;
  };

  // Check if logo URL is valid/usable
  const isValidLogoUrl = (url: string): boolean => {
    if (!url || url.trim() === '') return false;
    
    // If it's a base64 that's too long (likely corrupted), reject it
    if (url.startsWith('data:image/') && url.length > 50000) {
      console.warn('🚨 LogoDisplay: Base64 logo too large, using default');
      return false;
    }
    
    // If it's a data URL but malformed, reject it
    if (url.startsWith('data:image/') && !url.includes('base64,')) {
      console.warn('🚨 LogoDisplay: Malformed base64 logo, using default');
      return false;
    }
    
    return true;
  };

  // Reset error state when logoUrl changes
  useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  const logoSrc = getLogoToDisplay();
  
  // Always show the image (either static default or custom)
  // No flickering since we always have a logo to display
  console.log('🖼️ LogoDisplay: Displaying logo:', logoSrc);
  
  return (
    <div className="flex items-center justify-center">
      <img 
        src={logoSrc}
        alt={companyName}
        className={className}
        onError={(e) => {
          console.error('❌ LogoDisplay: Logo failed to load, falling back to icon:', e);
          setImageError(true);
        }}
      />
      {imageError && logoSrc !== defaultLogoPath && (
        <div className="absolute flex items-center justify-center">
          {fallbackIcon}
        </div>
      )}
    </div>
  );
};

export default LogoDisplay;