import { ClipboardCheck, Settings, Truck } from 'lucide-react-native';

import ChequeoScreen from '@/features/despachos/ChequeoScreen';
import DespachosScreen from '@/features/despachos/screen';
import SettingsScreen from '@/features/settings/screen';

import type { RouteInterface } from './types';

/**
 * The whole app navigation as data. Add a route here (with `showInHome`) and it
 * appears on the Home grid and resolves through the catch-all automatically —
 * no new files under `app/`.
 */
export const routes: RouteInterface[] = [
  {
    id: 'despachos',
    path: '/despachos',
    title: 'Mis Despachos',
    description: 'Despachos asignados a tu cuenta',
    icon: Truck,
    component: DespachosScreen,
    showInHome: true,
    showInMenuBottom: true,
    badge: 1,
    order: 0,
    subRoutes: [
      {
        id: 'despachos.chequeo',
        path: '/despachos/chequeo',
        title: 'Chequeo a ciegas',
        icon: ClipboardCheck,
        component: ChequeoScreen,
      },
    ],
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
