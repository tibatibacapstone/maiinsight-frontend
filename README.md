# MaiinSight Frontend

Web-based analytics dashboard for MaiinSight — a customer segmentation and marketing decision support system for Maiin Gandaria.

**Repository:** https://github.com/tibatibacapstone/maiinsight-frontend

## Tech Stack

- Next.js 16.2
- React 19
- TypeScript 5.7
- Tailwind CSS 4.2
- shadcn/ui (Radix UI)
- Recharts
- react-hook-form + zod

## Running the Project

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm start            # Start production server
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
```

## Environment Variables

Copy `.env.example` to `.env`:

```ini
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

`NEXT_PUBLIC_GOOGLE_CLIENT_ID` must match the backend `GOOGLE_CLIENT_ID`. The
frontend sends a Google ID token, which the backend verifies against that audience.

`NEXT_PUBLIC_API_BASE_URL` is preferred. Existing deployments may continue using
the backward-compatible `NEXT_PUBLIC_API_URL` variable. When both are configured,
`NEXT_PUBLIC_API_BASE_URL` takes priority. Production builds reject missing or
placeholder API URLs; localhost fallback is development-only. The committed
`.env.production` intentionally contains no active backend URL assignment.
Production deployment must inject one valid value, for example:

```ini
NEXT_PUBLIC_API_BASE_URL=https://actual-backend-domain.example
```

See [Installation Guide](../docs/INSTALLATION-GUIDE.md) for full configuration.

## Main Structure

- `app/` — Next.js entry point, global layout, routes
- `components/` — Dashboard and page components
- `components/ui/` — shadcn/ui reusable components
- `hooks/` — React hooks
- `lib/` — API client, helpers, roles/permissions
- `public/` — Static assets (logo, images)

## Available Modules

| Module | Access |
|--------|--------|
| Dashboard | All roles |
| Customer Segmentation | Operational, Management, IT Support |
| Data Center | Operational, IT Support |
| Low Occupancy Targeting | Operational, IT Support |
| GenAI Workspace | Operational, IT Support |
| InstaSight | All roles |
| Management Reports | Operational, Management, IT Support |
| History | Operational, IT Support |
| Settings | IT Support only |
