import React from 'react';
import { Button } from 'pharmaconnect-website';

export function Variants() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '24px', background: '#F7FAF9', alignItems: 'center' }}>
      <Button variant="primary">Start free trial</Button>
      <Button variant="outline">Learn more</Button>
      <Button variant="ghost">Skip for now</Button>
      <Button variant="danger">Delete account</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px', background: '#F7FAF9' }}>
      <Button variant="primary" size="sm">Small</Button>
      <Button variant="primary" size="md">Medium</Button>
      <Button variant="primary" size="lg">Large button</Button>
    </div>
  );
}

export function CTAPair() {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '24px', background: '#F7FAF9', alignItems: 'center' }}>
      <Button variant="primary" size="lg">Start 14-day trial</Button>
      <Button variant="outline" size="lg">View pricing</Button>
    </div>
  );
}
