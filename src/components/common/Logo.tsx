import React from 'react';
import classes from './Logo.module.css';

type LogoSize = 'large' | 'medium' | 'small' | 'favicon';

interface AppLogoProps {
  size?: LogoSize;
  className?: string;
}

const AppLogo: React.FC<AppLogoProps> = ({ size = 'medium', className = '' }) => {
  const sizeClasses: Record<LogoSize, string> = {
    large: classes.large,
    medium: classes.medium,
    small: classes.small,
    favicon: classes.favicon,
  };

  return (
    <div className={`${classes.logoText} ${sizeClasses[size]} ${className}`} aria-label="FlashCards Application Logo">
      Flashcode
    </div>
  );
};

export default AppLogo;
