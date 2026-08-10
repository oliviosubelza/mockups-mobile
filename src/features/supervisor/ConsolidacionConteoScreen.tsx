import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  Check,
  X,
  PackageCheck,
} from 'lucide-react-native';

import { goBackOrNavigate } from '@/navigation/registry';
import {
  Badge,
  AppDialog,
  Card,
  BoxUnitCounter,
  boxUnitTotal,
  formatBoxUnit,
  EMPTY_BOX_UNIT,
  type BoxUnitValue,
  type DialogType,
} from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

export interface OrderProductItem {
  id: string;
  codigo: string;
  nombre: string;
  isCold: boolean;
  expectedQty: number; // En unidades esperadas
  expectedBoxes: number;
  cajaSize: number; // unidades por caja
  driverQty: number; // En unidades contadas por el chofer
  driverBoxes: number;
  driverUnits: number;
  difference: number; // 0 = OK, >0 sobrante, <0 faltante
  type: 'SURPLUS' | 'SHORTAGE' | 'OK';
}

// LAS 4 CAUSALES OFICIALES DE DIFERENCIA DEFINIDAS POR LOS KEY USERS
// Conteo: el chofer se equivocó al contar.
// Diferencia: realmente hay diferencia, entregar el faltante o recoger el sobrante.
// Cruce: sobra en un producto y falta en otro de la misma familia.
// Quiebre: no hay las cantidades en almacén para entregar.
export const DISCREPANCY_CAUSES = ['Conteo', 'Diferencia', 'Cruce', 'Quiebre'] as const;

// ÍTEMS SIN DIFERENCIA NO SE CLASIFICAN: LLEVAN ESTA ETIQUETA FIJA DE SOLO LECTURA
export const COUNT_OK_LABEL = 'Conteo verificado OK (Sin novedad)';

// MANIFIESTO COMPLETO DE LA OT-4892 (SALSAS, PANIFICACIÓN Y REPOSTERÍA)
const MOCK_ORDER_MANIFEST: OrderProductItem[] = [
  {
    id: 'disc-1',
    codigo: 'PROD-002',
    nombre: 'Salsa Mayonesa Industrial 10kg',
    isCold: true,
    expectedQty: 144,
    expectedBoxes: 12,
    cajaSize: 12,
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
    cajaSize: 12,
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
    cajaSize: 12,
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
    cajaSize: 12,
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

  // CORRECCIÓN POR ÍTEM EN CAJAS + UNIDADES (ARRANCA CON LO CONTADO POR EL CHOFER)
  const [corrections, setCorrections] = useState<Record<string, BoxUnitValue>>(() =>
    Object.fromEntries(
      MOCK_ORDER_MANIFEST.map((item) => [
        item.id,
        { cajas: item.driverBoxes.toString(), unidades: item.driverUnits.toString() },
      ])
    )
  );

  // SELECT DE TIPO DE DIFERENCIA POR ÍTEM
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string>>({
    'disc-1': 'Conteo',
    'disc-2': 'Diferencia',
    'disc-3': COUNT_OK_LABEL,
    'disc-4': COUNT_OK_LABEL,
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

  const handleCorrectionChange = (itemId: string, next: BoxUnitValue) => {
    setCorrections((prev) => ({ ...prev, [itemId]: next }));
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
        <View style={{ gap: 18 }}>
          {filteredManifest.map((item) => {
            const currentCorrection = corrections[item.id] ?? EMPTY_BOX_UNIT;
            const isOkItem = item.difference === 0;
            const isMatched = boxUnitTotal(currentCorrection, item.cajaSize) === item.expectedQty;
            const currentSelectedType =
              selectedTypes[item.id] || (isOkItem ? COUNT_OK_LABEL : DISCREPANCY_CAUSES[1]);

            // EL ACENTO DEL BORDE RESUME EL ESTADO DEL ÍTEM DE UN VISTAZO
            const accentColor = isOkItem || isMatched
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
                style={{ gap: 8 }}
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
                    {item.isCold && <Badge label="❄️ Frío" tone="neutral" emphasis="soft" size="sm" />}
                  </View>

                  <View style={{ flexShrink: 0 }}>
                    {isOkItem ? (
                      <Badge label="Conteo OK" tone="success" emphasis="soft" size="sm" icon={CheckCircle2} />
                    ) : isMatched ? (
                      <Badge label="Ajustado" tone="success" emphasis="solid" size="sm" icon={CheckCircle2} />
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
                  style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}
                >
                  {item.nombre}
                </Text>

                {/* FILA 3: COMPARATIVO ESPERADO VS CONTADO */}
                <View
                  style={{
                    backgroundColor: isOkItem ? theme.colors.successSoft : theme.colors.secondary,
                    borderRadius: 8,
                    paddingHorizontal: 9,
                    paddingVertical: 7,
                    gap: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                      Esperado en OT
                    </Text>
                    <Text
                      variant="label"
                      numberOfLines={1}
                      style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground }}
                    >
                      {formatBoxUnit(item.expectedBoxes, item.expectedQty - item.expectedBoxes * item.cajaSize, item.expectedQty)}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
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
                    <BoxUnitCounter
                      value={currentCorrection}
                      onChange={(next) => handleCorrectionChange(item.id, next)}
                      cajaSize={item.cajaSize}
                      totalLabel="Total consolidado"
                      targetQty={item.expectedQty}
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
              </Card>
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
              {DISCREPANCY_CAUSES.map((cause) => {
                const isSelected =
                  pickerState.activeItemId != null &&
                  selectedTypes[pickerState.activeItemId] === cause;

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
