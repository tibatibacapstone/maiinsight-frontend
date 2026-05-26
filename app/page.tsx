export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/95 p-10 shadow-xl shadow-slate-950/25">
        <h1 className="text-5xl font-semibold">MaiinSight Frontend</h1>
        <p className="mt-4 text-lg text-slate-300">
          This folder is now reset to a clean frontend display. Copy your existing frontend files into this project and run the app here.
        </p>

        <div className="mt-8 rounded-3xl bg-slate-950/80 p-6 text-slate-300">
          <h2 className="text-xl font-semibold text-slate-100">How to combine your existing frontend</h2>
          <ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-7">
            <li>Copy your existing frontend source into `maiinsight-frontend`, including `app/` or `pages/`, `public/`, `styles/`, and `components/`.</li>
            <li>If your frontend has its own `package.json`, merge dependencies and scripts into the current `maiinsight-frontend/package.json` or replace it.</li>
            <li>Remove any unused scaffold files only if they conflict with your frontend structure.</li>
            <li>Run <code>npm install</code> in `maiinsight-frontend`, then <code>npm run dev</code>.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
