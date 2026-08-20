import type { ComponentType } from 'react';

import ChequeoScreen from '@/features/despachos/ChequeoScreen';
import DespachosScreen from '@/features/despachos/screen';
import { DeliveryRouteScreen } from '@/features/entregas (delivery)/DeliveryRouteScreen';
import { DeliveryDetailScreen } from '@/features/entregas (delivery)/delivery-details-screen';
import { DeliveryScreen } from '@/features/entregas (delivery)/delivery-screen';
import { FinalizacionEntregasScreen } from '@/features/entregas (delivery)/FinalizacionEntregasScreen';
import { RegistrarVisitaScreen } from '@/features/entregas (delivery)/RegistrarVisitaScreen';
import GalleryScreen from '@/features/gallery/screen';
import SettingsScreen from '@/features/settings/screen';
import ConsolidacionConteoScreen from '@/features/supervisor/ConsolidacionConteoScreen';
import OrdenesParaRevisarScreen from '@/features/supervisor/OrdenesParaRevisarScreen';
import ProductosFaltantesScreen from '@/features/supervisor/ProductosFaltantesScreen';
import RevisionSemaforoExecuteScreen from '@/features/supervisor/RevisionSemaforoExecuteScreen';
import RevisionSemaforoListScreen from '@/features/supervisor/RevisionSemaforoListScreen';

import { flattenRoutes } from './registry';

/**
 * Maps a `RouteInterface.id` to the screen the catch-all renders for it.
 *
 * This is the only module that pulls feature screens into the navigation layer,
 * and nothing under `navigation/` imports it back — that one-way edge is what
 * keeps `registry.ts` -> `routes.ts` acyclic while screens are still free to
 * import the navigation helpers.
 */
export const screens: Record<string, ComponentType> = {
  'supervisor.productosFaltantes': ProductosFaltantesScreen,
  'supervisor.semaforo': RevisionSemaforoListScreen,
  'supervisor.semaforoEjecutar': RevisionSemaforoExecuteScreen,
  'supervisor.ordenes': OrdenesParaRevisarScreen,
  'supervisor.consolidacion': ConsolidacionConteoScreen,
  despachos: DespachosScreen,
  'despachos.chequeo': ChequeoScreen,
  entregas: DeliveryScreen,
  'entregas.ruta': DeliveryRouteScreen,
  'entregas.registrarVisita': RegistrarVisitaScreen,
  'entregas.detalle': DeliveryDetailScreen,
  'entregas.finalizacion': FinalizacionEntregasScreen,
  gallery: GalleryScreen,
  settings: SettingsScreen,
};

/** Resolve the screen for a route id, or `undefined` when none is registered. */
export function getScreen(id: string): ComponentType | undefined {
  return screens[id];
}

if (__DEV__) {
  // The route table no longer holds the component, so the two halves can drift.
  // Fail loudly at startup instead of rendering a blank catch-all.
  const routeIds = new Set(
    [...flattenRoutes().values()].map((route) => route.id),
  );
  const missing = [...routeIds].filter((id) => !screens[id]);
  const orphaned = Object.keys(screens).filter((id) => !routeIds.has(id));

  if (missing.length) {
    console.error(
      `[navigation] routes without a screen in screens.ts: ${missing.join(', ')}`,
    );
  }
  if (orphaned.length) {
    console.warn(
      `[navigation] screens with no matching route id: ${orphaned.join(', ')}`,
    );
  }
}
