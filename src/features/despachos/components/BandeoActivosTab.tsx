import React, { useState } from 'react';
import { View, TouchableOpacity, Modal } from 'react-native';
import {
  Layers,
  Truck,
  Package,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Minus,
  X,
  Snowflake,
  ShieldCheck,
} from 'lucide-react-native';

import { Badge, Button } from '@/shared/ui';
import { Text, useAppTheme } from '@/theme';

export type LogisticAssetItem = {
  id: string;
  code: string;
  name: string;
  assetType: 'PALLET' | 'HAND_TRUCK' | 'CRATE' | 'THERMO_LOGGER';
  isSerialized: boolean;
  serialNumber?: string;
  plannedQty: number;
  dispatchedQty: number;
  status: 'MATCH' | 'DISCREPANCY';
};

export const INITIAL_LOGISTIC_ASSETS: LogisticAssetItem[] = [
  {
    id: 'ASSET-1',
    code: 'PALLET-STD',
    name: 'Pallet Madera Estándar (1.20 x 1.00m)',
    assetType: 'PALLET',
    isSerialized: false,
    plannedQty: 12,
    dispatchedQty: 12,
    status: 'MATCH',
  },
  {
    id: 'ASSET-2',
    code: 'CART-300KG',
    name: 'Carrito de Carga 2 Ruedas (300kg)',
    assetType: 'HAND_TRUCK',
    isSerialized: true,
    serialNumber: 'CR-0482',
    plannedQty: 2,
    dispatchedQty: 2,
    status: 'MATCH',
  },
  {
    id: 'ASSET-3',
    code: 'CANASTILLA-VERDE',
    name: 'Canastillas Plásticas Abatibles 60L',
    assetType: 'CRATE',
    isSerialized: false,
    plannedQty: 8,
    dispatchedQty: 8,
    status: 'MATCH',
  },
];

interface BandeoActivosTabProps {
  isReadOnly?: boolean;
}

