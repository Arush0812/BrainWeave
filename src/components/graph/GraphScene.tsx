'use client';

import { useRef, useCallback } from 'react';
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import { GraphEdge3D } from './GraphEdge3D';
import { useGraphStore } from '@/store/graphStore';
import type { GraphNode } from '@/types';

// ─── Single Node mesh (no inner group, position handled by parent) ────────────

function NodeMesh({
  node,
  isSelected,
  isHovered,
  isConnectSource,
  isConnectTarget,
  onClick,
  onHover,
}: {
  node: GraphNode;
  isSelected: boolean;
  isHovered: boolean;
  isConnectSource: boolean;
  isConnectTarget: boolean;
  onClick: () => void;
  onHover: (over: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current || !glowRef.current) return;
    const time = state.clock.elapsedTime;

    // Scale
    const targetScale = isSelected || isConnectSource ? 1.35 : isHovered || isConnectTarget ? 1.15 : 1.0;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 10);

    // Glow
    const glowScale = isSelected || isConnectSource
      ? 1.9 + Math.sin(time * 3) * 0.2
      : isHovered || isConnectTarget
      ? 1.6 + Math.sin(time * 2) * 0.1
      : 1.3 + Math.sin(time * 1.5) * 0.05;
    glowRef.current.scale.setScalar(glowScale);

    // Emissive
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat) {
      const target = isSelected || isConnectSource ? 1.0 : isHovered || isConnectTarget ? 0.6 : 0.2;
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, target, delta * 6);
    }

    // Glow opacity
    const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
    if (glowMat) {
      const targetOpacity = isConnectSource ? 0.3 : isSelected ? 0.15 : isHovered ? 0.1 : 0.05;
      glowMat.opacity = THREE.MathUtils.lerp(glowMat.opacity, targetOpacity, delta * 6);
    }
  });

  // Pick the glow color: cyan for connect-source, normal otherwise
  const glowColor = isConnectSource ? '#22d3ee' : node.color;

  return (
    <>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.05} depthWrite={false} />
      </mesh>

      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(true); }}
        onPointerOut={() => onHover(false)}
        castShadow
      >
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial
          color={isConnectSource ? '#22d3ee' : node.color}
          emissive={isConnectSource ? '#22d3ee' : node.color}
          emissiveIntensity={0.2}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* Selection ring */}
      {(isSelected || isConnectSource) && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.38, 0.025, 8, 48]} />
          <meshBasicMaterial color={isConnectSource ? '#22d3ee' : node.color} transparent opacity={0.9} />
        </mesh>
      )}

      {/* Connect-target ring (dashed look via thin torus) */}
      {isConnectTarget && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.015, 8, 48]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} />
        </mesh>
      )}

      {/* Label */}
      <Text
        position={[0, 0.48, 0]}
        fontSize={0.12}
        color="white"
        anchorX="center"
        anchorY="bottom"
        maxWidth={2.5}
        outlineWidth={0.012}
        outlineColor="#000000"
      >
        {node.title.length > 22 ? node.title.slice(0, 22) + '…' : node.title}
      </Text>
    </>
  );
}

// ─── Draggable wrapper ────────────────────────────────────────────────────────

