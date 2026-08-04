import { ClipboardCheck, Palette, Settings, Truck, Package, ShieldCheck, CheckSquare } from 'lucide-react-native';

import ChequeoScreen from '@/features/despachos/ChequeoScreen';
import DespachosScreen from '@/features/despachos/screen';
import GalleryScreen from '@/features/gallery/screen';
import SettingsScreen from '@/features/settings/screen';
import OrdenesParaRevisarScreen from '@/features/supervisor/OrdenesParaRevisarScreen';
import ConsolidacionConteoScreen from '@/features/supervisor/ConsolidacionConteoScreen';

import type { RouteInterface } from './types';
import { DeliveryScreen } from '@/features/entregas (delivery)/delivery-screen';
import { DeliveryRouteScreen } from '@/features/entregas (delivery)/DeliveryRouteScreen';
import { RegistrarVisitaScreen } from '@/features/entregas (delivery)/RegistrarVisitaScreen';
import { DeliveryDetailScreen } from '@/features/entregas (delivery)/delivery-details-screen';

/**
 * The whole app navigation as data. Add a route here (with `showInHome`) and it
 * appears on the Home grid and resolves through the catch-all automatically —
 * no new files under `app/`.
 */
export const routes: RouteInterface[] = [
  {
    id: 'supervisor.ordenes',
    path: '/supervisor/ordenes',
    title: 'Órdenes para Revisar',
    description: 'Aprobación y consolidación de revisión a ciegas',
    icon: ShieldCheck,
    component: OrdenesParaRevisarScreen,
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
        component: ConsolidacionConteoScreen,
      },
    ],
  },
  {
    id: 'despachos',
    path: '/despachos',
    title: 'Revision a ciegas',
    description: 'Ordenes de transporte asignados a tu cuenta',
    icon: Truck,
    component: DespachosScreen,
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
        component: ChequeoScreen,
      },
    ],
  },
  {
    id: 'entregas',
    path: '/entregas',
    title: 'Mis Entregas',
    description: 'Entregas a realizar en ruta',
    icon: Package,
    component: DeliveryScreen,
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
        component: DeliveryRouteScreen,
      },
      {
        id: 'entregas.registrarVisita',
        path: '/entregas/registrar-visita',
        title: 'Registrar Visita',
        icon: ClipboardCheck,
        component: RegistrarVisitaScreen,
      },
      {
        id: 'entregas.detalle',
        path: '/entregas/detalle',
        title: 'Detalle de Entrega',
        icon: ClipboardCheck,
        component: DeliveryDetailScreen,
      },
    ],
  },
  {
    id: 'gallery',
    path: '/gallery',
    title: 'Galería de componentes',
    description: 'Design system: variantes, tamaños y densidad',
    icon: Palette,
    component: GalleryScreen,
    showInHome: true,
    order: 90,
  },
  {
    id: 'settings',
    path: '/settings',
    title: 'Configuración',
    icon: Settings,
    component: SettingsScreen,
    showInHome: false,
    order: 99,
  },
];
