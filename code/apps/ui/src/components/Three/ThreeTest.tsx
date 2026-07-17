import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Box } from '@react-three/drei';

export const ThreeTest: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 w-full h-full">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Box position={[0, 0, 0]} scale={1.5}>
          <meshStandardMaterial color="red" />
        </Box>
      </Canvas>
    </div>
  );
};
