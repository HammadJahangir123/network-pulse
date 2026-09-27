# Network Pulse

Create a professional, modern, responsive Store Network Monitoring Dashboard for Eastgate Industries PVT Limited.

The dashboard should be designed for an IT/Network team to monitor different brands, their stores, IP addresses, and online/offline status.

1. Main Brand Navigation

At the top of the dashboard, show the following brand categories as clickable tabs/cards:

TE — The Entertainer

MM — Minnie Minor

BR — Bareeze

HE — Home Expression

FS — Fabric Store

CHY — Chinyere

BM — Bareeze Men

BP — Bareeze Pret

When the user clicks on a brand, for example TE, only the stores/data belonging to The Entertainer should be displayed.

The selected brand should be visually highlighted.

2. Store Data Table

For the selected brand, display a professional data table with these columns:

ColumnDescriptionTE / SequenceStore sequence numberMM / Store CodeUnique store codeBR / Shop NameStore/shop nameHE / DB NameDatabase nameFS / IPLocal/private IP address assigned to the shop laptop/systemCHY / Online StatusCurrent system statusBMAdditional monitoring/action fieldBPAdditional monitoring/action field

However, make the actual table headings meaningful:

Sequence | Store Code | Shop Name | DB Name | IP Address | Online Status | Ping | Actions

The screenshot provided should be treated as the visual reference for the basic spreadsheet-style structure, but the final dashboard should look much more modern and professional.

3. Search / Filter System

Above the table, create individual search boxes/filters for each column.

Examples:

 Search by Sequence

 Search by Store Code

 Search by Shop Name

 Search by DB Name

 Search by IP Address

 Filter by Online Status

Each search field should search according to its data type.

For example:

 Store Code → text search

 Shop Name → text search

 DB Name → text search

 IP Address → IP/text search

 Sequence → number search

 Online Status → dropdown filter with:

 All

 Online

 Offline

Searches should work instantly without reloading the page.

4. Online / Offline Status

Each store should have a clear status indicator.

Online:

 Green status indicator

 Text: Online

Offline:

 Red status indicator

 Text: Offline

Optionally show:

 Last checked time

 Response time / latency

 Last successful ping

Example:

🟢 Online — 12ms

or

🔴 Offline — Last checked 2 min ago

Do not rely only on color; include text/icons for accessibility.

5. Ping Button

Add a Ping button for every store row.

When the user clicks:

Ping

the system should attempt to check whether the configured local IP address is reachable.

Show a small loading state while checking:

Pinging...

Then display the result:

✓ Ping Successful — 8ms

or

✕ Ping Failed

The UI should clearly distinguish between a successful and failed ping.

6. Important Network Architecture

The IP addresses are local/private IP addresses belonging to computers/laptops inside the shops.

A normal cloud/web browser cannot directly ping arbitrary private IP addresses on the shop's LAN.

Therefore, design the application so that the dashboard can support a local monitoring agent/service installed on the shop computer/network.

Recommended architecture:

Dashboard → Monitoring API/Server → Shop Monitoring Agent → Local Shop Laptop/IP

The monitoring agent should periodically send the system's status to the dashboard.

For development/demo purposes, create a mock monitoring service so the dashboard works without the real network agent.

Clearly separate:

 Frontend dashboard

 Monitoring API

 Local monitoring agent

 Store database/configuration

This will allow the real ping functionality to be integrated later.

7. Dashboard Summary Cards

At the top, show summary cards for the currently selected brand:

Total Stores

Online

Offline

Unknown / Not Checked

Average Response Time

Example:

Total Stores: 42

Online: 37

Offline: 4

Not Checked: 1

Avg Response: 18ms

These numbers should update automatically based on the selected brand.

8. Overall Company Dashboard

Also provide an All Brands option.

When All Brands is selected, show the combined status of all stores.

Summary:

 Total Stores

 Total Online

 Total Offline

 Total Not Checked

Also show a brand-wise summary such as:

BrandTotalOnlineOfflineThe Entertainer20182Minnie Minor1091Bareeze30282

Use the actual store data dynamically rather than hard-coded values.

9. Professional UI Design

Make the UI look like a real enterprise IT monitoring system, not a basic Excel sheet.

Design requirements:

 Clean modern layout

 Professional corporate appearance

 Responsive design

 Desktop-first layout

 Sidebar or top navigation

 Brand tabs/cards

 Modern table

 Rounded cards

 Clear status badges

 Search/filter controls

 Ping buttons

 Loading states

 Empty states

 Error states

 Tooltips where useful

Keep the design clean and avoid unnecessary animations.

10. Store Details

When the user clicks a store row, open a Store Details panel/modal showing:

 Brand

 Store Code

 Shop Name

 DB Name

 IP Address

 Online Status

 Last Ping

 Response Time

 Last Seen

 Monitoring Agent Status

Provide a Ping Now button inside the details panel as well.

11. Automatic Monitoring

The system should support automatic monitoring.

For example:

Every 30–60 seconds:

 Check each configured store/agent.

 Update Online/Offline status.

 Record last checked time.

 Record response time.

 Update dashboard counters.

Include a Refresh Now button for manual refresh.

Also show:

Last Updated: 11:28:32 PM

12. Data Structure

Create the application using a proper database structure.

Each store should have fields similar to:

id
brand_code
brand_name
sequence
store_code
shop_name
db_name
ip_address
status
last_ping
response_time
last_seen
agent_status
created_at
updated_at

Brands should be stored separately where practical rather than duplicating brand information throughout the application.

13. Future Scalability

Build the application so that later we can add:

 Add/Edit/Delete Store

 Add new brands

 Import stores from Excel/CSV

 Export filtered data to Excel

 User login/authentication

 Role-based access

 Monitoring history

 Ping history

 Downtime history

 Notifications when a store goes offline

 Email/WhatsApp/Telegram alerts

 Multiple monitoring servers/agents

 Store location information

14. Important UX Requirement

The user should be able to perform this workflow very quickly:

Open Dashboard → Select TE → Search Store Code → Find Store → See IP → See Online/Offline → Click Ping → See Ping Result

The interface should be optimized for an IT support team that may need to check many stores quickly 15. Initial Demo Data

Create realistic demo data for all eight brands so the dashboard can be tested immediately.

Use clearly fictional/demo IP addresses and store information during development.

Do not hard-code the monitoring results into the UI. The Online/Offline status should come from the monitoring layer/mock API.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/eb505fdb-6e20-43fe-b71a-7d73fe693886).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
