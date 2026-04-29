'use client';

import { useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { GraphEdge3D } from './GraphEdge3D';
import { useGraphStore } from '@/store/graphStore';
import type { GraphNode } from '@/types';

// ─── Single node (all interaction at this level) ──────────────────────────────

function Node3D({
  node,
  isSelected,
  isHovered,
  isConnectSource,
  isConnectTarget,
  orbitRef,
  onNodeClick,
  onHoverChange,
  onDragEnd,
}: {
  node: GraphNode;
  isSelected: boolean;
  isHovered: boolean;
  isConnectSource: boolean;
  isConnectTarget: boolean;
  orbitRef: React.RefObject<OrbitControlsImpl>;
  onNodeClick: (id: string) => void;
  onHoverChange: (id: string | null) => void;
  onDragEnd: (id: string, x: number, y: number, z: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Drag state
  const pointerDown = useRef(false);
  const dragging = useRef(false);
  const downAt = useRef({ x: 0, y: 0 });
  const dragPlane = useRef(new THREE.Plane());
  const { camera, gl } = useThree();

  // ── Animations ──────────────────────────────────────────────────────────────
  useFrame((state, delta) => {
    if (!meshRef.current || !glowRef.current || !groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Subtle float (only when not dragging)
    if (!dragging.current) {
      const seed = node.id.charCodeAt(0) * 0.1;
      groupRef.current.position.y = node.y + Math.sin(t * 0.8 + seed) * 0.06;
    }

    // Scale
    const targetScale = isSelected || isConnectSource ? 1.4 : isHovered || isConnectTarget ? 1.2 : 1.0;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      delta * 12
    );

    // Glow pulse
    const gs = isSelected || isConnectSource
      ? 2.0 + Math.sin(t * 3) * 0.15
      : isHovered ? 1.7 : 1.4;
    glowRef.current.scale.setScalar(gs);

    // Emissive
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat) {
      const ei = isSelected || isConnectSource ? 1.0 : isHovered || isConnectTarget ? 0.6 : 0.25;
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, ei, delta * 8);
    }
  });

  // ── Pointer handlers ─────────────────────────────────────────────────────────

  const onPointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHoverChange(node.id);
    document.body.style.cursor = isConnectTarget ? 'crosshair' : 'pointer';
    if (orbitRef.current) orbitRef.current.enabled = false;
  }, [node.id, onHoverChange, isConnectTarget, orbitRef]);

  const onPointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHoverChange(null);
    document.body.style.cursor = 'default';
    if (!dragging.current && orbitRef.current) orbitRef.current.enabled = true;
  }, [onHoverChange, orbitRef]);

  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    pointerDown.current = true;
    dragging.current = false;
    downAt.current = { x: e.clientX, y: e.clientY };

    if (orbitRef.current) orbitRef.current.enabled = false;

    // Set drag plane facing camera
    const normal = new THREE.Vector3();
    camera.getWorldDirection(normal);
    const worldPos = new THREE.Vector3(
      groupRef.current?.position.x ?? node.x,
      groupRef.current?.position.y ?? node.y,
      groupRef.current?.position.z ?? node.z,
    );
    dragPlane.current.setFromNormalAndCoplanarPoint(normal, worldPos);

    gl.domElement.setPointerCapture(e.pointerId);
  }, [camera, gl, node.x, node.y, node.z, orbitRef]);

  const onPointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!pointerDown.current || !groupRef.current) return;

    const dx = e.clientX - downAt.current.x;
    const dy = e.clientY - downAt.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 4) {
      dragging.current = true;
    }

    if (!dragging.current) return;
    e.stopPropagation();

    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(dragPlane.current, hit)) {
      groupRef.current.position.set(hit.x, hit.y, hit.z);
    }
    document.body.style.cursor = 'grabbing';
  }, [camera, gl]);

  const onPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!pointerDown.current) return;
    e.stopPropagation();

    const wasDragging = dragging.current;
    pointerDown.current = false;
    dragging.current = false;
    document.body.style.cursor = 'pointer';
    if (orbitRef.current) orbitRef.current.enabled = true;

    if (wasDragging && groupRef.current) {
      const p = groupRef.current.position;
      onDragEnd(node.id, p.x, p.y, p.z);
    } else {
      // It was a clean click
      onNodeClick(node.id);
    }
  }, [node.id, onNodeClick, onDragEnd, orbitRef]);

  const nodeColor = isConnectSource ? '#22d3ee' : node.color;

  return (
    <group
      ref={groupRef}
      position={[node.x, node.y, node.z]}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Glow halo — BackSide so it never occludes the main sphere */}
      <mesh ref={glowRef} renderOrder={0}>
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshBasicMaterial
          color={nodeColor}
          transparent
          opacity={isSelected || isConnectSource ? 0.18 : 0.07}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Main sphere */}
      <mesh ref={meshRef} renderOrder={1}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={0.25}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* Selection ring */}
      {(isSelected || isConnectSource) && (
        <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={2}>
          <torusGeometry args={[0.38, 0.025, 8, 48]} />
          <meshBasicMaterial
            color={isConnectSource ? '#22d3ee' : node.color}
            transparent opacity={0.9} depthWrite={false}
          />
        </mesh>
      )}

      {/* Connect-target ring */}
      {isConnectTarget && (
        <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={2}>
          <torusGeometry args={[0.42, 0.015, 8, 48]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      )}

      {/* Label */}
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.13}
        color="white"
        anchorX="center"
        anchorY="bottom"
        maxWidth={2.5}
        outlineWidth={0.012}
        outlineColor="#000"
        renderOrder={3}
      >
        {node.title.length > 22 ? node.title.slice(0, 22) + '…' : node.title}
      </Text>
    </group>
  );
}

