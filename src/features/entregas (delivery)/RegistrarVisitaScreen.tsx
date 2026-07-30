import { useState } from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { ArrowLeft, MapPin, ClipboardList, Info, CheckCircle2 } from 'lucide-react-native';

import { router } from 'expo-router';
import { Badge, Button, AppDialog } from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

export function RegistrarVisitaScreen() {
  const theme = useAppTheme();
  const [showToast, setShowToast] = useState(false);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.mainBackground }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {/* BOTÓN REGRESAR */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          alignSelf: 'flex-start',
        }}
      >
        <ArrowLeft size={20} color={theme.colors.foreground} />
        <Text variant="label" style={{ fontWeight: '600', color: theme.colors.foreground }}>
          Volver a Mis Entregas
        </Text>
      </TouchableOpacity>

      {/* TARJETA DE TÍTULO PRINCIPAL */}
      <View
        style={{
          backgroundColor: theme.colors.cardBackground,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 20,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPin size={24} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Badge label="En Desarrollo" tone="warning" emphasis="soft" size="sm" />
            <Text
              variant="header"
              style={{ fontSize: 20, fontWeight: '700', marginTop: 4, color: theme.colors.foreground }}
            >
              Aquí se registrará una visita
            </Text>
          </View>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: theme.colors.border,
            marginVertical: 4,
          }}
        />

        {/* PARÁGRAFO SOBRE EL TEMA */}
        <Text
          variant="body"
          style={{
            fontSize: 14,
            lineHeight: 22,
            color: theme.colors.mutedForeground,
          }}
        >
          En esta sección el conductor o repartidor podrá realizar el registro de una visita previa o gestión presencial en el destino del cliente antes de iniciar la hoja de ruta oficial.
        </Text>

        <Text
          variant="body"
          style={{
            fontSize: 14,
            lineHeight: 22,
            color: theme.colors.mutedForeground,
          }}
        >
          Esta herramienta incluirá captura de coordenadas GPS, registro de observaciones sobre el estado del punto de entrega, toma de evidencia fotográfica y reporte de motivos de contacto cuando la orden de transporte no pueda ser iniciada inmediatamente.
        </Text>

        <View
          style={{
            backgroundColor: theme.colors.secondary,
            borderRadius: 12,
            padding: 14,
            flexDirection: 'row',
            gap: 10,
            alignItems: 'flex-start',
            marginTop: 4,
          }}
        >
          <Info size={20} color={theme.colors.primary} style={{ marginTop: 2 }} />
          <Text
            variant="caption"
            style={{ flex: 1, fontSize: 13, color: theme.colors.foreground, lineHeight: 18 }}
          >
            Módulo en proceso de definición operativa y técnica para su posterior integración con el sistema central.
          </Text>
        </View>

        <View style={{ marginTop: 8 }}>
          <Button
            label="Simular Registro de Visita"
            icon={ClipboardList}
            variant="primary"
            fullWidth
            onPress={() => setShowToast(true)}
          />
        </View>
      </View>

      <AppDialog
        visible={showToast}
        title="Visita Registrada"
        message="Se ha registrado la visita previa de demostración correctamente."
        type="success"
        onClose={() => setShowToast(false)}
      />
    </ScrollView>
  );
}
