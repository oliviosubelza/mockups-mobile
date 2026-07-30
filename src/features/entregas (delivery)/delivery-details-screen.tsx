import { useState, useMemo } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  MapPin,
  Phone,
  Clock,
  Package,
  CheckCircle2,
  AlertTriangle,
  Camera,
  FileSignature,
  Snowflake,
  ArrowLeft,
  Banknote,
  Building,
  QrCode,
  FileText,
  DollarSign,
  Plus,
  Trash2,
  Store,
  X,
  CheckSquare,
  Square,
  RefreshCw,
  Lock,
  ShieldCheck,
  ClipboardList,
  Navigation,
} from "lucide-react-native";

import { findRouteById, navigateTo } from "@/navigation/registry";
import { Badge, Button, AppDialog, type DialogType } from "@/shared/ui";
import { SuccessDialog } from "@/shared/ui/SuccessDialog";
import { Text, useAppTheme } from "@/theme";
import { getSelectedStop } from "./data/delivery-store";
import { SANTA_CRUZ_STOPS_COORDINATES } from "./data/santa-cruz-route";
import type { EstadoEntrega } from "./types";

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

type PaymentMethodType = "CASH" | "TRANSFER" | "QR" | "CHECK";

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
  const [currentStatus, setCurrentStatus] = useState<EstadoEntrega>(stop.status);

  // VALIDACIÓN CLAVE: EL COBRO Y DESCARGA SE HABILITA AL INICIAR LA ENTREGA (ESTADO: ARRIVED O DELIVERED)
  const isPaymentEnabled = currentStatus === "ARRIVED" || currentStatus === "DELIVERED";

  // Estado de Productos y POD
  const [items, setItems] = useState<DeliveryItem[]>(MOCK_ITEMS);
  const [checkedItemIds, setCheckedItemIds] = useState<string[]>([]);

  // CÁLCULO DINÁMICO DEL TOTAL A COBRAR EN BASE A LOS PRODUCTOS MARCADOS (TICKEADOS) POR EL CHOFER
  const TOTAL_ORDER_AMOUNT = useMemo(() => {
    return items
      .filter((item) => checkedItemIds.includes(item.id))
      .reduce(
        (acc, item) => acc + (item.deliveredQty || 0) * (item.unitPrice || 0),
        0
      );
  }, [items, checkedItemIds]);

  // Tab Principal: 'productos' vs 'cobro'
  const [activeTab, setActiveTab] = useState<"productos" | "cobro">(
    "productos",
  );

  const isAllChecked = items.length > 0 && checkedItemIds.length === items.length;

  const toggleCheckAll = () => {
    if (isAllChecked) {
      setCheckedItemIds([]);
    } else {
      setCheckedItemIds(items.map((item) => item.id));
    }
  };

  const toggleCheckItem = (id: string) => {
    setCheckedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  const [receiverName, setReceiverName] = useState(
    stop.contactName || "Ing. Fernando Roca",
  );
  const [receiverDoc, setReceiverDoc] = useState("4829102 SC");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Estado del Módulo de Registro de Incidencias
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [incidentCategory, setIncidentCategory] = useState<string>("LOCAL_CERRADO");
  const [incidentNotes, setIncidentNotes] = useState("");
  const [incidentPhoto, setIncidentPhoto] = useState(false);
  const [incidentItemName, setIncidentItemName] = useState<string>("Toda la Entrega");

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
        const route = findRouteById("entregas.ruta");
        if (route) navigateTo(route);
      }
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
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // Formularios de Cobro
  const [cashAmount, setCashAmount] = useState(TOTAL_ORDER_AMOUNT.toString());
  const [cashReceiptNo, setCashReceiptNo] = useState("REC-00982");
  const [cashPhoto, setCashPhoto] = useState(false);

  const [transferAmount, setTransferAmount] = useState(
    TOTAL_ORDER_AMOUNT.toString(),
  );
  const [transferBank, setTransferBank] = useState(
    "Banco Mercantil Santa Cruz",
  );
  const [transferRef, setTransferRef] = useState("TRX-9948201");
  const [transferPhoto, setTransferPhoto] = useState(false);

  const [checkAmount, setCheckAmount] = useState(TOTAL_ORDER_AMOUNT.toString());
  const [checkBank, setCheckBank] = useState("Banco Nacional de Bolivia (BNB)");
  const [checkNo, setCheckNo] = useState("CHK-449012");
  const [checkHolder, setCheckHolder] = useState(
    stop.clientName || "Cliente Santa Cruz",
  );
  const [checkPhoto, setCheckPhoto] = useState(false);

  // Estado de Pago por QR
  const [qrAmount, setQrAmount] = useState(TOTAL_ORDER_AMOUNT.toString());
  const [qrStatus, setQrStatus] = useState<
    "PENDING" | "VALIDATING" | "APPROVED"
  >("PENDING");

  // CÁLCULOS DINÁMICOS DE SALDO PENDIENTE
  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const pendingBalance = Math.max(0, TOTAL_ORDER_AMOUNT - totalPaid);

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
    const route = findRouteById("entregas.ruta");
    if (route) navigateTo(route);
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

  const handleStartDelivery = () => {
    setCurrentStatus("ARRIVED");
    showDialog(
      "🚚 Entrega Iniciada",
      `Has marcado llegada a la parada de ${stop.clientName}. Ya puedes verificar los productos a descargar y procesar el cobro.`,
      "success"
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

  const handleSimulateSignature = () => {
    setHasSignature(true);
    showDialog(
      "Firma Registrada",
      "Firma digital de recepcion guardada correctamente.",
      "success",
    );
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

  // BOTÓN PAGAR CON QR
  const handlePayWithQr = () => {
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
        TOTAL_ORDER_AMOUNT -
          newPayments.reduce((a, p) => a + (p.amount || 0), 0),
      );
      setCashAmount(newPending.toString());
      setTransferAmount(newPending.toString());
      setCheckAmount(newPending.toString());
      setQrAmount(newPending.toString());
      setQrStatus("APPROVED");
      showDialog(
        "Pago por QR Confirmado",
        `El banco ha verificado el pago de Bs. ${formatMoney(amt)} correctamente.`,
        "success",
      );
    }, 2000);
  };

  // AGREGAR COBROS INDIVIDUALES / PARCIALES
  const handleAddCashPayment = () => {
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
      hasPhoto: cashPhoto,
    };
    const newPayments = [...payments, newPayment];
    setPayments(newPayments);
    const newPending = Math.max(
      0,
      TOTAL_ORDER_AMOUNT - newPayments.reduce((a, p) => a + (p.amount || 0), 0),
    );
    setCashAmount(newPending.toString());
    setTransferAmount(newPending.toString());
    setCheckAmount(newPending.toString());
    setQrAmount(newPending.toString());
    showDialog(
      "Cobro Registrado",
      `Se registraron Bs. ${formatMoney(amt)} en efectivo.`,
      "success",
    );
  };

  const handleAddTransferPayment = () => {
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
      TOTAL_ORDER_AMOUNT - newPayments.reduce((a, p) => a + (p.amount || 0), 0),
    );
    setCashAmount(newPending.toString());
    setTransferAmount(newPending.toString());
    setCheckAmount(newPending.toString());
    setQrAmount(newPending.toString());
    showDialog(
      "Transferencia Registrada",
      `Se registraron Bs. ${formatMoney(amt)} por transferencia.`,
      "success",
    );
  };

  const handleAddCheckPayment = () => {
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
      TOTAL_ORDER_AMOUNT - newPayments.reduce((a, p) => a + (p.amount || 0), 0),
    );
    setCashAmount(newPending.toString());
    setTransferAmount(newPending.toString());
    setCheckAmount(newPending.toString());
    setQrAmount(newPending.toString());
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
      TOTAL_ORDER_AMOUNT - newPayments.reduce((a, p) => a + (p.amount || 0), 0),
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
    setShowSuccess(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
      >
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
              label={getStatusLabel(stop.status)}
              tone={getStatusTone(stop.status)}
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

            {/* BOTONES DE ACCIÓN RÁPIDA: INICIAR ENTREGA, CÓMO LLEGAR, REGISTRAR VISITA & INCIDENCIA */}
            <View style={{ gap: 8, marginTop: 4 }}>
              {currentStatus !== "ARRIVED" && currentStatus !== "DELIVERED" && (
                <Button
                  label="Iniciar Entrega (Marcar Llegada)"
                  icon={CheckCircle2}
                  variant="primary"
                  size="md"
                  fullWidth
                  onPress={handleStartDelivery}
                />
              )}

              <Button
                label="Cómo Llegar (Abrir en Google Maps)"
                icon={Navigation}
                variant="outline"
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
                  Bs. {formatMoney(TOTAL_ORDER_AMOUNT)}
                </Text>
              </View>

              <Badge
                label={
                  TOTAL_ORDER_AMOUNT === 0
                    ? "Selecciona productos"
                    : pendingBalance === 0
                    ? "Cobrado 100%"
                    : `Pendiente: Bs. ${formatMoney(pendingBalance)}`
                }
                tone={
                  TOTAL_ORDER_AMOUNT === 0
                    ? "warning"
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
                  {TOTAL_ORDER_AMOUNT > 0
                    ? Math.min(100, Math.max(0, Math.round((totalPaid / TOTAL_ORDER_AMOUNT) * 100)))
                    : 0}%
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
                    width: `${TOTAL_ORDER_AMOUNT > 0 ? Math.min(100, Math.max(0, (totalPaid / TOTAL_ORDER_AMOUNT) * 100)) : 0}%`,
                    height: "100%",
                    backgroundColor:
                      TOTAL_ORDER_AMOUNT > 0 && pendingBalance === 0 ? "#22c55e" : theme.colors.primary,
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
                  Rechazo parcial por empaque secundario dañado durante el trayecto.
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
                  <Text variant="title" style={{ fontSize: 16, color: theme.colors.foreground }}>
                    Productos a Descargar
                  </Text>

                  <TouchableOpacity
                    onPress={toggleCheckAll}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: isAllChecked ? theme.colors.primarySoft : theme.colors.secondary,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isAllChecked ? theme.colors.primary : theme.colors.border,
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
                        color: isAllChecked ? theme.colors.primary : theme.colors.foreground,
                        fontSize: 12,
                      }}
                    >
                      {isAllChecked ? "Todos verificados" : "Marcar Todos"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
                  Progreso: <Text variant="label" style={{ fontSize: 12, color: theme.colors.primary, fontWeight: "700" }}>{checkedItemIds.length} de {items.length} verificados</Text>
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
                        backgroundColor: isChecked ? "transparent" : theme.colors.secondary + "40",
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
                          <Square size={22} color={theme.colors.mutedForeground} />
                        )}
                      </TouchableOpacity>

                      {/* DETALLE DEL PRODUCTO (FLEX 1 CON TRUNCADO CONTROLADO) */}
                      <View style={{ flex: 1, gap: 3, overflow: "hidden" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <Text
                            variant="label"
                            style={{
                              fontWeight: "700",
                              fontSize: 12,
                              color: isChecked ? theme.colors.foreground : theme.colors.mutedForeground,
                            }}
                          >
                            {item.codigo}
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.colors.mutedForeground }}>•</Text>
                          <Text
                            variant="bodySmall"
                            style={{
                              flex: 1,
                              fontSize: 13,
                              fontWeight: "500",
                              color: isChecked ? theme.colors.foreground : theme.colors.mutedForeground,
                            }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {item.nombre}
                          </Text>
                          {item.isCold && (
                            <View style={{ flexShrink: 0, marginLeft: 2 }}>
                              <Snowflake size={14} color={theme.colors.primary} />
                            </View>
                          )}
                        </View>

                        <Text
                          variant="caption"
                          style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                        >
                          Bs. {formatMoney(item.unitPrice)} c/u • <Text variant="label" style={{ fontSize: 11, fontWeight: "700", color: theme.colors.foreground }}>Subtotal: Bs. {formatMoney((item.deliveredQty || 0) * (item.unitPrice || 0))}</Text>
                        </Text>
                      </View>

                      {/* BADGE DE CANTIDAD ENTREGADA (ANCHO FIJO A LA DERECHA SIN TRASLAPE) */}
                      <View
                        style={{
                          flexShrink: 0,
                          backgroundColor: isChecked ? theme.colors.successSoft : theme.colors.secondary,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: isChecked ? theme.colors.success + "40" : theme.colors.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: isChecked ? theme.colors.success : theme.colors.mutedForeground,
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
                    onPress={handleSimulateSignature}
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
              <Text variant="title" style={{ fontSize: 16 }}>
                Seleccionar Metodo de Pago
              </Text>

              {/* GRID DE LOS 4 MÉTODOS DE COBRO */}
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <TouchableOpacity
                  onPress={() => setSelectedMethod("CASH")}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    minWidth: "45%",
                    backgroundColor:
                      selectedMethod === "CASH"
                        ? theme.colors.primarySoft
                        : theme.colors.secondary,
                    borderWidth: 1.5,
                    borderColor:
                      selectedMethod === "CASH"
                        ? theme.colors.primary
                        : theme.colors.border,
                    borderRadius: 12,
                    padding: 12,
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Banknote
                    size={22}
                    color={
                      selectedMethod === "CASH"
                        ? theme.colors.primary
                        : theme.colors.mutedForeground
                    }
                  />
                  <Text
                    variant="label"
                    style={{
                      fontSize: 12,
                      color:
                        selectedMethod === "CASH"
                          ? theme.colors.primary
                          : theme.colors.foreground,
                      fontWeight: selectedMethod === "CASH" ? "700" : "500",
                    }}
                  >
                    1. Efectivo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedMethod("TRANSFER")}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    minWidth: "45%",
                    backgroundColor:
                      selectedMethod === "TRANSFER"
                        ? theme.colors.primarySoft
                        : theme.colors.secondary,
                    borderWidth: 1.5,
                    borderColor:
                      selectedMethod === "TRANSFER"
                        ? theme.colors.primary
                        : theme.colors.border,
                    borderRadius: 12,
                    padding: 12,
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Building
                    size={22}
                    color={
                      selectedMethod === "TRANSFER"
                        ? theme.colors.primary
                        : theme.colors.mutedForeground
                    }
                  />
                  <Text
                    variant="label"
                    style={{
                      fontSize: 12,
                      color:
                        selectedMethod === "TRANSFER"
                          ? theme.colors.primary
                          : theme.colors.foreground,
                      fontWeight: selectedMethod === "TRANSFER" ? "700" : "500",
                    }}
                  >
                    2. Transferencia
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedMethod("QR")}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    minWidth: "45%",
                    backgroundColor:
                      selectedMethod === "QR"
                        ? theme.colors.primarySoft
                        : theme.colors.secondary,
                    borderWidth: 1.5,
                    borderColor:
                      selectedMethod === "QR"
                        ? theme.colors.primary
                        : theme.colors.border,
                    borderRadius: 12,
                    padding: 12,
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <QrCode
                    size={22}
                    color={
                      selectedMethod === "QR"
                        ? theme.colors.primary
                        : theme.colors.mutedForeground
                    }
                  />
                  <Text
                    variant="label"
                    style={{
                      fontSize: 12,
                      color:
                        selectedMethod === "QR"
                          ? theme.colors.primary
                          : theme.colors.foreground,
                      fontWeight: selectedMethod === "QR" ? "700" : "500",
                    }}
                  >
                    3. Pago QR (Banco)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedMethod("CHECK")}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    minWidth: "45%",
                    backgroundColor:
                      selectedMethod === "CHECK"
                        ? theme.colors.primarySoft
                        : theme.colors.secondary,
                    borderWidth: 1.5,
                    borderColor:
                      selectedMethod === "CHECK"
                        ? theme.colors.primary
                        : theme.colors.border,
                    borderRadius: 12,
                    padding: 12,
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <FileText
                    size={22}
                    color={
                      selectedMethod === "CHECK"
                        ? theme.colors.primary
                        : theme.colors.mutedForeground
                    }
                  />
                  <Text
                    variant="label"
                    style={{
                      fontSize: 12,
                      color:
                        selectedMethod === "CHECK"
                          ? theme.colors.primary
                          : theme.colors.foreground,
                      fontWeight: selectedMethod === "CHECK" ? "700" : "500",
                    }}
                  >
                    4. Cheque
                  </Text>
                </TouchableOpacity>
              </View>

              {/* FORMULARIO ESPECÍFICO SEGÚN EL MÉTODO SELECCIONADO */}
              <View
                style={{
                  marginTop: 6,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                  gap: 12,
                }}
              >
                {/* 1. EFECTIVO */}
                {selectedMethod === "CASH" && (
                  <View style={{ gap: 10 }}>
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
                          Monto en Efectivo Recibido (Bs.)
                        </Text>
                        <View style={{ flexDirection: "row", gap: 4 }}>
                          <TouchableOpacity
                            onPress={() =>
                              setCashAmount((TOTAL_ORDER_AMOUNT / 2).toString())
                            }
                            style={{
                              backgroundColor: theme.colors.secondary,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: theme.colors.primary,
                              }}
                            >
                              50%
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              setCashAmount(pendingBalance.toString())
                            }
                            style={{
                              backgroundColor: theme.colors.secondary,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: theme.colors.primary,
                              }}
                            >
                              Saldo Pend.
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TextInput
                        value={cashAmount}
                        onChangeText={setCashAmount}
                        keyboardType="numeric"
                        style={{
                          backgroundColor: theme.colors.secondary,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 15,
                          fontWeight: "700",
                          color: theme.colors.foreground,
                        }}
                      />
                    </View>

                    <View>
                      <Text
                        variant="label"
                        style={{ marginBottom: 4, fontSize: 13 }}
                      >
                        Nro. de Recibo / Nota Manual
                      </Text>
                      <TextInput
                        value={cashReceiptNo}
                        onChangeText={setCashReceiptNo}
                        style={{
                          backgroundColor: theme.colors.secondary,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 14,
                          color: theme.colors.foreground,
                        }}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        setCashPhoto(true);
                        showDialog(
                          "Foto Adjunta",
                          "Se tomo foto del arqueo en efectivo.",
                          "success",
                        );
                      }}
                      style={{
                        backgroundColor: cashPhoto
                          ? theme.colors.successSoft
                          : theme.colors.secondary,
                        borderWidth: 1,
                        borderColor: cashPhoto
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
                          cashPhoto
                            ? theme.colors.success
                            : theme.colors.mutedForeground
                        }
                      />
                      <Text
                        variant="label"
                        style={{
                          fontSize: 12,
                          color: cashPhoto
                            ? theme.colors.success
                            : theme.colors.foreground,
                        }}
                      >
                        {cashPhoto
                          ? "Foto Billetes Adjunta"
                          : "Tomar Foto de Billetes (Opcional)"}
                      </Text>
                    </TouchableOpacity>

                    <Button
                      label="Agregar Pago en Efectivo"
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      fullWidth
                      onPress={handleAddCashPayment}
                    />
                  </View>
                )}

                {/* 2. TRANSFERENCIA BANCARIA */}
                {selectedMethod === "TRANSFER" && (
                  <View style={{ gap: 10 }}>
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
                          Monto Transferido (Bs.)
                        </Text>
                        <View style={{ flexDirection: "row", gap: 4 }}>
                          <TouchableOpacity
                            onPress={() =>
                              setTransferAmount(
                                (TOTAL_ORDER_AMOUNT / 2).toString(),
                              )
                            }
                            style={{
                              backgroundColor: theme.colors.secondary,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: theme.colors.primary,
                              }}
                            >
                              50%
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              setTransferAmount(pendingBalance.toString())
                            }
                            style={{
                              backgroundColor: theme.colors.secondary,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: theme.colors.primary,
                              }}
                            >
                              Saldo Pend.
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TextInput
                        value={transferAmount}
                        onChangeText={setTransferAmount}
                        keyboardType="numeric"
                        style={{
                          backgroundColor: theme.colors.secondary,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 15,
                          fontWeight: "700",
                          color: theme.colors.foreground,
                        }}
                      />
                    </View>

                    <View>
                      <Text
                        variant="label"
                        style={{ marginBottom: 4, fontSize: 13 }}
                      >
                        Banco Origen
                      </Text>
                      <TextInput
                        value={transferBank}
                        onChangeText={setTransferBank}
                        style={{
                          backgroundColor: theme.colors.secondary,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 14,
                          color: theme.colors.foreground,
                        }}
                      />
                    </View>

                    <View>
                      <Text
                        variant="label"
                        style={{ marginBottom: 4, fontSize: 13 }}
                      >
                        Nro. de Transaccion / Referencia
                      </Text>
                      <TextInput
                        value={transferRef}
                        onChangeText={setTransferRef}
                        style={{
                          backgroundColor: theme.colors.secondary,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 14,
                          color: theme.colors.foreground,
                        }}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        setTransferPhoto(true);
                        showDialog(
                          "Comprobante Adjunto",
                          "Foto del comprobante bancario guardada.",
                          "success",
                        );
                      }}
                      style={{
                        backgroundColor: transferPhoto
                          ? theme.colors.successSoft
                          : theme.colors.secondary,
                        borderWidth: 1,
                        borderColor: transferPhoto
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
                          transferPhoto
                            ? theme.colors.success
                            : theme.colors.mutedForeground
                        }
                      />
                      <Text
                        variant="label"
                        style={{
                          fontSize: 12,
                          color: transferPhoto
                            ? theme.colors.success
                            : theme.colors.foreground,
                        }}
                      >
                        {transferPhoto
                          ? "Foto Comprobante Adjunta"
                          : "Tomar Foto Comprobante (Requerido)"}
                      </Text>
                    </TouchableOpacity>

                    <Button
                      label="Agregar Transferencia"
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      fullWidth
                      onPress={handleAddTransferPayment}
                    />
                  </View>
                )}

                {/* 3. PAGO POR QR (MONTO EDITABLE + BOTÓN PAGAR CON ANIMACIÓN BANCARIA) */}
                {selectedMethod === "QR" && (
                  <View
                    style={{
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <View style={{ alignSelf: "stretch", gap: 6 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text variant="label" style={{ fontSize: 13 }}>
                          Monto a Cobrar por QR (Bs.)
                        </Text>
                        <View style={{ flexDirection: "row", gap: 4 }}>
                          <TouchableOpacity
                            onPress={() => {
                              setQrAmount((TOTAL_ORDER_AMOUNT / 2).toString());
                              setQrStatus("PENDING");
                            }}
                            style={{
                              backgroundColor: theme.colors.secondary,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: theme.colors.primary,
                              }}
                            >
                              50%
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              setQrAmount(pendingBalance.toString());
                              setQrStatus("PENDING");
                            }}
                            style={{
                              backgroundColor: theme.colors.secondary,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: theme.colors.primary,
                              }}
                            >
                              Saldo Pend.
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TextInput
                        value={qrAmount}
                        onChangeText={(val) => {
                          setQrAmount(val);
                          setQrStatus("PENDING");
                        }}
                        keyboardType="numeric"
                        style={{
                          backgroundColor: theme.colors.secondary,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 15,
                          fontWeight: "700",
                          color: theme.colors.foreground,
                        }}
                      />
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

                    {/* BOTÓN PAGAR CON QR Y ANIMACIÓN EN TIEMPO REAL BANCARIO */}
                    {qrStatus === "APPROVED" ? (
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
                    ) : (
                      <Button
                        label={
                          qrStatus === "VALIDATING"
                            ? "Validando transferencia con el banco..."
                            : "Pagar con QR"
                        }
                        variant="primary"
                        size="md"
                        fullWidth
                        icon={RefreshCw}
                        loading={qrStatus === "VALIDATING"}
                        onPress={handlePayWithQr}
                      />
                    )}
                  </View>
                )}

                {/* 4. CHEQUE */}
                {selectedMethod === "CHECK" && (
                  <View style={{ gap: 10 }}>
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
                          Monto del Cheque (Bs.)
                        </Text>
                        <View style={{ flexDirection: "row", gap: 4 }}>
                          <TouchableOpacity
                            onPress={() =>
                              setCheckAmount(
                                (TOTAL_ORDER_AMOUNT / 2).toString(),
                              )
                            }
                            style={{
                              backgroundColor: theme.colors.secondary,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: theme.colors.primary,
                              }}
                            >
                              50%
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              setCheckAmount(pendingBalance.toString())
                            }
                            style={{
                              backgroundColor: theme.colors.secondary,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: theme.colors.primary,
                              }}
                            >
                              Saldo Pend.
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TextInput
                        value={checkAmount}
                        onChangeText={setCheckAmount}
                        keyboardType="numeric"
                        style={{
                          backgroundColor: theme.colors.secondary,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 15,
                          fontWeight: "700",
                          color: theme.colors.foreground,
                        }}
                      />
                    </View>

                    <View>
                      <Text
                        variant="label"
                        style={{ marginBottom: 4, fontSize: 13 }}
                      >
                        Banco Emisor
                      </Text>
                      <TextInput
                        value={checkBank}
                        onChangeText={setCheckBank}
                        style={{
                          backgroundColor: theme.colors.secondary,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          fontSize: 14,
                          color: theme.colors.foreground,
                        }}
                      />
                    </View>

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text
                          variant="label"
                          style={{ marginBottom: 4, fontSize: 13 }}
                        >
                          Nro. de Cheque
                        </Text>
                        <TextInput
                          value={checkNo}
                          onChangeText={setCheckNo}
                          style={{
                            backgroundColor: theme.colors.secondary,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            fontSize: 14,
                            color: theme.colors.foreground,
                          }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          variant="label"
                          style={{ marginBottom: 4, fontSize: 13 }}
                        >
                          Titular / Razon Social
                        </Text>
                        <TextInput
                          value={checkHolder}
                          onChangeText={setCheckHolder}
                          style={{
                            backgroundColor: theme.colors.secondary,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            fontSize: 14,
                            color: theme.colors.foreground,
                          }}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        setCheckPhoto(true);
                        showDialog(
                          "Foto Cheque Adjunta",
                          "Captura de frente y dorso guardada.",
                          "success",
                        );
                      }}
                      style={{
                        backgroundColor: checkPhoto
                          ? theme.colors.successSoft
                          : theme.colors.secondary,
                        borderWidth: 1,
                        borderColor: checkPhoto
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
                          checkPhoto
                            ? theme.colors.success
                            : theme.colors.mutedForeground
                        }
                      />
                      <Text
                        variant="label"
                        style={{
                          fontSize: 12,
                          color: checkPhoto
                            ? theme.colors.success
                            : theme.colors.foreground,
                        }}
                      >
                        {checkPhoto
                          ? "Foto Cheque Adjunta"
                          : "Tomar Foto Cheque (Requerido)"}
                      </Text>
                    </TouchableOpacity>

                    <Button
                      label="Agregar Cobro con Cheque"
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      fullWidth
                      onPress={handleAddCheckPayment}
                    />
                  </View>
                )}
              </View>
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
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
                  <Text variant="title" style={{ fontSize: 18, color: theme.colors.foreground, fontWeight: "700" }}>
                    Registrar Incidencia
                  </Text>
                  <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
                    Afecta a: {incidentItemName}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setIsIncidentModalOpen(false)} style={{ padding: 4 }}>
                <X size={20} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
              Selecciona el tipo de inconveniente registrado durante la entrega:
            </Text>

            {/* SELECTOR DE CATEGORÍAS */}
            <View style={{ gap: 8 }}>
              {Object.entries(incidentCategoriesMap).map(([key, label]) => {
                const isSelected = incidentCategory === key;
                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.8}
                    onPress={() => setIncidentCategory(key)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: isSelected ? theme.colors.dangerSoft : theme.colors.secondary,
                      borderWidth: isSelected ? 1.5 : 1,
                      borderColor: isSelected ? theme.colors.danger : theme.colors.border,
                      borderRadius: 12,
                      padding: 10,
                      paddingHorizontal: 12,
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 2,
                        borderColor: isSelected ? theme.colors.danger : theme.colors.mutedForeground,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSelected && (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: theme.colors.danger,
                          }}
                        />
                      )}
                    </View>
                    <Text
                      variant="label"
                      style={{
                        fontSize: 13,
                        color: isSelected ? theme.colors.danger : theme.colors.foreground,
                        fontWeight: isSelected ? "700" : "500",
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* OBSERVACIONES */}
            <View style={{ gap: 4 }}>
              <Text variant="caption" style={{ color: theme.colors.foreground, fontWeight: "600" }}>
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
                backgroundColor: incidentPhoto ? theme.colors.successSoft : theme.colors.secondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: incidentPhoto ? theme.colors.success : theme.colors.border,
                padding: 10,
                gap: 8,
              }}
            >
              <Camera size={18} color={incidentPhoto ? theme.colors.success : theme.colors.primary} />
              <Text
                variant="label"
                style={{
                  fontSize: 13,
                  color: incidentPhoto ? theme.colors.success : theme.colors.primary,
                  fontWeight: "600",
                }}
              >
                {incidentPhoto ? "✓ Evidencia Fotográfica Adjuntada" : "Capturar Evidencia Fotográfica"}
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
