import { useState } from 'react';
import {
  ScrollView,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import {
  CheckCircle2,
  AlertTriangle,
  Banknote,
  QrCode,
  FileText,
  Layers,
  Truck,
  Package,
  Gauge,
  Clock,
  ShieldCheck,
  Plus,
  Minus,
  Check,
  ChevronDown,
  Building,
  DollarSign,
  FileCheck2,
  RotateCcw,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { findRouteById, navigateTo, goBackOrNavigate } from '@/navigation/registry';
import { Badge, Button, AppDialog, SuccessDialog } from '@/shared/ui';
import { Text, useAppTheme } from '@/theme';

type ReturnAsset = {
  id: string;
  code: string;
  name: string;
  assetType: 'PALLET' | 'HAND_TRUCK' | 'CRATE';
  isSerialized: boolean;
  serialNumber?: string;
  dispatchedQty: number;
  returnedQty: number;
  reason?: string;
  customerName?: string;
  receiptNumber?: string;
};

const INITIAL_RETURN_ASSETS: ReturnAsset[] = [
  {
    id: 'ASSET-1',
    code: 'PALLET-STD',
    name: 'Pallet Madera Estándar (1.20 x 1.00m)',
    assetType: 'PALLET',
    isSerialized: false,
    dispatchedQty: 12,
    returnedQty: 11, // Demostración con 1 faltante en custodia
    reason: 'En custodia en cliente',
    customerName: 'Hipermaxi - Equipetrol Norte',
    receiptNumber: 'VALE-8821',
  },
  {
    id: 'ASSET-2',
    code: 'CART-300KG',
    name: 'Carrito de Carga 2 Ruedas (300kg)',
    assetType: 'HAND_TRUCK',
    isSerialized: true,
    serialNumber: 'CR-0482',
    dispatchedQty: 2,
    returnedQty: 2,
  },
  {
    id: 'ASSET-3',
    code: 'CANASTILLA-VERDE',
    name: 'Canastillas Plásticas Abatibles 60L',
    assetType: 'CRATE',
    isSerialized: false,
    dispatchedQty: 8,
    returnedQty: 8,
  },
];

const DISCREPANCY_REASONS = [
  'En custodia en cliente',
  'Dañado / Roto en descarga',
  'Extraviado / Pérdida',
  'Intercambio por pallet dañado',
];

export function FinalizacionEntregasScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const [assets, setAssets] = useState<ReturnAsset[]>(INITIAL_RETURN_ASSETS);
  const [kmSalida] = useState(142500);
  const [kmLlegada, setKmLlegada] = useState('142585');
  const [observaciones, setObservaciones] = useState('');
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Modal para editar motivo de diferencia en activo
  const [selectedAssetForReason, setSelectedAssetForReason] = useState<ReturnAsset | null>(null);

  const updateAssetReturnQty = (id: string, delta: number) => {
    setAssets((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextQty = Math.max(0, item.returnedQty + delta);
        return {
          ...item,
          returnedQty: nextQty,
          reason: nextQty < item.dispatchedQty ? (item.reason || 'En custodia en cliente') : undefined,
        };
      }),
    );
  };

  const updateAssetReason = (id: string, reason: string, customerName?: string, receiptNumber?: string) => {
    setAssets((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          reason,
          customerName: customerName ?? item.customerName,
          receiptNumber: receiptNumber ?? item.receiptNumber,
        };
      }),
    );
  };

  const kmFinalNum = parseInt(kmLlegada || '0', 10);
  const kmRecorridos = Math.max(0, kmFinalNum - kmSalida);

  const totalDispatchedAssets = assets.reduce((sum, a) => sum + a.dispatchedQty, 0);
  const totalReturnedAssets = assets.reduce((sum, a) => sum + a.returnedQty, 0);
  const hasAssetDiscrepancy = assets.some((a) => a.returnedQty !== a.dispatchedQty);

  const handleConfirmarLiquidacion = () => {
    setIsConfirmOpen(true);
  };

  const handleFinalizarExito = () => {
    setIsConfirmOpen(false);
    setIsSuccessOpen(true);
  };

  const handleRedirectHome = () => {
    setIsSuccessOpen(false);
    const homeRoute = findRouteById('entregas');
    if (homeRoute) {
      navigateTo(homeRoute);
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingTop: 12,
          gap: 14,
          paddingBottom: insets.bottom + 80,
        }}
      >
        {/* 1. TARJETA INFORMATIVA DEL VIAJE */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 14,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Truck size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                  Fin de Jornada • Retorno a Almacén
                </Text>
                <Text variant="header" style={{ fontSize: 16, fontWeight: '800' }}>
                  Placa: 3721-KPZ
                </Text>
                <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                  Ruta Equipetrol • San Martín
                </Text>
              </View>
            </View>

            <Badge label="OT-98421" tone="primary" size="md" />
          </View>

          <View style={{ height: 1, backgroundColor: theme.colors.border }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                Chofer:
              </Text>
              <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                Gino Baptista
              </Text>
            </View>

            <View>
              <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                Ayudante:
              </Text>
              <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                Carlos Pérez
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                Hora salida:
              </Text>
              <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                07:30 hs
              </Text>
            </View>
          </View>
        </View>

        {/* 2. RESUMEN DE ENTREGAS Y COBRANZAS */}
        <View style={{ gap: 10 }}>
          <Text variant="label" style={{ fontSize: 15, fontWeight: '800' }}>
            1. Resumen de Entregas y Cobranzas
          </Text>

          {/* KPI CHIPS */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 12,
                gap: 4,
              }}
            >
              <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                Paradas
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.foreground }}>
                5 / 6
              </Text>
              <Badge label="1 Rechazo parcial" tone="warning" size="sm" />
            </View>

            <View
              style={{
                flex: 1.4,
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 12,
                gap: 4,
              }}
            >
              <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 11 }}>
                Total Cobrado en Ruta
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.success }}>
                Bs. 14,150.00
              </Text>
              <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontSize: 10 }}>
                100% conciliado
              </Text>
            </View>
          </View>

          {/* DESGLOSE DE COBROS */}
          <View
            style={{
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: 14,
              gap: 10,
            }}
          >
            <Text variant="label" style={{ fontSize: 13 }}>
              Arqueo de Dinero y Documentos a Entregar:
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Banknote size={16} color={theme.colors.success} />
                <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                  Efectivo en mano (Caja):
                </Text>
              </View>
              <Text style={{ fontWeight: '700', color: theme.colors.foreground }}>
                Bs. 8,450.00
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <QrCode size={16} color={theme.colors.primary} />
                <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                  Cobros QR / Transf. (Comprobantes):
                </Text>
              </View>
              <Text style={{ fontWeight: '700', color: theme.colors.foreground }}>
                Bs. 4,200.00
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FileText size={16} color={theme.colors.mutedForeground} />
                <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                  Cheques recibidos (1 doc):
                </Text>
              </View>
              <Text style={{ fontWeight: '700', color: theme.colors.foreground }}>
                Bs. 1,500.00
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: theme.colors.border }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <RotateCcw size={16} color={theme.colors.warning} />
              <Text variant="bodySmall" style={{ color: theme.colors.foreground, flex: 1 }}>
                <Text style={{ fontWeight: '700' }}>Mercadería Rechazada:</Text> 2 Cjas Ketchup Kris 900g
              </Text>
              <Badge label="A Almacén" tone="warning" size="sm" />
            </View>
          </View>
        </View>

        {/* 3. CONCILIACIÓN DE RETORNO DE BANDEOS Y ACTIVOS */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="label" style={{ fontSize: 15, fontWeight: '800' }}>
              2. Retorno de Bandeos y Activos (RTIs)
            </Text>
            <Badge
              label={hasAssetDiscrepancy ? 'Con Novedad' : 'Conforme'}
              tone={hasAssetDiscrepancy ? 'warning' : 'success'}
              size="sm"
            />
          </View>

          <Text variant="caption" style={{ color: theme.colors.mutedForeground, marginTop: -4 }}>
            Registra los carritos, pallets y canastillas que estás regresando físicamente a la rampa:
          </Text>

          <View style={{ gap: 10 }}>
            {assets.map((asset) => {
              const diff = asset.returnedQty - asset.dispatchedQty;
              const isMatched = diff === 0;

              return (
                <View
                  key={asset.id}
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isMatched ? theme.colors.border : theme.colors.warning,
                    padding: 14,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="label" style={{ fontSize: 14, fontWeight: '700' }}>
                        {asset.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                          Cód: {asset.code}
                        </Text>
                        {asset.serialNumber && (
                          <Badge label={`AF: ${asset.serialNumber}`} tone="primary" size="sm" />
                        )}
                      </View>
                    </View>

                    {/* CONTROL INCREMENTO/DECREMENTO RETORNO */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => updateAssetReturnQty(asset.id, -1)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          backgroundColor: theme.colors.secondary,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      >
                        <Minus size={15} color={theme.colors.foreground} />
                      </TouchableOpacity>

                      <View style={{ minWidth: 40, alignItems: 'center' }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: theme.colors.foreground }}>
                          {asset.returnedQty}
                        </Text>
                        <Text variant="caption" style={{ fontSize: 10, color: theme.colors.mutedForeground }}>
                          de {asset.dispatchedQty}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => updateAssetReturnQty(asset.id, 1)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          backgroundColor: theme.colors.secondary,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      >
                        <Plus size={15} color={theme.colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* SECCIÓN DE JUSTIFICACIÓN SI HAY DIFERENCIA */}
                  {!isMatched && (
                    <View
                      style={{
                        backgroundColor: theme.colors.warningSoft,
                        borderRadius: 10,
                        padding: 10,
                        gap: 6,
                        borderWidth: 1,
                        borderColor: theme.colors.warning,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground }}>
                          Faltante: {Math.abs(diff)} {Math.abs(diff) === 1 ? 'unidad' : 'unidades'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setSelectedAssetForReason(asset)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                            Editar Motivo
                          </Text>
                          <ChevronDown size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                      </View>

                      <Text style={{ fontSize: 11, color: theme.colors.foreground }}>
                        • <Text style={{ fontWeight: '700' }}>Motivo:</Text> {asset.reason || 'Sin especificar'}
                      </Text>
                      {asset.customerName && (
                        <Text style={{ fontSize: 11, color: theme.colors.foreground }}>
                          • <Text style={{ fontWeight: '700' }}>Cliente:</Text> {asset.customerName}
                        </Text>
                      )}
                      {asset.receiptNumber && (
                        <Text style={{ fontSize: 11, color: theme.colors.foreground }}>
                          • <Text style={{ fontWeight: '700' }}>N° Vale:</Text> {asset.receiptNumber}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* 4. KILOMETRAJE Y OBSERVACIONES DE RETORNO */}
        <View style={{ gap: 10 }}>
          <Text variant="label" style={{ fontSize: 15, fontWeight: '800' }}>
            3. Kilometraje de Cierre
          </Text>

          <View
            style={{
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: 14,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                  Km Salida:
                </Text>
                <Text variant="body" style={{ fontWeight: '700' }}>
                  {kmSalida.toLocaleString()} km
                </Text>
              </View>

              <View style={{ flex: 1.2 }}>
                <Text variant="caption" style={{ color: theme.colors.mutedForeground, marginBottom: 4 }}>
                  Km Llegada Odómetro:
                </Text>
                <TextInput
                  value={kmLlegada}
                  onChangeText={setKmLlegada}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: theme.colors.secondary,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    fontSize: 15,
                    fontWeight: '700',
                    color: theme.colors.foreground,
                    textAlign: 'center',
                  }}
                />
              </View>

              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                  Recorrido:
                </Text>
                <Badge label={`+${kmRecorridos} km`} tone="primary" size="sm" />
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: theme.colors.border }} />

            <View style={{ gap: 4 }}>
              <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                Observaciones del Retorno (Opcional):
              </Text>
              <TextInput
                value={observaciones}
                onChangeText={setObservaciones}
                placeholder="Ej. Tráfico pesado en 4to anillo, rampa despejada a la llegada..."
                placeholderTextColor={theme.colors.mutedForeground}
                multiline
                numberOfLines={2}
                style={{
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  padding: 10,
                  fontSize: 13,
                  color: theme.colors.foreground,
                }}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* BOTÓN INFERIOR FIJO: CONFIRMAR Y LIQUIDAR */}
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
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <Button
          label="Confirmar Retorno y Liquidar Ruta"
          icon={CheckCircle2}
          variant="primary"
          size="lg"
          onPress={handleConfirmarLiquidacion}
          fullWidth
        />
      </View>

      {/* MODAL PARA JUSTIFICAR DIFERENCIA DE ACTIVO */}
      <Modal
        visible={!!selectedAssetForReason}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAssetForReason(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.cardBackground,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              gap: 14,
            }}
          >
            <Text variant="header" style={{ fontSize: 16, fontWeight: '800' }}>
              Justificar Diferencia: {selectedAssetForReason?.name}
            </Text>

            <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
              Selecciona el motivo del faltante o rotura del activo:
            </Text>

            <View style={{ gap: 8 }}>
              {DISCREPANCY_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => {
                    if (selectedAssetForReason) {
                      updateAssetReason(selectedAssetForReason.id, r);
                    }
                  }}
                  style={{
                    backgroundColor:
                      selectedAssetForReason?.reason === r
                        ? theme.colors.primarySoft
                        : theme.colors.secondary,
                    borderColor:
                      selectedAssetForReason?.reason === r
                        ? theme.colors.primary
                        : theme.colors.border,
                    borderWidth: 1,
                    borderRadius: 10,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: selectedAssetForReason?.reason === r ? '700' : '500',
                      color:
                        selectedAssetForReason?.reason === r
                          ? theme.colors.primary
                          : theme.colors.foreground,
                    }}
                  >
                    {r}
                  </Text>
                  {selectedAssetForReason?.reason === r && (
                    <Check size={16} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Button
              label="Guardar Justificación"
              variant="primary"
              size="md"
              onPress={() => setSelectedAssetForReason(null)}
            />
          </View>
        </View>
      </Modal>

      {/* DIÁLOGO DE CONFIRMACIÓN */}
      <AppDialog
        visible={isConfirmOpen}
        title="¿Confirmar Cierre y Liquidación?"
        message={`Se registrará el cierre de la OT-98421 con Bs. 14,150.00 recaudados y ${totalReturnedAssets} de ${totalDispatchedAssets} activos retornados.`}
        type={hasAssetDiscrepancy ? 'warning' : 'info'}
        buttonText="Sí, liquidar ruta"
        cancelText="Revisar de nuevo"
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleFinalizarExito}
        onClose={() => setIsConfirmOpen(false)}
      />

      {/* DIÁLOGO DE ÉXITO */}
      <SuccessDialog
        visible={isSuccessOpen}
        title="¡Ruta Liquidada con Éxito!"
        message="El reporte de entregas, cobranzas y retorno de bandeo ha sido consolidado y enviado al supervisor y almacén."
        buttonText="Volver al Inicio"
        onClose={handleRedirectHome}
      />
    </View>
  );
}
export default FinalizacionEntregasScreen;