// ─── Ambient particles ────────────────────────────────────────────────────────

function AmbientParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useRef<Float32Array>(
    (() => {
      const arr = new Float32Array(200 * 3);
      for (let i = 0; i < 200; i++) {
        arr[i * 3] = (Math.random() - 0.5) * 30;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 30;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
      }
      return arr;
    })()
  ).current;

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    pointsRef.current.rotation.x = state.clock.elapsedTime * 0.01;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={200} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#6366f1" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function Scene({ orbitRef }: { orbitRef: React.RefObject<OrbitControlsImpl> }) {
  const {
    nodes, edges,
    selectedNodeId, hoveredNodeId, connectingFromId,
    setSelectedNode, setHoveredNode, setConnectingFrom, addEdge, updateNodePosition,
  } = useGraphStore();

  const handleNodeClick = useCallback(async (id: string) => {
    if (!connectingFromId) {
      setSelectedNode(id);
      return;
    }
    if (connectingFromId === id) {
      setConnectingFrom(null);
      return;
    }
    try {
      const res = await fetch('/api/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromId: connectingFromId, toId: id }),
      });
      const data = await res.json();
      if (data.edge) addEdge(data.edge);
    } catch (err) {
      console.error('Failed to create edge:', err);
    } finally {
      setConnectingFrom(null);
    }
  }, [connectingFromId, setSelectedNode, setConnectingFrom, addEdge]);

  const handleDragEnd = useCallback(async (id: string, x: number, y: number, z: number) => {
    updateNodePosition(id, x, y, z);
    try {
      await fetch(`/api/nodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, z }),
      });
    } catch (err) {
      console.error('Failed to save position:', err);
    }
  }, [updateNodePosition]);

  const handleBgClick = useCallback(() => {
    setSelectedNode(null);
    setConnectingFrom(null);
    if (orbitRef.current) orbitRef.current.enabled = true;
  }, [setSelectedNode, setConnectingFrom, orbitRef]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.0} color="#818cf8" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#c084fc" />
      <pointLight position={[0, 10, -10]} intensity={0.4} color="#38bdf8" />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
      <AmbientParticles />
      <gridHelper args={[40, 40, '#1e293b', '#0f172a']} position={[0, -5, 0]} />

      {/* Edges */}
      {edges.map((edge) => {
        const from = nodes.find((n) => n.id === edge.fromId);
        const to = nodes.find((n) => n.id === edge.toId);
        if (!from || !to) return null;
        return (
          <GraphEdge3D
            key={edge.id}
            edge={edge}
            fromNode={from}
            toNode={to}
            isHighlighted={selectedNodeId === edge.fromId || selectedNodeId === edge.toId}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => (
        <Node3D
          key={node.id}
          node={node}
          isSelected={selectedNodeId === node.id}
          isHovered={hoveredNodeId === node.id}
          isConnectSource={connectingFromId === node.id}
          isConnectTarget={!!connectingFromId && connectingFromId !== node.id}
          orbitRef={orbitRef}
          onNodeClick={handleNodeClick}
          onHoverChange={setHoveredNode}
          onDragEnd={handleDragEnd}
        />
      ))}

      {/* Background plane — click to deselect */}
      <mesh position={[0, 0, -20]} onClick={handleBgClick} visible={false}>
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial />
      </mesh>

      <OrbitControls
        ref={orbitRef}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.8}
        minDistance={2}
        maxDistance={50}
        makeDefault
      />
    </>
  );
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

export function GraphScene() {
  const orbitRef = useRef<OrbitControlsImpl>(null);

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      performance={{ min: 0.5 }}
      style={{ background: 'transparent' }}
    >
      <Scene orbitRef={orbitRef} />
    </Canvas>
  );
}
