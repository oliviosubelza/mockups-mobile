import React, { useState, useRef, useMemo } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Package,
  Layers,
  X,
  Bookmark,
  CheckCircle2,
  XCircle,
  Snowflake,
  ShieldAlert,
  QrCode,
  Camera,
  ScanLine,
  RotateCcw,
  Minus,
  Plus,
  CheckCheck,
} from 'lucide-react-native';

import { findRouteById, navigateTo } from '@/navigation/registry';
import { Badge, Button, AppDialog } from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

// CATALOGO DE PRODUCTOS DISPONIBLES EN LA OT-4892 PARA EL BUSCADOR
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

  // ESTADOS DEL FORMULARIO DE CONTEO A CIEGAS
  const [productoTexto, setProductoTexto] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [cantCajas, setCantCajas] = useState('');
  const [cantUnidades, setCantUnidades] = useState('');
  const [itemsAuditados, setItemsAuditados] = useState<CountedAuditRecord[]>([]);

  // CONTADOR DE RE-CONTEOS POR CÓDIGO DE PRODUCTO (MÁXIMO 2 INTENTOS PERMITIDOS)
  const [recountAttempts, setRecountAttempts] = useState<Record<string, number>>({});

  // ESTADO DEL MODAL IN-SITU DE RE-CONTEO RÁPIDO DIRECTO EN LA TARJETA
  const [isRecountModalVisible, setIsRecountModalVisible] = useState(false);
  const [modalItem, setModalItem] = useState<CountedAuditRecord | null>(null);
  const [modalCajas, setModalCajas] = useState('0');
  const [modalUnidades, setModalUnidades] = useState('0');

  // ESTADO DEL ESCÁNER DE CÓDIGO DE BARRAS POR CÁMARA
  const [isBarcodeScannerVisible, setIsBarcodeScannerVisible] = useState(false);

  // FOCUS Y SUGERENCIAS
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCajasFocused, setIsCajasFocused] = useState(false);
  const [isUnidadesFocused, setIsUnidadesFocused] = useState(false);
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  const cajasInputRef = useRef<TextInput>(null);
  const unidadesInputRef = useRef<TextInput>(null);

  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);

  // Excluir productos ya agregados del buscador
  const codigosAgregados = useMemo(() => {
    return new Set(itemsAuditados.map((item) => item.codigo));
  }, [itemsAuditados]);

  const handleSearchChange = (text: string) => {
    setProductoTexto(text);
    setProductoSeleccionado(null);

    if (text.trim().length > 0) {
      const query = text.toLowerCase();
      const filtrados = MOCK_OT_PRODUCTS.filter(
        (p) =>
          !codigosAgregados.has(p.codigo) &&
          (p.codigo.toLowerCase().includes(query) || p.nombre.toLowerCase().includes(query))
      ).slice(0, 5);

      setSugerencias(filtrados);
      setMostrarSugerencias(true);
    } else {
      setSugerencias([]);
      setMostrarSugerencias(false);
    }
  };

  const seleccionarProducto = (producto: any) => {
    setProductoSeleccionado(producto);
    setProductoTexto(`${producto.codigo} - ${producto.nombre}`);
    setMostrarSugerencias(false);
    unidadesInputRef.current?.focus();
  };

  const limpiarBuscador = () => {
    setProductoTexto('');
    setProductoSeleccionado(null);
    setCantCajas('');
    setCantUnidades('');
    setMostrarSugerencias(false);
  };

  // MANEJO DE CÓDIGO DE BARRAS ESCANEADO
  const handleBarcodeScanned = (scannedCode: string) => {
    setIsBarcodeScannerVisible(false);

    const found = MOCK_OT_PRODUCTS.find((p) => p.codigo === scannedCode || scannedCode.includes(p.codigo));
    if (found) {
      seleccionarProducto(found);
    } else {
      setProductoTexto(scannedCode);
      handleSearchChange(scannedCode);
    }
  };

  // ABRIR MODAL SHEET FLOTANTE IN-SITU DE RE-CONTEO
  const openRecountModal = (item: CountedAuditRecord) => {
    const attempts = recountAttempts[item.codigo] || 0;
    if (attempts >= 2) return;

    setModalItem(item);
    setModalCajas(item.numCajas.toString());
    setModalUnidades(item.numUnidades.toString());
    setIsRecountModalVisible(true);
  };

  // GUARDAR AJUSTE DE RE-CONTEO DESDE EL MODAL SHEET IN-SITU
  const saveRecountFromModal = () => {
    if (!modalItem) return;

    const numCjas = parseInt(modalCajas || '0', 10);
    const numUnids = parseInt(modalUnidades || '0', 10);
    const totalContadoCalculado = numCjas * modalItem.cajaSize + numUnids;

    // Actualizar registro sobre el mismo producto sin duplicar
    setItemsAuditados((prev) =>
      prev.map((rec) =>
        rec.codigo === modalItem.codigo
          ? {
              ...rec,
              numCajas: numCjas,
              numUnidades: numUnids,
              totalContado: totalContadoCalculado,
            }
          : rec
      )
    );

    // Incrementar contador de re-conteos
    setRecountAttempts((prev) => ({
      ...prev,
      [modalItem.codigo]: (prev[modalItem.codigo] || 0) + 1,
    }));

    setIsRecountModalVisible(false);
    setModalItem(null);
  };

  const numCajas = parseInt(cantCajas || '0', 10);
  const numUnidades = parseInt(cantUnidades || '0', 10);
  const cajaSize = productoSeleccionado?.cajaSize ?? 1;
  const totalContadoCalculado = numCajas * cajaSize + numUnidades;

  const canAdd =
    productoSeleccionado !== null &&
    (cantCajas.trim().length > 0 || cantUnidades.trim().length > 0) &&
    totalContadoCalculado > 0;

  // AGREGAR O ACTUALIZAR PRODUCTO EN LUGAR DE DUPLICAR
  const handleAddItem = () => {
    if (!canAdd || !productoSeleccionado) return;

    const existingIndex = itemsAuditados.findIndex((item) => item.codigo === productoSeleccionado.codigo);

    if (existingIndex !== -1) {
      // ACTUALIZAR EL MISMO PRODUCTO
      setItemsAuditados((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                numCajas,
                numUnidades,
                totalContado: totalContadoCalculado,
              }
            : item
        )
      );
    } else {
      // INSERTAR NUEVO PRODUCTO
      const newItem: CountedAuditRecord = {
        id: `audit-${Date.now()}`,
        codigo: productoSeleccionado.codigo,
        nombre: productoSeleccionado.nombre,
        numCajas,
        numUnidades,
        totalContado: totalContadoCalculado,
        cajaSize,
        isCold: productoSeleccionado.isCold,
        expectedQty: productoSeleccionado.expectedQty,
      };
      setItemsAuditados((prev) => [...prev, newItem]);
    }

    limpiarBuscador();
  };

  const handleFinishAudit = () => {
    setIsSuccessDialogOpen(true);
  };

  const handleRedirectToList = () => {
    setIsSuccessDialogOpen(false);
    const route = findRouteById('supervisor.semaforo');
    if (route) navigateTo(route);
  };

  // MÉTIRICAS EN TIEMPO REAL
  const stats = useMemo(() => {
    let matches = 0;
    let mismatches = 0;
    itemsAuditados.forEach((item) => {
      if (item.totalContado === item.expectedQty) matches++;
      else mismatches++;
    });
    return { total: itemsAuditados.length, matches, mismatches };
  }, [itemsAuditados]);

  // CÁLCULOS DEL MODAL DE RE-CONTEO
  const modalCjasNum = parseInt(modalCajas || '0', 10);
  const modalUnidsNum = parseInt(modalUnidades || '0', 10);
  const modalCajaSize = modalItem?.cajaSize || 12;
  const modalTotalCalc = modalCjasNum * modalCajaSize + modalUnidsNum;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER DE CONTEXTO SIN BOTÓN ARRIBA */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 2, flex: 1 }}>
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
              {itemsAuditados.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Badge label={`${stats.matches} ok`} tone="success" emphasis="soft" size="sm" />
                  {stats.mismatches > 0 && (
                    <Badge label={`${stats.mismatches} diff`} tone="danger" emphasis="soft" size="sm" />
                  )}
                </View>
              )}
            </View>
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
            Modo Auditoría: Busca el producto e ingresa las Cajas y Unidades contadas físicamente.
          </Text>
        </View>

        {/* CARD DEL FORMULARIO COMPACTO DE REGISTRO DE CONTEO */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.border,
            borderWidth: 1,
            padding: 16,
            borderRadius: 16,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            zIndex: 50,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <Text variant="label" style={{ fontSize: 14 }}>
              {productoSeleccionado ? 'Producto Seleccionado' : 'Buscar Producto'}
            </Text>
            {canAdd && (
              <Badge
                label={`Total: ${totalContadoCalculado} unids`}
                tone="primary"
                emphasis="outline"
                size="sm"
                icon={Package}
              />
            )}
          </View>

          {/* BUSCADOR CON BOTÓN DE ESCÁNER DE CÓDIGO DE BARRAS INTEGRADO */}
          <View style={{ position: 'relative', zIndex: 100, marginBottom: 12, height: 44 }}>
            {productoSeleccionado ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.successSoft,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: theme.colors.success,
                  paddingHorizontal: 12,
                  height: 44,
                }}
              >
                <View
                  style={{
                    backgroundColor: theme.colors.success,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                    {productoSeleccionado.codigo}
                  </Text>
                </View>

                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: '600',
                    color: theme.colors.foreground,
                  }}
                  numberOfLines={1}
                >
                  {productoSeleccionado.nombre}
                </Text>

                <TouchableOpacity onPress={limpiarBuscador} style={{ padding: 6 }}>
                  <X color={theme.colors.mutedForeground} size={18} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* INPUT DE BÚSQUEDA POR TEXTO O CÓDIGO */}
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isSearchFocused ? theme.colors.cardBackground : theme.colors.secondary,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: isSearchFocused ? theme.colors.primary : theme.colors.border,
                    height: 44,
                  }}
                >
                  <Search
                    color={isSearchFocused ? theme.colors.primary : theme.colors.mutedForeground}
                    size={18}
                    style={{ marginLeft: 12 }}
                  />
                  <TextInput
                    value={productoTexto}
                    onChangeText={handleSearchChange}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder="Ej. PROD-005 o Ketchup..."
                    placeholderTextColor={theme.colors.mutedForeground}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      fontSize: 14,
                      color: theme.colors.foreground,
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {productoTexto.length > 0 && (
                    <TouchableOpacity onPress={limpiarBuscador} style={{ padding: 10 }}>
                      <X color={theme.colors.mutedForeground} size={18} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* BOTÓN LECTOR DE CÓDIGO DE BARRAS */}
                <TouchableOpacity
                  onPress={() => setIsBarcodeScannerVisible(true)}
                  activeOpacity={0.8}
                  style={{
                    width: 44,
                    height: 44,
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

                {/* MENÚ FLOTANTE DE SUGERENCIAS */}
                {mostrarSugerencias && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 46,
                      left: 0,
                      right: 52,
                      backgroundColor: theme.colors.cardBackground,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      elevation: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 12,
                      zIndex: 999,
                    }}
                  >
                    {sugerencias.length > 0 ? (
                      sugerencias.map((prod, index) => (
                        <TouchableOpacity
                          key={prod.id}
                          onPress={() => seleccionarProducto(prod)}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            borderBottomWidth: index === sugerencias.length - 1 ? 0 : 1,
                            borderBottomColor: theme.colors.border,
                          }}
                        >
                          <Text variant="caption" style={{ color: theme.colors.foreground, fontSize: 13 }}>
                            <Text style={{ fontWeight: '800' }}>{prod.codigo}</Text> - {prod.nombre}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={{ padding: 14, alignItems: 'center' }}>
                        <Text variant="caption" style={{ color: theme.colors.mutedForeground, textAlign: 'center' }}>
                          No hay productos disponibles o ya fueron ingresados.
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* INPUTS: UNIDADES Y CAJAS */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              marginBottom: 14,
              zIndex: 10,
            }}
          >
            {/* UNIDADES SUELTAS */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Package size={14} color={theme.colors.primary} />
                <Text variant="label" style={{ fontSize: 13 }}>
                  Unidades
                </Text>
              </View>
              <TextInput
                ref={unidadesInputRef}
                value={cantUnidades}
                onChangeText={setCantUnidades}
                onFocus={() => setIsUnidadesFocused(true)}
                onBlur={() => setIsUnidadesFocused(false)}
                placeholder="0"
                placeholderTextColor={theme.colors.mutedForeground}
                keyboardType="numeric"
                style={{
                  backgroundColor: isUnidadesFocused ? theme.colors.cardBackground : theme.colors.secondary,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  height: 44,
                  borderRadius: 10,
                  fontSize: 16,
                  fontWeight: '700',
                  borderWidth: 1.5,
                  borderColor: isUnidadesFocused ? theme.colors.primary : theme.colors.border,
                  textAlign: 'center',
                  color: theme.colors.foreground,
                }}
              />
            </View>

            {/* CAJAS */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Layers size={14} color={theme.colors.primary} />
                <Text variant="label" style={{ fontSize: 13 }}>
                  Cajas
                </Text>
                {productoSeleccionado && (
                  <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                    ({productoSeleccionado.cajaSize} u/cj)
                  </Text>
                )}
              </View>
              <TextInput
                ref={cajasInputRef}
                value={cantCajas}
                onChangeText={setCantCajas}
                onFocus={() => setIsCajasFocused(true)}
                onBlur={() => setIsCajasFocused(false)}
                placeholder="0"
                placeholderTextColor={theme.colors.mutedForeground}
                keyboardType="numeric"
                style={{
                  backgroundColor: isCajasFocused ? theme.colors.cardBackground : theme.colors.secondary,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  height: 44,
                  borderRadius: 10,
                  fontSize: 16,
                  fontWeight: '700',
                  borderWidth: 1.5,
                  borderColor: isCajasFocused ? theme.colors.primary : theme.colors.border,
                  textAlign: 'center',
                  color: theme.colors.foreground,
                }}
              />
            </View>
          </View>

          {/* BOTÓN DE REGISTRO CON TOTAL INTEGRADO */}
          <Button
            label={canAdd ? `Registrar ${totalContadoCalculado} Unidades` : 'Registrar Ítem'}
            variant={canAdd ? 'primary' : 'secondary'}
            disabled={!canAdd}
            onPress={handleAddItem}
            endIcon={Bookmark}
            fullWidth
            size="md"
          />
        </View>

        {/* LISTA DE REGISTROS INGRESADOS EN ESTA AUDITORÍA SEMÁFORO */}
        <View style={{ gap: 10, zIndex: 1, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="label" style={{ fontSize: 15, fontWeight: '800' }}>
              Registro de Auditoría Semáforo
            </Text>
            <Badge
              label={`${itemsAuditados.length} ítems`}
              tone={itemsAuditados.length > 0 ? 'primary' : 'neutral'}
              emphasis="soft"
              size="sm"
            />
          </View>

          {itemsAuditados.length === 0 ? (
            <Text
              variant="caption"
              style={{
                color: theme.colors.mutedForeground,
                textAlign: 'center',
                marginVertical: 24,
                fontSize: 12,
              }}
            >
              Busca y selecciona un producto para comenzar el registro de auditoría a ciegas.
            </Text>
          ) : (
            <View
              style={{
                backgroundColor: theme.colors.cardBackground,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.colors.border,
                overflow: 'hidden',
              }}
            >
              {itemsAuditados.map((item, index) => {
                const isLast = index === itemsAuditados.length - 1;
                const esMatch = item.totalContado === item.expectedQty;
                const diff = item.totalContado - item.expectedQty;
                const diffText = diff > 0 ? `+${diff} (sobran)` : `${diff} (faltan)`;

                const attempts = recountAttempts[item.codigo] || 0;
                const remainingAttempts = 2 - attempts;

                return (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: theme.colors.cardBackground,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: theme.colors.border,
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {esMatch ? (
                        <CheckCircle2 size={16} color={theme.colors.success} style={{ flexShrink: 0 }} />
                      ) : (
                        <XCircle size={16} color={theme.colors.danger} style={{ flexShrink: 0 }} />
                      )}

                      <Text variant="label" style={{ fontSize: 12, color: theme.colors.foreground, fontWeight: '800' }}>
                        {item.codigo}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>•</Text>
                      <Text
                        variant="caption"
                        style={{ fontSize: 12, color: theme.colors.foreground, flex: 1, fontWeight: '600' }}
                        numberOfLines={1}
                      >
                        {item.nombre}
                      </Text>

                      {item.isCold && <Snowflake size={13} color={theme.colors.primary} />}

                      <View
                        style={{
                          backgroundColor: theme.colors.primarySoft,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: theme.colors.primary,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.primary }}>
                          {item.totalContado} u.
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 22 }}>
                      <Text style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                        Ingresado: {item.numCajas > 0 ? `${item.numCajas} Cajas ` : ''}
                        {item.numCajas > 0 && item.numUnidades > 0 ? '+ ' : ''}
                        {item.numUnidades > 0 || item.numCajas === 0 ? `${item.numUnidades} Unids.` : ''}
                      </Text>

                      {esMatch && (
                        <Text style={{ fontSize: 11, color: theme.colors.success, fontWeight: '700' }}>
                          ✓ Conforme ({item.expectedQty} u.)
                        </Text>
                      )}
                    </View>

                    {!esMatch && (
                      <View style={{ paddingLeft: 22, marginTop: 2, gap: 4 }}>
                        <Text style={{ fontSize: 11, color: theme.colors.danger, fontWeight: '700' }}>
                          Diferencia: {diffText} (Esperado: {item.expectedQty} u.)
                        </Text>

                        {/* BOTÓN DE RE-CONTEO QUE ABRE MODAL SHEET IN-SITU SIN SCROLLING */}
                        {remainingAttempts > 0 ? (
                          <TouchableOpacity
                            onPress={() => openRecountModal(item)}
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
                              Recontar producto ({remainingAttempts} {remainingAttempts === 1 ? 'intento restante' : 'intentos restantes'})
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
                              🔒 Máximo de 2 re-conteos alcanzado (Bloqueado)
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <QrCode size={16} color={theme.colors.primary} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.foreground }}>
                        {prod.codigo} - {prod.nombre}
                      </Text>
                    </View>
                    <Badge label="Simular" tone="primary" emphasis="soft" size="sm" />
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
                      label={`Intento ${(recountAttempts[modalItem.codigo] || 0) + 1} de 2`}
                      tone="warning"
                      emphasis="soft"
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

            <View style={{ gap: 14 }}>
              {/* CAJAS */}
              <View
                style={{
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ gap: 2 }}>
                  <Text variant="label" style={{ fontSize: 13, color: theme.colors.foreground }}>
                    Cajas
                  </Text>
                  <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                    ({modalCajaSize} unids/caja)
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      const val = Math.max(0, parseInt(modalCajas || '0', 10) - 1);
                      setModalCajas(val.toString());
                    }}
                    style={{
                      width: 42,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: theme.colors.cardBackground,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Minus size={18} color={theme.colors.foreground} />
                  </TouchableOpacity>

                  <TextInput
                    value={modalCajas}
                    onChangeText={setModalCajas}
                    keyboardType="numeric"
                    style={{
                      width: 58,
                      height: 44,
                      backgroundColor: theme.colors.cardBackground,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: theme.colors.primary,
                      textAlign: 'center',
                      textAlignVertical: 'center',
                      paddingVertical: 0,
                      paddingTop: 0,
                      paddingBottom: 0,
                      fontSize: 16,
                      fontWeight: '700',
                      color: theme.colors.foreground,
                    }}
                  />

                  <TouchableOpacity
                    onPress={() => {
                      const val = parseInt(modalCajas || '0', 10) + 1;
                      setModalCajas(val.toString());
                    }}
                    style={{
                      width: 42,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: theme.colors.cardBackground,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={18} color={theme.colors.foreground} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* UNIDADES SUELTAS */}
              <View
                style={{
                  backgroundColor: theme.colors.secondary,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ gap: 2 }}>
                  <Text variant="label" style={{ fontSize: 13, color: theme.colors.foreground }}>
                    Unidades Sueltas
                  </Text>
                  <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                    Unidades individuales
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      const val = Math.max(0, parseInt(modalUnidades || '0', 10) - 1);
                      setModalUnidades(val.toString());
                    }}
                    style={{
                      width: 42,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: theme.colors.cardBackground,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Minus size={18} color={theme.colors.foreground} />
                  </TouchableOpacity>

                  <TextInput
                    value={modalUnidades}
                    onChangeText={setModalUnidades}
                    keyboardType="numeric"
                    style={{
                      width: 58,
                      height: 44,
                      backgroundColor: theme.colors.cardBackground,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: theme.colors.primary,
                      textAlign: 'center',
                      textAlignVertical: 'center',
                      paddingVertical: 0,
                      paddingTop: 0,
                      paddingBottom: 0,
                      fontSize: 16,
                      fontWeight: '700',
                      color: theme.colors.foreground,
                    }}
                  />

                  <TouchableOpacity
                    onPress={() => {
                      const val = parseInt(modalUnidades || '0', 10) + 1;
                      setModalUnidades(val.toString());
                    }}
                    style={{
                      width: 42,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: theme.colors.cardBackground,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={18} color={theme.colors.foreground} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* TOTAL CALCULADO EN TIEMPO REAL */}
              <View
                style={{
                  backgroundColor: theme.colors.primarySoft,
                  borderRadius: 10,
                  padding: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.primary }}>
                  Total Recontado: {modalTotalCalc} Unidades
                </Text>
              </View>
            </View>

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

      {/* DOCK FLOTANTE OPCIÓN 1 ORIGINAL AL PIE DE PANTALLA */}
      {itemsAuditados.length > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 30,
            borderWidth: 1.5,
            borderColor: theme.colors.primary,
            paddingVertical: 8,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.18,
            shadowRadius: 10,
          }}
        >
          <View style={{ gap: 3, flexShrink: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.foreground }}>
              {itemsAuditados.length}{' '}
              {itemsAuditados.length === 1 ? 'Producto registrado' : 'Productos registrados'}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Badge label={`${stats.matches} ok`} tone="success" emphasis="soft" size="sm" />
              {stats.mismatches > 0 && (
                <Badge label={`${stats.mismatches} diff`} tone="danger" emphasis="soft" size="sm" />
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleFinishAudit}
            activeOpacity={0.85}
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: 22,
              paddingVertical: 10,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCheck size={18} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>
              Finalizar
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* DIÁLOGO PERSONALIZADO DE ÉXITO AL FINALIZAR */}
      <AppDialog
        visible={isSuccessDialogOpen}
        onClose={handleRedirectToList}
        title="¡Auditoría Semáforo Guardada!"
        message={`Se ha registrado la auditoría a ciegas con ${itemsAuditados.length} productos en la Orden OT-4892.`}
        type="success"
        onConfirm={handleRedirectToList}
      />
    </View>
  );
}
