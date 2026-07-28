import { CheckCircle2, XCircle, Trash2, Package, Layers, X, Search } from 'lucide-react-native';
import { useState, useRef } from 'react';
import { Pressable, ScrollView, View, TextInput, TouchableOpacity, Text as RNText, Keyboard } from 'react-native';

import { Button } from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

import { useDespachos } from './store';

type TipoUnidad = 'UNIDAD' | 'CAJA';
const EMPTY: any[] = [];

// ==========================================
// MOCK DB: Simulación de lo que devolvería tu API (NestJS/PostgreSQL)
// ==========================================
const MOCK_DB = [
  { id: 1, codigo: '7790001', nombre: 'Ketchup Girasol 900ml', cajaSize: 12, expectedQty: 24 }, 
  { id: 2, codigo: '7790002', nombre: 'Mayonesa Clásica 500g', cajaSize: 24, expectedQty: 24 }, 
  { id: 3, codigo: '7790003', nombre: 'La granja 1L', cajaSize: 10, expectedQty: 50 },
  { id: 4, codigo: '7790004', nombre: 'Somo 1L', cajaSize: 10, expectedQty: 20 },
  { id: 5, codigo: '7790005', nombre: 'Salsa Golf 500g', cajaSize: 20, expectedQty: 40 },
  { id: 6, codigo: '7790006', nombre: 'Mostaza Dulce 500g', cajaSize: 20, expectedQty: 20 },
];

