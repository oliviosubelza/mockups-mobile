import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  Check,
  Pencil,
  RotateCcw,
  X,
} from 'lucide-react-native';

import {
  Badge,
  Button,
  Card,
  BoxUnitCounter,
  boxUnitTotal,
  formatBoxUnit,
  type BoxUnitValue,
} from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

import {
  useSupervisorStore,
  DISCREPANCY_CAUSES,
  COUNT_OK_LABEL,
  type SupervisorDiscrepancyItem,
} from './store';

export { DISCREPANCY_CAUSES, COUNT_OK_LABEL };

export default function ConsolidacionConteoScreen() {
  const theme = useAppTheme();

  const activeOrderCode = useSupervisorStore((state) => state.activeOrderCode);
  const allItems = useSupervisorStore((state) => state.items);
  const setCorrection = useSupervisorStore((state) => state.setCorrection);
  const setExpected = useSupervisorStore((state) => state.setExpected);
  const confirmItem = useSupervisorStore((state) => state.confirmItem);
  const setEditing = useSupervisorStore((state) => state.setEditing);

  // FILTRO RÁPIDO DE LA LISTA: TODOS / CON DIFERENCIA / CONTEO OK
  const [manifestFilter, setManifestFilter] = useState<'ALL' | 'DISCREPANCY' | 'OK'>('ALL');

  // MODAL SELECTOR DE TIPO
  const [pickerState, setPickerState] = useState<{
    visible: boolean;
    activeItemId: string | null;
  }>({
    visible: false,
    activeItemId: null,
  });

  const orderManifest = allItems.filter((i) => i.orderCode === activeOrderCode);
  const manifestItems =
    orderManifest.length > 0
      ? orderManifest
      : allItems.filter((i) => i.orderCode === 'OT-4892');
  const orderHeader = manifestItems[0] || allItems[0];

  const handleCorrectionChange = (itemId: string, next: BoxUnitValue) => {
    setCorrection(itemId, next.cajas, next.unidades);
  };

  const handleSetExpectedItem = (item: SupervisorDiscrepancyItem) => {
    setExpected(item.id);
  };

  const commitCorrection = (itemId: string) => {
    setPickerState({ visible: true, activeItemId: itemId });
  };

  const handleSelectType = (type: string) => {
    if (pickerState.activeItemId) {
      confirmItem(pickerState.activeItemId, type);
    }
    setPickerState({ visible: false, activeItemId: null });
  };

  // FILTRADO DEL MANIFIESTO
  const filteredManifest = manifestItems.filter((item) => {
    if (manifestFilter === 'DISCREPANCY') return item.difference !== 0;
    if (manifestFilter === 'OK') return item.difference === 0;
    return true;
  });

  const totalDiscrepancyCount = manifestItems.filter((i) => i.difference !== 0).length;
  const totalOkCount = manifestItems.filter((i) => i.difference === 0).length;

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 16,
          paddingBottom: 24,
          gap: 14,
        }}
      >
        {/* BANNER DE CABECERA DE LA OT */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 14,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <View style={{ gap: 2, flexShrink: 1 }}>
              <Text variant="header" style={{ fontSize: 17, fontWeight: '800', color: theme.colors.foreground }}>
                Consolidar: {orderHeader.orderCode}
              </Text>
              <Text variant="caption" numberOfLines={1} style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
                Chofer: {orderHeader.driverName} • {orderHeader.zonaRuta}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6, flexShrink: 0 }}>
              <Badge label={`${totalDiscrepancyCount} Dif.`} tone="danger" size="sm" icon={AlertTriangle} />
              <Badge label={`${totalOkCount} OK`} tone="success" size="sm" icon={CheckCircle2} />
            </View>
          </View>

          <View
            style={{
              backgroundColor: theme.colors.secondary,
              borderRadius: 10,
              padding: 9,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <ShieldCheck size={16} color={theme.colors.primary} />
            <Text variant="caption" style={{ color: theme.colors.foreground, fontSize: 11, fontWeight: '600', flex: 1 }}>
              Manifiesto completo ({manifestItems.length} productos). Revisa tanto los ítems con diferencia como los contados OK.
            </Text>
          </View>
        </View>

        {/* FILTROS RÁPIDOS DE VISUALIZACIÓN DEL MANIFIESTO */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setManifestFilter('ALL')}
            style={{
              flex: 1,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: manifestFilter === 'ALL' ? theme.colors.primary : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor: manifestFilter === 'ALL' ? theme.colors.primary : theme.colors.border,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: manifestFilter === 'ALL' ? '#ffffff' : theme.colors.foreground,
              }}
            >
              Todos ({manifestItems.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setManifestFilter('DISCREPANCY')}
            style={{
              flex: 1,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: manifestFilter === 'DISCREPANCY' ? theme.colors.danger : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor: manifestFilter === 'DISCREPANCY' ? theme.colors.danger : theme.colors.border,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: manifestFilter === 'DISCREPANCY' ? '#ffffff' : theme.colors.foreground,
              }}
            >
              Con Diferencia ({totalDiscrepancyCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setManifestFilter('OK')}
            style={{
              flex: 1,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: manifestFilter === 'OK' ? theme.colors.success : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor: manifestFilter === 'OK' ? theme.colors.success : theme.colors.border,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: manifestFilter === 'OK' ? '#ffffff' : theme.colors.foreground,
              }}
            >
              Conteo OK ({totalOkCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* LISTADO DE TODOS LOS PRODUCTOS DEL MANIFIESTO */}
        <View style={{ gap: 18 }}>
          {filteredManifest.map((item) => {
            const currentCorrection: BoxUnitValue = {
              cajas: item.correctedBoxes,
              unidades: item.correctedUnits,
            };
            const isOkItem = item.difference === 0;
            const isSavedMatched =
              boxUnitTotal(currentCorrection, item.cajaSize) === item.expectedQty;
            const isConfirmed = item.isConfirmed || isOkItem;
            const isEditing = item.isEditing && !isOkItem;
            const currentSelectedType =
              item.selectedType || (isOkItem ? COUNT_OK_LABEL : DISCREPANCY_CAUSES[1]);

            // EL ACENTO DEL BORDE RESUME EL ESTADO DEL ÍTEM DE UN VISTAZO
            const accentColor =
              isOkItem || isSavedMatched
                ? theme.colors.success
                : item.difference < 0
                ? theme.colors.danger
                : theme.colors.warning;

            return (
              <Card
                key={item.id}
                padding="m"
                borderRadius="xl"
                borderWidth={1}
                style={{
                  gap: 8,
                  borderColor:
                    isSavedMatched && !isEditing
                      ? theme.colors.success
                      : theme.colors.border,
                }}
              >
                {/* FILA 1: SKU + FRÍO + ESTADO DEL ÍTEM */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                    <Text
                      variant="label"
                      style={{ fontSize: 12, fontWeight: '800', color: theme.colors.mutedForeground }}
                    >
                      {item.codigo}
                    </Text>
                    {item.isColdChain && <Badge label="❄️ Frío" tone="neutral" size="sm" />}
                  </View>

                  <View style={{ flexShrink: 0 }}>
                    {isOkItem ? (
                      <Badge label="Conteo OK" tone="success" size="sm" icon={CheckCircle2} />
                    ) : isSavedMatched && !isEditing ? (
                      <Badge label="Ajustado" tone="success" size="sm" icon={CheckCircle2} />
                    ) : (
                      <Badge
                        label={item.difference > 0 ? `+${item.difference} Sobrante` : `${item.difference} Faltante`}
                        tone={item.difference > 0 ? 'warning' : 'danger'}
                        size="sm"
                      />
                    )}
                  </View>
                </View>

                {/* FILA 2: NOMBRE DEL PRODUCTO */}
                <Text
                  variant="subtitle"
                  numberOfLines={2}
                  style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}
                >
                  {item.nombre}
                </Text>

                {/* FILA 3: COMPARATIVO ESPERADO VS CONTADO */}
                <View
                  style={{
                    backgroundColor: isOkItem ? theme.colors.successSoft : theme.colors.secondary,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    gap: 6,
                  }}
                >
                  <TouchableOpacity
                    disabled={isOkItem || !isEditing || isSavedMatched}
                    onPress={() => handleSetExpectedItem(item)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                      <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                        Esperado en OT
                      </Text>
                      {!isOkItem && isEditing && !isSavedMatched && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            backgroundColor: theme.colors.primarySoft,
                          }}
                        >
                          <RotateCcw size={10} color={theme.colors.primary} />
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: theme.colors.primary,
                            }}
                          >
                            Aplicar
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      variant="label"
                      numberOfLines={1}
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color:
                          !isOkItem && isEditing && !isSavedMatched
                            ? theme.colors.primary
                            : theme.colors.foreground,
                        textDecorationLine:
                          !isOkItem && isEditing && !isSavedMatched ? 'underline' : 'none',
                      }}
                    >
                      {formatBoxUnit(item.expectedBoxes, item.expectedQty - item.expectedBoxes * item.cajaSize, item.expectedQty)}
                    </Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                      Contado por el chofer
                    </Text>
                    <Text
                      variant="label"
                      numberOfLines={1}
                      style={{ fontSize: 12, fontWeight: '800', color: accentColor }}
                    >
                      {formatBoxUnit(item.driverBoxes, item.driverUnits, item.driverQty)}
                    </Text>
                  </View>
                </View>

                {/* FILA 4: CONTROLES DE CONSOLIDACIÓN (SOLO ÍTEMS CON DIFERENCIA) */}
                {!isOkItem && (
                  <View
                    style={{
                      gap: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                    }}
                  >
                    {!isEditing && isConfirmed ? (
                      /* ESTADO RESOLVIDO / CONFIRMADO: SIN STEPPERS */
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: isSavedMatched ? theme.colors.successSoft : theme.colors.secondary,
                          borderColor: isSavedMatched ? theme.colors.success : theme.colors.border,
                          borderWidth: 1,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          gap: 8,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <CheckCircle2
                            size={16}
                            color={isSavedMatched ? theme.colors.success : theme.colors.primary}
                          />
                          <View style={{ flex: 1, gap: 1 }}>
                            <Text
                              variant="label"
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: isSavedMatched ? theme.colors.success : theme.colors.foreground,
                              }}
                            >
                              {isSavedMatched
                                ? `Total conforme: ${formatBoxUnit(
                                    parseInt(item.correctedBoxes || '0', 10),
                                    parseInt(item.correctedUnits || '0', 10),
                                    item.expectedQty
                                  )}`
                                : `Total confirmado: ${formatBoxUnit(
                                    parseInt(item.correctedBoxes || '0', 10),
                                    parseInt(item.correctedUnits || '0', 10),
                                    boxUnitTotal(currentCorrection, item.cajaSize)
                                  )}`}
                            </Text>
                            <Text
                              variant="caption"
                              style={{ fontSize: 10, color: theme.colors.mutedForeground }}
                            >
                              {item.selectedType
                                ? `Clasificación: ${item.selectedType}`
                                : isSavedMatched
                                ? 'Diferencia corregida sin observaciones'
                                : 'Diferencia confirmada'}
                            </Text>
                          </View>
                        </View>

                        <Button
                          label="Modificar"
                          icon={Pencil}
                          variant="secondary"
                          size="xs"
                          onPress={() => setEditing(item.id, true)}
                        />
                      </View>
                    ) : (
                      /* MODO EDICIÓN: STEPPERS Y CLASIFICADOR */
                      <View style={{ gap: 8 }}>
                        <BoxUnitCounter
                          value={currentCorrection}
                          onChange={(next) => handleCorrectionChange(item.id, next)}
                          cajaSize={item.cajaSize}
                          totalLabel="Total consolidado"
                          targetQty={item.expectedQty}
                          action={
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                minHeight: theme.controlSizes.xs.height,
                                justifyContent: 'center',
                              }}
                            >
                              {isConfirmed && (
                                <Button
                                  label="Cancelar"
                                  variant="secondary"
                                  size="xs"
                                  onPress={() => setEditing(item.id, false)}
                                />
                              )}
                              <Button
                                label="Guardar"
                                icon={Check}
                                variant="primary"
                                size="xs"
                                onPress={() => commitCorrection(item.id)}
                              />
                            </View>
                          }
                        />

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text
                            variant="label"
                            numberOfLines={2}
                            style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground, flex: 1 }}
                          >
                            Clasificación
                          </Text>

                          <TouchableOpacity
                            onPress={() => setPickerState({ visible: true, activeItemId: item.id })}
                            activeOpacity={0.7}
                            style={{
                              flex: 1.4,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 6,
                              backgroundColor: theme.colors.secondary,
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              height: 34,
                              borderWidth: 1,
                              borderColor: theme.colors.border,
                            }}
                          >
                            <Text
                              variant="caption"
                              numberOfLines={1}
                              style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground, flex: 1 }}
                            >
                              {currentSelectedType}
                            </Text>
                            <ChevronDown size={15} color={theme.colors.mutedForeground} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {/* MODAL SELECTOR DE TIPO DE DIFERENCIA */}
      <Modal
        visible={pickerState.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPickerState({ visible: false, activeItemId: null })}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: 18,
              gap: 14,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="label" style={{ fontSize: 16, fontWeight: '700', color: theme.colors.foreground }}>
                Seleccionar Tipo de Diferencia
              </Text>
              <TouchableOpacity
                onPress={() => setPickerState({ visible: false, activeItemId: null })}
                style={{ padding: 4 }}
              >
                <X size={20} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              {DISCREPANCY_CAUSES.map((cause) => {
                const activeItem = allItems.find((i) => i.id === pickerState.activeItemId);
                const isSelected = activeItem?.selectedType === cause;

                return (
                  <TouchableOpacity
                    key={cause}
                    onPress={() => handleSelectType(cause)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: isSelected ? theme.colors.primarySoft : theme.colors.secondary,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    }}
                  >
                    <Text
                      variant="label"
                      style={{
                        fontSize: 14,
                        fontWeight: isSelected ? '800' : '600',
                        color: isSelected ? theme.colors.primary : theme.colors.foreground,
                        flex: 1,
                      }}
                    >
                      {cause}
                    </Text>
                    {isSelected && <Check size={18} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </Box>
  );
}
