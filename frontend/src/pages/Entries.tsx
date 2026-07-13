import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { CollectionEntry, Partner, PartnerMonthEntry } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useMonth } from "../context/MonthContext";
import { money, pct } from "../format";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
  Thead,
} from "../components/ui";

type AdminDraft = {
  commissionPct: string;
  bonusPct: string;
  discount: string;
  lastMonthDue: string;
};

function toAdminDraft(e?: PartnerMonthEntry): AdminDraft {
  return {
    commissionPct: e?.commissionPct ?? "0.45",
    bonusPct: e?.bonusPct ?? "0",
    discount: e?.discount ?? "0",
    lastMonthDue: e?.lastMonthDue ?? "0",
  };
}

const cellInput =
  "border border-border rounded-md px-2 py-1 text-right text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";

export default function Entries() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { selectedMonth } = useMonth();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [entries, setEntries] = useState<PartnerMonthEntry[]>([]);
  const [log, setLog] = useState<CollectionEntry[]>([]);
  const [adminDrafts, setAdminDrafts] = useState<Record<string, AdminDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // "Add" form (both roles)
  const [addPartnerId, setAddPartnerId] = useState("");
  const [addUsers, setAddUsers] = useState("");
  const [addCollection, setAddCollection] = useState("");
  const [adding, setAdding] = useState(false);

  // Admin inline edit of a log row
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editUsers, setEditUsers] = useState("");
  const [editCollection, setEditCollection] = useState("");

  async function refresh() {
    if (!selectedMonth) return;
    const [p, e, l] = await Promise.all([
      api.get<Partner[]>("/partners?active=true"),
      api.get<PartnerMonthEntry[]>(`/entries?monthId=${selectedMonth.id}`),
      api.get<CollectionEntry[]>(`/collection-entries?monthId=${selectedMonth.id}`),
    ]);
    setPartners(p);
    setEntries(e);
    setLog(l);
    if (!addPartnerId && p.length) setAddPartnerId(p[0].id);
    if (isAdmin) {
      const nextDrafts: Record<string, AdminDraft> = {};
      for (const partner of p) {
        nextDrafts[partner.id] = toAdminDraft(e.find((entry) => entry.partnerId === partner.id));
      }
      setAdminDrafts(nextDrafts);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth?.id]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!selectedMonth) return;
    setError(null);
    setAdding(true);
    try {
      await api.post("/collection-entries", {
        partnerId: addPartnerId,
        monthId: selectedMonth.id,
        users: Number(addUsers) || 0,
        collection: Number(addCollection) || 0,
      });
      setAddUsers("");
      setAddCollection("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add entry");
    } finally {
      setAdding(false);
    }
  }

  function updateAdminDraft(partnerId: string, field: keyof AdminDraft, value: string) {
    setAdminDrafts((prev) => ({ ...prev, [partnerId]: { ...prev[partnerId], [field]: value } }));
  }

  async function saveAdminParams(partnerId: string) {
    if (!selectedMonth) return;
    setError(null);
    setSavingId(partnerId);
    const d = adminDrafts[partnerId];
    try {
      await api.post("/entries", {
        partnerId,
        monthId: selectedMonth.id,
        commissionPct: Number(d.commissionPct) || 0,
        bonusPct: Number(d.bonusPct) || 0,
        discount: Number(d.discount) || 0,
        lastMonthDue: Number(d.lastMonthDue) || 0,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSavingId(null);
    }
  }

  function startEditLog(entry: CollectionEntry) {
    setEditingLogId(entry.id);
    setEditUsers(String(entry.users));
    setEditCollection(entry.collection);
  }

  async function saveEditLog(id: string) {
    setError(null);
    try {
      await api.patch(`/collection-entries/${id}`, {
        users: Number(editUsers) || 0,
        collection: Number(editCollection) || 0,
      });
      setEditingLogId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save correction");
    }
  }

  async function deleteLog(id: string) {
    await api.delete(`/collection-entries/${id}`);
    await refresh();
  }

  function computePreview(d: AdminDraft, partnerId: string) {
    const entry = entries.find((e) => e.partnerId === partnerId);
    const collection = Number(entry?.totalCollection) || 0;
    const commissionPct = Number(d.commissionPct) || 0;
    const bonusPct = Number(d.bonusPct) || 0;
    const discount = Number(d.discount) || 0;
    const lastMonthDue = Number(d.lastMonthDue) || 0;
    const totalDeposit = Number(entry?.totalDeposit) || 0;

    const commissionAmount = collection * commissionPct;
    const businessAmount = collection - commissionAmount;
    const bonusAmount = businessAmount * bonusPct;
    const dueWithBonus = businessAmount - totalDeposit - discount + lastMonthDue;
    const dueAfterBonus = businessAmount - totalDeposit - bonusAmount - discount + lastMonthDue;

    return { commissionAmount, businessAmount, bonusAmount, dueWithBonus, dueAfterBonus, totalDeposit };
  }

  if (!selectedMonth)
    return <EmptyState title="No month selected" hint="Select a month from the header first." />;

  const totalUsers = entries.reduce((sum, e) => sum + e.totalUsers, 0);
  const totalCollection = entries.reduce((sum, e) => sum + (Number(e.totalCollection) || 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Monthly Entry — ${selectedMonth.label}`}
        subtitle="Add each partner's users and collection as many times as needed during the month. Once submitted, only an admin can correct an entry."
      />

      {error && <p className="text-sm text-critical">{error}</p>}

      {/* Add form - both roles */}
      <Card className="p-5">
        <h2 className="font-medium text-ink mb-4">Add a collection entry</h2>
        <form onSubmit={onAdd} className="flex flex-wrap gap-3 items-end">
          <Field label="Partner">
            <Select value={addPartnerId} onChange={(e) => setAddPartnerId(e.target.value)}>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Users">
            <Input
              type="number"
              min={0}
              value={addUsers}
              onChange={(e) => setAddUsers(e.target.value)}
              className="w-28"
              required
            />
          </Field>
          <Field label="Collection">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={addCollection}
              onChange={(e) => setAddCollection(e.target.value)}
              className="w-32"
              required
            />
          </Field>
          <Button type="submit" loading={adding}>
            Add
          </Button>
        </form>
      </Card>

      {/* Summary: totals per partner, admin-only editable business params */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-page text-ink-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium sticky left-0 bg-page">Partner</th>
              <th className="text-right px-3 py-2.5 font-medium">Total Users</th>
              <th className="text-right px-3 py-2.5 font-medium">Total Collection</th>
              {isAdmin && (
                <>
                  <th className="text-right px-3 py-2.5 font-medium">Comm %</th>
                  <th className="text-right px-3 py-2.5 font-medium">Bonus %</th>
                  <th className="text-right px-3 py-2.5 font-medium">Discount</th>
                  <th className="text-right px-3 py-2.5 font-medium">Last Mo. Due</th>
                  <th className="text-right px-3 py-2.5 font-medium bg-accent-soft/40">Comm. Amt</th>
                  <th className="text-right px-3 py-2.5 font-medium bg-accent-soft/40">Business Amt</th>
                  <th className="text-right px-3 py-2.5 font-medium bg-accent-soft/40">Deposit</th>
                  <th className="text-right px-3 py-2.5 font-medium bg-accent-soft/40">Bonus Amt</th>
                  <th className="text-right px-3 py-2.5 font-medium bg-accent-soft/40">Due (w/ bonus)</th>
                  <th className="text-right px-3 py-2.5 font-medium bg-accent-soft/40">Due (after bonus)</th>
                  <th className="px-3 py-2.5"></th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => {
              const entry = entries.find((e) => e.partnerId === p.id);
              const d = adminDrafts[p.id];
              const preview = isAdmin && d ? computePreview(d, p.id) : null;
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-1.5 font-medium sticky left-0 bg-surface">{p.name}</td>
                  <td className="px-3 py-1.5 text-right tabular">{entry?.totalUsers ?? 0}</td>
                  <td className="px-3 py-1.5 text-right tabular">{money(entry?.totalCollection ?? 0)}</td>
                  {isAdmin && d && preview && (
                    <>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          max={1}
                          className={`${cellInput} w-16`}
                          value={d.commissionPct}
                          onChange={(e) => updateAdminDraft(p.id, "commissionPct", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          max={1}
                          className={`${cellInput} w-16`}
                          value={d.bonusPct}
                          onChange={(e) => updateAdminDraft(p.id, "bonusPct", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          min={0}
                          className={`${cellInput} w-20`}
                          value={d.discount}
                          onChange={(e) => updateAdminDraft(p.id, "discount", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          className={`${cellInput} w-24`}
                          value={d.lastMonthDue}
                          onChange={(e) => updateAdminDraft(p.id, "lastMonthDue", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right bg-page tabular">
                        {money(preview.commissionAmount)}
                      </td>
                      <td className="px-3 py-1.5 text-right bg-page tabular">
                        {money(preview.businessAmount)}
                      </td>
                      <td className="px-3 py-1.5 text-right bg-page tabular">{money(preview.totalDeposit)}</td>
                      <td className="px-3 py-1.5 text-right bg-page tabular">{money(preview.bonusAmount)}</td>
                      <td className="px-3 py-1.5 text-right bg-page tabular">{money(preview.dueWithBonus)}</td>
                      <td className="px-3 py-1.5 text-right bg-page tabular font-semibold">
                        {money(preview.dueAfterBonus)}
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => saveAdminParams(p.id)}
                          disabled={savingId === p.id}
                          className="text-accent hover:underline text-xs font-medium disabled:opacity-50"
                        >
                          {savingId === p.id ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border font-semibold bg-page">
              <td className="px-3 py-2.5 sticky left-0 bg-page">Totals</td>
              <td className="px-3 py-2.5 text-right tabular">{totalUsers.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right tabular">{money(totalCollection)}</td>
              {isAdmin && <td colSpan={9}></td>}
            </tr>
          </tfoot>
        </table>
      </Card>
      {isAdmin && (
        <p className="text-xs text-ink-muted -mt-4">
          Commission % example: 0.45 = {pct(0.45)}. Deposit column reflects sums from the Deposits screen.
        </p>
      )}

      {/* Log - both roles view, admin can edit/delete */}
      <div>
        <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
          Collection entries this month
        </h2>
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <tr>
                <Th>Date</Th>
                <Th>Partner</Th>
                <Th className="text-right">Users</Th>
                <Th className="text-right">Collection</Th>
                <Th>Added by</Th>
                {isAdmin && <Th className="text-right">Actions</Th>}
              </tr>
            </Thead>
            <tbody>
              {log.map((entry) => {
                const partnerName = partners.find((p) => p.id === entry.partnerId)?.name ?? "—";
                const isEditing = editingLogId === entry.id;
                return (
                  <tr key={entry.id}>
                    <Td className="text-ink-secondary">{new Date(entry.createdAt).toLocaleString()}</Td>
                    <Td className="font-medium">{partnerName}</Td>
                    <Td className="text-right tabular">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          className={`${cellInput} w-20`}
                          value={editUsers}
                          onChange={(e) => setEditUsers(e.target.value)}
                        />
                      ) : (
                        entry.users
                      )}
                    </Td>
                    <Td className="text-right tabular">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className={`${cellInput} w-28`}
                          value={editCollection}
                          onChange={(e) => setEditCollection(e.target.value)}
                        />
                      ) : (
                        money(entry.collection)
                      )}
                    </Td>
                    <Td className="text-ink-secondary">{entry.createdBy?.email ?? "—"}</Td>
                    {isAdmin && (
                      <Td className="text-right space-x-3">
                        {isEditing ? (
                          <>
                            <button
                              className="text-accent hover:underline text-xs"
                              onClick={() => saveEditLog(entry.id)}
                            >
                              Save
                            </button>
                            <button
                              className="text-ink-muted hover:underline text-xs"
                              onClick={() => setEditingLogId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="text-accent hover:underline text-xs"
                              onClick={() => startEditLog(entry)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-critical hover:underline text-xs"
                              onClick={() => deleteLog(entry.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </Td>
                    )}
                  </tr>
                );
              })}
              {!log.length && (
                <tr>
                  <Td colSpan={isAdmin ? 6 : 5} className="text-center text-ink-muted py-6">
                    No entries submitted for this month yet.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
