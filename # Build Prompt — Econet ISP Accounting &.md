# Build Prompt — Econet ISP Accounting & Monthly Voucher Web App

> Paste everything below the line into your AI coding tool (Claude Code, Cursor, v0, Lovable, Bolt, etc.). It is written so the AI has the full data model, business rules, and formulas derived from the existing Excel workbook. Fill in the two bracketed choices at the top if you have a preference; otherwise the defaults are fine.

---

## Role & Goal

You are a senior full-stack engineer. Build a **simple, reliable accounting and monthly-voucher web application** for a small ISP bill-collection reseller business called **Econet**. It replaces a monthly Excel workbook. Each month the owner records how much each reseller partner collected, computes commissions, bonuses, deposits and dues, tracks business costs and profit, keeps a cash (bKash) transaction ledger, and prints a per-partner voucher.

Keep it **simple and practical over fancy**. Correct numbers and an easy monthly workflow matter more than visual polish.

## Tech Stack (default — change only if I say otherwise)

- **Frontend:** React + TypeScript + Vite, styled with Tailwind CSS.
- **Backend:** Node.js + Express (TypeScript) REST API.
- **Database:** PostgreSQL via Prisma ORM. (SQLite is acceptable for local/dev.)
- **Auth:** single admin login (email + password, hashed with bcrypt, JWT session). Multi-user roles are not needed now but keep the door open.
- Provide `docker-compose.yml` (app + Postgres), a seed script, `.env.example`, and a clear `README` with run instructions.
- Money: store all amounts as integers or `Decimal` — never floats. Round only for display.

## Core Domain Concept (read carefully — this is the business)

Econet resells internet service. Several **partners** (called "Bhai" in the source, e.g. "Jahid Bhai", "Bilal Bhai") each manage a set of end users and collect monthly bills from them. For each partner, per month:

1. They collect a **Total Collection** from their **Total Users**.
2. The partner keeps a **commission** (a percentage of collection, typically **45%**).
3. The rest — the **Business Amount** — is owed to Econet.
4. The partner may earn a **bonus** (a percentage of the Business Amount) and may get a **discount**.
5. The partner **deposits** money to Econet (tracked as "Deposit by 15th").
6. Whatever is unpaid rolls forward as **Last Month Due** into the next month.

Econet itself pays monthly **costs** (ISP wholesale bill, software, electricity, partner bonuses, misc) and the leftover is **profit**.

## Data Model

Create these entities. All monetary fields are in the local currency (BDT). Percentages stored as decimals (0.45 = 45%).

### Partner
- `id`
- `name` (e.g. "Jahid Bhai") — unique
- `active` (bool)
- Optional: phone, notes

### Month (accounting period)
- `id`
- `label` (e.g. "July-26")
- `year`, `month`
- `status`: open | closed

### PartnerMonthEntry  (one row per partner per month — this is the main table)
Input fields (entered by the user):
- `partnerId`, `monthId`
- `totalUsers` — integer
- `totalCollection` — money
- `commissionPct` — decimal, default 0.45
- `bonusPct` — decimal, default 0 (varies per partner: 0, 0.02, 0.03, 0.05, 0.10 in source)
- `discount` — money, default 0
- `lastMonthDue` — money (carried from previous month; auto-fill if possible)

Computed fields (derive on read/save; **do not** let the user type these):
- `commissionAmount = totalCollection * commissionPct`
- `businessAmount   = totalCollection - commissionAmount`
- `depositBy15th`   = sum of this partner's Deposits for the month (see Deposit entity)
- `totalDeposit`    = `depositBy15th`
- `bonusAmount      = businessAmount * bonusPct`
- `dueWithBonus     = businessAmount - totalDeposit - discount + lastMonthDue`
- `dueAfterBonus    = businessAmount - totalDeposit - bonusAmount - discount + lastMonthDue`

> These map exactly to the Excel columns: Commission Amount `=D*E`, Business Amount `=D-F`, Bonus `=G*I`, Due with bonus `=G-M-K+L`, Due after bonus `=G-M-J-K+L`, where D=Collection, E=Commission%, F=Commission Amt, G=Business Amt, I=Bonus%, J=Bonus, K=Discount, L=Last Month Due, M=Total Deposit.

### Deposit  (money a partner paid in during the month)
- `id`, `partnerId`, `monthId`
- `date`
- `amount` — money
- `medium` (e.g. cash, bKash, bank)
- `ref` (optional reference/note)

A partner may make several deposits in a month; `depositBy15th`/`totalDeposit` is their sum.

### CostItem  (Econet's monthly expenses)
- `id`, `monthId`
- `label` (e.g. "ISP Bill", "Softifybd", "bidyut dada + Robin", "Bonus", "Electricity Bill", "Me and Other")
- `amount` — money
- `note` (optional)

Special handling: the **"Bonus"** cost line for a month should equal the **sum of all partners' `bonusAmount`** for that month. Compute it rather than requiring manual entry (but allow override).

### Transaction  (bKash / cash ledger — the "Bkash trans" sheet)
- `id`, `monthId` (or just a global ledger with date filter)
- `date`
- `details`
- `send` — money out
- `receive` — money in
- `comment`

## Monthly Summary / Dashboard (per selected month)

Show, for the currently selected month, these roll-ups (matching the Excel totals row and cost block):

- **Totals across partners:** total users (Σ users), total collection (Σ collection), total commission (Σ commission), **total business amount** (Σ business), total deposits (Σ deposit), total due-with-bonus, total due-after-bonus, average commission %, average bonus %.
- **Cost block:** list all CostItems, **Total Cost = Σ CostItems**.
- **Profit = Total Business Amount − Total Cost.**  (Excel: `=G15 - C27`.)
- **Ledger balance:** `Σ receive − Σ send` from Transactions.

