import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Package,
  X,
  CheckCircle2,
  XCircle,
  Snowflake,
  ShieldAlert,
  QrCode,
  Camera,
  ScanLine,
  RotateCcw,
  CheckCheck,
  Check,
} from 'lucide-react-native';

import { findRouteById, navigateTo } from '@/navigation/registry';
import {
  Badge,
  Button,
  AppDialog,
  SearchField,
  ScreenActionBar,
  Card,
  BoxUnitCounter,
  EMPTY_BOX_UNIT,
  boxUnitTotal,
  type BoxUnitValue,
  CountProgressHeader,
  type DialogType,
} from '@/shared/ui';
import { Text, useAppTheme } from '@/theme';

// MANIFIESTO COMPLETO DE LA OT-4892 QUE EL SUPERVISOR DEBE AUDITAR
const MOCK_OT_PRODUCTS = [
  {
    id: 1,
    codigo: 'PROD-005',
    nombre: 'Salsa de Tomate Ketchup 5kg',
    cajaSize: 12,
    expectedQty: 96,
    isCold: false,
  },
  {
    id: 2,
    codigo: 'PROD-002',
    nombre: 'Salsa Mayonesa Industrial 10kg',
    cajaSize: 10,
    expectedQty: 144,
    isCold: true,
  },
  {
    id: 3,
    codigo: 'PROD-001',
    nombre: 'Esencia de Vainilla Industrial 1L',
    cajaSize: 12,
    expectedQty: 120,
    isCold: false,
  },
  {
    id: 4,
    codigo: 'PROD-008',
    nombre: 'Crema Pastelera Lista 1kg',
    cajaSize: 12,
    expectedQty: 48,
    isCold: true,
  },
  {
    id: 5,
    codigo: 'PROD-014',
    nombre: 'Harina de Trigo Especial Panificación 25kg',
    cajaSize: 1,
    expectedQty: 120,
    isCold: false,
  },
];

const MAX_RECOUNTS = 2;

export interface CountedAuditRecord {
  id: string;
  codigo: string;
  nombre: string;
  numCajas: number;
  numUnidades: number;
  totalContado: number;
  cajaSize: number;
  isCold: boolean;
  expectedQty: number;
}

export default function RevisionSemaforoExecuteScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  // FILTRO DE LA LISTA COMPLETA DEL MANIFIESTO
  const [searchQuery, setSearchQuery] = useState('');

  // BORRADOR DE CONTEO POR PRODUCTO (AÚN NO REGISTRADO, NO REVELA LO ESPERADO)
  const [draftCounts, setDraftCounts] = useState<Record<string, BoxUnitValue>>({});

  // REGISTROS YA CONFIRMADOS POR EL SUPERVISOR
  const [itemsAuditados, setItemsAuditados] = useState<CountedAuditRecord[]>([]);

  // CONTADOR DE RE-CONTEOS POR CÓDIGO DE PRODUCTO (MÁXIMO 2 INTENTOS PERMITIDOS)
  const [recountAttempts, setRecountAttempts] = useState<Record<string, number>>({});

  // ESTADO DEL MODAL IN-SITU DE RE-CONTEO RÁPIDO
  const [isRecountModalVisible, setIsRecountModalVisible] = useState(false);
  const [modalItem, setModalItem] = useState<CountedAuditRecord | null>(null);
  const [modalCount, setModalCount] = useState<BoxUnitValue>(EMPTY_BOX_UNIT);

  // ESTADO DEL ESCÁNER DE CÓDIGO DE BARRAS POR CÁMARA
  const [isBarcodeScannerVisible, setIsBarcodeScannerVisible] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);

  // DIÁLOGO DE CIERRE DE AUDITORÍA
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
    onConfirm?: () => void;
    onCancel?: () => void;
    cancelText?: string;
    buttonText?: string;
  }>({ visible: false, title: '', message: '', type: 'info' });

  // ÍNDICE DE REGISTROS CONFIRMADOS POR CÓDIGO
  const registradosPorCodigo = useMemo(() => {
    const map: Record<string, CountedAuditRecord> = {};
    itemsAuditados.forEach((item) => {
      map[item.codigo] = item;
    });
    return map;
  }, [itemsAuditados]);

  const getDraft = (codigo: string): BoxUnitValue => draftCounts[codigo] ?? EMPTY_BOX_UNIT;

  // REGISTRAR EL CONTEO DE UNA FILA: RECIÉN AQUÍ SE REVELA LA CANTIDAD ESPERADA
  const handleRegisterRow = (producto: (typeof MOCK_OT_PRODUCTS)[number]) => {
    // Se guarda el desglose tal como se contó. Las cajas son un atajo de
    // conteo; la cantidad que manda es el total en unidades.
    const draft = getDraft(producto.codigo);
    const numCajas = parseInt(draft.cajas || '0', 10) || 0;
    const numUnidades = parseInt(draft.unidades || '0', 10) || 0;
    const totalContado = boxUnitTotal(draft, producto.cajaSize);

    const nuevoRegistro: CountedAuditRecord = {
      id: `audit-${producto.codigo}`,
      codigo: producto.codigo,
      nombre: producto.nombre,
      numCajas,
      numUnidades,
      totalContado,
      cajaSize: producto.cajaSize,
      isCold: producto.isCold,
      expectedQty: producto.expectedQty,
    };

    setItemsAuditados((prev) => [...prev, nuevoRegistro]);
    setHighlightedCode(null);
  };

  // MANEJO DE CÓDIGO DE BARRAS ESCANEADO: FILTRA Y RESALTA LA FILA
  const handleBarcodeScanned = (scannedCode: string) => {
    setIsBarcodeScannerVisible(false);
    const found = MOCK_OT_PRODUCTS.find((p) => p.codigo === scannedCode || scannedCode.includes(p.codigo));
    setSearchQuery(found ? found.codigo : scannedCode);
    setHighlightedCode(found ? found.codigo : null);
  };

  // ABRIR MODAL SHEET FLOTANTE IN-SITU DE RE-CONTEO
  const openRecountModal = (item: CountedAuditRecord) => {
    const attempts = recountAttempts[item.codigo] || 0;
    if (attempts >= MAX_RECOUNTS) return;

    setModalItem(item);
    setModalCount({
      cajas: item.numCajas.toString(),
      unidades: item.numUnidades.toString(),
    });
    setIsRecountModalVisible(true);
  };

  // GUARDAR AJUSTE DE RE-CONTEO DESDE EL MODAL SHEET IN-SITU
  const saveRecountFromModal = () => {
    if (!modalItem) return;

    const totalContadoCalculado = boxUnitTotal(modalCount, modalItem.cajaSize);

    setItemsAuditados((prev) =>
      prev.map((rec) =>
        rec.codigo === modalItem.codigo
          ? {
              ...rec,
              numCajas: parseInt(modalCount.cajas || '0', 10) || 0,
              numUnidades: parseInt(modalCount.unidades || '0', 10) || 0,
              totalContado: totalContadoCalculado,
            }
          : rec
      )
    );

    setRecountAttempts((prev) => ({
      ...prev,
      [modalItem.codigo]: (prev[modalItem.codigo] || 0) + 1,
    }));

    setIsRecountModalVisible(false);
    setModalItem(null);
  };

  // MÉTRICAS EN TIEMPO REAL SOBRE EL MANIFIESTO COMPLETO
  const stats = useMemo(() => {
    let matches = 0;
    let mismatches = 0;
    itemsAuditados.forEach((item) => {
      if (item.totalContado === item.expectedQty) matches++;
      else mismatches++;
    });
    return {
      contados: itemsAuditados.length,
      total: MOCK_OT_PRODUCTS.length,
      pendientes: MOCK_OT_PRODUCTS.length - itemsAuditados.length,
      matches,
      mismatches,
    };
  }, [itemsAuditados]);

  const closeDialog = () => setDialogConfig((prev) => ({ ...prev, visible: false }));

  const handleRedirectToList = () => {
    closeDialog();
    const route = findRouteById('supervisor.semaforo');
    if (route) navigateTo(route);
  };

  const confirmFinishAudit = () => {
    setDialogConfig({
      visible: true,
      title: '¡Auditoría Semáforo Guardada!',
      message: `Se ha registrado la auditoría a ciegas de ${stats.contados} de ${stats.total} productos en la Orden OT-4892.`,
      type: 'success',
      onConfirm: handleRedirectToList,
    });
  };

  // SI QUEDAN PRODUCTOS SIN CONTAR, PEDIR CONFIRMACIÓN EXPLÍCITA ANTES DE CERRAR
  const handleFinishAudit = () => {
    if (stats.pendientes > 0) {
      setDialogConfig({
        visible: true,
        title: 'Quedan productos sin contar',
        message: `Todavía hay ${stats.pendientes} de ${stats.total} productos sin registrar. Si finalizas ahora, quedarán fuera de la auditoría.`,
        type: 'warning',
        buttonText: 'Finalizar igual',
        cancelText: 'Seguir contando',
        onCancel: closeDialog,
        onConfirm: confirmFinishAudit,
      });
      return;
    }
    confirmFinishAudit();
  };

  // FILTRADO DEL MANIFIESTO POR CÓDIGO O NOMBRE
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return MOCK_OT_PRODUCTS;
    return MOCK_OT_PRODUCTS.filter(
      (p) => p.codigo.toLowerCase().includes(query) || p.nombre.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER DE CONTEXTO */}
        <View style={{ gap: 2 }}>
          <Text
            variant="caption"
            style={{
              color: theme.colors.mutedForeground,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Revisión Semáforo • OT-4892
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="header" style={{ color: theme.colors.foreground, fontSize: 18, fontWeight: '800' }}>
              Conteo a Ciegas
            </Text>
            {stats.contados > 0 && (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Badge label={`${stats.matches} ok`} tone="success" size="sm" />
                {stats.mismatches > 0 && (
                  <Badge label={`${stats.mismatches} diff`} tone="danger" size="sm" />
                )}
              </View>
            )}
          </View>
        </View>

        {/* BANNER DE MODALIDAD A CIEGAS */}
        <View
          style={{
            backgroundColor: theme.colors.primarySoft,
            borderRadius: 12,
            padding: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ShieldAlert size={16} color={theme.colors.primary} />
          <Text variant="caption" style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '600', flex: 1 }}>
            Modo Auditoría: la cantidad esperada permanece oculta hasta que registres el conteo de cada producto.
          </Text>
        </View>

        {/* AVANCE DEL MANIFIESTO (MISMO PATRÓN QUE LA VISTA DE CONTEO DEL CHOFER) */}
        <CountProgressHeader
          title="Manifiesto de la OT"
          counted={stats.contados}
          total={stats.total}
        />

        {/* BUSCADOR DE FILTRADO + ESCÁNER */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <SearchField
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setHighlightedCode(null);
              }}
              onClear={() => {
                setSearchQuery('');
                setHighlightedCode(null);
              }}
              placeholder="Filtrar por SKU o nombre..."
            />
          </View>

          <TouchableOpacity
            onPress={() => setIsBarcodeScannerVisible(true)}
            activeOpacity={0.8}
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              backgroundColor: theme.colors.primarySoft,
              borderWidth: 1.5,
              borderColor: theme.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <QrCode size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* LISTA COMPLETA DE PRODUCTOS DEL MANIFIESTO */}
        <View style={{ gap: 18 }}>
          {filteredProducts.length === 0 ? (
            <View
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: 20,
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Package size={32} color={theme.colors.mutedForeground} />
              <Text variant="caption" style={{ fontSize: 12, color: theme.colors.mutedForeground, textAlign: 'center' }}>
                Ningún producto del manifiesto coincide con "{searchQuery}".
              </Text>
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={{
                  backgroundColor: theme.colors.primarySoft,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>
                  Limpiar filtro
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredProducts.map((producto) => {
              const registro = registradosPorCodigo[producto.codigo];
              const isRegistrado = registro !== undefined;
              const isHighlighted = highlightedCode === producto.codigo;

              const draft = getDraft(producto.codigo);
              const draftTotal = boxUnitTotal(draft, producto.cajaSize);
              const puedeRegistrar = draft.cajas.trim().length > 0 || draft.unidades.trim().length > 0;

              const esMatch = isRegistrado && registro.totalContado === registro.expectedQty;
              const diff = isRegistrado ? registro.totalContado - registro.expectedQty : 0;
              const diffText = diff > 0 ? `+${diff} (sobran)` : `${diff} (faltan)`;

              const attempts = recountAttempts[producto.codigo] || 0;
              const remainingAttempts = MAX_RECOUNTS - attempts;

              return (
                <Card
                  key={producto.id}
                  borderColor={isHighlighted ? 'primary' : 'border'}
                  borderWidth={isHighlighted ? 2 : 1}
                  padding="m"
                  borderRadius="xl"
                  style={{ gap: 8 }}
                >
                  {/* FILA 1: IDENTIFICACIÓN DEL PRODUCTO + ESTADO */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isRegistrado ? (
                      esMatch ? (
                        <CheckCircle2 size={16} color={theme.colors.success} style={{ flexShrink: 0 }} />
                      ) : (
                        <XCircle size={16} color={theme.colors.danger} style={{ flexShrink: 0 }} />
                      )
                    ) : (
                      <Package size={16} color={theme.colors.mutedForeground} style={{ flexShrink: 0 }} />
                    )}

                    <Text variant="label" style={{ fontSize: 12, fontWeight: '800', color: theme.colors.foreground }}>
                      {producto.codigo}
                    </Text>

                    {producto.isCold && <Snowflake size={13} color={theme.colors.primary} />}

                    <View style={{ flex: 1 }} />

                    {isRegistrado ? (
                      <Badge
                        label={esMatch ? '✓ Conforme' : 'Con diferencia'}
                        tone={esMatch ? 'success' : 'danger'}
                        size="sm"
                      />
                    ) : (
                      <Badge label="Pendiente" tone="neutral" size="sm" />
                    )}
                  </View>

                  {/* FILA 2: NOMBRE DEL PRODUCTO */}
                  <Text
                    variant="subtitle"
                    numberOfLines={2}
                    style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}
                  >
                    {producto.nombre}
                  </Text>

                  {isRegistrado ? (
                    /* BLOQUE REVELADO: RECIÉN AQUÍ SE MUESTRA LA CANTIDAD ESPERADA */
                    <View
                      style={{
                        backgroundColor: esMatch ? theme.colors.successSoft : theme.colors.secondary,
                        borderRadius: 10,
                        padding: 10,
                        gap: 5,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                          Contado por el supervisor:
                        </Text>
                        <Text
                          variant="label"
                          style={{ fontSize: 12, fontWeight: '800', color: theme.colors.foreground }}
                        >
                          {registro.numCajas} Cajas + {registro.numUnidades} u. = {registro.totalContado} u.
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                          Esperado en OT:
                        </Text>
                        <Text
                          variant="label"
                          style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground }}
                        >
                          {registro.expectedQty} u.
                        </Text>
                      </View>

                      <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 1 }} />

                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: esMatch ? theme.colors.success : theme.colors.danger,
                        }}
                      >
                        {esMatch ? '✓ Conteo conforme' : `Diferencia: ${diffText}`}
                      </Text>

                      {!esMatch &&
                        (remainingAttempts > 0 ? (
                          <TouchableOpacity
                            onPress={() => openRecountModal(registro)}
                            activeOpacity={0.7}
                            style={{
                              backgroundColor: theme.colors.primarySoft,
                              borderRadius: 6,
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                              alignSelf: 'flex-start',
                              borderWidth: 1,
                              borderColor: theme.colors.primary,
                              marginTop: 2,
                            }}
                          >
                            <RotateCcw size={12} color={theme.colors.primary} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                              Recontar producto ({remainingAttempts}{' '}
                              {remainingAttempts === 1 ? 'intento restante' : 'intentos restantes'})
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View
                            style={{
                              backgroundColor: theme.colors.secondary,
                              borderRadius: 6,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              alignSelf: 'flex-start',
                              borderWidth: 1,
                              borderColor: theme.colors.border,
                              marginTop: 2,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.mutedForeground }}>
                              🔒 Máximo de {MAX_RECOUNTS} re-conteos alcanzado (Bloqueado)
                            </Text>
                          </View>
                        ))}
                    </View>
                  ) : (
                    /* BLOQUE DE CAPTURA: SIN NINGUNA PISTA DE LA CANTIDAD ESPERADA */
                    <>
                      <BoxUnitCounter
                        value={draft}
                        onChange={(next) =>
                          setDraftCounts((prev) => ({ ...prev, [producto.codigo]: next }))
                        }
                        cajaSize={producto.cajaSize}
                      />

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text
                          variant="label"
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: puedeRegistrar ? theme.colors.primary : theme.colors.mutedForeground,
                            flex: 1,
                          }}
                        >
                          Total: {draftTotal} u.
                        </Text>

                        <TouchableOpacity
                          onPress={() => handleRegisterRow(producto)}
                          disabled={!puedeRegistrar}
                          activeOpacity={0.8}
                          style={{
                            backgroundColor: puedeRegistrar ? theme.colors.primary : theme.colors.secondary,
                            borderRadius: 10,
                            paddingHorizontal: 14,
                            paddingVertical: 9,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            borderWidth: 1,
                            borderColor: puedeRegistrar ? theme.colors.primary : theme.colors.border,
                          }}
                        >
                          <Check
                            size={15}
                            strokeWidth={3}
                            color={puedeRegistrar ? '#ffffff' : theme.colors.mutedForeground}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '800',
                              color: puedeRegistrar ? '#ffffff' : theme.colors.mutedForeground,
                            }}
                          >
                            Registrar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* MODAL SHEET DE LECTOR DE CÓDIGO DE BARRAS POR CÁMARA */}
      <Modal
        visible={isBarcodeScannerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsBarcodeScannerVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Camera size={20} color={theme.colors.primary} />
                <Text variant="header" style={{ fontSize: 16, fontWeight: '800', color: theme.colors.foreground }}>
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
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                height: 200,
                backgroundColor: '#0a0a0a',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: theme.colors.primary,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  left: 20,
                  right: 20,
                  height: 2,
                  backgroundColor: '#ff3b30',
                }}
              />
              <ScanLine size={48} color={theme.colors.primary} style={{ opacity: 0.4 }} />
              <Text style={{ color: '#ffffff', fontSize: 12, marginTop: 10, fontWeight: '600' }}>
                Apunta el código de barras aquí
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              <Text variant="caption" style={{ fontSize: 11, fontWeight: '700', color: theme.colors.mutedForeground }}>
                Toca un producto para simular la lectura de cámara:
              </Text>

              <ScrollView style={{ maxHeight: 150 }} contentContainerStyle={{ gap: 6 }}>
                {MOCK_OT_PRODUCTS.map((prod) => (
                  <TouchableOpacity
                    key={prod.id}
                    onPress={() => handleBarcodeScanned(prod.codigo)}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: theme.colors.secondary,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                      <QrCode size={16} color={theme.colors.primary} />
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground, flexShrink: 1 }}
                      >
                        {prod.codigo} - {prod.nombre}
                      </Text>
                    </View>
                    <Badge label="Simular" tone="primary" size="sm" />
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
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.cardBackground,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: Math.max(20, insets.bottom + 12),
              gap: 16,
              elevation: 20,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2, flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text variant="header" style={{ fontSize: 16, fontWeight: '800', color: theme.colors.foreground }}>
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
                <Text variant="caption" style={{ fontSize: 12, color: theme.colors.mutedForeground }} numberOfLines={1}>
                  {modalItem ? `${modalItem.codigo} - ${modalItem.nombre}` : ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setIsRecountModalVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.colors.secondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* MISMO CONTROL QUE LA CARD: acarrea sueltas a cajas */}
            <BoxUnitCounter
              value={modalCount}
              onChange={setModalCount}
              cajaSize={modalItem?.cajaSize ?? 1}
              totalLabel="Total recontado"
              targetQty={modalItem?.expectedQty}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setIsRecountModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.secondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Text style={{ fontWeight: '700', color: theme.colors.foreground, fontSize: 13 }}>
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
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontWeight: '800', color: '#ffffff', fontSize: 13 }}>
                  Guardar Re-conteo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BARRA DE ACCIÓN ANCLADA (hermana del ScrollView, no flotante) */}
      <ScreenActionBar
        actionLabel="Finalizar"
        actionIcon={CheckCheck}
        onAction={handleFinishAudit}
        actionDisabled={stats.contados === 0}
      >
        <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.foreground }}>
          {stats.contados} de {stats.total} contados
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {stats.matches > 0 && (
            <Badge label={`${stats.matches} ok`} tone="success" size="sm" />
          )}
          {stats.mismatches > 0 && (
            <Badge label={`${stats.mismatches} diff`} tone="danger" size="sm" />
          )}
          {stats.pendientes > 0 && (
            <Badge label={`${stats.pendientes} pend.`} tone="neutral" size="sm" />
          )}
        </View>
      </ScreenActionBar>

      {/* DIÁLOGO DE CIERRE DE AUDITORÍA */}
      <AppDialog
        visible={dialogConfig.visible}
        onClose={closeDialog}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        buttonText={dialogConfig.buttonText}
        cancelText={dialogConfig.cancelText}
        onCancel={dialogConfig.onCancel}
        onConfirm={dialogConfig.onConfirm}
      />
    </View>
  );
}
