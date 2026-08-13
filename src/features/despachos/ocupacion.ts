import type { Despacho } from './types';

/** Which of the two physical limits the load actually runs into first. */
export type Limitante = 'peso' | 'volumen';

export type Ocupacion = {
  /** The binding percentage — the one that decides whether the truck is full. */
  pct: number;
  limitante: Limitante;
  pesoPct: number;
  volumenPct: number;
};

const pct = (used: number, capacity: number) =>
  capacity > 0 ? Math.round((used / capacity) * 100) : 0;

/**
 * A truck fills up by weight *or* by volume, whichever runs out first: dense
 * cargo maxes the axles with the box half empty, bulky cargo fills the box at
 * half the legal weight. Reporting only weight would call that second truck
 * 46% full when there is no room left in it, so the headline figure is the
 * higher of the two and `limitante` names which one it came from.
 */
export function calcularOcupacion(despacho: Despacho): Ocupacion {
  const pesoPct = pct(despacho.pesoAsignadoKg, despacho.capacidadPesoKg);
  const volumenPct = pct(
    despacho.volumenAsignadoM3,
    despacho.capacidadVolumenM3,
  );

  return {
    pct: Math.max(pesoPct, volumenPct),
    limitante: pesoPct >= volumenPct ? 'peso' : 'volumen',
    pesoPct,
    volumenPct,
  };
}

/**
 * Fill level as a status, not as a judgement on efficiency: a half-empty truck
 * is a planning matter, an overloaded one is a legal one.
 */
export function tonoOcupacion(pct: number): 'primary' | 'warning' | 'danger' {
  if (pct > 100) return 'danger';
  if (pct >= 90) return 'warning';
  return 'primary';
}