## Monthly Voucher (key feature)

A **voucher** is a per-partner statement for a given month. The user picks a **month** and a **partner**, and the app renders a clean voucher showing:

- Business Name (partner name)
- Total Users  (মোট ইউজার)
- Total Collection  (মোট বিল সংগ্রহ)
- Commission %  (কমিশন)
- Commission Amount  (কমিশন পরিমান)
- Business/Bill Amount  (বিলের পরিমান)
- Total Deposit  (জমা)
- Total Due  (মোট বাকি)  = `dueWithBonus`
- Bonus (with % shown, e.g. "3% বোনাস")  = `bonusAmount`
- Last Month Due  (গত মাসের বাকি)
- **Due after bonus / Net payable**  (বোনাস বাদে মোট বাকি) = `Total Due − Bonus`

> This mirrors the XLOOKUP voucher panel in the sheet (looks up a partner name and pulls their row). Labels: show **English primary with the Bengali term in parentheses** as above — the source used Bengali labels, so keep them available.

Voucher requirements:
- **On-screen view**, clean and readable, with Econet header, month label, and generation date.
- A **Print** button that opens the browser print dialog with a print-optimized stylesheet (`@media print`: hide nav/buttons, fit to one page, black text on white).
- Let the user page through partners (prev/next) or pick from a dropdown.
- Optional: a "Print all vouchers" view that stacks every partner's voucher, one per page.

## Screens / Pages

1. **Login.**
2. **Month selector** (create a new month, pick current month, close a month). Creating a month should optionally **carry each partner's `dueAfterBonus` into next month's `lastMonthDue`**.
3. **Partners** — manage the partner list (add/edit/deactivate).
4. **Monthly Entry table** — spreadsheet-like editable grid of `PartnerMonthEntry` rows for the selected month. Editable input columns; computed columns shown read-only and live-updating; a totals row at the bottom.
5. **Deposits** — add/list deposits per partner for the month.
6. **Costs** — edit the month's cost items; show Total Cost and Profit.
7. **Transactions (bKash ledger)** — add/list; running balance.
8. **Vouchers** — the voucher generator described above.
9. **Dashboard** — the monthly summary roll-ups.

## Business Rules & Edge Cases

- Recompute derived values whenever inputs change; never store a stale computed value that contradicts inputs.
- Handle empty/zero deposits, zero bonus %, and missing last-month-due gracefully (treat as 0).
- A partner with no entry for a month should not break totals.
- Guard against negative users/collection on input.
- Rounding: compute with full precision, round to 2 decimals (or whole BDT) only for display; make the rounding choice consistent and configurable in one place.
- "Total Deposit" is always driven by the Deposits table, not typed directly.

## Seed Data (use to sanity-check the math)

Seed one month **"July-26"** with these partners (name, users, collection, commission%, bonus%):

| Partner | Users | Collection | Comm % | Bonus % |
|---|---|---|---|---|
| Jahid Bhai | 165 | 81900 | 45% | 2% |
| Helal Bhai | 311 | 151150 | 45% | 2% |
| Alamgir Bhai | 477 | 239300 | 45% | 10% |
| Badsha bhai | 169 | 70300 | 45% | 5% |
| Bilal Bhai | 295 | 138980 | 45% | 3% |
| Liton Bhai | 220 | 110200 | 45% | 3% |
| Mortuza Bhai | 127 | 60300 | 45% | 3% |
| Murad Bhai | 141 | 43400 | 45% | 3% |
| Aslam Bhai | 231 | 102450 | 45% | 5% |
| Hridoy | 12 | 4200 | 45% | 3% |
| Asraf | 282 | 126900 | 45% | 0% |
| Shaon | 21 | 8000 | 45% | 0% |
| Mitul Bhai | 272 | 131400 | 100% | 0% |

Cost items for the month: ISP Bill 409161, Softifybd 6800, "bidyut dada + Robin" 12000, Electricity Bill 7492, plus the computed Bonus line.

**Expected checks (your computed totals must match):**
- Σ Total Users = **2723**
- Σ Total Collection = **1,268,480**
- Σ Business Amount = **625,394**
- Example — **Bilal Bhai**: commission amount = 62,541; business amount = 76,439; bonus (3%) ≈ 2,293.17; total due = 76,439; net after bonus ≈ 74,145.83.
- Profit = Σ Business Amount − Total Cost.

If your seeded output doesn't reproduce these numbers, fix the formulas before proceeding.

## Deliverables

- Working full-stack app runnable with `docker-compose up` (or documented `npm run` steps).
- Prisma schema + migrations + seed script producing the July-26 data above.
- REST API with endpoints for partners, months, entries, deposits, costs, transactions, and voucher data.
- React UI covering all screens above, with the printable voucher.
- A short README: setup, environment variables, how to add a month, how to print a voucher.
- Basic unit tests on the calculation logic (commission, business amount, bonus, due-with-bonus, due-after-bonus, profit) using the seed numbers as fixtures.

## Build Order (do this stepwise; pause after each for review)

1. Data model + Prisma schema + migrations + seed. Print the July-26 totals to prove the math.
2. Backend API + calculation module (with unit tests).
3. Monthly Entry grid + Dashboard.
4. Deposits, Costs, Transactions.
5. Voucher view + print stylesheet.
6. Auth, README, docker-compose, polish.

Start with step 1 and show me the schema and the seed output before moving on.