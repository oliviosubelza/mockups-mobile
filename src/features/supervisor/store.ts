import { create } from 'zustand';
import { boxUnitTotal } from '@/shared/ui';

export interface SupervisorDiscrepancyItem {
  id: string;
  orderId: string;
  orderCode: string;
  driverName: string;
  zonaRuta: string;
  date: string;
  dateFormatted: string;
  codigo: string;
  nombre: string;
  categoria: string;
  isColdChain: boolean;
  expectedQty: number;
  expectedBoxes: number;
  cajaSize: number;

  driverQty: number;
  driverBoxes: number;
  driverUnits: number;
  difference: number; // 0 = OK, >0 sobrante, <0 faltante
  differenceType: string;

  // Estado consolidado por el supervisor
  correctedBoxes: string;
  correctedUnits: string;
  selectedType: string;
  isConfirmed: boolean;
  isEditing: boolean;
}

export const DISCREPANCY_CAUSES = ['Conteo', 'Diferencia', 'Cruce', 'Quiebre'] as const;
export const COUNT_OK_LABEL = 'Conteo verificado OK (Sin novedad)';

const SEED_ITEMS: SupervisorDiscrepancyItem[] = [
  // OT-4892 (Cristhian Macchiavelli • Ruta Norte • Santa Cruz)
  {
    id: 'ot4892-prod002',
    orderId: 'sup-1',
    orderCode: 'OT-4892',
    driverName: 'Cristhian Macchiavelli',
    zonaRuta: 'Ruta Norte • Santa Cruz',
    date: '2026-08-05',
    dateFormatted: 'Hoy, 14:20',
    codigo: 'PROD-002',
    nombre: 'Mayonesa Kris Galón 3.8kg',
    categoria: 'Salsas y Culinarios',
    isColdChain: true,
    expectedQty: 144,
    expectedBoxes: 12,
    cajaSize: 12,
    driverQty: 146,
    driverBoxes: 12,
    driverUnits: 2,
    difference: 2,
    differenceType: 'Conteo',
    correctedBoxes: '12',
    correctedUnits: '2',
    selectedType: 'Conteo',
    isConfirmed: false,
    isEditing: true,
  },
  {
    id: 'ot4892-prod005',
    orderId: 'sup-1',
    orderCode: 'OT-4892',
    driverName: 'Cristhian Macchiavelli',
    zonaRuta: 'Ruta Norte • Santa Cruz',
    date: '2026-08-05',
    dateFormatted: 'Hoy, 14:20',
    codigo: 'PROD-005',
    nombre: 'Ketchup Kris Galón 4kg',
    categoria: 'Salsas y Culinarios',
    isColdChain: false,
    expectedQty: 96,
    expectedBoxes: 8,
    cajaSize: 12,
    driverQty: 93,
    driverBoxes: 7,
    driverUnits: 9,
    difference: -3,
    differenceType: 'Diferencia',
    correctedBoxes: '7',
    correctedUnits: '9',
    selectedType: 'Diferencia',
    isConfirmed: false,
    isEditing: true,
  },
  {
    id: 'ot4892-prod001',
    orderId: 'sup-1',
    orderCode: 'OT-4892',
    driverName: 'Cristhian Macchiavelli',
    zonaRuta: 'Ruta Norte • Santa Cruz',
    date: '2026-08-05',
    dateFormatted: 'Hoy, 14:20',
    codigo: 'PROD-001',
    nombre: 'Avena Instantánea Kris Bolsa 500g',
    categoria: 'Postres y Cereales',
    isColdChain: false,
    expectedQty: 120,
    expectedBoxes: 10,
    cajaSize: 12,
    driverQty: 120,
    driverBoxes: 10,
    driverUnits: 0,
    difference: 0,
    differenceType: COUNT_OK_LABEL,
    correctedBoxes: '10',
    correctedUnits: '0',
    selectedType: COUNT_OK_LABEL,
    isConfirmed: true,
    isEditing: false,
  },
  {
    id: 'ot4892-prod008',
    orderId: 'sup-1',
    orderCode: 'OT-4892',
    driverName: 'Cristhian Macchiavelli',
    zonaRuta: 'Ruta Norte • Santa Cruz',
    date: '2026-08-05',
    dateFormatted: 'Hoy, 14:20',
    codigo: 'PROD-008',
    nombre: "Crema Whip Topping Base Rich's 1L",
    categoria: 'Panificación y Pastelería',
    isColdChain: true,
    expectedQty: 48,
    expectedBoxes: 4,
    cajaSize: 12,
    driverQty: 48,
    driverBoxes: 4,
    driverUnits: 0,
    difference: 0,
    differenceType: COUNT_OK_LABEL,
    correctedBoxes: '4',
    correctedUnits: '0',
    selectedType: COUNT_OK_LABEL,
    isConfirmed: true,
    isEditing: false,
  },

  // OT-5109 (Roberto Gómez • Ruta Plan 3000 • Sector Comercial)
  {
    id: 'ot5109-prod005',
    orderId: 'sup-3',
    orderCode: 'OT-5109',
    driverName: 'Roberto Gómez',
    zonaRuta: 'Ruta Plan 3000 • Sector Comercial',
    date: '2026-08-04',
    dateFormatted: 'Ayer, 11:15',
    codigo: 'PROD-005',
    nombre: 'Ketchup Kris Galón 4kg',
    categoria: 'Salsas y Culinarios',
    isColdChain: false,
    expectedQty: 48,
    expectedBoxes: 4,
    cajaSize: 12,
    driverQty: 46,
    driverBoxes: 3,
    driverUnits: 10,
    difference: -2,
    differenceType: 'Diferencia',
    correctedBoxes: '3',
    correctedUnits: '10',
    selectedType: 'Diferencia',
    isConfirmed: false,
    isEditing: true,
  },
  {
    id: 'ot5109-prod021',
    orderId: 'sup-3',
    orderCode: 'OT-5109',
    driverName: 'Roberto Gómez',
    zonaRuta: 'Ruta Plan 3000 • Sector Comercial',
    date: '2026-08-04',
    dateFormatted: 'Ayer, 11:15',
    codigo: 'PROD-021',
    nombre: 'Levadura Fresca Fleischmann 500g',
    categoria: 'Panificación y Pastelería',
    isColdChain: true,
    expectedQty: 60,
    expectedBoxes: 5,
    cajaSize: 12,
    driverQty: 57,
    driverBoxes: 4,
    driverUnits: 9,
    difference: -3,
    differenceType: 'Conteo',
    correctedBoxes: '4',
    correctedUnits: '9',
    selectedType: 'Conteo',
    isConfirmed: false,
    isEditing: true,
  },

  // OT-5011 (Cristhian Macchiavelli • Ruta Equipetrol)
  {
    id: 'ot5011-prod014',
    orderId: 'sup-2',
    orderCode: 'OT-5011',
    driverName: 'Cristhian Macchiavelli',
    zonaRuta: 'Ruta Equipetrol',
    date: '2026-08-01',
    dateFormatted: '01 Ago 12:45',
    codigo: 'PROD-014',
    nombre: 'Polvo para Hornear Kris 1kg',
    categoria: 'Panificación y Pastelería',
    isColdChain: false,
    expectedQty: 120,
    expectedBoxes: 10,
    cajaSize: 12,
    driverQty: 116,
    driverBoxes: 9,
    driverUnits: 8,
    difference: -4,
    differenceType: 'Quiebre',
    correctedBoxes: '9',
    correctedUnits: '8',
    selectedType: 'Quiebre',
    isConfirmed: false,
    isEditing: true,
  },

  // OT-4750 (Cristhian Macchiavelli • Ruta Equipetrol)
  {
    id: 'ot4750-prod033',
    orderId: 'sup-4',
    orderCode: 'OT-4750',
    driverName: 'Cristhian Macchiavelli',
    zonaRuta: 'Ruta Equipetrol',
    date: '2026-07-28',
    dateFormatted: '28 Jul 09:30',
    codigo: 'PROD-033',
    nombre: 'Salsa Barbacoa Kris Galón 4kg',
    categoria: 'Salsas y Culinarios',
    isColdChain: false,
    expectedQty: 36,
    expectedBoxes: 3,
    cajaSize: 12,
    driverQty: 38,
    driverBoxes: 3,
    driverUnits: 2,
    difference: 2,
    differenceType: 'Conteo',
    correctedBoxes: '3',
    correctedUnits: '2',
    selectedType: 'Conteo',
    isConfirmed: false,
    isEditing: true,
  },
];

