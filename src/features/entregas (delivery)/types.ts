export type EstadoEntrega = 'PENDING' | 'EN_ROUTE' | 'ARRIVED' | 'DELIVERED' | 'INCIDENT';

export type DeliveryStop = {
  id: string;
  sequence: number;
  clientName: string;
  deliveryPointId: string;
  address: string;
  contactName: string;
  contactPhone: string;
  deliveryWindow: string;
  status: EstadoEntrega;
  isCold: boolean;
  packagesCount: string; // Formateado como "180.5 kg • 0.6 m³"
  weightKg: number;
  volumeM3: number;
  totalUnits: number;
  netTotal: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
};

export type ActiveTrip = {
  id: string;
  transportOrderCode: string;
  truckCode: string;
  truckPlate: string;
  driverName: string;
  helperName: string;
  status: 'PENDING' | 'EN_RUTA' | 'FINALIZADO';
  assignedWeightKg: number;
  assignedVolumeM3: number;
  departureTime: string;
};
