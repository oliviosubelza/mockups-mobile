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

/** UI metadata (label + chip tone) for each dispatch status. */
export const ESTADO_META: Record<
  EstadoDespacho,
  { label: string; tone: ChipTone }
> = {
  pendiente: { label: 'Pendiente', tone: 'warning' },
  cargado: { label: 'Cargado', tone: 'primary' },
  aprobado: { label: 'Aprobado', tone: 'success' },
};