export interface SemaforoAuditProduct {
  id: string | number;
  codigo: string;
  nombre: string;
  cajaSize: number;
  expectedQty: number;
  isCold: boolean;
  driverBoxes?: number;
  driverUnits?: number;
  driverQty?: number;
  consolidatorQty?: number;
  auditorBoxes?: number;
  auditorUnits?: number;
  auditorQty?: number;
  observation?: string;
}

export interface SemaforoOrderItem {
  id: string;
  orderCode: string;
  driverName: string;
  zonaRuta: string;
  date: string;
  dateFormatted: string;
  totalProducts: number;
  isColdChain: boolean;
  hasDiscrepancy: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  counts: {
    driver: { status: 'COMPLETED'; user: string; time: string };
    consolidator: {
      status: 'COMPLETED' | 'PENDING';
      user?: string;
      time?: string;
    };
    semaphoreAuditor: {
      status: 'COMPLETED' | 'PENDING';
      user?: string;
      time?: string;
    };
  };
  products: SemaforoAuditProduct[];
}

const SEED_SEMAFORO_ORDERS: SemaforoOrderItem[] = [
  {
    id: 'sem-1',
    orderCode: 'OT-4892',
    driverName: 'Cristhian Macchiavelli',
    zonaRuta: 'Ruta Norte • Santa Cruz',
    date: '2026-08-05',
    dateFormatted: 'Hoy, 14:20',
    totalProducts: 5,
    isColdChain: true,
    hasDiscrepancy: true,
    status: 'PENDING',
    counts: {
      driver: {
        status: 'COMPLETED',
        user: 'Cristhian Macchiavelli (Chofer)',
        time: '13:10',
      },
      consolidator: {
        status: 'COMPLETED',
        user: 'Carlos Mendoza (Supervisor)',
        time: '14:20',
      },
      semaphoreAuditor: { status: 'PENDING' },
    },
    products: [
      {
        id: 1,
        codigo: 'PROD-005',
        nombre: 'Ketchup Kris Galón 4kg',
        cajaSize: 12,
        expectedQty: 96,
        isCold: false,
        driverBoxes: 7,
        driverUnits: 9,
        driverQty: 93,
        consolidatorQty: 93,
      },
      {
        id: 2,
        codigo: 'PROD-002',
        nombre: 'Mayonesa Kris Galón 3.8kg',
        cajaSize: 12,
        expectedQty: 144,
        isCold: true,
        driverBoxes: 12,
        driverUnits: 2,
        driverQty: 146,
        consolidatorQty: 146,
      },
      {
        id: 3,
        codigo: 'PROD-001',
        nombre: 'Avena Instantánea Kris Bolsa 500g',
        cajaSize: 12,
        expectedQty: 120,
        isCold: false,
        driverBoxes: 10,
        driverUnits: 0,
        driverQty: 120,
        consolidatorQty: 120,
      },
      {
        id: 4,
        codigo: 'PROD-008',
        nombre: "Crema Whip Topping Base Rich's 1L",
        cajaSize: 12,
        expectedQty: 48,
        isCold: true,
        driverBoxes: 4,
        driverUnits: 0,
        driverQty: 48,
        consolidatorQty: 48,
      },
      {
        id: 5,
        codigo: 'PROD-014',
        nombre: 'Polvo para Hornear Kris 1kg',
        cajaSize: 12,
        expectedQty: 120,
        isCold: false,
        driverBoxes: 10,
        driverUnits: 0,
        driverQty: 120,
        consolidatorQty: 120,
      },
    ],
  },
  {
    id: 'sem-2',
    orderCode: 'OT-5109',
    driverName: 'Roberto Gómez',
    zonaRuta: 'Ruta Plan 3000 • Sector Comercial',
    date: '2026-08-04',
    dateFormatted: 'Ayer, 11:15',
    totalProducts: 5,
    isColdChain: true,
    hasDiscrepancy: true,
    status: 'COMPLETED',
    counts: {
      driver: {
        status: 'COMPLETED',
        user: 'Roberto Gómez (Chofer)',
        time: '10:45',
      },
      consolidator: {
        status: 'COMPLETED',
        user: 'Laura Vargas (Supervisor)',
        time: '11:15',
      },
      semaphoreAuditor: {
        status: 'COMPLETED',
        user: 'Juan Pérez (Auditor)',
        time: '12:00',
      },
    },
    products: [
      {
        id: 1,
        codigo: 'PROD-005',
        nombre: 'Ketchup Kris Galón 4kg',
        cajaSize: 12,
        expectedQty: 48,
        isCold: false,
        driverBoxes: 3,
        driverUnits: 10,
        driverQty: 46,
        consolidatorQty: 46,
        auditorBoxes: 3,
        auditorUnits: 10,
        auditorQty: 46,
        observation: 'Faltante de 2 unidades verificado en rampa',
      },
      {
        id: 2,
        codigo: 'PROD-021',
        nombre: 'Levadura Fresca Fleischmann 500g',
        cajaSize: 12,
        expectedQty: 60,
        isCold: true,
        driverBoxes: 4,
        driverUnits: 9,
        driverQty: 57,
        consolidatorQty: 57,
        auditorBoxes: 4,
        auditorUnits: 9,
        auditorQty: 57,
        observation: 'Faltante de 3 unidades registrado en acta',
      },
      {
        id: 3,
        codigo: 'PROD-001',
        nombre: 'Avena Instantánea Kris Bolsa 500g',
        cajaSize: 12,
        expectedQty: 36,
        isCold: false,
        driverBoxes: 3,
        driverUnits: 0,
        driverQty: 36,
        consolidatorQty: 36,
        auditorBoxes: 3,
        auditorUnits: 0,
        auditorQty: 36,
      },
      {
        id: 4,
        codigo: 'PROD-008',
        nombre: "Crema Whip Topping Base Rich's 1L",
        cajaSize: 12,
        expectedQty: 24,
        isCold: true,
        driverBoxes: 2,
        driverUnits: 0,
        driverQty: 24,
        consolidatorQty: 24,
        auditorBoxes: 2,
        auditorUnits: 0,
        auditorQty: 24,
      },
      {
        id: 5,
        codigo: 'PROD-014',
        nombre: 'Polvo para Hornear Kris 1kg',
        cajaSize: 12,
        expectedQty: 60,
        isCold: false,
        driverBoxes: 5,
        driverUnits: 0,
        driverQty: 60,
        consolidatorQty: 60,
        auditorBoxes: 5,
        auditorUnits: 0,
        auditorQty: 60,
      },
    ],
  },
  {
    id: 'sem-3',
    orderCode: 'OT-5011',
    driverName: 'Cristhian Macchiavelli',
    zonaRuta: 'Ruta Equipetrol',
    date: '2026-08-01',
    dateFormatted: '01 Ago 12:45',
    totalProducts: 5,
    isColdChain: false,
    hasDiscrepancy: false,
    status: 'COMPLETED',
    counts: {
      driver: {
        status: 'COMPLETED',
        user: 'Cristhian Macchiavelli (Chofer)',
        time: '12:00',
      },
      consolidator: {
        status: 'COMPLETED',
        user: 'Carlos Mendoza (Supervisor)',
        time: '12:45',
      },
      semaphoreAuditor: {
        status: 'COMPLETED',
        user: 'Juan Pérez (Auditor)',
        time: '13:30',
      },
    },
    products: [
      {
        id: 1,
        codigo: 'PROD-014',
        nombre: 'Polvo para Hornear Kris 1kg',
        cajaSize: 12,
        expectedQty: 120,
        isCold: false,
        driverBoxes: 10,
        driverUnits: 0,
        driverQty: 120,
        consolidatorQty: 120,
        auditorBoxes: 10,
        auditorUnits: 0,
        auditorQty: 120,
      },
      {
        id: 2,
        codigo: 'PROD-005',
        nombre: 'Ketchup Kris Galón 4kg',
        cajaSize: 12,
        expectedQty: 60,
        isCold: false,
        driverBoxes: 5,
        driverUnits: 0,
        driverQty: 60,
        consolidatorQty: 60,
        auditorBoxes: 5,
        auditorUnits: 0,
        auditorQty: 60,
      },
      {
        id: 3,
        codigo: 'PROD-002',
        nombre: 'Mayonesa Kris Galón 3.8kg',
        cajaSize: 12,
        expectedQty: 84,
        isCold: true,
        driverBoxes: 7,
        driverUnits: 0,
        driverQty: 84,
        consolidatorQty: 84,
        auditorBoxes: 7,
        auditorUnits: 0,
        auditorQty: 84,
      },
      {
        id: 4,
        codigo: 'PROD-001',
        nombre: 'Avena Instantánea Kris Bolsa 500g',
        cajaSize: 12,
        expectedQty: 48,
        isCold: false,
        driverBoxes: 4,
        driverUnits: 0,
        driverQty: 48,
        consolidatorQty: 48,
        auditorBoxes: 4,
        auditorUnits: 0,
        auditorQty: 48,
      },
      {
        id: 5,
        codigo: 'PROD-033',
        nombre: 'Salsa Barbacoa Kris Galón 4kg',
        cajaSize: 12,
        expectedQty: 24,
        isCold: false,
        driverBoxes: 2,
        driverUnits: 0,
        driverQty: 24,
        consolidatorQty: 24,
        auditorBoxes: 2,
        auditorUnits: 0,
        auditorQty: 24,
      },
    ],
  },
  {
    id: 'sem-4',
    orderCode: 'OT-4750',
    driverName: 'Cristhian Macchiavelli',
    zonaRuta: 'Ruta Equipetrol',
    date: '2026-07-28',
    dateFormatted: '28 Jul 09:30',
    totalProducts: 3,
    isColdChain: false,
    hasDiscrepancy: true,
    status: 'PENDING',
    counts: {
      driver: {
        status: 'COMPLETED',
        user: 'Cristhian Macchiavelli (Chofer)',
        time: '09:00',
      },
      consolidator: { status: 'PENDING' },
      semaphoreAuditor: { status: 'PENDING' },
    },
    products: [
      {
        id: 1,
        codigo: 'PROD-033',
        nombre: 'Salsa Barbacoa Kris Galón 4kg',
        cajaSize: 12,
        expectedQty: 36,
        isCold: false,
        driverBoxes: 3,
        driverUnits: 2,
        driverQty: 38,
      },
      {
        id: 2,
        codigo: 'PROD-001',
        nombre: 'Avena Instantánea Kris Bolsa 500g',
        cajaSize: 12,
        expectedQty: 24,
        isCold: false,
        driverBoxes: 2,
        driverUnits: 0,
        driverQty: 24,
      },
      {
        id: 3,
        codigo: 'PROD-005',
        nombre: 'Ketchup Kris Galón 4kg',
        cajaSize: 12,
        expectedQty: 48,
        isCold: false,
        driverBoxes: 4,
        driverUnits: 0,
        driverQty: 48,
      },
    ],
  },
];

