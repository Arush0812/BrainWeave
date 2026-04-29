'use client';

import { useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { GraphNode3D } from './GraphNode3D';
import { GraphEdge3D } from './GraphEdge3D';
import { useGraphStore } from '@/store/graphStore';
import type { GraphNode } from '@/types';

// ─── Drag handler component ───────────────────────────────────────────────────

function DraggableNode({
  node,
  isSelected,
  isHovered,
  isConnecting,
  onSelect,
  onHover,
  onDragEnd,
  onConnectClick,
}: {
  node: GraphNode;
  isSelected: boolean;
  isHovered: boolean;
  isConnecting: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onDragEnd: (id: string, x: number, y: number, z: number) => void;
  onConnectClick: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const { camera, gl } = useThree();

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (isConnecting) return;
      e.stopPropagation();
      isDragging.current = true;
      gl.domElement.style.cursor = 'grabbing';

      // Update drag plane to face camera
      const normal = new THREE.Vector3();
      camera.getWorldDirection(normal);
      dragPlane.current.setFromNormalAndCoplanarPoint(
        normal,
        new THREE.Vector3(node.x, node.y, node.z)
      );
    },
    [isConnecting, camera, gl, node.x, node.y, node.z]
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging.current) return;
      e.stopPropagation();
      isDragging.current = false;
      gl.domElement.style.cursor = 'default';

      if (groupRef.current) {
        const pos = groupRef.current.position;
        onDragEnd(node.id, pos.x, pos.y, pos.z);
      }
    },
    [node.id, onDragEnd, gl]
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging.current || !groupRef.current) return;
      e.stopPropagation();

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(
        (e.clientX / gl.domElement.clientWidth) * 2 - 1,
        -(e.clientY / gl.domElement.clientHeight) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);

      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragPlane.current, target);

      if (target) {
        groupRef.current.position.set(target.x, target.y, target.z);
      }
    },
    [camera, gl]
  );

  return (
    <group
      ref={groupRef}
      position={[node.x, node.y, node.z]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <GraphNode3D
        node={node}
        isSelected={isSelected}
        isHovered={isHovered}
        isConnecting={isConnecting}
        onSelect={onSelect}
        onHover={onHover}
        onDragEnd={onDragEnd}
        onConnectClick={onConnectClick}
      />
    </group>
  );
}

// ─── Ambient particles ────────────────────────────────────────────────────────

function AmbientParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, count } = (() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return { positions, count };
  })();

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    pointsRef.current.rotation.x = state.clock.elapsedTime * 0.01;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#6366f1"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

function GridFloor() {
  return (
    <gridHelper
      args={[40, 40, '#1e293b', '#0f172a']}
      position={[0, -5, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

// ─── Main scene ───────────────────────────────────────────────────────────────

function Scene({
  onBackgroundClick,
}: {
  onBackgroundClick: () => void;
}) {
  const {
    nodes,
    edges,
    selectedNodeId,
    hoveredNodeId,
    connectingFromId,
    setSelectedNode,
    setHoveredNode,
    setConnectingFrom,
    updateNodePosition,
  } = useGraphStore();

  const handleDragEnd = useCallback(
    async (id: string, x: number, y: number, z: number) => {
      updateNodePosition(id, x, y, z);
      // Debounced save to API
      try {
        await fetch(`/api/nodes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x, y, z }),
        });
      } catch (err) {
        console.error('Failed to save position:', err);
      }
    },
    [updateNodePosition]
  );

  const handleConnectClick = useCallback(
    async (id: string) => {
      if (!connectingFromId) {
        setConnectingFrom(id);
        return;
      }

      if (connectingFromId === id) {
        setConnectingFrom(null);
        return;
      }

      // Create edge
      try {
        const res = await fetch('/api/edges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromId: connectingFromId, toId: id }),
        });
        const data = await res.json();
        if (data.edge) {
          useGraphStore.getState().addEdge(data.edge);
        }
      } catch (err) {
        console.error('Failed to create edge:', err);
      } finally {
        setConnectingFrom(null);
      }
    },
    [connectingFromId, setConnectingFrom]
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#818cf8" />
      <pointLight position={[-10, -10, -10]} intensity={0.4} color="#c084fc" />
      <pointLight position={[0, 10, -10]} intensity={0.3} color="#38bdf8" />

      {/* Background */}
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
      <AmbientParticles />
      <GridFloor />

      {/* Edges */}
      {edges.map((edge) => {
        const fromNode = nodes.find((n) => n.id === edge.fromId);
        const toNode = nodes.find((n) => n.id === edge.toId);
        if (!fromNode || !toNode) return null;

        const isHighlighted =
          selectedNodeId === edge.fromId || selectedNodeId === edge.toId;

        return (
          <GraphEdge3D
            key={edge.id}
            edge={edge}
            fromNode={fromNode}
            toNode={toNode}
            isHighlighted={isHighlighted}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => (
        <DraggableNode
          key={node.id}
          node={node}
          isSelected={selectedNodeId === node.id}
          isHovered={hoveredNodeId === node.id}
          isConnecting={!!connectingFromId && connectingFromId !== node.id}
          onSelect={setSelectedNode}
          onHover={setHoveredNode}
          onDragEnd={handleDragEnd}
          onConnectClick={handleConnectClick}
        />
      ))}

      {/* Click background to deselect */}
      <mesh
        position={[0, 0, -20]}
        onClick={onBackgroundClick}
        visible={false}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial />
      </mesh>

      <OrbitControls
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

// ─── Exported canvas ──────────────────────────────────────────────────────────

export function GraphScene() {
  const { setSelectedNode, setConnectingFrom } = useGraphStore();

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setConnectingFrom(null);
  }, [setSelectedNode, setConnectingFrom]);

  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      performance={{ min: 0.5 }}
      style={{ background: 'transparent' }}
    >
      <Scene onBackgroundClick={handleBackgroundClick} />
    </Canvas>
  );
}
