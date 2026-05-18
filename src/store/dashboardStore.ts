import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DashboardData } from "@/lib/actions/dashboard";

type DashboardStore = {
  dashboardData: DashboardData | null;
  setDashboardData: (data: DashboardData) => void;
  clearDashboardData: () => void;
};

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      dashboardData: null,
      setDashboardData: (data) => set({ dashboardData: data }),
      clearDashboardData: () => set({ dashboardData: null }),
    }),
    {
      name: "dashboard-store",
      version: 1,
      partialize: (state) => ({ dashboardData: state.dashboardData }),
    }
  )
);

