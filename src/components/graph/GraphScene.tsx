'use client';

import { useRef, useCallback, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { GraphEdge3D } from './GraphEdge3D';
import { useGraphStore } from '@/store/graphStore';
import type { GraphNode } from '@/types';

// ─── Node 3D visuals only (no interaction) ────────────────────────────────────

function Node3DVisual({
  node,
  isSelected,
  isHovered,
  isConnectSource,
  isConnectTarget,
}: {
  node: GraphNode;
  isSelected: boolean;
  isHovered: boolean;
  isConnectSource: boolean;
  isConnectTarget: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current || !glowRef.current || !groupRef.current) return;
    const t = state.clock.elapsedTime;
    const seed = node.id.charCodeAt(0) * 0.1;
    groupRef.current.position.y = node.y + Math.sin(t * 0.8 + seed) * 0.06;

    const targetScale = isSelected || isConnectSource ? 1.4 : isHovered || isConnectTarget ? 1.2 : 1.0;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 12);

    const gs = isSelected || isConnectSource ? 2.0 + Math.sin(t * 3) * 0.15 : isHovered ? 1.7 : 1.4;
    glowRef.current.scale.setScalar(gs);

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat) {
      const ei = isSelected || isConnectSource ? 1.0 : isHovered || isConnectTarget ? 0.6 : 0.25;
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, ei, delta * 8);
    }
  });

  const nodeColor = isConnectSource ? '#22d3ee' : node.color;

  return (
    <group ref={groupRef} position={[node.x, node.y, node.z]}>
      <mesh ref={glowRef} renderOrder={0}>
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshBasicMaterial color={nodeColor} transparent opacity={0.07} depthWrite={false} side={THREE.BackSide} />
      </mesh>

      <mesh ref={meshRef} renderOrder={1}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color={nodeColor} emissive={nodeColor} emissiveIntensity={0.25} roughness={0.2} metalness={0.6} />
      </mesh>

      {(isSelected || isConnectSource) && (
        <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={2}>
          <torusGeometry args={[0.38, 0.025, 8, 48]} />
          <meshBasicMaterial color={isConnectSource ? '#22d3ee' : node.color} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}

      {isConnectTarget && (
        <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={2}>
          <torusGeometry args={[0.42, 0.015, 8, 48]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      )}

      <Text position={[0, 0.5, 0]} fontSize={0.13} color="white" anchorX="center" anchorY="bottom"
        maxWidth={2.5} outlineWidth={0.012} outlineColor="#000" renderOrder={3}>
        {node.title.length > 22 ? node.title.slice(0, 22) + '…' : node.title}
      </Text>
    </group>
  );
}

// ─── Drag-only node (no click logic here) ────────────────────────────────────

function DragNode({
  node,
  isSelected,
  isHovered,
  isConnectSource,
  isConnectTarget,
  orbitRef,
  onDragEnd,
  onDragStart,
  onDragStop,
}: {
  node: GraphNode;
  isSelected: boolean;
  isHovered: boolean;
  isConnectSource: boolean;
  isConnectTarget: boolean;
  orbitRef: React.RefObject<OrbitControlsImpl>;
  onDragEnd: (id: string, x: number, y: number, z: number) => void;
  onDragStart: () => void;
  onDragStop: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pointerDown = useRef(false);
  const dragging = useRef(false);
  const downAt = useRef({ x: 0, y: 0 });
  const dragPlane = useRef(new THREE.Plane());
  const { camera, gl } = useThree();

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    pointerDown.current = true;
    dragging.current = false;
    downAt.current = { x: e.clientX, y: e.clientY };
    const normal = new THREE.Vector3();
    camera.getWorldDirection(normal);
    dragPlane.current.setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(node.x, node.y, node.z));
    gl.domElement.setPointerCapture(e.pointerId);
  }, [camera, gl, node.x, node.y, node.z]);

  const handlePointerMove = useCallback((e: any) => {
    if (!pointerDown.current || !groupRef.current) return;
    const dx = e.clientX - downAt.current.x;
    const dy = e.clientY - downAt.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) {
      if (!dragging.current) {
        dragging.current = true;
        onDragStart();
        if (orbitRef.current) orbitRef.current.enabled = false;
      }
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
  }, [camera, gl, onDragStart, orbitRef]);

  const handlePointerUp = useCallback((e: any) => {
    if (!pointerDown.current) return;
    pointerDown.current = false;
    document.body.style.cursor = 'default';
    if (dragging.current && groupRef.current) {
      const p = groupRef.current.position;
      onDragEnd(node.id, p.x, p.y, p.z);
      onDragStop();
      if (orbitRef.current) orbitRef.current.enabled = true;
    }
    dragging.current = false;
  }, [node.id, onDragEnd, onDragStop, orbitRef]);

  return (
    <group
      ref={groupRef}
      position={[node.x, node.y, node.z]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <Node3DVisual
        node={node}
        isSelected={isSelected}
        isHovered={isHovered}
        isConnectSource={isConnectSource}
        isConnectTarget={isConnectTarget}
      />
    </group>
  );
}

// ─── Particles ────────────────────────────────────────────────────────────────

