# School Clinic — Phase 1 interface prototype

A clickable school clinic EMR design for a Ghanaian school of around 400 students. Built with React, TypeScript, Vite, Tailwind CSS, a shadcn-style Button, Radix Dialog and Lucide icons.

**This is a synthetic-data UI prototype, not a clinical system. Do not enter real student information.** No Supabase service or MySideAI resource is connected. All changes are held in browser memory and reset on reload. Different browsers do not share records. Role switching is a demonstration, not authentication or authorization.

## Deploy with Vercel

1. In Vercel, select **Add New → Project** and import `jrnk-nk/soshgic-emr`.
2. Select the branch containing this prototype (`codex/clinic-prototype`). For a new empty repository, this will normally become its default branch after the first push; check the production branch in Vercel settings.
3. Keep the root directory at the repository root and framework preset **Vite**.
4. Build command: `npm run build`. Output directory: `dist`. Install command: `npm ci --include=dev`.
5. Deploy. **No environment variables, Supabase keys or other secrets are required.**

`vercel.json` provides the install, build and output settings. It explicitly installs development dependencies because TypeScript and Vite are required at build time, including when `NODE_ENV=production` or npm defaults omit development dependencies. Use Node.js 22 LTS or newer supported by Vite. All runtime assets are bundled; the prototype has no external font, analytics or API dependencies.

## Try the workflow

- Open a student from the clinic queue and confirm their identity.
- In the Nurse view, enter a complaint, measured vitals and a nurse assessment. Send the visit to the doctor, observation or nurse care. Urgent care bypasses the queue.
- Close the drawer, switch **View as** to **Doctor**, and reopen the student.
- Use **Consultation** to record an assessment, plan and return instructions.
- Use **Treatment** to record individual prescribed, dispensed or administered events. One event never creates the others.
- Add a dated follow-up task. Tasks can be completed or reopened on the Follow-ups screen.
- Sign the demo visit from Consultation. Find the read-only original and append a correction in History.
- Use Students to search by name, student ID or class. New visit opens an existing active visit rather than duplicating it.
- Reports show aggregate counts for the current demo session.

The demonstration uses a fixed example day (5 October 2026); newly entered events use the browser's current clock. All names and health details are fictional.

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

Tests cover identity validation and nurse-to-doctor handover, signed-note locking and amendments, medication event separation, urgent queue bypass, student search, follow-up completion and mobile overflow.

## Before clinical use

This prototype deliberately has no database, real login, backend permission checks, RLS, audit trail, file storage, reliable persistence or disaster recovery. Its frontend read-only controls and signatures do not provide medical-record integrity. It also has no clinical decision support, medication dose validation or treatment recommendations.

Production work must include:

- A separately maintained school server running production Supabase with PostgreSQL, Auth, Storage and Edge Functions; local HTTPS, DNS and offline-capable authentication.
- Individual accounts and server-enforced nurse, doctor, administrative and leadership permissions, with restricted developer access.
- Structured medication orders and treatment events, clinical validation and approved nurse protocols.
- Separately signed nurse and doctor contributions, independently managed encounter closure, immutable originals and audited amendments. The prototype uses one simplified final visit snapshot and is not the production signing model.
- Server timestamps, concurrency control, server-confirmed saves, chart-access and export audits, and private attachments.
- Clinically reviewed triage, referral and observation workflows; more detailed queue states; verified allergy and current-medicine records.
- Small-group suppression for leadership reporting, Ghana privacy review, retention rules and incident procedures.
- UPS protection, encrypted off-site and offline backups, recovery of database/auth/files/configuration, tested restores and paper downtime reconciliation.

Vercel is appropriate for this synthetic demonstration. The proposed offline school production system must serve both its website and backend locally. Keep its credentials, records and deployments separate from MySideAI.
