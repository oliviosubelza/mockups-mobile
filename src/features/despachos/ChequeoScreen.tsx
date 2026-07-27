import { CheckCircle2, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';

import { Button, Card, Chip, Input } from '@/shared/ui';
import { Box, Text, useAppTheme } from '@/theme';

import { useDespachos } from './store';
import type { ProductCheck } from './types';

const EMPTY: ProductCheck[] = [];

export default function ChequeoScreen() {
  const activeId = useDespachos((state) => state.activeId);
  const despacho = useDespachos((state) =>
    state.despachos.find((d) => d.id === state.activeId),
  );
  const items = useDespachos((state) =>
    state.activeId ? state.checksByDespacho[state.activeId] ?? EMPTY : EMPTY,
  );
  const addCheck = useDespachos((state) => state.addCheck);
  const removeCheck = useDespachos((state) => state.removeCheck);
  const guardar = useDespachos((state) => state.guardar);
  const theme = useAppTheme();

  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [saved, setSaved] = useState(false);

  if (!activeId || !despacho) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" padding="l">
        <Text variant="body" color="mutedForeground">
          Selecciona un despacho para iniciar el chequeo.
        </Text>
      </Box>
    );
  }

  const canAdd = codigo.trim().length > 0 && nombre.trim().length > 0;

  const onAdd = () => {
    if (!canAdd) return;
    addCheck(activeId, codigo.trim(), nombre.trim());
    setCodigo('');
    setNombre('');
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
      keyboardShouldPersistTaps="handled"
    >
      <Box gap="xs">
        <Text variant="caption">Despacho</Text>
        <Text variant="title">{despacho.codigo}</Text>
      </Box>

      <Card gap="m">
        <Text variant="subtitle">Agregar producto</Text>
        <Input
          label="Código de producto"
          value={codigo}
          onChangeText={setCodigo}
          placeholder="Ej. 7790001"
          autoCapitalize="characters"
        />
        <Input
          label="Nombre de producto"
          value={nombre}
          onChangeText={setNombre}
          placeholder="Ej. Aceite 900ml"
        />
        <Button
          label="Agregar"
          variant="secondary"
          size="sm"
          disabled={!canAdd}
          onPress={onAdd}
        />
      </Card>

      <Box gap="s">
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Text variant="subtitle">Productos chequeados</Text>
          <Chip label={String(items.length)} tone="neutral" />
        </Box>

        {items.length === 0 ? (
          <Text variant="caption">Aún no agregaste productos.</Text>
        ) : (
          items.map((item) => (
            <Card
              key={item.id}
              variant="flat"
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              paddingVertical="m"
            >
              <Box gap="xs" flex={1}>
                <Text variant="label">{item.nombre}</Text>
                <Text variant="caption">{item.codigo}</Text>
              </Box>
              <Pressable onPress={() => removeCheck(activeId, item.id)} hitSlop={8}>
                <Trash2 size={18} color={theme.colors.mutedForeground} />
              </Pressable>
            </Card>
          ))
        )}
      </Box>

      {saved ? (
        <Box
          flexDirection="row"
          alignItems="center"
          gap="s"
          backgroundColor="successSoft"
          borderRadius="md"
          padding="m"
        >
          <CheckCircle2 size={18} color={theme.colors.success} />
          <Text color="success" fontWeight="600">
            Guardado
          </Text>
        </Box>
      ) : null}

      <Button
        label="Guardar"
        fullWidth
        disabled={items.length === 0}
        onPress={onGuardar}
      />
    </ScrollView>
  );
}
