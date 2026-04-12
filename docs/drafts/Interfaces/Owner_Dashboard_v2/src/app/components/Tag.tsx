import React from 'react';

type TagType = 'AUTO' | 'DRAFT' | 'MANUAL' | 'ESCALATED';

const tagStyles: Record<TagType, { bg: string; color: string; label: string }> = {
  AUTO: { bg: '#e4ede2', color: '#2d3d2e', label: 'AUTO' },
  DRAFT: { bg: '#fef0d8', color: '#7a4e1a', label: 'DRAFT' },
  MANUAL: { bg: '#f9e5e3', color: '#7a3028', label: 'MANUAL' },
  ESCALATED: { bg: '#f9e5e3', color: '#7a3028', label: 'ESCALATED' },
};

export function Tag({ type }: { type: TagType }) {
  const s = tagStyles[type];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: s.bg,
        color: s.color,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        padding: '2px 7px',
        borderRadius: 4,
        lineHeight: 1.5,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {s.label}
    </span>
  );
}
