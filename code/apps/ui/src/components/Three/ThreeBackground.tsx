import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, Float, Sphere, Box, Torus, TorusKnot, 
  MeshDistortMaterial, Stars, Sparkles, Environment, 
  Cylinder, Grid, GradientTexture
} from '@react-three/drei';
import { useTheme } from '../../context/ThemeContext';
import * as THREE from 'three';

// ============================================================
// 1. Abstract Humanoid Figure
// ============================================================
const HumanoidFigure: React.FC<{ 
  position: [number, number, number];
  color: string;
  scale?: number;
  speed?: number;
}> = ({ position, color, scale = 1, speed = 0.5 }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.position.y = position[1] + Math.sin(t * speed * 0.5) * 0.3;
      groupRef.current.rotation.y = t * 0.2;
      groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Head */}
      <Sphere position={[0, 0.9, 0]} args={[0.2, 16, 16]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.3} metalness={0.1} />
      </Sphere>
      {/* Body */}
      <Cylinder position={[0, 0.4, 0]} args={[0.25, 0.2, 0.5, 8]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} roughness={0.4} metalness={0.2} />
      </Cylinder>
      {/* Left arm */}
      <Cylinder position={[-0.35, 0.6, 0]} args={[0.04, 0.04, 0.3, 6]} rotation={[0, 0, 0.3]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} roughness={0.5} />
      </Cylinder>
      {/* Right arm */}
      <Cylinder position={[0.35, 0.6, 0]} args={[0.04, 0.04, 0.3, 6]} rotation={[0, 0, -0.3]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} roughness={0.5} />
      </Cylinder>
      {/* Left leg */}
      <Cylinder position={[-0.12, -0.15, 0]} args={[0.06, 0.05, 0.3, 6]} rotation={[0.05, 0, 0.1]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} roughness={0.5} />
      </Cylinder>
      {/* Right leg */}
      <Cylinder position={[0.12, -0.15, 0]} args={[0.06, 0.05, 0.3, 6]} rotation={[-0.05, 0, -0.1]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} roughness={0.5} />
      </Cylinder>
    </group>
  );
};

// ============================================================
// 2. Particle System
// ============================================================
const ParticleNetwork: React.FC<{ color: string; count?: number }> = ({ 
  color, 
  count = 120 
}) => {
  const meshRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 5 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
      pos[i * 3 + 2] = radius * Math.cos(phi) - 2;
    }
    return pos;
  }, [count]);

  const colors = useMemo(() => {
    const col = new Float32Array(count * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const variant = 0.8 + Math.random() * 0.4;
      col[i * 3] = c.r * variant;
      col[i * 3 + 1] = c.g * variant;
      col[i * 3 + 2] = c.b * variant;
    }
    return col;
  }, [count, color]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.02;
      meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.015) * 0.1;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

// ============================================================
// 3. Connecting Lines
// ============================================================
const ConnectingLines: React.FC<{ color: string; count?: number }> = ({ 
  color, 
  count = 60 
}) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 5 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
      pos[i * 3 + 2] = radius * Math.cos(phi) - 2;
    }
    return pos;
  }, [count]);

  const pairs = useMemo(() => {
    const pairs = [];
    const threshold = 2.5;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = positions[i*3] - positions[j*3];
        const dy = positions[i*3+1] - positions[j*3+1];
        const dz = positions[i*3+2] - positions[j*3+2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < threshold) {
          pairs.push(i, j);
        }
      }
    }
    return pairs;
  }, [positions, count]);

  const geometry = useMemo(() => {
    const vertices = [];
    for (let k = 0; k < pairs.length; k += 2) {
      const i = pairs[k];
      const j = pairs[k+1];
      vertices.push(
        positions[i*3], positions[i*3+1], positions[i*3+2],
        positions[j*3], positions[j*3+1], positions[j*3+2]
      );
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geom;
  }, [positions, pairs]);

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.25} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
};

// ============================================================
// 4. Central Core
// ============================================================
const CentralCore: React.FC<{ color: string }> = ({ color }) => {
  const meshRef = useRef<any>();
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.15;
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.25;
    }
  });

  return (
    <Float speed={0.4} rotationIntensity={0.8} floatIntensity={1}>
      <TorusKnot ref={meshRef} position={[0, 0, -2]} args={[0.4, 0.15, 64, 8]} scale={1}>
        <MeshDistortMaterial
          color={color}
          distort={0.4}
          speed={2}
          roughness={0.1}
          metalness={0.9}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </TorusKnot>
    </Float>
  );
};

