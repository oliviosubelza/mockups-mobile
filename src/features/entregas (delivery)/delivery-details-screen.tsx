import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  DollarSign,
  FileSignature,
  FileText,
  Lock,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Snowflake,
  Trash2,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { goBackOrNavigate } from "@/navigation/registry";
import { AppDialog, Badge, Button, type DialogType } from "@/shared/ui";
import { SuccessDialog } from "@/shared/ui/SuccessDialog";
import { Text, useAppTheme } from "@/theme";
import {
  DeliveryActionBar,
  type DeliveryActionBarProps,
} from "./components/DeliveryActionBar";
import { DeliveryProgressHeader } from "./components/DeliveryProgressHeader";
import { PaymentMethodModal } from "./components/PaymentMethodModal";
import { ProductsChecklistModal } from "./components/ProductsChecklistModal";
import { SendInvoiceWhatsAppModal } from "./components/SendInvoiceWhatsAppModal";
import {
  SIGNATURE_INK_COLOR,
  SIGNATURE_PAPER_COLOR,
  SignaturePadModal,
} from "./components/SignaturePadModal";
import { StopReferenceCarousel } from "./components/StopReferenceCarousel";
import {
  addStopReferencePhoto,
  getSelectedStop,
  updateStopStatus,
  useDeliveryStore,
} from "./data/delivery-store";
import { SANTA_CRUZ_STOPS_COORDINATES } from "./data/santa-cruz-route";
import type {
  EstadoEntrega,
  PaymentMethodType,
  StopReferencePhoto,
} from "./types";

type DeliveryItem = {
  id: string;
  codigo: string;
  nombre: string;
  plannedQty: number;
  deliveredQty: number;
  boxes?: number;
  looseUnits?: number;
  unitsPerBox?: number;
  isCold: boolean;
  category?: string;
  unit: string;
  unitPrice?: number;
};

type PaymentMethodOption = {
  method: PaymentMethodType;
  /** Etiqueta corta del selector de metodos. */
  pickerLabel: string;
  /** Titulo del modal de cobro de ese metodo. */
  modalTitle: string;
  icon: LucideIcon;
};

const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  {
    method: "CASH",
    pickerLabel: "1. Efectivo",
    modalTitle: "Cobro en Efectivo",
    icon: Banknote,
  },
  {
    method: "TRANSFER",
    pickerLabel: "2. Transferencia",
    modalTitle: "Transferencia Bancaria",
    icon: Building,
  },
  {
    method: "QR",
    pickerLabel: "3. Pago QR (Banco)",
    modalTitle: "Pago QR (Banco)",
    icon: QrCode,
  },
  {
    method: "CHECK",
    pickerLabel: "4. Cheque",
    modalTitle: "Cobro con Cheque",
    icon: FileText,
  },
];

type PaymentCurrency = "BOB" | "USD";

type PaymentRecord = {
  id: string;
  method: PaymentMethodType;
  /** SIEMPRE el equivalente en bolivianos. Es lo unico que toca el saldo. */
  amount: number;
  /** Moneda en que el cliente entrego el pago. */
  currency: PaymentCurrency;
  /** Monto tal como se entrego fisicamente, en `currency`. */
  originalAmount: number;
  /** Tipo de cambio aplicado. 1 cuando la moneda es BOB. */
  exchangeRate: number;
  reference?: string;
  bank?: string;
  hasPhoto?: boolean;
  isVerified?: boolean;
};

// TIPO DE CAMBIO DE MOCKUP. El boliviano esta anclado oficialmente al dolar, y la
// empresa COMPRA los dolares que recibe, por lo que corresponde la cotizacion de
// compra. En produccion este valor NO se hardcodea: viene de configuracion o de
// SAP, y debe quedar registrado en el pago porque puede cambiar entre entregas.
const USD_TO_BOB_BUY_RATE = 6.86;

const CASH_CURRENCY_OPTIONS: { currency: PaymentCurrency; label: string }[] = [
  { currency: "BOB", label: "Bolivianos (Bs.)" },
  { currency: "USD", label: "Dolares (USD)" },
];

// EL MONTO DEL FORMULARIO DE EFECTIVO SIEMPRE SE EXPRESA EN LA MONEDA ELEGIDA,
// ASI QUE CUALQUIER SIEMBRA QUE VENGA DE UN SALDO EN BOLIVIANOS SE CONVIERTE.
const toCashCurrencyAmount = (
  bobValue: number,
  currency: PaymentCurrency,
): number =>
  currency === "USD"
    ? Math.round((bobValue / USD_TO_BOB_BUY_RATE) * 100) / 100
    : bobValue;

const formatMoney = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(val)) return "0.00";
  return val.toFixed(2);
};

// HORA CORTA (HH:MM) PARA LA CABECERA DE PROGRESO
const formatClockLabel = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

