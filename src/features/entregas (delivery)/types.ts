export type EstadoEntrega = 'PENDING' | 'EN_ROUTE' | 'ARRIVED' | 'DELIVERED' | 'INCIDENT';

/** Metodo de cobro en sitio. Compartido entre la pantalla y el modal de cobro. */
export type PaymentMethodType = 'CASH' | 'TRANSFER' | 'QR' | 'CHECK';

export type StopReferencePhotoTag = 'Fachada' | 'Portón de Carga' | 'Referencia' | 'Recepción' | 'Otro';

export type StopReferencePhoto = {
  id: string;
  tag: StopReferencePhotoTag;
  url: string;
  caption?: string;
  takenAt?: string;
};

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
  /** Total facturado del punto de entrega. Mapea a dispatch_delivery_points.total_neto. */
  invoiceTotal: number;
  /** Anticipo que la empresa ya debe al cliente y se descuenta de la factura.
   *  NO existe aun en el esquema (db.puml); es un campo de mockup. */
  advanceAmount: number;
  notes?: string;
  latitude?: number;
  longitude?: number;
  referencePhotos?: StopReferencePhoto[];
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
  startSignature?: {
    paths: string[];
    strokeCount: number;
    signedBy: string;
    signedAt: string;
  };
};

