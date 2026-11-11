# Arrival Email Automation — Full Analysis → Plan → Implement

## ROLE

You are the primary coding agent working on an existing production Laravel-based cottage booking system.

You have access to the complete codebase.

Your job is to implement the requested **Guest Arrival Email Automation** feature safely, without breaking existing booking, email-template, admin, or Resend functionality.

## CRITICAL RULE

**DO NOT START CODING IMMEDIATELY.**

You MUST follow this sequence:

```text
PHASE 1 — Understand existing system
        ↓
PHASE 2 — Deep technical analysis
        ↓
PHASE 3 — Identify risks / edge cases
        ↓
PHASE 4 — Create implementation plan
        ↓
PHASE 5 — Review plan against existing architecture
        ↓
PHASE 6 — Implement
        ↓
PHASE 7 — Test
        ↓
PHASE 8 — Final verification
```

Do not skip phases.

---

# 1. FEATURE REQUIREMENT

The client wants an automated guest arrival email system.

When a guest makes a cottage booking, the system should automatically send the guest an arrival-information email based on the booking's check-in date.

### Example

If:

```text
Check-in: November 20
Booking created: November 10
Arrival email setting: 2 days before
```

Then:

```text
Email scheduled: November 18
```

If:

```text
Check-in: November 20
Booking created: November 19
Arrival email setting: 2 days before
```

Then:

```text
Send immediately
```

Same-day booking:

```text
Check-in: November 20
Booking created: November 20
```

→ Send immediately.

---

# 2. ADMIN CONFIGURATION REQUIREMENT

The client wants this configurable from the admin panel.

The admin should be able to configure at minimum:

### Arrival email enabled

```text
ON / OFF
```

### Days before arrival

Examples:

```text
1
2
3
5
7
```

Do NOT hardcode `2` into business logic.

The default may be:

```text
2 days
```

but the actual value must come from configuration.

### Send time

Admin should be able to select the time at which the arrival email is sent.

Example:

```text
10:00 AM
```

Do not hardcode the send time.

---

# 3. EXISTING SYSTEM MUST BE UNDERSTOOD FIRST

Before writing code, inspect the complete existing architecture.

You already have the complete codebase.

Do not assume architecture.

Discover it.

---

# PHASE 1 — SYSTEM DISCOVERY

Inspect:

## Backend

Identify:

- Laravel version
- routes
- controllers
- services
- repositories
- models
- migrations
- jobs
- queues
- scheduler
- commands
- events/listeners
- notifications
- mailables
- Blade email templates
- Resend integration
- configuration system
- cache system
- database structure

Search for:

```text
Mail
Mailable
Notification
Resend
Email
Template
Booking
Reservation
Cottage
CheckIn
CheckOut
Queue
Job
Schedule
Scheduler
```

---

# 4. BOOKING FLOW ANALYSIS

Find the exact booking creation flow.

Document:

```text
Guest submits booking
        ↓
Validation
        ↓
Payment / confirmation
        ↓
Booking created
        ↓
Booking status
        ↓
Confirmation email
```

Identify:

### Booking model

Find:

- table name
- primary key
- status fields
- check-in field
- check-out field
- guest email
- guest name
- cottage/property relationship

Document exact field names.

Do NOT invent field names.

---

# 5. COTTAGE DATA ANALYSIS

Identify how cottages/properties are represented.

Find:

- Cottage model
- Cottage table
- booking → cottage relationship
- cottage name
- address
- key-safe information
- cottage-specific email template
- template mapping

The system already has cottage-specific arrival information.

Do not create duplicate cottage/template data if existing structures can be reused.

---

# 6. EXISTING EMAIL TEMPLATE SYSTEM

This is critical.

Inspect the existing email-template implementation.

Determine:

```text
Admin edits template
       ↓
API
       ↓
Laravel
       ↓
Database
       ↓
Email rendering
       ↓
Resend
```

Identify:

- template table
- template model
- template ID/key
- subject
- body/content
- HTML/text representation
- dynamic variables
- cottage mapping
- template selection logic

The existing email-template editing bug has already been fixed.

**Do not regress that fix.**

The new arrival automation MUST reuse the existing working template system.

---

# 7. RESEND ANALYSIS

The project already uses Resend.

Inspect the existing integration.

Determine exactly where:

```text
recipient
subject
HTML/body
```

are passed to Resend.

Do not replace Resend.

Do not create another email provider.

Reuse existing email infrastructure wherever possible.

---

# 8. QUEUE / SCHEDULER ANALYSIS

Inspect whether the project already uses:

- Laravel Scheduler
- queues
- database queue
- Redis
- Horizon
- cron
- supervisor
- worker
- delayed jobs

Determine the production environment.

Find:

```text
php artisan schedule:run
```

