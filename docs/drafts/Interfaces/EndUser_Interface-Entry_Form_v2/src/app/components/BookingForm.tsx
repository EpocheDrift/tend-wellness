import { useState } from "react";

interface FormState {
  name: string;
  email: string;
  message: string;
}

export function BookingForm() {
  const [form, setForm] = useState<FormState>({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const inputBase: React.CSSProperties = {
    fontFamily: "'Lora', Georgia, serif",
    fontSize: "1rem",
    color: "#2c2c2c",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid rgba(44, 44, 44, 0.25)",
    borderRadius: 0,
    outline: "none",
    width: "100%",
    padding: "10px 0 10px 0",
    transition: "border-color 0.2s ease",
    resize: "none",
  };

  const inputFocused: React.CSSProperties = {
    borderBottom: "1px solid rgba(44, 44, 44, 0.7)",
  };

  return (
    <div
      style={{
        backgroundColor: "#ede8de",
        fontFamily: "'Lora', Georgia, serif",
        color: "#2c2c2c",
        maxWidth: "520px",
        width: "100%",
        padding: "0",
        margin: "0 auto",
      }}
    >
      {/* Section label */}
      <p
        style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "0.75rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#7a7060",
          marginBottom: "2.5rem",
          marginTop: 0,
        }}
      >
        Book a Session
      </p>

      {!submitted ? (
        <form onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div style={{ marginBottom: "2.25rem" }}>
            <label
              htmlFor="name"
              style={{
                display: "block",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "0.8rem",
                color: "#7a7060",
                marginBottom: "0.5rem",
                letterSpacing: "0.04em",
              }}
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
              autoComplete="name"
              style={{
                ...inputBase,
                ...(focused === "name" ? inputFocused : {}),
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: "2.25rem" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "0.8rem",
                color: "#7a7060",
                marginBottom: "0.5rem",
                letterSpacing: "0.04em",
              }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              autoComplete="email"
              style={{
                ...inputBase,
                ...(focused === "email" ? inputFocused : {}),
              }}
            />
          </div>

          {/* Message */}
          <div style={{ marginBottom: "2.75rem" }}>
            <label
              htmlFor="message"
              style={{
                display: "block",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "0.8rem",
                color: "#7a7060",
                marginBottom: "0.5rem",
                letterSpacing: "0.04em",
              }}
            >
              Tell me a bit about what you're looking for
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              value={form.message}
              onChange={handleChange}
              onFocus={() => setFocused("message")}
              onBlur={() => setFocused(null)}
              style={{
                ...inputBase,
                display: "block",
                lineHeight: "1.65",
                paddingBottom: "0.5rem",
                borderBottom:
                  focused === "message"
                    ? "1px solid rgba(44, 44, 44, 0.7)"
                    : "1px solid rgba(44, 44, 44, 0.25)",
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "0.9rem",
              letterSpacing: "0.06em",
              color: "#ffffff",
              backgroundColor: "#2d3d2e",
              border: "none",
              borderRadius: "999px",
              padding: "13px 48px",
              cursor: "pointer",
              display: "block",
              transition: "background-color 0.2s ease, opacity 0.2s ease",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#243124")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2d3d2e")
            }
          >
            Send
          </button>
        </form>
      ) : (
        /* Confirmation message */
        <p
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "1rem",
            color: "#2c2c2c",
            lineHeight: "1.75",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          Got it — I'll take a look and follow up shortly.
        </p>
      )}
    </div>
  );
}