function DraggableNode({
  node,
  isSelected,
  isHovered,
  isConnectSource,
  isConnectTarget,
  onNodeClick,
  onHover,
  onDragEnd,
}: {
  node: GraphNode;
  isSelected: boolean;
  isHovered: boolean;
  isConnectSource: boolean;
  isConnectTarget: boolean;
  onNodeClick: (id: string) => void;
  onHover: (id: string | null) => void;
  onDragEnd: (id: string, x: number, y: number, z: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const pointerMoved = useRef(false);
  const dragPlane = useRef(new THREE.Plane());
  const { camera, gl } = useThree();

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      // In connect mode don't drag
      if (isConnectTarget || isConnectSource) return;
      e.stopPropagation();
      isDragging.current = true;
      pointerMoved.current = false;

      const normal = new THREE.Vector3();
      camera.getWorldDirection(normal);
      dragPlane.current.setFromNormalAndCoplanarPoint(
        normal,
        new THREE.Vector3(node.x, node.y, node.z)
      );

      gl.domElement.setPointerCapture(e.pointerId);
      gl.domElement.style.cursor = 'grabbing';
    },
    [isConnectTarget, isConnectSource, camera, gl, node.x, node.y, node.z]
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging.current || !groupRef.current) return;
      e.stopPropagation();
      pointerMoved.current = true;

      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const target = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(dragPlane.current, target)) {
        groupRef.current.position.set(target.x, target.y, target.z);
      }
    },
    [camera, gl]
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging.current) return;
      e.stopPropagation();
      isDragging.current = false;
      gl.domElement.style.cursor = 'default';

      if (groupRef.current && pointerMoved.current) {
        const pos = groupRef.current.position;
        onDragEnd(node.id, pos.x, pos.y, pos.z);
      }
    },
    [node.id, onDragEnd, gl]
  );

  return (
    <group
      ref={groupRef}
      position={[node.x, node.y, node.z]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <NodeMesh
        node={node}
        isSelected={isSelected}
        isHovered={isHovered}
        isConnectSource={isConnectSource}
        isConnectTarget={isConnectTarget}
        onClick={() => onNodeClick(node.id)}
        onHover={(over) => {
          onHover(over ? node.id : null);
          document.body.style.cursor = over
            ? isConnectTarget ? 'crosshair' : 'pointer'
            : 'default';
        }}
      />
    </group>
  );
}

// ─── Ambient particles ────────────────────────────────────────────────────────

function AmbientParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useRef(() => {
    const count = 200;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }).current();

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

// ─── Main scene ───────────────────────────────────────────────────────────────

function Scene({ onBackgroundClick }: { onBackgroundClick: () => void }) {
  const {
    nodes, edges,
    selectedNodeId, hoveredNodeId, connectingFromId,
    setSelectedNode, setHoveredNode, setConnectingFrom, addEdge, updateNodePosition,
  } = useGraphStore();

  // Unified node click handler — handles both select and connect modes
  const handleNodeClick = useCallback(
    async (id: string) => {
      // No connect mode — just select
      if (!connectingFromId) {
        setSelectedNode(id);
        return;
      }

      // Clicked the source node again → cancel
      if (connectingFromId === id) {
        setConnectingFrom(null);
        return;
      }

      // Connect source → this node
      try {
        const res = await fetch('/api/edges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromId: connectingFromId, toId: id }),
        });
        const data = await res.json();
        if (data.edge) {
          addEdge(data.edge);
        }
      } catch (err) {
        console.error('Failed to create edge:', err);
      } finally {
        setConnectingFrom(null);
      }
    },
    [connectingFromId, setSelectedNode, setConnectingFrom, addEdge]
  );

  const handleDragEnd = useCallback(
    async (id: string, x: number, y: number, z: number) => {
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
    },
    [updateNodePosition]
  );

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#818cf8" />
      <pointLight position={[-10, -10, -10]} intensity={0.4} color="#c084fc" />
      <pointLight position={[0, 10, -10]} intensity={0.3} color="#38bdf8" />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
      <AmbientParticles />
      <gridHelper args={[40, 40, '#1e293b', '#0f172a']} position={[0, -5, 0]} />

      {/* Edges */}
      {edges.map((edge) => {
        const fromNode = nodes.find((n) => n.id === edge.fromId);
        const toNode = nodes.find((n) => n.id === edge.toId);
        if (!fromNode || !toNode) return null;
        const isHighlighted = selectedNodeId === edge.fromId || selectedNodeId === edge.toId;
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
          isConnectSource={connectingFromId === node.id}
          isConnectTarget={!!connectingFromId && connectingFromId !== node.id}
          onNodeClick={handleNodeClick}
          onHover={setHoveredNode}
          onDragEnd={handleDragEnd}
        />
      ))}

      {/* Invisible background plane to catch deselect clicks */}
      <mesh position={[0, 0, -20]} onClick={onBackgroundClick} visible={false}>
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

// ─── Canvas export ────────────────────────────────────────────────────────────

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
