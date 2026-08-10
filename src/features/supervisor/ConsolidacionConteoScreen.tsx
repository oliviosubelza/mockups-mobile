import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Plus,
  Minus,
  ChevronDown,
  Check,
  X,
  PackageCheck,
  Package,
} from 'lucide-react-native';

import { goBackOrNavigate } from '@/navigation/registry';
import { Badge, Button, AppDialog, type DialogType } from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

export interface OrderProductItem {
  id: string;
  codigo: string;
  nombre: string;
  isCold: boolean;
  expectedQty: number; // En unidades esperadas
  expectedBoxes: number;
  driverQty: number; // En unidades contadas por el chofer
  driverBoxes: number;
  driverUnits: number;
  difference: number; // 0 = OK, >0 sobrante, <0 faltante
  type: 'SURPLUS' | 'SHORTAGE' | 'OK';
}

export const DISCREPANCY_TYPES = [
  'Conteo verificado OK (Sin novedad)',
  'Diferencia por faltante',
  'Diferencia por cantidad',
  'Diferencia por producto dañado / merma',
  'Diferencia por error de empaque',
] as const;

// MANIFIESTO COMPLETO DE LA OT-4892 (SALSAS, PANIFICACIÓN Y REPOSTERÍA)
const MOCK_ORDER_MANIFEST: OrderProductItem[] = [
  {
    id: 'disc-1',
    codigo: 'PROD-002',
    nombre: 'Salsa Mayonesa Industrial 10kg',
    isCold: true,
    expectedQty: 144,
    expectedBoxes: 12,
    driverQty: 146,
    driverBoxes: 12,
    driverUnits: 2,
    difference: 2,
    type: 'SURPLUS',
  },
  {
    id: 'disc-2',
    codigo: 'PROD-005',
    nombre: 'Salsa de Tomate Ketchup 5kg',
    isCold: false,
    expectedQty: 96,
    expectedBoxes: 8,
    driverQty: 93,
    driverBoxes: 7,
    driverUnits: 9,
    difference: -3,
    type: 'SHORTAGE',
  },
  {
    id: 'disc-3',
    codigo: 'PROD-001',
    nombre: 'Esencia de Vainilla Industrial 1L',
    isCold: false,
    expectedQty: 120,
    expectedBoxes: 10,
    driverQty: 120,
    driverBoxes: 10,
    driverUnits: 0,
    difference: 0,
    type: 'OK',
  },
  {
    id: 'disc-4',
    codigo: 'PROD-008',
    nombre: 'Crema Pastelera Lista 1kg',
    isCold: true,
    expectedQty: 48,
    expectedBoxes: 4,
    driverQty: 48,
    driverBoxes: 4,
    driverUnits: 0,
    difference: 0,
    type: 'OK',
  },
];

