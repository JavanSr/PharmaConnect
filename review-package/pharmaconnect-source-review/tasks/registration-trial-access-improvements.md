# Registration, Trial, and Access UX Improvements

## Scope
- Remove TMDA licence number from self-registration while preserving the existing pharmacy licence field internally.
- Add retail + wholesale registration support without changing the core pharmacy type enum.
- Make the 14-day trial explicit from registration date and expose founder controls to extend or suspend access.
- Improve password visibility controls, tier descriptions, inventory explanations, back navigation, and dispenser upgrade visibility.
- Allow owners to decide whether dispensers can add or edit suppliers.

## Constraints
- Keep changes additive and compatible with existing MVP flows.
- Do not rewrite auth, inventory, or subscription systems.
- Prefer existing settings/config patterns where possible.
