import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import partnersRouter from "./routes/partners";
import monthsRouter from "./routes/months";
import entriesRouter from "./routes/entries";
import collectionEntriesRouter from "./routes/collectionEntries";
import depositsRouter from "./routes/deposits";
import costsRouter from "./routes/costs";
import transactionsRouter from "./routes/transactions";
import dashboardRouter from "./routes/dashboard";
import vouchersRouter from "./routes/vouchers";
import usersRouter from "./routes/users";
import { requireAuth, requireRole } from "./middleware/auth";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);

// Everything below requires a valid JWT.
// partners/months allow read for both roles; requireRole("admin") is applied
// per-mutating-handler inside those route files.
app.use("/api/partners", requireAuth, partnersRouter);
app.use("/api/months", requireAuth, monthsRouter);
app.use("/api/entries", requireAuth, entriesRouter);
// Add is open to both roles (per-handler); edit/delete are admin-only
// (per-handler) - see routes/collectionEntries.ts.
app.use("/api/collection-entries", requireAuth, collectionEntriesRouter);
app.use("/api/deposits", requireAuth, requireRole("admin"), depositsRouter);
app.use("/api/costs", requireAuth, requireRole("admin"), costsRouter);
app.use("/api/transactions", requireAuth, requireRole("admin"), transactionsRouter);
app.use("/api/dashboard", requireAuth, requireRole("admin"), dashboardRouter);
app.use("/api/vouchers", requireAuth, vouchersRouter);
app.use("/api/users", requireAuth, requireRole("admin"), usersRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Econet API listening on http://localhost:${port}`);
});
