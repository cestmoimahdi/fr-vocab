import { useGLTF, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

function Model({ object, selected, learningMode, target, message, onSelect }) {
  const { scene } = useGLTF(object.model);

  const group = useRef();

  const [hovered, setHovered] = useState(false);

  const isTarget = learningMode && target && object.id === target.id;

  const isCorrect = isTarget && message === "correct";

  // Smooth animation
  useFrame((state) => {
    if (!group.current) return;

    const wantedScale = selected || hovered ? 1.65 : 1.5;

    const current = group.current.scale.x;

    const next = THREE.MathUtils.lerp(current, wantedScale, 0.12);

    group.current.scale.set(next, next, next);

    // Gentle floating animation
    if (selected || hovered) {
      group.current.position.y =
        object.position[1] + Math.sin(state.clock.elapsedTime * 4) * 0.04;
    } else {
      group.current.position.y = object.position[1];
    }
  });

  return (
    <group
      ref={group}
      position={object.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(object);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();

        setHovered(true);

        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);

        document.body.style.cursor = "default";
      }}
    >
      {/* REAL GLB MODEL */}

      <primitive object={scene.clone()} castShadow receiveShadow />

      {/* SELECTION LIGHT */}

      {(selected || hovered) && (
        <pointLight position={[0, 1.5, 0]} intensity={3} distance={3} />
      )}

      {/* GLOWING FLOOR RING */}

      {(selected || isTarget) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.8, 1.0, 48]} />

          <meshBasicMaterial
            color={isCorrect ? "#22c55e" : "#6366f1"}
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* LEARNING MODE TARGET */}

      {isTarget && !message && (
        <pointLight
          position={[0, 2, 0]}
          intensity={5}
          distance={4}
          color="#6366f1"
        />
      )}

      {/* WORD LABEL */}

      {(hovered || selected) && (
        <Html position={[0, 2.1, 0]} center>
          <div className="model-label">
            <span>{object.name}</span>

            {selected && <span className="speaker">🔊</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

export default Model;
