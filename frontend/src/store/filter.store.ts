'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GlobalFilterState {
  factoryId: string;
  machineId: string;
  deviceId: string;
  status: string;
  severity: string;
  firmware: string;
  dateRange: string; // "15m" | "1h" | "6h" | "24h" | "7d" | "custom"
  customFrom: string | null;
  customTo: string | null;
  globalSearch: string;
  setFilter: (key: keyof Omit<GlobalFilterState, 'setFilter' | 'resetFilters'>, value: any) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<GlobalFilterState>()(
  persist(
    (set) => ({
      factoryId: 'ALL',
      machineId: 'ALL',
      deviceId: 'ALL',
      status: 'ALL',
      severity: 'ALL',
      firmware: 'ALL',
      dateRange: '24h',
      customFrom: null,
      customTo: null,
      globalSearch: '',
      setFilter: (key, value) => set((s) => ({ ...s, [key]: value })),
      resetFilters: () => set({
        factoryId: 'ALL',
        machineId: 'ALL',
        deviceId: 'ALL',
        status: 'ALL',
        severity: 'ALL',
        firmware: 'ALL',
        dateRange: '24h',
        customFrom: null,
        customTo: null,
        globalSearch: '',
      })
    }),
    {
      name: 'mfg-global-filters-v1',
    }
  )
);
