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
  Eye,
  AlertTriangle,
  Pencil,
  RotateCcw,
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

    setItemsAuditados((prev) => {
      const exists = prev.some((r) => r.codigo === producto.codigo);
      if (exists) {
        return prev.map((r) => (r.codigo === producto.codigo ? nuevoRegistro : r));
      }
      return [...prev, nuevoRegistro];
    });
    setHighlightedCode(null);
  };

  const handleApplyExpectedDraft = (producto: SemaforoAuditProduct) => {
    const expectedBoxes = Math.floor(producto.expectedQty / producto.cajaSize);
    const expectedUnits = producto.expectedQty % producto.cajaSize;
    setDraftCounts((prev) => ({
      ...prev,
      [producto.codigo]: {
        cajas: expectedBoxes.toString(),
        unidades: expectedUnits.toString(),
      },
    }));
  };

  const handleApplyExpectedEdit = (producto: SemaforoAuditProduct) => {
    const expectedBoxes = Math.floor(producto.expectedQty / producto.cajaSize);
    const expectedUnits = producto.expectedQty % producto.cajaSize;
    setEditDrafts((prev) => ({
      ...prev,
      [producto.codigo]: {
        cajas: expectedBoxes.toString(),
        unidades: expectedUnits.toString(),
      },
    }));
  };

  const handleStartEdit = (producto: SemaforoAuditProduct, registro: CountedAuditRecord) => {
    setEditDrafts((prev) => ({
      ...prev,
      [producto.codigo]: {
        cajas: registro.numCajas.toString(),
        unidades: registro.numUnidades.toString(),
      },
    }));
  };

  const handleCancelEdit = (codigo: string) => {
    setEditDrafts((prev) => {
      const next = { ...prev };
      delete next[codigo];
      return next;
    });
  };

  const handleSaveEdit = (producto: SemaforoAuditProduct) => {
    const draft = editDrafts[producto.codigo];
    if (!draft) return;
    const numCajas = parseInt(draft.cajas || '0', 10) || 0;
    const numUnidades = parseInt(draft.unidades || '0', 10) || 0;
    const totalContado = boxUnitTotal(draft, producto.cajaSize);

    setItemsAuditados((prev) =>
      prev.map((rec) =>
        rec.codigo === producto.codigo
          ? {
              ...rec,
              numCajas,
              numUnidades,
              totalContado,
            }
          : rec
      )
    );

    setEditDrafts((prev) => {
      const next = { ...prev };
      delete next[producto.codigo];
      return next;
    });
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    setIsBarcodeScannerVisible(false);
    const found = activeOrder.products.find(
      (p) => p.codigo === scannedCode || scannedCode.includes(p.codigo)
    );
    setSearchQuery(found ? found.codigo : scannedCode);
    setHighlightedCode(found ? found.codigo : null);
  };

  const setEditValue = (codigo: string, next: BoxUnitValue) =>
    setEditDrafts((prev) => ({ ...prev, [codigo]: next }));

  const handleSaveNote = (text: string) => {
    if (!noteCodigo) return;
    const trimmed = text.trim();
    if (noteCodigo === '__ORDER__') {
      setObservations((prev) => {
        const next = { ...prev };
        if (trimmed.length === 0) {
          delete next['__ORDER__'];
        } else {
          next['__ORDER__'] = trimmed;
          activeOrder.products.forEach((p) => {
            next[p.codigo] = trimmed;
          });
        }
        return next;
      });
    } else {
      setObservations((prev) => {
        const next = { ...prev };
        if (trimmed.length === 0) delete next[noteCodigo];
        else next[noteCodigo] = trimmed;
        return next;
      });
    }
    setNoteCodigo(null);
  };

  // MÉTRICAS EN MODO EJECUCIÓN (Cálculo estricto considerando cajas y unidades)
  const currentProductCounts = useMemo(() => {
    return activeOrder.products.map((p) => {
      const registro = itemsAuditados.find((r) => r.codigo === p.codigo);
      const isEditing = !!editDrafts[p.codigo];
      const draft = isEditing ? editDrafts[p.codigo] : draftCounts[p.codigo];

      if (registro && !isEditing) {
        return {
          producto: p,
          numCajas: registro.numCajas,
          numUnidades: registro.numUnidades,
          totalContado: registro.totalContado,
          isStrictlyZero: registro.numCajas === 0 && registro.numUnidades === 0,
          isMatch: registro.totalContado === p.expectedQty,
          isRegistered: true,
        };
      }

      const numCajas = draft ? parseInt(draft.cajas || '0', 10) || 0 : 0;
      const numUnidades = draft ? parseInt(draft.unidades || '0', 10) || 0 : 0;
      const totalContado = draft ? boxUnitTotal(draft, p.cajaSize) : 0;
      const isStrictlyZero = numCajas === 0 && numUnidades === 0;

      return {
        producto: p,
        numCajas,
        numUnidades,
        totalContado,
        isStrictlyZero,
        isMatch: totalContado === p.expectedQty,
        isRegistered: false,
      };
    });
  }, [activeOrder.products, itemsAuditados, editDrafts, draftCounts]);

  const stats = useMemo(() => {
    let matches = 0;
    let mismatches = 0;
    let strictlyZeroCount = 0;
    let registeredCount = 0;

    currentProductCounts.forEach((item) => {
      if (item.isRegistered) registeredCount++;
      if (item.isStrictlyZero) strictlyZeroCount++;
      if (item.isMatch) matches++;
      else mismatches++;
    });

    return {
      contados: registeredCount,
      total: activeOrder.products.length,
      pendientes: activeOrder.products.length - registeredCount,
      strictlyZeroCount,
      matches,
      mismatches,
    };
  }, [currentProductCounts, activeOrder.products.length]);

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

  const handleApplyAllExpected = () => {
    const nuevosRegistros: CountedAuditRecord[] = activeOrder.products.map((p) => {
      const expectedBoxes = Math.floor(p.expectedQty / p.cajaSize);
      const expectedUnits = p.expectedQty % p.cajaSize;
      return {
        id: `audit-${p.codigo}`,
        codigo: p.codigo,
        nombre: p.nombre,
        numCajas: expectedBoxes,
        numUnidades: expectedUnits,
        totalContado: p.expectedQty,
        cajaSize: p.cajaSize,
        isCold: p.isCold,
        expectedQty: p.expectedQty,
      };
    });
    setItemsAuditados(nuevosRegistros);
    setEditDrafts({});
  };

  const confirmarConsolidacion = () => {
    setConsolidado(true);

    const todosLosRegistros: CountedAuditRecord[] = currentProductCounts.map((item) => ({
      id: `audit-${item.producto.codigo}`,
      codigo: item.producto.codigo,
      nombre: item.producto.nombre,
      numCajas: item.numCajas,
      numUnidades: item.numUnidades,
      totalContado: item.totalContado,
      cajaSize: item.producto.cajaSize,
      isCold: item.producto.isCold,
      expectedQty: item.producto.expectedQty,
    }));

    setItemsAuditados(todosLosRegistros);
    completeSemaforoAudit(activeOrder.id, todosLosRegistros, observations);

    setDialogConfig({
      visible: true,
      title: 'Revisión consolidada',
      message: `Se consolidó la revisión de ${todosLosRegistros.length} productos en la Orden ${activeOrder.orderCode}. El conteo queda cerrado y registrado en el historial.`,
      type: 'success',
      buttonText: 'Aceptar',
      onConfirm: handleRedirectToList,
    });
  };

  const handleConsolidar = () => {
    if (consolidado) return;

    const { strictlyZeroCount, total, matches, mismatches } = stats;

    let mensaje = `Se consolidará la revisión de ${total} productos (${matches} conformes y ${mismatches} con diferencia).`;
    if (strictlyZeroCount > 0) {
      mensaje += `\n\nNota: ${strictlyZeroCount} producto${strictlyZeroCount > 1 ? 's tienen' : ' tiene'} conteo en 0 (tanto en cajas como en unidades).`;
    }

    setDialogConfig({
      visible: true,
      title: 'Consolidar revisión',
      message: `${mensaje}\n\n¿Deseas finalizar y guardar la revisión?`,
      type: strictlyZeroCount > 0 || mismatches > 0 ? 'warning' : 'info',
      buttonText: 'Consolidar y Guardar',
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
        {/* HEADER DE LA REVISIÓN SEMÁFORO */}
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
                {isAuditCompleted ? 'Detalle de Revisión:' : 'Revisión Semáforo:'} {activeOrder.orderCode}
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

          {/* CADENA DE CONTEO / VERIFICACIÓN */}
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
                <Text style={{ fontWeight: '700' }}>Supervisor Semáforo: </Text>
                {isAuditCompleted
                  ? `${activeOrder.counts.semaphoreAuditor.user} (${activeOrder.counts.semaphoreAuditor.time})`
                  : 'Revisión en proceso'}
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
          /* MODO LECTURA: DETALLE DE REVISIÓN FINALIZADA                             */
          /* ========================================================================= */
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="label" style={{ fontSize: 13, fontWeight: '800', color: theme.colors.foreground }}>
                Manifiesto revisado ({activeOrder.products.length} productos)
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

              const auditorBoxes =
                producto.auditorBoxes ?? Math.floor(auditorTotal / producto.cajaSize);
              const auditorUnits =
                producto.auditorUnits ?? auditorTotal % producto.cajaSize;

              const expectedBoxes = Math.floor(producto.expectedQty / producto.cajaSize);
              const expectedUnits = producto.expectedQty % producto.cajaSize;
              const diffLabel = diff > 0 ? `+${diff} Diferencias` : `${diff} Diferencias`;

              return (
                <Card
                  key={producto.id}
                  padding="m"
                  borderRadius="xl"
                  borderWidth={1.5}
                  style={{
                    gap: 10,
                    borderColor: isMatch ? theme.colors.success : theme.colors.danger,
                    backgroundColor: isMatch ? theme.colors.successSoft : theme.colors.dangerSoft,
                    borderLeftWidth: 5,
                    borderLeftColor: isMatch ? theme.colors.success : theme.colors.danger,
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
                      label={isMatch ? 'Conforme' : diffLabel}
                      tone={isMatch ? 'success' : 'danger'}
                      size="sm"
                      icon={isMatch ? CheckCircle2 : AlertTriangle}
                    />
                  </View>

                  {/* FILA 2: NOMBRE DEL PRODUCTO */}
                  <Text variant="subtitle" numberOfLines={2} style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}>
                    {producto.nombre}
                  </Text>

                  {/* FILA 3: COMPARATIVO ESPERADO VS REVISIÓN */}
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
                        Revisión Semáforo
                      </Text>
                      <Text variant="label" style={{ fontSize: 13, fontWeight: '800', color: isMatch ? theme.colors.success : theme.colors.danger }}>
                        {formatBoxUnit(auditorBoxes, auditorUnits, auditorTotal)}
                      </Text>
                    </View>
                  </View>

                  {/* OBSERVACIÓN REGISTRADA */}
                  {producto.observation ? (
                    <TouchableOpacity
                      onPress={() => setNoteCodigo(producto.codigo)}
                      activeOpacity={0.7}
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
                    </TouchableOpacity>
                  ) : null}
                </Card>
              );
            })}
          </View>
        ) : (
          /* ========================================================================= */
          /* MODO EJECUCIÓN: REVISIÓN SEMÁFORO ACTIVA                                 */
          /* ========================================================================= */
          <View style={{ gap: 14 }}>
            {/* HERRAMIENTAS RÁPIDAS: COPIAR TODO DE OT, OBSERVACIÓN GENERAL Y ESCÁNER */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* <TouchableOpacity
                onPress={handleApplyAllExpected}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <CheckCheck size={15} color={theme.colors.success} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.foreground }}>
                  Copiar OT
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setNoteCodigo('__ORDER__')}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: observations['__ORDER__'] ? theme.colors.primarySoft : theme.colors.secondary,
                  borderRadius: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: observations['__ORDER__'] ? theme.colors.primary : theme.colors.border,
                }}
              >
                <StickyNote size={15} color={theme.colors.primary} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                  Observación
                </Text>
              </TouchableOpacity> */}

              <TouchableOpacity
                onPress={() => setIsBarcodeScannerVisible(true)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Camera size={15} color={theme.colors.primary} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                  Escanear
                </Text>
              </TouchableOpacity>
            </View>

            {filteredProducts.map((producto) => {
              const registro = itemsAuditados.find((r) => r.codigo === producto.codigo);
              const isEditing = !!editDrafts[producto.codigo];
              const estaRegistrado = !!registro && !isEditing;

              const currentDraft = isEditing
                ? editDrafts[producto.codigo]
                : (draftCounts[producto.codigo] ?? EMPTY_BOX_UNIT);
              const currentTotal = isEditing
                ? boxUnitTotal(currentDraft, producto.cajaSize)
                : (estaRegistrado ? registro.totalContado : boxUnitTotal(currentDraft, producto.cajaSize));

              const expectedBoxes = Math.floor(producto.expectedQty / producto.cajaSize);
              const expectedUnits = producto.expectedQty % producto.cajaSize;

              const isMatch = currentTotal === producto.expectedQty;
              const liveDiff = currentTotal - producto.expectedQty;
              const diffLabel = liveDiff > 0 ? `+${liveDiff} Diferencias` : `${liveDiff} Diferencias`;

              const hasValue = estaRegistrado || isEditing || currentTotal > 0 || !!currentDraft.cajas || !!currentDraft.unidades;

              const cardBorderColor = hasValue
                ? (isMatch ? theme.colors.success : theme.colors.danger)
                : theme.colors.border;
              const cardBgColor = hasValue
                ? (isMatch ? theme.colors.successSoft : theme.colors.dangerSoft)
                : theme.colors.cardBackground;

              return (
                <Card
                  key={producto.id}
                  padding="m"
                  borderRadius="xl"
                  borderWidth={hasValue ? 1.5 : 1}
                  style={{
                    gap: 10,
                    backgroundColor: cardBgColor,
                    borderColor: cardBorderColor,
                    borderLeftWidth: hasValue ? 5 : 1,
                    borderLeftColor: cardBorderColor,
                  }}
                >
                  {/* FILA 1: SKU + FRÍO + BADGE */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                      <Text variant="label" style={{ fontSize: 12, fontWeight: '800', color: theme.colors.mutedForeground }}>
                        {producto.codigo}
                      </Text>
                      {producto.isCold && <Badge label="❄️ Frío" tone="neutral" size="sm" />}
                    </View>

                    {estaRegistrado ? (
                      <Badge
                        label={isMatch ? 'Conforme ✓' : diffLabel}
                        tone={isMatch ? 'success' : 'danger'}
                        size="sm"
                        icon={isMatch ? CheckCircle2 : AlertTriangle}
                      />
                    ) : (
                      <Badge
                        label={
                          currentTotal > 0
                            ? (isMatch ? 'Conforme' : diffLabel)
                            : 'Pendiente de conteo'
                        }
                        tone={currentTotal > 0 ? (isMatch ? 'success' : 'danger') : 'neutral'}
                        size="sm"
                        icon={currentTotal > 0 ? (isMatch ? CheckCircle2 : AlertTriangle) : undefined}
                      />
                    )}
                  </View>

                  {/* FILA 2: NOMBRE DEL PRODUCTO */}
                  <Text variant="subtitle" numberOfLines={2} style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}>
                    {producto.nombre}
                  </Text>

                  {/* FILA 3: COMPARATIVO ESPERADO EN OT & TU CONTEO */}
                  <View
                    style={{
                      backgroundColor: estaRegistrado ? theme.colors.cardBackground : theme.colors.secondary,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      gap: 8,
                      borderWidth: 1,
                      borderColor: estaRegistrado
                        ? (isMatch ? theme.colors.success + '40' : theme.colors.danger + '40')
                        : theme.colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text variant="caption" style={{ fontSize: 11, fontWeight: '600', color: theme.colors.mutedForeground }}>
                          Esperado en OT
                        </Text>
                        {!estaRegistrado && (
                          <TouchableOpacity
                            onPress={() => isEditing ? handleApplyExpectedEdit(producto) : handleApplyExpectedDraft(producto)}
                            activeOpacity={0.8}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 7,
                              paddingVertical: 3,
                              borderRadius: 6,
                              backgroundColor: theme.colors.cardBackground,
                              borderWidth: 1,
                              borderColor: theme.colors.border,
                            }}
                          >
                            <RotateCcw size={10} color={theme.colors.primary} />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.primary }}>
                              Aplicar OT
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text variant="label" style={{ fontSize: 13, fontWeight: '700', color: theme.colors.foreground }}>
                        {formatBoxUnit(expectedBoxes, expectedUnits, producto.expectedQty)}
                      </Text>
                    </View>

                    {estaRegistrado && (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: 6,
                          borderTopWidth: 1,
                          borderTopColor: theme.colors.border + '80',
                        }}
                      >
                        <Text variant="caption" style={{ fontSize: 11, fontWeight: '800', color: isMatch ? theme.colors.success : theme.colors.danger }}>
                          Tu Conteo (Supervisor)
                        </Text>
                        <Text variant="label" style={{ fontSize: 13, fontWeight: '800', color: isMatch ? theme.colors.success : theme.colors.danger }}>
                          {formatBoxUnit(registro.numCajas, registro.numUnidades, registro.totalContado)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* FILA 4: CONTROLES DE CONTEO O BOTÓN MODIFICAR / OBSERVACIÓN */}
                  {estaRegistrado ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
                      <TouchableOpacity
                        onPress={() => setNoteCodigo(producto.codigo)}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <StickyNote size={13} color={observations[producto.codigo] ? theme.colors.primary : theme.colors.mutedForeground} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: observations[producto.codigo] ? theme.colors.primary : theme.colors.mutedForeground }}>
                          {observations[producto.codigo] ? 'Ver observación' : '+ Observación'}
                        </Text>
                      </TouchableOpacity>

                      <Button
                        label="Modificar"
                        icon={Pencil}
                        variant="secondary"
                        size="xs"
                        onPress={() => handleStartEdit(producto, registro)}
                      />
                    </View>
                  ) : (
                    <View style={{ gap: 8, paddingTop: 2 }}>
                      <BoxUnitCounter
                        value={currentDraft}
                        onChange={(next) => {
                          if (isEditing) {
                            setEditValue(producto.codigo, next);
                          } else {
                            setDraftCounts((prev) => ({ ...prev, [producto.codigo]: next }));
                          }
                        }}
                        cajaSize={producto.cajaSize}
                        action={
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {isEditing && (
                              <Button
                                label="Cancelar"
                                variant="secondary"
                                size="xs"
                                onPress={() => handleCancelEdit(producto.codigo)}
                              />
                            )}
                            <Button
                              label="Guardar Conteo"
                              icon={Check}
                              variant="primary"
                              size="xs"
                              onPress={() => isEditing ? handleSaveEdit(producto) : handleRegisterRow(producto)}
                            />
                          </View>
                        }
                      />

                      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 2 }}>
                        <TouchableOpacity
                          onPress={() => setNoteCodigo(producto.codigo)}
                          activeOpacity={0.7}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <StickyNote size={13} color={observations[producto.codigo] ? theme.colors.primary : theme.colors.mutedForeground} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: observations[producto.codigo] ? theme.colors.primary : theme.colors.mutedForeground }}>
                            {observations[producto.codigo] ? 'Ver observación' : '+ Observación'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* PREVIEW DE OBSERVACIÓN EN LA TARJETA */}
                  {observations[producto.codigo] ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 6,
                        backgroundColor: theme.colors.secondary,
                        borderRadius: 8,
                        padding: 8,
                        marginTop: 2,
                      }}
                    >
                      <StickyNote size={13} color={theme.colors.primary} style={{ marginTop: 1 }} />
                      <Text variant="caption" style={{ fontSize: 11, color: theme.colors.foreground, flex: 1 }}>
                        <Text style={{ fontWeight: '700' }}>Observación: </Text>
                        {observations[producto.codigo]}
                      </Text>
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* BARRA INFERIOR DE ACCIÓN (SOLO EN MODO EJECUCIÓN) */}
      {!isAuditCompleted && (
        <ScreenActionBar
          actionLabel={consolidado ? 'Consolidada' : 'Consolidar Revisión'}
          actionIcon={consolidado ? Lock : CheckCheck}
          tone={consolidado ? 'success' : 'primary'}
          onAction={handleConsolidar}
          actionDisabled={consolidado}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.foreground }}>
            {stats.contados} de {stats.total} verificados
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {stats.matches > 0 && <Badge label={`${stats.matches} OK`} tone="success" size="sm" />}
            {stats.mismatches > 0 && (
              <Badge
                label={`${stats.mismatches} Diferencia${stats.mismatches > 1 ? 's' : ''}`}
                tone="danger"
                size="sm"
                icon={AlertTriangle}
              />
            )}
          </View>
        </ScreenActionBar>
      )}

      {/* MODAL SHEET DE OBSERVACIÓN */}
      <ObservationSheet
        visible={noteCodigo !== null}
        subtitle={
          noteCodigo === '__ORDER__'
            ? `Todos los productos · ${activeOrder.orderCode}`
            : noteCodigo ? `${noteCodigo} · ${activeOrder.orderCode}` : ''
        }
        value={noteCodigo ? (observations[noteCodigo] ?? '') : ''}
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
