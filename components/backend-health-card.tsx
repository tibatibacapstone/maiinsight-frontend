'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { getApiUrl } from '../lib/api';

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

export function BackendHealthCard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiUrl('/health'), {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      setHealth(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Backend health</h2>
          <p className="mt-1 text-sm text-slate-400">Live status from the Express API.</p>
        </div>
        <Button onClick={fetchHealth} variant="secondary">
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-slate-300">Loading status…</p>
      ) : error ? (
        <div className="rounded-2xl bg-rose-950/80 p-4 text-sm text-rose-200">
          <p className="font-semibold">Error fetching API</p>
          <p>{error}</p>
        </div>
      ) : health ? (
        <div className="space-y-3 text-slate-300">
          <div className="rounded-2xl bg-slate-950/80 p-4">
            <p className="text-sm text-slate-400">Service</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{health.service}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-950/80 p-4">
              <p className="text-sm text-slate-400">Status</p>
              <p className="mt-1 text-lg font-semibold text-emerald-400">{health.status}</p>
            </div>
            <div className="rounded-2xl bg-slate-950/80 p-4">
              <p className="text-sm text-slate-400">Last checked</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{new Date(health.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-slate-400">No status available yet.</p>
      )}
    </Card>
  );
}
