import { create } from "zustand";

// Store UI state global sederhana - filter aktif per halaman & modal terbuka.
// TIDAK dipakai untuk data server (itu jatah React Query di Fase B) - murni state UI lokal.
interface UiState {
  activeModal: string | null;
  openModal: (name: string) => void;
  closeModal: () => void;

  userListFilter: { search: string; departmentId: number | null };
  setUserListFilter: (filter: Partial<UiState["userListFilter"]>) => void;

  logsFilter: {
    kartu: string;
    controllerId: number | null;
    doorId: number | null;
    result: "ALL" | "GRANTED" | "DENIED";
    dateFrom: string | null;
    dateTo: string | null;
  };
  setLogsFilter: (filter: Partial<UiState["logsFilter"]>) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeModal: null,
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),

  userListFilter: { search: "", departmentId: null },
  setUserListFilter: (filter) =>
    set((state) => ({ userListFilter: { ...state.userListFilter, ...filter } })),

  logsFilter: {
    kartu: "",
    controllerId: null,
    doorId: null,
    result: "ALL",
    dateFrom: null,
    dateTo: null,
  },
  setLogsFilter: (filter) =>
    set((state) => ({ logsFilter: { ...state.logsFilter, ...filter } })),
}));
