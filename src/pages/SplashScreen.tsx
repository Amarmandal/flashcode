import React, { useEffect } from 'react';
import './SplashScreen.css';
import { getCurrentWindow } from '@tauri-apps/api/window';

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
        <div className="logo-container">
          <div className="logo">
            <div className="logo-background">
              <div className="logo-inner">
                <div className="code-symbol">
                  <span className="bracket">&lt;</span>
                  <span className="slash">/</span>
                  <span className="bracket">&gt;</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="loading-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        
      </div>
    </div>
  );
};

export default SplashScreen;
