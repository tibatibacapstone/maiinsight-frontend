# maiinsight-frontend
This folder is now reset to a clean frontend scaffold. Replace it with your existing frontend app from your other project.

## How to merge your existing frontend

1. Copy your frontend source into `maiinsight-frontend`. Include `app/` or `pages/`, `public/`, `styles/`, `components/`, and any config files.
2. If your existing frontend has a `package.json`, merge dependencies and scripts into this folder's `package.json` or replace it entirely.
3. Remove stale scaffold files only if they conflict with your app structure.
4. Run `npm install` in `maiinsight-frontend` and then `npm run dev`.

## Setup
## Setup

```bash
cd maiinsight-frontend
npm install
npm run dev
```

### Optional API configuration

Create a `.env.local` file in `maiinsight-frontend` if your backend is running somewhere other than the default:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Then restart the dev server.

## Features

- Clean placeholder frontend page
- Ready to accept an imported frontend app
- Tailwind styling already enabled

