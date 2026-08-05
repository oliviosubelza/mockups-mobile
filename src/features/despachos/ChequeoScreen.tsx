import {
  CheckCircle2,
  XCircle,
  Package,
  Layers,
  X,
  Search,
  Bookmark,
  Snowflake,
  CloudUpload,
  RotateCcw,
  Minus,
  Plus,
  QrCode,
  Camera,
  ScanLine,
  CheckCheck,
  ChevronsRight,
} from "lucide-react-native";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  PanResponder,
  Animated,
} from "react-native";

import { findRouteById, navigateTo } from "@/navigation/registry";
import { Badge, Button } from "@/shared/ui";
import { FormSkeleton, ListSkeleton } from "@/shared/ui/Skeleton";
import { SuccessDialog } from "@/shared/ui/SuccessDialog";
import { Box, Text, useAppTheme } from "@/theme";
import { useDespachos } from "./store";

const EMPTY: any[] = [];



/** Parses detail string or raw counts into structured numCajas and numUnidades */
function parseCantidadDetalle(
  detalle: string,
  contado: number,
  cjArg?: number,
  unArg?: number
) {
  if (typeof cjArg === "number" && !isNaN(cjArg) && typeof unArg === "number" && !isNaN(unArg)) {
    return { numCajas: cjArg, numUnidades: unArg };
  }
  const matchCjas = detalle.match(/(\d+)\s*(?:cj|cajas)/i);
  const matchUn = detalle.match(/(\d+)\s*(?:un|unidades|unid)/i);

  const numCajas = matchCjas ? parseInt(matchCjas[1], 10) : 0;
  const numUnidades = matchUn
    ? parseInt(matchUn[1], 10)
    : matchCjas
    ? 0
    : contado;

  return { numCajas, numUnidades };
}

// ==========================================
// MOCK DB DE PRODUCTOS PARA EL BUSCADOR
// ==========================================
const MOCK_DB = [
  {
    id: 1,
    codigo: "7790001",
    nombre: "Ketchup 900ml",
    cajaSize: 12,
    expectedQty: 24,
    isCold: false,
  },
  {
    id: 2,
    codigo: "7790002",
    nombre: "Mayonesa Clásica 500g",
    cajaSize: 24,
    expectedQty: 24,
    isCold: false,
  },
  {
    id: 3,
    codigo: "7790003",
    nombre: "Levadura Fleischmann 500g",
    cajaSize: 10,
    expectedQty: 50,
    isCold: true,
  },
  {
    id: 4,
    codigo: "7790004",
    nombre: "Levadura Fleischmann 1Kg",
    cajaSize: 10,
    expectedQty: 20,
    isCold: true,
  },
  {
    id: 5,
    codigo: "7790005",
    nombre: "Salsa Golf 500g",
    cajaSize: 20,
    expectedQty: 440,
    isCold: false,
  },
  {
    id: 6,
    codigo: "7790006",
    nombre: "Mostaza Dulce 500g",
    cajaSize: 20,
    expectedQty: 20,
    isCold: false,
  },
];

type Props = {
  despachoId?: string;
};