or equivalent production scheduler configuration.

Determine whether delayed jobs are already supported.

Do NOT introduce unnecessary infrastructure.

---

# 9. TIMEZONE ANALYSIS

This property is in the UK.

Determine how the application currently handles timezone.

Inspect:

```text
config/app.php
database timestamps
Carbon
booking timezone
server timezone
email timestamps
```

Do not blindly assume UTC or IST.

The arrival email send time should be interpreted consistently with the property's intended timezone.

If the project already has a timezone convention, reuse it.

If no clear convention exists, identify this as a decision in the analysis before implementation.

---

# 10. EXISTING EMAIL AUTOMATION ANALYSIS

Search for any existing:

```text
booking reminder
confirmation email
check-in email
check-out email
scheduled email
delayed email
notification
```

There may already be infrastructure that can be reused.

Prefer extending existing architecture instead of creating parallel systems.

---

# 11. REQUIRED FEATURE ARCHITECTURE

After understanding the current system, design the feature.

Preferred logical architecture:

```text
ADMIN SETTINGS
      ↓
Arrival Email Configuration
      ↓
enabled
days_before_arrival
send_time
timezone
      ↓
BOOKING
      ↓
Check-in Date
      ↓
Calculate Arrival Email Time
      ↓
        ┌─────────────────────────┐
        │ Booking is inside      │
        │ arrival window?        │
        └────────────┬────────────┘
                     │
          YES        │        NO
           ↓         │         ↓
      Send/queue     │     Schedule
      immediately    │     for calculated time
                     │
                     ↓
              EMAIL JOB
                     ↓
              Re-check booking
                     ↓
             Generate template
                     ↓
                  Resend
```

This is the conceptual architecture only.

Adapt it to the actual codebase after analysis.

---

# 12. SCHEDULING LOGIC

The core business rule:

```text
arrival_time = check_in_date/time
scheduled_time =
    check_in - configured_days_before
```

If the booking is created after the calculated scheduled time:

```text
send immediately
```

Example:

```text
configured days = 2

check-in = Nov 20
scheduled email = Nov 18 at configured send time

booking Nov 10
→ schedule Nov 18

booking Nov 17
→ schedule Nov 18

booking Nov 18 before send time
→ schedule for configured send time

booking Nov 18 after configured send time
→ immediate

booking Nov 19
→ immediate

booking Nov 20
→ immediate
```

The exact boundary behavior must be implemented consistently.

Document the chosen boundary logic before coding.

---

# 13. BOOKING STATUS SAFETY

Never send an arrival email blindly.

Before sending, verify:

```text
booking exists
booking is valid
booking is confirmed/eligible
booking is not cancelled
booking has guest email
booking has valid cottage
booking has valid check-in
```

Use the actual status values discovered in the codebase.

Do NOT invent status names.

---

# 14. DUPLICATE EMAIL PROTECTION

The system must not accidentally send the same arrival email multiple times.

Design idempotency.

Possible implementation:

```text
arrival_email_sent_at
```

or preferably a dedicated email automation record if the existing architecture supports it.

Recommended logical state:

```text
scheduled
sending
sent
failed
cancelled
```

But use the simplest architecture that fits the existing project.

---

# 15. BOOKING DATE CHANGES

This is a critical edge case.

Suppose:

```text
Original check-in:
Nov 20

Arrival email:
Nov 18
```

Then admin changes booking:

```text
New check-in:
Nov 25
```

The arrival email should not remain incorrectly scheduled for Nov 18.

Determine the appropriate behavior:

```text
cancel old schedule
calculate new schedule
create/update new schedule
```

Implement this if the current booking system supports booking-date modifications.

---

# 16. CANCELLATION

If booking is cancelled before the arrival email is sent:

```text
Do NOT send arrival email.
```

If the system has cancellation hooks/events, integrate there.

If it does not, the sending job MUST re-check booking status before sending.

---

# 17. TEMPLATE SELECTION

The email must use the correct cottage-specific template.

Flow should conceptually be:

```text
Booking
   ↓
Cottage
   ↓
Cottage-specific arrival template
   ↓
Dynamic booking data
   ↓
Rendered email
```

Do not hardcode:

```text
Oakwood
Willow Brook
Foxglove
Fern
The Dales
```

into business logic if the database already represents this relationship.

---

# 18. DYNAMIC DATA

Use the existing template variable system.

Possible data includes:

```text
guest first name
cottage name
arrival date
departure date
arrival time
cottage address
directions
key-safe information
what is provided
reminders
contact information
```

Use actual variable names discovered in the project.

Do NOT introduce a second placeholder syntax.

---

# 19. ADMIN UI

The admin panel should expose the configuration in a clear location.

Possible UI:

