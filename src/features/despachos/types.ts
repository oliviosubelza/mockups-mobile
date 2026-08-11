import type { ChipTone } from '@/shared/ui';

export type EstadoDespacho = 'pendiente' | 'cargado' | 'aprobado';

export type Despacho = {
  id: string;
  codigo: string;
  puntosCount: number;
  zonaRuta: string;
  estado: EstadoDespacho;
};

/** One line of the blind check (chequeo a ciegas). */
export type ProductCheck = {
  id: string;
  codigo: string;
  nombre: string;
};

/**
 * How long a driver spent counting one order, stored as the two instants the
 * schema already names — `transport_order_histories` CHECKED_START and
 * CHECKED_END. The duration is derived, never accumulated, so backgrounding or
 * killing the app cannot make it drift.
 */
export type CheckSession = {
  /** Epoch ms of the first registered product. */
  startedAt: number;
  /** Epoch ms of "Finalizar"; `null` while the count is still open. */
  finishedAt: number | null;
};

/** UI metadata (label + chip tone) for each dispatch status. */
export const ESTADO_META: Record<
  EstadoDespacho,
  { label: string; tone: ChipTone }
> = {
  pendiente: { label: 'Pendiente', tone: 'warning' },
  cargado: { label: 'Cargado', tone: 'primary' },
  aprobado: { label: 'Aprobado', tone: 'success' },
};
