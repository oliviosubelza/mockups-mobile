import {
  ClipboardCheck,
  Palette,
  Settings,
  Truck,
  Package,
  ShieldCheck,
  CheckSquare,
  PackageSearch,
  ShieldAlert,
} from 'lucide-react-native';

import type { RouteInterface } from './types';

/**
 * The whole app navigation as data. Add a route here (with `showInHome`) and it
 * appears on the Home grid and resolves through the catch-all automatically —
 * no new files under `app/`.
 *
 * This module is a leaf on purpose: it imports icons and types only. The screen
 * that renders each route lives in `screens.ts`, keyed by `id`. Pulling screen
 * components in here would close the cycle `registry -> routes -> screen ->
 * registry`, which evaluates `flattenRoutes()` against a half-initialised
 * `routes`.
 */
export const routes: RouteInterface[] = [
  {
    id: 'supervisor.productosFaltantes',
    path: '/supervisor/productos-faltantes',
    title: 'Productos Faltantes',
    description: 'Productos con diferencia y a qué OT pertenecen',
    icon: PackageSearch,
    showInHome: true,
    showInMenuBottom: true,
    badge: 5,
    order: 1,
  },
  {
    id: 'supervisor.semaforo',
    path: '/supervisor/semaforo',
    title: 'Revisión Semáforo',
    description: 'Auditoría aleatoria de conteo a ciegas y control de calidad',
    icon: ShieldAlert,
    showInHome: true,
    showInMenuBottom: true,
    badge: 3,
    order: 2,
    subRoutes: [
      {
        id: 'supervisor.semaforoEjecutar',
        path: '/supervisor/semaforo/ejecutar',
        title: 'Auditoría a Ciegas Semáforo',
        icon: ShieldAlert,
      },
    ],
  },
  {
    id: 'supervisor.ordenes',
    path: '/supervisor/ordenes',
    title: 'Órdenes para Revisar',
    description: 'Aprobación y consolidación de revisión a ciegas',
    icon: ShieldCheck,
    showInHome: true,
    showInMenuBottom: true,
    badge: 2,
    order: 0,
    subRoutes: [
      {
        id: 'supervisor.consolidacion',
        path: '/supervisor/consolidacion',
        title: 'Consolidación de Conteo',
        icon: CheckSquare,
      },
    ],
  },
  {
    id: 'despachos',
    path: '/despachos',
    title: 'Revision a ciegas',
    description: 'Ordenes de transporte asignados a tu cuenta',
    icon: Truck,
    showInHome: true,
    showInMenuBottom: true,
    badge: 1,
    order: 1,
    subRoutes: [
      {
        id: 'despachos.chequeo',
        path: '/despachos/chequeo',
        title: 'Revision por Orden',
        icon: ClipboardCheck,
      },
    ],
  },
  {
    id: 'entregas',
    path: '/entregas',
    title: 'Mis Entregas',
    description: 'Entregas a realizar en ruta',
    icon: Package,
    showInHome: true,
    showInMenuBottom: true,
    badge: 4,
    order: 2,
    subRoutes: [
      {
        id: 'entregas.ruta',
        path: '/entregas/ruta',
        title: 'Hoja de Ruta',
        icon: Truck,
      },
      {
        id: 'entregas.registrarVisita',
        path: '/entregas/registrar-visita',
        title: 'Registrar Visita',
        icon: ClipboardCheck,
      },
      {
        id: 'entregas.detalle',
        path: '/entregas/detalle',
        title: 'Detalle de Entrega',
        icon: ClipboardCheck,
      },
    ],
  },
  {
    id: 'gallery',
    path: '/gallery',
    title: 'Galería de componentes',
    description: 'Design system: variantes, tamaños y densidad',
    icon: Palette,
    showInHome: true,
    order: 90,
  },
  {
    id: 'settings',
    path: '/settings',
    title: 'Configuración',
    icon: Settings,
    showInHome: false,
    order: 99,
  },
];
