import { useState, useRef, useEffect } from "react";

/*
  DB Schema (MySQL)
  Table: survey_responses
    id          INT          PRIMARY KEY AUTO_INCREMENT
    space_type  VARCHAR(100) NOT NULL        -- "Living Room"
    vibes       JSON         NOT NULL        -- ["Calm", "Cozy"]
    color_hex   VARCHAR(7)   NOT NULL        -- "#a3c4f3"
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
*/

const VIBES = ["Calm", "Cozy", "Minimal", "Energetic", "Playful", "Elegant", "Creative", "Fresh", "Bold", "Warm"];

// generates a full-spectrum color grid (20 cols x 10 rows)
function buildColorGrid() {
  const colors = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 20; col++) {
      const h = Math.round((col / 20) * 360);
      const l = 70 - row * 5;
      colors.push(`hsl(${h}, 75%, ${l}%)`);
    }
  }
  return colors;
}

const COLORS = buildColorGrid();

export default function ColorSurvey() {
  const [vibes, setVibes] = useState([]);
  const [color, setColor] = useState(null);
  const [hoveredColor, setHoveredColor] = useState(null);
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 });
  const [submitted, setSubmitted] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const hideTimer = useRef(null);

  // mobile-first: on small screens collapse grid from 20 to 10 columns
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @media (min-width: 480px) {
        .color-grid { grid-template-columns: repeat(20, 1fr) !important; }
        .survey-wrap { padding: 20px !important; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  function toggleVibe(v) {
    setVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  function onColorHover(c, e) {
    clearTimeout(hideTimer.current);
    const r = e.target.getBoundingClientRect();
    setBubblePos({ x: r.left + r.width / 2, y: r.top });
    setHoveredColor(c);
  }

  function onColorLeave() {
    hideTimer.current = setTimeout(() => setHoveredColor(null), 150);
  }

  function handleSubmit() {
    // in production: POST /api/survey with { space_type, vibes, color_hex }
    const response = {
      space_type: "Living Room",
      vibes,
      color_hex: color,
      created_at: new Date().toISOString(),
    };
    console.log("Saving response:", response);
    // localStorage as stand-in for DB insert
    const saved = JSON.parse(localStorage.getItem("survey_responses") || "[]");
    localStorage.setItem("survey_responses", JSON.stringify([...saved, response]));
    setSubmitted(true);
  }

  if (showResponses) {
    const responses = JSON.parse(localStorage.getItem("survey_responses") || "[]");
    return (
      <div style={styles.wrap}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Saved Responses ({responses.length})</h3>
          <button style={styles.linkBtn} onClick={() => setShowResponses(false)}>← Back</button>
        </div>
        {responses.length === 0 && <p style={{ color: "#999", fontSize: 13 }}>No responses yet.</p>}
        {responses.map((r, i) => (
          <div key={i} style={{ borderTop: "1px solid #eee", padding: "10px 0", fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: 3, background: r.color_hex, border: "1px solid #ddd" }} />
              <span>{r.color_hex}</span>
              <span style={{ color: "#999" }}>—</span>
              <span>{r.vibes.join(", ")}</span>
            </div>
            <div style={{ color: "#bbb", fontSize: 11, marginTop: 3 }}>{r.created_at}</div>
          </div>
        ))}
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={styles.wrap}>
        <h3>Response saved!</h3>
        <p>Space: Living Room</p>
        <p>Vibes: {vibes.join(", ")}</p>
        <p>Color: <span style={{ background: color, padding: "2px 10px", borderRadius: 4 }}>{color}</span></p>
        <button style={styles.btn} onClick={() => { setVibes([]); setColor(null); setSubmitted(false); }}>
          Start over
        </button>
        <button style={{ ...styles.linkBtn, display: "block", marginTop: 12 }} onClick={() => setShowResponses(true)}>
          View all responses
        </button>
      </div>
    );
  }

  return (
    <div className="survey-wrap" style={styles.wrap}>

      {/* Hover bubble */}
      {hoveredColor && (
        <div style={{
          position: "fixed",
          left: bubblePos.x, top: bubblePos.y - 40,
          transform: "translateX(-50%)",
          background: hoveredColor,
          border: "1px solid #ccc",
          padding: "3px 10px",
          borderRadius: 12,
          fontSize: 11,
          pointerEvents: "none",
          zIndex: 100,
        }}>
          {hoveredColor}
        </div>
      )}

      {/* Q1: Vibe selection */}
      <p style={styles.label}>Vibes for your space: Which do you associate best with your <b>Living Room</b>?</p>
      <div style={styles.vibeRow}>
        {VIBES.map(v => (
          <button
            key={v}
            onClick={() => toggleVibe(v)}
            style={{ ...styles.vibeBtn, background: vibes.includes(v) ? "#333" : "#fff", color: vibes.includes(v) ? "#fff" : "#333" }}
          >
            {v}
          </button>
        ))}
      </div>

      <hr style={{ margin: "20px 0", borderColor: "#eee" }} />

      {/* Q2: Color selection */}
      <p style={styles.label}>Colors for vibes: Which colour do you associate with your selections?</p>
      <div className="color-grid" style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 2, marginBottom: 12 }}>
        {COLORS.map((c, i) => (
          <div
            key={i}
            onClick={() => setColor(c)}
            onMouseEnter={(e) => onColorHover(c, e)}
            onMouseLeave={onColorLeave}
            onTouchStart={(e) => {
              const t = e.touches[0];
              setBubblePos({ x: t.clientX, y: t.clientY });
              setHoveredColor(c);
              setColor(c);
            }}
            onTouchEnd={() => setTimeout(() => setHoveredColor(null), 800)}
            style={{
              aspectRatio: "1",
              background: c,
              cursor: "pointer",
              outline: color === c ? "2px solid #000" : "none",
              outlineOffset: -2,
            }}
          />
        ))}
      </div>

      {/* Selected color + space label */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 13 }}>
        <span>Living Room</span>
        <span style={{ background: color || "#eee", padding: "2px 10px", borderRadius: 4, fontSize: 12 }}>
          {color || "none selected"}
        </span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!vibes.length || !color}
        style={{ ...styles.btn, opacity: vibes.length && color ? 1 : 0.4 }}
      >
        Submit
      </button>
    </div>
  );
}

const styles = {
  wrap: { maxWidth: 520, margin: "30px auto", padding: 20, fontFamily: "sans-serif" },
  label: { fontSize: 14, marginBottom: 12 },
  vibeRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  vibeBtn: { padding: "6px 14px", border: "1px solid #ccc", borderRadius: 20, cursor: "pointer", fontSize: 13 },
  linkBtn: { background: "none", border: "none", color: "#666", fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: 0 },
  btn: { width: "100%", padding: 10, background: "#333", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 },
};
