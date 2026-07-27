import { ScrollView } from 'react-native';

import { findRouteById, navigateTo } from '@/navigation/registry';
import { Button, Card, Chip } from '@/shared/ui';
import { Box, Text } from '@/theme';

import { useDespachos } from './store';
import { ESTADO_META, type Despacho } from './types';

export default function DespachosScreen() {
  const despachos = useDespachos((state) => state.despachos);
  const setActive = useDespachos((state) => state.setActive);

  const openChequeo = (despacho: Despacho) => {
    setActive(despacho.id);
    const route = findRouteById('despachos.chequeo');
    if (route) navigateTo(route);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {despachos.map((despacho) => {
        const meta = ESTADO_META[despacho.estado];
        return (
          <Card key={despacho.id} gap="m">
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Box gap="xs">
                <Text variant="subtitle">{despacho.codigo}</Text>
                <Text variant="caption">{despacho.cliente}</Text>
              </Box>
              <Chip label={meta.label} tone={meta.tone} />
            </Box>

            <Button
              label="Chequeo"
              size="sm"
              onPress={() => openChequeo(despacho)}
            />
          </Card>
        );
      })}
    </ScrollView>
  );
}
