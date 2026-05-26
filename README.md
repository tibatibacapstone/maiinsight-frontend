# MaiinSight Frontend
MaiinSight is an analytics dashboard and decision support system designed to assist with performance monitoring, customer segmentation, marketing strategies, data management, and system operations for Maiin Gandaria.

## Tech Stack
- Next.js
- React
- TypeScript
- Tailwind CSS
- Radix UI
- Recharts

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
npm run dev
npm run build
npm run start
npm run typecheck
```

## Main Structure
- `app/` contains the Next.js entry point and global layout.
- `components/` contains dashboard and UI page components.
- `components/ui/` contains reusable UI components.
- `hooks/` contains React hooks.
- `lib/` contains helper utilities.
- `public/` contains the application’s static assets.

## Development Notes
This project uses npm as the primary package manager. Use `package-lock.json` as the official lockfile to ensure consistent dependencies in both local and deployment environments.