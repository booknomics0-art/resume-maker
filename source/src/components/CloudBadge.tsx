import { useEffect, useState } from 'react';
import { CLOUD_STATUS_EVENT, cloudStatus, type CloudStatus } from '../lib/cloud';

const LABEL: Record<CloudStatus, string> = {
  off: 'Saved in this browser',
  'signed-out': 'Cloud: signed out',
  syncing: 'Cloud: syncing…',
  synced: 'Cloud: saved',
  error: 'Cloud: sync error',
};
const COLOR: Record<CloudStatus, string> = {
  off: 'var(--silver-500)', 'signed-out': 'var(--silver-500)', syncing: 'var(--navy-600)', synced: 'var(--ok)', error: 'var(--err)',
};

/** Small inline indicator of the Supabase sync state. */
export default function CloudBadge() {
  const [s, setS] = useState(cloudStatus());
  useEffect(() => {
    const fn = () => setS(cloudStatus());
    window.addEventListener(CLOUD_STATUS_EVENT, fn);
    return () => window.removeEventListener(CLOUD_STATUS_EVENT, fn);
  }, []);
  return (
    <span title={s.error || undefined} style={{ color: COLOR[s.status], fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>
      {s.status === 'synced' ? '☁️ ' : s.status === 'syncing' ? '⟳ ' : s.status === 'error' ? '⚠ ' : '💾 '}
      {LABEL[s.status]}
    </span>
  );
}
