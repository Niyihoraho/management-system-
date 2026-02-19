Public Registration System Implementation Plan
Goal Description
Implement a secure, "Security-by-Design" public registration system. This system allows Superadmins to generate role-specific invitation links (e.g., for Students or Graduates). Public users access these unique links to register. Data is vetted in a "Staging/Pending" table before being promoted to the core database. This ensures strict data integrity and security.

User Review Required
IMPORTANT

Superadmin Exclusivity: Confirm that only Superadmins can generate links. Regional Admins will not have this ability in V1.

WARNING

Re-activation Logic: Re-activation requests will appear in the PendingApprovals table but will be flagged as "Re-activation". The Admin must manually approve them to restore the user's access.

Proposed Changes
Database Schema
We need two new tables to support this flow.

[NEW] InvitationLinks
Stores the valid entry tokens.

token (String, Unique) - e.g., "student-kigali-2026"
role (Enum) - "student" or "graduate"
expiration (DateTime)
createdBy (UserUUID) - Superadmin ID
isActive (Boolean)
description (String) - e.g., "Kigali 2026 Campaign"
[NEW] PendingApprovals
Stores the unverified submissions.

id (UUID)
hashedPhone (String) - For deduplication
payload (JSONB) - The full form data
submittedAt (DateTime)
invitationToken (String) - Which link they used
status (Enum) - "pending", "approved", "rejected"
matchType (Enum) - "new_user", "re_activation"
Admin Zone (Superadmin Only)
[NEW] app/links/admin/invitations/page.tsx
The dashboard for managing public links.

List View: Active links, usage stats, expiration dates.
Actions: "Create New Link", "Revoke Link".
Create Modal:
Input: Slug (optional, auto-generated if empty), Target Role (Student/Graduate), Expiration.
Public Zone
[NEW] app/join/[token]/page.tsx
The dynamic entry point.

Logic:
Validate token from URL.
If invalid/expired -> Show 404 or "Expired" message.
If valid -> Check role type.
Render appropriate form (StudentForm vs GraduateForm).
[New] Form Logic & Security
Real-time Validation: On blur, send verify-contact request.
Honeypot: Hidden fields to trap bots.
Submission:
Payload sent to api/public/submit.
Backend checks hashedPhone.
If exists in Users and status=inactive -> Mark as re_activation.
If exists in Users and status=active -> Reject (User already exists).
If new -> Mark as new_user.
Insert into PendingApprovals.
Verification Plan
Automated Tests
Test valid vs. invalid tokens.
Test "Student" token renders Student fields.
Test "Graduate" token renders Graduate fields.
Test submission flow to PendingApprovals.
Manual Verification
Admin Flow: Log in as Superadmin, create a link "test-student".
Public Flow: Open localhost:3000/join/test-student in Incognito.
Submission: Fill form, submit.
Admin Review: Check PendingApprovals (or DB) to see the new row