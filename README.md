# MaiinSight Frontend

MaiinSight adalah aplikasi dashboard analitik dan decision support system untuk membantu pemantauan performa, segmentasi pelanggan, strategi pemasaran, manajemen data, dan aktivitas sistem Maiin Gandaria.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Radix UI
- Recharts

## Menjalankan Project

Install dependency:

```bash
npm install
```

Jalankan development server:

```bash
npm run dev
```

Buka http://localhost:3000 di browser.

## Script

```bash
npm run dev
npm run build
npm run start
npm run typecheck
```

## Struktur Utama

- `app/` berisi entry point Next.js dan global layout.
- `components/` berisi komponen halaman dashboard dan UI.
- `components/ui/` berisi reusable UI components.
- `hooks/` berisi React hooks.
- `lib/` berisi helper utilities.
- `public/` berisi aset statis aplikasi.

## Catatan Pengembangan

Project ini menggunakan npm sebagai package manager utama. Gunakan `package-lock.json` sebagai lockfile resmi agar dependency konsisten di local dan deployment.
