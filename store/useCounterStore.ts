import { create } from "zustand";

type CounterState = {
  count: number;
  decrease: () => void;
  increase: () => void;
  reset: () => void;
};

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  decrease: () => set((state) => ({ count: state.count - 1 })),
  increase: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
}));
