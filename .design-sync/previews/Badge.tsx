import React from 'react';
import { Badge } from 'pharmaconnect-website';

export function Variants() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '24px', background: '#fff', alignItems: 'center' }}>
      <Badge variant="primary">Available now</Badge>
      <Badge variant="amber">Phase 2</Badge>
      <Badge variant="coming-soon">Coming soon</Badge>
      <Badge variant="new">New</Badge>
      <Badge variant="slate">Slate</Badge>
      <Badge variant="muted">Muted</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="sponsored">Sponsored</Badge>
    </div>
  );
}

export function InContext() {
  return (
    <div style={{ padding: '24px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '15px', fontWeight: 500, color: '#1e2a22' }}>Dispensing</span>
        <Badge variant="primary">Available now</Badge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '15px', fontWeight: 500, color: '#1e2a22' }}>CPD Tracker</span>
        <Badge variant="coming-soon">Coming soon</Badge>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '15px', fontWeight: 500, color: '#1e2a22' }}>Knowledge Hub</span>
        <Badge variant="new">New articles</Badge>
        <Badge variant="sponsored">Sponsored</Badge>
      </div>
    </div>
  );
}