interface SupervisorStoreState {
  activeOrderCode: string;
  items: SupervisorDiscrepancyItem[];

  activeSemaforoId: string;
  semaforoOrders: SemaforoOrderItem[];

  setActiveOrderCode: (orderCode: string) => void;
  setCorrection: (itemId: string, boxes: string, units: string) => void;
  setExpected: (itemId: string) => void;
  confirmItem: (
    itemId: string,
    selectedType: string,
    correction?: { cajas: string; unidades: string }
  ) => void;
  setEditing: (itemId: string, isEditing: boolean) => void;
  consolidateOrder: (orderCode: string) => void;

  setActiveSemaforoId: (id: string) => void;
  completeSemaforoAudit: (
    orderId: string,
    auditedProducts: {
      codigo: string;
      numCajas: number;
      numUnidades: number;
      totalContado: number;
    }[],
    observations: Record<string, string>
  ) => void;

  resetAll: () => void;
}

export const useSupervisorStore = create<SupervisorStoreState>((set) => ({
  activeOrderCode: 'OT-4892',
  items: SEED_ITEMS,

  activeSemaforoId: 'sem-1',
  semaforoOrders: SEED_SEMAFORO_ORDERS,

  setActiveOrderCode: (orderCode) => set({ activeOrderCode: orderCode }),

  setCorrection: (itemId, boxes, units) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          correctedBoxes: boxes,
          correctedUnits: units,
        };
      }),
    })),

  setExpected: (itemId) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== itemId) return item;
        const looseExpected = item.expectedQty - item.expectedBoxes * item.cajaSize;
        return {
          ...item,
          correctedBoxes: item.expectedBoxes.toString(),
          correctedUnits: looseExpected.toString(),
        };
      }),
    })),

  confirmItem: (itemId, selectedType, correction) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== itemId) return item;
        const boxes = correction ? correction.cajas : item.correctedBoxes;
        const units = correction ? correction.unidades : item.correctedUnits;
        return {
          ...item,
          correctedBoxes: boxes,
          correctedUnits: units,
          selectedType,
          isConfirmed: true,
          isEditing: false,
        };
      }),
    })),

  setEditing: (itemId, isEditing) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          isEditing,
        };
      }),
    })),

  consolidateOrder: (orderCode) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.orderCode !== orderCode) return item;
        return {
          ...item,
          isConfirmed: true,
          isEditing: false,
        };
      }),
    })),

  setActiveSemaforoId: (id) => set({ activeSemaforoId: id }),

  completeSemaforoAudit: (orderId, auditedProducts, observations) =>
    set((state) => ({
      semaforoOrders: state.semaforoOrders.map((order) => {
        if (order.id !== orderId) return order;
        const updatedProducts = order.products.map((p) => {
          const audited = auditedProducts.find((a) => a.codigo === p.codigo);
          return {
            ...p,
            auditorBoxes: audited ? audited.numCajas : p.auditorBoxes,
            auditorUnits: audited ? audited.numUnidades : p.auditorUnits,
            auditorQty: audited ? audited.totalContado : p.auditorQty,
            observation: observations[p.codigo] || p.observation,
          };
        });

        return {
          ...order,
          status: 'COMPLETED' as const,
          counts: {
            ...order.counts,
            semaphoreAuditor: {
              status: 'COMPLETED' as const,
              user: 'Juan Pérez (Auditor)',
              time: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          },
          products: updatedProducts,
        };
      }),
    })),

  resetAll: () =>
    set({
      items: SEED_ITEMS,
      activeOrderCode: 'OT-4892',
      activeSemaforoId: 'sem-1',
      semaforoOrders: SEED_SEMAFORO_ORDERS,
    }),
}));
