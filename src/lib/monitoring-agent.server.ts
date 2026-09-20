/**
 * MOCK LOCAL MONITORING AGENT
 * ---------------------------
 * In production this module is replaced by a call to the real shop-side agent:
 *
 *   Dashboard -> Monitoring API (server functions) -> Shop Agent -> Local IP
 *
 * Browsers and cloud servers cannot reach private LAN IPs directly, so the
 * agent installed on the shop network performs the actual ICMP/TCP probe and
 * reports back. Everything below simulates that agent for development/demo.
 */

export type AgentProbe = {
  reachable: boolean;
  responseTime: number | null;
  agentStatus: "connected" | "disconnected";
};

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Simulates a probe of one shop machine over its LAN agent. */
export async function probeStore(input: {
  storeCode: string;
  ipAddress: string;
  agentStatus: string;
}): Promise<AgentProbe> {
  // Agent not installed / not reporting: status cannot be determined.
  if (input.agentStatus === "disconnected") {
    return { reachable: false, responseTime: null, agentStatus: "disconnected" };
  }

  const seed = hash(`${input.storeCode}:${input.ipAddress}`);
  // A stable minority of shops are down, plus a little real-world flapping.
  const chronicallyDown = seed % 13 === 0;
  const flapping = Math.random() < 0.04;
  const reachable = !(chronicallyDown || flapping);

  // Simulated round-trip latency, weighted per store so numbers stay realistic.
  const base = 6 + (seed % 26);
  const jitter = Math.round(Math.random() * 12);

  return {
    reachable,
    responseTime: reachable ? base + jitter : null,
    agentStatus: "connected",
  };
}
