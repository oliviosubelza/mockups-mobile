import {
  Check,
  CheckCircle2,
  CheckSquare,
  Package,
  Search,
  Snowflake,
  Square,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

import { Button, SearchField } from "@/shared/ui";
import { Text, useAppTheme } from "@/theme";

export type DeliveryItem = {
  id: string;
  codigo: string;
  nombre: string;
  plannedQty: number;
  deliveredQty: number;
  boxes?: number; // Cajas cerradas
  looseUnits?: number; // Unidades sueltas
  unitsPerBox?: number; // Factor de conversión (unidades por caja)
  isCold: boolean;
  category?: string;
  unit: string;
  unitPrice?: number;
};

export type ProductsChecklistModalProps = {
  visible: boolean;
  onClose: () => void;
  items: DeliveryItem[];
  checkedItemIds: string[];
  onToggleItem: (id: string) => void;
  onToggleAll: () => void;
  clientName?: string;
};

const formatMoney = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(val)) return "0.00";
  return val.toFixed(2);
};

/** Formatea la cantidad en cajas y unidades de forma concisa para badges y etiquetas */
export const formatItemQuantity = (item: DeliveryItem): string => {
  if (item.boxes !== undefined && item.looseUnits !== undefined) {
    if (item.boxes > 0 && item.looseUnits > 0) {
      return `${item.boxes} ${item.boxes === 1 ? "cja" : "cjs"} + ${item.looseUnits} u.`;
    }
    if (item.boxes > 0) {
      return `${item.boxes} ${item.boxes === 1 ? "caja" : "cajas"}`;
    }
    return `${item.looseUnits} unid.`;
  }
  return `${item.deliveredQty} ${item.unit || "unid"}`;
};

