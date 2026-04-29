'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GraphNode, GraphEdge } from '@/types';

interface GraphEdge3DProps {
  edge: GraphEdge;
  fromNode: GraphNode;
  toNode: GraphNode;
  isHighlighted: boolean;
}

export function GraphEdge3D({ edge, fromNode, toNode, isHighlighted }: GraphEdge3DProps) {
  const lineRef = useRef<THREE.Line>(null);

  const points = useMemo(() => {
    const from = new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z);
    const to = new THREE.Vector3(toNode.x, toNode.y, toNode.z);

    // Create a slight curve
    const mid = from.clone().lerp(to, 0.5);
    mid.y += 0.3;

    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    return curve.getPoints(20);
  }, [fromNode.x, fromNode.y, fromNode.z, toNode.x, toNode.y, toNode.z]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  useFrame((state) => {
    if (!lineRef.current) return;
    const mat = lineRef.current.material as THREE.LineBasicMaterial;
    if (mat) {
      const time = state.clock.elapsedTime;
      const baseOpacity = isHighlighted ? 0.9 : 0.35;
      mat.opacity = baseOpacity + Math.sin(time * 2) * 0.05;
    }
  });

  const color = isHighlighted ? '#818cf8' : '#4f46e5';

  return (
    <primitive
      object={
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: isHighlighted ? 0.9 : 0.35,
            linewidth: 1,
          })
        )
      }
      ref={lineRef}
    />
  );
}
