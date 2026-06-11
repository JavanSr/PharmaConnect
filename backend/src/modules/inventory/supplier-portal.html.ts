/**
 * Server-rendered HTML for the supplier portal page.
 * No React, no build step -- works on any browser including basic Android phones.
 * Styles are inline to avoid external dependencies.
 *
 * Uses local types (not @prisma/client) so the file compiles before prisma generate is run.
 */

// Local types matching the Prisma models -- keep in sync with schema.prisma
type PortalLineItem = {
  id: string;
  productName: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  quantityRequested: number;
  quantityConfirmed: number | null;
  unitPrice: { toString(): string } | number | null;
  available: boolean;
  notes: string | null;
};

type PortalData = {
  token: string;
  pharmacyName: string;
  supplierName: string;
  status: string;
  supplierNotes: string | null;
  deliveryDate: Date | null;
  expiresAt: Date;
  lineItems: PortalLineItem[];
};

export function renderPortalPage(data: PortalData): string {
  const isResponded = ['CONFIRMED', 'PARTIALLY_CONFIRMED', 'REJECTED'].includes(data.status);
  const isExpired = data.status === 'EXPIRED';

  const statusBanner = () => {
    if (isExpired) return `<div class="banner banner-red">This order link has expired.</div>`;
    if (data.status === 'CONFIRMED') return `<div class="banner banner-green">You confirmed this order. Thank you!</div>`;
    if (data.status === 'PARTIALLY_CONFIRMED') return `<div class="banner banner-amber">You partially confirmed this order.</div>`;
    if (data.status === 'REJECTED') return `<div class="banner banner-red">You rejected this order.</div>`;
    return '';
  };

  const lineItemRows = data.lineItems.map((item: PortalLineItem, idx: number) => `
    <div class="line-item" id="item-${idx}">
      <div class="item-header">
        <div>
          <div class="item-name">${esc(item.productName)}</div>
          <div class="item-meta">${[item.genericName, item.strength, item.dosageForm].filter(Boolean).map((s) => esc(s as string)).join(' | ')}</div>
        </div>
        <div class="item-requested">Requested: <strong>${item.quantityRequested}</strong></div>
      </div>
      ${isResponded ? `
        <div class="item-response">
          <span class="${item.available ? 'tag-green' : 'tag-red'}">${item.available ? 'Available' : 'Not available'}</span>
          ${item.available ? `Qty: <strong>${item.quantityConfirmed ?? 0}</strong> &nbsp;|&nbsp; Price: <strong>Tsh ${Number(item.unitPrice ?? 0).toLocaleString()}</strong>` : ''}
          ${item.notes ? `<div class="item-note">${esc(item.notes)}</div>` : ''}
        </div>
      ` : `
        <div class="item-fields">
          <label class="field-label">
            <input type="checkbox" class="avail-check" data-idx="${idx}" checked onchange="toggleItem(${idx})"> Available
          </label>
          <div class="qty-price-row" id="fields-${idx}">
            <label class="field-label">
              Qty to supply
              <input class="field-input" type="number" min="0" max="${item.quantityRequested}" value="${item.quantityRequested}"
                id="qty-${idx}" name="qty_${idx}" placeholder="${item.quantityRequested}">
            </label>
            <label class="field-label">
              Unit price (Tsh)
              <input class="field-input" type="number" min="0" step="0.01"
                id="price-${idx}" name="price_${idx}" placeholder="0">
            </label>
          </div>
          <textarea class="field-textarea" id="notes-${idx}" name="notes_${idx}" placeholder="Notes (optional, e.g. batch number, expiry date)"></textarea>
        </div>
        <input type="hidden" id="itemid-${idx}" value="${esc(item.id)}">
      `}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Order -- APOTEKH</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f8f6; color: #0d4035; line-height: 1.6; }
    .page { max-width: 640px; margin: 0 auto; padding: 16px; }
    .logo-row { display: flex; align-items: center; gap: 10px; padding: 16px 0 8px; }
    .logo-text { font-size: 18px; font-weight: 800; color: #1a6b5c; letter-spacing: -0.5px; }
    .logo-text span { color: #7ecfb4; }
    .card { background: white; border-radius: 16px; border: 1px solid #d6f0e8; padding: 20px; margin-bottom: 16px; }
    .card-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 12px; }
    .order-number { font-size: 22px; font-weight: 800; color: #0d4035; }
    .order-meta { font-size: 14px; color: #516965; margin-top: 4px; }
    .banner { padding: 12px 16px; border-radius: 12px; font-size: 14px; font-weight: 600; margin-bottom: 16px; }
    .banner-green { background: #d6f0e8; color: #0d4035; }
    .banner-amber { background: #fef3c7; color: #92400e; }
    .banner-red   { background: #fee2e2; color: #991b1b; }
    .line-item { border-bottom: 1px solid #e2ede8; padding: 16px 0; }
    .line-item:last-child { border-bottom: none; }
    .item-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
    .item-name { font-size: 15px; font-weight: 600; color: #0d4035; }
    .item-meta { font-size: 12px; color: #64748b; margin-top: 2px; }
    .item-requested { font-size: 13px; color: #516965; white-space: nowrap; }
    .item-fields { display: flex; flex-direction: column; gap: 10px; }
    .qty-price-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .field-label { font-size: 13px; font-weight: 500; color: #516965; display: flex; flex-direction: column; gap: 4px; }
    .field-input { padding: 10px 12px; border: 1.5px solid #d6f0e8; border-radius: 10px; font-size: 14px; color: #0d4035; width: 100%; outline: none; }
    .field-input:focus { border-color: #1a6b5c; }
    .field-textarea { padding: 10px 12px; border: 1.5px solid #d6f0e8; border-radius: 10px; font-size: 13px; color: #0d4035; width: 100%; min-height: 60px; resize: vertical; font-family: inherit; outline: none; }
    .field-textarea:focus { border-color: #1a6b5c; }
    .avail-check { width: 18px; height: 18px; cursor: pointer; accent-color: #1a6b5c; }
    .item-response { font-size: 14px; color: #516965; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .item-note { font-size: 12px; color: #64748b; font-style: italic; width: 100%; }
    .tag-green { background: #d6f0e8; color: #0d4035; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .tag-red   { background: #fee2e2; color: #991b1b; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .form-section { margin-top: 8px; }
    .section-title { font-size: 13px; font-weight: 600; color: #516965; margin-bottom: 8px; }
    .btn { display: block; width: 100%; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: 700; border: none; cursor: pointer; margin-bottom: 10px; }
    .btn-confirm { background: #1a6b5c; color: white; }
    .btn-confirm:hover { background: #145748; }
    .btn-reject  { background: white; color: #dc2626; border: 2px solid #fecaca; }
    .btn-reject:hover { background: #fee2e2; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; padding: 24px 0 16px; }
    @media (max-width: 400px) { .qty-price-row { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
<div class="page">
  <div class="logo-row">
    <div class="logo-text">APOTEK<span>H</span></div>
  </div>

  ${statusBanner()}

  <div class="card">
    <div class="card-title">Purchase Order</div>
    <div class="order-number">From: ${esc(data.pharmacyName)}</div>
    <div class="order-meta">Sent to: <strong>${esc(data.supplierName)}</strong></div>
    ${data.deliveryDate && isResponded ? `<div class="order-meta">Delivery date: <strong>${new Date(data.deliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>` : ''}
    ${data.supplierNotes && isResponded ? `<div class="order-meta">Your note: <em>${esc(data.supplierNotes)}</em></div>` : ''}
    ${isExpired ? '' : `<div class="order-meta" style="margin-top:8px;font-size:12px;color:#94a3b8;">Link expires: ${new Date(data.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>`}
  </div>

  <div class="card">
    <div class="card-title">Items Requested</div>
    ${lineItemRows}
  </div>

  ${!isResponded && !isExpired ? `
  <form id="confirm-form">
    <div class="card form-section">
      <div class="section-title">Delivery details</div>
      <label class="field-label" style="margin-bottom:10px;">
        Expected delivery date
        <input class="field-input" type="date" id="delivery-date" min="${new Date().toISOString().split('T')[0]}">
      </label>
      <label class="field-label">
        Notes to pharmacy (optional)
        <textarea class="field-textarea" id="supplier-notes" placeholder="e.g. will deliver Tuesday morning, some items out of stock..."></textarea>
      </label>
    </div>

    <button type="button" class="btn btn-confirm" onclick="submitConfirm()">Confirm Order</button>
    <button type="button" class="btn btn-reject"  onclick="submitReject()">Cannot Fulfil This Order</button>
  </form>
  ` : ''}

  <div class="footer">
    Powered by APOTEKH &mdash; Powering Pharmacies. Protecting Patients.<br>
    <a href="https://apotekh.co.tz" style="color:#1a6b5c;">apotekh.co.tz</a>
  </div>
</div>

<script>
  const TOKEN = ${JSON.stringify(data.token)};
  const ITEM_COUNT = ${data.lineItems.length};

  function toggleItem(idx) {
    const checked = document.querySelector('.avail-check[data-idx="' + idx + '"]').checked;
    const fields = document.getElementById('fields-' + idx);
    fields.style.opacity = checked ? '1' : '0.3';
    fields.style.pointerEvents = checked ? '' : 'none';
  }

  function collectLineItems() {
    const items = [];
    for (let i = 0; i < ITEM_COUNT; i++) {
      const id   = document.getElementById('itemid-' + i)?.value;
      const avail = document.querySelector('.avail-check[data-idx="' + i + '"]')?.checked ?? true;
      const qty  = parseInt(document.getElementById('qty-' + i)?.value || '0');
      const price = parseFloat(document.getElementById('price-' + i)?.value || '0');
      const notes = document.getElementById('notes-' + i)?.value.trim() || undefined;
      items.push({ lineItemId: id, available: avail, quantityConfirmed: avail ? qty : 0, unitPrice: avail ? price : 0, notes });
    }
    return items;
  }

  async function submitConfirm() {
    const btn = document.querySelector('.btn-confirm');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    const lineItems = collectLineItems();
    const deliveryDate = document.getElementById('delivery-date')?.value || undefined;
    const supplierNotes = document.getElementById('supplier-notes')?.value.trim() || undefined;

    try {
      const r = await fetch('/supplier-portal/' + TOKEN + '/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems, deliveryDate, supplierNotes }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Server error'); }
      location.reload();
    } catch (e) {
      alert('Error: ' + e.message);
      btn.disabled = false;
      btn.textContent = 'Confirm Order';
    }
  }

  async function submitReject() {
    const reason = prompt('Reason for rejecting (optional):');
    if (reason === null) return;

    const btn = document.querySelector('.btn-reject');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const r = await fetch('/supplier-portal/' + TOKEN + '/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Server error'); }
      location.reload();
    } catch (e) {
      alert('Error: ' + e.message);
      btn.disabled = false;
      btn.textContent = 'Cannot Fulfil This Order';
    }
  }
</script>
</body>
</html>`;
}

function esc(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