export default function ConsolidacionConteoScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  // FILTRO RÁPIDO DE LA LISTA: TODOS / CON DIFERENCIA / CONTEO OK
  const [manifestFilter, setManifestFilter] = useState<'ALL' | 'DISCREPANCY' | 'OK'>('ALL');

  // ESTADO DE CORRECCIÓN POR ÍTEM (INICIALMENTE MUESTRA LO CONTADO POR EL CHOFER)
  const [corrections, setCorrections] = useState<Record<string, string>>({
    'disc-1': '146',
    'disc-2': '93',
    'disc-3': '120',
    'disc-4': '48',
  });

  // SELECT DE TIPO DE DIFERENCIA POR ÍTEM
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string>>({
    'disc-1': 'Diferencia por cantidad',
    'disc-2': 'Diferencia por faltante',
    'disc-3': 'Conteo verificado OK (Sin novedad)',
    'disc-4': 'Conteo verificado OK (Sin novedad)',
  });

  // MODAL SELECTOR DE TIPO
  const [pickerState, setPickerState] = useState<{
    visible: boolean;
    activeItemId: string | null;
  }>({
    visible: false,
    activeItemId: null,
  });

  // DIÁLOGO DE CONFIRMACIÓN
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const handleCorrectionChange = (itemId: string, val: string) => {
    setCorrections((prev) => ({ ...prev, [itemId]: val }));
  };

  const handleAdjustQty = (itemId: string, delta: number) => {
    const currentVal = parseInt(corrections[itemId] || '0', 10);
    const newVal = Math.max(0, currentVal + delta);
    setCorrections((prev) => ({ ...prev, [itemId]: newVal.toString() }));
  };

  const handleSelectType = (type: string) => {
    if (pickerState.activeItemId) {
      setSelectedTypes((prev) => ({
        ...prev,
        [pickerState.activeItemId!]: type,
      }));
    }
    setPickerState({ visible: false, activeItemId: null });
  };

  const handleConsolidateOrder = () => {
    setDialogConfig({
      visible: true,
      title: 'Consolidación Exitosa',
      message: 'Se han consolidado todos los productos de la Orden OT-4892. La revisión a ciegas ha sido aprobada.',
      type: 'success',
      onConfirm: () => {
        setDialogConfig((prev) => ({ ...prev, visible: false }));
        goBackOrNavigate('supervisor.ordenes');
      },
    });
  };

  // FILTRADO DEL MANIFIESTO
  const filteredManifest = MOCK_ORDER_MANIFEST.filter((item) => {
    if (manifestFilter === 'DISCREPANCY') return item.difference !== 0;
    if (manifestFilter === 'OK') return item.difference === 0;
    return true;
  });

  const totalDiscrepancyCount = MOCK_ORDER_MANIFEST.filter((i) => i.difference !== 0).length;
  const totalOkCount = MOCK_ORDER_MANIFEST.filter((i) => i.difference === 0).length;

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 90,
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
                Consolidar: OT-4892
              </Text>
              <Text variant="caption" numberOfLines={1} style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
                Chofer: Cristhian Macchiavelli • Ruta Norte • Santa Cruz
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6, flexShrink: 0 }}>
              <Badge label={`${totalDiscrepancyCount} Dif.`} tone="danger" emphasis="soft" size="sm" icon={AlertTriangle} />
              <Badge label={`${totalOkCount} OK`} tone="success" emphasis="soft" size="sm" icon={CheckCircle2} />
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
              Manifiesto completo ({MOCK_ORDER_MANIFEST.length} productos). Revisa tanto los ítems con diferencia como los contados OK.
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
              Todos ({MOCK_ORDER_MANIFEST.length})
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
        <View style={{ gap: 12 }}>
          {filteredManifest.map((item) => {
            const currentCorrection = corrections[item.id] || '';
            const currentCorrectionNum = parseInt(currentCorrection || '0', 10);
            const isOkItem = item.difference === 0;
            const isMatched = !isNaN(currentCorrectionNum) && currentCorrectionNum === item.expectedQty;
            const currentSelectedType = selectedTypes[item.id] || (isOkItem ? 'Conteo verificado OK (Sin novedad)' : DISCREPANCY_TYPES[1]);

            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: theme.colors.cardBackground,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: isOkItem || isMatched ? theme.colors.success : theme.colors.border,
                  borderLeftWidth: 4,
                  borderLeftColor: isOkItem
                    ? theme.colors.success
                    : item.difference < 0
                    ? theme.colors.danger
                    : theme.colors.warning,
                  padding: 14,
                  gap: 10,
                }}
              >
                {/* FILA 1: CÓDIGO + FRÍO + BADGE DE ESTADO */}
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
                      variant="caption"
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: theme.colors.mutedForeground,
                      }}
                    >
                      {item.codigo}
                    </Text>
                    {item.isCold && (
                      <Badge label="❄️ Frío" tone="neutral" emphasis="soft" size="sm" />
                    )}
                  </View>

                  <View style={{ flexShrink: 0 }}>
                    {isOkItem ? (
                      <Badge
                        label="✓ Conteo OK"
                        tone="success"
                        emphasis="soft"
                        size="sm"
                        icon={CheckCircle2}
                      />
                    ) : isMatched ? (
                      <Badge
                        label="✓ Ajustado"
                        tone="success"
                        emphasis="solid"
                        size="sm"
                        icon={CheckCircle2}
                      />
                    ) : (
                      <Badge
                        label={item.difference > 0 ? `+${item.difference} Sobrante` : `${item.difference} Faltante`}
                        tone={item.difference > 0 ? 'warning' : 'danger'}
                        emphasis="soft"
                        size="sm"
                      />
                    )}
                  </View>
                </View>

                {/* FILA 2: NOMBRE DEL PRODUCTO */}
                <Text
                  variant="subtitle"
                  numberOfLines={2}
                  style={{ fontSize: 15, fontWeight: '700', color: theme.colors.foreground }}
                >
                  {item.nombre}
                </Text>

                {/* FILA 3: RESUMEN COMPARATIVO (ESPERADO VS CHOFER) */}
                <View
                  style={{
                    backgroundColor: isOkItem ? theme.colors.successSoft : theme.colors.secondary,
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    gap: 5,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                      Esperado en OT:
                    </Text>
                    <Text
                      variant="label"
                      numberOfLines={1}
                      style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground, flexShrink: 1, textAlign: 'right' }}
                    >
                      {item.expectedQty} Unidades ({item.expectedBoxes} Cajas)
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                      Contado Chofer:
                    </Text>
                    <Text
                      variant="label"
                      numberOfLines={1}
                      style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground, flexShrink: 1, textAlign: 'right' }}
                    >
                      {item.driverBoxes} Cajas ({item.driverQty} u.)
                    </Text>
                  </View>

                  <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 1 }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <Text
                      variant="caption"
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: isOkItem ? theme.colors.success : theme.colors.danger,
                      }}
                    >
                      Estado Conteo:
                    </Text>
                    <Text
                      variant="label"
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: isOkItem ? theme.colors.success : theme.colors.danger,
                      }}
                    >
                      {isOkItem
                        ? '0 Diferencias (Coincidencia Exacta)'
                        : item.difference > 0
                        ? `+${item.difference} Unidades Sobrantes`
                        : `${item.difference} Unidades Faltantes`}
                    </Text>
                  </View>
                </View>

                {/* FILA 4: SI EL ÍTEM TIENE DIFERENCIA, MOSTRAR CONTROLES DE AJUSTE; SI ESTÁ OK, MOSTRAR SOLO ESTADO LECTURA */}
                {!isOkItem ? (
                  <>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginTop: 2,
                      }}
                    >
                      <Text
                        variant="label"
                        numberOfLines={1}
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: isMatched ? theme.colors.success : theme.colors.foreground,
                          flex: 1,
                        }}
                      >
                        Cantidad Final Consolidada:
                      </Text>

                      {/* CONTROLES DE AJUSTE (- / INPUT / +) solo para ítems con diferencia */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => handleAdjustQty(item.id, -1)}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            backgroundColor: theme.colors.secondary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                          }}
                        >
                          <Minus size={18} color={theme.colors.foreground} />
                        </TouchableOpacity>

                        <TextInput
                          value={currentCorrection}
                          onChangeText={(val) => handleCorrectionChange(item.id, val)}
                          keyboardType="number-pad"
                          style={{
                            width: 64,
                            height: 38,
                            paddingVertical: 0,
                            paddingHorizontal: 0,
                            backgroundColor: theme.colors.cardBackground,
                            borderWidth: 1.5,
                            borderColor: isMatched ? theme.colors.success : theme.colors.primary,
                            borderRadius: 8,
                            textAlign: 'center',
                            textAlignVertical: 'center',
                            includeFontPadding: false,
                            fontSize: 15,
                            fontWeight: '800',
                            color: isMatched ? theme.colors.success : theme.colors.foreground,
                          }}
                        />

                        <TouchableOpacity
                          onPress={() => handleAdjustQty(item.id, 1)}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            backgroundColor: theme.colors.secondary,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                          }}
                        >
                          <Plus size={18} color={theme.colors.foreground} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* SELECT DE TIPO DE DIFERENCIA */}
                    <View style={{ gap: 4, marginTop: 2 }}>
                      <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                        Clasificación de la Diferencia:
                      </Text>

                      <TouchableOpacity
                        onPress={() => setPickerState({ visible: true, activeItemId: item.id })}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: theme.colors.secondary,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      >
                        <Text
                          variant="caption"
                          numberOfLines={1}
                          style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: theme.colors.foreground,
                            flex: 1,
                          }}
                        >
                          {currentSelectedType}
                        </Text>
                        <ChevronDown size={16} color={theme.colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* BARRA DE ACCIÓN FLOTANTE (FLOATING ACTION DOCK / PILL) */}
      <View
        style={{
          position: 'absolute',
          bottom: Math.max(16, insets.bottom + 8),
          left: 16,
          right: 16,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: theme.colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          {/* MÉTRICA RESUMEN DE MANIFIESTO */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: theme.colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PackageCheck size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text variant="caption" style={{ fontSize: 10, color: theme.colors.mutedForeground }}>
                Manifiesto OT-4892
              </Text>
              <Text variant="label" style={{ fontSize: 12, fontWeight: '800', color: theme.colors.foreground }}>
                {MOCK_ORDER_MANIFEST.length} Productos Total
              </Text>
            </View>
          </View>

          {/* BOTÓN COMPACTO DE ACCIÓN PRINCIPAL */}
          <TouchableOpacity
            onPress={handleConsolidateOrder}
            activeOpacity={0.8}
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: 12,
              paddingHorizontal: 18,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <CheckCircle2 size={16} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>
              Consolidar Conteo
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
              {DISCREPANCY_TYPES.map((typeOption) => {
                const isSelected =
                  pickerState.activeItemId &&
                  selectedTypes[pickerState.activeItemId] === typeOption;

                return (
                  <TouchableOpacity
                    key={typeOption}
                    onPress={() => handleSelectType(typeOption)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: isSelected ? theme.colors.primarySoft : theme.colors.secondary,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    }}
                  >
                    <Text
                      variant="caption"
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? theme.colors.primary : theme.colors.foreground,
                        flex: 1,
                      }}
                    >
                      {typeOption}
                    </Text>
                    {isSelected && <Check size={18} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* DIÁLOGO PERSONALIZADO DE CONFIRMACIÓN */}
      <AppDialog
        visible={dialogConfig.visible}
        onClose={() => setDialogConfig((prev) => ({ ...prev, visible: false }))}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onConfirm={dialogConfig.onConfirm}
      />
    </Box>
  );
}
