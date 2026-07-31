import {
  CheckCircle2,
  XCircle,
  Trash2,
  Package,
  Layers,
  X,
  Search,
  Bookmark,
  Snowflake,
  CloudUpload,
} from "lucide-react-native";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  View,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { findRouteById, navigateTo } from "@/navigation/registry";
import { FloatingActionButton, SwipeableItem, Badge, Button } from "@/shared/ui";
import { FormSkeleton, ListSkeleton } from "@/shared/ui/Skeleton";
import { SuccessDialog } from "@/shared/ui/SuccessDialog";
import { Box, Text, useAppTheme } from "@/theme";
import { useDespachos } from "./store";

type TipoUnidad = "UNIDAD" | "CAJA";
const EMPTY: any[] = [];

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
  const removeCheck = useDespachos((state) => state.removeCheck);
  const guardar = useDespachos((state) => state.guardar);

  const activeId = despachoId || activeIdFromStore || "1";
  const despacho = despachos.find((d) => d.id === activeId) || despachos[0];
  const items = checksByDespacho[activeId] ?? EMPTY;

  // Estados locales
  const [isLoading, setIsLoading] = useState(true);
  const [productoTexto, setProductoTexto] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [cantidad, setCantidad] = useState("");
  const [tipoUnidad, setTipoUnidad] = useState<TipoUnidad>("UNIDAD");
  const [saved, setSaved] = useState(false);

  // Focus y sugerencias
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCantFocused, setIsCantFocused] = useState(false);
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  const cantidadInputRef = useRef<TextInput>(null);

  // Simulación de carga
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Excluir productos ya agregados del buscador
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
    cantidadInputRef.current?.focus();
  };

  const limpiarBuscador = () => {
    setProductoTexto("");
    setProductoSeleccionado(null);
    setCantidad("");
    setMostrarSugerencias(false);
  };

  const canAdd = productoSeleccionado !== null && cantidad.trim().length > 0;

  const onAdd = () => {
    if (!canAdd) return;
    const cantidadNumerica = parseInt(cantidad, 10);
    const multiplicador =
      tipoUnidad === "CAJA" ? productoSeleccionado.cajaSize : 1;
    const totalContado = cantidadNumerica * multiplicador;
    const isMatch = totalContado === productoSeleccionado.expectedQty;

    const dataEmpaquetada = `${productoSeleccionado.nombre} | ${cantidad} ${tipoUnidad} | ${isMatch} | ${productoSeleccionado.isCold} | ${productoSeleccionado.expectedQty} | ${totalContado}`;

    addCheck(activeId, productoSeleccionado.codigo, dataEmpaquetada);
    limpiarBuscador();
    setSaved(false);
  };

  const onGuardar = () => {
    guardar(activeId);
    setSaved(true);
  };

  const handleIncrement = (inc: number) => {
    const actual = parseInt(cantidad || "0", 10);
    const nxt = Math.max(0, actual + inc);
    setCantidad(nxt.toString());
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 90, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER DE CONTEXTO Y BOTÓN DE FINALIZAR EN EL HEADER (OPCIÓN 3) */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ gap: 2 }}>
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
              <Text variant="header" style={{ color: theme.colors.foreground }}>
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

          {/* BOTÓN DE ACCIÓN PRINCIPAL EN HEADER (OPCIÓN 3) */}
          <Button
            label="Finalizar"
            icon={CloudUpload}
            size="sm"
            variant={items.length > 0 ? "primary" : "secondary"}
            disabled={items.length === 0}
            onPress={onGuardar}
          />
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
              <Text variant="label" style={{ marginBottom: 6, fontSize: 14 }}>
                {productoSeleccionado ? "Producto Seleccionado" : "Buscar Producto"}
              </Text>

              {/* BUSCADOR O PÍLDORA DE PRODUCTO SELECCIONADO */}
              <View
                style={{ position: "relative", zIndex: 100, marginBottom: 12, height: 44 }}
              >
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
                      {productoSeleccionado.nombre} {productoSeleccionado.isCold ? " (Frío)" : ""}
                    </Text>

                    <TouchableOpacity onPress={limpiarBuscador} style={{ padding: 6 }}>
                      <X color={theme.colors.mutedForeground} size={18} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View
                      style={{
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

                    {/* MENÚ FLOTANTE DE SUGERENCIAS */}
                    {mostrarSugerencias && (
                      <View
                        style={{
                          position: "absolute",
                          top: 46,
                          left: 0,
                          right: 0,
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
                                {prod.isCold ? " (Frío)" : ""}
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
                  </>
                )}
              </View>

              {/* CANTIDAD Y TIPO DE EMPAQUE */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginBottom: 12,
                  zIndex: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="label" style={{ marginBottom: 4, fontSize: 13 }}>
                    Cantidad
                  </Text>
                  <TextInput
                    ref={cantidadInputRef}
                    value={cantidad}
                    onChangeText={setCantidad}
                    onFocus={() => setIsCantFocused(true)}
                    onBlur={() => setIsCantFocused(false)}
                    placeholder="0"
                    placeholderTextColor={theme.colors.mutedForeground}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: isCantFocused ? theme.colors.cardBackground : theme.colors.secondary,
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      height: 42,
                      borderRadius: 8,
                      fontSize: 15,
                      fontFamily: "Montserrat_600SemiBold",
                      borderWidth: 1.5,
                      borderColor: isCantFocused ? theme.colors.primary : theme.colors.border,
                      textAlign: "center",
                      color: theme.colors.foreground,
                    }}
                  />
                </View>

                {/* SELECTOR DE EMPAQUE */}
                <View style={{ flex: 1.8 }}>
                  <Text variant="label" style={{ marginBottom: 4, fontSize: 13 }}>
                    Empaque
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      backgroundColor: theme.colors.secondary,
                      borderRadius: 8,
                      padding: 3,
                      height: 42,
                      alignItems: "center",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => setTipoUnidad("UNIDAD")}
                      style={{
                        flex: 1,
                        height: 36,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor:
                          tipoUnidad === "UNIDAD" ? theme.colors.cardBackground : "transparent",
                        borderRadius: 6,
                        elevation: tipoUnidad === "UNIDAD" ? 1 : 0,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        flexDirection: "row",
                        gap: 6,
                      }}
                    >
                      <Package
                        size={16}
                        color={tipoUnidad === "UNIDAD" ? theme.colors.primary : theme.colors.mutedForeground}
                      />
                      <Text
                        variant="label"
                        style={{
                          fontSize: 13,
                          color:
                            tipoUnidad === "UNIDAD" ? theme.colors.primary : theme.colors.mutedForeground,
                        }}
                      >
                        Unidad
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setTipoUnidad("CAJA")}
                      style={{
                        flex: 1,
                        height: 36,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor:
                          tipoUnidad === "CAJA" ? theme.colors.cardBackground : "transparent",
                        borderRadius: 6,
                        elevation: tipoUnidad === "CAJA" ? 1 : 0,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        flexDirection: "row",
                        gap: 6,
                      }}
                    >
                      <Layers
                        size={16}
                        color={tipoUnidad === "CAJA" ? theme.colors.primary : theme.colors.mutedForeground}
                      />
                      <Text
                        variant="label"
                        style={{
                          fontSize: 13,
                          color: tipoUnidad === "CAJA" ? theme.colors.primary : theme.colors.mutedForeground,
                        }}
                      >
                        Caja
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* ATAJOS RÁPIDOS DE INCREMENTO */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 14,
                }}
              >
                <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
                  Rápido:
                </Text>
                {[1, 5, 10, 24].map((inc) => (
                  <TouchableOpacity
                    key={inc}
                    onPress={() => handleIncrement(inc)}
                    style={{
                      backgroundColor: theme.colors.secondary,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text variant="caption" style={{ fontWeight: "700", color: theme.colors.foreground, fontSize: 12 }}>
                      +{inc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* BOTÓN DE REGISTRO COMPARTIDO DE LA GALERÍA */}
              <Button
                label="Registrar Ítem"
                variant={canAdd ? "primary" : "secondary"}
                disabled={!canAdd}
                onPress={onAdd}
                endIcon={Bookmark}
                fullWidth
                size="md"
              />
            </View>

            {/* LISTA DE RESULTADOS ESTILO LIST TILE UNIFICADO */}
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

                    const diferencia = contado - esperado;
                    const textoDiferencia =
                      diferencia > 0
                        ? `+${diferencia} (sobran)`
                        : `${diferencia} (faltan)`;

                    const isLast = index === items.length - 1;

                    return (
                      <SwipeableItem
                        key={item.id}
                        onDelete={() => removeCheck(activeId, item.id)}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: theme.colors.cardBackground,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderBottomWidth: isLast ? 0 : 1,
                            borderBottomColor: theme.colors.border,
                          }}
                        >
                          {/* LEADING: Badge circular de estado */}
                          <View
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 17,
                              backgroundColor: esMatch ? theme.colors.successSoft : theme.colors.dangerSoft,
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 10,
                              flexShrink: 0,
                            }}
                          >
                            {esMatch ? (
                              <CheckCircle2 size={18} color={theme.colors.success} />
                            ) : (
                              <XCircle size={18} color={theme.colors.danger} />
                            )}
                          </View>

                          {/* BODY: Título y Subtítulos con desborde controlado */}
                          <View style={{ flex: 1, gap: 3, overflow: "hidden", marginRight: 8 }}>
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
                                  fontSize: 12,
                                  color: theme.colors.foreground,
                                  fontWeight: "700",
                                  flexShrink: 0,
                                }}
                              >
                                {item.codigo}
                              </Text>
                              <Text style={{ fontSize: 11, color: theme.colors.mutedForeground, flexShrink: 0 }}>•</Text>
                              <Text
                                variant="bodySmall"
                                style={{
                                  fontSize: 13,
                                  color: theme.colors.foreground,
                                  flex: 1,
                                  fontWeight: "500",
                                }}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {nombreReal}
                              </Text>
                              {isCold && (
                                <View style={{ flexShrink: 0, marginLeft: 2 }}>
                                  <Snowflake size={13} color={theme.colors.primary} />
                                </View>
                              )}
                            </View>

                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <Text
                                variant="caption"
                                style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                              >
                                Ingresado:{" "}
                                <Text
                                  variant="label"
                                  style={{ fontSize: 11, fontWeight: "600" }}
                                >
                                  {detalleCantidad}
                                </Text>
                              </Text>

                              {isCold && (
                                <Text
                                  variant="caption"
                                  style={{
                                    color: theme.colors.primary,
                                    fontSize: 11,
                                    fontWeight: "600",
                                  }}
                                >
                                  • Frío
                                </Text>
                              )}
                            </View>

                            {!esMatch && (
                              <Text
                                variant="caption"
                                style={{
                                  color: theme.colors.danger,
                                  fontWeight: "700",
                                  fontSize: 11,
                                  marginTop: 1,
                                }}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {isCold
                                  ? `Diferencia: ${textoDiferencia} (Esperado: ${esperado})`
                                  : "Diferencia detectada en inventario."}
                              </Text>
                            )}
                          </View>

                          {/* TRAILING: Botón de eliminar manual FIJO */}
                          <Pressable
                            onPress={() => removeCheck(activeId, item.id)}
                            hitSlop={10}
                            style={{
                              flexShrink: 0,
                              padding: 6,
                              borderRadius: 8,
                              backgroundColor: theme.colors.secondary,
                            }}
                          >
                            <Trash2 size={16} color={theme.colors.mutedForeground} />
                          </Pressable>
                        </View>
                      </SwipeableItem>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>



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
