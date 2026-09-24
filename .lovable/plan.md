# Store IT Management Dashboard — upgrade plan

Most of the base already exists (brand tabs, store table, column search, Add/Edit/Delete, Ping button, auto-refresh). This plan upgrades it to the full spec and removes all simulated monitoring.

## What changes for you

1. **Sign-in required** — email/password + Google sign-in. Only signed-in, authorized users can add/edit/delete stores, run pings, or change monitoring settings. The first person to sign up becomes the admin; admins can grant access to others.
2. **Sidebar layout** — left sidebar with Dashboard, the 8 brands (TE — The Entertainer, etc.), Monitoring Agent, and Settings. Selecting a brand shows its full name as the page title.
3. **Summary cards** — Total Stores, Online, Offline, Checking, Total Brands, all from the database.
4. **Store table** — columns renamed to Store Name / Local IP / System Status; search box above every column; click column headers to sort; pagination (25/50/100 per page).
5. **Add / Edit / Delete** — form with Brand, Sequence, Store Code, Store Name, DB Name, Local IP, and "Monitoring enabled" toggle. Delete asks for confirmation. Toast messages on save/delete/ping.
6. **IP validation** — must be a valid private LAN address (172.16–31.x.x incl. 172.30.x.x, 10.x.x.x, 192.168.x.x); clear error otherwise.
7. **No fake results** — the simulated ping is removed. Until your office LAN agent connects, every store shows "Monitoring Service Not Connected" and Ping says so. Once the agent reports, statuses show "Online — 4ms" / "Offline — Request timed out" with last-checked time.
8. **Monitoring Agent page** — shows agent connection status (last heartbeat), a secret token to paste into the agent, and a ready-to-run small agent script (Node.js) for an office PC on the LAN.
9. **Settings** — configurable auto-check interval (30–300 s) and on/off switch.
10. **Dark / light mode** toggle.

## How the LAN monitoring works

```text
Dashboard -> Backend API -> (queue) <- Office LAN Agent polls every few seconds
                                        Agent pings 172.30.x.x
Dashboard <- Backend API <- Agent posts result (status, ms, error, time)
```
The agent calls out to the backend (no port-forwarding needed on your office network). Manual "Ping" creates a request the agent picks up within seconds; automatic checks run on the configured interval.

## Technical details

- DB: add `user_roles` (admin/operator) + `has_role`; `monitoring_settings` (interval, enabled, agent token hash, last heartbeat); `ping_requests` queue; add `monitoring_enabled`, `last_error` columns to stores. Status values extended with `checking`.
- Auth: `_authenticated` route gate, `/auth` page, all write/ping server fns use `requireSupabaseAuth` + role check.
- Agent API (public routes, bearer token verified with timing-safe compare): `GET /api/public/agent/jobs`, `POST /api/public/agent/results`, `POST /api/public/agent/heartbeat`.
- UI ping: `POST` server fn `requestPing(storeId)` → queue → client polls result (times out with "Agent did not respond").
- Delete `monitoring-agent.server.ts` (mock). Agent considered connected if heartbeat < 90 s old.
