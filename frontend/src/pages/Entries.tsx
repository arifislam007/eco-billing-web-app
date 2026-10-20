import { useEffect, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { api, ApiError } from "../api/client";
import type { CollectionEntry, Partner, PartnerMonthEntry } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useMonth } from "../context/MonthContext";
import { money, pct } from "../format";
import {
  Banner,
  Button,
  Card,
  Chip,
  cx,
  DataTable,
  EmptyState,
  Field,
  FormGrid,
  IconButton,
  Input,
  PageHeader,
  Panel,
  SectionTitle,
  Select,
  useConfirm,
} from "../components/ui";
import { useToast } from "../components/Toast";

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
  "h-8 border border-border rounded-lg px-2 text-right text-sm bg-surface tabular hover:border-border-strong focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent";

export default function Entries() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { selectedMonth } = useMonth();
  const toast = useToast();
  const [confirmUi, confirm] = useConfirm();

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
      toast(`Entry added for ${partners.find((p) => p.id === addPartnerId)?.name ?? "partner"}`);
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

  function isDirty(partnerId: string) {
    const d = adminDrafts[partnerId];
    if (!d) return false;
    const saved = toAdminDraft(entries.find((e) => e.partnerId === partnerId));
    return (Object.keys(d) as Array<keyof AdminDraft>).some((k) => Number(d[k]) !== Number(saved[k]));
  }

  // No row saved yet for this partner: saving the defaults creates it.
  function needsCreate(partnerId: string) {
    return !entries.some((e) => e.partnerId === partnerId);
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
      toast(`Saved ${partners.find((p) => p.id === partnerId)?.name ?? "partner"}`);
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
      toast("Correction saved");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save correction");
    }
  }

  async function deleteLog(entry: CollectionEntry) {
    const name = partners.find((p) => p.id === entry.partnerId)?.name ?? "this partner";
    const ok = await confirm({
      title: "Delete this entry?",
      message: `${entry.users} users / ${money(entry.collection)} for ${name} will be removed and the totals recalculated. This cannot be undone.`,
    });
    if (!ok) return;
    try {
      await api.delete(`/collection-entries/${entry.id}`);
      toast("Entry deleted");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete entry");
    }
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

  if (!selectedMonth) return <EmptyState title="No month selected" hint="Select a month from the header first." />;

  const totalUsers = entries.reduce((sum, e) => sum + e.totalUsers, 0);
  const totalCollection = entries.reduce((sum, e) => sum + (Number(e.totalCollection) || 0), 0);
  const partnerName = (id: string) => partners.find((p) => p.id === id)?.name ?? "—";

  return (
    <div className="space-y-8">
      {confirmUi}
      <PageHeader
        eyebrow={selectedMonth.label}
        title="Monthly Entry"
        subtitle="Add each partner's users and collection as often as needed during the month. Once submitted, only an admin can correct an entry."
      />

      {error && <Banner tone="critical">{error}</Banner>}

      {/* Add form - both roles */}
      <Panel title="Add a collection entry" description="Each entry adds to the partner's monthly total.">
        {partners.length === 0 ? (
          <p className="text-sm text-ink-muted">No active partners yet.</p>
        ) : (
          <form onSubmit={onAdd} className="space-y-4">
            {partners.length <= 10 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Partner">
                {partners.map((p) => (
                  <Chip key={p.id} active={addPartnerId === p.id} onClick={() => setAddPartnerId(p.id)}>
                    {p.name}
                  </Chip>
                ))}
              </div>
            )}
            <FormGrid cols={4}>
              {partners.length > 10 && (
                <Field label="Partner">
                  <Select value={addPartnerId} onChange={(e) => setAddPartnerId(e.target.value)}>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Users">
                <Input type="number" inputMode="numeric" min={0} value={addUsers} onChange={(e) => setAddUsers(e.target.value)} required />
              </Field>
              <Field label="Collection (Tk)">
                <Input type="number" inputMode="numeric" min={0} step="1" value={addCollection} onChange={(e) => setAddCollection(e.target.value)} required />
              </Field>
              <Button type="submit" loading={adding} className="w-full sm:w-auto">
                {!adding && <Plus size={15} />} Add for {partnerName(addPartnerId)}
              </Button>
            </FormGrid>
          </form>
        )}
      </Panel>

      {/* Summary: totals per partner, admin-only editable business params */}
      <section>
        <SectionTitle>
          Partner totals · {totalUsers.toLocaleString()} users · {money(totalCollection)} collected
        </SectionTitle>
        {isAdmin ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-surface-2 text-ink-muted text-[11px] uppercase tracking-wider">
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-3 font-semibold sticky left-0 z-10 bg-surface-2">Partner</th>
                    <th className="text-right px-3 py-3 font-semibold">Users</th>
                    <th className="text-right px-3 py-3 font-semibold">Collection</th>
                    <th className="text-right px-3 py-3 font-semibold border-l border-border">Comm %</th>
                    <th className="text-right px-3 py-3 font-semibold">Bonus %</th>
                    <th className="text-right px-3 py-3 font-semibold">Discount</th>
                    <th className="text-right px-3 py-3 font-semibold">Last mo. due</th>
                    <th className="text-right px-3 py-3 font-semibold border-l border-border">Comm. amt</th>
                    <th className="text-right px-3 py-3 font-semibold">Business amt</th>
                    <th className="text-right px-3 py-3 font-semibold">Deposit</th>
                    <th className="text-right px-3 py-3 font-semibold">Bonus amt</th>
                    <th className="text-right px-3 py-3 font-semibold">Due (w/ bonus)</th>
                    <th className="text-right px-3 py-3 font-semibold">Due (after bonus)</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((p, i) => {
                    const entry = entries.find((e) => e.partnerId === p.id);
                    const d = adminDrafts[p.id];
                    const preview = d ? computePreview(d, p.id) : null;
                    const dirty = isDirty(p.id);
                    const canSave = dirty || needsCreate(p.id);
                    return (
                      <tr key={p.id} className={cx("group hover:bg-surface-2", i > 0 && "border-t border-border")}>
                        <td className="px-3 py-2 font-medium sticky left-0 z-10 bg-surface group-hover:bg-surface-2">
                          <span className="inline-flex items-center gap-2">
                            {dirty && <span className="w-2 h-2 rounded-full bg-warning" title="Unsaved changes" />}
                            {p.name}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular">{entry?.totalUsers ?? 0}</td>
                        <td className="px-3 py-2 text-right tabular">{money(entry?.totalCollection ?? 0)}</td>
                        {d && preview ? (
                          <>
                            <td className="px-3 py-2 border-l border-border">
                              <input
                                aria-label={`${p.name} commission`}
                                type="number"
                                step="0.01"
                                min={0}
                                max={1}
                                className={`${cellInput} w-16`}
                                value={d.commissionPct}
                                onChange={(e) => updateAdminDraft(p.id, "commissionPct", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                aria-label={`${p.name} bonus`}
                                type="number"
                                step="0.01"
                                min={0}
                                max={1}
                                className={`${cellInput} w-16`}
                                value={d.bonusPct}
                                onChange={(e) => updateAdminDraft(p.id, "bonusPct", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                aria-label={`${p.name} discount`}
                                type="number"
                                min={0}
                                className={`${cellInput} w-20`}
                                value={d.discount}
                                onChange={(e) => updateAdminDraft(p.id, "discount", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                aria-label={`${p.name} last month due`}
                                type="number"
                                className={`${cellInput} w-24`}
                                value={d.lastMonthDue}
                                onChange={(e) => updateAdminDraft(p.id, "lastMonthDue", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2 text-right tabular text-ink-secondary border-l border-border">{money(preview.commissionAmount)}</td>
                            <td className="px-3 py-2 text-right tabular text-ink-secondary">{money(preview.businessAmount)}</td>
                            <td className="px-3 py-2 text-right tabular text-ink-secondary">{money(preview.totalDeposit)}</td>
                            <td className="px-3 py-2 text-right tabular text-ink-secondary">{money(preview.bonusAmount)}</td>
                            <td className="px-3 py-2 text-right tabular text-ink-secondary">{money(preview.dueWithBonus)}</td>
                            <td className="px-3 py-2 text-right tabular font-semibold">{money(preview.dueAfterBonus)}</td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                size="sm"
                                variant={canSave ? "primary" : "secondary"}
                                loading={savingId === p.id}
                                disabled={!canSave && savingId !== p.id}
                                onClick={() => saveAdminParams(p.id)}
                              >
                                {canSave ? "Save" : "Saved"}
                              </Button>
                            </td>
                          </>
                        ) : (
                          <td colSpan={11} />
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-semibold bg-surface-2">
                    <td className="px-3 py-3 sticky left-0 z-10 bg-surface-2">Totals</td>
                    <td className="px-3 py-3 text-right tabular">{totalUsers.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular">{money(totalCollection)}</td>
                    <td colSpan={11}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-xs text-ink-muted px-4 py-3 border-t border-border">
              Commission and bonus are fractions — 0.45 = {pct(0.45)}. A dot marks rows with unsaved changes. Deposit comes from
              the Deposits screen.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <DataTable<Partner>
              rows={partners}
              rowKey={(p) => p.id}
              columns={[
                { key: "name", header: "Partner", primary: true, cell: (p) => <span className="font-medium">{p.name}</span> },
                { key: "users", header: "Users", align: "right", cell: (p) => entries.find((e) => e.partnerId === p.id)?.totalUsers ?? 0 },
                {
                  key: "collection",
                  header: "Collection",
                  align: "right",
                  cell: (p) => money(entries.find((e) => e.partnerId === p.id)?.totalCollection ?? 0),
                },
              ]}
              footer={[
                { key: "name", value: "Totals" },
                { key: "users", value: totalUsers.toLocaleString() },
                { key: "collection", value: money(totalCollection) },
              ]}
            />
          </Card>
        )}
      </section>

      {/* Log - both roles view, admin can edit/delete */}
      <section>
        <SectionTitle>Entries this month · {log.length}</SectionTitle>
        <Card className="overflow-hidden">
          <DataTable<CollectionEntry>
            rows={log}
            rowKey={(e) => e.id}
            empty="No entries submitted for this month yet."
            rowClassName={(e) => (editingLogId === e.id ? "bg-accent-soft/40" : undefined)}
            columns={[
              { key: "partner", header: "Partner", primary: true, cell: (e) => <span className="font-medium">{partnerName(e.partnerId)}</span> },
              {
                key: "users",
                header: "Users",
                align: "right",
                cell: (e) =>
                  editingLogId === e.id ? (
                    <input
                      aria-label="Users"
                      type="number"
                      min={0}
                      className={`${cellInput} w-20`}
                      value={editUsers}
                      onChange={(ev) => setEditUsers(ev.target.value)}
                    />
                  ) : (
                    e.users
                  ),
              },
              {
                key: "collection",
                header: "Collection",
                align: "right",
                cell: (e) =>
                  editingLogId === e.id ? (
                    <input
                      aria-label="Collection"
                      type="number"
                      min={0}
                      step="1"
                      className={`${cellInput} w-28`}
                      value={editCollection}
                      onChange={(ev) => setEditCollection(ev.target.value)}
                    />
                  ) : (
                    money(e.collection)
                  ),
              },
              {
                key: "date",
                header: "Added",
                cell: (e) => <span className="text-ink-secondary">{new Date(e.createdAt).toLocaleString()}</span>,
              },
              { key: "by", header: "By", cell: (e) => <span className="text-ink-secondary">{e.createdBy?.email ?? "—"}</span> },
            ]}
            actions={
              isAdmin
                ? (e) =>
                    editingLogId === e.id ? (
                      <div className="flex items-center gap-1">
                        <IconButton label="Save correction" onClick={() => saveEditLog(e.id)} className="text-good hover:bg-good-soft">
                          <Check size={16} />
                        </IconButton>
                        <IconButton label="Cancel" onClick={() => setEditingLogId(null)}>
                          <X size={16} />
                        </IconButton>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <IconButton label="Correct entry" onClick={() => startEditLog(e)}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton label="Delete entry" onClick={() => deleteLog(e)} className="hover:text-critical hover:bg-critical-soft">
                          <Trash2 size={15} />
                        </IconButton>
                      </div>
                    )
                : undefined
            }
          />
        </Card>
      </section>
    </div>
  );
}
