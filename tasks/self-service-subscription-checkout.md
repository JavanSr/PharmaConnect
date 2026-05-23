# Self-Service Subscription Checkout

Implement the next subscription phase so a pharmacy owner can subscribe and regain service without founder contact.

## Scope

- Keep the existing manual payment request and founder review flow as fallback.
- Add a self-service checkout intent for supported public tiers and billing cycles.
- Backend must calculate subscription price from the selected tier/cycle instead of trusting the client.
- Return a reference, amount, and checkout instructions/link that can be used by a payment provider.
- Add a verified provider webhook path that automatically confirms a paid subscription and restores pharmacy access.
- Let owners poll/view their latest checkout/payment status from the subscription and trial-ended paywall screens.
- Make the UI clear when automatic provider credentials are not configured yet.

## Out of Scope

- Building a provider-specific SDK integration before payment-provider credentials are chosen.
- Card tokenization or storing customer payment details.
- Redesigning the whole subscription/pricing page.

## Acceptance

- Owner can start a checkout for a tier/cycle and receives a reference and amount.
- Payment provider callback can confirm the request without founder action.
- Confirmed callback sets pharmacy subscription active, ends the trial lock, and records paid-until.
- Manual request flow remains available.
- Backend build and frontend typecheck pass.