function AmbientParticles() {
  const ref = useRef<THREE.Points>(null);
  const positions = useRef<Float32Array>((() => {
    const arr = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  })()).current;
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.02;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={200} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#6366f1" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// ─── Scene (3D only — no click handling) ─────────────────────────────────────

function Scene({
  orbitRef,
  hoveredNodeId,
  onDragStart,
  onDragStop,
}: {
  orbitRef: React.RefObject<OrbitControlsImpl>;
  hoveredNodeId: string | null;
  onDragStart: () => void;
  onDragStop: () => void;
}) {
  const { nodes, edges, selectedNodeId, connectingFromId, updateNodePosition } = useGraphStore();

  const handleDragEnd = useCallback(async (id: string, x: number, y: number, z: number) => {
    updateNodePosition(id, x, y, z);
    try {
      await fetch(`/api/nodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, z }),
      });
    } catch (err) {
      console.error(err);
    }
  }, [updateNodePosition]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.0} color="#818cf8" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#c084fc" />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
      <AmbientParticles />
      <gridHelper args={[40, 40, '#1e293b', '#0f172a']} position={[0, -5, 0]} />

      {edges.map((edge) => {
        const from = nodes.find((n) => n.id === edge.fromId);
        const to = nodes.find((n) => n.id === edge.toId);
        if (!from || !to) return null;
        return (
          <GraphEdge3D key={edge.id} edge={edge} fromNode={from} toNode={to}
            isHighlighted={selectedNodeId === edge.fromId || selectedNodeId === edge.toId} />
        );
      })}

      {nodes.map((node) => (
        <DragNode
          key={node.id}
          node={node}
          isSelected={selectedNodeId === node.id}
          isHovered={hoveredNodeId === node.id}
          isConnectSource={connectingFromId === node.id}
          isConnectTarget={!!connectingFromId && connectingFromId !== node.id}
          orbitRef={orbitRef}
          onDragEnd={handleDragEnd}
          onDragStart={onDragStart}
          onDragStop={onDragStop}
        />
      ))}

      <OrbitControls ref={orbitRef} enableDamping dampingFactor={0.05}
        rotateSpeed={0.5} zoomSpeed={0.8} panSpeed={0.8}
        minDistance={2} maxDistance={50} makeDefault />
    </>
  );
}

// ─── Projected overlay (inside Canvas context) ───────────────────────────────

function ProjectedPositions({
  onPositionsUpdate,
}: {
  onPositionsUpdate: (positions: Record<string, { x: number; y: number }>) => void;
}) {
  const { nodes } = useGraphStore();
  const { camera, size } = useThree();

  useFrame(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const vec = new THREE.Vector3();
    for (const node of nodes) {
      vec.set(node.x, node.y, node.z);
      vec.project(camera);
      positions[node.id] = {
        x: (vec.x * 0.5 + 0.5) * size.width,
        y: (-vec.y * 0.5 + 0.5) * size.height,
      };
    }
    onPositionsUpdate(positions);
  });

  return null;
}

// ─── Main exported component ──────────────────────────────────────────────────

export function GraphScene() {
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [screenPos, setScreenPos] = useState<Record<string, { x: number; y: number }>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const {
    nodes, selectedNodeId, connectingFromId,
    setSelectedNode, setHoveredNode, addEdge, setConnectingFrom,
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
      console.error(err);
    } finally {
      setConnectingFrom(null);
    }
  }, [connectingFromId, setSelectedNode, setConnectingFrom, addEdge]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        style={{ background: 'transparent' }}
      >
        <Scene
          orbitRef={orbitRef}
          hoveredNodeId={hoveredId}
          onDragStart={() => setIsDragging(true)}
          onDragStop={() => setIsDragging(false)}
        />
        <ProjectedPositions onPositionsUpdate={setScreenPos} />
      </Canvas>

      {/* HTML hit areas — absolutely positioned over each node */}
      {nodes.map((node) => {
        const pos = screenPos[node.id];
        if (!pos) return null;
        const isTarget = !!connectingFromId && connectingFromId !== node.id;

        return (
          <div
            key={node.id}
            className="absolute"
            style={{
              left: pos.x - 30,
              top: pos.y - 30,
              width: 60,
              height: 60,
              cursor: isTarget ? 'crosshair' : isDragging ? 'grabbing' : 'pointer',
              zIndex: 20,
              borderRadius: '50%',
              // debug: background: 'rgba(255,0,0,0.2)',
              pointerEvents: isDragging ? 'none' : 'auto',
            }}
            onClick={() => handleNodeClick(node.id)}
            onMouseEnter={() => {
              setHoveredId(node.id);
              setHoveredNode(node.id);
              if (!isDragging && orbitRef.current) orbitRef.current.enabled = false;
            }}
            onMouseLeave={() => {
              setHoveredId(null);
              setHoveredNode(null);
              if (!isDragging && orbitRef.current) orbitRef.current.enabled = true;
            }}
          />
        );
      })}

      {/* Transparent background layer — click to deselect, sits under node hit areas */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 6, pointerEvents: isDragging ? 'none' : 'auto' }}
        onClick={() => {
          setSelectedNode(null);
          setConnectingFrom(null);
          if (orbitRef.current) orbitRef.current.enabled = true;
        }}
      />
    </div>
  );
}
