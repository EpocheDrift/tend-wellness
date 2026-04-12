import React, { useState } from 'react';
import { Tag } from './Tag';

const OLIVE = '#2d3d2e';
const MUTED = '#9e9890';
const BORDER = '#e8e2d9';
const RED = '#b85c4a';

type TimelineEntry =
  | { type: 'event'; time: string; text: string }
  | { type: 'state_change'; time: string; text: string }
  | { type: 'system_note'; time: string; text: string };

const timeline: TimelineEntry[] = [
  { type: 'event', time: 'Apr 9, 8:00 AM', text: 'Booking confirmed' },
  { type: 'event', time: 'Apr 9, 11:42 AM', text: 'Tom requested cancellation' },
  { type: 'state_change', time: 'Apr 9, 11:43 AM', text: 'Case moved to: Cancellation requested' },
  {
    type: 'system_note',
    time: 'Apr 9, 11:43 AM',
    text: 'System escalated to you — no draft generated',
  },
];

export function CaseDetailTom() {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* LEFT COLUMN — Timeline */}
      <div
        style={{
          flex: '0 0 60%',
          borderRight: `1px solid ${BORDER}`,
          overflowY: 'auto',
          padding: '32px 36px',
        }}
      >
        <div
          style={{
            color: '#2a2a2a',
            fontSize: 15,
            fontWeight: 500,
            marginBottom: 28,
          }}
        >
          Activity
        </div>

        <div style={{ position: 'relative' }}>
          {/* Vertical line */}
          <div
            style={{
              position: 'absolute',
              left: 6,
              top: 8,
              bottom: 8,
              width: 1,
              background: BORDER,
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {timeline.map((entry, i) => (
              <TimelineRow key={i} entry={entry} isLast={i === timeline.length - 1} />
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN — Status + Actions + Escalation */}
      <div
        style={{
          flex: '0 0 40%',
          overflowY: 'auto',
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* TOP — Case Status Card (Liquid Glass) */}
        <div
          style={{
            background: 'rgba(255,255,255,0.68)',
            backdropFilter: 'blur(16px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
            border: '1px solid rgba(255,255,255,0.7)',
            borderRadius: 12,
            padding: '20px 22px',
            boxShadow: '0 2px 20px rgba(45,61,46,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 500, color: '#1e1e1e', marginBottom: 2 }}>
            Tom R.
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>tom@example.com</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                background: '#f9e5e3',
                color: '#7a3028',
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 20,
                letterSpacing: '0.01em',
              }}
            >
              Cancellation requested
            </span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: MUTED,
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}
          >
            Escalated to you — the system has stepped back
          </div>
        </div>

        {/* MIDDLE — Available Actions */}
        <div
          style={{
            background: '#ffffff',
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: '18px 20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: MUTED,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Available Actions
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ActionButton label="Send Cancellation Reply" variant="primary" tag="DRAFT" onClick={() => {}} />
            <ActionButton label="Confirm Cancellation" variant="outline" tag="MANUAL" onClick={() => {}} />
            <ActionButton label="Offer to Reschedule" variant="outline" tag="DRAFT" onClick={() => {}} />
            <ActionButton label="Escalate Further" variant="ghost" tag="MANUAL" onClick={() => {}} />
          </div>
        </div>

        {/* BOTTOM — Escalation Notice */}
        {!acknowledged ? (
          <EscalationNotice onAcknowledge={() => setAcknowledged(true)} />
        ) : (
          <div
            style={{
              background: '#faf5f0',
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: '16px 20px',
              fontSize: 13,
              color: MUTED,
              lineHeight: 1.5,
            }}
          >
            Escalation acknowledged. The system is waiting for you to manually update this case.
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineRow({ entry, isLast }: { entry: TimelineEntry; isLast: boolean }) {
  if (entry.type === 'state_change') {
    return (
      <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: 13,
              height: 13,
              borderRadius: '50%',
              border: '1px solid #c8c0b5',
              background: '#f0ece5',
              flexShrink: 0,
              marginTop: 2,
              zIndex: 1,
            }}
          />
        </div>
        <div
          style={{
            flex: 1,
            background: 'rgba(232,226,217,0.35)',
            borderRadius: 6,
            padding: '8px 12px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 10, color: '#b0a89a', marginBottom: 3 }}>{entry.time}</div>
          <div style={{ fontSize: 12, color: '#7a7060', fontStyle: 'italic' }}>{entry.text}</div>
        </div>
      </div>
    );
  }

  if (entry.type === 'system_note') {
    return (
      <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: 13,
              height: 13,
              borderRadius: '50%',
              background: RED,
              flexShrink: 0,
              marginTop: 2,
              zIndex: 1,
            }}
          />
        </div>
        <div
          style={{
            flex: 1,
            background: '#fdf0ee',
            border: '1px solid #f0ccc8',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 10, color: '#b0a89a', marginBottom: 4 }}>{entry.time}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13, color: '#5a2020', fontWeight: 500 }}>{entry.text}</div>
            <Tag type="MANUAL" />
          </div>
        </div>
      </div>
    );
  }

  // event
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: 13,
            height: 13,
            borderRadius: '50%',
            border: '1.5px solid #c8c0b5',
            background: '#ffffff',
            flexShrink: 0,
            marginTop: 2,
            zIndex: 1,
          }}
        />
      </div>
      <div style={{ flex: 1, paddingBottom: 20 }}>
        <div style={{ fontSize: 10, color: '#b0a89a', marginBottom: 4 }}>{entry.time}</div>
        <div style={{ fontSize: 13, color: '#3a3a3a' }}>{entry.text}</div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  variant,
  tag,
  onClick,
}: {
  label: string;
  variant: 'primary' | 'outline' | 'ghost';
  tag: 'DRAFT' | 'MANUAL' | 'AUTO';
  onClick: () => void;
}) {
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '9px 14px',
    borderRadius: 20,
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 500,
    transition: 'opacity 0.1s',
    border: 'none',
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: { background: OLIVE, color: '#ffffff' },
    outline: {
      background: 'transparent',
      color: OLIVE,
      border: `1.5px solid ${OLIVE}`,
    },
    ghost: {
      background: 'transparent',
      color: MUTED,
      border: `1.5px solid ${BORDER}`,
    },
  };

  return (
    <button onClick={onClick} style={{ ...baseStyle, ...variants[variant] }}>
      <span>{label}</span>
      <Tag type={tag} />
    </button>
  );
}

