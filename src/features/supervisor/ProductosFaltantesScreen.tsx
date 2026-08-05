import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PackageSearch,
  ChevronRight,
  ChevronLeft,
  Truck,
  MapPin,
  FileText,
  X,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  Clock,
  RotateCcw,
} from 'lucide-react-native';

import { navigateTo, findRouteById } from '@/navigation/registry';
import { Badge, SearchField } from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

export interface FlatMissingProductItem {
  id: string;
  orderId: string;
  orderCode: string;
  driverName: string;
  zonaRuta: string;
  date: string; // ISO YYYY-MM-DD
  dateFormatted: string;
  codigo: string;
  nombre: string;
  categoria: string;
  isColdChain: boolean;
  expectedQty: number;
  expectedBoxes: number;
  countedQty: number;
  countedBoxes: number;
  countedUnits: number;
  difference: number; // e.g. -3 or +2
  differenceType: string;
}

// CADA OCURRENCIA DE UN PRODUCTO EN UNA OT ES UN ÍTEM INDEPENDIENTE
const FLAT_MOCK_DISCREPANCIES: FlatMissingProductItem[] = [
  {
    id: 'disc-1',
    orderId: 'sup-1',
    orderCode: 'OT-4892',
    driverName: 'Cristhian Macchiavelli',
    zonaRuta: 'Ruta Norte • Santa Cruz',
    date: '2026-08-05',
    dateFormatted: 'Hoy, 14:20',
    codigo: 'PROD-005',
    nombre: 'Salsa de Tomate Ketchup 5kg',
    categoria: 'Salsas y Aderezos',
    isColdChain: false,
    expectedQty: 96,
    expectedBoxes: 8,
    countedQty: 93,
    countedBoxes: 7,
    countedUnits: 9,
    difference: -3,
    differenceType: 'Diferencia por faltante',
  },
  {
    id: 'disc-2',
    orderId: 'sup-3',
    orderCode: 'OT-5109',
    driverName: 'Roberto Gómez',
    zonaRuta: 'Ruta Plan 3000 • Sector Comercial',
    date: '2026-08-04',
    dateFormatted: 'Ayer, 11:15',
    codigo: 'PROD-005',
    nombre: 'Salsa de Tomate Ketchup 5kg',
    categoria: 'Salsas y Aderezos',
    isColdChain: false,
    expectedQty: 48,
    expectedBoxes: 4,
    countedQty: 46,
    countedBoxes: 3,
    countedUnits: 10,
    difference: -2,
    differenceType: 'Diferencia por producto dañado / merma',
  },
  {
    id: 'disc-3',
    orderId: 'sup-1',
    orderCode: 'OT-4892',
    driverName: 'Cristhian Macchiavelli',
    zonaRuta: 'Ruta Norte • Santa Cruz',
    date: '2026-08-05',
    dateFormatted: 'Hoy, 14:20',
    codigo: 'PROD-002',
    nombre: 'Salsa Mayonesa Industrial 10kg',
    categoria: 'Salsas y Aderezos',
    isColdChain: true,
    expectedQty: 144,
    expectedBoxes: 12,
    countedQty: 146,
    countedBoxes: 12,
    countedUnits: 2,
    difference: 2,
    differenceType: 'Diferencia por cantidad (Sobrante)',
  },
  {
    id: 'disc-4',
    orderId: 'sup-2',
    orderCode: 'OT-5011',
    driverName: 'Cristhian Macchiavelli',
    zonaRuta: 'Ruta Equipetrol',
    date: '2026-08-01',
    dateFormatted: '01 Ago 12:45',
    codigo: 'PROD-014',
    nombre: 'Harina de Trigo Especial Panificación 25kg',
    categoria: 'Insumos de Panificación',
    isColdChain: false,
    expectedQty: 120,
    expectedBoxes: 10,
    countedQty: 116,
    countedBoxes: 9,
    countedUnits: 8,
    difference: -4,
    differenceType: 'Diferencia por faltante',
  },
  {
    id: 'disc-5',
    orderId: 'sup-3',
    orderCode: 'OT-5109',
    driverName: 'Roberto Gómez',
    zonaRuta: 'Ruta Plan 3000 • Sector Comercial',
    date: '2026-08-04',
    dateFormatted: 'Ayer, 11:15',
    codigo: 'PROD-021',
    nombre: 'Levadura Fresca en Barra 500g',
    categoria: 'Insumos de Panificación',
    isColdChain: true,
    expectedQty: 60,
    expectedBoxes: 5,
    countedQty: 57,
    countedBoxes: 4,
    countedUnits: 9,
    difference: -3,
    differenceType: 'Diferencia por error de empaque',
  },
  {
    id: 'disc-6',
    orderId: 'sup-4',
    orderCode: 'OT-4750',
    driverName: 'Cristhian Macchiavelli',
    zonaRuta: 'Ruta Equipetrol',
    date: '2026-07-28',
    dateFormatted: '28 Jul 09:30',
    codigo: 'PROD-033',
    nombre: 'Salsa Barbacoa BBQ Ahumada 4L',
    categoria: 'Salsas y Aderezos',
    isColdChain: false,
    expectedQty: 50,
    expectedBoxes: 5,
    countedQty: 49,
    countedBoxes: 4,
    countedUnits: 9,
    difference: -1,
    differenceType: 'Diferencia por faltante',
  },
];

