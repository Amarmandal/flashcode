import React from 'react';
import brandIcon from '../../assets/brand/flashcode-app-icon.png';
import classes from './Logo.module.css';

type LogoSize = 'large' | 'medium' | 'small' | 'favicon';

interface AppLogoProps {
  size?: LogoSize;
  className?: string;
}

const AppLogo: React.FC<AppLogoProps> = ({ size = 'medium', className = '' }) => (
  <span className={`${classes.logo} ${classes[size]} ${className}`} aria-label="Flashcode">
    <img className={classes.mark} src={brandIcon} alt="" aria-hidden="true" />
    {size !== 'favicon' && (
      <span className={classes.wordmark}>
        Flash<span className={classes.accent}>code</span>
      </span>
    )}
  </span>
);

export default AppLogo;
