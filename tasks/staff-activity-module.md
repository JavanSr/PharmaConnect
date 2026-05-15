# Staff Activity Module

## Scope

Build staff activity from existing operational data. Do not create clock-in/clock-out flows. Preserve the existing design system and navigation structure.

## Step Status

- [x] Step 1 audit completed: login history was partial, transaction user IDs exist, override user IDs exist, dose calculator usage is not logged, attendance/audit tables partially exist.
- [x] Step 2 minimal instrumentation: successful logins now write durable `audit_log` rows with `table_name = 'auth_sessions'`, `action = 'LOGIN'`, `acted_by = user_id`, and selected pharmacy context.
- [x] Step 2 verification: transaction and override attribution already exists through `dispensing_events`, `stock_movements`, and `override_log`; no attendance or clock-in system was added.
- [x] Step 3: Staff Activity owner/PIC page now reads from login audit, dispensing events, stock movements, safety events, and override log.
- [x] Step 3 access: the Staff Activity API and frontend page are restricted to OWNER and PHARMACIST_IN_CHARGE.
- [x] Step 4: Attendance navigation, page title, component name, and primary route were renamed to Staff Activity.

## Pending

- [ ] Follow-up: remove or migrate legacy `staff_attendance` schema only after confirming no historical data is needed.
