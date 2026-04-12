import React, { useState } from 'react';
import { Tag } from './Tag';

const OLIVE = '#2d3d2e';
const MUTED = '#9e9890';
const BORDER = '#e8e2d9';

type TimelineEntry =
  | { type: 'event'; time: string; text: string }
  | { type: 'action'; time: string; text: string; tag: 'AUTO' | 'DRAFT' | 'MANUAL' }
  | { type: 'state_change'; time: string; text: string }
  | { type: 'draft'; time: string; text: string };

const timeline: TimelineEntry[] = [
  { type: 'event', time: 'Apr 5, 9:30 AM', text: 'Booking inquiry received via Squarespace form' },
  { type: 'action', time: 'Apr 5, 9:31 AM', text: 'System sent intake email', tag: 'AUTO' },
  { type: 'event', time: 'Apr 5, 2:14 PM', text: 'Jane replied with intake information' },
  { type: 'state_change', time: 'Apr 5, 2:15 PM', text: 'Case moved to: Ready for your review' },
  { type: 'draft', time: 'Apr 5, 2:16 PM', text: 'Draft ready — waiting for your approval' },
];

export function CaseDetailJane() {
  const [draftState, setDraftState] = useState<'pending' | 'approved' | 'rejected' | 'editing'>('pending');
  const [editMode, setEditMode] = useState(false);

  const handleApprove = () => setDraftState('approved');
  const handleReject = () => setDraftState('rejected');
  const handleEditApprove = () => { setEditMode(true); };
  const handleHandleThis = () => setDraftState('approved');

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

      {/* RIGHT COLUMN — Status + Actions + Draft */}
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
            Jane Kim
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>jane@example.com</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                background: '#e4ede2',
                color: OLIVE,
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 20,
                letterSpacing: '0.01em',
              }}
            >
              Ready for your review
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
            Waiting for your approval before the system can proceed
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
            <ActionButton
              label="Approve Fit"
              variant="primary"
              tag="DRAFT"
              onClick={() => {}}
            />
            <ActionButton
              label="Request More Info"
              variant="outline"
              tag="DRAFT"
              onClick={() => {}}
            />
            <ActionButton
              label="Escalate to Owner"
              variant="ghost"
              tag="MANUAL"
              onClick={() => {}}
            />
          </div>
        </div>

        {/* BOTTOM — Pending Draft */}
        {draftState === 'pending' && !editMode && (
          <DraftCard
            onApprove={handleApprove}
            onEditApprove={handleEditApprove}
            onReject={handleReject}
          />
        )}

        {draftState === 'approved' && (
          <div
            style={{
              background: '#f0f7f0',
              border: `1px solid #c8ddc8`,
              borderRadius: 10,
              padding: '16px 20px',
              fontSize: 13,
              color: OLIVE,
              fontWeight: 500,
            }}
          >
            ✓ Draft approved — email sent to Jane. The system will continue.
          </div>
        )}

        {draftState === 'rejected' && (
          <div
            style={{
              background: '#faf5f0',
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: '16px 20px',
              fontSize: 13,
              color: MUTED,
            }}
          >
            Draft rejected. No email sent. The case remains paused.
          </div>
        )}

        {editMode && (
          <DraftCardEdit
            onApprove={() => setDraftState('approved')}
            onCancel={() => setEditMode(false)}
          />
        )}
      </div>
    </div>
  );
}

