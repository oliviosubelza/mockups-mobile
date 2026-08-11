import {
  Camera,
  CheckCheck,
  CheckCircle2,
  Layers,
  Minus,
  Package,
  Plus,
  QrCode,
  RotateCcw,
  ScanLine,
  Snowflake,
  X,
  XCircle,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { findRouteById, navigateTo } from "@/navigation/registry";
import {
  AppDialog,
  Badge,
  Button,
  SearchField,
  type AppDialogProps,
} from "@/shared/ui";
import { FormSkeleton, ListSkeleton } from "@/shared/ui/Skeleton";
import { Box, Text, useAppTheme } from "@/theme";
import { useDespachos } from "./store";
import { CheckTimer } from "./components/CheckTimer";

const EMPTY: any[] = [];

/** Parses detail string or raw counts into structured numCajas and numUnidades */
function parseCantidadDetalle(
  detalle: string,
  contado: number,
  cjArg?: number,
  unArg?: number,
) {
  if (
    typeof cjArg === "number" &&
    !isNaN(cjArg) &&
    typeof unArg === "number" &&
    !isNaN(unArg)
  ) {
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
/**
 * Re-conteos permitidos por ítem para el rol Chofer.
 * En 0 el conteo a ciegas queda sin corrección: lo ingresado es definitivo.
 */
const MAX_RECOUNTS: number = 1;

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
  const insets = useSafeAreaInsets();

  // Zustand Store
  const activeIdFromStore = useDespachos((state) => state.activeId);
  const despachos = useDespachos((state) => state.despachos);
  const checksByDespacho = useDespachos((state) => state.checksByDespacho);
  const addCheck = useDespachos((state) => state.addCheck);
  const guardar = useDespachos((state) => state.guardar);
  const sessionsByDespacho = useDespachos((state) => state.sessionsByDespacho);
  const startCheck = useDespachos((state) => state.startCheck);
  const finishCheck = useDespachos((state) => state.finishCheck);

  const activeId = despachoId || activeIdFromStore || "1";
  const despacho = despachos.find((d) => d.id === activeId) || despachos[0];
  const items = checksByDespacho[activeId] ?? EMPTY;

  // Estados locales del formulario de la cabecera
  const [isLoading, setIsLoading] = useState(true);
  const [productoTexto, setProductoTexto] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [cantCajas, setCantCajas] = useState("");
  const [cantUnidades, setCantUnidades] = useState("");
  /**
   * Un único diálogo con dos pasos. Montar dos Modal y cruzar sus transiciones
   * hace que React Native descarte el que intenta presentarse.
   */
  const [dialog, setDialog] = useState<"none" | "confirm" | "success">("none");

  /** Paso al que debe avanzar el diálogo cuando AppDialog dispare su onClose. */
  const pasoSiguiente = useRef<"success" | null>(null);

  /**
   * Conteo cerrado: guarda el avance real alcanzado antes de completar en 0 los
   * ítems no contados, para que el porcentaje no se infle al cerrar.
   */
  const [cierre, setCierre] = useState<{
    contados: number;
    pct: number;
  } | null>(null);

  // Contador de re-conteos por código de producto (límite definido en MAX_RECOUNTS)
  const [recountAttempts, setRecountAttempts] = useState<
    Record<string, number>
  >({});

  // ESTADO DEL MODAL IN-SITU DE RE-CONTEO RÁPIDO DIRECTO EN LA TARJETA
  const [isRecountModalVisible, setIsRecountModalVisible] = useState(false);
  const [modalItem, setModalItem] = useState<any>(null);
  const [modalCajas, setModalCajas] = useState("0");
  const [modalUnidades, setModalUnidades] = useState("0");

  // ESTADO DEL ESCÁNER DE CÓDIGO DE BARRAS POR CÁMARA
  const [isBarcodeScannerVisible, setIsBarcodeScannerVisible] = useState(false);

  // Focus y sugerencias (el buscador usa SearchField, que ya maneja su propio estilo)
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
          (p.codigo.includes(query) || p.nombre.toLowerCase().includes(query)),
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
    const found = MOCK_DB.find(
      (p) => p.codigo === scannedCode || scannedCode.includes(p.codigo),
    );
    if (found) {
      seleccionarProducto(found);
    } else {
      setProductoTexto(scannedCode);
      handleSearchChange(scannedCode);
    }
  };

  // ABRIR MODAL FLOTANTE IN-SITU DE RE-CONTEO (SIN SCROLLING HACIA ARRIBA)
  const openRecountModal = (
    item: any,
    parsedCount: { numCajas: number; numUnidades: number },
  ) => {
    const attempts = recountAttempts[item.codigo] || 0;
    if (attempts >= MAX_RECOUNTS) return;

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
    const totalContadoCalculado = numCjas * cajaSize + numUnids;
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
  const totalContadoCalculado = numCajas * cajaSize + numUnidades;

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

    // CHECKED_START: el primer producto registrado abre el cronómetro.
    startCheck(activeId);
    addCheck(activeId, productoSeleccionado.codigo, dataEmpaquetada);
    limpiarBuscador();
  };

  const onGuardar = () => {
    setDialog("confirm");
  };

  const confirmarConteo = () => {
    // Lo que el chofer no contó se cierra en 0: queda listado y visible como diferencia
    MOCK_DB.filter((p) => !codigosAgregados.has(p.codigo)).forEach((p) => {
      const isMatch = p.expectedQty === 0;
      addCheck(
        activeId,
        p.codigo,
        `${p.nombre} | 0 Unidades | ${isMatch} | ${p.isCold} | ${p.expectedQty} | 0 | 0 | 0`,
      );
    });

    // CHECKED_END: cierra el cronómetro antes de que `guardar` cambie el estado.
    finishCheck(activeId);
    setCierre({ contados, pct: avancePct });
    guardar(activeId);
    pasoSiguiente.current = "success";
  };

  /**
   * AppDialog siempre invoca onClose después de confirmar. Si la acción marcó un
   * paso siguiente, el mismo Modal cambia de contenido en lugar de cerrarse:
   * montar dos Modal y cruzar sus transiciones hace que RN descarte el segundo.
   */
  const handleDialogClose = () => {
    if (pasoSiguiente.current) {
      setDialog(pasoSiguiente.current);
      pasoSiguiente.current = null;
      return;
    }
    setDialog("none");
  };

  const redirectToList = () => {
    setDialog("none");
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

  // Avance del conteo sobre los ítems que la orden exige revisar
  const totalEsperado = MOCK_DB.length;
  const contados = Math.min(items.length, totalEsperado);
  const avancePct =
    totalEsperado === 0 ? 0 : Math.round((contados / totalEsperado) * 100);
  const avanceCompleto = contados >= totalEsperado;

  // Tras cerrar, la barra congela el avance real y no el 100% que dejan los ceros
  const conteoCerrado = cierre !== null;
  const contadosVisible = cierre?.contados ?? contados;
  const avanceVisible = cierre?.pct ?? avancePct;
  const noContados = totalEsperado - contadosVisible;

  if (!despacho) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" padding="l">
        <Text variant="body" color="mutedForeground">
          Selecciona un despacho para iniciar el chequeo.
        </Text>
      </Box>
    );
  }

  // CONTENIDO DEL DIÁLOGO SEGÚN EL PASO ACTIVO
  const dialogProps: Omit<AppDialogProps, "visible" | "onClose"> =
    dialog === "success"
      ? {
          title: "Conteo cerrado",
          message:
            noContados > 0
              ? `Contaste ${contadosVisible} de ${totalEsperado} ítems (${avanceVisible}%). Los ${noContados} restantes quedaron registrados en 0 y aparecen como diferencia en la Orden ${despacho.codigo}.`
              : `Contaste los ${totalEsperado} ítems de la Orden ${despacho.codigo}: ${stats.matches} conformes y ${stats.mismatches} con diferencia.`,
          type: "success",
          buttonText: "Ver el detalle",
        }
      : {
          /*
           * Sin cuerpo: el título es la pregunta entera. El único dato que no
           * se puede perder es cuántos ítems quedan sin contar, porque se
           * cierran en 0 y pasan a ser diferencia del chofer — así que ese
           * dato viaja EN el título en vez de en una descripción aparte.
           */
          title:
            totalEsperado - contados > 0
              ? `¿Confirmar con ${totalEsperado - contados} ítems sin contar?`
              : "¿Confirmar el conteo?",
          type: avanceCompleto ? "info" : "warning",
          buttonText: "Confirmar conteo",
          cancelText: "Seguir contando",
          onCancel: handleDialogClose,
          onConfirm: confirmarConteo,
        };

  // CÁLCULOS DEL MODAL DE RE-CONTEO
  const modalCjasNum = parseInt(modalCajas || "0", 10);
  const modalUnidsNum = parseInt(modalUnidades || "0", 10);
  const modalProdFound = modalItem
    ? MOCK_DB.find((p) => p.codigo === modalItem.codigo)
    : null;
  const modalCajaSize = modalProdFound?.cajaSize || 12;
  const modalTotalCalc = modalCjasNum * modalCajaSize + modalUnidsNum;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* CABECERA CON INFORMACIÓN DE LA ORDEN DE TRANSPORTE */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
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
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text
                variant="header"
                style={{
                  color: theme.colors.foreground,
                  fontSize: 18,
                  fontWeight: "800",
                }}
              >
                {despacho.codigo}
              </Text>
              {items.length > 0 && (
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <Badge
                    label={`${stats.matches} ok`}
                    tone="success"
                    size="sm"
                  />
                  {stats.mismatches > 0 && (
                    <Badge
                      label={`${stats.mismatches} diff`}
                      tone="danger"
                      size="sm"
                    />
                  )}
                </View>
              )}
            </View>
          </View>

          <CheckTimer session={sessionsByDespacho[activeId]} />
        </View>

        {isLoading ? (
          <View style={{ gap: 16 }}>
            <FormSkeleton />
            <ListSkeleton />
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {conteoCerrado ? (
              /* CONTEO CERRADO: EL FORMULARIO YA NO ADMITE INGRESOS */
              <View
                style={{
                  backgroundColor: theme.colors.secondary,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCheck size={16} color={theme.colors.mutedForeground} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: theme.colors.mutedForeground,
                    flex: 1,
                  }}
                >
                  Conteo cerrado. Los ítems que no contaste quedaron registrados
                  en 0.
                </Text>
              </View>
            ) : (
              /* CARD DEL FORMULARIO: PLANO Y SIN SOMBRA, COMO EL RESTO DEL SISTEMA */
              <View
                style={{
                  backgroundColor: theme.colors.cardBackground,
                  borderColor: theme.colors.borderStrong,
                  borderWidth: 1,
                  padding: 14,
                  borderRadius: 12,
                  gap: 10,
                  zIndex: 50,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text variant="label" style={{ fontSize: 13 }}>
                    {productoSeleccionado
                      ? "Producto Seleccionado"
                      : "Buscar Producto"}
                  </Text>
                  {canAdd && (
                    <Badge
                      label={`Total: ${totalContadoCalculado} unids`}
                      tone="primary"
                      size="sm"
                      icon={Package}
                    />
                  )}
                </View>

                {/* BUSCADOR CON BOTÓN DE ESCÁNER DE CÓDIGO DE BARRAS INTEGRADO */}
                <View
                  style={{
                    position: "relative",
                    zIndex: 100,
                    height: 42,
                  }}
                >
                  {productoSeleccionado ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: theme.colors.successSoft,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: theme.colors.success,
                        paddingLeft: 10,
                        paddingRight: 4,
                        height: 42,
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
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: "#ffffff",
                          }}
                        >
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

                      <Button
                        variant="ghost"
                        size="md"
                        icon={X}
                        onPress={limpiarBuscador}
                        accessibilityLabel="Quitar producto seleccionado"
                      />
                    </View>
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {/* INPUT DE BÚSQUEDA POR TEXTO O CÓDIGO */}
                      <View style={{ flex: 1 }}>
                        <SearchField
                          value={productoTexto}
                          onChangeText={handleSearchChange}
                          onClear={limpiarBuscador}
                          placeholder="Ej. 7790001 o Ketchup..."
                          autoCorrect={false}
                        />
                      </View>

                      {/* BOTÓN LECTOR DE CÓDIGO DE BARRAS */}
                      <Button
                        variant="outline"
                        size="lg"
                        icon={QrCode}
                        onPress={() => setIsBarcodeScannerVisible(true)}
                        accessibilityLabel="Escanear código de barras"
                      />

                      {/* MENÚ FLOTANTE DE SUGERENCIAS */}
                      {mostrarSugerencias && (
                        <View
                          style={{
                            position: "absolute",
                            top: 44,
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
                                <Text
                                  variant="bodySmall"
                                  style={{ color: theme.colors.foreground }}
                                >
                                  <Text variant="label">{prod.codigo}</Text> -{" "}
                                  {prod.nombre}
                                </Text>
                              </TouchableOpacity>
                            ))
                          ) : (
                            <View style={{ padding: 14, alignItems: "center" }}>
                              <Text
                                variant="caption"
                                style={{
                                  color: theme.colors.mutedForeground,
                                  textAlign: "center",
                                }}
                              >
                                No hay productos disponibles o ya fueron
                                ingresados.
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
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginBottom: 4,
                      }}
                    >
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
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginBottom: 4,
                      }}
                    >
                      <Layers size={14} color={theme.colors.primary} />
                      <Text variant="label" style={{ fontSize: 13 }}>
                        Cajas
                      </Text>
                      {productoSeleccionado && (
                        <Text
                          variant="caption"
                          style={{
                            fontSize: 11,
                            color: theme.colors.mutedForeground,
                          }}
                        >
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
                  label={
                    canAdd
                      ? `Registrar ${totalContadoCalculado} Unidades`
                      : "Registrar Ítem"
                  }
                  variant={canAdd ? "primary" : "secondary"}
                  disabled={!canAdd}
                  onPress={onAdd}
                  icon={Plus}
                  fullWidth
                  size="lg"
                />
              </View>
            )}

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
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: theme.colors.mutedForeground,
                  }}
                >
                  {/* {contadosVisible}/{totalEsperado}  */}
                  ítems · {avanceVisible}%
                </Text>
              </View>

              {/* BARRA DE AVANCE COMPACTA SOBRE LA TABLA DE CONTEO */}
              <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.colors.secondary,
                  overflow: "hidden",
                  marginTop: -4,
                }}
              >
                <View
                  style={{
                    width: `${avanceVisible}%`,
                    height: "100%",
                    borderRadius: 2,
                    backgroundColor:
                      avanceVisible >= 100
                        ? theme.colors.success
                        : theme.colors.primary,
                  }}
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
                /* LISTADO PLANO CON SEPARADORES FINOS (SIN CAJA CONTENEDORA) */
                <View>
                  {items.map((item: any, index: number) => {
                    const partes = item.nombre.split(" | ");
                    const nombreReal = partes[0];
                    const detalleCantidad = partes[1];
                    const esMatch = partes[2] === "true";
                    const isCold = partes[3] === "true";
                    const esperado = parseInt(partes[4], 10);
                    const contado = parseInt(partes[5], 10);
                    const rawCajas = partes[6]
                      ? parseInt(partes[6], 10)
                      : undefined;
                    const rawUnids = partes[7]
                      ? parseInt(partes[7], 10)
                      : undefined;
                    const parsedCount = parseCantidadDetalle(
                      detalleCantidad,
                      contado,
                      rawCajas,
                      rawUnids,
                    );

                    const diferencia = contado - esperado;
                    const textoDiferencia =
                      diferencia > 0
                        ? `Sobran ${diferencia} u.`
                        : `Faltan ${Math.abs(diferencia)} u.`;

                    const isLast = index === items.length - 1;

                    // Desglose de lo ingresado como una sola línea legible
                    const desglose =
                      [
                        parsedCount.numCajas > 0
                          ? `${parsedCount.numCajas} ${parsedCount.numCajas === 1 ? "Caja" : "Cajas"}`
                          : null,
                        parsedCount.numUnidades > 0
                          ? `${parsedCount.numUnidades} ${parsedCount.numUnidades === 1 ? "Unid." : "Unids."}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" + ") || "Sin conteo";

                    // El re-conteo solo existe mientras el conteo está abierto
                    const reconteosRestantes =
                      MAX_RECOUNTS - (recountAttempts[item.codigo] || 0);
                    const corrigible =
                      !esMatch && !conteoCerrado && MAX_RECOUNTS > 0;
                    const puedeRecontar = corrigible && reconteosRestantes > 0;
                    const reconteoAgotado =
                      corrigible && reconteosRestantes <= 0;

                    return (
                      <View
                        key={item.id}
                        style={{
                          paddingVertical: 12,
                          borderBottomWidth: isLast ? 0 : 1,
                          borderBottomColor: theme.colors.borderStrong,
                          gap: 3,
                        }}
                      >
                        {/* FILA 1: Nombre del producto + Estado del conteo */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Text
                            variant="title"
                            style={{
                              fontSize: 15,
                              fontWeight: "700",
                              color: theme.colors.foreground,
                              flex: 1,
                            }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {nombreReal}
                          </Text>

                          {isCold && (
                            <Snowflake
                              size={14}
                              color={theme.colors.primary}
                              style={{ flexShrink: 0 }}
                            />
                          )}

                          <Badge
                            label={esMatch ? "Conforme" : "Diferencia"}
                            tone={esMatch ? "success" : "danger"}
                            size="sm"
                            icon={esMatch ? CheckCircle2 : XCircle}
                          />
                        </View>

                        {/* FILA 2: Código • Desglose • Total, con el re-conteo al final */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              color: theme.colors.mutedForeground,
                              flexShrink: 1,
                            }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {item.codigo} • {desglose} •{" "}
                            <Text
                              style={{
                                fontWeight: "700",
                                color: theme.colors.foreground,
                              }}
                            >
                              {contado} u.
                            </Text>
                          </Text>

                          {puedeRecontar && (
                            <Button
                              variant="link"
                              size="sm"
                              icon={RotateCcw}
                              /* El cupo solo se explicita cuando hay más de un intento */
                              label={`Recontar${MAX_RECOUNTS > 1 ? ` (${reconteosRestantes})` : ""}`}
                              onPress={() =>
                                openRecountModal(item, parsedCount)
                              }
                            />
                          )}

                          {/* {reconteoAgotado && (
                            <Text
                              style={{
                                fontSize: 12,
                                color: theme.colors.mutedForeground,
                              }}
                            >
                              Re-conteo agotado
                            </Text>
                          )} */}
                        </View>

                        {/* FILA 3: CIFRAS DE LA DIFERENCIA, SOLO EN FRÍO */}
                        {!esMatch && isCold && (
                          <Text
                            style={{
                              fontSize: 12,
                              color: theme.colors.danger,
                              fontWeight: "600",
                            }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {textoDiferencia} · Esperado {esperado} u.
                          </Text>
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

      {/* BARRA DE ACCIÓN ANCLADA EN EL FLUJO: NUNCA TAPA LOS ÍTEMS DEL LISTADO */}
      {items.length > 0 && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.cardBackground,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 12),
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* IZQUIERDA: RESUMEN DE CONTEO CON BADGES VERDE (OK) Y ROJO (DIFF) */}
          <View style={{ gap: 3, flexShrink: 1 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "800",
                color: theme.colors.foreground,
              }}
            >
              {conteoCerrado
                ? `Conteo cerrado • ${avanceVisible}%`
                : `${items.length} ${items.length === 1 ? "Producto registrado" : "Productos registrados"}`}
            </Text>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Badge
                label={`${stats.matches} ok`}
                tone="success"
                size="sm"
              />
              {stats.mismatches > 0 && (
                <Badge
                  label={`${stats.mismatches} diff`}
                  tone="danger"
                  size="sm"
                />
              )}
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Button
              variant="primary"
              size="lg"
              icon={CheckCheck}
              label={conteoCerrado ? "Volver a órdenes" : "Finalizar"}
              onPress={conteoCerrado ? redirectToList : onGuardar}
              fullWidth
            />
          </View>
        </View>
      )}

      {/* MODAL SHEET DE LECTOR DE CÓDIGO DE BARRAS POR CÁMARA */}
      <Modal
        visible={isBarcodeScannerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsBarcodeScannerVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.85)",
            justifyContent: "center",
            padding: 20,
          }}
        >
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Camera size={20} color={theme.colors.primary} />
                <Text
                  variant="header"
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: theme.colors.foreground,
                  }}
                >
                  Escáner de Código de Barras
                </Text>
              </View>

              <Button
                variant="secondary"
                size="md"
                icon={X}
                onPress={() => setIsBarcodeScannerVisible(false)}
                accessibilityLabel="Cerrar escáner"
              />
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

              <ScanLine
                size={48}
                color={theme.colors.primary}
                style={{ opacity: 0.4 }}
              />
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 12,
                  marginTop: 10,
                  fontWeight: "600",
                }}
              >
                Apunta el código de barras aquí
              </Text>
            </View>

            {/* OPCIONES DE SIMULACIÓN DE ESCANEO PARA DEMO RÁPIDA */}
            <View style={{ gap: 8 }}>
              <Text
                variant="caption"
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: theme.colors.mutedForeground,
                }}
              >
                Toca un producto para simular la lectura de cámara:
              </Text>

              <ScrollView
                style={{ maxHeight: 150 }}
                contentContainerStyle={{ gap: 6 }}
              >
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
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <QrCode size={16} color={theme.colors.primary} />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: theme.colors.foreground,
                        }}
                      >
                        {prod.codigo} - {prod.nombre}
                      </Text>
                    </View>
                    <Badge
                      label="Simular"
                      tone="primary"
                      size="sm"
                    />
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ gap: 2, flex: 1 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Text
                    variant="header"
                    style={{
                      fontSize: 16,
                      fontWeight: "800",
                      color: theme.colors.foreground,
                    }}
                  >
                    Re-conteo en Sitio
                  </Text>
                  {modalItem && (
                    <Badge
                      label={`Intento ${(recountAttempts[modalItem.codigo] || 0) + 1} de ${MAX_RECOUNTS}`}
                      tone="warning"
                      size="sm"
                    />
                  )}
                </View>
                <Text
                  variant="caption"
                  style={{ fontSize: 12, color: theme.colors.mutedForeground }}
                  numberOfLines={1}
                >
                  {modalItem
                    ? `${modalItem.codigo} - ${modalItem.nombre.split(" | ")[0]}`
                    : ""}
                </Text>
              </View>

              <Button
                variant="secondary"
                size="md"
                icon={X}
                onPress={() => setIsRecountModalVisible(false)}
                accessibilityLabel="Cerrar re-conteo"
              />
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
                  <Text
                    variant="label"
                    style={{ fontSize: 13, color: theme.colors.foreground }}
                  >
                    Cajas
                  </Text>
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 11,
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    ({modalCajaSize} unids/caja)
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Button
                    variant="outline"
                    size="lg"
                    icon={Minus}
                    onPress={() => {
                      const val = Math.max(
                        0,
                        parseInt(modalCajas || "0", 10) - 1,
                      );
                      setModalCajas(val.toString());
                    }}
                    accessibilityLabel="Quitar una caja"
                  />

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

                  <Button
                    variant="outline"
                    size="lg"
                    icon={Plus}
                    onPress={() => {
                      const val = parseInt(modalCajas || "0", 10) + 1;
                      setModalCajas(val.toString());
                    }}
                    accessibilityLabel="Agregar una caja"
                  />
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
                  <Text
                    variant="label"
                    style={{ fontSize: 13, color: theme.colors.foreground }}
                  >
                    Unidades Sueltas
                  </Text>
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 11,
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    Unidades individuales
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Button
                    variant="outline"
                    size="lg"
                    icon={Minus}
                    onPress={() => {
                      const val = Math.max(
                        0,
                        parseInt(modalUnidades || "0", 10) - 1,
                      );
                      setModalUnidades(val.toString());
                    }}
                    accessibilityLabel="Quitar una unidad"
                  />

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

                  <Button
                    variant="outline"
                    size="lg"
                    icon={Plus}
                    onPress={() => {
                      const val = parseInt(modalUnidades || "0", 10) + 1;
                      setModalUnidades(val.toString());
                    }}
                    accessibilityLabel="Agregar una unidad"
                  />
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
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "800",
                    color: theme.colors.primary,
                  }}
                >
                  Total Recontado: {modalTotalCalc} Unidades
                </Text>
              </View>
            </View>

            {/* BOTONES DE ACCIÓN EN EL MODAL */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Button
                  variant="secondary"
                  size="lg"
                  label="Cancelar"
                  onPress={() => setIsRecountModalVisible(false)}
                  fullWidth
                />
              </View>

              <View style={{ flex: 1.5 }}>
                <Button
                  variant="primary"
                  size="lg"
                  label="Guardar Re-conteo"
                  onPress={saveRecountFromModal}
                  fullWidth
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* DIÁLOGO ÚNICO: CONFIRMACIÓN CON % DE AVANCE Y LUEGO ÉXITO */}
      <AppDialog
        visible={dialog !== "none"}
        onClose={handleDialogClose}
        {...dialogProps}
      />
    </View>
  );
}
