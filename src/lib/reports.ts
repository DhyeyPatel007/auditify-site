/**
 * Past scan reports, stored client-side per signed-in user.
 *
 * Until the paid backend (Phase 2) exists, scan history lives in the
 * browser's localStorage keyed by the user's Firebase UID — the site never
 * sends it anywhere. When the user logs in on a new device they see that
 * device's history; server-side history arrives with the Phase 2 backend.
 */

export type PastReport = {
  url: string;
  host: string;
  score: number;
  grade: string;
  checksRun: number;
  scannedAt: string; // ISO
};

const MAX_STORED = 20;

function keyFor(uid: string): string {
  return `auditify:reports:${uid}`;
}

export function listReports(uid: string): PastReport[] {
  try {
    const raw = localStorage.getItem(keyFor(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PastReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReport(uid: string, report: PastReport): void {
  try {
    const existing = listReports(uid).filter(
      (r) => !(r.url === report.url && r.scannedAt === report.scannedAt)
    );
    const next = [report, ...existing].slice(0, MAX_STORED);
    localStorage.setItem(keyFor(uid), JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode etc.) — the scan itself still works.
  }
}

export function clearReports(uid: string): void {
  try {
    localStorage.removeItem(keyFor(uid));
  } catch {
    /* ignore */
  }
}