```text
Email Settings
    ↓
Guest Arrival Email

Enabled          [ON/OFF]

Send before arrival
[ 2 ] days

Send time
[ 10:00 ]

Timezone
[ existing property/application timezone ]
```

Use the existing admin design system.

Do not redesign unrelated pages.

Follow existing UI patterns.

---

# 20. SETTINGS STORAGE

Determine whether the project already has a settings/configuration table.

If yes:

**reuse it.**

Do not create another settings architecture unnecessarily.

If no appropriate settings system exists:

create a minimal dedicated configuration structure.

Potential fields:

```text
arrival_email_enabled
arrival_email_days_before
arrival_email_send_time
arrival_email_timezone
```

Do not blindly use these exact names if the existing project has naming conventions.

---

# 21. IMPORTANT: EXISTING TEMPLATE EDITOR MUST REMAIN WORKING

After implementing the feature:

Verify the previously fixed issue remains fixed.

Test:

```text
Edit template
→ save
→ refresh
→ updated content appears
```

And:

```text
Remove content
→ save
→ refresh
→ removed content remains removed
```

Then verify the arrival automation uses the updated template.

---

# PHASE 2 — DEEP ANALYSIS REPORT

Before changing any code, produce an internal technical report.

The report MUST contain:

## A. Current Architecture

```text
Booking creation:
...

Email system:
...

Template system:
...

Resend:
...

Queue:
...

Scheduler:
...

Admin settings:
...
```

## B. Existing Reusable Components

List exact files/classes/functions that can be reused.

## C. Missing Components

List what must be added.

## D. Risks

Examples:

```text
timezone
duplicate emails
cancelled booking
date changes
stale template cache
queue failure
missing email
```

## E. Recommended Architecture

Explain exactly how the new feature will fit into the existing system.

---

# PHASE 3 — IMPLEMENTATION PLAN

Only AFTER analysis is complete, create the concrete implementation plan.

It must list:

```text
1. Backend files to modify
2. Backend files to create
3. Database migration changes
4. Admin API changes
5. Admin UI changes
6. Queue/job changes
7. Scheduler changes
8. Email integration changes
9. Validation
10. Testing
```

For every file, explain:

```text
FILE:
WHY:
CHANGE:
RISK:
```

Do not modify unrelated files.

---

# 22. DATABASE DESIGN

Before creating migration, verify whether existing tables can support the feature.

Avoid unnecessary schema changes.

If a dedicated automation table is required, it should logically support:

```text
booking_id
email_type
scheduled_at
sent_at
status
attempts
error
```

Only add fields that are actually required.

Use foreign keys where consistent with the existing project.

---

# 23. JOB DESIGN

If a Laravel job is appropriate, it should:

1. Receive the booking/email automation ID.
2. Load fresh database state.
3. Verify booking status.
4. Verify guest email.
5. Verify check-in data.
6. Prevent duplicate sending.
7. Resolve the latest template.
8. Render dynamic variables.
9. Send through existing Resend service.
10. Mark successful send.
11. Record failure safely if sending fails.

Do not put all logic into the controller.

---

# 24. SCHEDULER DESIGN

Use the existing scheduler architecture if available.

The scheduler should reliably detect/send due arrival emails.

Do not create a process that requires the developer to manually run commands.

The production system must automatically execute the scheduled emails.

---

# 25. FAILURE HANDLING

If Resend fails:

```text
do not mark email as sent
```

Record the failure according to existing project conventions.

Avoid infinite duplicate sending.

If retry infrastructure exists, reuse it.

---

# 26. CONFIGURATION CHANGES

Changing:

```text
days_before_arrival
send_time
enabled
```

must affect future scheduled emails correctly.

Important question:

### What happens to already scheduled emails?

Analyze the current scheduling architecture and choose one:

### Option A

Existing scheduled records are recalculated when settings change.

### Option B

Only future bookings use the new configuration.

The implementation MUST document which behavior is selected.

Prefer the behavior that matches the client's expectation and existing architecture.

---

# 27. SECURITY

Admin-only settings must be protected.

Verify:

- authentication
- authorization
- validation
- CSRF/API protection
- mass assignment protection

Never allow a public API to change arrival-email settings.

---

# 28. PERFORMANCE

Do not query every booking on every scheduler execution if avoidable.

Prefer:

```text
due scheduled records
```

rather than scanning the entire booking table unnecessarily.

Use indexes where appropriate.

Do not over-engineer.

---

# PHASE 4 — IMPLEMENTATION

Only after completing analysis and plan:

## Step 1

Implement database changes.

## Step 2

Implement backend configuration.

## Step 3

Implement scheduling logic.

## Step 4

Implement email job.

## Step 5

Connect existing template system.

## Step 6

Connect existing Resend service.

