import React, { useMemo, useRef, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Package,
  X,
  CheckCircle2,
  XCircle,
  Snowflake,
  ShieldCheck,
  QrCode,
  Camera,
  ScanLine,
  CheckCheck,
  Check,
  StickyNote,
  Lock,
  ArrowLeft,
  Eye,
  AlertTriangle,
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
  formatBoxUnit,
  type BoxUnitValue,
  CountProgressHeader,
  type DialogType,
} from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

import { ObservationSheet } from './components/ObservationSheet';
import { useSupervisorStore, type SemaforoAuditProduct } from './store';

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

  const activeSemaforoId = useSupervisorStore((state) => state.activeSemaforoId);
  const semaforoOrders = useSupervisorStore((state) => state.semaforoOrders);
  const completeSemaforoAudit = useSupervisorStore((state) => state.completeSemaforoAudit);

  const activeOrder =
    semaforoOrders.find((o) => o.id === activeSemaforoId) || semaforoOrders[0];
  const isAuditCompleted = activeOrder.status === 'COMPLETED';

  // FILTRO DE BÚSQUEDA
  const [searchQuery, setSearchQuery] = useState('');

  // BORRADOR DE CONTEO POR PRODUCTO (MODO EJECUCIÓN A CIEGAS)
  const [draftCounts, setDraftCounts] = useState<Record<string, BoxUnitValue>>({});

  // REGISTROS YA CONFIRMADOS POR EL SUPERVISOR EN LA SESIÓN DE CONTEO
  const [itemsAuditados, setItemsAuditados] = useState<CountedAuditRecord[]>([]);

  // ESTADO DE CONSOLIDACIÓN LOCAL
  const [consolidado, setConsolidado] = useState(isAuditCompleted);

  // OBSERVACIONES DEL SUPERVISOR POR PRODUCTO
  const [observations, setObservations] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    activeOrder.products.forEach((p) => {
      if (p.observation) map[p.codigo] = p.observation;
    });
    return map;
  });
  const [noteCodigo, setNoteCodigo] = useState<string | null>(null);

  // EDICIONES EN CURSO
  const [editDrafts, setEditDrafts] = useState<Record<string, BoxUnitValue>>({});

  // ESCÁNER DE CÓDIGO DE BARRAS
  const [isBarcodeScannerVisible, setIsBarcodeScannerVisible] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null);

  // DIÁLOGOS
  type DialogConfig = {
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
    onConfirm?: () => void;
    onCancel?: () => void;
    cancelText?: string;
    buttonText?: string;
  };
  const [dialogConfig, setDialogConfig] = useState<DialogConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const dialogSiguiente = useRef<DialogConfig | null>(null);

  const getDraft = (codigo: string): BoxUnitValue => draftCounts[codigo] ?? EMPTY_BOX_UNIT;

  const handleRegisterRow = (producto: SemaforoAuditProduct) => {
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

  const handleBarcodeScanned = (scannedCode: string) => {
    setIsBarcodeScannerVisible(false);
    const found = activeOrder.products.find(
      (p) => p.codigo === scannedCode || scannedCode.includes(p.codigo)
    );
    setSearchQuery(found ? found.codigo : scannedCode);
    setHighlightedCode(found ? found.codigo : null);
  };

  const getEditValue = (registro: CountedAuditRecord): BoxUnitValue =>
    editDrafts[registro.codigo] ?? {
      cajas: registro.numCajas.toString(),
      unidades: registro.numUnidades.toString(),
    };

  const setEditValue = (codigo: string, next: BoxUnitValue) =>
    setEditDrafts((prev) => ({ ...prev, [codigo]: next }));

  const commitEdit = (registro: CountedAuditRecord) => {
    const draft = editDrafts[registro.codigo];
    if (!draft || consolidado) return;

    setItemsAuditados((prev) =>
      prev.map((rec) =>
        rec.codigo === registro.codigo
          ? {
              ...rec,
              numCajas: parseInt(draft.cajas || '0', 10) || 0,
              numUnidades: parseInt(draft.unidades || '0', 10) || 0,
              totalContado: boxUnitTotal(draft, registro.cajaSize),
            }
          : rec
      )
    );

    setEditDrafts((prev) => {
      const next = { ...prev };
      delete next[registro.codigo];
      return next;
    });
  };

  const handleSaveNote = (text: string) => {
    if (!noteCodigo) return;
    setObservations((prev) => {
      const next = { ...prev };
      if (text.length === 0) delete next[noteCodigo];
      else next[noteCodigo] = text;
      return next;
    });
    setNoteCodigo(null);
  };

  // MÉTRICAS EN MODO EJECUCIÓN
  const stats = useMemo(() => {
    let matches = 0;
    let mismatches = 0;
    itemsAuditados.forEach((item) => {
      if (item.totalContado === item.expectedQty) matches++;
      else mismatches++;
    });
    return {
      contados: itemsAuditados.length,
      total: activeOrder.products.length,
      pendientes: activeOrder.products.length - itemsAuditados.length,
      matches,
      mismatches,
    };
  }, [itemsAuditados, activeOrder.products.length]);

  // MÉTRICAS EN MODO AUDITORÍA COMPLETADA
  const completedStats = useMemo(() => {
    let matches = 0;
    let mismatches = 0;
    activeOrder.products.forEach((p) => {
      const counted = p.auditorQty ?? p.expectedQty;
      if (counted === p.expectedQty) matches++;
      else mismatches++;
    });
    return {
      total: activeOrder.products.length,
      matches,
      mismatches,
    };
  }, [activeOrder.products]);

  const closeDialog = () => setDialogConfig((prev) => ({ ...prev, visible: false }));

  const handleRedirectToList = () => {
    closeDialog();
    const route = findRouteById('supervisor.semaforo');
    if (route) navigateTo(route);
  };

  const handleDialogClose = () => {
    if (dialogSiguiente.current) {
      setDialogConfig(dialogSiguiente.current);
      dialogSiguiente.current = null;
      return;
    }
    closeDialog();
  };

  const confirmarConsolidacion = () => {
    setConsolidado(true);
    completeSemaforoAudit(activeOrder.id, itemsAuditados, observations);
    dialogSiguiente.current = {
      visible: true,
      title: 'Auditoría consolidada',
      message: `Se consolidó la revisión de ${stats.contados} de ${stats.total} productos en la Orden ${activeOrder.orderCode}. El conteo queda cerrado y registrado en el historial.`,
      type: 'success',
      onConfirm: handleRedirectToList,
    };
  };

  const handleConsolidar = () => {
    if (consolidado) return;

    const pendientes =
      stats.pendientes > 0
        ? `Quedan ${stats.pendientes} de ${stats.total} productos sin registrar y quedarán fuera de la auditoría. `
        : '';

    setDialogConfig({
      visible: true,
      title: 'Consolidar auditoría',
      message: `${pendientes}Al consolidar, el conteo queda cerrado oficialmente.`,
      type: 'warning',
      buttonText: 'Consolidar',
      cancelText: 'Seguir revisando',
      onCancel: closeDialog,
      onConfirm: confirmarConsolidacion,
    });
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeOrder.products;
    return activeOrder.products.filter(
      (p) => p.codigo.toLowerCase().includes(query) || p.nombre.toLowerCase().includes(query)
    );
  }, [searchQuery, activeOrder.products]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 80,
          gap: 14,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* BOTÓN VOLVER */}
        <TouchableOpacity
          onPress={handleRedirectToList}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            alignSelf: 'flex-start',
            paddingVertical: 2,
          }}
        >
          <ArrowLeft size={16} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>
            Todas las revisiones
          </Text>
        </TouchableOpacity>

        {/* HEADER DE LA ORDEN DE AUDITORÍA */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 14,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <View style={{ gap: 2, flex: 1 }}>
              <Text variant="header" style={{ fontSize: 17, fontWeight: '800', color: theme.colors.foreground }}>
                {isAuditCompleted ? 'Detalle de Auditoría:' : 'Auditoría a Ciegas:'} {activeOrder.orderCode}
              </Text>
              <Text variant="caption" numberOfLines={1} style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>
                {activeOrder.driverName} • {activeOrder.zonaRuta}
              </Text>
            </View>

            <Badge
              label={isAuditCompleted ? 'Completada' : 'En Curso'}
              tone={isAuditCompleted ? 'success' : 'warning'}
              size="sm"
              icon={isAuditCompleted ? CheckCircle2 : ShieldCheck}
            />
          </View>

          {/* CADENA DE CONTEO / AUDITORÍA */}
          <View
            style={{
              backgroundColor: theme.colors.secondary,
              borderRadius: 10,
              padding: 10,
              gap: 6,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text variant="caption" style={{ fontSize: 10, fontWeight: '800', color: theme.colors.mutedForeground }}>
              CADENA DE VERIFICACIÓN
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={13} color={theme.colors.success} />
              <Text variant="caption" style={{ fontSize: 11, color: theme.colors.foreground }}>
                <Text style={{ fontWeight: '700' }}>Chofer: </Text>
                {activeOrder.counts.driver.user} ({activeOrder.counts.driver.time})
              </Text>
            </View>

            {activeOrder.counts.consolidator.status === 'COMPLETED' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={13} color={theme.colors.success} />
                <Text variant="caption" style={{ fontSize: 11, color: theme.colors.foreground }}>
                  <Text style={{ fontWeight: '700' }}>Consolidador: </Text>
                  {activeOrder.counts.consolidator.user} ({activeOrder.counts.consolidator.time})
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isAuditCompleted ? (
                <CheckCircle2 size={13} color={theme.colors.success} />
              ) : (
                <Lock size={13} color={theme.colors.primary} />
              )}
              <Text variant="caption" style={{ fontSize: 11, color: isAuditCompleted ? theme.colors.foreground : theme.colors.primary }}>
                <Text style={{ fontWeight: '700' }}>Auditor Semáforo: </Text>
                {isAuditCompleted
                  ? `${activeOrder.counts.semaphoreAuditor.user} (${activeOrder.counts.semaphoreAuditor.time})`
                  : 'Conteo ciego en proceso'}
              </Text>
            </View>
          </View>
        </View>

        {/* BUSCADOR */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar producto por nombre o SKU..."
        />

        {/* VISTA SEGÚN ESTADO DE LA AUDITORÍA */}
        {isAuditCompleted ? (
          /* ========================================================================= */
          /* MODO LECTURA: DETALLE DE AUDITORÍA FINALIZADA                            */
          /* ========================================================================= */
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="label" style={{ fontSize: 13, fontWeight: '800', color: theme.colors.foreground }}>
                Manifiesto auditado ({activeOrder.products.length} productos)
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Badge label={`${completedStats.matches} OK`} tone="success" size="sm" />
                {completedStats.mismatches > 0 && (
                  <Badge label={`${completedStats.mismatches} Con Diferencia`} tone="danger" size="sm" />
                )}
              </View>
            </View>

            {filteredProducts.map((producto) => {
              const auditorTotal = producto.auditorQty ?? producto.expectedQty;
              const diff = auditorTotal - producto.expectedQty;
              const isMatch = diff === 0;

              const driverQty = producto.driverQty ?? producto.expectedQty;
              const driverBoxes =
                producto.driverBoxes ?? Math.floor(driverQty / producto.cajaSize);
              const driverUnits =
                producto.driverUnits ?? driverQty % producto.cajaSize;

              const auditorBoxes =
                producto.auditorBoxes ?? Math.floor(auditorTotal / producto.cajaSize);
              const auditorUnits =
                producto.auditorUnits ?? auditorTotal % producto.cajaSize;

              const expectedBoxes = Math.floor(producto.expectedQty / producto.cajaSize);
              const expectedUnits = producto.expectedQty % producto.cajaSize;

              return (
                <Card
                  key={producto.id}
                  padding="m"
                  borderRadius="xl"
                  borderWidth={1}
                  style={{
                    gap: 10,
                    borderColor: isMatch ? theme.colors.success : theme.colors.danger,
                  }}
                >
                  {/* FILA 1: SKU + FRÍO + BADGE RESULTADO */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                      <Text variant="label" style={{ fontSize: 12, fontWeight: '800', color: theme.colors.mutedForeground }}>
                        {producto.codigo}
                      </Text>
                      {producto.isCold && <Badge label="❄️ Frío" tone="neutral" size="sm" />}
                    </View>

                    <Badge
                      label={
                        isMatch
                          ? 'Conforme'
                          : diff > 0
                          ? `+${diff} Sobrante`
                          : `${diff} Faltante`
                      }
                      tone={isMatch ? 'success' : diff > 0 ? 'warning' : 'danger'}
                      size="sm"
                      icon={isMatch ? CheckCircle2 : AlertTriangle}
                    />
                  </View>

                  {/* FILA 2: NOMBRE DEL PRODUCTO */}
                  <Text variant="subtitle" numberOfLines={2} style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}>
                    {producto.nombre}
                  </Text>

                  {/* FILA 3: COMPARATIVO COMPLETO DE LA CADENA DE CONTEO */}
                  <View
                    style={{
                      backgroundColor: isMatch ? theme.colors.successSoft : theme.colors.secondary,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      gap: 8,
                      borderWidth: 1,
                      borderColor: isMatch ? theme.colors.success : theme.colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                        Esperado en OT
                      </Text>
                      <Text variant="label" style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground }}>
                        {formatBoxUnit(expectedBoxes, expectedUnits, producto.expectedQty)}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                        Contado por el Chofer
                      </Text>
                      <Text variant="label" style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground }}>
                        {formatBoxUnit(driverBoxes, driverUnits, driverQty)}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 6,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.border,
                      }}
                    >
                      <Text variant="caption" style={{ fontSize: 11, fontWeight: '800', color: isMatch ? theme.colors.success : theme.colors.danger }}>
                        Auditoría Semáforo
                      </Text>
                      <Text variant="label" style={{ fontSize: 13, fontWeight: '800', color: isMatch ? theme.colors.success : theme.colors.danger }}>
                        {formatBoxUnit(auditorBoxes, auditorUnits, auditorTotal)}
                      </Text>
                    </View>
                  </View>

                  {/* OBSERVACIÓN REGISTRADA */}
                  {producto.observation ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 6,
                        backgroundColor: theme.colors.secondary,
                        borderRadius: 8,
                        padding: 8,
                      }}
                    >
                      <StickyNote size={14} color={theme.colors.primary} style={{ marginTop: 1 }} />
                      <Text variant="caption" style={{ fontSize: 11, color: theme.colors.foreground, flex: 1 }}>
                        <Text style={{ fontWeight: '700' }}>Observación: </Text>
                        {producto.observation}
                      </Text>
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        ) : (
          /* ========================================================================= */
          /* MODO EJECUCIÓN: CONTEO A CIEGAS ACTIVO                                   */
          /* ========================================================================= */
          <View style={{ gap: 14 }}>
            {/* BARRA DE PROGRESO */}
            <CountProgressHeader
              title="Progreso de Auditoría"
              counted={stats.contados}
              total={stats.total}
              unitLabel="productos"
            />

            {/* BOTÓN DE ESCÁNER DE CÓDIGO DE BARRAS */}
            <TouchableOpacity
              onPress={() => setIsBarcodeScannerVisible(true)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: theme.colors.secondary,
                borderRadius: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Camera size={16} color={theme.colors.primary} />
              <Text variant="label" style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>
                Escanear Código de Barras
              </Text>
            </TouchableOpacity>

            {filteredProducts.map((producto) => {
              const registro = itemsAuditados.find((r) => r.codigo === producto.codigo);
              const estaRegistrado = !!registro;
              const draft = getDraft(producto.codigo);
              const draftTotal = boxUnitTotal(draft, producto.cajaSize);
              const puedeRegistrar = draftTotal > 0;

              return (
                <Card
                  key={producto.id}
                  padding="m"
                  borderRadius="xl"
                  borderWidth={1}
                  style={{
                    gap: 10,
                    borderColor: estaRegistrado
                      ? registro.totalContado === registro.expectedQty
                        ? theme.colors.success
                        : theme.colors.danger
                      : highlightedCode === producto.codigo
                      ? theme.colors.primary
                      : theme.colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                      <Text variant="label" style={{ fontSize: 12, fontWeight: '800', color: theme.colors.mutedForeground }}>
                        {producto.codigo}
                      </Text>
                      {producto.isCold && <Badge label="❄️ Frío" tone="neutral" size="sm" />}
                    </View>

                    {estaRegistrado ? (
                      <Badge
                        label={
                          registro.totalContado === registro.expectedQty
                            ? 'Conforme'
                            : `${registro.totalContado - registro.expectedQty > 0 ? '+' : ''}${
                                registro.totalContado - registro.expectedQty
                              } Dif.`
                        }
                        tone={registro.totalContado === registro.expectedQty ? 'success' : 'danger'}
                        size="sm"
                        icon={registro.totalContado === registro.expectedQty ? CheckCircle2 : AlertTriangle}
                      />
                    ) : (
                      <Badge label="Pendiente de conteo" tone="neutral" size="sm" />
                    )}
                  </View>

                  <Text variant="subtitle" numberOfLines={2} style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}>
                    {producto.nombre}
                  </Text>

                  {estaRegistrado ? (
                    <View style={{ gap: 8 }}>
                      <View
                        style={{
                          backgroundColor:
                            registro.totalContado === registro.expectedQty
                              ? theme.colors.successSoft
                              : theme.colors.secondary,
                          borderRadius: 8,
                          padding: 10,
                          gap: 6,
                          borderWidth: 1,
                          borderColor:
                            registro.totalContado === registro.expectedQty
                              ? theme.colors.success
                              : theme.colors.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                            Esperado en OT
                          </Text>
                          <Text variant="label" style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground }}>
                            {formatBoxUnit(
                              Math.floor(registro.expectedQty / registro.cajaSize),
                              registro.expectedQty % registro.cajaSize,
                              registro.expectedQty
                            )}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text variant="caption" style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                            Tu Conteo
                          </Text>
                          <Text variant="label" style={{ fontSize: 12, fontWeight: '800', color: theme.colors.primary }}>
                            {formatBoxUnit(registro.numCajas, registro.numUnidades, registro.totalContado)}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TouchableOpacity
                          onPress={() => setNoteCodigo(producto.codigo)}
                          activeOpacity={0.7}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <StickyNote size={13} color={observations[producto.codigo] ? theme.colors.primary : theme.colors.mutedForeground} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: observations[producto.codigo] ? theme.colors.primary : theme.colors.mutedForeground }}>
                            {observations[producto.codigo] ? 'Ver observación' : 'Agregar observación'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <BoxUnitCounter
                        value={draft}
                        onChange={(next) =>
                          setDraftCounts((prev) => ({ ...prev, [producto.codigo]: next }))
                        }
                        cajaSize={producto.cajaSize}
                        action={
                          <Button
                            label="Registrar"
                            icon={Check}
                            variant="primary"
                            size="xs"
                            disabled={!puedeRegistrar}
                            onPress={() => handleRegisterRow(producto)}
                          />
                        }
                      />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* BARRA INFERIOR DE ACCIÓN (SOLO EN MODO EJECUCIÓN) */}
      {!isAuditCompleted && (
        <ScreenActionBar
          actionLabel={consolidado ? 'Consolidada' : 'Consolidar Auditoría'}
          actionIcon={consolidado ? Lock : CheckCheck}
          tone={consolidado ? 'success' : 'primary'}
          onAction={handleConsolidar}
          actionDisabled={consolidado || stats.contados === 0}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.foreground }}>
            {stats.contados} de {stats.total} contados
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {stats.matches > 0 && <Badge label={`${stats.matches} OK`} tone="success" size="sm" />}
            {stats.mismatches > 0 && <Badge label={`${stats.mismatches} Dif.`} tone="danger" size="sm" />}
          </View>
        </ScreenActionBar>
      )}

      {/* MODAL SHEET DE OBSERVACIÓN */}
      <ObservationSheet
        visible={noteCodigo !== null}
        subtitle={noteCodigo ? `${noteCodigo} · ${activeOrder.orderCode}` : ''}
        value={noteCodigo ? observations[noteCodigo] ?? '' : ''}
        readOnly={isAuditCompleted || consolidado}
        onSave={handleSaveNote}
        onClose={() => setNoteCodigo(null)}
      />

      {/* MODAL ESCÁNER */}
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
              <TouchableOpacity onPress={() => setIsBarcodeScannerVisible(false)} style={{ padding: 4 }}>
                <X size={18} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                height: 180,
                backgroundColor: '#0a0a0a',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: theme.colors.primary,
              }}
            >
              <ScanLine size={48} color={theme.colors.primary} style={{ opacity: 0.4 }} />
              <Text style={{ color: '#ffffff', fontSize: 12, marginTop: 10, fontWeight: '600' }}>
                Apunta el código de barras aquí
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 150 }} contentContainerStyle={{ gap: 6 }}>
              {activeOrder.products.map((prod) => (
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
                    <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground, flexShrink: 1 }}>
                      {prod.codigo} - {prod.nombre}
                    </Text>
                  </View>
                  <Badge label="Simular" tone="primary" size="sm" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Button label="Cancelar" variant="secondary" onPress={() => setIsBarcodeScannerVisible(false)} fullWidth size="md" />
          </View>
        </View>
      </Modal>

      {/* DIÁLOGOS DE CONFIRMACIÓN */}
      <AppDialog
        visible={dialogConfig.visible}
        onClose={handleDialogClose}
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