export const ProductsChecklistModal = ({
  visible,
  onClose,
  items,
  checkedItemIds,
  onToggleItem,
  onToggleAll,
  clientName,
}: ProductsChecklistModalProps) => {
  const theme = useAppTheme();

  const [searchQuery, setSearchQuery] = useState("");

  const checkedCount = checkedItemIds.length;

  const totalPlannedUnits = useMemo(
    () => items.reduce((acc, i) => acc + (i.plannedQty || 0), 0),
    [items],
  );
  const totalDeliveredUnits = useMemo(
    () =>
      items
        .filter((i) => checkedItemIds.includes(i.id))
        .reduce((acc, i) => acc + (i.deliveredQty || 0), 0),
    [items, checkedItemIds],
  );

  const verifiedAmount = useMemo(() => {
    return items
      .filter((i) => checkedItemIds.includes(i.id))
      .reduce(
        (acc, item) => acc + (item.deliveredQty || 0) * (item.unitPrice || 0),
        0,
      );
  }, [items, checkedItemIds]);

  const verificationPercent =
    items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  const isAllChecked =
    items.length > 0 && checkedItemIds.length === items.length;

  // Filtrado ágil únicamente por texto de búsqueda
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q === "") return items;

    return items.filter(
      (item) =>
        item.nombre.toLowerCase().includes(q) ||
        item.codigo.toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  const isAllFilteredChecked =
    filteredItems.length > 0 &&
    filteredItems.every((item) => checkedItemIds.includes(item.id));

  const handleToggleFiltered = () => {
    if (searchQuery === "") {
      onToggleAll();
      return;
    }

    const filteredIds = filteredItems.map((i) => i.id);
    if (isAllFilteredChecked) {
      filteredIds.forEach((id) => {
        if (checkedItemIds.includes(id)) {
          onToggleItem(id);
        }
      });
    } else {
      filteredIds.forEach((id) => {
        if (!checkedItemIds.includes(id)) {
          onToggleItem(id);
        }
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* BACKDROP SEMITRANSPARENTE */}
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.55)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* CONTENEDOR TIPO BOTTOM SHEET CON BORDE SUPERIOR CURVO Y DEFINIDO */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 2,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: theme.colors.border,
            maxHeight: "92%",
            height: "92%",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.18,
            shadowRadius: 14,
            elevation: 20,
          }}
        >
          {/* MANIJA INDICADORA DE ARRASTRE (PILL HANDLE) */}
          <View
            style={{
              alignSelf: "center",
              width: 42,
              height: 4.5,
              borderRadius: 3,
              backgroundColor: theme.colors.border,
              marginTop: 10,
              marginBottom: 4,
            }}
          />

          {/* CABECERA DEL BOTTOM SHEET */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              backgroundColor: theme.colors.cardBackground,
            }}
          >
            <View style={{ flex: 1, gap: 1, marginRight: 8 }}>
              <Text
                variant="title"
                style={{ fontSize: 16, color: theme.colors.foreground }}
                numberOfLines={1}
              >
                Verificación de Mercadería
              </Text>
              <Text
                variant="caption"
                style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                numberOfLines={1}
              >
                {clientName ? `${clientName} • ` : ""}
                {checkedCount} de {items.length} verificados
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.colors.secondary,
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <X size={18} color={theme.colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* BARRA DE PROGRESO Y CONTROLES SUPERIORES */}
          <View
            style={{
              backgroundColor: theme.colors.cardBackground,
              paddingHorizontal: 16,
              paddingVertical: 10,
              gap: 8,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            {/* TRACK DE PROGRESO Y BOTÓN MARCAR TODOS */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
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
                          : theme.colors.primary,
                    }}
                    numberOfLines={1}
                  >
                    {checkedCount}/{items.length} ({verificationPercent}%)
                  </Text>
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 11,
                      color: theme.colors.mutedForeground,
                    }}
                    numberOfLines={1}
                  >
                    {totalDeliveredUnits}/{totalPlannedUnits} unid.
                  </Text>
                </View>
              </View>

              {/* BOTÓN INTELIGENTE: MARCAR TODOS / MARCAR FILTRADOS */}
              <TouchableOpacity
                onPress={handleToggleFiltered}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor:
                    (searchQuery === "" ? isAllChecked : isAllFilteredChecked)
                      ? theme.colors.primarySoft
                      : theme.colors.secondary,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor:
                    (searchQuery === "" ? isAllChecked : isAllFilteredChecked)
                      ? theme.colors.primary
                      : theme.colors.border,
                  flexShrink: 0,
                }}
              >
                {(searchQuery === "" ? isAllChecked : isAllFilteredChecked) ? (
                  <CheckSquare size={15} color={theme.colors.primary} />
                ) : (
                  <Square size={15} color={theme.colors.mutedForeground} />
                )}
                <Text
                  variant="caption"
                  style={{
                    fontWeight: "700",
                    color:
                      (searchQuery === "" ? isAllChecked : isAllFilteredChecked)
                        ? theme.colors.primary
                        : theme.colors.foreground,
                    fontSize: 11,
                  }}
                >
                  {searchQuery === ""
                    ? isAllChecked
                      ? "Desmarcar todos"
                      : "Marcar todos"
                    : isAllFilteredChecked
                      ? "Desmarcar filtro"
                      : `Marcar (${filteredItems.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* BUSCADOR DIRECTO */}
            <SearchField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar por producto o código SKU..."
            />
          </View>

          {/* LISTA CON SCROLL COMPLETO DE PRODUCTOS */}
          <ScrollView
            contentContainerStyle={{
              padding: 14,
              paddingBottom: 20,
              gap: 8,
            }}
            showsVerticalScrollIndicator={true}
          >
            {filteredItems.length > 0 ? (
              <View
                style={{
                  backgroundColor: theme.colors.cardBackground,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  overflow: "hidden",
                }}
              >
                {filteredItems.map((item, index) => {
                  const isLast = index === filteredItems.length - 1;
                  const isChecked = checkedItemIds.includes(item.id);
                  const hasDualUnits =
                    item.boxes !== undefined &&
                    item.looseUnits !== undefined &&
                    item.boxes > 0 &&
                    item.looseUnits > 0;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.7}
                      onPress={() => onToggleItem(item.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 11,
                        paddingHorizontal: 12,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: theme.colors.border,
                        backgroundColor: isChecked
                          ? "transparent"
                          : theme.colors.secondary + "30",
                        gap: 10,
                      }}
                    >
                      {/* CHECKBOX A LA IZQUIERDA */}
                      <TouchableOpacity
                        onPress={() => onToggleItem(item.id)}
                        activeOpacity={0.7}
                        style={{
                          paddingVertical: 4,
                          paddingHorizontal: 2,
                          flexShrink: 0,
                        }}
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

                      {/* DETALLE DEL PRODUCTO (RESPONSIVO PARA PANTALLAS PEQUEÑAS) */}
                      <View style={{ flex: 1, gap: 2, overflow: "hidden" }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            overflow: "hidden",
                          }}
                        >
                          <Text
                            variant="label"
                            style={{
                              fontWeight: "700",
                              fontSize: 11,
                              color: isChecked
                                ? theme.colors.foreground
                                : theme.colors.mutedForeground,
                              flexShrink: 0,
                            }}
                          >
                            {item.codigo}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              color: theme.colors.mutedForeground,
                              flexShrink: 0,
                            }}
                          >
                            •
                          </Text>
                          <Text
                            variant="bodySmall"
                            style={{
                              flex: 1,
                              fontSize: 12,
                              fontWeight: isChecked ? "600" : "500",
                              color: theme.colors.foreground,
                            }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {item.nombre}
                          </Text>
                          {item.isCold && (
                            <View
                              style={{
                                flexShrink: 0,
                                backgroundColor: theme.colors.primarySoft,
                                paddingHorizontal: 4,
                                paddingVertical: 1.5,
                                borderRadius: 4,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <Snowflake
                                size={11}
                                color={theme.colors.primary}
                              />
                              <Text
                                style={{
                                  fontSize: 9,
                                  color: theme.colors.primary,
                                  fontWeight: "700",
                                }}
                              >
                                Frío
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* SUBTÍTULO CON PRECIO Y DETALLE DE CAJAS / SUELTAS */}
                        <Text
                          variant="caption"
                          style={{
                            color: theme.colors.mutedForeground,
                            fontSize: 11,
                          }}
                          numberOfLines={1}
                        >
                          Bs. {formatMoney(item.unitPrice)} c/u
                          {hasDualUnits ? (
                            <Text style={{ color: theme.colors.primary }}>
                              {" "}• {item.boxes} {item.boxes === 1 ? "cja" : "cjs"} + {item.looseUnits} u.
                            </Text>
                          ) : null}{" "}
                          •{" "}
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

                      {/* BADGE DE CANTIDAD (REFLEJA CAJAS + UNIDADES SUELTAS) */}
                      <View
                        style={{
                          flexShrink: 0,
                          backgroundColor: isChecked
                            ? theme.colors.successSoft
                            : theme.colors.secondary,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: isChecked
                            ? theme.colors.success + "40"
                            : theme.colors.border,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {isChecked ? (
                          <Check size={12} color={theme.colors.success} />
                        ) : hasDualUnits ? (
                          <Package size={12} color={theme.colors.primary} />
                        ) : null}
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: isChecked
                              ? theme.colors.success
                              : theme.colors.foreground,
                          }}
                        >
                          {formatItemQuantity(item)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              /* ESTADO VACÍO EN BÚSQUEDA */
              <View
                style={{
                  backgroundColor: theme.colors.cardBackground,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: theme.colors.secondary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Search size={24} color={theme.colors.mutedForeground} />
                </View>
                <Text
                  variant="title"
                  style={{ fontSize: 15, textAlign: "center" }}
                >
                  {`Sin resultados para "${searchQuery}"`}
                </Text>
                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.mutedForeground,
                    textAlign: "center",
                    maxWidth: 240,
                  }}
                >
                  Intenta con otro código SKU o nombre de producto.
                </Text>
                <Button
                  label="Limpiar búsqueda"
                  variant="outline"
                  size="sm"
                  onPress={() => setSearchQuery("")}
                />
              </View>
            )}
          </ScrollView>

          {/* PIE DE PÁGINA FIJO CON TOTAL Y BOTÓN "GUARDAR CONTEO" */}
          <SafeAreaView
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: theme.colors.cardBackground,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <View style={{ flex: 1, gap: 1, marginRight: 6 }}>
              <Text
                variant="caption"
                style={{ color: theme.colors.mutedForeground, fontSize: 11 }}
                numberOfLines={1}
              >
                Subtotal ({checkedCount}/{items.length} verificados)
              </Text>
              <Text
                variant="title"
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color:
                    verificationPercent === 100
                      ? theme.colors.success
                      : theme.colors.foreground,
                }}
                numberOfLines={1}
              >
                Bs. {formatMoney(verifiedAmount)}
              </Text>
            </View>

            <View style={{ flexShrink: 0 }}>
              <Button
                label="Guardar Conteo"
                icon={CheckCircle2}
                variant="primary"
                size="md"
                onPress={onClose}
              />
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};
