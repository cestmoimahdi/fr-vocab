import { useState, useEffect } from "react";
import { createXRStore } from "@react-three/xr";
import Scene from "./Scene";
import ObjectLibrary from "./ObjectLibrary";
import objects from "./data/objects";
import "./styles.css";

const xrStore = createXRStore();

function App() {
  const [placedObjects, setPlacedObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [learningMode, setLearningMode] = useState(false);
  const [target, setTarget] = useState(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [arError, setArError] = useState(null);
  const [isEnteringAR, setIsEnteringAR] = useState(false);
  const [arSupported, setArSupported] = useState(false);

  useEffect(() => {
    async function checkAR() {
      if (!navigator.xr) {
        setArSupported(false);
        return;
      }

      try {
        const supported = await navigator.xr.isSessionSupported("immersive-ar");
        setArSupported(supported);
      } catch (error) {
        console.error("AR check failed:", error);
        setArSupported(false);
      }
    }

    checkAR();
  }, []);

  function handleLibrarySelect(object) {
    const alreadyPlaced = placedObjects.some(
      (placed) => placed.id === object.id,
    );
    if (alreadyPlaced) return;
    const newObject = {
      ...object,
      instanceId: crypto.randomUUID(),
      position: getNextObjectPosition(),
      rotation: [0, 0, 0],
      scale: 1,
    };
    setPlacedObjects((current) => [...current, newObject]);
    setSelectedObject(newObject);
    setFeedback(null);
  }

  function getNextObjectPosition() {
    const spacing = 1.6;
    const columns = 5;
    const startZ = -2;

    // Find the first grid position not occupied by an existing object.
    for (let index = 0; index < placedObjects.length + 100; index++) {
      const column = (index % columns) - Math.floor(columns / 2);
      const row = Math.floor(index / columns);

      const candidate = [column * spacing, 0, startZ - row * spacing];

      const occupied = placedObjects.some((placed) => {
        const position = placed.position || [0, 0, -2];
        const dx = position[0] - candidate[0];
        const dz = position[2] - candidate[2];

        return Math.hypot(dx, dz) < spacing * 0.9;
      });

      if (!occupied) {
        return candidate;
      }
    }

    // Fallback if the initial search area is full.
    return [0, 0, startZ - (placedObjects.length + 1) * spacing];
  }

  function placeObject() {
    if (!selectedObject) return;
    const newObject = {
      ...selectedObject,
      instanceId: crypto.randomUUID(),
      position: getNextObjectPosition(),
      rotation: [0, 0, 0],
      scale: 1,
    };
    setPlacedObjects((current) => [...current, newObject]);
  }

  function updateObjectPosition(instanceId, position) {
    setPlacedObjects((current) =>
      current.map((object) =>
        object.instanceId === instanceId ? { ...object, position } : object,
      ),
    );
  }

  function removeObject(instanceId) {
    setPlacedObjects((current) =>
      current.filter((object) => object.instanceId !== instanceId),
    );
    setSelectedObject(null);
  }

  function playAudio(object, type) {
    if (learningMode) return;
    if (!object[type]) return;
    const audio = new Audio(object[type]);
    audio.onerror = (error) => {
      console.error("Audio failed to load:", object[type], error);
    };
    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.error("Audio could not play:", error);
    });
  }

  function handleObjectSelect(object) {
    setSelectedObject(object);
    playAudio(object, "pronunciation");
  }

  function startLearning() {
    if (placedObjects.length === 0) {
      setFeedback({
        type: "warning",
        text: "Place some objects first.",
      });
      return;
    }
    setLearningMode(true);
    setScore(0);
    setFeedback(null);
  }

  async function enterAR() {
    setArError(null);
    setIsEnteringAR(true);
    try {
      if (!arSupported) throw Error;
      await xrStore.enterAR();
    } catch (error) {
      setArError(error);
    } finally {
      setIsEnteringAR(false);
    }
  }

  function exitLearning() {
    setLearningMode(false);
    setTarget(null);
    setFeedback(null);
    window.speechSynthesis.cancel();
  }

  function resetWorld() {
    setPlacedObjects([]);
    setSelectedObject(null);
    setTarget(null);
    setLearningMode(false);
    setFeedback(null);
    setScore(0);
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-icon">✦</div>
          <div className="brand-text">
            <h1>3D Language World</h1>
            <p>Learn words in augmented reality</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="secondary-button" onClick={resetWorld}>
            Reset
          </button>
          {!learningMode ? (
            <button className="learn-button" onClick={startLearning}>
              🎓 Learning Mode
            </button>
          ) : (
            <button className="learn-button active" onClick={exitLearning}>
              Exit Learning
            </button>
          )}
          <button
            className="ar-button"
            onClick={enterAR}
            disabled={isEnteringAR}
          >
            <span>⌁</span>
            {isEnteringAR ? "Starting AR..." : "Enter AR"}
          </button>
        </div>
      </header>
      <div className="content">
        {!learningMode && (
          <ObjectLibrary
            objects={objects}
            selectedObject={selectedObject}
            placedObjects={placedObjects}
            onSelect={handleLibrarySelect}
            reset={resetWorld}
          />
        )}
        <main className="world">
          <Scene
            xrStore={xrStore}
            objects={placedObjects}
            selectedObject={selectedObject}
            learningMode={learningMode}
            target={target}
            feedback={feedback}
            onSelect={handleObjectSelect}
            onPlace={placeObject}
            onRemove={removeObject}
            onMove={updateObjectPosition}
          />
          {learningMode && target && (
            <div className="learning-hud">
              <div className="hud-icon">🎯</div>
              <div className="hud-content">
                <span>FIND THIS OBJECT</span>
                <strong>{target.name}</strong>
              </div>
              <div className="hud-score">
                <small>SCORE</small>
                <strong>{score}</strong>
              </div>
            </div>
          )}
          {feedback && (
            <div className={`feedback ${feedback.type}`}>
              <div className="feedback-icon">
                {feedback.type === "correct" && "✓"}
                {feedback.type === "wrong" && "×"}
                {feedback.type === "warning" && "!"}
              </div>
              <span>{feedback.text}</span>
            </div>
          )}
          {selectedObject && !learningMode && (
            <div className="selected-object">
              <div className="selected-icon">{selectedObject.icon}</div>
              <div>
                <strong>
                  {selectedObject.sex === "m" ? "le " : "la "}
                  {selectedObject.translate}
                </strong>
                <span className="span-translate">{selectedObject.name}</span>
                <span
                  className={`badge ${selectedObject.sex === "m" ? "badge-m" : "badge-f"}`}
                  style={{ fontSize: "15px" }}
                >
                  {selectedObject.sex === "m" ? "♂" : "♀"}
                </span>
              </div>
            </div>
          )}
          {placedObjects.length === 0 && !learningMode && (
            <div className="world-hint">
              <div className="world-hint-icon">✦</div>
              <strong>Build your world</strong>
              <span>
                Select an object, then enter AR to place it in your environment.
              </span>
            </div>
          )}
          {arError && (
            <div className="ar-error-backdrop">
              <div className="ar-error">
                <div className="ar-error-icon">⌁</div>
                <h2>AR isn't available</h2>
                <p>This device doesn't support immersive augmented reality.</p>
                <div className="ar-error-hint">
                  <strong>For the AR experience</strong>
                  <span>
                    Open WordSpace on a compatible mobile device with AR
                    support.
                  </span>
                </div>
                <button
                  className="ar-error-button"
                  onClick={() => setArError(null)}
                >
                  Continue in 3D
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
