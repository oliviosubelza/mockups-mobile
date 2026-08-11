import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageKeys, zustandStorage } from '@/shared/storage';

import type { CheckSession, Despacho, ProductCheck } from './types';

let seq = 0;
const nextId = () => `chk-${Date.now()}-${seq++}`;

/**
 * Capacities are real distribution-fleet sizes (3.5 t furgón, 8 t and 12 t
 * rigid) and the loads are deliberately varied: `2046` and `2042` fill up by
 * volume well before they fill up by weight, which is what keeps the occupancy
 * figure honest instead of always reading as a weight ratio.
 */
const SEED: Despacho[] = [
  {
    id: '2045', codigo: '1000456', puntosCount: 6,
    zonaRuta: 'Ruta Norte • Santa Cruz', estado: 'pendiente',
    placa: '3721-KPZ',
    pesoAsignadoKg: 6240, capacidadPesoKg: 8000,
    volumenAsignadoM3: 19.5, capacidadVolumenM3: 30,
  },
  {
    id: '2046', codigo: '1000457', puntosCount: 4,
    zonaRuta: 'Ruta Equipetrol', estado: 'pendiente',
    placa: '1184-HTR',
    pesoAsignadoKg: 1610, capacidadPesoKg: 3500,
    volumenAsignadoM3: 15.8, capacidadVolumenM3: 18,
  },
  {
    id: '2044', codigo: '1000458', puntosCount: 8,
    zonaRuta: 'Ruta Centro Comercial', estado: 'cargado',
    placa: '2905-FDL',
    pesoAsignadoKg: 11640, capacidadPesoKg: 12000,
    volumenAsignadoM3: 37.8, capacidadVolumenM3: 45,
  },
  {
    id: '2043', codigo: '1000459', puntosCount: 5,
    zonaRuta: 'Ruta Plan 3000', estado: 'aprobado',
    placa: '4460-JQN',
    pesoAsignadoKg: 4080, capacidadPesoKg: 8000,
    volumenAsignadoM3: 14.1, capacidadVolumenM3: 30,
  },
  {
    id: '2042', codigo: '98421', puntosCount: 7,
    zonaRuta: 'Ruta Villa 1ro de Mayo', estado: 'aprobado',
    placa: '5013-BWX',
    pesoAsignadoKg: 9360, capacidadPesoKg: 12000,
    volumenAsignadoM3: 40.5, capacidadVolumenM3: 45,
  },
  {
    id: '2041', codigo: '98422', puntosCount: 3,
    zonaRuta: 'Ruta Doble Vía La Guardia', estado: 'aprobado',
    placa: '0872-MCV',
    pesoAsignadoKg: 1090, capacidadPesoKg: 3500,
    volumenAsignadoM3: 5.4, capacidadVolumenM3: 18,
  },
];

type DespachosState = {
  despachos: Despacho[];
  activeId: string | null;
  checksByDespacho: Record<string, ProductCheck[]>;
  /** Blind-count timing per dispatch — the CHECKED_START/CHECKED_END pair. */
  sessionsByDespacho: Record<string, CheckSession>;
  setActive: (id: string) => void;
  addCheck: (despachoId: string, codigo: string, nombre: string) => void;
  removeCheck: (despachoId: string, checkId: string) => void;
  /** CHECKED_START. Idempotent: only the first registered product opens it. */
  startCheck: (despachoId: string) => void;
  /** CHECKED_END. Ignored when no session was ever opened. */
  finishCheck: (despachoId: string) => void;
  /** Mockup "send to verify": marks the dispatch as loaded. */
  guardar: (despachoId: string) => void;
  anular: (despachoId: string) => void;
};

export const useDespachos = create<DespachosState>()(
  persist(
    (set) => ({
      despachos: SEED,
      activeId: null,
      checksByDespacho: {},
      sessionsByDespacho: {},

      setActive: (id) => set({ activeId: id }),

      addCheck: (despachoId, codigo, nombre) =>
        set((state) => {
          const current = state.checksByDespacho[despachoId] ?? [];
          const existingIndex = current.findIndex((i) => i.codigo === codigo);

          if (existingIndex !== -1) {
            // ACTUALIZAR EL MISMO PRODUCTO EN LUGAR DE INSERTAR UNO NUEVO
            const updated = [...current];
            updated[existingIndex] = { ...updated[existingIndex], nombre };
            return {
              checksByDespacho: {
                ...state.checksByDespacho,
                [despachoId]: updated,
              },
            };
          }

          // SI ES NUEVO, INSERTAR AL PRINCIPIO
          const item: ProductCheck = { id: nextId(), codigo, nombre };
          return {
            checksByDespacho: {
              ...state.checksByDespacho,
              [despachoId]: [item, ...current],
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

      startCheck: (despachoId) =>
        set((state) => {
          // Re-registering a product must not restart the clock, and reopening
          // a closed count must not reopen the session.
          if (state.sessionsByDespacho[despachoId]) return state;
          return {
            sessionsByDespacho: {
              ...state.sessionsByDespacho,
              [despachoId]: { startedAt: Date.now(), finishedAt: null },
            },
          };
        }),

      finishCheck: (despachoId) =>
        set((state) => {
          const session = state.sessionsByDespacho[despachoId];
          // Closing an order without ever registering a product leaves no
          // session: there is no duration to report, and inventing a
          // zero-length one would pollute the average.
          if (!session || session.finishedAt !== null) return state;
          return {
            sessionsByDespacho: {
              ...state.sessionsByDespacho,
              [despachoId]: { ...session, finishedAt: Date.now() },
            },
          };
        }),

      guardar: (despachoId) =>
        set((state) => ({
          despachos: state.despachos.map((d) =>
            d.id === despachoId && d.estado === 'pendiente'
              ? { ...d, estado: 'cargado' }
              : d,
          ),
        })),

      anular: (despachoId) =>
        set((state) => {
          // The session is persisted, so dropping the dispatch without it
          // would leave timing for an order that no longer exists.
          const { [despachoId]: _removed, ...sessions } =
            state.sessionsByDespacho;
          return {
            despachos: state.despachos.filter((d) => d.id !== despachoId),
            sessionsByDespacho: sessions,
          };
        }),
    }),
    {
      name: StorageKeys.despachos,
      storage: createJSONStorage(() => zustandStorage),
      /**
       * Only the timing survives a restart. The dispatch list and the checks
       * still come from the seed on every launch, so persisting them here
       * would freeze the mockup data at whatever the first run wrote.
       */
      partialize: (state) => ({ sessionsByDespacho: state.sessionsByDespacho }),
    },
  ),
);

/** Count of pending dispatches — feeds the Home badge. */
export const selectPendientesCount = (state: DespachosState): number =>
  state.despachos.filter((d) => d.estado === 'pendiente').length;