function TimelineRow({ entry, isLast }: { entry: TimelineEntry; isLast: boolean }) {
  if (entry.type === 'state_change') {
    return (
      <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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

  if (entry.type === 'draft') {
    return (
      <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: 13,
              height: 13,
              borderRadius: '50%',
              background: '#c9872a',
              flexShrink: 0,
              marginTop: 2,
              zIndex: 1,
            }}
          />
        </div>
        <div
          style={{
            flex: 1,
            background: '#fef8ef',
            border: '1px solid #f0d8a8',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 10, color: '#b0a89a', marginBottom: 4 }}>{entry.time}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13, color: '#3a2800', fontWeight: 500 }}>{entry.text}</div>
            <Tag type="DRAFT" />
          </div>
        </div>
      </div>
    );
  }

  // event or action
  const isAction = entry.type === 'action';
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: 13,
            height: 13,
            borderRadius: '50%',
            border: `1.5px solid ${isAction ? '#2d3d2e' : '#c8c0b5'}`,
            background: isAction ? '#2d3d2e' : '#ffffff',
            flexShrink: 0,
            marginTop: 2,
            zIndex: 1,
          }}
        />
      </div>
      <div style={{ flex: 1, paddingBottom: 20 }}>
        <div style={{ fontSize: 10, color: '#b0a89a', marginBottom: 4 }}>{(entry as any).time}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, color: '#3a3a3a' }}>{entry.text}</div>
          {isAction && <Tag type={(entry as any).tag} />}
        </div>
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
    <button
      onClick={onClick}
      style={{ ...baseStyle, ...variants[variant] }}
    >
      <span>{label}</span>
      <Tag type={tag} />
    </button>
  );
}

function DraftCard({
  onApprove,
  onEditApprove,
  onReject,
}: {
  onApprove: () => void;
  onEditApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: '18px 20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      }}
    >
      {/* Draft label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span
          style={{
            background: '#fef0d8',
            color: '#7a4e1a',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            letterSpacing: '0.06em',
          }}
        >
          DRAFT — Approve Fit
        </span>
      </div>

      {/* Email meta */}
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>
        Email to jane@example.com
      </div>

      {/* Email content */}
      <div
        style={{
          background: '#faf8f5',
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#5a5040',
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Subject: Next steps for your session
        </div>
        <div style={{ fontSize: 13, color: '#3a3a3a', lineHeight: 1.6 }}>
          Hi Jane, thanks for sharing more about what you're looking for. Based on what you've shared, I think this could be a great fit. I'd love to find a time to connect — I'll send over a few options shortly.
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <DraftActionButton
          label="Approve"
          variant="solid"
          onClick={onApprove}
        />
        <DraftActionButton
          label="Edit & Approve"
          variant="outline"
          onClick={onEditApprove}
        />
        <DraftActionButton
          label="Reject"
          variant="ghost"
          onClick={onReject}
        />
      </div>

      <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
        Approving will send this email and allow the system to continue.
      </div>
    </div>
  );
}

function DraftActionButton({
  label,
  variant,
  onClick,
}: {
  label: string;
  variant: 'solid' | 'outline' | 'ghost';
  onClick: () => void;
}) {
  const styles: Record<string, React.CSSProperties> = {
    solid: {
      background: OLIVE,
      color: '#ffffff',
      border: 'none',
    },
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
    <button
      onClick={onClick}
      style={{
        padding: '7px 16px',
        borderRadius: 20,
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 500,
        transition: 'opacity 0.1s',
        ...styles[variant],
      }}
    >
      {label}
    </button>
  );
}

function DraftCardEdit({
  onApprove,
  onCancel,
}: {
  onApprove: () => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState(
    "Hi Jane, thanks for sharing more about what you're looking for. Based on what you've shared, I think this could be a great fit. I'd love to find a time to connect — I'll send over a few options shortly."
  );

  return (
    <div
      style={{
        background: '#ffffff',
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: '18px 20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ fontSize: 11, color: MUTED, marginBottom: 10, fontStyle: 'italic' }}>
        Edit the draft below before approving.
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        style={{
          width: '100%',
          minHeight: 100,
          background: '#faf8f5',
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          padding: '10px 12px',
          fontSize: 13,
          fontFamily: 'system-ui, sans-serif',
          color: '#3a3a3a',
          lineHeight: 1.6,
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
          marginBottom: 12,
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <DraftActionButton label="Approve & Send" variant="solid" onClick={onApprove} />
        <DraftActionButton label="Cancel" variant="ghost" onClick={onCancel} />
      </div>
    </div>
  );
}
