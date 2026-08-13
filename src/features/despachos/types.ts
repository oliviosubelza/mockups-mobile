import type { ChipTone } from '@/shared/ui';

export type EstadoDespacho =
  | 'pendiente'
  | 'en_conteo'
  | 'diferencia'
  | 'validando_supervisor'
  | 'finalizado';

export type Despacho = {
  id: string;
  codigo: string;
  puntosCount: number;
  zonaRuta: string;
  estado: EstadoDespacho;
  /** Placa del camión asignado (`trucks.plate`). */
  placa: string;
  /** Carga asignada a la OT (`transport_orders.assigned_weight_kg`). */
  pesoAsignadoKg: number;
  /** Tope del camión (`trucks.capacity_weight_kg`). */
  capacidadPesoKg: number;
  /** Carga asignada a la OT (`transport_orders.assigned_volume_m3`). */
  volumenAsignadoM3: number;
  /** Tope del camión (`trucks.capacity_volume_m3`). */
  capacidadVolumenM3: number;
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
  pendiente: { label: 'Pendiente', tone: 'neutral' },
  en_conteo: { label: 'Inicio de conteo', tone: 'primary' },
  diferencia: { label: 'Diferencia', tone: 'danger' },
  validando_supervisor: { label: 'Validando Supervisor', tone: 'warning' },
  finalizado: { label: 'Finalizado', tone: 'success' },
};
