import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Outlines } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import lockboxUrl from '/lockbox.glb?url';

interface LockBoxProps {
  onLockEngage?: () => void;
  onLockDisengage?: () => void;
  [key: string]: unknown;
}

// Create a gradient texture for toon shading (controls the shading steps)
function createToonGradientTexture(steps: number = 4): THREE.DataTexture {
  const colors = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) {
    colors[i] = Math.floor((i / (steps - 1)) * 255);
  }
  const texture = new THREE.DataTexture(colors, steps, 1, THREE.RedFormat);
  texture.needsUpdate = true;
  return texture;
}

export function LockBox({
  onLockEngage,
  onLockDisengage,
  isLocked,
  ...props
}: LockBoxProps) {
  const group = useRef<THREE.Group>(null!);
  const lockRef = useRef<THREE.Group>(null!);
  const keyRef = useRef<THREE.Group>(null!);
  const ledRef = useRef<THREE.Mesh>(null!);
  const ledLightRef = useRef<THREE.PointLight>(null!);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const isAnimating = useRef(false);

  const { nodes } = useGLTF(lockboxUrl);

  useEffect(() => {
    if (isLocked) {
      timelineRef.current?.play();
    } else {
      timelineRef.current?.reverse();
    }
  }, [isLocked]);

  // Create gradient map for toon shading (3 steps for classic cel-shaded look)
  const gradientMap = useMemo(() => createToonGradientTexture(4), []);

  // Create custom materials - cell shaded toon style
  const shinyMaterial = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: '#ddd',
        gradientMap: gradientMap,
        side: THREE.DoubleSide,
      }),
    [gradientMap]
  );

  const roughMaterial = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: '#bbb',
        gradientMap: gradientMap,
        side: THREE.DoubleSide,
      }),
    [gradientMap]
  );

  const blackMaterial = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: '#777',
        gradientMap: gradientMap,
        side: THREE.DoubleSide,
      }),
    [gradientMap]
  );

  const redLedMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        // MeshBasicMaterial ignores scene lighting - appears as pure color
        color: '#331111', // starts dim red
        side: THREE.DoubleSide,
      }),
    []
  );

  // Animation state object for GSAP to tween (read by useFrame)
  const animState = useRef({
    keyY: 0.3,
    rotation: 0,
    ledIntensity: 0,
  });

  // Setup GSAP timeline (only once on mount)
  useEffect(() => {
    const tl = gsap.timeline({
      paused: true,
      onComplete: () => {
        isAnimating.current = false;
      },
      onReverseComplete: () => {
        isAnimating.current = false;
      },
    });

    // 1️⃣ Key insertion (along Y axis)
    tl.to(animState.current, {
      keyY: -0.2,
      duration: 0.4,
      ease: 'power3.inOut',
    });

    // 2️⃣ Rotation (around Y axis) - 90 degrees
    tl.to(animState.current, {
      rotation: Math.PI / 2,
      duration: 0.6,
      ease: 'power2.inOut',
    });

    // 3️⃣ LED turns on (starts halfway through rotation)
    tl.to(
      animState.current,
      {
        ledIntensity: 1,
        duration: 0.4,
        ease: 'power2.out',
      },
      '-=0.3'
    );

    // Fire callbacks at 0.7s mark (halfway through key rotation)
    tl.call(
      () => {
        if (!tl.reversed()) {
          onLockEngage?.();
        } else {
          onLockDisengage?.();
        }
      },
      [],
      0.7
    );

    timelineRef.current = tl;

    // Play initially after a short delay
    const delayedCall = gsap.delayedCall(0.3, () => {
      isAnimating.current = true;
      tl.play();
    });

    return () => {
      delayedCall.kill();
      tl.kill();
    };
  }, []);

  // Use useFrame to apply animated values (synced with Three.js render loop)
  useFrame(() => {
    const state = animState.current;

    if (keyRef.current) {
      keyRef.current.position.y = state.keyY;
    }

    if (lockRef.current) {
      lockRef.current.rotation.y = state.rotation;
    }

    if (keyRef.current) {
      keyRef.current.rotation.y = state.rotation;
    }

    // LED color (MeshBasicMaterial - unaffected by scene lighting)
    redLedMaterial.color.setRGB(
      0.2 + 0.8 * state.ledIntensity,
      0.07 * (1 - state.ledIntensity),
      0.07 * (1 - state.ledIntensity)
    );

    // Point light casts red glow onto surrounding objects
    if (ledLightRef.current) {
      ledLightRef.current.intensity = state.ledIntensity * 1;
    }
  });

  // Handle click to toggle animation
  const handleClick = useCallback(() => {
    const tl = timelineRef.current;
    if (!tl || isAnimating.current) return;

    isAnimating.current = true;

    if (tl.progress() > 0) {
      // Currently locked - reverse to unlock
      tl.reverse();
      setTimeout(() => {
        tl.play();
      }, 350);
    } else {
      // Currently unlocked - play to lock
      tl.play();
      setTimeout(() => {
        tl.reverse();
      }, 150);
    }
  }, []);

  // Cast nodes to proper types for geometry access
  const ledShroudMesh = nodes.LedShroudMesh as THREE.Mesh;
  const ledMesh = nodes.Led as THREE.Mesh;
  const keyShroudMesh = nodes.KeyShroudMesh as THREE.Mesh;
  const lockMesh = nodes.LockMesh as THREE.Mesh;
  const topBoxMesh = nodes.TopBoxMesh as THREE.Mesh;
  const lowBoxMesh = nodes.LowBoxMesh as THREE.Mesh;

  // Get the rig transforms (Object3D nodes)
  const lockRig = nodes.Lock_Rig as THREE.Object3D;
  const keyRig = nodes.Key_Rig as THREE.Object3D;

  const keyMeshGroup = nodes.KeyMesh as THREE.Group;
  const keyMesh1 = keyMeshGroup.children[0] as THREE.Mesh;
  const keyMesh2 = keyMeshGroup.children[1] as THREE.Mesh;

  return (
    <group
      ref={group}
      {...props}
      dispose={null}
      onClick={handleClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {/* Box parts - grey */}
      {/* Visible mesh - receives shadows from other components */}
      <mesh
        geometry={topBoxMesh.geometry}
        material={roughMaterial}
        position={topBoxMesh.position}
        rotation={topBoxMesh.rotation}
        scale={topBoxMesh.scale}
        receiveShadow
      >
        <Outlines thickness={0.01} color="#000000" screenspace />
      </mesh>
      {/* Shadow-caster - invisible (colorWrite off) but casts shadows, slightly smaller to avoid self-shadowing */}
      <mesh
        geometry={topBoxMesh.geometry}
        position={topBoxMesh.position}
        rotation={topBoxMesh.rotation}
        scale={[
          (topBoxMesh.scale.x ?? 1) * 0.9,
          (topBoxMesh.scale.y ?? 1) * 0.9,
          (topBoxMesh.scale.z ?? 1) * 0.9,
        ]}
        castShadow
      >
        <meshBasicMaterial colorWrite={false} />
      </mesh>
      <mesh
        geometry={lowBoxMesh.geometry}
        material={roughMaterial}
        position={lowBoxMesh.position}
        rotation={lowBoxMesh.rotation}
        scale={lowBoxMesh.scale}
        // castShadow
      >
        <Outlines thickness={0.01} color="#000000" screenspace />
      </mesh>
      <mesh
        geometry={ledShroudMesh.geometry}
        material={shinyMaterial}
        position={ledShroudMesh.position}
        rotation={ledShroudMesh.rotation}
        scale={ledShroudMesh.scale}
        castShadow
      >
        <Outlines thickness={0.005} color="#000000" screenspace />
      </mesh>
      <mesh
        geometry={keyShroudMesh.geometry}
        material={shinyMaterial}
        position={keyShroudMesh.position}
        rotation={keyShroudMesh.rotation}
        scale={keyShroudMesh.scale}
        castShadow
      >
        <Outlines thickness={0.01} color="#000000" screenspace />
      </mesh>

      {/* LED - red with emissive */}
      <mesh
        ref={ledRef}
        geometry={ledMesh.geometry}
        material={redLedMaterial}
        position={ledMesh.position}
        rotation={ledMesh.rotation}
        scale={ledMesh.scale}
      ></mesh>

      {/* Point light at LED position to cast light on surrounding objects */}
      {/* <pointLight
        ref={ledLightRef}
        position={[ledMesh.position.x, ledMesh.position.y + 0.05, ledMesh.position.z]}
        color="#ff2222"
        intensity={0}
        distance={3}
        decay={1.5}
      /> */}

      {/* Lock with rig transform */}
      <group
        ref={lockRef}
        position={lockRig.position}
        rotation={lockRig.rotation}
        scale={lockRig.scale}
      >
        <mesh
          geometry={lockMesh.geometry}
          material={shinyMaterial}
          position={lockMesh.position}
          rotation={lockMesh.rotation}
          scale={lockMesh.scale}
          castShadow
        >
          <Outlines thickness={0.01} color="#000000" screenspace />
        </mesh>
      </group>

      {/* Key with rig transform (Key_Rig is child of Lock_Rig) */}
      <group
        ref={keyRef}
        position={lockRig.position}
        rotation={lockRig.rotation}
        scale={lockRig.scale}
      >
        <group
          position={keyRig.position}
          rotation={keyRig.rotation}
          scale={keyRig.scale}
        >
          {/* KeyMeshGroup transforms */}
          <group
            position={keyMeshGroup.position}
            rotation={keyMeshGroup.rotation}
            scale={keyMeshGroup.scale}
          >
            <mesh
              geometry={keyMesh1.geometry}
              material={blackMaterial}
              position={keyMesh1.position}
              rotation={keyMesh1.rotation}
              scale={keyMesh1.scale}
              castShadow
            >
              <Outlines thickness={0.05} color="#000000" screenspace />
            </mesh>
            <mesh
              geometry={keyMesh2.geometry}
              material={shinyMaterial}
              position={keyMesh2.position}
              rotation={keyMesh2.rotation}
              scale={keyMesh2.scale}
              castShadow
            ></mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload(lockboxUrl);