// ============================================================
// 5. Floating Shapes
// ============================================================
const FloatingShapes: React.FC<{ colors: any }> = ({ colors }) => {
  const shapeConfigs = [
    { Component: TorusKnot, pos: [-4, 2.5, -5], color: colors.primary, scale: 0.8, speed: 0.6 },
    { Component: Torus, pos: [4, -2, -4], color: colors.secondary, scale: 0.9, speed: 0.7 },
    { Component: Box, pos: [-5, -1.5, -3], color: colors.accent, scale: 0.7, speed: 0.5 },
    { Component: Sphere, pos: [5, 2, -6], color: colors.primary, scale: 1.0, speed: 0.4 },
    { Component: TorusKnot, pos: [0, -3, -7], color: colors.accent, scale: 0.6, speed: 0.8 },
    { Component: Box, pos: [-3, 3.5, -8], color: colors.secondary, scale: 0.5, speed: 0.3 },
    { Component: Sphere, pos: [3, -3.5, -8], color: colors.primary, scale: 0.7, speed: 0.5 },
  ];

  return (
    <>
      {shapeConfigs.map((shape, i) => {
        const S = shape.Component;
        return (
          <Float key={i} speed={shape.speed} rotationIntensity={0.8} floatIntensity={0.7}>
            <S
              scale={shape.scale}
              args={S === TorusKnot ? [0.4, 0.15, 64, 8] : 
                    S === Torus ? [0.4, 0.15, 16, 32] :
                    S === Box ? [0.6, 0.6, 0.6] :
                    [0.5, 32, 32]}
            >
              <MeshDistortMaterial
                color={shape.color}
                distort={0.25}
                speed={1.5}
                roughness={0.2}
                metalness={0.7}
                emissive={shape.color}
                emissiveIntensity={0.15}
                transparent
                opacity={0.7}
              />
            </S>
          </Float>
        );
      })}
    </>
  );
};

// ============================================================
// 6. Glowing Rings
// ============================================================
const GlowingRings: React.FC<{ color: string }> = ({ color }) => {
  const ringRefs = useRef<any[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ringRefs.current.forEach((ref, index) => {
      if (ref) {
        const offset = index * 0.5;
        ref.rotation.x = Math.sin(t * 0.1 + offset) * 0.2;
        ref.rotation.z = Math.cos(t * 0.15 + offset) * 0.2;
        ref.scale.setScalar(1 + Math.sin(t * 0.2 + offset) * 0.03);
      }
    });
  });

  const ringData = [
    { radius: 2.2, opacity: 0.2, offset: 0 },
    { radius: 1.8, opacity: 0.15, offset: 0.5 },
    { radius: 2.6, opacity: 0.1, offset: 1.0 },
  ];

  return (
    <>
      {ringData.map((data, i) => (
        <Torus
          key={i}
          ref={(el) => (ringRefs.current[i] = el)}
          position={[0, 0, -2.5]}
          args={[data.radius, 0.02, 16, 100]}
        >
          <meshBasicMaterial color={color} transparent opacity={data.opacity} blending={THREE.AdditiveBlending} />
        </Torus>
      ))}
    </>
  );
};

// ============================================================
// 7. Floating Grid (using Grid from drei)
// ============================================================
const FloatingGrid: React.FC<{ color: string }> = ({ color }) => {
  const gridRef = useRef<any>();
  useFrame(({ clock }) => {
    if (gridRef.current) {
      gridRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.1) * 0.2;
    }
  });
  return (
    <Grid
      ref={gridRef}
      position={[0, -2, -3]}
      cellColor={color}
      cellSize={0.5}
      cellThickness={0.5}
      sectionColor={color}
      sectionSize={2}
      sectionThickness={1}
      fadeDistance={8}
      infiniteGrid
    />
  );
};

// ============================================================
// 8. Scene
// ============================================================
const Scene = React.memo(() => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const colors = useMemo(() => ({
    primary: isDark ? '#60A5FA' : '#2563EB',
    secondary: isDark ? '#A78BFA' : '#7C3AED',
    accent: isDark ? '#F472B6' : '#DB2777',
    particle: isDark ? '#93C5FD' : '#3B82F6',
    figure1: isDark ? '#FCD34D' : '#F59E0B',
    figure2: isDark ? '#6EE7B7' : '#10B981',
    figure3: isDark ? '#FCA5A5' : '#EF4444',
  }), [isDark]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1.2} color={colors.primary} />
      <pointLight position={[-5, -5, 5]} intensity={0.8} color={colors.secondary} />
      <pointLight position={[0, -3, 2]} intensity={0.5} color={colors.accent} />

      <Environment preset="city" />

      <Stars radius={20} depth={40} count={400} factor={4} saturation={0} fade speed={0.2} />

      <FloatingGrid color={colors.primary} />

      <ParticleNetwork color={colors.particle} count={150} />
      <ConnectingLines color={colors.particle} count={80} />

      <CentralCore color={colors.primary} />

      <FloatingShapes colors={colors} />

      <GlowingRings color={colors.primary} />

      <Sparkles count={60} scale={3} size={0.1} speed={0.5} opacity={0.6} color={colors.primary} />

      {/* Humanoid Figures */}
      <HumanoidFigure position={[-3.5, -0.5, -4]} color={colors.figure1} scale={0.6} speed={0.4} />
      <HumanoidFigure position={[3.8, 0.2, -5]} color={colors.figure2} scale={0.7} speed={0.6} />
      <HumanoidFigure position={[0, -0.8, -7]} color={colors.figure3} scale={0.5} speed={0.5} />
      <HumanoidFigure position={[-4.2, 0.5, -8]} color={colors.figure1} scale={0.4} speed={0.3} />
      <HumanoidFigure position={[4.5, -0.3, -6.5]} color={colors.figure2} scale={0.6} speed={0.7} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
        autoRotate={true}
        autoRotateSpeed={0.12}
        target={[0, 0, -2]}
      />
    </>
  );
});

// ============================================================
// 9. Exported Background
// ============================================================
export const ThreeBackground = React.memo(() => {
  return (
    <div className="fixed inset-0 z-0 w-full h-full pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        style={{ 
          background: 'transparent', 
          width: '100%', 
          height: '100%', 
          display: 'block' 
        }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
});
