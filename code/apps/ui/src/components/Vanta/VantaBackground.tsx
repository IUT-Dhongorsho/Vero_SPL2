import React, { useEffect, useRef } from 'react';
import { useTheme } from '../Providers/ThemeProvider';

type VantaEffect = 'net' | 'waves' | 'fog' | 'birds' | 'clouds' | 'topology' | 'halo' | 'rings';

interface VantaBackgroundProps {
  effect?: VantaEffect;
  children?: React.ReactNode;
}

declare global {
  interface Window {
    VANTA: any;
    THREE: any;
  }
}

export const VantaBackground: React.FC<VantaBackgroundProps> = ({ 
  effect = 'net',
  children 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vantaRef = useRef<any>(null);
  const { theme } = useTheme();
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (vantaRef.current) return;

    const loadScripts = async (): Promise<void> => {
      return new Promise((resolve) => {
        // Check if already loaded
        if (window.THREE && window.VANTA && window.VANTA[effect]) {
          resolve();
          return;
        }

        let loadedCount = 0;
        const checkLoaded = () => {
          loadedCount++;
          if (loadedCount === 2) {
            resolve();
          }
        };

        // Load Three.js if not present
        if (!window.THREE) {
          const threeScript = document.createElement('script');
          threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
          threeScript.async = true;
          threeScript.onload = checkLoaded;
          threeScript.onerror = checkLoaded;
          document.head.appendChild(threeScript);
        } else {
          loadedCount++;
        }

        // Load Vanta effect
        if (!window.VANTA || !window.VANTA[effect]) {
          const vantaScript = document.createElement('script');
          vantaScript.src = `https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.${effect}.min.js`;
          vantaScript.async = true;
          vantaScript.onload = checkLoaded;
          vantaScript.onerror = checkLoaded;
          document.head.appendChild(vantaScript);
        } else {
          loadedCount++;
        }

        // If both already loaded, resolve immediately
        if (window.THREE && window.VANTA && window.VANTA[effect]) {
          resolve();
        }
      });
    };

    const initVanta = async () => {
      if (!containerRef.current) return;

      await loadScripts();

      const isDark = theme === 'dark';
      const colors = {
        primary: isDark ? '#60A5FA' : '#2563EB',
        secondary: isDark ? '#A78BFA' : '#7C3AED',
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      };

      try {
        const effectFn = window.VANTA?.[effect];
        if (!effectFn) {
          console.error(`Vanta effect "${effect}" not found. Available:`, Object.keys(window.VANTA || {}));
          return;
        }

        const commonConfig = {
          el: containerRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          THREE: window.THREE,
          color: colors.primary,
          backgroundColor: colors.backgroundColor,
        };

        // Effect-specific overrides
        let config = { ...commonConfig };
        // switch (effect) {
        //   case 'net':
        //     config = { ...config, points: 12, maxDistance: 25, spacing: 18 };
        //     break;
        //   case 'waves':
        //     config = { ...config, shininess: 20, waveHeight: 1.5, waveSpeed: 0.75, zoom: 0.75 };
        //     break;
        //   case 'fog':
        //     config = { ...config, highlightColor: colors.primary, midtoneColor: colors.secondary, lowlightColor: '#f472b6', blurFactor: 0.6, speed: 0.8, zoom: 0.6 };
        //     break;
        //   case 'birds':
        //     config = { ...config, color1: colors.primary, color2: colors.secondary, colorMode: 'lerpGradient', birdSize: 1, wingSpan: 30, speedLimit: 8, separation: 30, alignment: 40, cohesion: 30, quantity: 4 };
        //     break;
        //   case 'clouds':
        //     config = { ...config, color1: colors.primary, color2: colors.secondary, cloudColor: 0xffffff, cloudDensity: 0.8, cloudSpeed: 0.5, sunColor: 0xffaa55, sunGlow: 0.3 };
        //     break;
        //   case 'topology':
        //     config = { ...config, points: 10, maxDistance: 20, spacing: 15, showDots: true };
        //     break;
        //   case 'halo':
        //     config = { ...config, baseColor: colors.primary, size: 1.2, speed: 0.6, amplitude: 0.8 };
        //     break;
        //   case 'rings':
        //     config = { ...config, spacing: 0.8, rotationSpeed: 0.6, size: 1.2 };
        //     break;
        //   default:
        //     break;
        // }

        vantaRef.current = effectFn(config);
      } catch (error) {
        console.error('Vanta initialization error:', error);
      }
    };

    initVanta();

    return () => {
      if (vantaRef.current) {
        vantaRef.current.destroy();
        vantaRef.current = null;
      }
    };
  }, [effect, theme]);

  return (
    <div className="fixed inset-0 w-full h-full -z-10 pointer-events-none">
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ 
          background: theme === 'dark' ? '#0f172a' : '#f8fafc',
          minHeight: '100vh',
          minWidth: '100vw',
        }}
      />
      <div className="relative z-10 w-full h-full pointer-events-auto">
        {children}
      </div>
    </div>
  );
};
