import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox, Sparkles } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';

const PRIMARY = '#e8590c';
const ACCENT = '#ff7a33';

function VugaMark() {
  const group = useRef();
  const knot = useRef();

  useFrame((state, delta) => {
    if (knot.current) {
      knot.current.rotation.x += delta * 0.25;
      knot.current.rotation.y += delta * 0.35;
    }
    if (group.current) {
      const { x, y } = state.pointer;
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, x * 0.35, 0.05);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -y * 0.25, 0.05);
    }
  });

  return (
    <group ref={group}>
      <Float speed={1.4} rotationIntensity={0.4} floatIntensity={1.1}>
        <mesh ref={knot} scale={1.15}>
          <torusKnotGeometry args={[1.1, 0.28, 120, 16]} />
          <meshStandardMaterial
            color={ACCENT}
            emissive={ACCENT}
            emissiveIntensity={0.6}
            roughness={0.15}
            metalness={0.85}
            wireframe
          />
        </mesh>

        <mesh scale={0.55}>
          <icosahedronGeometry args={[1.3, 1]} />
          <meshStandardMaterial
            color={PRIMARY}
            emissive={PRIMARY}
            emissiveIntensity={0.9}
            roughness={0.2}
            metalness={0.6}
            transparent
            opacity={0.85}
          />
        </mesh>
      </Float>

      <Sparkles count={40} scale={7} size={2.6} speed={0.4} color={ACCENT} opacity={0.7} />
    </group>
  );
}

function VideoPanel({ position, rotation, delay = 0 }) {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime + delay;
    ref.current.position.y = position[1] + Math.sin(t) * 0.25;
    ref.current.rotation.z = rotation[2] + Math.sin(t * 0.6) * 0.08;
  });

  return (
    <group ref={ref} position={position} rotation={rotation}>
      <RoundedBox args={[1.5, 0.95, 0.08]} radius={0.09} smoothness={4}>
        <meshStandardMaterial
          color="#26352f"
          emissive={ACCENT}
          emissiveIntensity={0.18}
          metalness={0.7}
          roughness={0.25}
          transparent
          opacity={0.92}
        />
      </RoundedBox>
      <mesh position={[0, 0, 0.06]}>
        <ringGeometry args={[0.22, 0.28, 32]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <circleGeometry args={[0.1, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function Rig() {
  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.pointer.x * 0.6, 0.04);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 0.4 + state.pointer.y * 0.4, 0.04);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function HeroScene() {
  return (
    <Canvas
      className="hero-canvas"
      camera={{ position: [0, 0.4, 6], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.35} />
        <pointLight position={[5, 5, 5]} intensity={1.4} color={ACCENT} />
        <pointLight position={[-5, -4, 2]} intensity={1.1} color={PRIMARY} />
        <directionalLight position={[0, 6, 4]} intensity={0.6} color="#ffffff" />

        <VugaMark />

        <VideoPanel position={[-3.1, 1.1, -0.8]} rotation={[0.05, 0.5, -0.12]} delay={0.2} />
        <VideoPanel position={[3.2, 0.6, -1]} rotation={[0.05, -0.5, 0.1]} delay={1.1} />
        <VideoPanel position={[-2.4, -1.6, -1.4]} rotation={[0.1, 0.35, 0.14]} delay={2.0} />
        <VideoPanel position={[2.6, -1.9, -1.2]} rotation={[0.1, -0.35, -0.1]} delay={2.8} />

        <Rig />
      </Suspense>
    </Canvas>
  );
}
