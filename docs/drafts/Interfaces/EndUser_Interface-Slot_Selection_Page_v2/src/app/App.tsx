import { useState } from "react";

const SLOTS = [
  {
    id: 1,
    day: "Thursday",
    date: "April 17",
    time: "3:00 PM",
    duration: "60 min",
  },
  {
    id: 2,
    day: "Friday",
    date: "April 18",
    time: "10:00 AM",
    duration: "60 min",
  },
  {
    id: 3,
    day: "Saturday",
    date: "April 19",
    time: "9:00 AM",
    duration: "60 min",
  },
  {
    id: 4,
    day: "Monday",
    date: "April 21",
    time: "5:30 PM",
    duration: "60 min",
  },
];

type AppState = "default" | "selected" | "confirmed";

export default function App() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [appState, setAppState] = useState<AppState>("default");
  const [confirmed, setConfirmed] = useState(false);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    setAppState("selected");
  };

  const handleConfirm = () => {
    if (!selectedId) return;
    setConfirmed(true);
    setAppState("confirmed");
  };

  const isConfirmed = appState === "confirmed";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#faf8f5",
        fontFamily: "'DM Sans', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {isConfirmed ? (
          <ConfirmedView />
        ) : (
          <SelectionView
            selectedId={selectedId}
            onSelect={handleSelect}
            onConfirm={handleConfirm}
            isActive={appState === "selected"}
          />
        )}
      </div>
    </div>
  );
}

function SelectionView({
  selectedId,
  onSelect,
  onConfirm,
  isActive,
}: {
  selectedId: number | null;
  onSelect: (id: number) => void;
  onConfirm: () => void;
  isActive: boolean;
}) {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0",
      }}
    >
      {/* Heading area */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "52px",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#9e9589",
            marginBottom: "18px",
          }}
        >
          Homeward Breathwork
        </p>
        <h1
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "clamp(28px, 5vw, 38px)",
            fontWeight: 400,
            lineHeight: 1.25,
            color: "#1c2419",
            marginBottom: "14px",
            letterSpacing: "-0.01em",
          }}
        >
          Pick a time that works for you.
        </h1>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            fontWeight: 400,
            color: "#a09991",
            lineHeight: 1.6,
          }}
        >
          If none of these work, let us know.
        </p>
      </div>

      {/* Slot cards grid */}
      <SlotGrid selectedId={selectedId} onSelect={onSelect} />

      {/* Confirm button */}
      <div style={{ marginTop: "36px", width: "100%", maxWidth: "340px" }}>
        <button
          onClick={onConfirm}
          disabled={!isActive}
          style={{
            width: "100%",
            padding: "16px 32px",
            borderRadius: "9999px",
            border: "none",
            cursor: isActive ? "pointer" : "default",
            backgroundColor: isActive ? "#2d3d2e" : "#ddd8d0",
            color: isActive ? "#faf8f5" : "#b8b0a6",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "15px",
            fontWeight: 500,
            letterSpacing: "0.01em",
            transition: "background-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease",
            boxShadow: isActive
              ? "0 4px 20px rgba(45, 61, 46, 0.22)"
              : "none",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            if (isActive) {
              (e.target as HTMLButtonElement).style.backgroundColor = "#3a4f3b";
            }
          }}
          onMouseLeave={(e) => {
            if (isActive) {
              (e.target as HTMLButtonElement).style.backgroundColor = "#2d3d2e";
            }
          }}
        >
          Confirm
        </button>
      </div>

      {/* Fallback link */}
      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "#b0a89f", fontWeight: 400 }}>
          None of these work?{" "}
          <a
            href="mailto:hello@homewardbreathwork.com"
            style={{
              color: "#7a7268",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              textDecorationColor: "#c4bdb5",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLAnchorElement).style.color = "#2d3d2e")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLAnchorElement).style.color = "#7a7268")
            }
          >
            Let us know
          </a>
        </p>
      </div>
    </div>
  );
}

function SlotGrid({
  selectedId,
  onSelect,
}: {
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "16px",
        width: "100%",
      }}
      className="slot-grid"
    >
      {SLOTS.map((slot) => (
        <SlotCard
          key={slot.id}
          slot={slot}
          isSelected={selectedId === slot.id}
          onSelect={() => onSelect(slot.id)}
        />
      ))}

      <style>{`
        @media (max-width: 520px) {
          .slot-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function SlotCard({
  slot,
  isSelected,
  onSelect,
}: {
  slot: (typeof SLOTS)[0];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "28px 28px 26px",
        borderRadius: "18px",
        border: isSelected
          ? "1.5px solid #2d3d2e"
          : "1.5px solid #e8e2d9",
        backgroundColor: isSelected
          ? "rgba(45, 61, 46, 0.04)"
          : "rgba(255, 255, 255, 0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        cursor: "pointer",
        textAlign: "left",
        transition:
          "box-shadow 0.25s ease, border-color 0.25s ease, background-color 0.25s ease, transform 0.2s ease",
        boxShadow: isSelected
          ? "0 6px 28px rgba(45, 61, 46, 0.10), 0 0 0 4px rgba(45, 61, 46, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)"
          : hovered
          ? "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)"
          : "0 2px 10px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)",
        transform: isSelected
          ? "translateY(-2px)"
          : hovered
          ? "translateY(-1px)"
          : "translateY(0)",
        outline: "none",
      }}
    >
      {/* Selection indicator */}
      <div
        style={{
          position: "absolute",
          top: "18px",
          right: "18px",
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          border: isSelected ? "none" : "1.5px solid #d4cec7",
          backgroundColor: isSelected ? "#2d3d2e" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background-color 0.2s ease, border-color 0.2s ease",
          flexShrink: 0,
        }}
      >
        {isSelected && (
          <svg
            width="12"
            height="9"
            viewBox="0 0 12 9"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 4L4.5 7.5L11 1"
              stroke="#faf8f5"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Day + Date */}
      <p
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "14px",
          fontWeight: 400,
          color: isSelected ? "#2d3d2e" : "#6b6259",
          marginBottom: "10px",
          lineHeight: 1.3,
          transition: "color 0.2s ease",
          paddingRight: "32px",
        }}
      >
        {slot.day}, {slot.date}
      </p>

      {/* Time */}
      <p
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "clamp(26px, 4vw, 32px)",
          fontWeight: 400,
          color: isSelected ? "#1c2419" : "#2c2720",
          lineHeight: 1.1,
          marginBottom: "10px",
          letterSpacing: "-0.01em",
          transition: "color 0.2s ease",
        }}
      >
        {slot.time}
      </p>

      {/* Duration */}
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "12px",
          fontWeight: 400,
          color: "#b0a89f",
          letterSpacing: "0.04em",
          transition: "color 0.2s ease",
        }}
      >
        {slot.duration}
      </p>
    </button>
  );
}

function ConfirmedView() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 0",
        animation: "fadeIn 0.5s ease",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Soft check mark */}
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "rgba(45, 61, 46, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 32px",
        }}
      >
        <svg
          width="24"
          height="18"
          viewBox="0 0 24 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 9L8.5 15.5L22 2"
            stroke="#2d3d2e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1
        style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "clamp(32px, 6vw, 44px)",
          fontWeight: 400,
          color: "#1c2419",
          lineHeight: 1.2,
          marginBottom: "18px",
          letterSpacing: "-0.01em",
        }}
      >
        You're all set.
      </h1>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "15px",
          fontWeight: 400,
          color: "#a09991",
          lineHeight: 1.7,
          maxWidth: "320px",
          margin: "0 auto",
        }}
      >
        A confirmation will be sent to your email shortly.
      </p>
    </div>
  );
}
