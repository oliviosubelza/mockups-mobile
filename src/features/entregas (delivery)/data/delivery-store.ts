import { create } from 'zustand';
import type { DeliveryStop, EstadoEntrega } from '../types';

export const INITIAL_STOPS: DeliveryStop[] = [
  {
    id: 'DEL-101',
    sequence: 1,
    clientName: 'Hipermaxi - Equipetrol Norte',
    deliveryPointId: 'DP-4401',
    address: 'Av. San Martín #1420, Equipetrol Norte',
    contactName: 'Lic. Roberto Gómez (Almacén Alimentos)',
    contactPhone: '+591 71234567',
    deliveryWindow: '08:00 - 09:30 hs',
    status: 'PENDING',
    isCold: true,
    packagesCount: '180.5 kg • 0.6 m³',
    weightKg: 180.5,
    volumeM3: 0.6,
    totalUnits: 96,
    netTotal: 'Bs. 5,030.00',
    invoiceTotal: 5030,
    advanceAmount: 800,
    notes: 'Recibe en rampa de frío con sello.',
    latitude: -17.768,
    longitude: -63.195,
  },
  {
    id: 'DEL-102',
    sequence: 2,
    clientName: 'Supermercados IC Norte - Banzer',
    deliveryPointId: 'DP-4402',
    address: 'Av. Cristo Redentor y 3er Anillo Norte',
    contactName: 'Marcos Vargas (Recepción Abarrotes)',
    contactPhone: '+591 72345678',
    deliveryWindow: '09:30 - 11:00 hs',
    status: 'PENDING',
    isCold: false,
    packagesCount: '340.0 kg • 1.1 m³',
    weightKg: 340.0,
    volumeM3: 1.1,
    totalUnits: 180,
    netTotal: 'Bs. 3,450.00',
    invoiceTotal: 3450,
    advanceAmount: 450,
    notes: 'Descarga por rampa trasera de proveedores.',
    latitude: -17.752,
    longitude: -63.181,
  },
  {
    id: 'DEL-103',
    sequence: 3,
    clientName: 'Mercado Abasto Norte - Hortalizas',
    deliveryPointId: 'DP-4403',
    address: 'Av. Cristo Redentor y 5to Anillo Norte',
    contactName: 'Ing. Fernando Roca',
    contactPhone: '+591 73456789',
    deliveryWindow: '11:00 - 12:30 hs',
    status: 'PENDING',
    isCold: true,
    packagesCount: '520.0 kg • 1.8 m³',
    weightKg: 520.0,
    volumeM3: 1.8,
    totalUnits: 264,
    netTotal: 'Bs. 9,800.00',
    invoiceTotal: 9800,
    advanceAmount: 200,
    notes: 'Revisar temperatura de bultos al entregar.',
    latitude: -17.792,
    longitude: -63.184,
  },
  {
    id: 'DEL-104',
    sequence: 4,
    clientName: 'Mercado Mutualista - Sector Alimentos',
    deliveryPointId: 'DP-4404',
    address: 'Av. Mutualista y 3er Anillo Este',
    contactName: 'Lucía Fernández',
    contactPhone: '+591 74567890',
    deliveryWindow: '13:00 - 14:30 hs',
    status: 'PENDING',
    isCold: false,
    packagesCount: '210.0 kg • 0.7 m³',
    weightKg: 210.0,
    volumeM3: 0.7,
    totalUnits: 120,
    netTotal: 'Bs. 2,150.00',
    invoiceTotal: 2150,
    advanceAmount: 2150,
    notes: 'Ingreso por portón lateral de carga.',
    latitude: -17.805,
    longitude: -63.201,
  },
  {
    id: 'DEL-105',
    sequence: 5,
    clientName: 'Micromarket Fidalga - 4to Anillo',
    deliveryPointId: 'DP-4405',
    address: 'Av. Banzer esquina 4to Anillo Norte',
    contactName: 'Gonzalo Morales',
    contactPhone: '+591 75678901',
    deliveryWindow: '15:00 - 16:30 hs',
    status: 'PENDING',
    isCold: true,
    packagesCount: '95.0 kg • 0.3 m³',
    weightKg: 95.0,
    volumeM3: 0.3,
    totalUnits: 60,
    netTotal: 'Bs. 1,680.00',
    invoiceTotal: 1680,
    advanceAmount: 1650,
    notes: 'Ingreso por parqueo de clientes.',
    latitude: -17.741,
    longitude: -63.17,
  },
  {
    id: 'DEL-106',
    sequence: 6,
    clientName: 'Hipermaxi - Villa 1ro de Mayo',
    deliveryPointId: 'DP-4406',
    address: 'Av. Cumavi #5200, 3er Anillo Este',
    contactName: 'Dra. Patricia Silva',
    contactPhone: '+591 76789012',
    deliveryWindow: '16:30 - 17:30 hs',
    status: 'PENDING',
    isCold: false,
    packagesCount: '310.0 kg • 0.9 m³',
    weightKg: 310.0,
    volumeM3: 0.9,
    totalUnits: 168,
    netTotal: 'Bs. 7,320.00',
    invoiceTotal: 7320,
    advanceAmount: 0,
    notes: 'Recepción hasta las 17:30 imprevistos.',
    latitude: -17.789,
    longitude: -63.138,
  },
];

type DeliveryStoreState = {
  stops: DeliveryStop[];
  selectedStopId: string;
  setSelectedStop: (stop: DeliveryStop) => void;
  getSelectedStop: () => DeliveryStop;
  updateStopStatus: (stopId: string, status: EstadoEntrega) => void;
};

export const useDeliveryStore = create<DeliveryStoreState>((set, get) => ({
  stops: INITIAL_STOPS,
  selectedStopId: INITIAL_STOPS[0].id,

  setSelectedStop: (stop) => set({ selectedStopId: stop.id }),

  getSelectedStop: () => {
    const { stops, selectedStopId } = get();
    return stops.find((s) => s.id === selectedStopId) || stops[0];
  },

  updateStopStatus: (stopId, status) =>
    set((state) => {
      const updatedStops = state.stops.map((s) =>
        s.id === stopId ? { ...s, status } : s
      );

      let nextSelectedId = state.selectedStopId;
      if (status === "DELIVERED" && state.selectedStopId === stopId) {
        const nextActive =
          updatedStops.find((s) => s.status === "ARRIVED") ||
          updatedStops.find((s) => s.status === "EN_ROUTE") ||
          updatedStops.find((s) => s.status === "PENDING") ||
          updatedStops.find((s) => s.status === "INCIDENT");
        if (nextActive) {
          nextSelectedId = nextActive.id;
        }
      }

      return {
        stops: updatedStops,
        selectedStopId: nextSelectedId,
      };
    }),
}));

export function setSelectedStop(stop: DeliveryStop): void {
  useDeliveryStore.getState().setSelectedStop(stop);
}

export function getSelectedStop(): DeliveryStop {
  return useDeliveryStore.getState().getSelectedStop();
}

export function updateStopStatus(stopId: string, status: EstadoEntrega): void {
  useDeliveryStore.getState().updateStopStatus(stopId, status);
}
