# School Clinic — Phase 1 interface prototype

A clickable school clinic EMR design for a Ghanaian school of around 400 students. Built with React, TypeScript, Vite, Tailwind CSS, a shadcn-style Button, Radix Dialog and Lucide icons.

**This is a synthetic-data UI prototype, not a clinical system. Do not enter real student information.** No Supabase service or MySideAI resource is connected. Saved demo changes are retained in sessionStorage in the current tab and survive refresh. Closing the browser session or using Reset demo clears them. Other browsers, tabs and computers do not share records. Unsaved form edits are not persisted and show a navigation warning. Role switching is a demonstration, not authentication or authorization.

## Deploy with Vercel

1. In Vercel, select **Add New → Project** and import `jrnk-nk/soshgic-emr`.
2. Select the branch containing this prototype (`codex/clinic-prototype`). For a new empty repository, this will normally become its default branch after the first push; check the production branch in Vercel settings.
3. Keep the root directory at the repository root and framework preset **Vite**.
4. Build command: `npm run build`. Output directory: `dist`. Install command: `npm ci --include=dev`.
5. Deploy. **No environment variables, Supabase keys or other secrets are required.**

`vercel.json` provides the install, build and output settings. It explicitly installs development dependencies because TypeScript and Vite are required at build time, including when `NODE_ENV=production` or npm defaults omit development dependencies. Use Node.js 22 LTS or newer supported by Vite. All runtime assets are bundled; the prototype has no external font, analytics or API dependencies.

## Try the workflow

- Use the explicit Nurse and Doctor workspace buttons. These are simulated roles, not user accounts.
- Nurses have a worklist for triage, nurse care, observation and treatment. Doctors see pending consultations. The shared queue sorts urgent first, then priority and arrival time.
- View a student chart independently of registering a new visit. Existing active visits are reused. Doctors can create direct consultations with a presenting complaint.
- Nurses confirm identity/alerts, save and sign their own assessment, then send a summary to the doctor queue.
- The doctor explicitly accepts the handover and begins consultation. Sent and accepted times remain visible to both roles.
- Student-specific care messages go to the other role and require explicit recipient acknowledgement. Urgent flags are not a substitute for direct emergency communication.
- Signatures lock only the author's contribution. Signing a doctor note leaves the encounter open for nursing treatment.
- Prescriptions, dispensing, administration, not-given events and procedures are separate. Medication events link to an order; nothing is automatically administered.
- Nurse-only care requires a protocol reference. Observation has a responsible role, future review time and append-only repeat assessments.
- Schedule follow-ups with a date, time and owner. Only the assigned role can complete a task.
- Review instructions and outstanding orders, mark ready to close, then close separately. Referral also records a reason.
- Add amendments to your own signed contribution without replacing the original. The timeline shows actions within this synthetic demonstration.

All names and health details are fictional. Demo timestamps are relative to the current day; displayed times use Africa/Accra. Ghana date/time inputs use UTC+0.

## Run locally

```sh
npm ci
npm run dev
```

Open the address printed by Vite. For a production bundle:

```sh
npm run build
npm exec vite preview
```

## Verify

```sh
npx playwright install chromium
npm test
```

The test runner starts Vite automatically. In environments with system Chromium already installed, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm test`.

GitHub Actions runs a clean install, TypeScript/Vite production build, workflow model tests and Chromium browser tests on every push and pull request. Coverage includes handover acceptance, independent signatures, linked medication events, amendments, urgent sorting, observations, role-owned tasks, direct doctor visits, draft protection, session refresh and mobile layouts.

## Before clinical use

This prototype has no shared database, real login, backend permission checks, RLS, protected audit trail, file storage, reliable clinical persistence or disaster recovery. Its frontend read-only controls and signatures do not provide medical-record integrity. It also has no clinical decision support, medication dose validation or treatment recommendations.

Production work must include:

- A separately maintained school server running production Supabase with PostgreSQL, Auth, Storage and Edge Functions; local HTTPS, DNS and offline-capable authentication.
- Individual accounts and server-enforced nurse, doctor, administrative and leadership permissions, with restricted developer access.
- Structured medication orders and treatment events, clinical validation and approved nurse protocols.
- Separately signed nurse and doctor contributions, independently managed encounter closure, immutable originals and audited amendments. The prototype now models separately signed contributions, but the controls still need backend enforcement and authenticated staff identities.
- Server timestamps, concurrency control, server-confirmed saves, chart-access and export audits, and private attachments.
- Clinically reviewed triage, referral and observation workflows; more detailed queue states; verified allergy and current-medicine records.
- Small-group suppression for leadership reporting, Ghana privacy review, retention rules and incident procedures.
- UPS protection, encrypted off-site and offline backups, recovery of database/auth/files/configuration, tested restores and paper downtime reconciliation.

Vercel is appropriate for this synthetic demonstration. The proposed offline school production system must serve both its website and backend locally. Keep its credentials, records and deployments separate from MySideAI.
