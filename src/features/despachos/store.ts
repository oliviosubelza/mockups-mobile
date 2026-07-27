import { create } from 'zustand';

import type { Despacho, ProductCheck } from './types';

let seq = 0;
const nextId = () => `chk-${Date.now()}-${seq++}`;

const SEED: Despacho[] = [
  { id: 'dsp-2045', codigo: 'DSP-2045', cliente: 'Distribuidora Andina', estado: 'pendiente' },
  { id: 'dsp-2046', codigo: 'DSP-2046', cliente: 'Comercial del Sur', estado: 'pendiente' },
  { id: 'dsp-2044', codigo: 'DSP-2044', cliente: 'Mayorista Central', estado: 'cargado' },
  { id: 'dsp-2043', codigo: 'DSP-2043', cliente: 'Almacenes Norte', estado: 'aprobado' },
];

type DespachosState = {
  despachos: Despacho[];
  activeId: string | null;
  checksByDespacho: Record<string, ProductCheck[]>;
  setActive: (id: string) => void;
  addCheck: (despachoId: string, codigo: string, nombre: string) => void;
  removeCheck: (despachoId: string, checkId: string) => void;
  /** Mockup "send to verify": marks the dispatch as loaded. */
  guardar: (despachoId: string) => void;
};

export const useDespachos = create<DespachosState>((set) => ({
  despachos: SEED,
  activeId: null,
  checksByDespacho: {},

  setActive: (id) => set({ activeId: id }),

  addCheck: (despachoId, codigo, nombre) =>
    set((state) => {
      const item: ProductCheck = { id: nextId(), codigo, nombre };
      const current = state.checksByDespacho[despachoId] ?? [];
      return {
        checksByDespacho: {
          ...state.checksByDespacho,
          [despachoId]: [...current, item],
        },
      };
    }),

  removeCheck: (despachoId, checkId) =>
    set((state) => ({
      checksByDespacho: {
        ...state.checksByDespacho,
        [despachoId]: (state.checksByDespacho[despachoId] ?? []).filter(
          (i) => i.id !== checkId,
        ),
      },
    })),

  guardar: (despachoId) =>
    set((state) => ({
      despachos: state.despachos.map((d) =>
        d.id === despachoId && d.estado === 'pendiente'
          ? { ...d, estado: 'cargado' }
          : d,
      ),
    })),
}));

/** Count of pending dispatches — feeds the Home badge. */
export const selectPendientesCount = (state: DespachosState): number =>
  state.despachos.filter((d) => d.estado === 'pendiente').length;