export default function ChequeoScreen({ despachoId }: Props) {
  const theme = useAppTheme();
  
  // Zustand Store
  const activeIdFromStore = useDespachos((state) => state.activeId);
  const despachos = useDespachos((state) => state.despachos);
  const checksByDespacho = useDespachos((state) => state.checksByDespacho);
  const addCheck = useDespachos((state) => state.addCheck);
  const guardar = useDespachos((state) => state.guardar);

  const activeId = despachoId || activeIdFromStore || "1";
  const despacho = despachos.find((d) => d.id === activeId) || despachos[0];
  const items = checksByDespacho[activeId] ?? EMPTY;

  // Estados locales del formulario de la cabecera
  const [isLoading, setIsLoading] = useState(true);
  const [productoTexto, setProductoTexto] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [cantCajas, setCantCajas] = useState("");
  const [cantUnidades, setCantUnidades] = useState("");
  const [saved, setSaved] = useState(false);

  // Contador de re-conteos por código de producto (máximo 2 permitidos por ítem)
  const [recountAttempts, setRecountAttempts] = useState<Record<string, number>>({});

  // ESTADO DEL MODAL IN-SITU DE RE-CONTEO RÁPIDO DIRECTO EN LA TARJETA
  const [isRecountModalVisible, setIsRecountModalVisible] = useState(false);
  const [modalItem, setModalItem] = useState<any>(null);
  const [modalCajas, setModalCajas] = useState("0");
  const [modalUnidades, setModalUnidades] = useState("0");

  // ESTADO DEL ESCÁNER DE CÓDIGO DE BARRAS POR CÁMARA
  const [isBarcodeScannerVisible, setIsBarcodeScannerVisible] = useState(false);

  // Focus y sugerencias
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCajasFocused, setIsCajasFocused] = useState(false);
  const [isUnidadesFocused, setIsUnidadesFocused] = useState(false);
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  const cajasInputRef = useRef<TextInput>(null);
  const unidadesInputRef = useRef<TextInput>(null);

  // Simulación de carga
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Excluir productos ya agregados del buscador de cabecera
  const codigosAgregados = useMemo(() => {
    return new Set(items.map((item: any) => item.codigo));
  }, [items]);

  const handleSearchChange = (text: string) => {
    setProductoTexto(text);
    setProductoSeleccionado(null);

    if (text.trim().length > 0) {
      const query = text.toLowerCase();
      const filtrados = MOCK_DB.filter(
        (p) =>
          !codigosAgregados.has(p.codigo) &&
          (p.codigo.includes(query) || p.nombre.toLowerCase().includes(query))
      ).slice(0, 5);

      setSugerencias(filtrados);
      setMostrarSugerencias(true);
    } else {
      setSugerencias([]);
      setMostrarSugerencias(false);
    }
  };

  const seleccionarProducto = (producto: any) => {
    setProductoSeleccionado(producto);
    setProductoTexto(`${producto.codigo} - ${producto.nombre}`);
    setMostrarSugerencias(false);
    unidadesInputRef.current?.focus();
  };

  const limpiarBuscador = () => {
    setProductoTexto("");
    setProductoSeleccionado(null);
    setCantCajas("");
    setCantUnidades("");
    setMostrarSugerencias(false);
  };

  // MANEJO DE LECTURA DE CÓDIGO DE BARRAS ESCANEADO
  const handleBarcodeScanned = (scannedCode: string) => {
    setIsBarcodeScannerVisible(false);

    // Buscar producto por código escaneado
    const found = MOCK_DB.find((p) => p.codigo === scannedCode || scannedCode.includes(p.codigo));
    if (found) {
      seleccionarProducto(found);
    } else {
      setProductoTexto(scannedCode);
      handleSearchChange(scannedCode);
    }
  };

  // ABRIR MODAL FLOTANTE IN-SITU DE RE-CONTEO (SIN SCROLLING HACIA ARRIBA)
  const openRecountModal = (item: any, parsedCount: { numCajas: number; numUnidades: number }) => {
    const attempts = recountAttempts[item.codigo] || 0;
    if (attempts >= 2) return;

    setModalItem(item);
    setModalCajas(parsedCount.numCajas.toString());
    setModalUnidades(parsedCount.numUnidades.toString());
    setIsRecountModalVisible(true);
  };

  // GUARDAR RE-CONTEO DESDE EL MODAL SHEET IN-SITU
  const saveRecountFromModal = () => {
    if (!modalItem) return;

    const partes = modalItem.nombre.split(" | ");
    const nombreReal = partes[0];
    const isCold = partes[3] === "true";
    const esperado = parseInt(partes[4] || "0", 10);
    const codigo = modalItem.codigo;

    const foundDbProd = MOCK_DB.find((p) => p.codigo === codigo);
    const cajaSize = foundDbProd?.cajaSize || 12;

    const numCjas = parseInt(modalCajas || "0", 10);
    const numUnids = parseInt(modalUnidades || "0", 10);
    const totalContadoCalculado = (numCjas * cajaSize) + numUnids;
    const isMatch = totalContadoCalculado === esperado;

    let detalleCantidad = "";
    if (numCjas > 0 && numUnids > 0) {
      detalleCantidad = `${numCjas} Cajas + ${numUnids} Unidades`;
    } else if (numCjas > 0) {
      detalleCantidad = `${numCjas} Cajas`;
    } else {
      detalleCantidad = `${numUnids} Unidades`;
    }

    const dataEmpaquetada = `${nombreReal} | ${detalleCantidad} | ${isMatch} | ${isCold} | ${esperado} | ${totalContadoCalculado} | ${numCjas} | ${numUnids}`;

    // Incrementar intentos de re-conteo para este producto
    setRecountAttempts((prev) => ({
      ...prev,
      [codigo]: (prev[codigo] || 0) + 1,
    }));

    // Actualizar ítem en el store
    addCheck(activeId, codigo, dataEmpaquetada);

    // Cerrar modal sheet
    setIsRecountModalVisible(false);
    setModalItem(null);
  };

  const numCajas = parseInt(cantCajas || "0", 10);
  const numUnidades = parseInt(cantUnidades || "0", 10);
  const cajaSize = productoSeleccionado?.cajaSize ?? 1;
  const totalContadoCalculado = (numCajas * cajaSize) + numUnidades;

  const canAdd =
    productoSeleccionado !== null &&
    (cantCajas.trim().length > 0 || cantUnidades.trim().length > 0) &&
    totalContadoCalculado > 0;

  const onAdd = () => {
    if (!canAdd) return;
    const isMatch = totalContadoCalculado === productoSeleccionado.expectedQty;

    let detalleCantidad = "";
    if (numCajas > 0 && numUnidades > 0) {
      detalleCantidad = `${numCajas} Cajas + ${numUnidades} Unidades`;
    } else if (numCajas > 0) {
      detalleCantidad = `${numCajas} Cajas`;
    } else {
      detalleCantidad = `${numUnidades} Unidades`;
    }

    const dataEmpaquetada = `${productoSeleccionado.nombre} | ${detalleCantidad} | ${isMatch} | ${productoSeleccionado.isCold} | ${productoSeleccionado.expectedQty} | ${totalContadoCalculado} | ${numCajas} | ${numUnidades}`;

    addCheck(activeId, productoSeleccionado.codigo, dataEmpaquetada);
    limpiarBuscador();
    setSaved(false);
  };

  const onGuardar = () => {
    guardar(activeId);
    setSaved(true);
  };

  const redirectToList = () => {
    setSaved(false);
    const route = findRouteById("despachos");
    if (route) navigateTo(route);
  };

  // Metricas de conteo
  const stats = useMemo(() => {
    let matches = 0;
    let mismatches = 0;
    items.forEach((item: any) => {
      const partes = item.nombre.split(" | ");
      if (partes[2] === "true") matches++;
      else mismatches++;
    });
    return { total: items.length, matches, mismatches };
  }, [items]);

  if (!despacho) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" padding="l">
        <Text variant="body" color="mutedForeground">
          Selecciona un despacho para iniciar el chequeo.
        </Text>
      </Box>
    );
  }

  // CÁLCULOS DEL MODAL DE RE-CONTEO
  const modalCjasNum = parseInt(modalCajas || "0", 10);
  const modalUnidsNum = parseInt(modalUnidades || "0", 10);
  const modalProdFound = modalItem ? MOCK_DB.find((p) => p.codigo === modalItem.codigo) : null;
  const modalCajaSize = modalProdFound?.cajaSize || 12;
  const modalTotalCalc = (modalCjasNum * modalCajaSize) + modalUnidsNum;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* CABECERA CON INFORMACIÓN DE LA ORDEN DE TRANSPORTE */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ gap: 2, flex: 1 }}>
            <Text
              variant="caption"
              style={{
                color: theme.colors.mutedForeground,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Orden de Transporte
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text variant="header" style={{ color: theme.colors.foreground, fontSize: 18, fontWeight: "800" }}>
                {despacho.codigo}
              </Text>
              {items.length > 0 && (
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <Badge label={`${stats.matches} ok`} tone="success" emphasis="soft" size="sm" />
                  {stats.mismatches > 0 && (
                    <Badge label={`${stats.mismatches} diff`} tone="danger" emphasis="soft" size="sm" />
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={{ gap: 16 }}>
            <FormSkeleton />
            <ListSkeleton />
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {/* CARD DEL FORMULARIO COMPACTO */}
            <View
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderColor: theme.colors.border,
                borderWidth: 1,
                padding: 16,
                borderRadius: 16,
                elevation: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                zIndex: 50,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text variant="label" style={{ fontSize: 14 }}>
                  {productoSeleccionado ? "Producto Seleccionado" : "Buscar Producto"}
                </Text>
                {canAdd && (
                  <Badge
                    label={`Total: ${totalContadoCalculado} unids`}
                    tone="primary"
                    emphasis="outline"
                    size="sm"
                    icon={Package}
                  />
                )}
              </View>

              {/* BUSCADOR CON BOTÓN DE ESCÁNER DE CÓDIGO DE BARRAS INTEGRADO */}
              <View style={{ position: "relative", zIndex: 100, marginBottom: 12, height: 44 }}>
                {productoSeleccionado ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: theme.colors.successSoft,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: theme.colors.success,
                      paddingHorizontal: 12,
                      height: 44,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: theme.colors.success,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        marginRight: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#ffffff" }}>
                        {productoSeleccionado.codigo}
                      </Text>
                    </View>

                    <Text
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: "600",
                        color: theme.colors.foreground,
                      }}
                      numberOfLines={1}
                    >
                      {productoSeleccionado.nombre}
                    </Text>

                    <TouchableOpacity onPress={limpiarBuscador} style={{ padding: 6 }}>
                      <X color={theme.colors.mutedForeground} size={18} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {/* INPUT DE BÚSQUEDA POR TEXTO O CÓDIGO */}
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: isSearchFocused ? theme.colors.cardBackground : theme.colors.secondary,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: isSearchFocused ? theme.colors.primary : theme.colors.border,
                        height: 44,
                      }}
                    >
                      <Search
                        color={isSearchFocused ? theme.colors.primary : theme.colors.mutedForeground}
                        size={18}
                        style={{ marginLeft: 12 }}
                      />
                      <TextInput
                        value={productoTexto}
                        onChangeText={handleSearchChange}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder="Ej. 7790001 o Ketchup..."
                        placeholderTextColor={theme.colors.mutedForeground}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          paddingHorizontal: 8,
                          fontSize: 14,
                          color: theme.colors.foreground,
                          fontFamily: "Montserrat_500Medium",
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {productoTexto.length > 0 && (
                        <TouchableOpacity
                          onPress={limpiarBuscador}
                          style={{ padding: 10 }}
                        >
                          <X color={theme.colors.mutedForeground} size={18} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* BOTÓN LECTOR DE CÓDIGO DE BARRAS */}
                    <TouchableOpacity
                      onPress={() => setIsBarcodeScannerVisible(true)}
                      activeOpacity={0.8}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        backgroundColor: theme.colors.primarySoft,
                        borderWidth: 1.5,
                        borderColor: theme.colors.primary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <QrCode size={20} color={theme.colors.primary} />
                    </TouchableOpacity>

                    {/* MENÚ FLOTANTE DE SUGERENCIAS */}
                    {mostrarSugerencias && (
                      <View
                        style={{
                          position: "absolute",
                          top: 46,
                          left: 0,
                          right: 52,
                          backgroundColor: theme.colors.cardBackground,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          elevation: 10,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.15,
                          shadowRadius: 12,
                          zIndex: 999,
                        }}
                      >
                        {sugerencias.length > 0 ? (
                          sugerencias.map((prod, index) => (
                            <TouchableOpacity
                              key={prod.id}
                              onPress={() => seleccionarProducto(prod)}
                              style={{
                                paddingVertical: 12,
                                paddingHorizontal: 14,
                                borderBottomWidth:
                                  index === sugerencias.length - 1 ? 0 : 1,
                                borderBottomColor: theme.colors.border,
                              }}
                            >
                              <Text variant="bodySmall" style={{ color: theme.colors.foreground }}>
                                <Text variant="label">{prod.codigo}</Text> -{" "}
                                {prod.nombre}
                              </Text>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <View style={{ padding: 14, alignItems: "center" }}>
                            <Text variant="caption" style={{ color: theme.colors.mutedForeground, textAlign: "center" }}>
                              No hay productos disponibles o ya fueron ingresados.
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* DOS INPUTS: CAJAS Y UNIDADES SUELTAS */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  marginBottom: 14,
                  zIndex: 10,
                }}
              >
                {/* INPUT 2: UNIDADES SUELTAS */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                    <Package size={14} color={theme.colors.primary} />
                    <Text variant="label" style={{ fontSize: 13 }}>
                      Unidades
                    </Text>
                  </View>
                  <TextInput
                    ref={unidadesInputRef}
                    value={cantUnidades}
                    onChangeText={setCantUnidades}
                    onFocus={() => setIsUnidadesFocused(true)}
                    onBlur={() => setIsUnidadesFocused(false)}
                    placeholder="0"
                    placeholderTextColor={theme.colors.mutedForeground}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: isUnidadesFocused
                        ? theme.colors.cardBackground
                        : theme.colors.secondary,
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      height: 44,
                      borderRadius: 10,
                      fontSize: 16,
                      fontFamily: "Montserrat_600SemiBold",
                      borderWidth: 1.5,
                      borderColor: isUnidadesFocused
                        ? theme.colors.primary
                        : theme.colors.border,
                      textAlign: "center",
                      color: theme.colors.foreground,
                    }}
                  />
                </View>

                 {/* INPUT 1: CAJAS */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                    <Layers size={14} color={theme.colors.primary} />
                    <Text variant="label" style={{ fontSize: 13 }}>
                      Cajas
                    </Text>
                    {productoSeleccionado && (
                      <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                        ({productoSeleccionado.cajaSize} u/cj)
                      </Text>
                    )}
                  </View>
                  <TextInput
                    ref={cajasInputRef}
                    value={cantCajas}
                    onChangeText={setCantCajas}
                    onFocus={() => setIsCajasFocused(true)}
                    onBlur={() => setIsCajasFocused(false)}
                    placeholder="0"
                    placeholderTextColor={theme.colors.mutedForeground}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: isCajasFocused
                        ? theme.colors.cardBackground
                        : theme.colors.secondary,
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      height: 44,
                      borderRadius: 10,
                      fontSize: 16,
                      fontFamily: "Montserrat_600SemiBold",
                      borderWidth: 1.5,
                      borderColor: isCajasFocused
                        ? theme.colors.primary
                        : theme.colors.border,
                      textAlign: "center",
                      color: theme.colors.foreground,
                    }}
                  />
                </View>
              </View>

              {/* BOTÓN DE REGISTRO CON TOTAL INTEGRADO (SIN SALTO DE ALTURA) */}
              <Button
                label={canAdd ? `Registrar ${totalContadoCalculado} Unidades` : "Registrar Ítem"}
                variant={canAdd ? "primary" : "secondary"}
                disabled={!canAdd}
                onPress={onAdd}
                endIcon={Bookmark}
                fullWidth
                size="md"
              />
            </View>

            {/* LISTA DE RESULTADOS ESTILO LIST TILE UNIFICADO (SIN BOTÓN DE ELIMINAR) */}
            <View style={{ gap: 10, zIndex: 1, marginTop: 4 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text variant="title" style={{ fontSize: 16 }}>
                  Registro de Conteo
                </Text>
                <Badge
                  label={`${items.length} ítems`}
                  tone={items.length > 0 ? "primary" : "neutral"}
                  emphasis="soft"
                  size="sm"
                />
              </View>

              {items.length === 0 ? (
                <Text
                  variant="bodySmall"
                  style={{
                    color: theme.colors.mutedForeground,
                    textAlign: "center",
                    marginVertical: 24,
                  }}
                >
                  Busca o selecciona un producto para comenzar el registro.
                </Text>
              ) : (
                /* CONTENEDOR DE LIST TILE UNIFICADO */
                <View
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    overflow: "hidden",
                  }}
                >
                  {items.map((item: any, index: number) => {
                    const partes = item.nombre.split(" | ");
                    const nombreReal = partes[0];
                    const detalleCantidad = partes[1];
                    const esMatch = partes[2] === "true";
                    const isCold = partes[3] === "true";
                    const esperado = parseInt(partes[4], 10);
                    const contado = parseInt(partes[5], 10);
                    const rawCajas = partes[6] ? parseInt(partes[6], 10) : undefined;
                    const rawUnids = partes[7] ? parseInt(partes[7], 10) : undefined;
                    const parsedCount = parseCantidadDetalle(detalleCantidad, contado, rawCajas, rawUnids);

                    const diferencia = contado - esperado;
                    const textoDiferencia =
                      diferencia > 0
                        ? `+${diferencia} (sobran)`
                        : `${diferencia} (faltan)`;

                    const isLast = index === items.length - 1;

                    return (
                      <View
                        key={item.id}
                        style={{
                          backgroundColor: theme.colors.cardBackground,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderBottomWidth: isLast ? 0 : 1,
                          borderBottomColor: theme.colors.border,
                          gap: 4,
                        }}
                      >
                        {/* FILA 1: Ícono + Código • Nombre + Icono Frío + Badge de Total */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          {esMatch ? (
                            <CheckCircle2 size={16} color={theme.colors.success} style={{ flexShrink: 0 }} />
                          ) : (
                            <XCircle size={16} color={theme.colors.danger} style={{ flexShrink: 0 }} />
                          )}

                          <Text
                            variant="label"
                            style={{
                              fontSize: 12,
                              color: theme.colors.foreground,
                              fontWeight: "700",
                            }}
                          >
                            {item.codigo}
                          </Text>
                          <Text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>•</Text>
                          <Text
                            variant="bodySmall"
                            style={{
                              fontSize: 12,
                              color: theme.colors.foreground,
                              flex: 1,
                              fontWeight: "600",
                            }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {nombreReal}
                          </Text>

                          {isCold && (
                            <View style={{ flexShrink: 0 }}>
                              <Snowflake size={13} color={theme.colors.primary} />
                            </View>
                          )}

                          <View
                            style={{
                              backgroundColor: theme.colors.primarySoft,
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 5,
                              borderWidth: 1,
                              borderColor: theme.colors.primary,
                              flexShrink: 0,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.primary }}>
                              Total: {contado} u.
                            </Text>
                          </View>
                        </View>

                        {/* FILA 2: Desglose Cajas/Unidades (Izquierda) vs Conforme (Derecha) */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            paddingLeft: 22,
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>Ingresado:</Text>
                            {parsedCount.numCajas > 0 && (
                              <Text style={{ fontSize: 11, color: theme.colors.mutedForeground, fontWeight: "500" }}>
                                <Text style={{ fontWeight: "700", color: theme.colors.foreground }}>{parsedCount.numCajas}</Text> {parsedCount.numCajas === 1 ? "Caja" : "Cajas"}
                              </Text>
                            )}

                            {parsedCount.numCajas > 0 && parsedCount.numUnidades > 0 && (
                              <Text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>+</Text>
                            )}

                            {parsedCount.numUnidades > 0 && (
                              <Text style={{ fontSize: 11, color: theme.colors.mutedForeground, fontWeight: "500" }}>
                                <Text style={{ fontWeight: "700", color: theme.colors.foreground }}>{parsedCount.numUnidades}</Text> {parsedCount.numUnidades === 1 ? "Unid." : "Unids."}
                              </Text>
                            )}
                          </View>

                          {esMatch && (
                            <Text style={{ fontSize: 11, color: theme.colors.success, fontWeight: "600" }}>
                              {isCold ? `✓ Conforme (${esperado} u.)` : "✓ Conforme"}
                            </Text>
                          )}
                        </View>

                        {/* FILA DE DIFERENCIA Y BOTÓN DE RE-CONTEO (MÁXIMO 2 INTENTOS POR ÍTEM) */}
                        {!esMatch && (
                          <View style={{ paddingLeft: 22, marginTop: 3, gap: 4 }}>
                            <Text
                              style={{
                                fontSize: 11,
                                color: theme.colors.danger,
                                fontWeight: "600",
                              }}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {isCold
                                ? `Diferencia: ${textoDiferencia} (Esperado: ${esperado} u.)`
                                : "Diferencia detectada en inventario."}
                            </Text>

                            {/* BOTÓN DE RE-CONTEO QUE ABRE MODAL SHEET IN-SITU SIN SCROLLING */}
                            {(() => {
                              const attempts = recountAttempts[item.codigo] || 0;
                              const remaining = 2 - attempts;

                              if (remaining > 0) {
                                return (
                                  <TouchableOpacity
                                    onPress={() => openRecountModal(item, parsedCount)}
                                    activeOpacity={0.7}
                                    style={{
                                      backgroundColor: theme.colors.primarySoft,
                                      borderRadius: 6,
                                      paddingHorizontal: 8,
                                      paddingVertical: 5,
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 5,
                                      alignSelf: "flex-start",
                                      borderWidth: 1,
                                      borderColor: theme.colors.primary,
                                      marginTop: 2,
                                    }}
                                  >
                                    <RotateCcw size={12} color={theme.colors.primary} />
                                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.primary }}>
                                      Recontar producto ({remaining} {remaining === 1 ? 'intento restante' : 'intentos restantes'})
                                    </Text>
                                  </TouchableOpacity>
                                );
                              }

                              return (
                                <View
                                  style={{
                                    backgroundColor: theme.colors.secondary,
                                    borderRadius: 6,
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    alignSelf: "flex-start",
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    marginTop: 2,
                                  }}
                                >
                                  <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.mutedForeground }}>
                                    🔒 Máximo de 2 re-conteos alcanzado (Bloqueado)
                                  </Text>
                                </View>
                              );
                            })()}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL SHEET DE LECTOR DE CÓDIGO DE BARRAS POR CÁMARA */}
      <Modal
        visible={isBarcodeScannerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsBarcodeScannerVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", padding: 20 }}>
          <View
            style={{
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 20,
              padding: 20,
              gap: 16,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            {/* CABECERA ESCÁNER */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Camera size={20} color={theme.colors.primary} />
                <Text variant="header" style={{ fontSize: 16, fontWeight: "800", color: theme.colors.foreground }}>
                  Escáner de Código de Barras
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setIsBarcodeScannerVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.colors.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* VISOR SIMULADO DE CÁMARA CON ENFOQUE Y LÍNEA ROJA DE ESCANEO */}
            <View
              style={{
                height: 200,
                backgroundColor: "#0a0a0a",
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
                borderWidth: 2,
                borderColor: theme.colors.primary,
              }}
            >
              <View
                style={{
                  position: "absolute",
                  left: 20,
                  right: 20,
                  height: 2,
                  backgroundColor: "#ff3b30",
                  shadowColor: "#ff3b30",
                  shadowRadius: 6,
                  shadowOpacity: 0.8,
                }}
              />

              <ScanLine size={48} color={theme.colors.primary} style={{ opacity: 0.4 }} />
              <Text style={{ color: "#ffffff", fontSize: 12, marginTop: 10, fontWeight: "600" }}>
                Apunta el código de barras aquí
              </Text>
            </View>

            {/* OPCIONES DE SIMULACIÓN DE ESCANEO PARA DEMO RÁPIDA */}
            <View style={{ gap: 8 }}>
              <Text variant="caption" style={{ fontSize: 11, fontWeight: "700", color: theme.colors.mutedForeground }}>
                Toca un producto para simular la lectura de cámara:
              </Text>

              <ScrollView style={{ maxHeight: 150 }} contentContainerStyle={{ gap: 6 }}>
                {MOCK_DB.map((prod) => (
                  <TouchableOpacity
                    key={prod.id}
                    onPress={() => handleBarcodeScanned(prod.codigo)}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: theme.colors.secondary,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <QrCode size={16} color={theme.colors.primary} />
                      <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.foreground }}>
                        {prod.codigo} - {prod.nombre}
                      </Text>
                    </View>
                    <Badge label="Simular" tone="primary" emphasis="soft" size="sm" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Button
              label="Cancelar"
              variant="secondary"
              onPress={() => setIsBarcodeScannerVisible(false)}
              fullWidth
              size="md"
            />
          </View>
        </View>
      </Modal>

      {/* MODAL SHEET FLOTANTE DE RE-CONTEO RÁPIDO (IN-SITU) */}
      <Modal
        visible={isRecountModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setIsRecountModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.cardBackground,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              gap: 16,
              elevation: 20,
            }}
          >
            {/* CABECERA DEL MODAL: NOMBRE Y CÓDIGO DEL PRODUCTO */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ gap: 2, flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text variant="header" style={{ fontSize: 16, fontWeight: "800", color: theme.colors.foreground }}>
                    Re-conteo en Sitio
                  </Text>
                  {modalItem && (
                    <Badge
                      label={`Intento ${(recountAttempts[modalItem.codigo] || 0) + 1} de 2`}
                      tone="warning"
                      emphasis="soft"
                      size="sm"
                    />
                  )}
                </View>
                <Text variant="caption" style={{ fontSize: 12, color: theme.colors.mutedForeground }} numberOfLines={1}>
                  {modalItem ? `${modalItem.codigo} - ${modalItem.nombre.split(" | ")[0]}` : ""}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setIsRecountModalVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.colors.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* CONTROLES DE CAJAS Y UNIDADES CON BOTONES + / - */}
            <View style={{ gap: 14 }}>
              {/* CONTROL DE CAJAS */}
              <View
                style={{
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ gap: 2 }}>
                  <Text variant="label" style={{ fontSize: 13, color: theme.colors.foreground }}>
                    Cajas
                  </Text>
                  <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                    ({modalCajaSize} unids/caja)
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      const val = Math.max(0, parseInt(modalCajas || "0", 10) - 1);
                      setModalCajas(val.toString());
                    }}
                    style={{
                      width: 42,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: theme.colors.cardBackground,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Minus size={18} color={theme.colors.foreground} />
                  </TouchableOpacity>

                  <TextInput
                    value={modalCajas}
                    onChangeText={setModalCajas}
                    keyboardType="numeric"
                    style={{
                      width: 58,
                      height: 44,
                      backgroundColor: theme.colors.cardBackground,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: theme.colors.primary,
                      textAlign: "center",
                      textAlignVertical: "center",
                      paddingVertical: 0,
                      paddingTop: 0,
                      paddingBottom: 0,
                      fontSize: 16,
                      fontWeight: "700",
                      color: theme.colors.foreground,
                    }}
                  />

                  <TouchableOpacity
                    onPress={() => {
                      const val = parseInt(modalCajas || "0", 10) + 1;
                      setModalCajas(val.toString());
                    }}
                    style={{
                      width: 42,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: theme.colors.cardBackground,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Plus size={18} color={theme.colors.foreground} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* CONTROL DE UNIDADES */}
              <View
                style={{
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ gap: 2 }}>
                  <Text variant="label" style={{ fontSize: 13, color: theme.colors.foreground }}>
                    Unidades Sueltas
                  </Text>
                  <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                    Unidades individuales
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      const val = Math.max(0, parseInt(modalUnidades || "0", 10) - 1);
                      setModalUnidades(val.toString());
                    }}
                    style={{
                      width: 42,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: theme.colors.cardBackground,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Minus size={18} color={theme.colors.foreground} />
                  </TouchableOpacity>

                  <TextInput
                    value={modalUnidades}
                    onChangeText={setModalUnidades}
                    keyboardType="numeric"
                    style={{
                      width: 58,
                      height: 44,
                      backgroundColor: theme.colors.cardBackground,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: theme.colors.primary,
                      textAlign: "center",
                      textAlignVertical: "center",
                      paddingVertical: 0,
                      paddingTop: 0,
                      paddingBottom: 0,
                      fontSize: 16,
                      fontWeight: "700",
                      color: theme.colors.foreground,
                    }}
                  />

                  <TouchableOpacity
                    onPress={() => {
                      const val = parseInt(modalUnidades || "0", 10) + 1;
                      setModalUnidades(val.toString());
                    }}
                    style={{
                      width: 42,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: theme.colors.cardBackground,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Plus size={18} color={theme.colors.foreground} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* TOTAL CALCULADO EN TIEMPO REAL EN EL MODAL */}
              <View
                style={{
                  backgroundColor: theme.colors.primarySoft,
                  borderRadius: 10,
                  padding: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.primary }}>
                  Total Recontado: {modalTotalCalc} Unidades
                </Text>
              </View>
            </View>

            {/* BOTONES DE ACCIÓN EN EL MODAL */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setIsRecountModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Text style={{ fontWeight: "700", color: theme.colors.foreground, fontSize: 13 }}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveRecountFromModal}
                style={{
                  flex: 1.5,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontWeight: "800", color: "#ffffff", fontSize: 13 }}>
                  Guardar Re-conteo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* OPCIÓN 1 ORIGINAL: DOCK FLOTANTE DE ACCIÓN AL PIE DE PANTALLA */}
      {items.length > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 30,
            borderWidth: 1.5,
            borderColor: theme.colors.primary,
            paddingVertical: 8,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            elevation: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.18,
            shadowRadius: 10,
          }}
        >
          {/* IZQUIERDA: RESUMEN DE CONTEO CON BADGES VERDE (OK) Y ROJO (DIFF) */}
          <View style={{ gap: 3, flexShrink: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.foreground }}>
              {items.length} {items.length === 1 ? "Producto registrado" : "Productos registrados"}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Badge label={`${stats.matches} ok`} tone="success" emphasis="soft" size="sm" />
              {stats.mismatches > 0 && (
                <Badge label={`${stats.mismatches} diff`} tone="danger" emphasis="soft" size="sm" />
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={onGuardar}
            activeOpacity={0.85}
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: 22,
              paddingVertical: 10,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCheck size={18} color="#ffffff" />
            <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 13 }}>
              Finalizar
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* DIÁLOGO DE ÉXITO */}
      <SuccessDialog
        visible={saved}
        onClose={redirectToList}
        title="¡Chequeo Registrado!"
        message={`Se completó el registro de ${stats.matches} ítems correctos y ${stats.mismatches} discrepancias en la Orden ${despacho.codigo}.`}
      />
    </View>
  );
}