export function BandeoActivosTab({ isReadOnly = false }: BandeoActivosTabProps) {
  const theme = useAppTheme();
  const [assets, setAssets] = useState<LogisticAssetItem[]>(INITIAL_LOGISTIC_ASSETS);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [activeScanItem, setActiveScanItem] = useState<LogisticAssetItem | null>(null);

  const updateQuantity = (id: string, delta: number) => {
    if (isReadOnly) return;
    setAssets((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextQty = Math.max(0, item.dispatchedQty + delta);
        return {
          ...item,
          dispatchedQty: nextQty,
          status: nextQty === item.plannedQty ? 'MATCH' : 'DISCREPANCY',
        };
      }),
    );
  };

  const totalPlanned = assets.reduce((sum, a) => sum + a.plannedQty, 0);
  const totalDispatched = assets.reduce((sum, a) => sum + a.dispatchedQty, 0);
  const hasDiscrepancy = assets.some((a) => a.status === 'DISCREPANCY');

  const getAssetIcon = (type: LogisticAssetItem['assetType']) => {
    switch (type) {
      case 'PALLET':
        return Layers;
      case 'HAND_TRUCK':
        return Truck;
      case 'CRATE':
        return Package;
      case 'THERMO_LOGGER':
        return Snowflake;
      default:
        return Package;
    }
  };

  return (
    <View style={{ gap: 14 }}>
      {/* BANNER INFORMATIVO RESUMEN */}
      <View
        style={{
          backgroundColor: hasDiscrepancy ? theme.colors.warningSoft : theme.colors.successSoft,
          borderColor: hasDiscrepancy ? theme.colors.warning : theme.colors.success,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {hasDiscrepancy ? (
          <AlertTriangle size={20} color={theme.colors.warning} />
        ) : (
          <CheckCircle2 size={20} color={theme.colors.success} />
        )}
        <View style={{ flex: 1 }}>
          <Text variant="label" style={{ color: theme.colors.foreground, fontSize: 13 }}>
            {hasDiscrepancy
              ? 'Diferencia en Accesorios de Carga'
              : 'Accesorios y Bandeo Verificados'}
          </Text>
          <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
            Planificados: {totalPlanned} unids • Contados en rampa: {totalDispatched} unids
          </Text>
        </View>
        <Badge
          label={hasDiscrepancy ? 'Diferencia' : 'Conforme'}
          tone={hasDiscrepancy ? 'warning' : 'success'}
          size="sm"
        />
      </View>

      {/* LISTA DE ACTIVOS Y ACCESORIOS */}
      <View style={{ gap: 10 }}>
        {assets.map((asset) => {
          const IconComp = getAssetIcon(asset.assetType);
          const isMatched = asset.dispatchedQty === asset.plannedQty;
          const diff = asset.dispatchedQty - asset.plannedQty;

          return (
            <View
              key={asset.id}
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderColor: isMatched ? theme.colors.border : theme.colors.warning,
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                gap: 12,
              }}
            >
              {/* CABECERA DE LA TARJETA */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: theme.colors.secondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconComp size={20} color={theme.colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      variant="label"
                      style={{ fontSize: 14, color: theme.colors.foreground, flex: 1 }}
                      numberOfLines={1}
                    >
                      {asset.name}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                      Cód: {asset.code}
                    </Text>
                    {asset.isSerialized && asset.serialNumber && (
                      <View
                        style={{
                          backgroundColor: theme.colors.secondary,
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: 4,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <ShieldCheck size={11} color={theme.colors.primary} />
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: theme.colors.primary,
                          }}
                        >
                          AF: {asset.serialNumber}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* BADGE DE DIFERENCIA EN CABECERA PARA NO GENERAR SALTO DE ALTURA EN EL STEPPER */}
                {diff !== 0 && (
                  <Badge
                    label={diff > 0 ? `+${diff} sobrante` : `${diff} faltante`}
                    tone={diff > 0 ? 'primary' : 'warning'}
                    size="sm"
                  />
                )}

                {asset.isSerialized && !isReadOnly && (
                  <TouchableOpacity
                    onPress={() => {
                      setActiveScanItem(asset);
                      setIsScanModalOpen(true);
                    }}
                    style={{
                      padding: 6,
                      backgroundColor: theme.colors.secondary,
                      borderRadius: 8,
                    }}
                  >
                    <QrCode size={18} color={theme.colors.foreground} />
                  </TouchableOpacity>
                )}
              </View>

              {/* LÍNEA DE SEPARACIÓN */}
              <View style={{ height: 1, backgroundColor: theme.colors.border }} />

              {/* CONTADOR DE CANTIDAD Y COMPARACIÓN (ALTURA CONSTANTE) */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 38,
                }}
              >
                <View>
                  <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                    Planificado en OT:
                  </Text>
                  <Text variant="body" style={{ fontWeight: '700', color: theme.colors.foreground }}>
                    {asset.plannedQty} {asset.plannedQty === 1 ? 'unidad' : 'unidades'}
                  </Text>
                </View>

                {isReadOnly ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                      Verificado:
                    </Text>
                    <Text
                      variant="body"
                      style={{
                        fontWeight: '700',
                        color: isMatched ? theme.colors.success : theme.colors.warning,
                      }}
                    >
                      {asset.dispatchedQty} unids
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {/* BOTÓN DISMINUIR */}
                    <TouchableOpacity
                      onPress={() => updateQuantity(asset.id, -1)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: theme.colors.secondary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Minus size={16} color={theme.colors.foreground} />
                    </TouchableOpacity>

                    {/* VALOR ACTUAL CON ALTURA FIJA */}
                    <View
                      style={{
                        minWidth: 44,
                        height: 36,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        variant="header"
                        style={{
                          fontSize: 18,
                          fontWeight: '800',
                          color: isMatched ? theme.colors.foreground : theme.colors.warning,
                        }}
                      >
                        {asset.dispatchedQty}
                      </Text>
                    </View>

                    {/* BOTÓN INCREMENTAR */}
                    <TouchableOpacity
                      onPress={() => updateQuantity(asset.id, 1)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: theme.colors.secondary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <Plus size={16} color={theme.colors.foreground} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* MODAL DE SIMULACIÓN DE ESCANEO QR PARA ACTIVOS FIJOS */}
      <Modal
        visible={isScanModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsScanModalOpen(false)}
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
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 16,
              padding: 20,
              width: '100%',
              maxWidth: 360,
              gap: 16,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="header" style={{ fontSize: 16, fontWeight: '700' }}>
                Validar Activo Fijo por QR
              </Text>
              <TouchableOpacity onPress={() => setIsScanModalOpen(false)}>
                <X size={20} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                height: 140,
                backgroundColor: theme.colors.secondary,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: theme.colors.primary,
                gap: 8,
              }}
            >
              <QrCode size={48} color={theme.colors.primary} />
              <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                Escaneando placa de activo fijo...
              </Text>
            </View>

            <View style={{ gap: 4 }}>
              <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                Código asignado:
              </Text>
              <Text variant="body" style={{ fontWeight: '700' }}>
                {activeScanItem?.serialNumber || activeScanItem?.code}
              </Text>
            </View>

            <Button
              label="Confirmar Código Escaneado"
              variant="primary"
              size="md"
              onPress={() => setIsScanModalOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
