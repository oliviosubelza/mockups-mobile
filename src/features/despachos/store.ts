import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageKeys, zustandStorage } from '@/shared/storage';

import type { CheckSession, Despacho, EstadoDespacho, ProductCheck } from './types';

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
    zonaRuta: 'Ruta Centro Comercial', estado: 'pendiente',
    placa: '2905-FDL',
    pesoAsignadoKg: 11640, capacidadPesoKg: 12000,
    volumenAsignadoM3: 37.8, capacidadVolumenM3: 45,
  },
  {
    id: '2043', codigo: '1000459', puntosCount: 5,
    zonaRuta: 'Ruta Plan 3000', estado: 'pendiente',
    placa: '4460-JQN',
    pesoAsignadoKg: 4080, capacidadPesoKg: 8000,
    volumenAsignadoM3: 14.1, capacidadVolumenM3: 30,
  },
  {
    id: '2042', codigo: '98421', puntosCount: 7,
    zonaRuta: 'Ruta Villa 1ro de Mayo', estado: 'pendiente',
    placa: '5013-BWX',
    pesoAsignadoKg: 9360, capacidadPesoKg: 12000,
    volumenAsignadoM3: 40.5, capacidadVolumenM3: 45,
  },
  {
    id: '2041', codigo: '98422', puntosCount: 3,
    zonaRuta: 'Ruta Doble Vía La Guardia', estado: 'pendiente',
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
  /** Marks the dispatch count as completed with a target status (finalizado or diferencia). */
  guardar: (despachoId: string, estadoFinal?: EstadoDespacho) => void;
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

          const despacho = state.despachos.find((d) => d.id === despachoId);
          const existingSession = state.sessionsByDespacho[despachoId];

          const updatedDespachos = state.despachos.map((d) =>
            d.id === despachoId && d.estado === 'pendiente'
              ? { ...d, estado: 'en_conteo' as EstadoDespacho }
              : d,
          );

          const isNewSession =
            !existingSession ||
            despacho?.estado === 'pendiente' ||
            !existingSession.startedAt;

          const updatedSessions = isNewSession
            ? {
                ...state.sessionsByDespacho,
                [despachoId]: { startedAt: Date.now(), finishedAt: null },
              }
            : state.sessionsByDespacho;

          if (existingIndex !== -1) {
            // ACTUALIZAR EL MISMO PRODUCTO EN LUGAR DE INSERTAR UNO NUEVO
            const updated = [...current];
            updated[existingIndex] = { ...updated[existingIndex], nombre };
            return {
              despachos: updatedDespachos,
              sessionsByDespacho: updatedSessions,
              checksByDespacho: {
                ...state.checksByDespacho,
                [despachoId]: updated,
              },
            };
          }

          // SI ES NUEVO, INSERTAR AL PRINCIPIO
          const item: ProductCheck = { id: nextId(), codigo, nombre };
          return {
            despachos: updatedDespachos,
            sessionsByDespacho: updatedSessions,
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
          const despacho = state.despachos.find((d) => d.id === despachoId);
          const existingSession = state.sessionsByDespacho[despachoId];

          const updatedDespachos = state.despachos.map((d) =>
            d.id === despachoId && d.estado === 'pendiente'
              ? { ...d, estado: 'en_conteo' as EstadoDespacho }
              : d,
          );

          const isNewSession =
            !existingSession ||
            despacho?.estado === 'pendiente' ||
            !existingSession.startedAt;

          if (isNewSession) {
            return {
              despachos: updatedDespachos,
              sessionsByDespacho: {
                ...state.sessionsByDespacho,
                [despachoId]: { startedAt: Date.now(), finishedAt: null },
              },
            };
          }
          return { despachos: updatedDespachos };
        }),

      finishCheck: (despachoId) =>
        set((state) => {
          const session = state.sessionsByDespacho[despachoId];
          const now = Date.now();
          if (!session) {
            return {
              sessionsByDespacho: {
                ...state.sessionsByDespacho,
                [despachoId]: { startedAt: now, finishedAt: now },
              },
            };
          }
          if (session.finishedAt !== null) return state;
          return {
            sessionsByDespacho: {
              ...state.sessionsByDespacho,
              [despachoId]: { ...session, finishedAt: now },
            },
          };
        }),

      guardar: (despachoId, estadoFinal = 'finalizado') =>
        set((state) => ({
          despachos: state.despachos.map((d) =>
            d.id === despachoId
              ? { ...d, estado: estadoFinal }
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

/** Count of pending dispatches (pendiente o en_conteo) — feeds the Home badge. */
export const selectPendientesCount = (state: DespachosState): number =>
  state.despachos.filter((d) => d.estado === 'pendiente' || d.estado === 'en_conteo').length;
