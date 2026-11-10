# PostHog error tracking

> ⚠️ **Needs your attention**
> - In Vercel project `co-zamawiamy`, add `POSTHOG_API_KEY` (Sensitive), `POSTHOG_PROJECT_ID`, and `POSTHOG_HOST` in Settings → Environment Variables for every environment whose builds should upload source maps (at minimum Production; add Preview if desired).
> - In the same Vercel environments, add the runtime variables `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`.
> - Redeploy after saving the Vercel variables; environment changes apply to new builds.

## What you still need to do

1. Create a personal API key at <https://eu.posthog.com/source-maps-key> using the **Source map upload** preset, unless the existing `POSTHOG_API_KEY` is already the intended key.
2. In Vercel, open **co-zamawiamy → Settings → Environment Variables** and add `POSTHOG_API_KEY` as Sensitive, plus `POSTHOG_PROJECT_ID` and `POSTHOG_HOST`, to Production (and Preview if those builds should upload). Set `POSTHOG_PROJECT_ID` to `341841` and `POSTHOG_HOST` to the EU PostHog host configured for this project. Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` there as well for runtime capture. Then trigger a redeploy.
3. No GitHub Actions secrets are needed for production: `.github/workflows/playwright.yml` is test-only. If another deployment target is introduced, expose the three upload variables wherever that target runs `npm run build`.

## What is working now

Uncaught browser exceptions are captured through the existing browser integration in `instrumentation-client.ts`, with `capture_exceptions: true`. React errors caught by the App Router boundaries are sent from `app/error.tsx` and `app/global-error.tsx`. Next.js server request errors from Server Components, Route Handlers, and Server Actions are captured through `instrumentation.ts` and the guarded Node SDK singleton in `lib/posthog-server.ts`. The Node SDK also covers uncaught Node exceptions. The existing OpenTelemetry PostHog log exporter remains intact.

The project now has PostHog error tracking installed and initialized: `@posthog/next`, `posthog-node`, and `@posthog/nextjs-config` were added to the root package. Runtime capture uses the existing environment-based PostHog configuration; no custom global exception listeners were added.

## Source maps and verification

Source-map upload is wired in these files:

- `next.config.ts`
- `package.json`
- `package-lock.json`

The exact production build command is `npm run build`. It is configured to upload when `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`, and `POSTHOG_HOST` are present where the build runs. The verified build succeeded under Next.js 16.4.5, created a PostHog release, found 118 candidates, and uploaded 97 chunks. It also reported 46 generated pairs without PostHog chunk/native debug IDs and skipped 4 empty maps; the build still completed successfully.

The repository's production path is the linked Vercel project, so the repository could not wire Vercel's environment settings directly. Once those variables are present in Vercel, every new production build will upload source maps. Local `.env.local` values do not propagate to Vercel automatically.

## How to verify in PostHog

Trigger an error, then open <https://eu.posthog.com/project/341841/error_tracking>. Uploaded symbol sets appear at <https://eu.posthog.com/project/341841/error_tracking/configuration>.

After the Vercel variables are added and the next production deploy completes, confirm that the captured exception has a readable, symbolicated stack trace. The test and pull-request workflow remains test-only; no release-linking configuration was wired, so there is no release ID requirement for local runs, tests, or pull-request builds.
