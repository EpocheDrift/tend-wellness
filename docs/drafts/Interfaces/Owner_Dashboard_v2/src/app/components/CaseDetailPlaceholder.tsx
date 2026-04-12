import React from 'react';

const OLIVE = '#2d3d2e';
const MUTED = '#9e9890';
const BORDER = '#e8e2d9';

interface PlaceholderProps {
  name: string;
  email: string;
  stateLabel: string;
  subLabel: string;
  timeline: Array<{ time: string; text: string }>;
}

export function CaseDetailPlaceholder({
  name,
  email,
  stateLabel,
  subLabel,
  timeline,
}: PlaceholderProps) {
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
        <div style={{ color: '#2a2a2a', fontSize: 15, fontWeight: 500, marginBottom: 28 }}>
          Activity
        </div>

        <div style={{ position: 'relative' }}>
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
              <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
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
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
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
        {/* Status Card — Liquid Glass */}
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
            {name}
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>{email}</div>
          <div style={{ marginBottom: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                background: '#edf0ed',
                color: '#4a5a4b',
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 20,
                letterSpacing: '0.01em',
              }}
            >
              {stateLabel}
            </span>
          </div>
          <div style={{ fontSize: 12, color: MUTED, fontStyle: 'italic', lineHeight: 1.5 }}>
            {subLabel}
          </div>
        </div>

        {/* System handling note */}
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
              marginBottom: 10,
            }}
          >
            System Status
          </div>
          <div style={{ fontSize: 13, color: '#5a5040', lineHeight: 1.6 }}>
            The system is handling this case. No action is needed from you right now. You'll be notified if anything requires your attention.
          </div>
        </div>
      </div>
    </div>
  );
}
