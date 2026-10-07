/**
 * Scan reports management — client-side persistence with server-side sync.
 */

export type ReportIssue = {
  id: string;
  title: string;
  severity: "FAIL" | "WARN";
  metric: string;
  detail: string;
  fix: string;
};

export type PastReport = {
  url: string;
  host: string;
  score: number;
  grade: string;
  checksRun: number;
  scannedAt: string; // ISO
  unlocked?: boolean; // true if full report has been unlocked with a credit
  durationMs?: number;
  summary?: { pass: number; warn: number; fail: number };
  issues?: ReportIssue[];
};

const MAX_STORED = 30;

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

export function saveReport(
  uid: string,
  report: PastReport,
  getIdToken?: () => Promise<string>
): void {
  try {
    const existing = listReports(uid).filter(
      (r) => !(r.url === report.url && r.scannedAt === report.scannedAt)
    );
    const next = [report, ...existing].slice(0, MAX_STORED);
    localStorage.setItem(keyFor(uid), JSON.stringify(next));

    // Async server-side backup
    if (getIdToken) {
      getIdToken()
        .then((token) =>
          fetch("/api/history", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ report }),
          })
        )
        .catch(() => {});
    }
  } catch {
    // Storage unavailable
  }
}

/** Sync client reports with server history */
export async function syncReports(
  uid: string,
  getIdToken: () => Promise<string>
): Promise<PastReport[]> {
  const local = listReports(uid);
  try {
    const token = await getIdToken();
    const res = await fetch("/api/history", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const serverReports = (data.reports || []) as PastReport[];
      // Merge unique by url + scannedAt
      const map = new Map<string, PastReport>();
      for (const r of local) map.set(`${r.url}#${r.scannedAt}`, r);
      for (const r of serverReports) {
        const k = `${r.url}#${r.scannedAt}`;
        const existing = map.get(k);
        if (!existing) {
          map.set(k, r);
        } else {
          // If server or local has unlocked: true, preserve unlocked
          map.set(k, { ...existing, ...r, unlocked: existing.unlocked || r.unlocked });
        }
      }
      const merged = Array.from(map.values())
        .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
        .slice(0, MAX_STORED);
      localStorage.setItem(keyFor(uid), JSON.stringify(merged));
      return merged;
    }
  } catch {
    // Fall back to local
  }
  return local;
}

export function unlockReport(uid: string, url: string, scannedAt?: string): boolean {
  try {
    const normTarget = url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    const reports = listReports(uid);
    let matched = false;

    // Try exact match first
    const updated = reports.map((r) => {
      const normR = r.url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
      if (normR === normTarget && (!scannedAt || r.scannedAt === scannedAt)) {
        matched = true;
        return { ...r, unlocked: true };
      }
      return r;
    });

    // If no exact timestamp match, unlock the most recent scan for this URL
    if (!matched) {
      let foundLatest = false;
      const fallback = reports.map((r) => {
        const normR = r.url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
        if (normR === normTarget && !foundLatest) {
          foundLatest = true;
          matched = true;
          return { ...r, unlocked: true };
        }
        return r;
      });
      localStorage.setItem(keyFor(uid), JSON.stringify(fallback));
      return matched;
    }

    localStorage.setItem(keyFor(uid), JSON.stringify(updated));
    return matched;
  } catch {
    return false;
  }
}

export function countUnlocked(uid: string): number {
  return listReports(uid).filter((r) => r.unlocked).length;
}

export function clearReports(
  uid: string,
  getIdToken?: () => Promise<string>
): void {
  try {
    localStorage.removeItem(keyFor(uid));
    if (getIdToken) {
      getIdToken()
        .then((token) =>
          fetch("/api/history", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
        .catch(() => {});
    }
  } catch {
    /* ignore */
  }
}
