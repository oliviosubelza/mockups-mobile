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
    referencePhotos: [
      {
        id: 'PH-101-1',
        tag: 'Fachada',
        url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80',
        caption: 'Fachada principal sobre Av. San Martín frente al camellón central.',
        takenAt: '12 Ago 2026',
      },
      {
        id: 'PH-101-2',
        tag: 'Portón de Carga',
        url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
        caption: 'Portón metálico posterior. Rampa #2 exclusiva para cadena de frío.',
        takenAt: '12 Ago 2026',
      },
      {
        id: 'PH-101-3',
        tag: 'Referencia',
        url: 'https://images.unsplash.com/photo-1519074069444-1ba4fff16def?w=800&q=80',
        caption: 'Esquina farmacia y letrero luminoso Hipermaxi.',
        takenAt: '05 Jul 2026',
      },
    ],
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
    referencePhotos: [
      {
        id: 'PH-102-1',
        tag: 'Fachada',
        url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80',
        caption: 'Fachada comercial IC Norte sobre la Av. Banzer.',
        takenAt: '28 Jul 2026',
      },
      {
        id: 'PH-102-2',
        tag: 'Portón de Carga',
        url: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&q=80',
        caption: 'Rampa de proveedores y zona de descarga de abarrotes.',
        takenAt: '28 Jul 2026',
      },
    ],
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
    referencePhotos: [
      {
        id: 'PH-103-1',
        tag: 'Fachada',
        url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
        caption: 'Nave 3 de distribución y sector de hortalizas.',
        takenAt: '15 Jul 2026',
      },
      {
        id: 'PH-103-2',
        tag: 'Portón de Carga',
        url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
        caption: 'Portón corredizo lateral para ingreso de camiones refrigerados.',
        takenAt: '15 Jul 2026',
      },
    ],
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
    referencePhotos: [
      {
        id: 'PH-104-1',
        tag: 'Portón de Carga',
        url: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&q=80',
        caption: 'Portón verde lateral sobre pasillo de carga de abarrotes.',
        takenAt: '10 Ago 2026',
      },
      {
        id: 'PH-104-2',
        tag: 'Referencia',
        url: 'https://images.unsplash.com/photo-1519074069444-1ba4fff16def?w=800&q=80',
        caption: 'Caseta de seguridad y control de balanza.',
        takenAt: '10 Ago 2026',
      },
    ],
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
    referencePhotos: [
      {
        id: 'PH-105-1',
        tag: 'Fachada',
        url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80',
        caption: 'Fachada vidriada en esquina con estacionamiento frontal.',
        takenAt: '02 Ago 2026',
      },
    ],
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
    referencePhotos: [
      {
        id: 'PH-106-1',
        tag: 'Fachada',
        url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80',
        caption: 'Acceso vehicular sobre Av. Cumavi.',
        takenAt: '18 Jul 2026',
      },
    ],
  },
];

type StartRouteSignatureData = {
  paths: string[];
  strokeCount: number;
  signedBy: string;
  signedAt: string;
  orderCode: string;
};

type DeliveryStoreState = {
  stops: DeliveryStop[];
  selectedStopId: string;
  startRouteSignature?: StartRouteSignatureData;
  setSelectedStop: (stop: DeliveryStop) => void;
  getSelectedStop: () => DeliveryStop;
  updateStopStatus: (stopId: string, status: EstadoEntrega) => void;
  addStopReferencePhoto: (stopId: string, photo: import('../types').StopReferencePhoto) => void;
  setStartRouteSignature: (sig: StartRouteSignatureData) => void;
};

export const useDeliveryStore = create<DeliveryStoreState>((set, get) => ({
  stops: INITIAL_STOPS,
  selectedStopId: INITIAL_STOPS[0].id,
  startRouteSignature: {
    paths: [
      'M 50 120 Q 80 60 110 90 Q 140 120 170 70 L 220 130',
      'M 90 100 L 190 100',
    ],
    strokeCount: 2,
    signedBy: 'Gino Baptista (Chofer)',
    signedAt: '07:30 hs',
    orderCode: '98421',
  },

  setSelectedStop: (stop) => set({ selectedStopId: stop.id }),

  getSelectedStop: () => {
    const { stops, selectedStopId } = get();
    return stops.find((s) => s.id === selectedStopId) || stops[0];
  },

  setStartRouteSignature: (sig) => set({ startRouteSignature: sig }),

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

  addStopReferencePhoto: (stopId, photo) =>
    set((state) => ({
      stops: state.stops.map((s) =>
        s.id === stopId
          ? {
              ...s,
              referencePhotos: [...(s.referencePhotos || []), photo],
            }
          : s
      ),
    })),
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

export function addStopReferencePhoto(stopId: string, photo: import('../types').StopReferencePhoto): void {
  useDeliveryStore.getState().addStopReferencePhoto(stopId, photo);
}
