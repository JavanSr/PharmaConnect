import React from 'react';

// SVG marks are inlined as base64 data URIs so they load in any context
// (no filesystem dependency on ds-bundle/assets/ which gets cleared on rebuild).
const MARK_LIGHT = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNjAiIGhlaWdodD0iMjYwIiB2aWV3Qm94PSIwIDAgMjQwIDI0MCIgZmlsbD0ibm9uZSI+DQogIDxwYXRoIGQ9Ik0xMjAgNTZWMjAwIiBzdHJva2U9IiMwRDQwMzUiIHN0cm9rZS13aWR0aD0iMTQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8cGF0aCBkPSJNNTYgMTIwSDE4NCIgc3Ryb2tlPSIjMEQ0MDM1IiBzdHJva2Utd2lkdGg9IjE0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4NCiAgPGNpcmNsZSBjeD0iMTIwIiBjeT0iMTIwIiByPSIxMiIgZmlsbD0iIzBENDAzNSIvPg0KICA8Y2lyY2xlIGN4PSIxMjAiIGN5PSIzNiIgcj0iMTQiIGZpbGw9IiMwRDQwMzUiLz4NCiAgPGNpcmNsZSBjeD0iMTIwIiBjeT0iMjEwIiByPSIxMyIgZmlsbD0iIzBENDAzNSIvPg0KICA8Y2lyY2xlIGN4PSIzNiIgY3k9IjEyMCIgcj0iMTMiIGZpbGw9IiMwRDQwMzUiLz4NCiAgPGNpcmNsZSBjeD0iMjA0IiBjeT0iMTIwIiByPSIxNSIgZmlsbD0iI0U4QTAyMCIvPg0KICA8Y2lyY2xlIGN4PSIyMDQiIGN5PSIxMjAiIHI9IjYiIGZpbGw9IiNGRkZGRkYiIG9wYWNpdHk9IjAuNiIvPg0KPC9zdmc+DQo=';
const MARK_DARK  = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNjAiIGhlaWdodD0iMjYwIiB2aWV3Qm94PSIwIDAgMjQwIDI0MCIgZmlsbD0ibm9uZSI+DQogIDxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iMjQwIiByeD0iMzIiIGZpbGw9IiMwRDQwMzUiLz4NCiAgPHBhdGggZD0iTTEyMCA1NlYyMDAiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+DQogIDxwYXRoIGQ9Ik01NiAxMjBIMTg0IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMTQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPg0KICA8Y2lyY2xlIGN4PSIxMjAiIGN5PSIxMjAiIHI9IjEyIiBmaWxsPSIjRkZGRkZGIi8+DQogIDxjaXJjbGUgY3g9IjEyMCIgY3k9IjM2IiByPSIxNCIgZmlsbD0iI0ZGRkZGRiIvPg0KICA8Y2lyY2xlIGN4PSIxMjAiIGN5PSIyMTAiIHI9IjEzIiBmaWxsPSIjRkZGRkZGIi8+DQogIDxjaXJjbGUgY3g9IjM2IiBjeT0iMTIwIiByPSIxMyIgZmlsbD0iI0ZGRkZGRiIvPg0KICA8Y2lyY2xlIGN4PSIyMDQiIGN5PSIxMjAiIHI9IjE1IiBmaWxsPSIjRThBMDIwIi8+DQogIDxjaXJjbGUgY3g9IjIwNCIgY3k9IjEyMCIgcj0iNiIgZmlsbD0iI0ZGRkZGRiIgb3BhY2l0eT0iMC42Ii8+DQo8L3N2Zz4NCg==';

export function LightBackground() {
  return (
    <div style={{ background: '#fff', padding: '32px', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
      {/* sm — 24px mark */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <img src={MARK_LIGHT} alt="" width={24} height={24} style={{ display: 'block', width: 24, height: 'auto', flexShrink: 0 }} />
        <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '1.15rem', fontWeight: 800, lineHeight: 1, display: 'inline-flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{ color: '#0D4035' }}>APOTEK</span><span style={{ color: '#7ECFB4', marginLeft: '-0.015em' }}>H</span>
        </span>
      </span>
      {/* md — 32px mark */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
        <img src={MARK_LIGHT} alt="" width={32} height={32} style={{ display: 'block', width: 32, height: 'auto', flexShrink: 0 }} />
        <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '1.55rem', fontWeight: 800, lineHeight: 1, display: 'inline-flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{ color: '#0D4035' }}>APOTEK</span><span style={{ color: '#7ECFB4', marginLeft: '-0.015em' }}>H</span>
        </span>
      </span>
      {/* lg — 48px mark */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
        <img src={MARK_LIGHT} alt="" width={48} height={48} style={{ display: 'block', width: 48, height: 'auto', flexShrink: 0 }} />
        <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '2.35rem', fontWeight: 800, lineHeight: 1, display: 'inline-flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{ color: '#0D4035' }}>APOTEK</span><span style={{ color: '#7ECFB4', marginLeft: '-0.015em' }}>H</span>
        </span>
      </span>
    </div>
  );
}

export function DarkBackground() {
  return (
    <div style={{ background: '#0D4035', padding: '32px', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
      {/* md */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
        <img src={MARK_DARK} alt="" width={32} height={32} style={{ display: 'block', width: 32, height: 'auto', flexShrink: 0 }} />
        <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '1.55rem', fontWeight: 800, lineHeight: 1, display: 'inline-flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{ color: '#ffffff' }}>APOTEK</span><span style={{ color: '#E8A020', marginLeft: '-0.015em' }}>H</span>
        </span>
      </span>
      {/* lg */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
        <img src={MARK_DARK} alt="" width={48} height={48} style={{ display: 'block', width: 48, height: 'auto', flexShrink: 0 }} />
        <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '2.35rem', fontWeight: 800, lineHeight: 1, display: 'inline-flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{ color: '#ffffff' }}>APOTEK</span><span style={{ color: '#E8A020', marginLeft: '-0.015em' }}>H</span>
        </span>
      </span>
      {/* xl */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
        <img src={MARK_DARK} alt="" width={64} height={64} style={{ display: 'block', width: 64, height: 'auto', flexShrink: 0 }} />
        <span style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '3rem', fontWeight: 800, lineHeight: 1, display: 'inline-flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{ color: '#ffffff' }}>APOTEK</span><span style={{ color: '#E8A020', marginLeft: '-0.015em' }}>H</span>
        </span>
      </span>
    </div>
  );
}

export function MarkAndAmber() {
  return (
    <div style={{ background: '#f8faf9', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>
      <p style={{ margin: 0, fontFamily: 'system-ui', fontSize: '11px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Living Cross mark — amber right node signals active pharmacy
      </p>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <img src={MARK_LIGHT} alt="APOTEKH mark — amber right node visible" width={48} height={48} style={{ display: 'block', width: 48, height: 'auto' }} />
        <img src={MARK_LIGHT} alt="APOTEKH mark — amber right node visible" width={64} height={64} style={{ display: 'block', width: 64, height: 'auto' }} />
        <img src={MARK_LIGHT} alt="APOTEKH mark — amber right node visible" width={80} height={80} style={{ display: 'block', width: 80, height: 'auto' }} />
      </div>
      <p style={{ margin: 0, fontFamily: 'system-ui', fontSize: '11px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Amber node: #E8A020 · always present in colour contexts
      </p>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ display: 'block', width: 32, height: 32, borderRadius: '50%', background: '#E8A020' }} />
        <span style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 700, color: '#0D4035' }}>#E8A020 — Amber Active Node</span>
      </div>
    </div>
  );
}
