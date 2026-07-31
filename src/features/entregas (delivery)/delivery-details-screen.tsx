import {
  AlertTriangle,
  Banknote,
  Building,
  Camera,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Clock,
  DollarSign,
  FileSignature,
  FileText,
  Lock,
  MapPin,
  Navigation,
  Package,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Snowflake,
  Square,
  Trash2,
  Truck,
  X,
  type LucideIcon
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Linking,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle
} from "react-native";
import Svg, { Path } from "react-native-svg";

import {
  findRouteById,
  goBackOrNavigate,
  navigateTo,
} from "@/navigation/registry";
import { AppDialog, Badge, Button, type DialogType } from "@/shared/ui";
import { SuccessDialog } from "@/shared/ui/SuccessDialog";
import { Text, useAppTheme } from "@/theme";
import { PaymentMethodModal } from "./components/PaymentMethodModal";
import { SignaturePadModal } from "./components/SignaturePadModal";
import { getSelectedStop, updateStopStatus } from "./data/delivery-store";
import { SANTA_CRUZ_STOPS_COORDINATES } from "./data/santa-cruz-route";
import type { EstadoEntrega, PaymentMethodType } from "./types";

type DeliveryItem = {
  id: string;
  codigo: string;
  nombre: string;
  plannedQty: number;
  deliveredQty: number;
  isCold: boolean;
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

type PaymentRecord = {
  id: string;
  method: PaymentMethodType;
  amount: number;
  reference?: string;
  bank?: string;
  hasPhoto?: boolean;
  isVerified?: boolean;
};

const formatMoney = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(val)) return "0.00";
  return val.toFixed(2);
};

// AJUSTA LOS TRAZOS CAPTURADOS AL RECUADRO DE PREVISUALIZACION DEL POD
const getSignatureViewBox = (strokePaths: string[]): string => {
  const pointPattern = /[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g;
  const source = strokePaths.join(" ");
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let match = pointPattern.exec(source);
  while (match !== null) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    if (!isNaN(x) && !isNaN(y)) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    match = pointPattern.exec(source);
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
    nombre: "Queso Gouda Bloque 5kg",
    plannedQty: 8,
    deliveredQty: 8,
    isCold: true,
    unit: "cajas",
    unitPrice: 280.0,
  },
  {
    id: "2",
    codigo: "7790025",
    nombre: "Mantequilla Cremosa Con Sal 500g",
    plannedQty: 15,
    deliveredQty: 15,
    isCold: true,
    unit: "packs",
    unitPrice: 110.0,
  },
  {
    id: "3",
    codigo: "7790040",
    nombre: "Ketchup Girasol Institucional 5kg",
    plannedQty: 12,
    deliveredQty: 12,
    isCold: false,
    unit: "baldes",
    unitPrice: 95.0,
  },
];

