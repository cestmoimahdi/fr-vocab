import { useCallback, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Grid, OrbitControls, useGLTF } from "@react-three/drei";
import { XR, useXR, useXRHitTest } from "@react-three/xr";
import * as THREE from "three";

/* =========================================================
   PREPARE GLB
========================================================= */

const MAX_SIZE = 1.2;

function prepareModel(scene) {
  const cloned = scene.clone(true);

  cloned.position.set(0, 0, 0);
  cloned.rotation.set(0, 0, 0);
  cloned.scale.set(1, 1, 1);

  // Measure the original model.
  const box = new THREE.Box3().setFromObject(cloned);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = maxDimension > 0 ? MAX_SIZE / maxDimension : 1;

  // Normalize every model to the same maximum dimension.
  cloned.scale.setScalar(scale);

  // Place the model on the ground and center it.
  const scaledBox = new THREE.Box3().setFromObject(cloned);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  cloned.position.x -= center.x;
  cloned.position.z -= center.z;
  cloned.position.y -= scaledBox.min.y;

  return { scene: cloned, scale: 1 };
}

/* =========================================================
   3D OBJECT
========================================================= */

function DraggableObject({ object, selected, onSelect, onMove, onDragState }) {
  const { scene } = useGLTF(object.model);
  const prepared = useMemo(() => prepareModel(scene), [scene]);

  const dragPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    [],
  );

  const intersection = useMemo(() => new THREE.Vector3(), []);
  const pointerStart = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const didDrag = useRef(false);
  const pointerIdRef = useRef(null);

  function handlePointerDown(event) {
    event.stopPropagation();

    pointerStart.current = {
      x: event.clientX,
      y: event.clientY,
    };

    draggingRef.current = true;
    didDrag.current = false;
    pointerIdRef.current = event.pointerId;

    // Prevent the camera from moving while dragging this object.
    onDragState?.(true);

    try {
      event.target.setPointerCapture(event.pointerId);
    } catch (error) {
      console.debug("Pointer capture unavailable:", error);
    }
  }

  function handlePointerMove(event) {
    if (!draggingRef.current || pointerIdRef.current !== event.pointerId) {
      return;
    }

    event.stopPropagation();

    const dx = event.clientX - pointerStart.current.x;
    const dy = event.clientY - pointerStart.current.y;

    if (Math.hypot(dx, dy) > 5) {
      didDrag.current = true;
    }

    if (!didDrag.current) return;

    if (event.ray.intersectPlane(dragPlane, intersection)) {
      onMove?.(object.instanceId, [intersection.x, 0, intersection.z]);
    }
  }

  function finishPointer(event) {
    if (!draggingRef.current || pointerIdRef.current !== event.pointerId) {
      return;
    }

    event.stopPropagation();

    const wasDrag = didDrag.current;

    draggingRef.current = false;
    pointerIdRef.current = null;

    onDragState?.(false);

    try {
      event.target.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer may already have been released.
    }

    if (!wasDrag) {
      onSelect?.(object);
    }

    didDrag.current = false;
  }

  function handlePointerCancel(event) {
    if (pointerIdRef.current !== event.pointerId) return;

    draggingRef.current = false;
    pointerIdRef.current = null;
    didDrag.current = false;

    onDragState?.(false);
  }

  return (
    <group
      position={object.position || [0, 0, -2]}
      rotation={object.rotation || [0, 0, 0]}
      scale={object.scale || 1}
    >
      {/* Invisible hitbox: easier to grab large or complex models */}
      <mesh
        position={[0, MAX_SIZE / 2, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={handlePointerCancel}
      >
        <boxGeometry args={[MAX_SIZE, MAX_SIZE, MAX_SIZE]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          colorWrite={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <primitive object={prepared.scene} />

      {selected && <SelectionRing />}
    </group>
  );
}

// function ObjectModel({ object, selected, onSelect }) {
//   const { scene } = useGLTF(object.model);

//   const prepared = useMemo(() => prepareModel(scene), [scene]);

//   return (
//     <group
//       position={object.position || [0, 0, -2]}
//       rotation={object.rotation || [0, 0, 0]}
//       scale={prepared.scale * (object.scale || 1)}
//       onClick={(event) => {
//         event.stopPropagation();
//         onSelect(object);
//       }}
//       onPointerOver={() => {
//         document.body.style.cursor = "pointer";
//       }}
//       onPointerOut={() => {
//         document.body.style.cursor = "default";
//       }}
//     >
//       <primitive object={prepared.scene} />

//       {selected && <SelectionRing />}
//     </group>
//   );
// }

/* =========================================================
   SELECTION RING
========================================================= */

function SelectionRing() {
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}></mesh>;
}

/* =========================================================
   AR MODEL PREVIEW
========================================================= */

function ARModelPreview({ object, position }) {
  const { isPresenting } = useXR();

  const { scene } = useGLTF(object.model);

  const prepared = useMemo(() => prepareModel(scene), [scene]);

  if (!isPresenting || !position) {
    return null;
  }

  return (
    <group position={position} scale={prepared.scale * (object.scale || 1)}>
      <primitive object={prepared.scene} />
    </group>
  );
}

/* =========================================================
   3D FLOOR
========================================================= */

function VirtualFloor() {
  const { isPresenting } = useXR();

  if (isPresenting) {
    return null;
  }

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />

        <meshStandardMaterial color="#e9eaee" roughness={1} />
      </mesh>

      <Grid
        position={[0, 0.005, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        sectionSize={2}
        sectionThickness={1}
        fadeDistance={12}
        fadeStrength={1}
        infiniteGrid
      />
    </>
  );
}

/* =========================================================
   AR RETICLE
========================================================= */

function ARReticle({ onPosition }) {
  const { isPresenting } = useXR();

  const reticle = useRef();

  const matrix = useRef(new THREE.Matrix4());

  useXRHitTest(
    (results, getWorldMatrix) => {
      if (!reticle.current) {
        return;
      }

      if (!isPresenting || results.length === 0) {
        reticle.current.visible = false;

        return;
      }

      getWorldMatrix(matrix.current, results[0]);

      matrix.current.decompose(
        reticle.current.position,
        reticle.current.quaternion,
        reticle.current.scale,
      );

      reticle.current.visible = true;

      onPosition(reticle.current.position.clone());
    },

    "viewer",

    ["plane", "mesh"],
  );

  if (!isPresenting) {
    return null;
  }

  return (
    <group ref={reticle}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}></mesh>
    </group>
  );
}

/* =========================================================
   WORLD
========================================================= */

function WorldContent({
  objects,
  selectedObject,
  onSelect,
  onDragState,
  onMove,
}) {
  const [reticlePosition, setReticlePosition] = useState(null);

  const { isPresenting } = useXR();

  return (
    <>
      {/* LIGHTING */}

      <ambientLight intensity={1.5} />

      <hemisphereLight intensity={1} groundColor="#b8b8b8" />

      <directionalLight
        position={[4, 6, 4]}
        intensity={4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Environment preset="city" />

      {/* 3D FLOOR */}

      <VirtualFloor />

      {/* AR RETICLE */}

      <ARReticle onPosition={setReticlePosition} />

      {/* AR PREVIEW */}

      {selectedObject && isPresenting && (
        <ARModelPreview object={selectedObject} position={reticlePosition} />
      )}

      {/* PLACED OBJECTS */}

      {objects.map((object) => (
        <DraggableObject
          key={object.instanceId}
          object={object}
          selected={selectedObject?.instanceId === object.instanceId}
          onSelect={onSelect}
          onMove={onMove}
          onDragState={onDragState}
        />
      ))}
    </>
  );
}

/* =========================================================
   SCENE
========================================================= */

export default function Scene({
  xrStore,
  objects,
  selectedObject,
  onSelect,
  onMove,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const controlsRef = useRef(null);

  const handleDragState = useCallback((dragging) => {
    setIsDragging(dragging);

    if (controlsRef.current) {
      controlsRef.current.enabled = !dragging;
    }
  }, []);
  return (
    <div className="ar-scene">
      <Canvas
        shadows
        camera={{
          position: [0, 2.2, 4.5],

          fov: 50,
        }}
        gl={{
          antialias: true,
          alpha: true,
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1,
        }}
        dpr={[1, 2]}
      >
        <XR store={xrStore}>
          <WorldContent
            objects={objects}
            selectedObject={selectedObject}
            onSelect={onSelect}
            onMove={onMove}
            onDragState={handleDragState}
          />

          <OrbitControls
            ref={controlsRef}
            enabled={!isDragging}
            enableDamping
            minDistance={2}
            maxDistance={13}
            maxPolarAngle={Math.PI / 2.05}
          />
        </XR>
      </Canvas>

      <div className="scene-mode">
        <span className="mode-dot" />
        3D MODE
      </div>
    </div>
  );
}