// AJUSTA LOS TRAZOS CAPTURADOS AL RECUADRO DE PREVISUALIZACION DEL POD
// ENCUADRA LA FIRMA GUARDADA. LOS TRAZOS USAN CURVAS CUADRATICAS (M / Q / L), ASI
// QUE NO ALCANZA CON LEER M Y L: SE RECORREN TODOS LOS PARES DE COORDENADAS.
const getSignatureViewBox = (strokePaths: string[]): string => {
  const numberPattern = /-?[\d.]+/g;
  const source = strokePaths.join(" ");
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const coords = source.match(numberPattern) ?? [];
  for (let i = 0; i + 1 < coords.length; i += 2) {
    const x = parseFloat(coords[i]);
    const y = parseFloat(coords[i + 1]);
    if (!isNaN(x) && !isNaN(y)) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (!isFinite(minX) || !isFinite(minY)) return "0 0 100 70";
  const padding = 6;
  const width = Math.max(1, maxX - minX) + padding * 2;
  const height = Math.max(1, maxY - minY) + padding * 2;
  return `${minX - padding} ${minY - padding} ${width} ${height}`;
};

const MOCK_ITEMS: DeliveryItem[] = [
  {
    id: "1",
    codigo: "7790010",
    nombre: "Crema Bettercreme Chocolate 1L",
    plannedQty: 8,
    deliveredQty: 8,
    boxes: 8,
    looseUnits: 0,
    unitsPerBox: 1,
    isCold: true,
    category: "Frío",
    unit: "cajas",
    unitPrice: 280.0,
  },
  {
    id: "2",
    codigo: "7790011",
    nombre: "Crema Bettercreme Vainilla 1L",
    plannedQty: 10,
    deliveredQty: 10,
    boxes: 10,
    looseUnits: 0,
    unitsPerBox: 1,
    isCold: true,
    category: "Frío",
    unit: "cajas",
    unitPrice: 280.0,
  },
  {
    id: "3",
    codigo: "7790020",
    nombre: "Levadura Fresca Fleischmann 500g",
    plannedQty: 24,
    deliveredQty: 24,
    boxes: 2,
    looseUnits: 0,
    unitsPerBox: 12,
    isCold: true,
    category: "Frío",
    unit: "bloques",
    unitPrice: 18.5,
  },
  {
    id: "4",
    codigo: "7790025",
    nombre: "Levadura Seca Instantánea Fleischmann 500g",
    plannedQty: 20,
    deliveredQty: 20,
    boxes: 1,
    looseUnits: 8,
    unitsPerBox: 12,
    isCold: false,
    category: "Panadería",
    unit: "paquetes",
    unitPrice: 28.0,
  },
  {
    id: "5",
    codigo: "7790030",
    nombre: "Polvo de Hornear Royal Lata 1kg",
    plannedQty: 12,
    deliveredQty: 12,
    boxes: 1,
    looseUnits: 0,
    unitsPerBox: 12,
    isCold: false,
    category: "Panadería",
    unit: "latas",
    unitPrice: 42.0,
  },
  {
    id: "6",
    codigo: "7790036",
    nombre: "Crema de Leche Tolón Doypack 1L",
    plannedQty: 12,
    deliveredQty: 12,
    boxes: 1,
    looseUnits: 0,
    unitsPerBox: 12,
    isCold: true,
    category: "Frío",
    unit: "doypacks",
    unitPrice: 34.0,
  },
  {
    id: "7",
    codigo: "7790040",
    nombre: "Ketchup Kris Galón Institucional 4kg",
    plannedQty: 15,
    deliveredQty: 15,
    boxes: 2,
    looseUnits: 3,
    unitsPerBox: 6,
    isCold: false,
    category: "Salsas",
    unit: "galones",
    unitPrice: 95.0,
  },
  {
    id: "8",
    codigo: "7790041",
    nombre: "Ketchup Kris Doypack Económico 1000g",
    plannedQty: 18,
    deliveredQty: 18,
    boxes: 1,
    looseUnits: 6,
    unitsPerBox: 12,
    isCold: false,
    category: "Salsas",
    unit: "doypacks",
    unitPrice: 24.5,
  },
  {
    id: "9",
    codigo: "7790045",
    nombre: "Mayonesa Kris Galón Institucional 3.8kg",
    plannedQty: 10,
    deliveredQty: 10,
    boxes: 1,
    looseUnits: 4,
    unitsPerBox: 6,
    isCold: false,
    category: "Salsas",
    unit: "galones",
    unitPrice: 105.0,
  },
  {
    id: "10",
    codigo: "7790048",
    nombre: "Mayonesa Real Doypack Familiar 900g",
    plannedQty: 24,
    deliveredQty: 24,
    boxes: 2,
    looseUnits: 0,
    unitsPerBox: 12,
    isCold: false,
    category: "Salsas",
    unit: "doypacks",
    unitPrice: 26.0,
  },
  {
    id: "11",
    codigo: "7790050",
    nombre: "Mostaza Kris Galón Institucional 4kg",
    plannedQty: 6,
    deliveredQty: 6,
    isCold: false,
    category: "Salsas",
    unit: "galones",
    unitPrice: 88.0,
  },
  {
    id: "12",
    codigo: "7790055",
    nombre: "Salsa Barbacoa Kris Galón 4kg",
    plannedQty: 5,
    deliveredQty: 5,
    isCold: false,
    category: "Salsas",
    unit: "galones",
    unitPrice: 115.0,
  },
  {
    id: "13",
    codigo: "7790058",
    nombre: "Salsa Golf Kris Galón 3.8kg",
    plannedQty: 4,
    deliveredQty: 4,
    isCold: false,
    category: "Salsas",
    unit: "galones",
    unitPrice: 102.0,
  },
  {
    id: "14",
    codigo: "7790062",
    nombre: "Extracto de Tomate Kris Galón 4kg",
    plannedQty: 8,
    deliveredQty: 8,
    isCold: false,
    category: "Salsas",
    unit: "galones",
    unitPrice: 92.0,
  },
  {
    id: "15",
    codigo: "7790070",
    nombre: "Polvo para Hornear Royal Lata 1kg",
    plannedQty: 12,
    deliveredQty: 12,
    isCold: false,
    category: "Panificación",
    unit: "latas",
    unitPrice: 48.0,
  },
  {
    id: "16",
    codigo: "7790074",
    nombre: "Mejorador de Masa Magimix Pan 500g",
    plannedQty: 10,
    deliveredQty: 10,
    isCold: false,
    category: "Panificación",
    unit: "packs",
    unitPrice: 65.0,
  },
  {
    id: "17",
    codigo: "7790080",
    nombre: "Gelatina Kris Frutilla Caja 1kg",
    plannedQty: 15,
    deliveredQty: 15,
    isCold: false,
    category: "Repostería",
    unit: "cajas",
    unitPrice: 38.0,
  },
  {
    id: "18",
    codigo: "7790082",
    nombre: "Gelatina Kris Piña Caja 1kg",
    plannedQty: 10,
    deliveredQty: 10,
    isCold: false,
    category: "Repostería",
    unit: "cajas",
    unitPrice: 38.0,
  },
  {
    id: "19",
    codigo: "7790088",
    nombre: "Flan Vainilla Kris con Caramelo 1kg",
    plannedQty: 8,
    deliveredQty: 8,
    isCold: false,
    category: "Repostería",
    unit: "cajas",
    unitPrice: 42.0,
  },
  {
    id: "20",
    codigo: "7790092",
    nombre: "Refresco en Polvo Frussion Naranja 1kg",
    plannedQty: 12,
    deliveredQty: 12,
    isCold: false,
    category: "Bebidas",
    unit: "bolsas",
    unitPrice: 32.0,
  },
  {
    id: "21",
    codigo: "7790095",
    nombre: "Refresco en Polvo Frussion Durazno 1kg",
    plannedQty: 10,
    deliveredQty: 10,
    isCold: false,
    category: "Bebidas",
    unit: "bolsas",
    unitPrice: 32.0,
  },
  {
    id: "22",
    codigo: "7790102",
    nombre: "Achocolatado Chocolisto Bolsa 1kg",
    plannedQty: 14,
    deliveredQty: 14,
    isCold: false,
    category: "Bebidas",
    unit: "bolsas",
    unitPrice: 54.0,
  },
  {
    id: "23",
    codigo: "7790110",
    nombre: "Atún en Aceite Vegetal Kris Pack x6",
    plannedQty: 12,
    deliveredQty: 12,
    isCold: false,
    category: "Abarrotes",
    unit: "packs",
    unitPrice: 72.0,
  },
  {
    id: "24",
    codigo: "7790118",
    nombre: "Aceite de Oliva Extra Virgen Real 500ml",
    plannedQty: 16,
    deliveredQty: 16,
    isCold: false,
    category: "Abarrotes",
    unit: "botellas",
    unitPrice: 68.0,
  },
];

export const DeliveryDetailScreen = () => {
  const theme = useAppTheme();

  // OBTENER LA PARADA SELECCIONADA DINÁMICAMENTE DE LA HOJA DE RUTA
  const stop = getSelectedStop();

  // TOTAL DE PARADAS DE LA HOJA DE RUTA, PARA LA CABECERA DE PROGRESO
  const totalStops = useDeliveryStore((state) => state.stops.length);

  // ESTADO LOCAL DE LA PARADA (SOPORTA TRANSIÓN 'EN_ROUTE' / 'PENDING' -> 'ARRIVED')
  const [currentStatus, setCurrentStatus] = useState<EstadoEntrega>(
    stop.status,
  );

  // HORA EN QUE EL CHOFER MARCO LLEGADA. VACIA MIENTRAS NO LLEGO.
  const [arrivedAtLabel, setArrivedAtLabel] = useState<string | undefined>(
    undefined,
  );

  // LA INCIDENCIA SE GUARDA EN LA PARADA Y NO EN EL ESTADO LOCAL,
  // ASI QUE LA CABECERA DE PROGRESO LA TIENE QUE LEER DE AHI.
  const progressStatus: EstadoEntrega =
    stop.status === "INCIDENT" ? "INCIDENT" : currentStatus;

  // LA DIRECCION IMPORTA ANTES DE LLEGAR, NO DESPUES: LA TARJETA NACE
  // EXPANDIDA MIENTRAS EL CHOFER VIAJA Y COLAPSADA CUANDO YA ESTA EN SITIO.
  const [isClientCardExpanded, setIsClientCardExpanded] = useState(
    stop.status === "PENDING" || stop.status === "EN_ROUTE",
  );

  // VALIDACIÓN CLAVE: EL COBRO Y DESCARGA SE HABILITA AL INICIAR LA ENTREGA (ESTADO: ARRIVED O DELIVERED)
  const isPaymentEnabled =
    currentStatus === "ARRIVED" || currentStatus === "DELIVERED";

  // Estado de Productos y Checklist
  const [items, setItems] = useState<DeliveryItem[]>(MOCK_ITEMS);
  const [checkedItemIds, setCheckedItemIds] = useState<string[]>([]);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);

  // CÁLCULO DINÁMICO DEL TOTAL A COBRAR EN BASE A LOS PRODUCTOS MARCADOS (TICKEADOS) POR EL CHOFER
  const TOTAL_ORDER_AMOUNT = useMemo(() => {
    return items
      .filter((item) => checkedItemIds.includes(item.id))
      .reduce(
        (acc, item) => acc + (item.deliveredQty || 0) * (item.unitPrice || 0),
        0,
      );
  }, [items, checkedItemIds]);

  // MONTOS DE FACTURA Y ANTICIPO PROVENIENTES DE LA PARADA
  const invoiceTotal = stop.invoiceTotal ?? 0;
  const advanceAmount = stop.advanceAmount ?? 0;

  // EL ANTICIPO SE APLICA CONTRA LO EFECTIVAMENTE ENTREGADO, NUNCA MAS ALLA DE ESE MONTO.
  // EVITA UN COBRO NEGATIVO CUANDO HAY RECHAZO PARCIAL Y EL ANTICIPO SUPERA LO ENTREGADO.
  const appliedAdvance = Math.min(advanceAmount, TOTAL_ORDER_AMOUNT);
  const remainingAdvance = advanceAmount - appliedAdvance; // credito que queda a favor del cliente
  const netAmountToCollect = Math.max(0, TOTAL_ORDER_AMOUNT - appliedAdvance);
  const isFullyCoveredByAdvance =
    TOTAL_ORDER_AMOUNT > 0 && netAmountToCollect === 0;
  // DATO INCONSISTENTE: el anticipo registrado no puede exceder la factura del punto.
  const hasInvalidAdvance = advanceAmount > invoiceTotal;

  // Tab Principal: 'productos' vs 'cobro'
  const [activeTab, setActiveTab] = useState<"productos" | "cobro">(
    "productos",
  );

  const checkedCount = checkedItemIds.length;
  const pendingCount = items.length - checkedCount;
  const coldCount = useMemo(
    () => items.filter((i) => i.isCold).length,
    [items],
  );

  const totalPlannedUnits = useMemo(
    () => items.reduce((acc, i) => acc + (i.plannedQty || 0), 0),
    [items],
  );

  const verificationPercent =
    items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  const isAllChecked =
    items.length > 0 && checkedItemIds.length === items.length;

  const toggleCheckAll = () => {
    if (isAllChecked) {
      setCheckedItemIds([]);
    } else {
      setCheckedItemIds(items.map((item) => item.id));
    }
  };

  const toggleCheckItem = (id: string) => {
    setCheckedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };
  const [receiverName, setReceiverName] = useState(
    stop.contactName || "Ing. Fernando Roca",
  );
  const [receiverDoc, setReceiverDoc] = useState("4829102 SC");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signaturePaths, setSignaturePaths] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // RESTRICCIONES OBLIGATORIAS PARA PROCEDER AL COBRO:
  // 1. Al menos 1 producto marcado / verificado en el checklist
  // 2. Al menos 1 comprobante POD registrado (foto o firma digital)
  const hasAtLeastOneProductChecked = checkedItemIds.length > 0;
  const hasAtLeastOnePOD = hasPhoto || hasSignature;
  const canProceedToPayment = hasAtLeastOneProductChecked && hasAtLeastOnePOD;

  // Estado del Módulo de Registro de Incidencias
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [incidentCategory, setIncidentCategory] =
    useState<string>("LOCAL_CERRADO");
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false);
  const [incidentNotes, setIncidentNotes] = useState("");
  const [incidentPhoto, setIncidentPhoto] = useState(false);
  const [incidentItemName, setIncidentItemName] =
    useState<string>("Toda la Entrega");

  const incidentCategoriesMap: Record<string, string> = {
    LOCAL_CERRADO: "Local Cerrado / Cliente Ausente",
    PRODUCTO_DANADO: "Mercadería Dañada / Rota",
    FALTANTE: "Faltante de Producto",
    PROBLEMA_COBRO: "Rechazo de Pago / Problema de Cobro",
    RECHAZO_TOTAL: "Rechazo Total del Pedido",
    OTRO: "Otro Motivo",
  };

  const handleSaveIncident = () => {
    stop.status = "INCIDENT";
    setIsIncidentModalOpen(false);
    showDialog(
      "Incidencia Registrada",
      `Se registro la incidencia (${incidentCategoriesMap[incidentCategory] ?? "Incidencia"}) para ${incidentItemName} exitosamente y se notifico a supervision.`,
      "warning",
      () => {
        goBackOrNavigate("entregas.ruta");
      },
    );
  };

  // Estado de Diálogo Personalizado (AppDialog)
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  // Estado del Módulo de Cobro
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethodType>("CASH");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // SELECT DROPDOWN DE MÉTODOS DE PAGO
  const [isSelectMethodOpen, setIsSelectMethodOpen] = useState(false);
  const [methodSelectValue, setMethodSelectValue] = useState<
    PaymentMethodType | ""
  >("");

  const scrollViewRef = useRef<ScrollView>(null);
  const [isHeaderSummaryExpanded, setIsHeaderSummaryExpanded] = useState(false);

  // Formularios de Cobro
  const [cashAmount, setCashAmount] = useState(netAmountToCollect.toString());
  const [cashCurrency, setCashCurrency] = useState<PaymentCurrency>("BOB");
  const [cashReceiptNo, setCashReceiptNo] = useState("REC-00982");
  const [cashPhoto, setCashPhoto] = useState(false);

  const [transferAmount, setTransferAmount] = useState(
    netAmountToCollect.toString(),
  );
  const [transferBank, setTransferBank] = useState(
    "Banco Mercantil Santa Cruz",
  );
  const [transferRef, setTransferRef] = useState("TRX-9948201");
  const [transferPhoto, setTransferPhoto] = useState(false);

  const [checkAmount, setCheckAmount] = useState(netAmountToCollect.toString());
  const [checkBank, setCheckBank] = useState("Banco Nacional de Bolivia (BNB)");
  const [checkNo, setCheckNo] = useState("CHK-449012");
  const [checkHolder, setCheckHolder] = useState(
    stop.clientName || "Cliente Santa Cruz",
  );
  const [checkPhoto, setCheckPhoto] = useState(false);

  // Estado de Pago por QR en tiempo real
  const [qrAmount, setQrAmount] = useState(netAmountToCollect.toString());
  const [qrStep, setQrStep] = useState<"INPUT" | "GENERATING" | "WAITING" | "CONFIRMED">("INPUT");
  const qrTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current);
    };
  }, []);

  // Referencias visuales del punto de entrega
  const [stopPhotos, setStopPhotos] = useState<StopReferencePhoto[]>(
    stop.referencePhotos || [],
  );

  const handleAddReferencePhoto = (newPhoto: StopReferencePhoto) => {
    setStopPhotos((prev) => [...prev, newPhoto]);
    addStopReferencePhoto(stop.id, newPhoto);
    showDialog(
      "Foto de Referencia Guardada",
      `Se agregó la foto de "${newPhoto.tag}" para el punto de entrega de ${stop.clientName}.`,
      "success",
    );
  };

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // CÁLCULOS DINÁMICOS DE SALDO PENDIENTE Y COBRADO DIRECTO
  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const unallocatedBalance = Math.max(0, netAmountToCollect - totalPaid);
  const pendingBalance = unallocatedBalance;
  const validatedProgressAmount = totalPaid;
  const validatedProgressPercent =
    netAmountToCollect > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((totalPaid / netAmountToCollect) * 100)),
        )
      : isFullyCoveredByAdvance
        ? 100
        : 0;

  const showDialog = (
    title: string,
    message: string,
    type: DialogType = "info",
    onConfirm?: () => void,
  ) => {
    setDialogConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm,
    });
  };

  const backToList = () => {
    goBackOrNavigate("entregas.ruta");
  };

  const handleCall = () => {
    Linking.openURL(`tel:${stop.contactPhone}`);
  };

  const handleOpenGoogleMaps = () => {
    // Ubicación actual del chofer (GPS)
    const driverLat = -17.805;
    const driverLng = -63.201;

    // Ubicación de la parada destino elegida
    const destCoords = SANTA_CRUZ_STOPS_COORDINATES[stop.sequence] || {
      latitude: -17.768,
      longitude: -63.195,
    };

    const url = `https://www.google.com/maps/dir/?api=1&origin=${driverLat},${driverLng}&destination=${destCoords.latitude},${destCoords.longitude}&travelmode=driving`;
    Linking.openURL(url);
  };

  const handleStartEnRoute = () => {
    setCurrentStatus("EN_ROUTE");
    stop.status = "EN_ROUTE";
    showDialog(
      "En Camino",
      `Has iniciado el trayecto hacia ${stop.clientName}. El estado de la entrega cambio a "En Camino".`,
      "info",
    );
  };

  const handleMarkArrived = () => {
    setCurrentStatus("ARRIVED");
    stop.status = "ARRIVED";
    setArrivedAtLabel(formatClockLabel(new Date()));
    // YA EN SITIO LA DIRECCION DEJA DE SER LO IMPORTANTE: SE CEDE LA ALTURA
    // A LOS PRODUCTOS Y AL COBRO.
    setIsClientCardExpanded(false);
    showDialog(
      "Llegada Marcada",
      `Has marcado llegada a la parada de ${stop.clientName}. Estado: "En Descarga". Ya puedes verificar los productos a descargar y procesar el cobro.`,
      "success",
    );
  };

  const handleSimulatePhoto = () => {
    setHasPhoto(true);
    showDialog(
      "Foto Capturada",
      "Se adjunto el comprobante fotografico de entrega (POD).",
      "success",
    );
  };

  const handleOpenSignaturePad = () => {
    setIsSignatureModalOpen(true);
  };

  const handleConfirmSignature = (signature: {
    paths: string[];
    strokeCount: number;
  }) => {
    setSignaturePaths(signature.paths);
    setHasSignature(true);
    setIsSignatureModalOpen(false);
    showDialog(
      "Firma Registrada",
      "Firma digital de recepcion guardada correctamente.",
      "success",
    );
  };

  const handleRedoSignature = () => {
    setSignaturePaths([]);
    setHasSignature(false);
    setIsSignatureModalOpen(true);
  };

  const handleSelectTab = (tab: "productos" | "cobro") => {
    if (tab === "cobro") {
      if (!isPaymentEnabled) {
        showDialog(
          "Cobro Deshabilitado",
          `El registro de cobro solo está permitido para la parada en sitio donde se encuentra el chofer (Estado: En Descarga).\n\nEsta parada se encuentra actualmente en estado: ${getStatusLabel(stop.status)}.`,
          "warning",
        );
        return;
      }

      if (!hasAtLeastOneProductChecked) {
        showDialog(
          "Productos Requeridos",
          "Debes marcar al menos un producto verificado en el checklist de carga antes de proceder a la fase de cobro.",
          "warning",
          () => {
            setIsProductsModalOpen(true);
          },
        );
        return;
      }

      if (!hasAtLeastOnePOD) {
        showDialog(
          "Comprobante POD Requerido",
          "Debes registrar al menos un comprobante de entrega (evidencia fotográfica o firma digital del receptor) antes de proceder a la fase de cobro.",
          "warning",
        );
        return;
      }
    }
    setActiveTab(tab);
  };

  const getStatusLabel = (st?: EstadoEntrega) => {
    switch (st) {
      case "ARRIVED":
        return "En Descarga";
      case "DELIVERED":
        return "Entregado";
      case "INCIDENT":
        return "Incidencia";
      case "EN_ROUTE":
        return "En Camino";
      case "PENDING":
      default:
        return "Pendiente";
    }
  };

  const getStatusTone = (st?: EstadoEntrega) => {
    switch (st) {
      case "ARRIVED":
        return "primary";
      case "DELIVERED":
        return "success";
      case "INCIDENT":
        return "danger";
      case "EN_ROUTE":
      case "PENDING":
      default:
        return "neutral";
    }
  };

  // BLOQUEO DE COBRO CUANDO EL ANTICIPO CUBRE TODA LA ENTREGA
  const blockChargeIfCoveredByAdvance = (): boolean => {
    if (!isFullyCoveredByAdvance) return false;
    showDialog(
      "Sin Monto por Cobrar",
      "Esta entrega queda cubierta por el anticipo. No corresponde cobro en sitio.",
      "info",
    );
    return true;
  };

  // SELECCIONAR UN METODO ABRE SU FORMULARIO EN LA HOJA INFERIOR.
  const handleSelectPaymentMethod = (method: PaymentMethodType) => {
    if (blockChargeIfCoveredByAdvance()) return;
    const seededAmount =
      unallocatedBalance > 0 ? unallocatedBalance.toString() : "";
    if (method === "CASH") {
      setCashAmount(
        unallocatedBalance > 0
          ? toCashCurrencyAmount(unallocatedBalance, cashCurrency).toString()
          : "",
      );
    }
    if (method === "TRANSFER") setTransferAmount(seededAmount);
    if (method === "CHECK") setCheckAmount(seededAmount);
    if (method === "QR") {
      setQrAmount(seededAmount);
      setQrStep("INPUT");
    }
    setSelectedMethod(method);
    setIsPaymentModalOpen(true);
    setIsSelectMethodOpen(false);
  };

  // INICIAR FLUJO DE COBRO POR QR EN TIEMPO REAL
  const handleStartQrFlow = () => {
    if (blockChargeIfCoveredByAdvance()) return;
    const amt = parseFloat(qrAmount);
    if (isNaN(amt) || amt <= 0) {
      showDialog(
        "Monto Inválido",
        "Ingresa un monto válido a cobrar por QR.",
        "danger",
      );
      return;
    }

    if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current);
    setQrStep("GENERATING");

    // 1. Simulación de conexión y generación bancaria (1.2s)
    qrTimeoutRef.current = setTimeout(() => {
      setQrStep("WAITING");

      // 2. Simulación de detección automática de pago en tiempo real (3.5s)
      qrTimeoutRef.current = setTimeout(() => {
        setQrStep("CONFIRMED");

        // 3. Confirmación visual y guardado automático (1.3s)
        qrTimeoutRef.current = setTimeout(() => {
          const newPayment: PaymentRecord = {
            id: Date.now().toString(),
            method: "QR",
            amount: amt,
            currency: "BOB",
            originalAmount: amt,
            exchangeRate: 1,
            reference: `QR-BCO-${Math.floor(100000 + Math.random() * 900000)}`,
            isVerified: true,
          };
          setPayments((prev) => [...prev, newPayment]);
          setIsPaymentModalOpen(false);
          setMethodSelectValue("");
          setQrStep("INPUT");
        }, 1300);
      }, 3500);
    }, 1200);
  };

  const handleClosePaymentModal = () => {
    if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current);
    setIsPaymentModalOpen(false);
    setQrStep("INPUT");
    setMethodSelectValue("");
  };

  // REGISTRAR Y VALIDAR EFECTIVO DIRECTO (1 SOLO FLUJO)
  const handleAddCashPayment = () => {
    if (blockChargeIfCoveredByAdvance()) return;
    const originalAmount = parseFloat(cashAmount);
    if (isNaN(originalAmount) || originalAmount <= 0) {
      showDialog(
        "Monto Invalido",
        "Ingresa un monto valido para el cobro en efectivo.",
        "danger",
      );
      return;
    }
    const rate = cashCurrency === "USD" ? USD_TO_BOB_BUY_RATE : 1;
    const bobAmount = Math.round(originalAmount * rate * 100) / 100;
    const paidCurrency = cashCurrency;
    const newPayment: PaymentRecord = {
      id: Date.now().toString(),
      method: "CASH",
      amount: bobAmount,
      currency: paidCurrency,
      originalAmount,
      exchangeRate: rate,
      reference: cashReceiptNo || "Recibo Manual",
      hasPhoto: false,
      isVerified: true,
    };
    setPayments((prev) => [...prev, newPayment]);
    setIsPaymentModalOpen(false);
    setMethodSelectValue("");
  };

  // REGISTRAR Y VALIDAR TRANSFERENCIA DIRECTO (1 SOLO FLUJO)
  const handleAddTransferPayment = () => {
    if (blockChargeIfCoveredByAdvance()) return;
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      showDialog(
        "Monto Invalido",
        "Ingresa un monto valido para la transferencia.",
        "danger",
      );
      return;
    }
    if (!transferPhoto) {
      showDialog(
        "Comprobante Requerido",
        "Por favor toma la foto del comprobante de transferencia.",
        "warning",
      );
      return;
    }
    const newPayment: PaymentRecord = {
      id: Date.now().toString(),
      method: "TRANSFER",
      amount: amt,
      currency: "BOB",
      originalAmount: amt,
      exchangeRate: 1,
      bank: transferBank,
      reference: transferRef,
      hasPhoto: true,
      isVerified: true,
    };
    setPayments((prev) => [...prev, newPayment]);
    setIsPaymentModalOpen(false);
    setMethodSelectValue("");
  };

  // REGISTRAR Y VALIDAR CHEQUE DIRECTO (1 SOLO FLUJO)
  const handleAddCheckPayment = () => {
    if (blockChargeIfCoveredByAdvance()) return;
    const amt = parseFloat(checkAmount);
    if (isNaN(amt) || amt <= 0) {
      showDialog(
        "Monto Invalido",
        "Ingresa un monto valido para el cheque.",
        "danger",
      );
      return;
    }
    if (!checkPhoto) {
      showDialog(
        "Foto Requerida",
        "Por favor captura la foto del cheque (frente y dorso).",
        "warning",
      );
      return;
    }
    const newPayment: PaymentRecord = {
      id: Date.now().toString(),
      method: "CHECK",
      amount: amt,
      currency: "BOB",
      originalAmount: amt,
      exchangeRate: 1,
      bank: checkBank,
      reference: `Cheque #${checkNo}`,
      hasPhoto: true,
      isVerified: true,
    };
    setPayments((prev) => [...prev, newPayment]);
    setIsPaymentModalOpen(false);
    setMethodSelectValue("");
  };

  // QUITAR UN PAGO YA PROCESADO DE LA LISTA DEFINITIVA
  const handleRemovePayment = (id: string) => {
    const newPayments = payments.filter((p) => p.id !== id);
    setPayments(newPayments);
  };

  const handleConfirmFinalDelivery = () => {
    if (!hasAtLeastOneProductChecked) {
      showDialog(
        "Verificación Requerida",
        "Debes marcar al menos un producto verificado en el checklist antes de finalizar la entrega.",
        "warning",
        () => {
          setActiveTab("productos");
        },
      );
      return;
    }
    if (!hasAtLeastOnePOD) {
      showDialog(
        "POD Requerido",
        "Registra la foto o firma de recepción en el tab de Productos.",
        "warning",
        () => {
          setActiveTab("productos");
        },
      );
      return;
    }
    if (pendingBalance > 0) {
      showDialog(
        "Saldo Pendiente",
        `Aun hay un saldo pendiente de Bs. ${formatMoney(pendingBalance)}. Registra el cobro completo en el tab de Cobro.`,
        "warning",
        () => {
          setActiveTab("cobro");
        },
      );
      return;
    }
    stop.status = "DELIVERED";
    setCurrentStatus("DELIVERED");
    updateStopStatus(stop.id, "DELIVERED");
    setShowSuccess(true);
  };

  // ESTILOS COMPARTIDOS DE LOS CAMPOS DE COBRO
  const quickFillChipStyle: ViewStyle = {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  };
  const quickFillLabelStyle: TextStyle = {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.primary,
  };
  const fieldInputStyle: TextStyle = {
    backgroundColor: theme.colors.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.foreground,
  };
  const amountInputStyle: TextStyle = {
    ...fieldInputStyle,
    fontSize: 15,
    fontWeight: "700",
  };

  // CAMPO DE MONTO CON LOS ATAJOS DE RELLENO RAPIDO (50% / SALDO PENDIENTE)
  const renderAmountField = (config: {
    label: string;
    value: string;
    onChangeText: (val: string) => void;
    onHalf: () => void;
    onPending: () => void;
  }) => (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <Text variant="label" style={{ fontSize: 13 }}>
          {config.label}
        </Text>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <TouchableOpacity onPress={config.onHalf} style={quickFillChipStyle}>
            <Text style={quickFillLabelStyle}>50%</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={config.onPending}
            style={quickFillChipStyle}
          >
            <Text style={quickFillLabelStyle}>Saldo Pend.</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TextInput
        value={config.value}
        onChangeText={config.onChangeText}
        keyboardType="numeric"
        style={amountInputStyle}
      />
    </View>
  );

  // CAMPO DE TEXTO SIMPLE DE LOS FORMULARIOS DE COBRO
  const renderTextField = (config: {
    label: string;
    value: string;
    onChangeText: (val: string) => void;
  }) => (
    <View>
      <Text variant="label" style={{ marginBottom: 4, fontSize: 13 }}>
        {config.label}
      </Text>
      <TextInput
        value={config.value}
        onChangeText={config.onChangeText}
        style={fieldInputStyle}
      />
    </View>
  );

  // ADJUNTO FOTOGRAFICO REQUERIDO (COMPROBANTE / CHEQUE)
  const renderPhotoField = (config: {
    attached: boolean;
    attachedLabel: string;
    pendingLabel: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={config.onPress}
      style={{
        backgroundColor: config.attached
          ? theme.colors.successSoft
          : theme.colors.secondary,
        borderWidth: 1,
        borderColor: config.attached
          ? theme.colors.success
          : theme.colors.border,
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <Camera
        size={16}
        color={
          config.attached ? theme.colors.success : theme.colors.mutedForeground
        }
      />
      <Text
        variant="label"
        style={{
          fontSize: 12,
          color: config.attached
            ? theme.colors.success
            : theme.colors.foreground,
        }}
      >
        {config.attached ? config.attachedLabel : config.pendingLabel}
      </Text>
    </TouchableOpacity>
  );

  // CHIP COMPACTO DE CONFORMIDAD (FIRMA / FOTO) CON SU ESTADO CAPTURADO O PENDIENTE
  const renderConformityChip = (config: {
    label: string;
    icon: LucideIcon;
    captured: boolean;
    onPress: () => void;
  }) => {
    const ChipIcon = config.icon;
    return (
      <TouchableOpacity
        onPress={config.onPress}
        activeOpacity={0.8}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: config.captured
            ? theme.colors.success
            : theme.colors.border,
          backgroundColor: config.captured
            ? theme.colors.successSoft
            : theme.colors.secondary,
        }}
      >
        <ChipIcon
          size={16}
          color={
            config.captured
              ? theme.colors.success
              : theme.colors.mutedForeground
          }
        />
        <Text
          variant="label"
          style={{
            fontSize: 12,
            color: config.captured
              ? theme.colors.success
              : theme.colors.foreground,
          }}
        >
          {config.label}
        </Text>
        <Text
          variant="caption"
          style={{
            fontSize: 11,
            color: config.captured
              ? theme.colors.success
              : theme.colors.mutedForeground,
          }}
        >
          {config.captured ? "Capturada" : "Pendiente"}
        </Text>
      </TouchableOpacity>
    );
  };

  // CAMBIAR DE MONEDA NO REINTERPRETA LA CIFRA YA TIPEADA: UN MONTO EN UNA
  // MONEDA NO SIGNIFICA NADA EN LA OTRA, ASI QUE SE RESIEMBRA EL SALDO
  // PENDIENTE CONVERTIDO A LA MONEDA RECIEN ELEGIDA.
  const handleSelectCashCurrency = (currency: PaymentCurrency) => {
    if (currency === cashCurrency) return;
    setCashCurrency(currency);
    setCashAmount(toCashCurrencyAmount(pendingBalance, currency).toString());
  };

  // LINEA DE CONVERSION DEL EFECTIVO EN DOLARES. QUEDA VACIA MIENTRAS LO
  // TIPEADO NO SEA UN NUMERO UTIL, PARA NO MOSTRAR NaN EN PANTALLA.
  const cashConversionLabel = (() => {
    if (cashCurrency !== "USD") return "";
    const typedAmount = parseFloat(cashAmount);
    if (isNaN(typedAmount) || typedAmount <= 0) return "";
    const bobAmount = Math.round(typedAmount * USD_TO_BOB_BUY_RATE * 100) / 100;
    return `USD ${formatMoney(typedAmount)} x ${USD_TO_BOB_BUY_RATE} = Bs. ${formatMoney(bobAmount)}`;
  })();

  // 1. EFECTIVO
  const renderCashForm = () => (
    <View style={{ gap: 10 }}>
      {/* MONEDA DEL EFECTIVO: SUB-ELECCION DEL MONTO, NO UNA ACCION PRINCIPAL */}
      <View>
        <Text variant="label" style={{ marginBottom: 4, fontSize: 13 }}>
          Moneda
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {CASH_CURRENCY_OPTIONS.map((option) => {
            const isSelected = cashCurrency === option.currency;
            return (
              <TouchableOpacity
                key={option.currency}
                onPress={() => handleSelectCashCurrency(option.currency)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 7,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.border,
                  backgroundColor: isSelected
                    ? theme.colors.primarySoft
                    : theme.colors.secondary,
                }}
              >
                <Text
                  variant="label"
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? "700" : "500",
                    color: isSelected
                      ? theme.colors.primary
                      : theme.colors.foreground,
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* MONTO EN LA MONEDA ELEGIDA, CON SU EQUIVALENTE EN BOLIVIANOS DEBAJO */}
      <View style={{ gap: 4 }}>
        {renderAmountField({
          label: `Monto en Efectivo Recibido (${cashCurrency === "USD" ? "USD" : "Bs."})`,
          value: cashAmount,
          onChangeText: setCashAmount,
          onHalf: () =>
            setCashAmount(
              toCashCurrencyAmount(
                netAmountToCollect / 2,
                cashCurrency,
              ).toString(),
            ),
          onPending: () =>
            setCashAmount(
              toCashCurrencyAmount(pendingBalance, cashCurrency).toString(),
            ),
        })}
        {cashConversionLabel ? (
          <Text
            variant="caption"
            style={{
              fontSize: 11,
              color: theme.colors.mutedForeground,
              fontVariant: ["tabular-nums"],
            }}
          >
            {cashConversionLabel}
          </Text>
        ) : null}
      </View>

      {renderTextField({
        label: "Nro. de Recibo / Nota Manual",
        value: cashReceiptNo,
        onChangeText: setCashReceiptNo,
      })}
    </View>
  );

  // 2. TRANSFERENCIA BANCARIA
  const renderTransferForm = () => (
    <View style={{ gap: 10 }}>
      {renderAmountField({
        label: "Monto Transferido (Bs.)",
        value: transferAmount,
        onChangeText: setTransferAmount,
        onHalf: () => setTransferAmount((netAmountToCollect / 2).toString()),
        onPending: () => setTransferAmount(pendingBalance.toString()),
      })}
      {renderTextField({
        label: "Banco Origen",
        value: transferBank,
        onChangeText: setTransferBank,
      })}
      {renderTextField({
        label: "Nro. de Transaccion / Referencia",
        value: transferRef,
        onChangeText: setTransferRef,
      })}
      {renderPhotoField({
        attached: transferPhoto,
        attachedLabel: "Foto Comprobante Adjunta",
        pendingLabel: "Tomar Foto Comprobante (Requerido)",
        onPress: () => {
          setTransferPhoto(true);
          showDialog(
            "Comprobante Adjunto",
            "Foto del comprobante bancario guardada.",
            "success",
          );
        },
      })}
    </View>
  );

  // 3. PAGO POR QR EN TIEMPO REAL
  const renderQrForm = () => {
    const amt = parseFloat(qrAmount) || unallocatedBalance;

    if (qrStep === "GENERATING") {
      return (
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 32,
            gap: 14,
          }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text variant="title" style={{ fontSize: 16, fontWeight: "700" }}>
              Generando Cobro QR...
            </Text>
            <Text
              variant="caption"
              style={{
                color: theme.colors.mutedForeground,
                textAlign: "center",
                fontSize: 12,
                paddingHorizontal: 20,
              }}
            >
              Conectando con la pasarela bancaria para emitir el código interoperable...
            </Text>
          </View>
        </View>
      );
    }

    if (qrStep === "WAITING") {
      return (
        <View style={{ alignItems: "center", gap: 12, paddingVertical: 2 }}>
          {/* MONTO DESTACADO A COBRAR */}
          <View style={{ alignItems: "center", gap: 1 }}>
            <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
              Monto a Pagar por QR
            </Text>
            <Text
              variant="header"
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: theme.colors.primary,
                fontVariant: ["tabular-nums"],
              }}
            >
              Bs. {formatMoney(amt)}
            </Text>
          </View>

          {/* CÓDIGO QR GENERADO */}
          <View
            style={{
              backgroundColor: "#ffffff",
              padding: 12,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: theme.colors.primary,
              alignItems: "center",
              justifyContent: "center",
              elevation: 4,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
            }}
          >
            <View
              style={{
                width: 140,
                height: 140,
                backgroundColor: "#0f172a",
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <QrCode size={110} color="#ffffff" />
            </View>
          </View>

          {/* RADAR DE ESCUCHA ACTIVA EN TIEMPO REAL */}
          <View
            style={{
              backgroundColor: theme.colors.primarySoft,
              borderRadius: 10,
              paddingVertical: 9,
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: theme.colors.primary + "30",
              alignSelf: "stretch",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text
              variant="label"
              style={{
                fontSize: 12,
                color: theme.colors.primary,
                fontWeight: "700",
              }}
            >
              Esperando confirmación del banco en tiempo real...
            </Text>
          </View>

          <Text
            variant="caption"
            style={{
              color: theme.colors.mutedForeground,
              textAlign: "center",
              fontSize: 11,
              paddingHorizontal: 16,
            }}
          >
            Muestra el código al cliente. Al transferir, el sistema lo detectará automáticamente.
          </Text>
        </View>
      );
    }

    if (qrStep === "CONFIRMED") {
      return (
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 24,
            gap: 12,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: theme.colors.successSoft,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: theme.colors.success,
            }}
          >
            <CheckCircle2 size={38} color={theme.colors.success} />
          </View>

          <View style={{ alignItems: "center", gap: 3 }}>
            <Text
              variant="header"
              style={{ fontSize: 18, fontWeight: "800", color: theme.colors.success }}
            >
              ¡Pago Realizado!
            </Text>
            <Text
              variant="caption"
              style={{
                color: theme.colors.foreground,
                fontWeight: "700",
                fontSize: 13,
                fontVariant: ["tabular-nums"],
              }}
            >
              Monto confirmado: Bs. {formatMoney(amt)}
            </Text>
            <Text
              variant="caption"
              style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
            >
              Comprobante bancario verificado por la pasarela.
            </Text>
          </View>
        </View>
      );
    }

    // ESTADO "INPUT" (POR DEFECTO): DIGITAR MONTO
    return (
      <View style={{ gap: 12, paddingVertical: 4 }}>
        {renderAmountField({
          label: "Monto a Cobrar por QR (Bs.)",
          value: qrAmount,
          onChangeText: (val) => setQrAmount(val),
          onHalf: () => setQrAmount((unallocatedBalance / 2).toString()),
          onPending: () => setQrAmount(unallocatedBalance.toString()),
        })}

        <View
          style={{
            backgroundColor: theme.colors.secondary,
            borderRadius: 12,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <QrCode size={22} color={theme.colors.primary} />
          <Text
            variant="caption"
            style={{
              flex: 1,
              fontSize: 12,
              color: theme.colors.mutedForeground,
              lineHeight: 16,
            }}
          >
            Al presionar <Text style={{ fontWeight: "700", color: theme.colors.foreground }}>Generar QR</Text>, se creará el código de cobro conectado con el banco y se validará en tiempo real.
          </Text>
        </View>
      </View>
    );
  };

  // 4. CHEQUE
  const renderCheckForm = () => (
    <View style={{ gap: 10 }}>
      {renderAmountField({
        label: "Monto del Cheque (Bs.)",
        value: checkAmount,
        onChangeText: setCheckAmount,
        onHalf: () => setCheckAmount((netAmountToCollect / 2).toString()),
        onPending: () => setCheckAmount(pendingBalance.toString()),
      })}
      {renderTextField({
        label: "Banco Emisor",
        value: checkBank,
        onChangeText: setCheckBank,
      })}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          {renderTextField({
            label: "Nro. de Cheque",
            value: checkNo,
            onChangeText: setCheckNo,
          })}
        </View>
        <View style={{ flex: 1 }}>
          {renderTextField({
            label: "Titular / Razon Social",
            value: checkHolder,
            onChangeText: setCheckHolder,
          })}
        </View>
      </View>
      {renderPhotoField({
        attached: checkPhoto,
        attachedLabel: "Foto Cheque Adjunta",
        pendingLabel: "Tomar Foto Cheque (Requerido)",
        onPress: () => {
          setCheckPhoto(true);
          showDialog(
            "Foto Cheque Adjunta",
            "Captura de frente y dorso guardada.",
            "success",
          );
        },
      })}
    </View>
  );

  const renderPaymentForm = () => {
    switch (selectedMethod) {
      case "CASH":
        return renderCashForm();
      case "TRANSFER":
        return renderTransferForm();
      case "QR":
        return renderQrForm();
      case "CHECK":
        return renderCheckForm();
    }
  };

  const activePaymentOption = PAYMENT_METHOD_OPTIONS.find(
    (option) => option.method === selectedMethod,
  );

  // ACCIÓN PRINCIPAL DEL MODAL DE COBRO (NOMBRES CORTOS Y ACCIONABLES)
  const paymentSubmit: {
    label: string;
    icon?: LucideIcon;
    disabled: boolean;
    loading: boolean;
    onPress: () => void;
  } = (() => {
    switch (selectedMethod) {
      case "TRANSFER":
        return {
          label: "Confirmar Transferencia",
          icon: Check,
          disabled: false,
          loading: false,
          onPress: handleAddTransferPayment,
        };
      case "CHECK":
        return {
          label: "Confirmar Cheque",
          icon: Check,
          disabled: false,
          loading: false,
          onPress: handleAddCheckPayment,
        };
      case "QR":
        if (qrStep === "GENERATING") {
          return {
            label: "Generando...",
            icon: RefreshCw,
            disabled: true,
            loading: true,
            onPress: () => {},
          };
        }
        if (qrStep === "WAITING") {
          return {
            label: "Esperando Pago...",
            icon: RefreshCw,
            disabled: true,
            loading: true,
            onPress: () => {},
          };
        }
        if (qrStep === "CONFIRMED") {
          return {
            label: "Pago Realizado",
            icon: CheckCircle2,
            disabled: true,
            loading: false,
            onPress: () => {},
          };
        }
        return {
          label: "Generar QR",
          icon: QrCode,
          disabled: false,
          loading: false,
          onPress: handleStartQrFlow,
        };
      case "CASH":
      default:
        return {
          label: "Confirmar Efectivo",
          icon: Check,
          disabled: false,
          loading: false,
          onPress: handleAddCashPayment,
        };
    }
  })();

  const isPaymentModalLocked =
    selectedMethod === "QR" && (qrStep === "GENERATING" || qrStep === "CONFIRMED");

  // MONTO Y ACCION DE LA BARRA FIJA SEGUN LA FASE DE LA ENTREGA
  const actionBar: DeliveryActionBarProps = (() => {
    if (currentStatus === "DELIVERED") {
      return {
        amountValue: `Bs. ${formatMoney(totalPaid)}`,
        amountLabel: "cobrado",
        actionLabel: "Entrega finalizada",
        actionIcon: CheckCircle2,
        actionDisabled: true,
        tone: "success",
        onAction: () => {},
      };
    }

    if (currentStatus === "PENDING") {
      return {
        amountValue: `Bs. ${formatMoney(invoiceTotal)}`,
        amountLabel: "a facturar",
        actionLabel: "Iniciar viaje",
        actionIcon: Truck,
        onAction: handleStartEnRoute,
      };
    }

    if (currentStatus === "EN_ROUTE") {
      return {
        amountValue: `Bs. ${formatMoney(invoiceTotal)}`,
        amountLabel: "a facturar",
        actionLabel: "Llegue al cliente",
        actionIcon: CheckCircle2,
        onAction: handleMarkArrived,
      };
    }

    // EL ANTICIPO YA CUBRE TODO: NO CORRESPONDE COBRO EN SITIO, SOLO CERRAR.
    if (isFullyCoveredByAdvance) {
      return {
        amountValue: `Bs. ${formatMoney(appliedAdvance)}`,
        amountLabel: "cubierto por anticipo",
        actionLabel: "Finalizar entrega",
        actionIcon: CheckCircle2,
        tone: "success",
        onAction: handleConfirmFinalDelivery,
      };
    }

    if (activeTab === "productos") {
      return {
        amountValue: `Bs. ${formatMoney(netAmountToCollect)}`,
        amountLabel: "por cobrar",
        actionLabel: "Ir al cobro",
        actionIcon: DollarSign,
        onAction: () => handleSelectTab("cobro"),
      };
    }

    if (unallocatedBalance > 0) {
      return {
        amountValue: `Bs. ${formatMoney(unallocatedBalance)}`,
        amountLabel: "por cobrar",
        actionLabel: "Cobrar",
        actionIcon: DollarSign,
        onAction: () => setIsSelectMethodOpen(true),
      };
    }

    if (TOTAL_ORDER_AMOUNT > 0) {
      return {
        amountValue: `Bs. ${formatMoney(totalPaid)}`,
        amountLabel: "cobrado 100%",
        actionLabel: "Finalizar entrega",
        actionIcon: CheckCircle2,
        tone: "success",
        onAction: handleConfirmFinalDelivery,
      };
    }

    // SIN PRODUCTOS TICKEADOS NO HAY MONTO NI ENTREGA QUE FINALIZAR.
    return {
      amountValue: "--",
      amountLabel: "sin productos verificados",
      actionLabel: "Verificar productos",
      actionIcon: Package,
      onAction: () => handleSelectTab("productos"),
    };
  })();

  // ETIQUETA DE AVANCE DEL TAB DE COBRO
  const collectionTabProgressLabel = isFullyCoveredByAdvance
    ? "Cubierto"
    : netAmountToCollect === 0
      ? "--"
      : `Bs. ${formatMoney(totalPaid)} / ${formatMoney(netAmountToCollect)}`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 16 }}
      >
        {/* 0. ESPINA DE PROGRESO DE LA ENTREGA */}
        <DeliveryProgressHeader
          sequence={stop.sequence}
          totalStops={totalStops}
          status={progressStatus}
          arrivedAtLabel={arrivedAtLabel}
        />

            {/* 1. TARJETA PRINCIPAL DINÁMICA DEL CLIENTE SELECCIONADO */}
            <View
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 16,
                gap: 12,
                elevation: 2,
              }}
            >
          {/* ENCABEZADO SIEMPRE VISIBLE CON EL TOGGLE DE COLAPSO */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <View style={{ gap: 2, flex: 1 }}>
              <Text
                variant="caption"
                style={{ color: theme.colors.mutedForeground }}
              >
                PARADA #{stop.sequence} • {stop.deliveryPointId}
              </Text>

              {isClientCardExpanded ? (
                <Text
                  variant="title"
                  style={{ color: theme.colors.foreground, fontSize: 19 }}
                >
                  {stop.clientName}
                </Text>
              ) : (
                /* COLAPSADO: NOMBRE Y DIRECCION EN UNA SOLA LINEA TRUNCADA */
                <Text
                  variant="bodySmall"
                  numberOfLines={1}
                  style={{ fontSize: 13 }}
                >
                  <Text
                    variant="label"
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: theme.colors.foreground,
                    }}
                  >
                    {stop.clientName}
                  </Text>
                  {" • "}
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 12,
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    {stop.address}
                  </Text>
                </Text>
              )}
            </View>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              {isClientCardExpanded ? (
                <Badge
                  label={getStatusLabel(currentStatus)}
                  tone={getStatusTone(currentStatus)}
                  size="md"
                />
              ) : (
                <TouchableOpacity
                  onPress={handleCall}
                  hitSlop={8}
                  style={{ padding: 4 }}
                >
                  <Phone size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setIsClientCardExpanded((prev) => !prev)}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                {isClientCardExpanded ? (
                  <ChevronUp size={18} color={theme.colors.mutedForeground} />
                ) : (
                  <ChevronDown size={18} color={theme.colors.mutedForeground} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* DETALLE EXPANDIDO: DIRECCION, VENTANA DE ENTREGA Y CONTACTO */}
          {isClientCardExpanded && (
            <View style={{ gap: 6, marginTop: 2 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 6,
                }}
              >
                <MapPin
                  size={16}
                  color={theme.colors.mutedForeground}
                  style={{ marginTop: 2 }}
                />
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.foreground, flex: 1 }}
                >
                  {stop.address}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Clock size={14} color={theme.colors.mutedForeground} />
                  <Text
                    variant="caption"
                    style={{ color: theme.colors.mutedForeground }}
                  >
                    Ventana:{" "}
                    <Text variant="label" style={{ fontSize: 12 }}>
                      {stop.deliveryWindow}
                    </Text>
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleCall}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Phone size={14} color={theme.colors.primary} />
                  <Text
                    variant="label"
                    style={{ color: theme.colors.primary, fontSize: 12 }}
                  >
                    {stop.contactPhone}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* AVISOS DE FASE. LA TRANSICIÓN DE ESTADO LA DISPARA LA BARRA FIJA. */}
              {currentStatus === "EN_ROUTE" && (
                <View
                  style={{
                    backgroundColor: theme.colors.primarySoft,
                    padding: 10,
                    borderRadius: 10,
                    gap: 2,
                    marginTop: 4,
                  }}
                >
                  <Text
                    variant="label"
                    style={{ color: theme.colors.primary, fontSize: 12 }}
                  >
                    En camino hacia la ubicación del cliente
                  </Text>
                </View>
              )}

              {currentStatus === "ARRIVED" && (
                <View
                  style={{
                    backgroundColor: "#e0f2fe",
                    padding: 10,
                    borderRadius: 10,
                    gap: 2,
                    marginTop: 4,
                  }}
                >
                  <Text
                    variant="label"
                    style={{ color: "#0284c7", fontSize: 12 }}
                  >
                    Estado: En Descarga / Atención en Sitio
                  </Text>
                  <Text
                    variant="caption"
                    style={{ color: theme.colors.foreground, fontSize: 11 }}
                  >
                    Verifica los productos a descargar, registra el cobro y
                    adjunta la firma o foto de entrega.
                  </Text>
                </View>
              )}

              {/* CARRUSEL DE REFERENCIAS VISUALES (FACHADA, PORTÓN, ACCESO) */}
              <StopReferenceCarousel
                photos={stopPhotos}
                stopName={stop.clientName}
                onAddPhoto={handleAddReferencePhoto}
              />

              <View style={{ marginTop: 2 }}>
                <Button
                  label={stop.contactPhone ? `Llamar (${stop.contactPhone})` : "Llamar al cliente"}
                  icon={Phone}
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onPress={handleCall}
                />
              </View>
            </View>
          )}

          {/* BOTÓN DE ACCIÓN: REPORTAR INCIDENCIA */}
          <Button
            label="Reportar Incidencia"
            icon={AlertTriangle}
            variant="danger"
            size="sm"
            fullWidth
            onPress={() => {
              setIncidentItemName("Toda la Entrega");
              setIsIncidentModalOpen(true);
            }}
          />
        </View>

        {/* BANNER DE ALERTA SI LA PARADA TIENE UNA INCIDENCIA REGISTRADA */}
        {stop.status === "INCIDENT" && (
          <View
            style={{
              backgroundColor: "#fef2f2", // Fondo rojo/rosado muy suave
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: "#fca5a5",
              padding: 14,
              gap: 8,
              elevation: 1,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  backgroundColor: "#fee2e2",
                  padding: 6,
                  borderRadius: 8,
                }}
              >
                <AlertTriangle size={20} color="#dc2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  variant="label"
                  style={{ color: "#991b1b", fontSize: 14, fontWeight: "700" }}
                >
                  Incidencia en el Punto de Entrega
                </Text>
                <Text
                  variant="caption"
                  style={{ color: "#7f1d1d", fontSize: 12 }}
                >
                  Registrado a las 10:15 hs • Reportado por Chofer
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: "#ffffff",
                padding: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#fecaca",
              }}
            >
              <Text variant="bodySmall" style={{ color: "#450a0a" }}>
                <Text variant="label" style={{ color: "#991b1b" }}>
                  Motivo:{" "}
                </Text>
                {/* {stop.incidentReason || ""} */}
                Rechazo parcial por empaque secundario dañado durante el
                trayecto.
              </Text>
            </View>
          </View>
        )}

        {/* 2. DUAL-TAB CONTROL: [PRODUCTOS & POD] vs [REGISTRO DE COBRO] */}
        <View
            style={{
              flexDirection: "row",
              backgroundColor: theme.colors.secondary,
              borderRadius: 12,
              padding: 3,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => handleSelectTab("productos")}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 9,
                backgroundColor:
                  activeTab === "productos"
                    ? theme.colors.cardBackground
                    : "transparent",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                elevation: activeTab === "productos" ? 1 : 0,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Package
                  size={16}
                  color={
                    activeTab === "productos"
                      ? theme.colors.primary
                      : theme.colors.mutedForeground
                  }
                />
                <Text
                  variant="label"
                  style={{
                    fontSize: 13,
                    color:
                      activeTab === "productos"
                        ? theme.colors.primary
                        : theme.colors.mutedForeground,
                    fontWeight: activeTab === "productos" ? "700" : "500",
                  }}
                >
                  Productos & POD
                </Text>
              </View>

              {/* AVANCE DE VERIFICACION DENTRO DEL PROPIO TAB */}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Text
                  variant="caption"
                  style={{
                    fontSize: 11,
                    color: isAllChecked
                      ? theme.colors.success
                      : theme.colors.mutedForeground,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {checkedItemIds.length}/{items.length}
                </Text>
                {isAllChecked && <Check size={12} color={theme.colors.success} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectTab("cobro")}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 9,
                backgroundColor:
                  activeTab === "cobro"
                    ? theme.colors.cardBackground
                    : "transparent",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                opacity: isPaymentEnabled ? (canProceedToPayment ? 1 : 0.8) : 0.5,
                elevation: activeTab === "cobro" ? 1 : 0,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                {isPaymentEnabled && canProceedToPayment ? (
                  <DollarSign
                    size={16}
                    color={
                      activeTab === "cobro"
                        ? theme.colors.primary
                        : theme.colors.mutedForeground
                    }
                  />
                ) : (
                  <Lock size={14} color={theme.colors.mutedForeground} />
                )}
                <Text
                  variant="label"
                  style={{
                    fontSize: 13,
                    color: isPaymentEnabled
                      ? activeTab === "cobro"
                        ? theme.colors.primary
                        : theme.colors.mutedForeground
                      : theme.colors.mutedForeground,
                    fontWeight: activeTab === "cobro" ? "700" : "500",
                  }}
                >
                  Cobro en Sitio
                </Text>
              </View>

              {/* AVANCE DE COBRO DENTRO DEL PROPIO TAB */}
              <Text
                variant="caption"
                numberOfLines={1}
                style={{
                  fontSize: 11,
                  color:
                    isFullyCoveredByAdvance ||
                    (netAmountToCollect > 0 && pendingBalance === 0)
                      ? theme.colors.success
                      : theme.colors.mutedForeground,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {collectionTabProgressLabel}
              </Text>
            </TouchableOpacity>
          </View>

        {/* TAB 1: PRODUCTOS A DESCARGAR Y PROOF OF DELIVERY (POD) */}
        {activeTab === "productos" && (
          <View style={{ gap: 14 }}>
            {/* TARJETA RESUMEN COMPACTA DE PRODUCTOS (OPCIÓN 1: CHECKLIST DEDICADO) */}
            <View
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 16,
                borderWidth: 1,
                borderColor:
                  verificationPercent === 100
                    ? theme.colors.success + "40"
                    : theme.colors.border,
                padding: 16,
                gap: 12,
              }}
            >
              {/* CABECERA: TÍTULO, CANTIDAD TOTAL Y BADGE DE ESTADO */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor:
                        verificationPercent === 100
                          ? theme.colors.successSoft
                          : theme.colors.primarySoft,
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Package
                      size={20}
                      color={
                        verificationPercent === 100
                          ? theme.colors.success
                          : theme.colors.primary
                      }
                    />
                  </View>

                  <View style={{ flex: 1, gap: 2, marginRight: 6 }}>
                    <Text
                      variant="title"
                      style={{ fontSize: 16, color: theme.colors.foreground }}
                      numberOfLines={1}
                    >
                      Productos a Descargar
                    </Text>
                    <Text
                      variant="caption"
                      style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                      numberOfLines={1}
                    >
                      {items.length} productos • {totalPlannedUnits} unid. totales
                    </Text>
                  </View>
                </View>

                {/* BADGE DE ESTADO */}
                <View
                  style={{
                    backgroundColor:
                      verificationPercent === 100
                        ? theme.colors.successSoft
                        : theme.colors.secondary,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor:
                      verificationPercent === 100
                        ? theme.colors.success + "40"
                        : theme.colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  {verificationPercent === 100 ? (
                    <Check size={12} color={theme.colors.success} />
                  ) : null}
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color:
                        verificationPercent === 100
                          ? theme.colors.success
                          : theme.colors.mutedForeground,
                    }}
                  >
                    {verificationPercent === 100
                      ? "Completo"
                      : `${pendingCount} pend.`}
                  </Text>
                </View>
              </View>

              {/* BARRA DE PROGRESO DE VERIFICACIÓN */}
              <View style={{ gap: 5 }}>
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.colors.secondary,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${verificationPercent}%`,
                      backgroundColor:
                        verificationPercent === 100
                          ? theme.colors.success
                          : theme.colors.primary,
                      borderRadius: 3,
                    }}
                  />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color:
                        verificationPercent === 100
                          ? theme.colors.success
                          : theme.colors.foreground,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {checkedCount} de {items.length} ({verificationPercent}%)
                  </Text>

                  <Text
                    variant="caption"
                    style={{
                      fontSize: 11,
                      color: theme.colors.mutedForeground,
                      flexShrink: 0,
                    }}
                    numberOfLines={1}
                  >
                    Subtotal:{" "}
                    <Text
                      style={{
                        fontWeight: "700",
                        color: theme.colors.foreground,
                      }}
                    >
                      Bs. {formatMoney(TOTAL_ORDER_AMOUNT)}
                    </Text>
                  </Text>
                </View>
              </View>

              {/* BOTÓN PRINCIPAL PARA ABRIR EL CHECKLIST DEDICADO */}
              <TouchableOpacity
                onPress={() => setIsProductsModalOpen(true)}
                activeOpacity={0.8}
                style={{
                  backgroundColor:
                    pendingCount > 0
                      ? theme.colors.primary
                      : theme.colors.successSoft,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor:
                    pendingCount > 0
                      ? theme.colors.primary
                      : theme.colors.success + "50",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 2,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                    marginRight: 4,
                  }}
                >
                  <ClipboardList
                    size={18}
                    color={
                      pendingCount > 0
                        ? "#FFFFFF"
                        : theme.colors.success
                    }
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color:
                        pendingCount > 0
                          ? "#FFFFFF"
                          : theme.colors.success,
                      flex: 1,
                    }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {pendingCount > 0
                      ? `Abrir Checklist (${pendingCount} pendientes)`
                      : `Ver Checklist Completo (${items.length} unid.)`}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 0,
                  }}
                >
                  {pendingCount > 0 ? (
                    <View
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.25)",
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#FFFFFF",
                        }}
                      >
                        {pendingCount}
                      </Text>
                    </View>
                  ) : (
                    <Check size={16} color={theme.colors.success} />
                  )}
                  <ChevronRight
                    size={18}
                    color={
                      pendingCount > 0
                        ? "#FFFFFF"
                        : theme.colors.success
                    }
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* COMPROBANTE POD */}
            <View
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: hasAtLeastOnePOD
                  ? theme.colors.success + "40"
                  : theme.colors.border,
                padding: 16,
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    flex: 1,
                    flexShrink: 1,
                  }}
                >
                  <ShieldCheck
                    size={18}
                    color={
                      hasAtLeastOnePOD
                        ? theme.colors.success
                        : theme.colors.primary
                    }
                  />
                  <Text
                    variant="title"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ fontSize: 15, fontWeight: "700", flex: 1 }}
                  >
                    Comprobante (POD)
                  </Text>
                </View>

                <Badge
                  label={hasAtLeastOnePOD ? "Registrado" : "Requerido"}
                  tone={hasAtLeastOnePOD ? "success" : "neutral"}
                  size="sm"
                />
              </View>

              <View style={{ gap: 10 }}>
                <View>
                  <Text
                    variant="label"
                    style={{ marginBottom: 4, fontSize: 13 }}
                  >
                    Nombre del Receptor
                  </Text>
                  <TextInput
                    value={receiverName}
                    onChangeText={setReceiverName}
                    style={{
                      backgroundColor: theme.colors.secondary,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 14,
                      color: theme.colors.foreground,
                      fontFamily: "Montserrat_500Medium",
                    }}
                  />
                </View>

                <View>
                  <Text
                    variant="label"
                    style={{ marginBottom: 4, fontSize: 13 }}
                  >
                    C.I. / Documento
                  </Text>
                  <TextInput
                    value={receiverDoc}
                    onChangeText={setReceiverDoc}
                    style={{
                      backgroundColor: theme.colors.secondary,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 14,
                      color: theme.colors.foreground,
                      fontFamily: "Montserrat_500Medium",
                    }}
                  />
                </View>
              </View>

              {/* CONFORMIDAD: FOTO Y FIRMA SON UNA ALTERNATIVA, NO DOS REQUISITOS.
                  BASTA UNA DE LAS DOS PARA PODER FINALIZAR LA ENTREGA. */}
              {currentStatus === "ARRIVED" && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <Text variant="label" style={{ fontSize: 13 }}>
                      Conformidad
                    </Text>
                    <Text
                      variant="caption"
                      style={{
                        fontSize: 11,
                        color: theme.colors.mutedForeground,
                      }}
                    >
                      Basta una de las dos
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {renderConformityChip({
                      label: "Firma",
                      icon: FileSignature,
                      captured: hasSignature,
                      onPress: handleOpenSignaturePad,
                    })}
                    {renderConformityChip({
                      label: "Foto",
                      icon: Camera,
                      captured: hasPhoto,
                      onPress: handleSimulatePhoto,
                    })}
                  </View>
                </View>
              )}

              {/* PREVISUALIZACION DE SOLO LECTURA DE LA FIRMA CAPTURADA */}
              {hasSignature && (
                <View style={{ gap: 6 }}>
                  <View
                    style={{
                      height: 70,
                      backgroundColor: SIGNATURE_PAPER_COLOR,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <Svg
                      width="100%"
                      height="100%"
                      viewBox={getSignatureViewBox(signaturePaths)}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {signaturePaths.map((d, idx) => (
                        <Path
                          key={`pod-stroke-${idx}`}
                          d={d}
                          stroke={SIGNATURE_INK_COLOR}
                          strokeWidth={2.5}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </Svg>
                  </View>
                  <TouchableOpacity
                    onPress={handleRedoSignature}
                    style={{ alignSelf: "flex-start" }}
                  >
                    <Text
                      variant="label"
                      style={{ fontSize: 12, color: theme.colors.primary }}
                    >
                      Rehacer firma
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* TAB 2: MÓDULO COMPLETO DE REGISTRO DE COBRO DIRECTO (1 SOLO FLUJO) */}
        {activeTab === "cobro" && (
          <View style={{ gap: 16 }}>
            {/* DESGLOSE DE FACTURA Y ANTICIPO */}
            <View
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 12,
                borderRadius: 12,
                gap: 8,
                marginTop: 4,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  variant="caption"
                  style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                >
                  Factura
                </Text>
                <Text
                  variant="label"
                  style={{
                    fontSize: 13,
                    color: theme.colors.foreground,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  Bs. {formatMoney(invoiceTotal)}
                </Text>
              </View>

              {/* EL ANTICIPO SE MUESTRA SIEMPRE */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  variant="caption"
                  style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                >
                  Anticipo
                </Text>
                <Text
                  variant="label"
                  style={{
                    fontSize: 13,
                    color:
                      appliedAdvance > 0
                        ? theme.colors.success
                        : theme.colors.mutedForeground,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {appliedAdvance > 0
                    ? `- Bs. ${formatMoney(appliedAdvance)}`
                    : `Bs. ${formatMoney(0)}`}
                </Text>
              </View>

              {advanceAmount > 0 && (
                <Text
                  variant="caption"
                  style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                >
                  Anticipo registrado previamente a favor del cliente.
                </Text>
              )}

              {remainingAdvance > 0 && (
                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.warning,
                    fontSize: 11,
                  }}
                >
                  {`Saldo de anticipo no aplicado: Bs. ${formatMoney(remainingAdvance)}. Queda como credito a favor del cliente para la siguiente factura.`}
                </Text>
              )}

              {hasInvalidAdvance && (
                <Badge
                  label="Anticipo mayor a la factura"
                  tone="danger"
                  size="sm"
                />
              )}
            </View>

            {/* RESUMEN FINANCIERO DINÁMICO DE COBRO CON PROGRESS BAR */}
            <View
              style={{
                backgroundColor: theme.colors.secondary,
                padding: 10,
                borderRadius: 12,
                gap: 6,
                marginTop: 2,
              }}
            >
              {/* FILA SUPERIOR: TÍTULO + MONTO (IZQ) Y BADGE DE ESTADO (DER) */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <View style={{ flexShrink: 1 }}>
                  <Text
                    variant="caption"
                    style={{
                      color: theme.colors.mutedForeground,
                      fontSize: 11,
                    }}
                  >
                    Total a Cobrar
                  </Text>
                  <Text
                    variant="header"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{
                      fontSize: 17,
                      color: theme.colors.foreground,
                      fontVariant: ["tabular-nums"],
                      fontWeight: "700",
                    }}
                  >
                    Bs. {formatMoney(netAmountToCollect)}
                  </Text>
                </View>

                {/* BADGE DE ESTADO */}
                <View style={{ flexShrink: 0 }}>
                  <Badge
                    label={
                      TOTAL_ORDER_AMOUNT === 0
                        ? "Selecciona productos"
                        : isFullyCoveredByAdvance
                          ? "Cubierto por Anticipo"
                          : validatedProgressPercent >= 100
                            ? "Cobrado 100%"
                            : `Pendiente: Bs. {formatMoney(pendingBalance)}`
                    }
                    tone={
                      TOTAL_ORDER_AMOUNT === 0
                        ? "warning"
                        : isFullyCoveredByAdvance || validatedProgressPercent >= 100
                          ? "success"
                          : "danger"
                    }
                    size="sm"
                  />
                </View>
              </View>

              {/* BARRA VISUAL DE DESGLOSE DE COBRO */}
              <View style={{ gap: 3 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 10,
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    Cobrado:{" "}
                    <Text
                      variant="label"
                      style={{
                        fontSize: 10,
                        color: theme.colors.success,
                        fontVariant: ["tabular-nums"],
                        fontWeight: "700",
                      }}
                    >
                      Bs. {formatMoney(totalPaid)}
                    </Text>
                  </Text>
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 10,
                      color: theme.colors.mutedForeground,
                      fontWeight: "600",
                    }}
                  >
                    {validatedProgressPercent}%
                  </Text>
                </View>

                <View
                  style={{
                    height: 5,
                    backgroundColor: theme.colors.cardBackground,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${validatedProgressPercent}%`,
                      height: "100%",
                      backgroundColor:
                        validatedProgressPercent >= 100 || isFullyCoveredByAdvance
                          ? "#22c55e"
                          : theme.colors.primary,
                      borderRadius: 3,
                    }}
                  />
                </View>
              </View>
            </View>

            {/* BANNER DE COBRO COMPLETADO AL 100% CON BOTÓN DE WHATSAPP */}
            {validatedProgressPercent >= 100 && (
              <View
                style={{
                  backgroundColor: theme.colors.cardBackground,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: theme.colors.success,
                  padding: 14,
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={22} color={theme.colors.success} />
                  <Text variant="title" style={{ fontSize: 15, color: theme.colors.success, fontWeight: "700" }}>
                    Cobro Completado al 100%
                  </Text>
                </View>

                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.mutedForeground,
                    textAlign: "center",
                    fontSize: 12,
                  }}
                >
                  Se ha registrado el pago completo por Bs. {formatMoney(totalPaid)}. Puedes enviar o reenviar la factura y el comprobante por WhatsApp al cliente.
                </Text>

                <View style={{ width: "100%", marginTop: 2 }}>
                  <Button
                    label="Enviar Factura por WhatsApp"
                    variant="outline"
                    size="md"
                    icon={MessageCircle}
                    onPress={() => setIsWhatsAppModalOpen(true)}
                    fullWidth
                  />
                </View>
              </View>
            )}

            {/* SELECT DROPDOWN DE MÉTODOS DE PAGO (CUANDO QUEDA SALDO PENDIENTE) */}
            {unallocatedBalance > 0 && !isFullyCoveredByAdvance && (
              <View
                style={{
                  backgroundColor: theme.colors.cardBackground,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: 16,
                  gap: 12,
                  zIndex: 100,
                  position: "relative",
                }}
              >
                <View style={{ gap: 2 }}>
                  <Text variant="title" style={{ fontSize: 16 }}>
                    Seleccionar Método de Pago
                  </Text>
                  <Text
                    variant="caption"
                    style={{ fontSize: 11, color: theme.colors.mutedForeground }}
                  >
                    Selecciona un método para registrar el cobro directamente.
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isFullyCoveredByAdvance || unallocatedBalance === 0}
                  onPress={() => setIsSelectMethodOpen(!isSelectMethodOpen)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: theme.colors.secondary,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: isSelectMethodOpen
                      ? theme.colors.primary
                      : theme.colors.border,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, flexShrink: 1 }}>
                    <DollarSign size={20} color={theme.colors.primary} />
                    <Text
                      variant="bodySmall"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{
                        fontSize: 14,
                        color: theme.colors.foreground,
                        fontWeight: "600",
                        flex: 1,
                      }}
                    >
                      Efectivo, Pago QR, Transferencia o Cheque...
                    </Text>
                  </View>
                  <ChevronDown
                    size={20}
                    color={theme.colors.mutedForeground}
                    style={{
                      flexShrink: 0,
                      transform: [{ rotate: isSelectMethodOpen ? "180deg" : "0deg" }],
                    }}
                  />
                </TouchableOpacity>

                {/* OPCIONES FLOTANTES DEL SELECT */}
                {isSelectMethodOpen && (
                  <View
                    style={{
                      position: "absolute",
                      top: 78,
                      left: 16,
                      right: 16,
                      zIndex: 9999,
                      backgroundColor: theme.colors.cardBackground,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      overflow: "hidden",
                      elevation: 12,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                    }}
                  >
                    {PAYMENT_METHOD_OPTIONS.map((option, idx) => {
                      const OptionIcon = option.icon;
                      const isLast = idx === PAYMENT_METHOD_OPTIONS.length - 1;
                      return (
                        <TouchableOpacity
                          key={option.method}
                          activeOpacity={0.7}
                          onPress={() => {
                            setMethodSelectValue(option.method);
                            handleSelectPaymentMethod(option.method);
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            borderBottomWidth: isLast ? 0 : 1,
                            borderBottomColor: theme.colors.border,
                          }}
                        >
                          <View
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 17,
                              backgroundColor: theme.colors.secondary,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <OptionIcon size={18} color={theme.colors.primary} />
                          </View>
                          <Text
                            variant="label"
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: theme.colors.foreground,
                            }}
                          >
                            {option.pickerLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* AVISO: EL ANTICIPO CUBRE TODA LA ENTREGA */}
            {isFullyCoveredByAdvance && (
              <View
                style={{
                  backgroundColor: theme.colors.successSoft,
                  borderWidth: 1,
                  borderColor: theme.colors.success,
                  borderRadius: 10,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <ShieldCheck size={18} color={theme.colors.success} />
                <Text
                  variant="label"
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: theme.colors.success,
                  }}
                >
                  Esta entrega queda cubierta por el anticipo. No corresponde cobro en sitio.
                </Text>
              </View>
            )}

            {/* HISTORIAL DE PAGOS REGISTRADOS */}
            <View style={{ gap: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text variant="title" style={{ fontSize: 16 }}>
                  Pagos Registrados ({payments.length})
                </Text>
                {payments.length > 0 && (
                  <Text
                    variant="caption"
                    style={{ color: theme.colors.success, fontWeight: "700" }}
                  >
                    Total: Bs. {formatMoney(totalPaid)}
                  </Text>
                )}
              </View>

              {payments.length === 0 ? (
                <View
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    padding: 18,
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <DollarSign size={24} color={theme.colors.mutedForeground} />
                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.mutedForeground,
                      textAlign: "center",
                    }}
                  >
                    No hay pagos registrados aún. Selecciona un método para registrar el cobro.
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    overflow: "hidden",
                  }}
                >
                  {payments.map((p, idx) => {
                    const opt = PAYMENT_METHOD_OPTIONS.find(
                      (o) => o.method === p.method,
                    );
                    const IconComp = opt?.icon || Banknote;
                    return (
                      <View
                        key={p.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: 12,
                          borderBottomWidth: idx === payments.length - 1 ? 0 : 1,
                          borderBottomColor: theme.colors.border,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            flexShrink: 1,
                          }}
                        >
                          <View
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 17,
                              backgroundColor: theme.colors.primarySoft,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <IconComp size={18} color={theme.colors.primary} />
                          </View>
                          <View style={{ gap: 1, flexShrink: 1 }}>
                            <Text
                              variant="label"
                              numberOfLines={1}
                              style={{ fontSize: 13, fontWeight: "700" }}
                            >
                              {p.method === "CASH"
                                ? "Efectivo"
                                : p.method === "TRANSFER"
                                  ? "Transferencia"
                                  : p.method === "QR"
                                    ? "Pago QR Banco"
                                    : "Cheque"}
                            </Text>
                            {(p.method === "CHECK" || p.method === "TRANSFER") && p.bank ? (
                              <Text
                                variant="caption"
                                numberOfLines={1}
                                style={{
                                  fontSize: 11,
                                  fontWeight: "600",
                                  color: theme.colors.foreground,
                                }}
                              >
                                Banco: {p.bank}
                              </Text>
                            ) : null}
                            <Text
                              variant="caption"
                              numberOfLines={1}
                              style={{
                                color: theme.colors.mutedForeground,
                                fontSize: 11,
                              }}
                            >
                              Ref: {p.reference || "N/A"}{" "}
                              {p.hasPhoto ? "• Foto comprobante" : ""}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            flexShrink: 0,
                          }}
                        >
                          <View style={{ alignItems: "flex-end", gap: 1 }}>
                            <Text
                              variant="label"
                              style={{
                                fontSize: 15,
                                fontWeight: "800",
                                color: theme.colors.success,
                                fontVariant: ["tabular-nums"],
                              }}
                            >
                              Bs. {formatMoney(p.amount)}
                            </Text>
                            {p.currency === "USD" && (
                              <Text
                                variant="caption"
                                style={{
                                  fontSize: 10,
                                  color: theme.colors.mutedForeground,
                                  fontVariant: ["tabular-nums"],
                                }}
                              >
                                USD {formatMoney(p.originalAmount)} x{" "}
                                {p.exchangeRate}
                              </Text>
                            )}
                          </View>
                          <TouchableOpacity
                            onPress={() => handleRemovePayment(p.id)}
                            style={{ padding: 4 }}
                          >
                            <Trash2 size={16} color={theme.colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* BARRA DE ACCIÓN FIJA: EL MONTO Y LA ÚNICA ACCIÓN DE LA FASE ACTUAL */}
      <DeliveryActionBar {...actionBar} />

      {/* DIÁLOGO PERSONALIZADO DE NOTIFICACIÓN AppDialog */}
      <AppDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onConfirm={dialogConfig.onConfirm}
        onClose={() => setDialogConfig((prev) => ({ ...prev, visible: false }))}
      />

      {/* DIÁLOGO DE ÉXITO FINAL */}
      <SuccessDialog
        visible={showSuccess}
        onClose={backToList}
        title="¡Entrega Finalizada Exitosamente!"
        message={`Se ha registrado la entrega y el cobro completo de la Parada #${stop.sequence}: ${stop.clientName}.`}
      />

      {/* LIENZO DE FIRMA DIGITAL DE RECEPCION */}
      <SignaturePadModal
        visible={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onConfirm={handleConfirmSignature}
        receiverName={receiverName}
      />

      {/* HOJA INFERIOR CON EL FORMULARIO DEL METODO DE COBRO SELECCIONADO */}
      <PaymentMethodModal
        visible={isPaymentModalOpen}
        method={selectedMethod}
        title={activePaymentOption?.modalTitle ?? "Registro de Cobro"}
        pendingBalance={pendingBalance}
        onClose={handleClosePaymentModal}
        onSubmit={paymentSubmit.onPress}
        submitLabel={paymentSubmit.label}
        submitIcon={paymentSubmit.icon}
        submitDisabled={paymentSubmit.disabled}
        submitLoading={paymentSubmit.loading}
        closeDisabled={isPaymentModalLocked}
      >
        {renderPaymentForm()}
      </PaymentMethodModal>

      {/* MODAL DE ENVÍO DE FACTURA Y QR POR WHATSAPP AL MICROSERVICIO */}
      <SendInvoiceWhatsAppModal
        visible={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        customerName={stop.contactName || stop.clientName}
        defaultPhone={stop.contactPhone || "+591 71234567"}
        invoiceNumbers={["FAC-100482"]}
        totalAmount={netAmountToCollect}
        hasQr={true}
        onSuccessSent={(sentPhone) => {
          showDialog(
            "WhatsApp Enviado",
            `La factura y el código QR de cobro fueron enviados exitosamente al ${sentPhone} mediante el microservicio corporativo.`,
            "success",
          );
        }}
      />

      {/* DIÁLOGO CENTRADO DE REGISTRO DE INCIDENCIAS */}
      <Modal
        visible={isIncidentModalOpen}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setIsIncidentModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 440,
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: 22,
              gap: 14,
              elevation: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
            }}
          >
            {/* ENCABEZADO DEL DIÁLOGO */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: theme.colors.dangerSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertTriangle size={22} color={theme.colors.danger} />
                </View>
                <View>
                  <Text
                    variant="title"
                    style={{
                      fontSize: 18,
                      color: theme.colors.foreground,
                      fontWeight: "700",
                    }}
                  >
                    Registrar Incidencia
                  </Text>
                  <Text
                    variant="caption"
                    style={{
                      color: theme.colors.mutedForeground,
                      fontSize: 12,
                    }}
                  >
                    Afecta a: {incidentItemName}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setIsIncidentModalOpen(false)}
                style={{ padding: 4 }}
              >
                <X size={20} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* SELECT DE TIPO DE INCONVENIENTE */}
            <View style={{ gap: 6, zIndex: 100, position: "relative" }}>
              <Text
                variant="caption"
                style={{ color: theme.colors.foreground, fontWeight: "600" }}
              >
                Tipo de inconveniente:
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsCategorySelectOpen(!isCategorySelectOpen)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: isCategorySelectOpen
                    ? theme.colors.primary
                    : theme.colors.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <Text
                  variant="label"
                  style={{
                    fontSize: 14,
                    color: incidentCategory
                      ? theme.colors.foreground
                      : theme.colors.mutedForeground,
                    fontWeight: "600",
                  }}
                >
                  {incidentCategoriesMap[incidentCategory] ||
                    "Selecciona un inconveniente..."}
                </Text>
                <ChevronDown
                  size={18}
                  color={theme.colors.mutedForeground}
                  style={{
                    transform: [
                      { rotate: isCategorySelectOpen ? "180deg" : "0deg" },
                    ],
                  }}
                />
              </TouchableOpacity>

              {/* OPCIONES FLOTANTES DEL SELECT (ABSOLUTE POSITIONING) */}
              {isCategorySelectOpen && (
                <View
                  style={{
                    position: "absolute",
                    top: 70,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    backgroundColor: theme.colors.cardBackground,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    overflow: "hidden",
                    elevation: 10,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    maxHeight: 220,
                  }}
                >
                  <ScrollView
                    style={{ maxHeight: 220 }}
                    nestedScrollEnabled={true}
                  >
                    {Object.entries(incidentCategoriesMap).map(
                      ([key, label], idx, arr) => {
                        const isSelected = incidentCategory === key;
                        const isLast = idx === arr.length - 1;
                        return (
                          <TouchableOpacity
                            key={key}
                            activeOpacity={0.7}
                            onPress={() => {
                              setIncidentCategory(key);
                              setIsCategorySelectOpen(false);
                            }}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingVertical: 12,
                              paddingHorizontal: 14,
                              backgroundColor: isSelected
                                ? theme.colors.primarySoft
                                : "transparent",
                              borderBottomWidth: isLast ? 0 : 1,
                              borderBottomColor: theme.colors.border,
                            }}
                          >
                            <Text
                              variant="bodySmall"
                              style={{
                                fontSize: 13,
                                fontWeight: isSelected ? "700" : "500",
                                color: isSelected
                                  ? theme.colors.primary
                                  : theme.colors.foreground,
                              }}
                            >
                              {label}
                            </Text>
                            {isSelected && (
                              <Check size={16} color={theme.colors.primary} />
                            )}
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* OBSERVACIONES */}
            <View style={{ gap: 4 }}>
              <Text
                variant="caption"
                style={{ color: theme.colors.foreground, fontWeight: "600" }}
              >
                Detalles u Observaciones:
              </Text>
              <TextInput
                value={incidentNotes}
                onChangeText={setIncidentNotes}
                placeholder="Escribe aquí los detalles de la incidencia..."
                placeholderTextColor={theme.colors.mutedForeground}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: 10,
                  color: theme.colors.foreground,
                  fontSize: 13,
                  textAlignVertical: "top",
                  minHeight: 70,
                }}
              />
            </View>

            {/* FOTO EVIDENCIA */}
            <TouchableOpacity
              onPress={() => setIncidentPhoto(true)}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: incidentPhoto
                  ? theme.colors.successSoft
                  : theme.colors.secondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: incidentPhoto
                  ? theme.colors.success
                  : theme.colors.border,
                padding: 10,
                gap: 8,
              }}
            >
              <Camera
                size={18}
                color={
                  incidentPhoto ? theme.colors.success : theme.colors.primary
                }
              />
              <Text
                variant="label"
                style={{
                  fontSize: 13,
                  color: incidentPhoto
                    ? theme.colors.success
                    : theme.colors.primary,
                  fontWeight: "600",
                }}
              >
                {incidentPhoto
                  ? "Evidencia Fotográfica Adjuntada"
                  : "Capturar Evidencia Fotográfica"}
              </Text>
            </TouchableOpacity>

            {/* ACCIONES DEL DIÁLOGO */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancelar"
                  variant="outline"
                  fullWidth
                  onPress={() => setIsIncidentModalOpen(false)}
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Button
                  label="Guardar Incidencia"
                  icon={AlertTriangle}
                  variant="danger"
                  fullWidth
                  onPress={handleSaveIncident}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DEDICADO DE VERIFICACIÓN DE PRODUCTOS (CHECKLIST COMPLETO) */}
      <ProductsChecklistModal
        visible={isProductsModalOpen}
        onClose={() => setIsProductsModalOpen(false)}
        items={items}
        checkedItemIds={checkedItemIds}
        onToggleItem={toggleCheckItem}
        onToggleAll={toggleCheckAll}
        clientName={stop.clientName}
      />
    </View>
  );
};
