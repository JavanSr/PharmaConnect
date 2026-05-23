# Subscription Payment Requests

Implement Phase 1 subscription payment handling without adding a payment gateway.

## Scope

- Preserve the manual M-Pesa / bank transfer model.
- Let owners submit a subscription payment request with tier, billing cycle, amount, payment method, transaction reference, payer phone, and optional note.
- Let owners view recent submitted requests from the Subscription page.
- Let founder/super-admin review pending requests from the Founder dashboard.
- Let founder confirm or reject a request.
- Confirming a request should update the pharmacy subscription tier, billing cycle, trial status, paid-until/trial end date, and subscription timestamp.
- Keep changes additive and backward-compatible.

## Out of Scope

- No automatic M-Pesa callback integration.
- No card or Flutterwave gateway.
- No uploaded file storage for proof images in this task.

## Acceptance

- Expired-trial owners can submit payment details from the lock/subscription flow.
- Founder can see pending payment requests and confirm them.
- Confirmed payment restores access by ending trial lock and setting an active subscription state.
- Typecheck/build passes.
