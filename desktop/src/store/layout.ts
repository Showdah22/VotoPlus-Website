import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Store per lo stato "collapsed" della sidebar sinistra e del RightPanel.
 * Persistito in localStorage → la scelta dell'utente resta tra sessioni.
 */
type LayoutState = {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  setLeftCollapsed: (v: boolean) => void;
  setRightCollapsed: (v: boolean) => void;
};

export const useLayout = create<LayoutState>()(
  persist(
    (set) => ({
      leftCollapsed: false,
      rightCollapsed: false,
      toggleLeft: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
      toggleRight: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
      setLeftCollapsed: (v) => set({ leftCollapsed: v }),
      setRightCollapsed: (v) => set({ rightCollapsed: v }),
    }),
    {
      name: "voto-desktop-layout",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