function EscalationNotice({ onAcknowledge }: { onAcknowledge: () => void }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${RED}`,
        borderRadius: 10,
        padding: '18px 20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      }}
    >
      {/* Label */}
      <div style={{ marginBottom: 12 }}>
        <span
          style={{
            display: 'inline-flex',
            background: '#f9e5e3',
            color: '#7a3028',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            letterSpacing: '0.06em',
          }}
        >
          ESCALATED
        </span>
      </div>

      {/* Message */}
      <div
        style={{
          fontSize: 13,
          color: '#3a3a3a',
          lineHeight: 1.65,
          marginBottom: 18,
        }}
      >
        The system has stepped back on this case. No draft was generated. Tom has requested a cancellation — how you handle this conversation is up to you.
      </div>

      {/* Action */}
      <button
        onClick={onAcknowledge}
        style={{
          padding: '8px 18px',
          borderRadius: 20,
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 500,
          background: 'transparent',
          color: OLIVE,
          border: `1.5px solid ${OLIVE}`,
          transition: 'opacity 0.1s',
        }}
      >
        I'll handle this
      </button>

      <div style={{ fontSize: 11, color: MUTED, marginTop: 12, lineHeight: 1.5 }}>
        The system will wait until you manually update this case.
      </div>
    </div>
  );
}
