/** Client-side entitlements fetching. */

export type Entitlements = {
  report: boolean;
  monitoring: boolean;
  agency: boolean;
};

export async function fetchEntitlements(getIdToken: () => Promise<string>): Promise<Entitlements> {
  const token = await getIdToken();
  const res = await fetch("/api/entitlements", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    // Fail closed to free tier on error
    return { report: false, monitoring: false, agency: false };
  }
  return (await res.json()) as Entitlements;
}

export function hasPaidPlan(e: Entitlements): boolean {
  return e.report || e.monitoring || e.agency;
}

export function planName(e: Entitlements): string {
  if (e.agency) return "Agency white-label";
  if (e.monitoring) return "Monitoring";
  if (e.report) return "One-time report";
  return "Free";
}
