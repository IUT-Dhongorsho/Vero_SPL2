import React from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';

interface RiveBackgroundProps {
  src: string;
  className?: string;
}

export const RiveBackground: React.FC<RiveBackgroundProps> = ({ 
  src, 
  className = '' 
}) => {
  const { RiveComponent } = useRive({
    src,
    autoplay: true,
    layout: {
      fit: 'cover',
      alignment: 'center',
    },
  });

  return (
    <div className={`fixed inset-0 -z-10 w-full h-full ${className}`}>
      <RiveComponent className="w-full h-full" />
    </div>
  );
};
