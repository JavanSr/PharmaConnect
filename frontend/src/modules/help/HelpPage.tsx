import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type FaqItem = {
  question: string;
  answer: React.ReactNode;
};

type FaqSection = {
  title: string;
  items: FaqItem[];
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        question: 'How do I add medicines to my inventory?',
        answer:
          'Go to Inventory → Products and click "Add product". Fill in the product name, generic name, dosage form, strength, and unit price. You can also receive stock directly by going to Inventory → Receive Stock and scanning or entering the batch details.',
      },
      {
        question: 'How do I process a sale?',
        answer:
          'Navigate to Dispensing from the sidebar. Search for a product by name or barcode, add it to the cart, enter the quantity, then tap Checkout. Select the payment method (Cash, M-Pesa, or Insurance) and complete the transaction.',
      },
      {
        question: 'How do I add staff members?',
        answer:
          'Go to Settings → Team Management. Click "Invite staff member", enter their name, email address, and select their role (Dispenser, Cashier, Data Entry Clerk, etc.). They will receive an email invitation to create their account.',
      },
    ],
  },
  {
    title: 'Payments & Billing',
    items: [
      {
        question: 'How do I record an M-Pesa payment?',
        answer:
          'During checkout in Dispensing, select "Mobile Money" as the payment method. Enter the M-Pesa transaction reference number (e.g. QKA12345). The system records this reference for your end-of-day report.',
      },
      {
        question: 'How do I upgrade my subscription?',
        answer:
          'Go to Settings → Subscription. Select the tier you want to upgrade to (BASIC, STANDARD, or PREMIUM) and follow the instructions to make payment via M-Pesa or bank transfer. Your account will be upgraded once payment is confirmed.',
      },
      {
        question: 'What happens when my trial ends?',
        answer:
          'After your 14-day trial ends, your account enters a 30-day grace period where you can still dispense, manage inventory, and access core features. After 30 days without a paid subscription, the account is locked. Contact support to activate your subscription at any time.',
      },
    ],
  },
  {
    title: 'Inventory & Stock',
    items: [
      {
        question: 'How do I set up low-stock alerts?',
        answer:
          'When editing a product (Inventory → Products → select a product), set the "Reorder level" field. When the stock on hand drops to or below this level, you will receive an in-app notification and the product will appear on the low-stock alert panel on your dashboard.',
      },
      {
        question: 'How do I manage expiry dates?',
        answer:
          'Go to Inventory → Expiry Dashboard. This page shows all batches grouped by urgency: Expired, Critical (≤7 days), Warning (≤14 days), Caution (≤30 days), and Monitor (>30 days). APOTEKH automatically enforces FEFO (First Expired, First Out) during dispensing so the earliest-expiring batch is always dispensed first.',
      },
      {
        question: 'How do I receive new stock from a supplier?',
        answer:
          'Go to Inventory → Receive Stock. Enter or scan the product, batch number, expiry date, quantity received, and unit cost. If you have a supplier order prepared in Inventory → Stock Orders, you can receive directly against that order. APOTEKH will warn you if an incoming batch expires within 60 days.',
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        question: 'How do I contact support?',
        answer: (
          <span>
            Chat with our support team on WhatsApp:{' '}
            <a
              href="https://wa.me/255764591374?text=Hi%20APOTEKH%20Support%2C%20I%20need%20help"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pc-600 font-medium hover:underline"
            >
              +255 764 591 374
            </a>
            . Available Monday–Saturday, 8am–8pm EAT.
          </span>
        ),
      },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const FaqAccordion: React.FC<{ item: FaqItem }> = ({ item }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-pc-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left cursor-pointer hover:text-pc-600 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-pc-800">{item.question}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`flex-shrink-0 w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 0 1 1.414 0L10 10.586l3.293-3.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 0-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="pb-4 text-sm text-gray-600 leading-relaxed pr-6">{item.answer}</div>
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const HelpPage: React.FC = () => (
  <div className="max-w-2xl mx-auto py-2">
    {/* Page header */}
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-pc-800">Help &amp; FAQ</h1>
      <p className="mt-1 text-sm text-gray-500">
        Answers to common questions about using APOTEKH.
      </p>
    </div>

    {/* FAQ sections */}
    <div className="space-y-8">
      {FAQ_SECTIONS.map((section) => (
        <section key={section.title}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-pc-500 mb-3">
            {section.title}
          </h2>
          <div className="bg-white rounded-xl border border-pc-100 divide-y divide-pc-100 px-4">
            {section.items.map((item) => (
              <FaqAccordion key={item.question} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>

    {/* Bottom CTA */}
    <div className="mt-10 p-5 bg-pc-50 rounded-xl border border-pc-100 text-center">
      <p className="text-sm text-pc-800 font-medium">Still need help?</p>
      <p className="text-xs text-gray-500 mt-1 mb-3">
        Our support team is available Monday–Saturday, 8am–8pm EAT.
      </p>
      <a
        href="https://wa.me/255764591374?text=Hi%20APOTEKH%20Support%2C%20I%20need%20help"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#25D366' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="16" height="16" aria-hidden="true">
          <path d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.98L0 24l6.18-1.57A11.93 11.93 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.22-3.48-8.52zM12 22c-1.85 0-3.67-.5-5.25-1.43l-.38-.22-3.9.99 1.02-3.78-.25-.4A9.93 9.93 0 0 1 2 12C2 6.48 6.48 2 12 2c2.67 0 5.18 1.04 7.07 2.93A9.93 9.93 0 0 1 22 12c0 5.52-4.48 10-10 10zm5.44-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.19-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01s-.52.08-.8.37c-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/>
        </svg>
        Chat on WhatsApp
      </a>
    </div>
  </div>
);
