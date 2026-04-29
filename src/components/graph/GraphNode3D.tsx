'use client';

import { useRef, useState, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import type { GraphNode } from '@/types';

interface GraphNode3DProps {
  node: GraphNode;
  isSelected: boolean;
  isHovered: boolean;
  isConnecting: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onDragEnd: (id: string, x: number, y: number, z: number) => void;
  onConnectClick: (id: string) => void;
}

export function GraphNode3D({
  node,
  isSelected,
  isHovered,
  isConnecting,
  onSelect,
  onHover,
  onDragEnd,
  onConnectClick,
}: GraphNode3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const isDragging = useRef(false);
  const dragStart = useRef<THREE.Vector3>(new THREE.Vector3());
  const [localPos] = useState(() => new THREE.Vector3(node.x, node.y, node.z));

  const color = new THREE.Color(node.color);
  const emissiveColor = color.clone().multiplyScalar(0.4);

  useFrame((state, delta) => {
    if (!meshRef.current || !glowRef.current) return;

    const time = state.clock.elapsedTime;

    // Pulse animation for selected/hovered
    const targetScale = isSelected ? 1.3 : isHovered ? 1.15 : 1.0;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      delta * 8
    );

    // Glow pulse
    const glowScale = isSelected
      ? 1.8 + Math.sin(time * 3) * 0.2
      : isHovered
      ? 1.5 + Math.sin(time * 2) * 0.1
      : 1.3 + Math.sin(time * 1.5) * 0.05;

    glowRef.current.scale.setScalar(glowScale);

    // Subtle float animation
    if (!isDragging.current) {
      const floatY = Math.sin(time * 0.8 + node.id.charCodeAt(0)) * 0.05;
      meshRef.current.position.y = localPos.y + floatY;
    }

    // Emissive intensity animation
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat) {
      const targetIntensity = isSelected ? 0.8 : isHovered ? 0.5 : 0.2;
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        targetIntensity,
        delta * 5
      );
    }
  });

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      isDragging.current = false;
      dragStart.current.set(e.point.x, e.point.y, e.point.z);
    },
    []
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (isConnecting) {
        onConnectClick(node.id);
      } else {
        onSelect(node.id);
      }
    },
    [isConnecting, node.id, onConnectClick, onSelect]
  );

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHover(node.id);
      document.body.style.cursor = isConnecting ? 'crosshair' : 'pointer';
    },
    [node.id, onHover, isConnecting]
  );

  const handlePointerOut = useCallback(() => {
    onHover(null);
    document.body.style.cursor = 'default';
  }, [onHover]);

  return (
    <group position={[localPos.x, localPos.y, localPos.z]}>
      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial
          color={node.color}
          transparent
          opacity={isSelected ? 0.15 : isHovered ? 0.1 : 0.05}
          depthWrite={false}
        />
      </mesh>

      {/* Main node sphere */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
      >
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={0.2}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* Ring for selected state */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.38, 0.02, 8, 32]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.8} />
        </mesh>
      )}

      {/* Label */}
      <Text
        position={[0, 0.45, 0]}
        fontSize={0.12}
        color="white"
        anchorX="center"
        anchorY="bottom"
        maxWidth={2}
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {node.title.length > 20 ? node.title.slice(0, 20) + '…' : node.title}
      </Text>
    </group>
  );
}
