import React, { useState } from 'react';
import { CaseList } from './components/CaseList';
import { CaseDetailJane } from './components/CaseDetailJane';
import { CaseDetailTom } from './components/CaseDetailTom';
import { CaseDetailPlaceholder } from './components/CaseDetailPlaceholder';

export type CaseId = 'jane' | 'tom' | 'marcus' | 'sarah';

export default function App() {
  const [selectedCase, setSelectedCase] = useState<CaseId>('jane');

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#faf8f5',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Left Panel — Case List */}
      <CaseList selectedCase={selectedCase} onSelectCase={setSelectedCase} />

      {/* Right Panel — Case Detail */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedCase === 'jane' && <CaseDetailJane />}
        {selectedCase === 'tom' && <CaseDetailTom />}
        {selectedCase === 'marcus' && (
          <CaseDetailPlaceholder
            name="Marcus L."
            email="marcus@example.com"
            stateLabel="Waiting on client"
            subLabel="Sent a follow-up — awaiting their response"
            timeline={[
              { time: 'Apr 7, 10:00 AM', text: 'Booking inquiry received' },
              { time: 'Apr 7, 10:01 AM', text: 'System sent intake email' },
              { time: 'Apr 7, 3:00 PM', text: 'No response — system sent follow-up reminder' },
              { time: 'Apr 8, 9:00 AM', text: 'Case moved to: Waiting on client' },
            ]}
          />
        )}
        {selectedCase === 'sarah' && (
          <CaseDetailPlaceholder
            name="Sarah M."
            email="sarah@example.com"
            stateLabel="Booked ✓"
            subLabel="Session scheduled for Apr 14 at 2:00 PM"
            timeline={[
              { time: 'Apr 6, 11:00 AM', text: 'Booking inquiry received' },
              { time: 'Apr 6, 11:01 AM', text: 'System sent intake email' },
              { time: 'Apr 6, 2:30 PM', text: 'Sarah completed intake form' },
              { time: 'Apr 6, 2:31 PM', text: 'System confirmed fit and sent scheduling link' },
              { time: 'Apr 6, 4:00 PM', text: 'Sarah selected a time — session booked for Apr 14' },
              { time: 'Apr 6, 4:01 PM', text: 'Confirmation sent to both parties' },
              { time: 'Apr 6, 4:01 PM', text: 'Case moved to: Booked ✓' },
            ]}
          />
        )}
      </div>
    </div>
  );
}
