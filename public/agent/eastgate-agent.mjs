#!/usr/bin/env node
/**
 * Eastgate Office LAN Monitoring Agent
 * Runs on any Windows/Linux/macOS PC inside the office LAN (Node.js 18+).
 * It connects OUT to the dashboard (no port forwarding needed), pings store
 * laptops on their local IPs, and reports real results back.
 *
 *   Windows (PowerShell):
 *     $env:DASHBOARD_URL="https://your-dashboard-url"; $env:AGENT_TOKEN="egagent_..."; node eastgate-agent.mjs
 *   Linux/macOS:
 *     DASHBOARD_URL=https://your-dashboard-url AGENT_TOKEN=egagent_... node eastgate-agent.mjs
 */
import { exec } from "node:child_process";
import os from "node:os";

const BASE = (process.env.DASHBOARD_URL || "").replace(/\/$/, "");
const TOKEN = process.env.AGENT_TOKEN || "";
const POLL_MS = 3000;
const CONCURRENCY = 20;
if (!BASE || !TOKEN) {
  console.error("Set DASHBOARD_URL and AGENT_TOKEN environment variables.");
  process.exit(1);
}
const isWin = process.platform === "win32";
const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", "X-Agent-Name": os.hostname() };

function ping(ip) {
  return new Promise((resolve) => {
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return resolve({ success: false, responseTime: null, error: "Invalid IP" });
    const cmd = isWin ? `ping -n 1 -w 2000 ${ip}` : `ping -c 1 -W 2 ${ip}`;
    const started = Date.now();
    exec(cmd, { timeout: 6000 }, (err, stdout = "") => {
      const m = /time[=<]\s*([\d.]+)\s*ms/i.exec(stdout);
      const ok = !err && (m !== null || /ttl=/i.test(stdout));
      if (ok) {
        resolve({ success: true, responseTime: m ? Math.max(1, Math.round(Number(m[1]))) : Date.now() - started, error: null });
      } else {
        const unreachable = /unreachable/i.test(stdout);
        resolve({ success: false, responseTime: null, error: unreachable ? "Destination host unreachable" : "Request timed out" });
      }
    });
  });
}

async function runAll(jobs) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
      while (i < jobs.length) {
        const job = jobs[i++];
        const r = await ping(job.ip);
        out.push({ requestId: job.requestId ?? null, storeId: job.storeId, ...r, checkedAt: new Date().toISOString() });
      }
    }),
  );
  return out;
}

async function report(results) {
  if (!results.length) return;
  const res = await fetch(`${BASE}/api/public/agent/results`, { method: "POST", headers, body: JSON.stringify({ results }) });
  if (!res.ok) console.error("Report failed:", res.status);
}

let lastSweep = 0;
async function tick() {
  try {
    const res = await fetch(`${BASE}/api/public/agent/jobs`, { headers });
    if (res.status === 401) return console.error("Token rejected — generate a new token on the Monitoring Agent page.");
    if (!res.ok) return console.error("Poll failed:", res.status);
    const jobs = await res.json();
    if (jobs.pingRequests.length) await report(await runAll(jobs.pingRequests));
    if (jobs.autoEnabled && Date.now() - lastSweep >= jobs.intervalSeconds * 1000) {
      lastSweep = Date.now();
      const results = await runAll(jobs.stores);
      await report(results);
      console.log(`[${new Date().toLocaleTimeString()}] Checked ${results.length} stores, ${results.filter((r) => r.success).length} online`);
    }
  } catch (e) {
    console.error("Agent error:", e.message);
  }
}

console.log(`Eastgate LAN agent started on ${os.hostname()} -> ${BASE}`);
(async function loop() {
  await tick();
  setTimeout(loop, POLL_MS);
})();
