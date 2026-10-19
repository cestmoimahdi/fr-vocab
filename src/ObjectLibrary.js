import { useState } from "react";

// import "./ObjectLibrary.css";

function ObjectLibrary({
  objects,
  selectedObject,
  placedObjects,
  onSelect,
  reset,
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("animal");

  const categories = ["animal", "fruit", "home", "food", "vehicle"];

  const changeCategory = (category) => {
    setCategory(category);
    reset();
  };

  const filteredObjects = objects.filter((object) => {
    const matchesSearch = object.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory = object.category === category;

    return matchesSearch && matchesCategory;
  });

  return (
    <aside className="library">
      {/* HEADER */}

      <div className="library-header">
        <div>
          <h2>Objects</h2>

          <p>Choose an object to place</p>
        </div>

        <span className="object-count">{objects.length}</span>
      </div>

      {/* SEARCH */}

      <div className="search-box">
        <span>⌕</span>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search objects..."
        />
      </div>

      {/* CATEGORIES */}

      <div className="categories">
        {categories.map((item) => (
          <button
            key={item}
            className={category === item ? "category active" : "category"}
            onClick={() => changeCategory(item)}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>

      {/* OBJECTS */}

      <div className="object-grid">
        {filteredObjects.map((object) => {
          const isSelected = selectedObject?.id === object.id;
          const isPlaced = placedObjects.some(
            (placed) => placed.id === object.id,
          );

          return (
            <button
              key={object.id}
              className={[
                "library-object",

                isSelected ? "selected" : "",

                isPlaced ? "placed" : "",
              ].join(" ")}
              disabled={isPlaced}
              onClick={() => onSelect(object)}
            >
              {/* MODEL PREVIEW */}

              <div className="model-preview">
                <span className="object-icon">{object.icon}</span>

                <span className="badge badge-three">3D</span>

                <span
                  className={`badge ${object.sex === "m" ? "badge-m" : "badge-f"}`}
                  title={object.sex === "m" ? "Masculine" : "Feminine"}
                  aria-label={object.sex === "m" ? "Masculine" : "Feminine"}
                >
                  {object.sex === "m" ? "♂" : "♀"}
                </span>
              </div>

              {/* INFO */}

              <div className="object-info">
                <span className="object-name">{object.name}</span>

                <div className="object-translation">{object.translate}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* EMPTY */}

      {filteredObjects.length === 0 && (
        <div className="no-results">
          <span>🔎</span>

          <p>No objects found</p>
        </div>
      )}

      {/* HELP */}

      <div className="library-help">
        <div className="help-icon">✦</div>

        <div>
          <strong>Select an object</strong>

          <small>It will appear in AR ready to place.</small>
        </div>
      </div>
    </aside>
  );
}

export default ObjectLibrary;