## Step 7

Implement admin controls.

## Step 8

Implement booking lifecycle handling.

## Step 9

Implement duplicate protection.

## Step 10

Implement error handling.

---

# 29. DO NOT CHANGE UNRELATED SYSTEMS

Do not modify:

```text
payment
booking UI
authentication
cottage CRUD
existing email editor
Resend credentials
unrelated admin modules
```

unless the feature genuinely requires a change.

---

# PHASE 5 — TESTING

Create tests based on the actual architecture.

At minimum test:

### Test 1

```text
Booking 10 Nov
Check-in 20 Nov
Days = 2
→ scheduled 18 Nov
```

### Test 2

```text
Booking 19 Nov
Check-in 20 Nov
Days = 2
→ immediate
```

### Test 3

```text
Booking 20 Nov
Check-in 20 Nov
→ immediate
```

### Test 4

```text
Booking cancelled
→ no email
```

### Test 5

```text
Template edited
→ latest template used
```

### Test 6

```text
Booking date changed
→ old schedule handled correctly
```

### Test 7

```text
Same job executes twice
→ only one email
```

### Test 8

```text
Resend failure
→ not marked as sent
```

### Test 9

```text
Admin changes days from 2 → 5
→ new configuration works
```

### Test 10

```text
Admin changes send time
→ new time is respected
```

### Test 11

```text
Automation disabled
→ no arrival email sent
```

---

# 30. MANUAL PRODUCTION-SAFE TEST

Before sending a real guest email:

Use a controlled test booking / test email address if the application supports it.

Verify:

```text
database
→ scheduled time
→ job
→ rendered template
→ Resend payload
→ received email
```

Never send test emails to real guests.

---

# PHASE 6 — FINAL VERIFICATION

After implementation, perform a complete code review.

Check:

- no dead code
- no duplicate implementation
- no hardcoded days
- no hardcoded send time
- no hardcoded cottage mapping
- no duplicate email path
- no exposed secrets
- no broken existing template editor
- no broken booking flow
- no broken Resend integration
- no unnecessary migrations
- no unnecessary dependencies

Run:

```text
lint
type checks (if applicable)
Laravel tests
frontend tests
build
```

Use the project's existing commands.

Do not invent commands if the project does not use them.

---

# 31. FINAL REPORT

After implementation, provide:

```text
========================================
ARRIVAL EMAIL AUTOMATION IMPLEMENTED
========================================

ROOT ARCHITECTURE:
...

FILES CHANGED:
...

FILES CREATED:
...

DATABASE CHANGES:
...

ADMIN CHANGES:
...

SCHEDULER:
...

QUEUE/JOB:
...

EMAIL FLOW:
...

RESEND INTEGRATION:
...

DUPLICATE PROTECTION:
...

CANCELLATION HANDLING:
...

DATE CHANGE HANDLING:
...

TIMEZONE:
...

CONFIGURATION:
...

TEST RESULTS:
...
```

Then provide a final checklist:

```text
[ ] Existing email template editor still works
[ ] Template deletion works
[ ] Arrival email can be enabled/disabled
[ ] Days-before setting works
[ ] Send-time setting works
[ ] Future booking scheduling works
[ ] Late booking sends immediately
[ ] Same-day booking sends immediately
[ ] Correct cottage template selected
[ ] Latest template content used
[ ] Dynamic variables render
[ ] Cancelled booking does not send
[ ] Duplicate email prevented
[ ] Resend integration works
[ ] Booking date changes handled
[ ] Production scheduler works
[ ] No unrelated functionality broken
```

---

# ABSOLUTE AGENT RULES

1. **Analyze first.**
2. **Do not edit during analysis.**
3. **Do not assume architecture.**
4. **Use the existing codebase patterns.**
5. **Do not create duplicate email infrastructure.**
6. **Reuse existing Resend integration.**
7. **Reuse existing template system.**
8. **Do not hardcode the 2-day rule.**
9. **Do not hardcode send time.**
10. **Do not hardcode cottage mappings.**
11. **Protect against duplicate emails.**
12. **Check booking status immediately before sending.**
13. **Respect booking date changes.**
14. **Respect cancellation.**
15. **Do not break the existing template editor.**
16. **Do not modify unrelated functionality.**
17. **Use the existing queue/scheduler infrastructure whenever possible.**
18. **Do not add dependencies unless necessary.**
19. **Do not deploy until tests pass.**
20. **At the end, report exactly what changed and why.**

## MOST IMPORTANT

If the existing codebase already contains a suitable implementation for any part of this feature, **reuse it instead of creating another system**.

If there is ambiguity in the requirement or architecture, **document the ambiguity in the analysis and choose the safest implementation consistent with the existing project**.

Do not silently make major architectural decisions.