export default function ChequeoScreen() {
  const activeId = useDespachos((state) => state.activeId);
  const despacho = useDespachos((state) =>
    state.despachos.find((d) => d.id === state.activeId),
  );
  
  const items = useDespachos((state) =>
    state.activeId ? state.checksByDespacho[state.activeId] ?? EMPTY : EMPTY
  ) as any[]; 
  
  const addCheck = useDespachos((state) => state.addCheck);
  const removeCheck = useDespachos((state) => state.removeCheck);
  const guardar = useDespachos((state) => state.guardar);

  // Estados del formulario
  const [productoTexto, setProductoTexto] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [cantidad, setCantidad] = useState('');
  const [tipoUnidad, setTipoUnidad] = useState<TipoUnidad>('UNIDAD');
  const [saved, setSaved] = useState(false);

  // Estados para el Autocompletado
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // Ref para controlar el teclado
  const cantidadInputRef = useRef<TextInput>(null);

  if (!activeId || !despacho) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" padding="l">
        <Text variant="body" color="mutedForeground">
          Selecciona un despacho para iniciar el chequeo.
        </Text>
      </Box>
    );
  }

  // LÓGICA DE BÚSQUEDA Y AUTOCOMPLETADO
  const handleSearchChange = (text: string) => {
    setProductoTexto(text);
    setProductoSeleccionado(null); // Resetea la selección si edita el texto

    if (text.trim().length > 1) {
      const query = text.toLowerCase();
      // Filtramos y limitamos a 5 resultados exactos
      const filtrados = MOCK_DB.filter(
        p => p.codigo.includes(query) || p.nombre.toLowerCase().includes(query)
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
    Keyboard.dismiss(); // Oculta el teclado alfabético
    
    // Le da tiempo a la UI de ocultar el teclado anterior antes de levantar el numérico
    setTimeout(() => {
      cantidadInputRef.current?.focus();
    }, 150);
  };

  const limpiarBuscador = () => {
    setProductoTexto('');
    setProductoSeleccionado(null);
    setCantidad('');
    setMostrarSugerencias(false);
  };

  // LÓGICA DE VALIDACIÓN Y GUARDADO
  const canAdd = productoSeleccionado !== null && cantidad.trim().length > 0;

  const onAdd = () => {
    if (!canAdd) return;

    const cantidadNumerica = parseInt(cantidad, 10);
    const multiplicador = tipoUnidad === 'CAJA' ? productoSeleccionado.cajaSize : 1; 
    const totalContado = cantidadNumerica * multiplicador;

    const isMatch = totalContado === productoSeleccionado.expectedQty;

    const dataEmpaquetada = `${productoSeleccionado.nombre} | ${cantidad} ${tipoUnidad} = ${totalContado} Uds | ${isMatch}`;
    
    addCheck(activeId, productoSeleccionado.codigo, dataEmpaquetada);

    limpiarBuscador();
    setSaved(false);
  };

  const onGuardar = () => {
    guardar(activeId);
    setSaved(true);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled" // CRUCIAL para que el clic en la sugerencia funcione sin que el teclado lo bloquee
    >
      <View style={{ backgroundColor: '#f4f4f5', padding: 16, borderRadius: 12, marginBottom: 8 }}>
        <RNText style={{ fontSize: 13, color: '#71717a', textTransform: 'uppercase', fontWeight: 'bold' }}>
          Conteo a Ciegas en progreso
        </RNText>
        <RNText style={{ fontSize: 22, fontWeight: '800', color: '#18181b', marginTop: 4 }}>
          Codigo: {despacho.codigo}
        </RNText>
      </View>

      {/* FORMULARIO DE CONTEO */}
      <View style={{ backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e4e4e7', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, zIndex: 50 }}>
        
        <RNText style={{ fontSize: 14, fontWeight: '600', color: '#3f3f46', marginBottom: 8 }}>Producto</RNText>
        
        {/* CONTENEDOR RELATIVO PARA EL BUSCADOR Y EL DROPDOWN */}
        <View style={{ position: 'relative', zIndex: 100, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f5', borderRadius: 8, borderWidth: 1, borderColor: productoSeleccionado ? '#22c55e' : '#d4d4d8' }}>
            <Search color="#a1a1aa" size={20} style={{ marginLeft: 12 }} />
            <TextInput
              value={productoTexto}
              onChangeText={handleSearchChange}
              placeholder="Ej. 7790001 o Arroz..."
              style={{ flex: 1, padding: 12, fontSize: 16, color: '#18181b' }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {productoTexto.length > 0 && (
              <TouchableOpacity onPress={limpiarBuscador} style={{ padding: 12 }}>
                <X color="#71717a" size={20} />
              </TouchableOpacity>
            )}
          </View>

          {/* MENÚ FLOTANTE DE SUGERENCIAS */}
          {mostrarSugerencias && sugerencias.length > 0 && (
            <View style={{
              position: 'absolute',
              top: 54, // Justo debajo del input
              left: 0,
              right: 0,
              backgroundColor: '#ffffff',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#e4e4e7',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 10,
              zIndex: 999,
            }}>
              {sugerencias.map((prod, index) => (
                <TouchableOpacity
                  key={prod.id}
                  onPress={() => seleccionarProducto(prod)}
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderBottomWidth: index === sugerencias.length - 1 ? 0 : 1,
                    borderBottomColor: '#f4f4f5',
                  }}
                >
                  <RNText style={{ fontSize: 16, color: '#18181b' }}>
                    <RNText style={{ fontWeight: 'bold' }}>{prod.codigo}</RNText> - {prod.nombre}
                  </RNText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Cantidad y Unidad */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, zIndex: 10 }}>
          <View style={{ flex: 1 }}>
            <RNText style={{ fontSize: 14, fontWeight: '600', color: '#3f3f46', marginBottom: 8 }}>Cantidad</RNText>
            <TextInput
              ref={cantidadInputRef} // Conectamos el ref aquí
              value={cantidad}
              onChangeText={setCantidad}
              placeholder="0"
              keyboardType="numeric"
              style={{ backgroundColor: '#f4f4f5', padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#d4d4d8', textAlign: 'center' }}
            />
          </View>
          
          <View style={{ flex: 2 }}>
            <RNText style={{ fontSize: 14, fontWeight: '600', color: '#3f3f46', marginBottom: 8 }}>Tipo de Empaque</RNText>
            <View style={{ flexDirection: 'row', backgroundColor: '#f4f4f5', borderRadius: 8, padding: 4 }}>
              <TouchableOpacity
                onPress={() => setTipoUnidad('UNIDAD')}
                style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: tipoUnidad === 'UNIDAD' ? '#ffffff' : 'transparent', borderRadius: 6, shadowColor: tipoUnidad === 'UNIDAD' ? '#000' : 'transparent', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: tipoUnidad === 'UNIDAD' ? 2 : 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              >
                <Package size={16} color={tipoUnidad === 'UNIDAD' ? '#2563eb' : '#71717a'} />
                <RNText style={{ fontWeight: '600', color: tipoUnidad === 'UNIDAD' ? '#2563eb' : '#71717a' }}>Unidad</RNText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTipoUnidad('CAJA')}
                style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: tipoUnidad === 'CAJA' ? '#ffffff' : 'transparent', borderRadius: 6, shadowColor: tipoUnidad === 'CAJA' ? '#000' : 'transparent', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: tipoUnidad === 'CAJA' ? 2 : 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              >
                <Layers size={16} color={tipoUnidad === 'CAJA' ? '#2563eb' : '#71717a'} />
                <RNText style={{ fontWeight: '600', color: tipoUnidad === 'CAJA' ? '#2563eb' : '#71717a' }}>Caja</RNText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Button label="Registrar Conteo" variant="primary" size="md" disabled={!canAdd} onPress={onAdd} />
      </View>

      {/* LISTA DE RESULTADOS (VERDE / ROJO) */}
      <View style={{ gap: 12, zIndex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text variant="subtitle">Registro de Conteo</Text>
          <RNText style={{ backgroundColor: '#e4e4e7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: 'bold' }}>
            {items.length} ítems
          </RNText>
        </View>

        {items.length === 0 ? (
          <RNText style={{ color: '#71717a', textAlign: 'center', marginVertical: 20 }}>
            Escanea un producto para comenzar.
          </RNText>
        ) : (
          items.map((item) => {
            const partes = item.nombre.split(' | ');
            const nombreReal = partes[0];
            const detalleCantidad = partes[1];
            const esMatch = partes[2] === 'true'; 
            
            const borderColor = esMatch ? '#22c55e' : '#ef4444'; 
            const bgColor = esMatch ? '#f0fdf4' : '#fef2f2';     
            const iconColor = esMatch ? '#16a34a' : '#dc2626';

            return (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: bgColor,
                  borderWidth: 2,
                  borderColor: borderColor,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <View style={{ marginRight: 12 }}>
                  {esMatch ? (
                    <CheckCircle2 size={28} color={iconColor} />
                  ) : (
                    <XCircle size={28} color={iconColor} />
                  )}
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <RNText style={{ fontSize: 16, fontWeight: 'bold', color: '#18181b' }}>
                    {item.codigo} - {nombreReal}
                  </RNText>
                  <RNText style={{ fontSize: 13, color: '#52525b', fontWeight: '500' }}>
                    Ingresado: {detalleCantidad}
                  </RNText>
                  {!esMatch && (
                    <RNText style={{ fontSize: 12, color: '#dc2626', fontWeight: 'bold', marginTop: 2 }}>
                      Diferencia detectada en el inventario.
                    </RNText>
                  )}
                </View>

                <Pressable onPress={() => removeCheck(activeId, item.id)} hitSlop={12} style={{ padding: 8 }}>
                  <Trash2 size={20} color="#a1a1aa" />
                </Pressable>
              </View>
            );
          })
        )}
      </View>

      <View style={{ marginTop: 20, zIndex: 1 }}>
        {saved ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#dcfce7', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <CheckCircle2 size={20} color="#16a34a" />
            <RNText style={{ color: '#16a34a', fontWeight: '700' }}>
              Reporte de carga sincronizado
            </RNText>
          </View>
        ) : null}

        <Button
          label="Finalizar y Sincronizar"
          fullWidth
          disabled={items.length === 0}
          onPress={onGuardar}
        />
      </View>
    </ScrollView>
  );
}