const DATES_WITH_REPORTS = ['2026-08-05', '2026-08-04', '2026-08-01', '2026-07-28'];

export type DateFilterMode = 'ALL' | 'RANGE';

export default function ProductosFaltantesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'shortage' | 'surplus' | 'cold'>('all');

  // ESTADO DE FILTRADO POR FECHA (VÍA CALENDARIO)
  const [dateMode, setDateMode] = useState<DateFilterMode>('ALL');
  const [selectedStartDate, setSelectedStartDate] = useState<string>('2026-08-05');
  const [selectedEndDate, setSelectedEndDate] = useState<string>('2026-08-05');
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);

  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(7); // Agosto (0-indexed)

  const isDateInActiveFilter = (dateStr: string): boolean => {
    if (dateMode === 'ALL') return true;
    if (dateMode === 'RANGE') {
      const minDate = selectedStartDate < selectedEndDate ? selectedStartDate : selectedEndDate;
      const maxDate = selectedStartDate < selectedEndDate ? selectedEndDate : selectedStartDate;
      return dateStr >= minDate && dateStr <= maxDate;
    }
    return true;
  };

  const getDateFilterTitle = (): string => {
    if (dateMode === 'ALL') return 'Todas las Fechas';
    if (selectedStartDate === selectedEndDate) {
      const parts = selectedStartDate.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const startP = selectedStartDate.split('-');
    const endP = selectedEndDate.split('-');
    return `${startP[2]}/${startP[1]} - ${endP[2]}/${endP[1]}`;
  };

  const handleCalendarDayPress = (formattedDateStr: string) => {
    if (dateMode !== 'RANGE' || (selectedStartDate && selectedEndDate && selectedStartDate !== selectedEndDate)) {
      setDateMode('RANGE');
      setSelectedStartDate(formattedDateStr);
      setSelectedEndDate(formattedDateStr);
    } else {
      if (formattedDateStr < selectedStartDate) {
        setSelectedEndDate(selectedStartDate);
        setSelectedStartDate(formattedDateStr);
      } else {
        setSelectedEndDate(formattedDateStr);
      }
    }
  };

  // FILTRADO PLANO DE ÍTEMS DE DISCREPANCIA (CADA OCURRENCIA POR SEPARADO)
  const filteredDiscrepancies = FLAT_MOCK_DISCREPANCIES.filter((item) => {
    // Filtro por fecha
    if (!isDateInActiveFilter(item.date)) return false;

    // Filtro por búsqueda
    const matchesSearch =
      item.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.zonaRuta.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Filtro por tipo
    if (activeTypeFilter === 'shortage') return item.difference < 0;
    if (activeTypeFilter === 'surplus') return item.difference > 0;
    if (activeTypeFilter === 'cold') return item.isColdChain;

    return true;
  });

  const totalShortageCount = FLAT_MOCK_DISCREPANCIES.filter((p) => p.difference < 0).length;
  const totalSurplusCount = FLAT_MOCK_DISCREPANCIES.filter((p) => p.difference > 0).length;
  const totalColdCount = FLAT_MOCK_DISCREPANCIES.filter((p) => p.isColdChain).length;

  const handleNavigateToConsolidation = (orderCode: string) => {
    const route = findRouteById('supervisor.consolidacion');
    if (route) {
      navigateTo(route);
    }
  };

  // GRID INTERACTIVA DE CALENDARIO VISUAL
  const renderCalendarGrid = () => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ dayNumber: null, key: `empty-prev-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = (currentMonth + 1).toString().padStart(2, '0');
      const dayStr = day.toString().padStart(2, '0');
      const fullDateStr = `${currentYear}-${monthStr}-${dayStr}`;

      cells.push({
        dayNumber: day,
        dateStr: fullDateStr,
        key: fullDateStr,
        hasReport: DATES_WITH_REPORTS.includes(fullDateStr),
      });
    }

    const minSel = selectedStartDate < selectedEndDate ? selectedStartDate : selectedEndDate;
    const maxSel = selectedStartDate < selectedEndDate ? selectedEndDate : selectedStartDate;

    return (
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
            style={{ padding: 6, borderRadius: 8, backgroundColor: theme.colors.secondary }}
          >
            <ChevronLeft size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <Text variant="label" style={{ fontSize: 16, fontWeight: '800', color: theme.colors.foreground }}>
            {monthNames[currentMonth]} {currentYear}
          </Text>

          <TouchableOpacity
            onPress={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
            style={{ padding: 6, borderRadius: 8, backgroundColor: theme.colors.secondary }}
          >
            <ChevronRight size={20} color={theme.colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((dayName, idx) => (
            <View key={idx} style={{ width: 38, alignItems: 'center' }}>
              <Text
                variant="caption"
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: idx === 0 || idx === 6 ? theme.colors.primary : theme.colors.mutedForeground,
                }}
              >
                {dayName}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((cell) => {
            if (!cell.dayNumber) {
              return <View key={cell.key} style={{ width: `${100 / 7}%`, height: 42 }} />;
            }

            const isSelected = dateMode === 'RANGE' && cell.dateStr >= minSel && cell.dateStr <= maxSel;
            const isToday = cell.dateStr === '2026-08-05';

            return (
              <TouchableOpacity
                key={cell.key}
                onPress={() => handleCalendarDayPress(cell.dateStr!)}
                activeOpacity={0.7}
                style={{
                  width: `${100 / 7}%`,
                  height: 42,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: 2,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : isToday
                      ? theme.colors.primarySoft
                      : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isToday && !isSelected ? 1.5 : 0,
                    borderColor: theme.colors.primary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected || isToday ? '800' : '500',
                      color: isSelected
                        ? '#ffffff'
                        : isToday
                        ? theme.colors.primary
                        : theme.colors.foreground,
                    }}
                  >
                    {cell.dayNumber}
                  </Text>

                  {cell.hasReport && (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 3,
                        width: 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: isSelected ? '#ffffff' : theme.colors.danger,
                      }}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 40,
          gap: 12,
        }}
      >
        {/* BANNER INFORMATIVO */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 12,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: theme.colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PackageSearch size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                variant="label"
                style={{ fontSize: 13, fontWeight: '800', color: theme.colors.foreground }}
              >
                Productos con Diferencia
              </Text>
              <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                Listado individual de ítems y las órdenes de transporte (OT) a las que pertenecen.
              </Text>
            </View>
          </View>
        </View>

        {/* CAMPO DE BÚSQUEDA */}
        <SearchField
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por SKU, producto u orden (OT)..."
        />

        {/* BARRA DE FILTROS SOLICITADA POR KEY USERS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          style={{ flexGrow: 0 }}
        >
          {/* 1. TODOS */}
          <TouchableOpacity
            onPress={() => {
              setActiveTypeFilter('all');
              setDateMode('ALL');
            }}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor:
                activeTypeFilter === 'all' && dateMode === 'ALL'
                  ? theme.colors.primary
                  : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor:
                activeTypeFilter === 'all' && dateMode === 'ALL'
                  ? theme.colors.primary
                  : theme.colors.border,
            }}
          >
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: '700',
                color:
                  activeTypeFilter === 'all' && dateMode === 'ALL'
                    ? '#ffffff'
                    : theme.colors.foreground,
              }}
            >
              Todos ({filteredDiscrepancies.length})
            </Text>
          </TouchableOpacity>

          {/* 2. CALENDARIO */}
          <TouchableOpacity
            onPress={() => setIsCalendarModalVisible(true)}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: dateMode !== 'ALL' ? theme.colors.primary : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor: dateMode !== 'ALL' ? theme.colors.primary : theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <CalendarIcon
              size={14}
              color={dateMode !== 'ALL' ? '#ffffff' : theme.colors.primary}
            />
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: dateMode !== 'ALL' ? '#ffffff' : theme.colors.foreground,
              }}
            >
              {dateMode !== 'ALL' ? `📅 ${getDateFilterTitle()}` : 'Calendario'}
            </Text>
          </TouchableOpacity>

          {/* 3. FALTANTES */}
          <TouchableOpacity
            onPress={() => setActiveTypeFilter('shortage')}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: activeTypeFilter === 'shortage' ? theme.colors.danger : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor: activeTypeFilter === 'shortage' ? theme.colors.danger : theme.colors.border,
            }}
          >
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeTypeFilter === 'shortage' ? '#ffffff' : theme.colors.foreground,
              }}
            >
              Faltantes ({totalShortageCount})
            </Text>
          </TouchableOpacity>

          {/* 4. SOBRANTES */}
          <TouchableOpacity
            onPress={() => setActiveTypeFilter('surplus')}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: activeTypeFilter === 'surplus' ? theme.colors.warning : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor: activeTypeFilter === 'surplus' ? theme.colors.warning : theme.colors.border,
            }}
          >
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeTypeFilter === 'surplus' ? '#ffffff' : theme.colors.foreground,
              }}
            >
              Sobrantes ({totalSurplusCount})
            </Text>
          </TouchableOpacity>

          {/* 5. CADENA DE FRÍO */}
          <TouchableOpacity
            onPress={() => setActiveTypeFilter('cold')}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: activeTypeFilter === 'cold' ? theme.colors.primary : theme.colors.cardBackground,
              borderWidth: 1,
              borderColor: activeTypeFilter === 'cold' ? theme.colors.primary : theme.colors.border,
            }}
          >
            <Text
              variant="caption"
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: activeTypeFilter === 'cold' ? '#ffffff' : theme.colors.foreground,
              }}
            >
              ❄️ Cadena de Frío ({totalColdCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ETIQUETA INFORMATIVA SI EL FILTRO DE FECHA ESTÁ ACTIVO */}
        {dateMode !== 'ALL' && (
          <View
            style={{
              backgroundColor: theme.colors.primarySoft,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CalendarIcon size={13} color={theme.colors.primary} />
              <Text variant="caption" style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                Filtrado por fecha: {getDateFilterTitle()}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setDateMode('ALL')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <RotateCcw size={12} color={theme.colors.primary} />
              <Text variant="caption" style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                Limpiar
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LISTADO PLANO Y COMPACTO DE ÍTEMS CON DIFERENCIA */}
        {filteredDiscrepancies.length === 0 ? (
          <View
            style={{
              backgroundColor: theme.colors.cardBackground,
              borderRadius: 14,
              padding: 20,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: theme.colors.border,
              marginVertical: 16,
            }}
          >
            <CalendarIcon size={36} color={theme.colors.mutedForeground} />
            <Text variant="label" style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}>
              Sin coincidencias encontradas
            </Text>
            <Text variant="caption" style={{ textAlign: 'center', color: theme.colors.mutedForeground, fontSize: 12 }}>
              No se encontraron registros de faltantes para el filtro seleccionado.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setDateMode('ALL');
                setActiveTypeFilter('all');
                setSearchQuery('');
              }}
              style={{
                marginTop: 4,
                backgroundColor: theme.colors.primarySoft,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>
                Restablecer Filtros
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filteredDiscrepancies.map((item) => {
              const isShortage = item.difference < 0;

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleNavigateToConsolidation(item.orderCode)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: theme.colors.cardBackground,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderLeftWidth: 4,
                    borderLeftColor: isShortage ? theme.colors.danger : theme.colors.warning,
                    padding: 12,
                    gap: 8,
                  }}
                >
                  {/* FILA 1: CÓDIGO DE OT + FECHA + BADGE DE DIFERENCIA */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                      <FileText size={14} color={theme.colors.primary} />
                      <Text variant="label" style={{ fontSize: 13, fontWeight: '800', color: theme.colors.foreground }}>
                        {item.orderCode}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Clock size={11} color={theme.colors.mutedForeground} />
                        <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                          {item.dateFormatted}
                        </Text>
                      </View>
                    </View>

                    <Badge
                      label={item.difference > 0 ? `+${item.difference} u. Sobrante` : `${item.difference} u. Faltante`}
                      tone={item.difference > 0 ? 'warning' : 'danger'}
                      emphasis="soft"
                      size="sm"
                    />
                  </View>

                  {/* FILA 2: DATOS DEL PRODUCTO (SKU + NOMBRE + CADENA DE FRÍO) */}
                  <View style={{ gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        variant="caption"
                        style={{ fontSize: 11, fontWeight: '800', color: theme.colors.mutedForeground }}
                      >
                        {item.codigo}
                      </Text>
                      {item.isColdChain && <Badge label="❄️ Frío" tone="neutral" emphasis="soft" size="sm" />}
                    </View>

                    <Text
                      variant="subtitle"
                      numberOfLines={1}
                      style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}
                    >
                      {item.nombre}
                    </Text>
                  </View>

                  {/* FILA 3: DATOS DE LOGÍSTICA (CHOFER Y RUTA/ZONA EN FILAS SEPARADAS) */}
                  <View
                    style={{
                      backgroundColor: theme.colors.secondary,
                      borderRadius: 8,
                      padding: 8,
                      gap: 4,
                    }}
                  >
                    {/* LÍNEA 1 DE LOGÍSTICA: CHOFER + COMPARATIVO DE CANTIDADES */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 }}>
                        <Truck size={12} color={theme.colors.mutedForeground} />
                        <Text
                          variant="caption"
                          numberOfLines={1}
                          style={{ fontSize: 11, fontWeight: '700', color: theme.colors.foreground, flexShrink: 1 }}
                        >
                          Chofer: {item.driverName}
                        </Text>
                      </View>

                      <Text variant="caption" style={{ fontSize: 11, fontWeight: '700', color: theme.colors.foreground }}>
                        Esp: {item.expectedQty} u. | Cont: {item.countedQty} u.
                      </Text>
                    </View>

                    {/* LÍNEA 2 DE LOGÍSTICA: RUTA/ZONA DE ENTREGA */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <MapPin size={12} color={theme.colors.mutedForeground} />
                      <Text
                        variant="caption"
                        numberOfLines={1}
                        style={{ fontSize: 11, color: theme.colors.mutedForeground, flex: 1 }}
                      >
                        Ruta: {item.zonaRuta}
                      </Text>
                    </View>
                  </View>

                  {/* FILA 4: TIPO DE DIFERENCIA + BOTÓN DIRECTO */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 6,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                      marginTop: 2,
                    }}
                  >
                    <Text
                      variant="caption"
                      numberOfLines={1}
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: isShortage ? theme.colors.danger : theme.colors.warning,
                        flex: 1,
                      }}
                    >
                      Tipo: {item.differenceType}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary }}>
                        Ir a Consolidar
                      </Text>
                      <ArrowRight size={13} color={theme.colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* MODAL INTERACTIVO DE CALENDARIO VISUAL */}
      <Modal
        visible={isCalendarModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setIsCalendarModalVisible(false)}
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
              width: '100%',
              backgroundColor: theme.colors.cardBackground,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: Math.max(20, insets.bottom + 12),
              gap: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: theme.colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CalendarIcon size={20} color={theme.colors.primary} />
                </View>
                <View>
                  <Text variant="label" style={{ fontSize: 16, fontWeight: '800', color: theme.colors.foreground }}>
                    Calendario de Faltantes
                  </Text>
                  <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
                    Toca un día o rango de días en el calendario
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setIsCalendarModalVisible(false)} style={{ padding: 4 }}>
                <X size={22} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {renderCalendarGrid()}

            <TouchableOpacity
              onPress={() => setIsCalendarModalVisible(false)}
              activeOpacity={0.8}
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                marginTop: 4,
              }}
            >
              <Check size={18} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>
                Aplicar Rango ({getDateFilterTitle()})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Box>
  );
}
