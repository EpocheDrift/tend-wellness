import { BookingForm } from "./components/BookingForm";

export default function App() {
  return (
    /*
     * Preview context: simulates the surrounding Squarespace page.
     * The form itself has no background card — it sits flush on this surface.
     */
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#ede8de",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "80px 24px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: "520px" }}>
        {/* Simulated surrounding page text — gives context for the embed */}
        <p
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "0.75rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#7a7060",
            marginBottom: "1rem",
            marginTop: 0,
          }}
        >
          Work together
        </p>
        <h1
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "clamp(1.9rem, 5vw, 2.6rem)",
            fontWeight: 400,
            color: "#2c2c2c",
            lineHeight: 1.3,
            marginBottom: "1.25rem",
            marginTop: 0,
          }}
        >
          Let's find out if we're a good fit
        </h1>
        <p
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "1rem",
            color: "#5a5248",
            lineHeight: 1.8,
            marginBottom: "3.5rem",
            marginTop: 0,
            maxWidth: "440px",
          }}
        >
          I work with a small number of clients at a time, so I can give each
          person the care they deserve. Send a note and I'll be in touch within
          a day or two.
        </p>

        {/* ── Booking form embed ── */}
        <BookingForm />
      </div>
    </div>
  );
}
