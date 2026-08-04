import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardCheck, AlertTriangle, CheckCircle2, ShieldCheck, Plus, Minus } from 'lucide-react-native';

import { goBackOrNavigate } from '@/navigation/registry';
import { Badge, Button, AppDialog, type DialogType } from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

export interface DiscrepancyItem {
  id: string;
  codigo: string;
  nombre: string;
  isCold: boolean;
  expectedQty: number; // En unidades
  expectedBoxes: number;
  driverQty: number; // En unidades contadas por el chofer
  driverBoxes: number;
  driverUnits: number;
  difference: number; // e.g. +2 o -3
  type: 'SURPLUS' | 'SHORTAGE'; // Sobrante o Faltante
}

const MOCK_DISCREPANCY_ITEMS: DiscrepancyItem[] = [
  {
    id: 'disc-1',
    codigo: 'PROD-002',
    nombre: 'Helado Holanda Vainilla 1L',
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
    nombre: 'Yogurt Griego Fresa 500g',
    isCold: true,
    expectedQty: 96,
    expectedBoxes: 8,
    driverQty: 93,
    driverBoxes: 7,
    driverUnits: 9,
    difference: -3,
    type: 'SHORTAGE',
  },
];

export default function ConsolidacionConteoScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  // Guardar correcciones del supervisor por ítem
  const [corrections, setCorrections] = useState<Record<string, string>>({
    'disc-1': '144',
    'disc-2': '96',
  });

  const [reasons, setReasons] = useState<Record<string, string>>({
    'disc-1': 'Ajuste por reconteo físico en almacén',
    'disc-2': 'Merma/Rotura en transporte autorizada',
  });

  // Diálogo de confirmación
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

  const handleReasonChange = (itemId: string, val: string) => {
    setReasons((prev) => ({ ...prev, [itemId]: val }));
  };

  const handleAdjustQty = (itemId: string, delta: number) => {
    const currentVal = parseInt(corrections[itemId] || '0', 10);
    const newVal = Math.max(0, currentVal + delta);
    setCorrections((prev) => ({ ...prev, [itemId]: newVal.toString() }));
  };

  const handleConsolidateOrder = () => {
    setDialogConfig({
      visible: true,
      title: 'Consolidación Exitosa',
      message: 'Se han aplicado las correcciones y la revisión a ciegas ha sido aprobada y consolidada en el sistema.',
      type: 'success',
      onConfirm: () => {
        setDialogConfig((prev) => ({ ...prev, visible: false }));
        goBackOrNavigate('supervisor.ordenes');
      },
    });
  };

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 80,
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
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ gap: 2 }}>
              <Text variant="header" style={{ fontSize: 18, fontWeight: '800', color: theme.colors.foreground }}>
                Consolidar Conteo: OT-4892
              </Text>
              <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
                Chofer: Cristhian Macchiavelli • 6 Puntos de entrega
              </Text>
            </View>
            <Badge label="2 Diferencias" tone="danger" emphasis="soft" size="md" icon={AlertTriangle} />
          </View>

          <View
            style={{
              backgroundColor: theme.colors.dangerSoft,
              borderRadius: 10,
              padding: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 4,
            }}
          >
            <ShieldCheck size={18} color={theme.colors.danger} />
            <Text variant="caption" style={{ color: theme.colors.danger, fontSize: 11, fontWeight: '600', flex: 1 }}>
              Ingresa la cantidad corregida por cada producto con diferencia antes de aprobar la consolidación.
            </Text>
          </View>
        </View>

        {/* LISTADO DE ÍTEMS CON DISEÑO UNIFICADO, COMPACTO Y SIN SUB-CARDS ANIDADAS */}
        <View style={{ gap: 12 }}>
          {MOCK_DISCREPANCY_ITEMS.map((item) => {
            const currentCorrection = corrections[item.id] || '';
            const currentCorrectionNum = parseInt(currentCorrection || '0', 10);
            const isMatched = !isNaN(currentCorrectionNum) && currentCorrectionNum === item.expectedQty;

            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: theme.colors.cardBackground,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: isMatched ? theme.colors.success : theme.colors.border,
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
                    {isMatched ? (
                      <Badge
                        label="✓ Cantidad Ajustada"
                        tone="success"
                        emphasis="solid"
                        size="sm"
                        icon={CheckCircle2}
                      />
                    ) : (
                      <Badge
                        label={item.difference > 0 ? `+${item.difference} u. Sobrante` : `${item.difference} u. Faltante`}
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

                {/* FILA 3: RESUMEN CLARO CON PALABRAS COMPLETAS (CAJAS Y UNIDADES) */}
                <View
                  style={{
                    backgroundColor: theme.colors.secondary,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                      Esperado Sistema:
                    </Text>
                    <Text variant="label" style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground }}>
                      {item.expectedQty} Unidades ({item.expectedBoxes} Cajas)
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                      Ingresado por Chofer:
                    </Text>
                    <Text variant="label" style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground }}>
                      {item.driverBoxes} Cajas y {item.driverUnits} Unidades ({item.driverQty} Total)
                    </Text>
                  </View>

                  <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 2 }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="caption" style={{ fontSize: 11, fontWeight: '700', color: theme.colors.danger }}>
                      Diferencia Detectada:
                    </Text>
                    <Text
                      variant="label"
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: theme.colors.danger,
                      }}
                    >
                      {item.difference > 0 ? `+${item.difference} Unidades` : `${item.difference} Unidades`}
                    </Text>
                  </View>
                </View>

                {/* FILA 4: INGRESO INTEGRADO DE CORRECCIÓN (ETIQUETA + CONTROLES EN UNA SOLA LÍNEA) */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginTop: 2,
                  }}
                >
                  <Text
                    variant="label"
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isMatched ? theme.colors.success : theme.colors.foreground,
                      flex: 1,
                    }}
                  >
                    Cantidad Corregida:
                  </Text>

                  {/* CONTROLES COMPACTOS DE INCREMENTO/DECREMENTO (SINTAXIS CORREGIDA SIN RECORTES) */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleAdjustQty(item.id, -1)}
                      style={{
                        width: 40,
                        height: 40,
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
                        width: 72,
                        height: 40,
                        paddingVertical: 0,
                        paddingHorizontal: 0,
                        backgroundColor: theme.colors.cardBackground,
                        borderWidth: 1.5,
                        borderColor: isMatched ? theme.colors.success : theme.colors.primary,
                        borderRadius: 8,
                        textAlign: 'center',
                        textAlignVertical: 'center',
                        includeFontPadding: false,
                        fontSize: 16,
                        fontWeight: '800',
                        color: isMatched ? theme.colors.success : theme.colors.foreground,
                      }}
                    />

                    <TouchableOpacity
                      onPress={() => handleAdjustQty(item.id, 1)}
                      style={{
                        width: 40,
                        height: 40,
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

                {/* FILA 5: CAMPO INTEGRADO DE JUSTIFICACIÓN / OBS */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                    Motivo:
                  </Text>
                  <TextInput
                    value={reasons[item.id] || ''}
                    onChangeText={(val) => handleReasonChange(item.id, val)}
                    placeholder="Ingresa observación del supervisor..."
                    placeholderTextColor={theme.colors.mutedForeground}
                    style={{
                      flex: 1,
                      backgroundColor: theme.colors.secondary,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      fontSize: 12,
                      color: theme.colors.foreground,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* BARRA DE ACCIÓN FIJA INFERIOR PARA CONSOLIDAR */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: theme.colors.cardBackground,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: Math.max(12, insets.bottom + 8),
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
        }}
      >
        <Button
          label="Aprobar y Consolidar Conteo"
          onPress={handleConsolidateOrder}
          variant="primary"
          size="lg"
        />
      </View>

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
