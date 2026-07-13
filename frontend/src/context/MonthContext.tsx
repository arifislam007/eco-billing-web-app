import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { Month } from "../api/types";

interface MonthContextValue {
  months: Month[];
  selectedMonth: Month | null;
  setSelectedMonthId: (id: string) => void;
  refreshMonths: () => Promise<void>;
}

const MonthContext = createContext<MonthContextValue | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [months, setMonths] = useState<Month[]>([]);
  const [selectedMonthId, setSelectedMonthIdState] = useState<string | null>(
    () => localStorage.getItem("econet_selected_month")
  );

  async function refreshMonths() {
    const data = await api.get<Month[]>("/months");
    setMonths(data);
    if (!selectedMonthId && data.length > 0) {
      setSelectedMonthId(data[0].id);
    }
  }

  function setSelectedMonthId(id: string) {
    localStorage.setItem("econet_selected_month", id);
    setSelectedMonthIdState(id);
  }

  useEffect(() => {
    refreshMonths().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedMonth = months.find((m) => m.id === selectedMonthId) ?? null;

  return (
    <MonthContext.Provider value={{ months, selectedMonth, setSelectedMonthId, refreshMonths }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error("useMonth must be used within MonthProvider");
  return ctx;
}
