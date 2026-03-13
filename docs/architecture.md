# Architecture

## Product overview

AI fashion try-on MVP: users upload fitting photos on the web app, browse products on supported stores (e.g. Zara), and trigger try-on jobs from a Chrome extension. Results are stored in an archive and viewable in the web app.

**Components:** Web app, Chrome extension, FastAPI backend, Python worker. Web app is the source of truth for user identity and fitting profiles. Extension triggers try-on workflows only.

---

## Core user flows

1. **Profile setup** — User signs in on web app → uploads base images → creates fitting profile(s).
2. **Try-on trigger** — User browses Zara product page → extension detects product → user selects profile → job queued.
3. **Result viewing** — Worker processes job → result stored → user views archive in web app.

---

## Web app responsibilities

- User authentication and session management
- Fitting profile CRUD (create, edit, delete profiles and base images)
- Archive browsing and result viewing
- Source of truth for user identity and fitting profile data

Does **not** trigger try-on jobs or process images; it manages identity and profile state.

---

## Chrome extension responsibilities

- Detect product pages on supported stores (Zara first)
- Extract product metadata (URL, image, title)
- Let user pick a fitting profile and trigger a try-on job via API
- Show job status (queued, processing, completed, failed)

Does **not** store raw user images, manage profiles, or persist user data beyond authenticated API calls.

---

## API responsibilities

- Profile APIs (CRUD, base image upload) — delegates to web app’s source of truth
- Product resolution (normalize store URLs to product IDs)
- Try-on job APIs (create, status, list)
- Archive APIs (list results, fetch by ID)

Stateless; no long-running work. Jobs are queued for the worker.

---

## Worker responsibilities

- Consume try-on jobs from queue
- Fetch product + profile data from API/DB
- Run try-on generation (mock first, real provider later)
- Persist results to archive
- Update job state: queued → processing → completed/failed

---

## Why the web app is the source of truth for fitting profiles

- **Single place for identity and profile data** — Auth, profiles, and base images live in one app. Extension and API treat the web app as authoritative.
- **Simpler security** — One surface for uploads, validation, and access control.
- **Consistent UX** — Profile management happens in one UI; extension only selects from existing profiles.
- **Easier compliance** — User data flows through a controlled path instead of being duplicated in the extension.

---

## Why try-on generation is async

- **Latency** — Generation takes seconds to minutes; HTTP requests would time out.
- **Resource usage** — CPU/GPU work is offloaded to workers; API stays responsive.
- **Scalability** — Workers can scale independently; queue absorbs bursts.
- **State** — Jobs are stateful (queued, processing, completed, failed); async model fits naturally.

---

## Why the extension should not store raw user images

- **Security** — Extensions run in the browser; local storage is easier to compromise than server-side storage.
- **Single source of truth** — Profiles and base images live in the web app; extension should not duplicate or cache them.
- **Compliance** — Raw biometric/personal images should be stored only in controlled backend storage.
- **Simplicity** — Extension sends profile IDs to the API; API fetches images from the backend. No image handling in the extension.
