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
};

/** One line of the blind check (chequeo a ciegas). */
export type ProductCheck = {
  id: string;
  codigo: string;
  nombre: string;
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
