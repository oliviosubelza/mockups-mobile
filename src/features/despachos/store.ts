import { create } from 'zustand';

import type { Despacho, ProductCheck } from './types';

let seq = 0;
const nextId = () => `chk-${Date.now()}-${seq++}`;

const SEED: Despacho[] = [
  { id: '2045', codigo: '1000456', puntosCount: 6, zonaRuta: 'Ruta Norte • Santa Cruz', estado: 'pendiente' },
  { id: '2046', codigo: '1000457', puntosCount: 4, zonaRuta: 'Ruta Equipetrol', estado: 'en_conteo' },
  { id: '2044', codigo: '1000458', puntosCount: 8, zonaRuta: 'Ruta Centro Comercial', estado: 'diferencia' },
  { id: '2043', codigo: '1000459', puntosCount: 5, zonaRuta: 'Ruta Plan 3000', estado: 'validando_supervisor' },
  { id: '2042', codigo: '98421', puntosCount: 7, zonaRuta: 'Ruta Villa 1ro de Mayo', estado: 'finalizado' },
  { id: '2041', codigo: '98422', puntosCount: 3, zonaRuta: 'Ruta Doble Vía La Guardia', estado: 'finalizado' },
];

type DespachosState = {
  despachos: Despacho[];
  activeId: string | null;
  checksByDespacho: Record<string, ProductCheck[]>;
  setActive: (id: string) => void;
  addCheck: (despachoId: string, codigo: string, nombre: string) => void;
  removeCheck: (despachoId: string, checkId: string) => void;
  /** Finaliza el conteo del chofer: asigna 'diferencia' si hay alguna discrepancia, o 'finalizado' si coincide 100%. */
  guardar: (despachoId: string, hasDifferences?: boolean) => void;
  /** Transición intermedia cuando el supervisor toma la orden con diferencia para revisar. */
  enviarASupervisor: (despachoId: string) => void;
  /** Transición cuando el supervisor aprueba la orden revisada. */
  aprobarSupervisor: (despachoId: string) => void;
  anular: (despachoId: string) => void;
};

export const useDespachos = create<DespachosState>((set) => ({
  despachos: SEED,
  activeId: null,
  checksByDespacho: {},

  setActive: (id) => set({ activeId: id }),

  addCheck: (despachoId, codigo, nombre) =>
    set((state) => {
      const current = state.checksByDespacho[despachoId] ?? [];
      const existingIndex = current.findIndex((i) => i.codigo === codigo);
      let updatedChecks: ProductCheck[];

      if (existingIndex !== -1) {
        // ACTUALIZAR EL MISMO PRODUCTO EN LUGAR DE INSERTAR UNO NUEVO
        updatedChecks = [...current];
        updatedChecks[existingIndex] = { ...updatedChecks[existingIndex], nombre };
      } else {
        // SI ES NUEVO, INSERTAR AL PRINCIPIO
        const item: ProductCheck = { id: nextId(), codigo, nombre };
        updatedChecks = [item, ...current];
      }

      // Al agregar el primer producto, cambia de 'pendiente' (estado 1) a 'en_conteo' (estado 2)
      const updatedDespachos = state.despachos.map((d) =>
        d.id === despachoId && d.estado === 'pendiente'
          ? { ...d, estado: 'en_conteo' as const }
          : d,
      );

      return {
        checksByDespacho: {
          ...state.checksByDespacho,
          [despachoId]: updatedChecks,
        },
        despachos: updatedDespachos,
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

  guardar: (despachoId, hasDifferences = false) =>
    set((state) => ({
      despachos: state.despachos.map((d) =>
        d.id === despachoId
          ? { ...d, estado: hasDifferences ? ('diferencia' as const) : ('finalizado' as const) }
          : d,
      ),
    })),

  enviarASupervisor: (despachoId) =>
    set((state) => ({
      despachos: state.despachos.map((d) =>
        d.id === despachoId ? { ...d, estado: 'validando_supervisor' as const } : d,
      ),
    })),

  aprobarSupervisor: (despachoId) =>
    set((state) => ({
      despachos: state.despachos.map((d) =>
        d.id === despachoId ? { ...d, estado: 'finalizado' as const } : d,
      ),
    })),

  anular: (despachoId) =>
    set((state) => ({
      despachos: state.despachos.filter((d) => d.id !== despachoId),
    })),
}));

/** Count of pending dispatches (pendiente o en_conteo) — feeds the Home badge. */
export const selectPendientesCount = (state: DespachosState): number =>
  state.despachos.filter((d) => d.estado === 'pendiente' || d.estado === 'en_conteo').length;
