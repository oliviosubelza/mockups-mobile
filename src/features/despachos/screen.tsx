import { useState, useMemo } from 'react';
import { ScrollView, TextInput, View, TouchableOpacity,Text as RNText } from 'react-native';
import { Search, XCircle, PackageOpen, MapPin, Clock, ChevronRight, Weight,ListOrdered } from 'lucide-react-native'; // O la librería de íconos que uses

import { findRouteById, navigateTo } from '@/navigation/registry';
import { Button, Card, Chip } from '@/shared/ui';
import { Box, Text } from '@/theme';
import { useDespachos } from './store';
import { ESTADO_META, type Despacho } from './types';

export default function DespachosScreen() {
  const despachos = useDespachos((state) => state.despachos);
  const setActive = useDespachos((state) => state.setActive);
  const [searchQuery, setSearchQuery] = useState('');

  const despachosFiltrados = useMemo(() => {
    if (!searchQuery.trim()) return despachos;
    const query = searchQuery.toLowerCase();
    return despachos.filter((d) => 
      d.codigo.toLowerCase().includes(query) || d.cliente.toLowerCase().includes(query)
    );
  }, [despachos, searchQuery]);

  const openChequeo = (despacho: Despacho) => {
    setActive(despacho.id);
    const route = findRouteById('despachos.chequeo');
    if (route) navigateTo(route);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f4f4f5',
        borderRadius: 12, 
        paddingHorizontal: 12,
        height: 48,
      }}>
        <Search color="#71717a" size={20} />
        <TextInput
          placeholder="Buscar ID SAP o Cliente..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ flex: 1, fontSize: 16, marginLeft: 8, color: '#27272a' }}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <XCircle color="#a1a1aa" size={20} />
          </TouchableOpacity>
        )}
      </View>

      <Box paddingHorizontal="xs">
        <Text variant="caption">
          {searchQuery ? `Mostrando ${despachosFiltrados.length} resultados` : `${despachos.length} despachos pendientes`}
        </Text>
      </Box>

      {/* LISTA FORMATO LIST TILE */}
      {despachosFiltrados.length === 0 ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 }}>
          <PackageOpen color="#d4d4d8" size={64} />
          <RNText style={{ color: '#71717a', textAlign: 'center', fontSize: 16 }}>
            No encontramos la orden "{searchQuery}"
          </RNText>
        </View>
      ) : (
        despachosFiltrados.map((despacho, index) => {
          const meta = ESTADO_META[despacho.estado];
          
          // Datos simulados (mock) que luego vendrán de tu DB en NestJS
          const mockSequence = index + 1; 
          const mockTimeWindow = "7hr"; 
          const mockWeight = "120 kg"; 
          const mockParadas = "12 paradas"; // Nuevo dato simulado

          return (
            <TouchableOpacity 
              key={despacho.id} 
              activeOpacity={0.7}
              onPress={() => openChequeo(despacho)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                padding: 8,
                borderRadius: 12,
                marginBottom: 6,
                borderWidth: 1,
                borderColor: '#e4e4e7',
                // Sombra sutil para dar profundidad
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              {/* LEADING: Indicador de Secuencia */}
              <View style={{
                backgroundColor: '#f4f4f5',
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <RNText style={{ fontWeight: 'bold', color: '#3f3f46', fontSize: 16 }}>
                  {mockSequence}
                </RNText>
              </View>

              {/* BODY: Información principal y secundaria */}
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <RNText style={{ fontSize: 18, fontWeight: '700', color: '#18181b', letterSpacing: 0.5 }}>
                    {despacho.codigo}
                  </RNText>
                  {/* El Chip mantiene tu componente original */}
                  <Chip label={meta.label} tone={meta.tone} />
                </View>

                {/* Fila de íconos con datos de BD */}
                <View style={{ gap: 2, marginTop: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MapPin color="#71717a" size={14} style={{ marginRight: 4 }} />
                    <RNText style={{ color: '#52525b', fontSize: 14 }} numberOfLines={1}>
                      {despacho.cliente} - {despacho.id}
                    </RNText>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2,gap:2 }}>
                    {/* Paradas */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ListOrdered color="#71717a" size={14} style={{ marginRight: 4 }} />
                      <RNText style={{ color: '#71717a', fontSize: 13 }}>
                        {mockParadas}
                      </RNText>
                    </View>

                    {/* Ventana Horaria */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Clock color="#71717a" size={14} style={{ marginRight: 4 }} />
                      <RNText style={{ color: '#71717a', fontSize: 13 }}>
                        {mockTimeWindow}
                      </RNText>
                    </View>
                    
                    {/* Peso */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Weight color="#71717a" size={14} style={{ marginRight: 4 }} />
                      <RNText style={{ color: '#71717a', fontSize: 13 }}>
                        {mockWeight}
                      </RNText>
                    </View>
                  </View>
                </View>
              </View>

              {/* TRAILING: Flecha de acción (Indica que es cliqueable) */}
              <View style={{ marginLeft: 8 }}>
                <ChevronRight color="#d4d4d8" size={24} />
              </View>
              
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}