# Finances OSS

Finances OSS is a SvelteKit-based prototype for managing freelance-style invoices end to end. It bundles:

- Secure session-based authentication with optional OIDC sign-in.
- Invoice CRUD flows and date/amount validation powered by Zod.
- Prisma + SQLite persistence for users, sessions, and invoices.
- Server-driven PDF rendering using Puppeteer plus a Svelte invoice template.

## ⚠️ Important Notices

- **No legal/compliance guarantee** – This software does **not** aim to satisfy any regulatory, legal, accounting, or tax requirements. It is purely educational.
- **Non-commercial only** – The project is licensed under [CC BY-NC 4.0](LICENSE). Commercial usage, resale, or SaaS deployment is not permitted.
- **Use at your own risk** – The code is provided “as is,” without warranties or support. You are solely responsible for reviewing and operating it safely.

## Getting Started

```bash
bun install
bunx puppeteer browser install chrome-headless-shell
bun run dev
```

Environment variables belong in `.env` (see `.env.example`). The default setup uses SQLite via Prisma and optionally OIDC for authentication.

## Deployment

The repo ships a NixOS module (`configuration.nix`) that fetches release artifacts from `florianb-de/finance-oss`. GitHub Actions (`.github/workflows/release.yml`) builds the app, runs checks/linting, and uploads a tarball to tagged releases.

## License

Distributed under the [Creative Commons Attribution-NonCommercial 4.0 International License](LICENSE). Use for non-commercial purposes only.
