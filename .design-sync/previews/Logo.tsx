import React from 'react';
import { Logo } from 'pharmaconnect-website';

export function LightSizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '32px', padding: '32px', background: '#fff', flexWrap: 'wrap' }}>
      <Logo size="sm" variant="full" />
      <Logo size="md" variant="full" />
      <Logo size="lg" variant="full" />
      <Logo size="xl" variant="full" />
    </div>
  );
}

export function DarkBackground() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '32px', padding: '32px', background: '#0D4035', flexWrap: 'wrap' }}>
      <Logo size="sm" variant="white" />
      <Logo size="md" variant="white" />
      <Logo size="lg" variant="white" />
    </div>
  );
}

export function WhiteOnDarkLarge() {
  return (
    <div style={{ padding: '48px', background: '#0D4035', display: 'flex', justifyContent: 'center' }}>
      <Logo size="xl" variant="white" />
    </div>
  );
}