export const DeliveryDetailScreen = () => {
  const theme = useAppTheme();

  // OBTENER LA PARADA SELECCIONADA DINÁMICAMENTE DE LA HOJA DE RUTA
  const stop = getSelectedStop();

  // ESTADO LOCAL DE LA PARADA (SOPORTA TRANSIÓN 'EN_ROUTE' / 'PENDING' -> 'ARRIVED')
  const [currentStatus, setCurrentStatus] = useState<EstadoEntrega>(
    stop.status,
  );

  // VALIDACIÓN CLAVE: EL COBRO Y DESCARGA SE HABILITA AL INICIAR LA ENTREGA (ESTADO: ARRIVED O DELIVERED)
  const isPaymentEnabled =
    currentStatus === "ARRIVED" || currentStatus === "DELIVERED";

  // Estado de Productos y POD
  const [items, setItems] = useState<DeliveryItem[]>(MOCK_ITEMS);
  const [checkedItemIds, setCheckedItemIds] = useState<string[]>([]);

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
  // EL FORMULARIO DEL METODO VIVE EN UNA HOJA INFERIOR, NO INLINE EN EL TAB
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // Formularios de Cobro
  const [cashAmount, setCashAmount] = useState(netAmountToCollect.toString());
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

  // Estado de Pago por QR
  const [qrAmount, setQrAmount] = useState(netAmountToCollect.toString());
  const [qrStatus, setQrStatus] = useState<
    "PENDING" | "VALIDATING" | "APPROVED"
  >("PENDING");

  // CÁLCULOS DINÁMICOS DE SALDO PENDIENTE
  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const pendingBalance = Math.max(0, netAmountToCollect - totalPaid);

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

  const handleGoRegistrarVisita = () => {
    const route = findRouteById("entregas.registrarVisita");
    if (route) navigateTo(route);
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
    if (tab === "cobro" && !isPaymentEnabled) {
      showDialog(
        "Cobro Deshabilitado",
        `El registro de cobro solo esta permitido para la parada en descarga donde se encuentra el chofer (Estado: En Descarga).\n\nEsta parada se encuentra actualmente en estado: ${getStatusLabel(stop.status)}.`,
        "warning",
      );
      return;
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
  // EL MONTO SE SIEMBRA AL ABRIR, NO AL MONTAR: EL SALDO DEPENDE DE LOS PRODUCTOS
  // TICKEADOS Y DEL ANTICIPO APLICADO, QUE CAMBIAN DESPUES DEL PRIMER RENDER.
  const handleSelectPaymentMethod = (method: PaymentMethodType) => {
    if (blockChargeIfCoveredByAdvance()) return;
    const seededAmount = pendingBalance > 0 ? pendingBalance.toString() : "";
    if (method === "CASH") setCashAmount(seededAmount);
    if (method === "TRANSFER") setTransferAmount(seededAmount);
    if (method === "CHECK") setCheckAmount(seededAmount);
    if (method === "QR") {
      setQrAmount(seededAmount);
      setQrStatus("PENDING");
    }
    setSelectedMethod(method);
    setIsPaymentModalOpen(true);
  };

  // BOTÓN PAGAR CON QR
  const handlePayWithQr = () => {
    if (blockChargeIfCoveredByAdvance()) return;
    const amt = parseFloat(qrAmount);
    if (isNaN(amt) || amt <= 0) {
      showDialog(
        "Monto Invalido",
        "Ingresa un monto valido a cobrar por QR.",
        "danger",
      );
      return;
    }
    setQrStatus("VALIDATING");
    setTimeout(() => {
      const newPayment: PaymentRecord = {
        id: Date.now().toString(),
        method: "QR",
        amount: amt,
        reference: `QR-BCO-${Math.floor(100000 + Math.random() * 900000)}`,
        isVerified: true,
      };
      const newPayments = [...payments, newPayment];
      setPayments(newPayments);
      const newPending = Math.max(
        0,
        netAmountToCollect -
          newPayments.reduce((a, p) => a + (p.amount || 0), 0),
      );
      setCashAmount(newPending.toString());
      setTransferAmount(newPending.toString());
      setCheckAmount(newPending.toString());
      setQrAmount(newPending.toString());
      setQrStatus("APPROVED");
      setIsPaymentModalOpen(false);
      showDialog(
        "Pago por QR Confirmado",
        `El banco ha verificado el pago de Bs. ${formatMoney(amt)} correctamente.`,
        "success",
      );
    }, 2000);
  };

  // AGREGAR COBROS INDIVIDUALES / PARCIALES
  const handleAddCashPayment = () => {
    if (blockChargeIfCoveredByAdvance()) return;
    const amt = parseFloat(cashAmount);
    if (isNaN(amt) || amt <= 0) {
      showDialog(
        "Monto Invalido",
        "Ingresa un monto valido para el cobro en efectivo.",
        "danger",
      );
      return;
    }
    const newPayment: PaymentRecord = {
      id: Date.now().toString(),
      method: "CASH",
      amount: amt,
      reference: cashReceiptNo || "Recibo Manual",
      hasPhoto: false,
    };
    const newPayments = [...payments, newPayment];
    setPayments(newPayments);
    const newPending = Math.max(
      0,
      netAmountToCollect -
        newPayments.reduce((a, p) => a + (p.amount || 0), 0),
    );
    setCashAmount(newPending.toString());
    setTransferAmount(newPending.toString());
    setCheckAmount(newPending.toString());
    setQrAmount(newPending.toString());
    setIsPaymentModalOpen(false);
    showDialog(
      "Cobro Registrado",
      `Se registraron Bs. ${formatMoney(amt)} en efectivo.`,
      "success",
    );
  };

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
      bank: transferBank,
      reference: transferRef,
      hasPhoto: true,
    };
    const newPayments = [...payments, newPayment];
    setPayments(newPayments);
    const newPending = Math.max(
      0,
      netAmountToCollect -
        newPayments.reduce((a, p) => a + (p.amount || 0), 0),
    );
    setCashAmount(newPending.toString());
    setTransferAmount(newPending.toString());
    setCheckAmount(newPending.toString());
    setQrAmount(newPending.toString());
    setIsPaymentModalOpen(false);
    showDialog(
      "Transferencia Registrada",
      `Se registraron Bs. ${formatMoney(amt)} por transferencia.`,
      "success",
    );
  };

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
      bank: checkBank,
      reference: `Cheque #${checkNo}`,
      hasPhoto: true,
    };
    const newPayments = [...payments, newPayment];
    setPayments(newPayments);
    const newPending = Math.max(
      0,
      netAmountToCollect -
        newPayments.reduce((a, p) => a + (p.amount || 0), 0),
    );
    setCashAmount(newPending.toString());
    setTransferAmount(newPending.toString());
    setCheckAmount(newPending.toString());
    setQrAmount(newPending.toString());
    setIsPaymentModalOpen(false);
    showDialog(
      "Cheque Registrado",
      `Se registro el cheque #${checkNo} por Bs. ${formatMoney(amt)}.`,
      "success",
    );
  };

  const handleRemovePayment = (id: string) => {
    const newPayments = payments.filter((p) => p.id !== id);
    setPayments(newPayments);
    const newPending = Math.max(
      0,
      netAmountToCollect -
        newPayments.reduce((a, p) => a + (p.amount || 0), 0),
    );
    setCashAmount(newPending.toString());
    setTransferAmount(newPending.toString());
    setCheckAmount(newPending.toString());
    setQrAmount(newPending.toString());
    if (newPayments.filter((p) => p.method === "QR").length === 0) {
      setQrStatus("PENDING");
    }
  };

  const handleConfirmFinalDelivery = () => {
    if (!hasPhoto && !hasSignature) {
      showDialog(
        "POD Requerido",
        "Registra la foto o firma de recepcion en el tab de Productos.",
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

  // 1. EFECTIVO
  const renderCashForm = () => (
    <View style={{ gap: 10 }}>
      {renderAmountField({
        label: "Monto en Efectivo Recibido (Bs.)",
        value: cashAmount,
        onChangeText: setCashAmount,
        onHalf: () => setCashAmount((netAmountToCollect / 2).toString()),
        onPending: () => setCashAmount(pendingBalance.toString()),
      })}
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

  // 3. PAGO POR QR (MONTO EDITABLE + VALIDACIÓN BANCARIA EN EL PIE DEL MODAL)
  const renderQrForm = () => (
    <View style={{ alignItems: "center", gap: 12, paddingVertical: 6 }}>
      <View style={{ alignSelf: "stretch" }}>
        {renderAmountField({
          label: "Monto a Cobrar por QR (Bs.)",
          value: qrAmount,
          onChangeText: (val) => {
            setQrAmount(val);
            setQrStatus("PENDING");
          },
          onHalf: () => {
            setQrAmount((netAmountToCollect / 2).toString());
            setQrStatus("PENDING");
          },
          onPending: () => {
            setQrAmount(pendingBalance.toString());
            setQrStatus("PENDING");
          },
        })}
      </View>

      <View
        style={{
          backgroundColor: "#ffffff",
          padding: 16,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: theme.colors.primary,
          alignItems: "center",
          justifyContent: "center",
          elevation: 4,
        }}
      >
        <View
          style={{
            width: 140,
            height: 140,
            backgroundColor: "#0f172a",
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <QrCode size={100} color="#ffffff" />
        </View>
      </View>

      {qrStatus === "APPROVED" && (
        <View
          style={{
            backgroundColor: theme.colors.successSoft,
            padding: 12,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            alignSelf: "stretch",
            justifyContent: "center",
          }}
        >
          <ShieldCheck size={20} color={theme.colors.success} />
          <Text
            variant="label"
            style={{ color: theme.colors.success, fontSize: 13 }}
          >
            Pago Confirmado por el Banco
          </Text>
        </View>
      )}
    </View>
  );

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

  // ACCIÓN PRINCIPAL DEL MODAL SEGÚN EL MÉTODO SELECCIONADO
  const paymentSubmit: {
    label: string;
    icon: LucideIcon;
    disabled: boolean;
    loading: boolean;
    onPress: () => void;
  } = (() => {
    switch (selectedMethod) {
      case "TRANSFER":
        return {
          label: "Agregar Transferencia",
          icon: Plus,
          disabled: false,
          loading: false,
          onPress: handleAddTransferPayment,
        };
      case "CHECK":
        return {
          label: "Agregar Cobro con Cheque",
          icon: Plus,
          disabled: false,
          loading: false,
          onPress: handleAddCheckPayment,
        };
      case "QR":
        return {
          label:
            qrStatus === "APPROVED"
              ? "Pago Confirmado por el Banco"
              : qrStatus === "VALIDATING"
                ? "Validando transferencia con el banco..."
                : "Pagar con QR",
          icon: qrStatus === "APPROVED" ? ShieldCheck : RefreshCw,
          disabled: qrStatus !== "PENDING",
          loading: qrStatus === "VALIDATING",
          onPress: handlePayWithQr,
        };
      case "CASH":
      default:
        return {
          label: "Agregar Pago en Efectivo",
          icon: Plus,
          disabled: false,
          loading: false,
          onPress: handleAddCashPayment,
        };
    }
  })();

  // EL QR NO PUEDE CERRARSE MIENTRAS EL BANCO ESTA VALIDANDO
  const isPaymentModalLocked =
    selectedMethod === "QR" && qrStatus === "VALIDATING";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
      >
        {/* 0. INDICADOR VISUAL DE PASOS DE LA ENTREGA */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 12,
            gap: 10,
            elevation: 1,
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
              variant="label"
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: theme.colors.foreground,
              }}
            >
              PROGRESO DE LA ENTREGA
            </Text>
            <Text
              variant="caption"
              style={{
                fontSize: 11,
                color: theme.colors.primary,
                fontWeight: "700",
              }}
            >
              {currentStatus === "PENDING"
                ? "Paso 1 de 5"
                : currentStatus === "EN_ROUTE"
                  ? "Paso 2 de 5"
                  : currentStatus === "ARRIVED" && activeTab === "productos"
                    ? "Paso 3 de 5"
                    : currentStatus === "ARRIVED" && activeTab === "cobro"
                      ? "Paso 4 de 5"
                      : currentStatus === "DELIVERED"
                        ? "Paso 5 de 5"
                        : "En Curso"}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 4,
            }}
          >
            {/* Paso 1: En Camino */}
            <View style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor:
                    currentStatus === "EN_ROUTE"
                      ? theme.colors.primary
                      : currentStatus === "ARRIVED" ||
                          currentStatus === "DELIVERED"
                        ? theme.colors.success
                        : theme.colors.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Truck
                  size={14}
                  color={
                    currentStatus === "PENDING"
                      ? theme.colors.mutedForeground
                      : "#ffffff"
                  }
                />
              </View>
              <Text
                variant="caption"
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  fontWeight: currentStatus === "EN_ROUTE" ? "700" : "400",
                  color:
                    currentStatus === "EN_ROUTE"
                      ? theme.colors.primary
                      : theme.colors.mutedForeground,
                }}
              >
                1. En Camino
              </Text>
            </View>

            <View
              style={{
                height: 2,
                flex: 0.4,
                backgroundColor:
                  currentStatus === "EN_ROUTE" ||
                  currentStatus === "ARRIVED" ||
                  currentStatus === "DELIVERED"
                    ? theme.colors.primary
                    : theme.colors.border,
              }}
            />

            {/* Paso 2: Llegada */}
            <View style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor:
                    currentStatus === "ARRIVED"
                      ? theme.colors.primary
                      : currentStatus === "DELIVERED"
                        ? theme.colors.success
                        : theme.colors.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MapPin
                  size={14}
                  color={
                    currentStatus === "PENDING" || currentStatus === "EN_ROUTE"
                      ? theme.colors.mutedForeground
                      : "#ffffff"
                  }
                />
              </View>
              <Text
                variant="caption"
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  fontWeight: currentStatus === "ARRIVED" ? "700" : "400",
                  color:
                    currentStatus === "ARRIVED"
                      ? theme.colors.primary
                      : theme.colors.mutedForeground,
                }}
              >
                2. Llegada
              </Text>
            </View>

            <View
              style={{
                height: 2,
                flex: 0.4,
                backgroundColor:
                  currentStatus === "ARRIVED" || currentStatus === "DELIVERED"
                    ? theme.colors.primary
                    : theme.colors.border,
              }}
            />

            {/* Paso 3: Productos */}
            <View style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor:
                    currentStatus === "DELIVERED"
                      ? theme.colors.success
                      : currentStatus === "ARRIVED" && activeTab === "productos"
                        ? theme.colors.primary
                        : theme.colors.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Package
                  size={14}
                  color={
                    currentStatus === "DELIVERED" ||
                    (currentStatus === "ARRIVED" && activeTab === "productos")
                      ? "#ffffff"
                      : theme.colors.mutedForeground
                  }
                />
              </View>
              <Text
                variant="caption"
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  fontWeight:
                    activeTab === "productos" && currentStatus === "ARRIVED"
                      ? "700"
                      : "400",
                  color: theme.colors.mutedForeground,
                }}
              >
                3. Productos
              </Text>
            </View>

            <View
              style={{
                height: 2,
                flex: 0.4,
                backgroundColor:
                  currentStatus === "DELIVERED"
                    ? theme.colors.success
                    : theme.colors.border,
              }}
            />

            {/* Paso 4: Cobro */}
            <View style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor:
                    currentStatus === "DELIVERED"
                      ? theme.colors.success
                      : currentStatus === "ARRIVED" && activeTab === "cobro"
                        ? theme.colors.primary
                        : theme.colors.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Banknote
                  size={14}
                  color={
                    currentStatus === "DELIVERED" ||
                    (currentStatus === "ARRIVED" && activeTab === "cobro")
                      ? "#ffffff"
                      : theme.colors.mutedForeground
                  }
                />
              </View>
              <Text
                variant="caption"
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  fontWeight:
                    activeTab === "cobro" && currentStatus === "ARRIVED"
                      ? "700"
                      : "400",
                  color: theme.colors.mutedForeground,
                }}
              >
                4. Cobro
              </Text>
            </View>

            <View
              style={{
                height: 2,
                flex: 0.4,
                backgroundColor:
                  currentStatus === "DELIVERED"
                    ? theme.colors.success
                    : theme.colors.border,
              }}
            />

            {/* Paso 5: Entregado */}
            <View style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor:
                    currentStatus === "DELIVERED"
                      ? theme.colors.success
                      : theme.colors.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle2
                  size={14}
                  color={
                    currentStatus === "DELIVERED"
                      ? "#ffffff"
                      : theme.colors.mutedForeground
                  }
                />
              </View>
              <Text
                variant="caption"
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  fontWeight: currentStatus === "DELIVERED" ? "700" : "400",
                  color:
                    currentStatus === "DELIVERED"
                      ? theme.colors.success
                      : theme.colors.mutedForeground,
                }}
              >
                5. Entregado
              </Text>
            </View>
          </View>
        </View>

        {/* 1. TARJETA PRINCIPAL DINÁMICA DEL CLIENTE SELECCIONADO Y RESUMEN DE COBRO */}
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
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ gap: 2, flex: 1 }}>
              <Text
                variant="caption"
                style={{ color: theme.colors.mutedForeground }}
              >
                PARADA #{stop.sequence} • {stop.deliveryPointId}
              </Text>
              <Text
                variant="title"
                style={{ color: theme.colors.foreground, fontSize: 19 }}
              >
                {stop.clientName}
              </Text>
            </View>
            <Badge
              label={getStatusLabel(currentStatus)}
              tone={getStatusTone(currentStatus)}
              emphasis="soft"
              size="md"
            />
          </View>

          <View style={{ gap: 6, marginTop: 2 }}>
            <View
              style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}
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

            {/* BOTONES DE ACCIÓN */}
            <View style={{ gap: 8, marginTop: 4 }}>
              {currentStatus === "PENDING" && (
                <Button
                  label="Estoy en camino"
                  icon={Truck}
                  variant="primary"
                  size="md"
                  fullWidth
                  onPress={handleStartEnRoute}
                />
              )}

              {currentStatus === "EN_ROUTE" && (
                <View style={{ gap: 8 }}>
                  <View
                    style={{
                      backgroundColor: theme.colors.primarySoft,
                      padding: 10,
                      borderRadius: 10,
                      gap: 2,
                    }}
                  >
                    <Text
                      variant="label"
                      style={{ color: theme.colors.primary, fontSize: 12 }}
                    >
                      En camino hacia la ubicación del cliente
                    </Text>
                  </View>
                  <Button
                    label="Marcar llegada"
                    icon={CheckCircle2}
                    variant="primary"
                    size="md"
                    fullWidth
                    onPress={handleMarkArrived}
                  />
                </View>
              )}

              {currentStatus === "ARRIVED" && (
                <View
                  style={{
                    backgroundColor: "#e0f2fe",
                    padding: 10,
                    borderRadius: 10,
                    gap: 2,
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

              <Button
                label="Cómo llegar"
                icon={Navigation}
                variant="secondary"
                size="sm"
                fullWidth
                onPress={handleOpenGoogleMaps}
              />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Registrar Visita"
                    icon={ClipboardList}
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onPress={handleGoRegistrarVisita}
                  />
                </View>
                <View style={{ flex: 1.2 }}>
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
              </View>
            </View>
          </View>

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
                style={{ fontSize: 13, color: theme.colors.foreground }}
              >
                Bs. {formatMoney(invoiceTotal)}
              </Text>
            </View>

            {/* EL ANTICIPO SE MUESTRA SIEMPRE, INCLUSO EN CERO, PARA QUE EL CHOFER
                SEPA QUE EL DATO SE CONSULTO Y NO QUE FALTA EN PANTALLA. */}
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
                style={{ color: theme.colors.warningForeground, fontSize: 11 }}
              >
                {`Saldo de anticipo no aplicado: Bs. ${formatMoney(remainingAdvance)}. Queda como credito a favor del cliente para la siguiente factura.`}
              </Text>
            )}

            {hasInvalidAdvance && (
              <Badge
                label="Anticipo mayor a la factura"
                tone="danger"
                emphasis="soft"
                size="sm"
              />
            )}
          </View>

          {/* RESUMEN FINANCIERO DINÁMICO DE COBRO */}
          <View
            style={{
              backgroundColor: theme.colors.secondary,
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
              <View>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                >
                  Total a Cobrar
                </Text>
                <Text
                  variant="header"
                  style={{ fontSize: 18, color: theme.colors.foreground }}
                >
                  Bs. {formatMoney(netAmountToCollect)}
                </Text>
                {appliedAdvance > 0 && (
                  <Text
                    variant="caption"
                    style={{
                      color: theme.colors.mutedForeground,
                      fontSize: 11,
                    }}
                  >
                    {`Factura Bs. ${formatMoney(TOTAL_ORDER_AMOUNT)} - Anticipo Bs. ${formatMoney(appliedAdvance)}`}
                  </Text>
                )}
              </View>

              <Badge
                label={
                  TOTAL_ORDER_AMOUNT === 0
                    ? "Selecciona productos"
                    : isFullyCoveredByAdvance
                      ? "Cubierto por Anticipo"
                      : pendingBalance === 0
                        ? "Cobrado 100%"
                        : `Pendiente: Bs. ${formatMoney(pendingBalance)}`
                }
                tone={
                  TOTAL_ORDER_AMOUNT === 0
                    ? "warning"
                    : isFullyCoveredByAdvance
                      ? "success"
                      : pendingBalance === 0
                        ? "success"
                        : "danger"
                }
                emphasis="soft"
                size="md"
              />
            </View>

            {/* BARRA VISUAL DE DESGLOSE DE COBRO */}
            <View style={{ gap: 4 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  variant="caption"
                  style={{ fontSize: 11, color: theme.colors.mutedForeground }}
                >
                  Cobrado:{" "}
                  <Text
                    variant="label"
                    style={{ fontSize: 11, color: theme.colors.success }}
                  >
                    Bs. {formatMoney(totalPaid)}
                  </Text>
                </Text>
                <Text
                  variant="caption"
                  style={{ fontSize: 11, color: theme.colors.mutedForeground }}
                >
                  {netAmountToCollect > 0
                    ? Math.min(
                        100,
                        Math.max(
                          0,
                          Math.round((totalPaid / netAmountToCollect) * 100),
                        ),
                      )
                    : 0}
                  %
                </Text>
              </View>

              <View
                style={{
                  height: 6,
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${netAmountToCollect > 0 ? Math.min(100, Math.max(0, (totalPaid / netAmountToCollect) * 100)) : isFullyCoveredByAdvance ? 100 : 0}%`,
                    height: "100%",
                    backgroundColor:
                      (netAmountToCollect > 0 || isFullyCoveredByAdvance) &&
                      pendingBalance === 0
                        ? "#22c55e"
                        : theme.colors.primary,
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          </View>
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

        {/* 2. DUAL-TAB CONTROL: [PRODUCTOS & POD] vs [REGISTRO DE COBRO (Solo Habilitado en ARRIVED)] */}
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
              flexDirection: "row",
              gap: 6,
              elevation: activeTab === "productos" ? 1 : 0,
            }}
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
              flexDirection: "row",
              gap: 6,
              opacity: isPaymentEnabled ? 1 : 0.5,
              elevation: activeTab === "cobro" ? 1 : 0,
            }}
          >
            {isPaymentEnabled ? (
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
          </TouchableOpacity>
        </View>

        {/* TAB 1: PRODUCTOS A DESCARGAR Y PROOF OF DELIVERY (POD) */}
        {activeTab === "productos" && (
          <View style={{ gap: 16 }}>
            {/* LISTA DE PRODUCTOS CON CHECKBOX DE VERIFICACIÓN */}
            <View style={{ gap: 10 }}>
              {/* ENCABEZADO CON TITULO LIMPIO Y BOTÓN DE MARCAR TODOS */}
              <View style={{ gap: 4 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    variant="title"
                    style={{ fontSize: 16, color: theme.colors.foreground }}
                  >
                    Productos a Descargar
                  </Text>

                  <TouchableOpacity
                    onPress={toggleCheckAll}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: isAllChecked
                        ? theme.colors.primarySoft
                        : theme.colors.secondary,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isAllChecked
                        ? theme.colors.primary
                        : theme.colors.border,
                    }}
                  >
                    {isAllChecked ? (
                      <CheckSquare size={15} color={theme.colors.primary} />
                    ) : (
                      <Square size={15} color={theme.colors.mutedForeground} />
                    )}
                    <Text
                      variant="caption"
                      style={{
                        fontWeight: "700",
                        color: isAllChecked
                          ? theme.colors.primary
                          : theme.colors.foreground,
                        fontSize: 12,
                      }}
                    >
                      {isAllChecked ? "Todos verificados" : "Marcar Todos"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text
                  variant="caption"
                  style={{ color: theme.colors.mutedForeground, fontSize: 12 }}
                >
                  Progreso:{" "}
                  <Text
                    variant="label"
                    style={{
                      fontSize: 12,
                      color: theme.colors.primary,
                      fontWeight: "700",
                    }}
                  >
                    {checkedItemIds.length} de {items.length} verificados
                  </Text>
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: theme.colors.cardBackground,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  overflow: "hidden",
                }}
              >
                {items.map((item, index) => {
                  const isLast = index === items.length - 1;
                  const isChecked = checkedItemIds.includes(item.id);

                  return (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: theme.colors.border,
                        backgroundColor: isChecked
                          ? "transparent"
                          : theme.colors.secondary + "40",
                        gap: 10,
                      }}
                    >
                      {/* CHECKBOX A LA IZQUIERDA */}
                      <TouchableOpacity
                        onPress={() => toggleCheckItem(item.id)}
                        activeOpacity={0.7}
                        style={{ paddingVertical: 4 }}
                      >
                        {isChecked ? (
                          <CheckSquare size={22} color={theme.colors.primary} />
                        ) : (
                          <Square
                            size={22}
                            color={theme.colors.mutedForeground}
                          />
                        )}
                      </TouchableOpacity>

                      {/* DETALLE DEL PRODUCTO (FLEX 1 CON TRUNCADO CONTROLADO) */}
                      <View style={{ flex: 1, gap: 3, overflow: "hidden" }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <Text
                            variant="label"
                            style={{
                              fontWeight: "700",
                              fontSize: 12,
                              color: isChecked
                                ? theme.colors.foreground
                                : theme.colors.mutedForeground,
                            }}
                          >
                            {item.codigo}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: theme.colors.mutedForeground,
                            }}
                          >
                            •
                          </Text>
                          <Text
                            variant="bodySmall"
                            style={{
                              flex: 1,
                              fontSize: 13,
                              fontWeight: "500",
                              color: isChecked
                                ? theme.colors.foreground
                                : theme.colors.mutedForeground,
                            }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {item.nombre}
                          </Text>
                          {item.isCold && (
                            <View style={{ flexShrink: 0, marginLeft: 2 }}>
                              <Snowflake
                                size={14}
                                color={theme.colors.primary}
                              />
                            </View>
                          )}
                        </View>

                        <Text
                          variant="caption"
                          style={{
                            color: theme.colors.mutedForeground,
                            fontSize: 11,
                          }}
                        >
                          Bs. {formatMoney(item.unitPrice)} c/u •{" "}
                          <Text
                            variant="label"
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: theme.colors.foreground,
                            }}
                          >
                            Subtotal: Bs.{" "}
                            {formatMoney(
                              (item.deliveredQty || 0) * (item.unitPrice || 0),
                            )}
                          </Text>
                        </Text>
                      </View>

                      {/* BADGE DE CANTIDAD ENTREGADA (ANCHO FIJO A LA DERECHA SIN TRASLAPE) */}
                      <View
                        style={{
                          flexShrink: 0,
                          backgroundColor: isChecked
                            ? theme.colors.successSoft
                            : theme.colors.secondary,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: isChecked
                            ? theme.colors.success + "40"
                            : theme.colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: isChecked
                              ? theme.colors.success
                              : theme.colors.mutedForeground,
                          }}
                        >
                          {item.deliveredQty} {item.unit || "unid"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* COMPROBANTE POD */}
            <View
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 16,
                gap: 12,
              }}
            >
              <Text variant="title" style={{ fontSize: 16 }}>
                Comprobante de Recepcion (POD)
              </Text>

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

              {stop.status == "ARRIVED" && (
                <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                  <TouchableOpacity
                    onPress={handleSimulatePhoto}
                    style={{
                      flex: 1,
                      backgroundColor: hasPhoto
                        ? theme.colors.successSoft
                        : theme.colors.secondary,
                      borderWidth: 1,
                      borderColor: hasPhoto
                        ? theme.colors.success
                        : theme.colors.border,
                      borderRadius: 10,
                      paddingVertical: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <Camera
                      size={20}
                      color={
                        hasPhoto
                          ? theme.colors.success
                          : theme.colors.mutedForeground
                      }
                    />
                    <Text
                      variant="label"
                      style={{
                        fontSize: 12,
                        color: hasPhoto
                          ? theme.colors.success
                          : theme.colors.foreground,
                      }}
                    >
                      {hasPhoto ? "Foto Adjunta" : "Tomar Foto POD"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleOpenSignaturePad}
                    style={{
                      flex: 1,
                      backgroundColor: hasSignature
                        ? theme.colors.successSoft
                        : theme.colors.secondary,
                      borderWidth: 1,
                      borderColor: hasSignature
                        ? theme.colors.success
                        : theme.colors.border,
                      borderRadius: 10,
                      paddingVertical: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <FileSignature
                      size={20}
                      color={
                        hasSignature
                          ? theme.colors.success
                          : theme.colors.mutedForeground
                      }
                    />
                    <Text
                      variant="label"
                      style={{
                        fontSize: 12,
                        color: hasSignature
                          ? theme.colors.success
                          : theme.colors.foreground,
                      }}
                    >
                      {hasSignature ? "Firma Registrada" : "Firma Digital"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PREVISUALIZACION DE SOLO LECTURA DE LA FIRMA CAPTURADA */}
              {hasSignature && (
                <View style={{ gap: 6 }}>
                  <View
                    style={{
                      height: 70,
                      backgroundColor: theme.colors.secondary,
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
                          stroke={theme.colors.foreground}
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

            {/* BOTÓN PARA PASAR AL COBRO */}
            {stop.status == "ARRIVED" && (
              <Button
                label="Continuar al Registro de Cobro"
                variant="primary"
                size="md"
                fullWidth
                onPress={() => handleSelectTab("cobro")}
              />
            )}
          </View>
        )}

        {/* TAB 2: MÓDULO COMPLETO DE REGISTRO DE COBRO (Habilitado en ARRIVED) */}
        {activeTab === "cobro" && (
          <View style={{ gap: 16 }}>
            {/* TARJETA DE SELECTOR DE MÉTODOS DE COBRO */}
            <View
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 16,
                gap: 14,
              }}
            >
              <View style={{ gap: 2 }}>
                <Text variant="title" style={{ fontSize: 16 }}>
                  Seleccionar Metodo de Pago
                </Text>
                <Text
                  variant="caption"
                  style={{ fontSize: 11, color: theme.colors.mutedForeground }}
                >
                  Toca un metodo para registrar el cobro.
                </Text>
              </View>

              {/* GRID DE LOS 4 MÉTODOS DE COBRO */}
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {PAYMENT_METHOD_OPTIONS.map((option) => {
                  const isSelected = selectedMethod === option.method;
                  const registeredCount = payments.filter(
                    (p) => p.method === option.method,
                  ).length;
                  const MethodIcon = option.icon;

                  return (
                    <TouchableOpacity
                      key={option.method}
                      onPress={() => handleSelectPaymentMethod(option.method)}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        minWidth: "45%",
                        backgroundColor: isSelected
                          ? theme.colors.primarySoft
                          : theme.colors.secondary,
                        borderWidth: 1.5,
                        borderColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.border,
                        borderRadius: 12,
                        padding: 12,
                        alignItems: "center",
                        gap: 6,
                        opacity: isFullyCoveredByAdvance ? 0.55 : 1,
                      }}
                    >
                      <MethodIcon
                        size={22}
                        color={
                          isSelected
                            ? theme.colors.primary
                            : theme.colors.mutedForeground
                        }
                      />
                      <Text
                        variant="label"
                        style={{
                          fontSize: 12,
                          color: isSelected
                            ? theme.colors.primary
                            : theme.colors.foreground,
                          fontWeight: isSelected ? "700" : "500",
                        }}
                      >
                        {option.pickerLabel}
                      </Text>

                      {/* MARCA DE COBRO YA REGISTRADO CON ESE METODO */}
                      {registeredCount > 0 && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Check size={11} color={theme.colors.success} />
                          <Text
                            variant="caption"
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: theme.colors.success,
                            }}
                          >
                            {registeredCount > 1
                              ? `${registeredCount} cobros`
                              : "Registrado"}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* AVISO: EL ANTICIPO CUBRE TODA LA ENTREGA, NO HAY COBRO EN SITIO */}
              {isFullyCoveredByAdvance && (
                <View
                  style={{
                    marginTop: 6,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                  }}
                >
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
                      Esta entrega queda cubierta por el anticipo. No
                      corresponde cobro en sitio.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* HISTORIAL DINÁMICO DE COBROS REGISTRADOS */}
            <View style={{ gap: 10 }}>
              <Text variant="title" style={{ fontSize: 16 }}>
                Pagos Registrados ({payments.length})
              </Text>

              {payments.length === 0 ? (
                <View
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    padding: 20,
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <DollarSign size={24} color={theme.colors.mutedForeground} />
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.mutedForeground }}
                  >
                    Aun no has registrado ningun pago para este pedido.
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
                  {payments.map((p, idx) => (
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
                      <View style={{ gap: 2 }}>
                        <Text
                          variant="label"
                          style={{ fontSize: 14, fontWeight: "700" }}
                        >
                          {p.method === "CASH"
                            ? "Efectivo"
                            : p.method === "TRANSFER"
                              ? `Transferencia (${p.bank})`
                              : p.method === "QR"
                                ? "Pago QR Banco"
                                : `Cheque (${p.bank})`}
                        </Text>
                        <Text
                          variant="caption"
                          style={{
                            color: theme.colors.mutedForeground,
                            fontSize: 11,
                          }}
                        >
                          Ref: {p.reference || "N/A"}{" "}
                          {p.hasPhoto ? "• Foto" : ""}
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Text
                          variant="label"
                          style={{
                            fontSize: 15,
                            fontWeight: "800",
                            color: theme.colors.primary,
                          }}
                        >
                          Bs. {formatMoney(p.amount)}
                        </Text>

                        <TouchableOpacity
                          onPress={() => handleRemovePayment(p.id)}
                        >
                          <Trash2 size={16} color={theme.colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* BOTÓN PRINCIPAL FINALIZAR ENTREGA */}
            {stop.status !== "DELIVERED" && (
              <Button
                label="Finalizar Entrega"
                variant="success"
                size="md"
                fullWidth
                icon={CheckCircle2}
                onPress={handleConfirmFinalDelivery}
              />
            )}
          </View>
        )}
      </ScrollView>

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
        onClose={() => setIsPaymentModalOpen(false)}
        onSubmit={paymentSubmit.onPress}
        submitLabel={paymentSubmit.label}
        submitIcon={paymentSubmit.icon}
        submitDisabled={paymentSubmit.disabled}
        submitLoading={paymentSubmit.loading}
        closeDisabled={isPaymentModalLocked}
      >
        {renderPaymentForm()}
      </PaymentMethodModal>

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
    </View>
  );
};
