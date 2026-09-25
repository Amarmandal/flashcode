import React, { useEffect } from 'react';
import './SplashScreen.css';
import { getCurrentWindow } from '@tauri-apps/api/window';
import brandIcon from '../assets/brand/flashcode-app-icon.png';

const SplashScreen: React.FC = () => {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Get the current window (splash screen)
        const splashWindow = getCurrentWindow();
          // Get the main window
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const mainWindow = await WebviewWindow.getByLabel('main');
        
        if (mainWindow) {
          // Show the main window
          await mainWindow.show();
          await mainWindow.setFocus();
        }
        
        // Close the splash screen
        await splashWindow.close();
      } catch (error) {
        console.error('Error during splash screen initialization:', error);
      }
    };

    initializeApp();
  }, []);



  return (
    <div className="splash-screen">
      <div className="splash-content">
        <img className="splash-mark" src={brandIcon} alt="" />
        <span className="splash-name">Flash<span>code</span></span>
        <div className="splash-loading" aria-label="Loading">
          <i /><i /><i />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
