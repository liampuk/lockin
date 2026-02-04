import { Suspense, useState, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, Grid } from "@react-three/drei";
import * as THREE from "three";
import { LockBox } from "./LockBox";

const UNLOCKED_COLOR = "#aaa";
const LOCKED_COLOR = "#555";
const ANIMATION_DURATION = 1; // 1000ms in seconds

function MouseFollowCamera() {
  const { camera } = useThree();
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });

  // Base camera position
  const basePosition = new THREE.Vector3(-5, 4, -1);
  // Calculate base angle and distance in XZ plane for proper orbital movement
  const baseAngle = Math.atan2(basePosition.z, basePosition.x);
  const baseDistanceXZ = Math.sqrt(basePosition.x ** 2 + basePosition.z ** 2);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position to -1 to 1
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame(() => {
    // Smoothly interpolate towards target
    targetRef.current.x += (mouseRef.current.x - targetRef.current.x) * 0.01;
    targetRef.current.y += (mouseRef.current.y - targetRef.current.y) * 0.03;

    // Horizontal orbit: adjust angle based on mouse X
    const angleOffset = targetRef.current.x * 0.15;
    const newAngle = baseAngle + angleOffset;

    // Calculate new X and Z positions (orbiting around Y axis)
    camera.position.x = Math.cos(newAngle) * baseDistanceXZ;
    camera.position.z = Math.sin(newAngle) * baseDistanceXZ;

    // Vertical tilt: adjust Y based on mouse Y
    camera.position.y = basePosition.y - targetRef.current.y * 0.5;

    // Always look at the center
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function AnimatedGrid({ isLocked }: { isLocked: boolean }) {
  const [gridColor, setGridColor] = useState(UNLOCKED_COLOR);
  const startColorRef = useRef(new THREE.Color(UNLOCKED_COLOR));
  const targetColorRef = useRef(new THREE.Color(UNLOCKED_COLOR));
  const currentColorRef = useRef(new THREE.Color(UNLOCKED_COLOR));
  const elapsedRef = useRef(0);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const startAnimation = () => {
      startColorRef.current.copy(currentColorRef.current);
      targetColorRef.current.set(isLocked ? LOCKED_COLOR : UNLOCKED_COLOR);
      elapsedRef.current = 0;
      isAnimatingRef.current = true;
    };

    if (isLocked) {
      startAnimation();
    } else {
      // Delay animation by 300ms when unlocking
      const timeout = setTimeout(startAnimation, 300);
      return () => clearTimeout(timeout);
    }
  }, [isLocked]);

  useFrame((_, delta) => {
    if (!isAnimatingRef.current) return;

    elapsedRef.current += delta;
    const t = Math.min(elapsedRef.current / ANIMATION_DURATION, 1);

    // Ease-out cubic for smooth animation
    const eased = 1 - Math.pow(1 - t, 3);

    currentColorRef.current
      .copy(startColorRef.current)
      .lerp(targetColorRef.current, eased);
    setGridColor("#" + currentColorRef.current.getHexString());

    if (t >= 1) {
      isAnimatingRef.current = false;
    }
  });

  return (
    <Grid
      position={[0, -0.599, 0]}
      args={[10, 10]}
      cellSize={0.5}
      cellThickness={1}
      cellColor={gridColor}
      sectionSize={2}
      sectionThickness={1}
      sectionColor={gridColor}
      fadeDistance={20}
      fadeStrength={1}
      infiniteGrid
    />
  );
}

interface SceneProps {
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
}

export default function Scene({ isLocked, setIsLocked }: SceneProps) {
  return (
    <div className="w-full h-full">
      <Canvas shadows style={{ background: "transparent" }}>
        <OrthographicCamera
          makeDefault
          position={[-5, 4, -1]}
          zoom={120}
          near={0.01}
          far={100}
        />

        <Suspense fallback={null}>
          <LockBox
            position={[0, 0, 0]}
            onLockEngage={() => setIsLocked(true)}
            onLockDisengage={() => setIsLocked(false)}
          />
        </Suspense>

        {/* Shadow-receiving ground plane */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.6, 0]}
          receiveShadow
        >
          <planeGeometry args={[10, 10]} />
          <shadowMaterial transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>

        {/* Grid */}
        <AnimatedGrid isLocked={isLocked} />

        {/* Lighting for toon shading */}
        <ambientLight intensity={0.3} />
        {/* Main light - on camera side so shadows fall away */}
        <directionalLight
          position={[-3, 3, 0.5]}
          intensity={1.3}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.1}
          shadow-camera-far={20}
          shadow-camera-left={-2}
          shadow-camera-right={2}
          shadow-camera-top={2}
          shadow-camera-bottom={-2}
          shadow-bias={-0.0001}
          shadow-normalBias={0.02}
        />
        {/* Fill light from opposite side for edge highlights */}
        <directionalLight position={[4, 3, 2]} intensity={0.6} color="#fff" />

        <MouseFollowCamera />
      </Canvas>
    </div>
  );
}
