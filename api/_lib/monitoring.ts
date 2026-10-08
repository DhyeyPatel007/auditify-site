/**
 * Firestore-backed storage for monitored sites.
 * Requires FIREBASE_SERVICE_ACCOUNT (JSON string) env var.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function db() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured.");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

export type MonitoredSiteDoc = {
  url: string;
  host: string;
  email: string; // alert recipient
  uid: string;
  addedAt: string;
  lastScore?: number;
  lastGrade?: string;
  lastChecked?: string;
  status: "healthy" | "warning" | "failing";
};

/** List all monitored sites across all users (for the cron). */
export async function listAllMonitored(): Promise<MonitoredSiteDoc[]> {
  const snap = await db().collection("monitored_sites").get();
  return snap.docs.map((d) => d.data() as MonitoredSiteDoc);
}

/** List monitored sites for one user. */
export async function listUserMonitored(uid: string): Promise<(MonitoredSiteDoc & { id: string })[]> {
  const snap = await db()
    .collection("monitored_sites")
    .where("uid", "==", uid)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as MonitoredSiteDoc) }));
}

/** Add a site to monitor. Idempotent on (uid, url). */
export async function addMonitored(site: Omit<MonitoredSiteDoc, "addedAt" | "status">): Promise<string> {
  const id = `${site.uid}_${Buffer.from(site.url).toString("base64url")}`;
  await db()
    .collection("monitored_sites")
    .doc(id)
    .set(
      { ...site, addedAt: new Date().toISOString(), status: "healthy" as const },
      { merge: true }
    );
  return id;
}

/** Remove a monitored site (must belong to uid). */
export async function removeMonitored(uid: string, id: string): Promise<boolean> {
  const ref = db().collection("monitored_sites").doc(id);
  const doc = await ref.get();
  if (!doc.exists || (doc.data() as MonitoredSiteDoc).uid !== uid) return false;
  await ref.delete();
  return true;
}

/** Update last scan result after a monitoring check. */
export async function updateMonitoredResult(
  id: string,
  result: { score: number; grade: string; status: MonitoredSiteDoc["status"] }
): Promise<void> {
  await db().collection("monitored_sites").doc(id).update({
    lastScore: result.score,
    lastGrade: result.grade,
    status: result.status,
    lastChecked: new Date().toISOString(),
  });
}
