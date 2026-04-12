import React from 'react';
import type { CaseId } from '../App';

interface Case {
  id: CaseId;
  name: string;
  stateLabel: string;
  subLabel: string;
  lastUpdated: string;
  indicator: 'amber' | 'red' | null;
}

const CASES: Case[] = [
  {
    id: 'jane',
    name: 'Jane Kim',
    stateLabel: 'Ready for your review',
    subLabel: 'Paused — waiting for you',
    lastUpdated: '2 hours ago',
    indicator: 'amber',
  },
  {
    id: 'tom',
    name: 'Tom R.',
    stateLabel: 'Cancellation requested',
    subLabel: 'Escalated — waiting for you',
    lastUpdated: 'Just now',
    indicator: 'red',
  },
  {
    id: 'marcus',
    name: 'Marcus L.',
    stateLabel: 'Waiting on client',
    subLabel: 'System handling',
    lastUpdated: 'Yesterday',
    indicator: null,
  },
  {
    id: 'sarah',
    name: 'Sarah M.',
    stateLabel: 'Booked ✓',
    subLabel: 'System handling',
    lastUpdated: '3 days ago',
    indicator: null,
  },
];

interface CaseListProps {
  selectedCase: CaseId;
  onSelectCase: (id: CaseId) => void;
}

export function CaseList({ selectedCase, onSelectCase }: CaseListProps) {
  return (
    <div
      style={{
        width: 320,
        minWidth: 320,
        background: '#f0ece5',
        borderRight: '1px solid #e8e2d9',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          padding: '24px 22px 20px',
          borderBottom: '1px solid #e8e2d9',
        }}
      >
        <div style={{ color: '#2d3d2e', fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>
          Tend
        </div>
        <div
          style={{
            color: '#9e9890',
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: 2,
          }}
        >
          Owner Dashboard
        </div>
      </div>

      {/* Cases label */}
      <div
        style={{
          padding: '14px 22px 6px',
          color: '#9e9890',
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Cases
      </div>

      {/* Case list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {CASES.map((c) => (
          <CaseItem
            key={c.id}
            caseData={c}
            isSelected={selectedCase === c.id}
            onClick={() => onSelectCase(c.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CaseItem({
  caseData: c,
  isSelected,
  onClick,
}: {
  caseData: Case;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isWaiting = c.subLabel.includes('waiting for you');

  return (
    <div
      onClick={onClick}
      style={{
        padding: '13px 22px 13px 19px',
        cursor: 'pointer',
        borderLeft: isSelected ? '3px solid #2d3d2e' : '3px solid transparent',
        background: isSelected ? 'rgba(255,255,255,0.52)' : 'transparent',
        borderBottom: '1px solid rgba(232,226,217,0.5)',
        transition: 'background 0.12s',
      }}
    >
      {/* Top row: name + dot + timestamp */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {c.indicator ? (
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: c.indicator === 'amber' ? '#c9872a' : '#b85c4a',
                flexShrink: 0,
              }}
            />
          ) : (
            <div style={{ width: 7, height: 7, flexShrink: 0 }} />
          )}
          <span
            style={{
              color: '#2a2a2a',
              fontSize: 13,
              fontWeight: isSelected ? 500 : 400,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {c.name}
          </span>
        </div>
        <span
          style={{
            color: '#9e9890',
            fontSize: 11,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {c.lastUpdated}
        </span>
      </div>

      {/* State label + sub-label */}
      <div style={{ paddingLeft: 15 }}>
        <div
          style={{
            color: '#3a3a3a',
            fontSize: 12,
            marginBottom: 2,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {c.stateLabel}
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: 'system-ui, sans-serif',
            color: isWaiting ? '#7a5c2a' : '#9e9890',
            fontWeight: isWaiting ? 500 : 400,
          }}
        >
          {c.subLabel}
        </div>
      </div>
    </div>
  );
}
