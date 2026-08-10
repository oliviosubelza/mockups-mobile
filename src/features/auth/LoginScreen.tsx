import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Truck, ShieldCheck, Lock, User as UserIcon, LogIn, ArrowRight } from 'lucide-react-native';

import { useUser, UserRole } from '@/shared/stores/user';
import { Button, Input, Badge } from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const loginAs = useUser((state) => state.loginAs);
  const loginWithCredentials = useUser((state) => state.loginWithCredentials);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleQuickLogin = (role: UserRole) => {
    loginAs(role);
  };

  const handleSubmit = () => {
    if (!email.trim()) {
      setErrorMsg('Ingresa tu usuario o correo electrónico.');
      return;
    }
    setErrorMsg('');
    loginWithCredentials(email, password);
  };

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 30,
          paddingBottom: insets.bottom + 20,
          gap: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER CON LOGO E IDENTIFICACIÓN DE APP */}
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: theme.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 8,
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
            }}
          >
            <Truck size={36} color="#ffffff" />
          </View>

          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text
              variant="header"
              style={{
                fontSize: 22,
                fontWeight: '800',
                color: theme.colors.foreground,
                textAlign: 'center',
              }}
            >
              Control de Distribución
            </Text>
            <Text
              variant="caption"
              style={{
                fontSize: 13,
                color: theme.colors.mutedForeground,
                textAlign: 'center',
              }}
            >
              Plataforma móvil de logística y revisión
            </Text>
          </View>
        </View>

        {/* ACCESO RÁPIDO SEGÚN ROL (DEMO CHIPS) */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 16,
            gap: 12,
          }}
        >
          <Text
            variant="label"
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: theme.colors.mutedForeground,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Acceso Rápido (Selecciona un Rol)
          </Text>

          <View style={{ gap: 10 }}>
            {/* BOTÓN RÁPIDO CHOFER */}
            <TouchableOpacity
              onPress={() => handleQuickLogin('CHOFER')}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: theme.colors.primarySoft,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: theme.colors.primary,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: theme.colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Truck size={20} color="#ffffff" />
                </View>
                <View>
                  <Text
                    variant="label"
                    style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}
                  >
                    Cristhian Macchiavelli
                  </Text>
                  <Text variant="caption" style={{ fontSize: 11, color: theme.colors.primary }}>
                    Rol: Chofer / Despachador
                  </Text>
                </View>
              </View>
              <ArrowRight size={18} color={theme.colors.primary} />
            </TouchableOpacity>

            {/* BOTÓN RÁPIDO SUPERVISOR */}
            <TouchableOpacity
              onPress={() => handleQuickLogin('SUPERVISOR')}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: theme.colors.secondary,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: theme.colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#8b5cf6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={20} color="#ffffff" />
                </View>
                <View>
                  <Text
                    variant="label"
                    style={{ fontSize: 14, fontWeight: '700', color: theme.colors.foreground }}
                  >
                    Carlos Mendoza
                  </Text>
                  <Text variant="caption" style={{ fontSize: 11, color: '#8b5cf6' }}>
                    Rol: Supervisor de Distribución
                  </Text>
                </View>
              </View>
              <ArrowRight size={18} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* FORMULARIO TRADICIONAL DE LOGIN */}
        <View
          style={{
            backgroundColor: theme.colors.cardBackground,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 16,
            gap: 14,
          }}
        >
          <Text
            variant="label"
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: theme.colors.mutedForeground,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            O ingresa credenciales manualmente
          </Text>

          {errorMsg ? (
            <View
              style={{
                backgroundColor: theme.colors.dangerSoft,
                padding: 10,
                borderRadius: 8,
              }}
            >
              <Text variant="caption" style={{ color: theme.colors.danger, fontSize: 12 }}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          <Input
            label="Usuario o Correo"
            placeholder="Ej: supervisor@empresa.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <Input
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            label="Iniciar Sesión"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
          />
        </View>

        {/* NOTA CON CREDENCIALES DE PRUEBA */}
        <View
          style={{
            backgroundColor: theme.colors.secondary,
            borderRadius: 12,
            padding: 12,
            gap: 6,
          }}
        >
          <Text variant="caption" style={{ fontSize: 11, fontWeight: '700', color: theme.colors.foreground }}>
            Credenciales de Demostración:
          </Text>
          <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
            • Chofer: chofer@empresa.com | Clave: 123
          </Text>
          <Text variant="caption" style={{ fontSize: 11, color: theme.colors.mutedForeground }}>
            • Supervisor: supervisor@empresa.com | Clave: 123
          </Text>
        </View>
      </ScrollView>
    </Box>
  );
}
