import {
  ArrowRight,
  Check,
  Download,
  Minus,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react-native';
import { ScrollView } from 'react-native';

import { useAppearance } from '@/shared/stores/appearance';
import { Badge, Button, Card, CountBadge, Divider, Input } from '@/shared/ui';
import type { BadgeEmphasis, BadgeTone, ButtonSize, ButtonVariant } from '@/shared/ui';
import {
  Box,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  Text,
  useAppTheme,
  type BadgeSize,
} from '@/theme';

const buttonVariants: ButtonVariant[] = [
  'primary',
  'secondary',
  'outline',
  'ghost',
  'danger',
  'link',
];
const buttonSizes: ButtonSize[] = ['xs', 'sm', 'md', 'lg'];
const badgeTones: BadgeTone[] = ['neutral', 'primary', 'success', 'warning', 'danger'];
const badgeEmphases: BadgeEmphasis[] = ['solid', 'soft', 'outline'];
const badgeSizeList: BadgeSize[] = ['sm', 'md'];

/** Titled group with a hairline separator, so sections read as one rhythm. */
function Section({ title, hint, children }: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Box gap="s">
      <Box gap="xxs">
        <Text variant="subtitle">{title}</Text>
        {hint ? <Text variant="caption">{hint}</Text> : null}
      </Box>
      <Divider />
      {children}
    </Box>
  );
}

/** Label + value row used by the density readout. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <Box flexDirection="row" justifyContent="space-between" alignItems="center">
      <Text variant="caption">{label}</Text>
      <Text variant="label">{value}</Text>
    </Box>
  );
}

/**
 * Component gallery.
 *
 * Exists to make density judgeable: the control at the top rewrites the whole
 * theme from one number, so every size below moves together. Compare against
 * the web app rather than tuning components one at a time.
 */
export default function GalleryScreen() {
  const theme = useAppTheme();
  const baseFontSize = useAppearance((state) => state.baseFontSize);
  const setBaseFontSize = useAppearance((state) => state.setBaseFontSize);

  const control = theme.controlSizes;

  return (
    <ScrollView
      contentContainerStyle={{ padding: theme.spacing.l, gap: theme.spacing.xl }}
      style={{ backgroundColor: theme.colors.mainBackground }}
    >
      <Section
        title="Densidad"
        hint="Un solo número reescala tipografía, controles, iconos y badges."
      >
        <Card gap="m">
          <Box flexDirection="row" alignItems="center" justifyContent="space-between">
            <Button
              icon={Minus}
              variant="outline"
              size="sm"
              accessibilityLabel="Reducir tamaño de texto"
              disabled={baseFontSize <= MIN_FONT_SIZE}
              onPress={() => setBaseFontSize(baseFontSize - 1)}
            />
            <Text variant="title">{baseFontSize}px</Text>
            <Button
              icon={Plus}
              variant="outline"
              size="sm"
              accessibilityLabel="Aumentar tamaño de texto"
              disabled={baseFontSize >= MAX_FONT_SIZE}
              onPress={() => setBaseFontSize(baseFontSize + 1)}
            />
          </Box>

          <Divider />

          <Box gap="xs">
            <Row label="Escala aplicada" value={`${theme.fontScale.toFixed(3)}×`} />
            <Row
              label="Alturas de control"
              value={buttonSizes.map((s) => control[s].height).join(' / ')}
            />
            <Row
              label="Tamaños de fuente"
              value={buttonSizes.map((s) => control[s].fontSize).join(' / ')}
            />
          </Box>
        </Card>
      </Section>

      <Section
        title="Button — variantes"
        hint="Cada fila es una variante en tamaño md."
      >
        <Card gap="m">
          {buttonVariants.map((variant) => (
            <Box key={variant} gap="xs">
              <Text variant="caption">{variant}</Text>
              <Box flexDirection="row" gap="s" flexWrap="wrap" alignItems="center">
                <Button label="Guardar" variant={variant} />
                <Button label="Descargar" variant={variant} icon={Download} />
                <Button label="Siguiente" variant={variant} endIcon={ArrowRight} />
              </Box>
            </Box>
          ))}
        </Card>
      </Section>

      <Section
        title="Button — tamaños"
        hint="24 / 28 / 32 / 38px a escala 1. El área tocable llega a 44px por hitSlop."
      >
        <Card gap="m">
          {buttonSizes.map((size) => (
            <Box key={size} gap="xs">
              <Text variant="caption">
                {size} — {control[size].height}px
              </Text>
              <Box flexDirection="row" gap="s" flexWrap="wrap" alignItems="center">
                <Button label="Etiqueta" size={size} />
                <Button label="Con icono" size={size} icon={Check} />
                <Button icon={Trash2} size={size} variant="outline" accessibilityLabel="Eliminar" />
              </Box>
            </Box>
          ))}
        </Card>
      </Section>

      <Section title="Button — estados">
        <Card gap="m">
          <Box flexDirection="row" gap="s" flexWrap="wrap" alignItems="center">
            <Button label="Cargando" loading />
            <Button label="Deshabilitado" disabled />
            <Button label="Secundario" variant="secondary" disabled />
            <Button icon={Check} loading accessibilityLabel="Cargando" />
          </Box>
          <Button label="Ancho completo" fullWidth icon={Check} />
        </Card>
      </Section>

      <Section
        title="Badge — tono × énfasis"
        hint="Dos ejes independientes: 5 tonos × 3 énfasis, sin una variante por combinación."
      >
        <Card gap="m">
          {badgeEmphases.map((emphasis) => (
            <Box key={emphasis} gap="xs">
              <Text variant="caption">{emphasis}</Text>
              <Box flexDirection="row" gap="xs" flexWrap="wrap" alignItems="center">
                {badgeTones.map((tone) => (
                  <Badge key={tone} label={tone} tone={tone} emphasis={emphasis} />
                ))}
              </Box>
            </Box>
          ))}
        </Card>
      </Section>

      <Section title="Badge — tamaños, iconos y forma">
        <Card gap="m">
          {badgeSizeList.map((size) => (
            <Box key={size} gap="xs">
              <Text variant="caption">
                {size} — {theme.badgeSizes[size].height}px
              </Text>
              <Box flexDirection="row" gap="xs" flexWrap="wrap" alignItems="center">
                <Badge label="Entregado" tone="success" size={size} icon={Check} />
                <Badge label="Pendiente" tone="warning" size={size} icon={TriangleAlert} />
                <Badge label="rounded" tone="primary" size={size} shape="rounded" />
                <Badge label="Sólido" tone="danger" emphasis="solid" size={size} />
              </Box>
            </Box>
          ))}

          <Divider />

          <Box flexDirection="row" gap="m" alignItems="center">
            <Text variant="caption">CountBadge</Text>
            <CountBadge count={1} />
            <CountBadge count={12} />
            <CountBadge count={150} />
            <CountBadge count={7} tone="primary" />
            <CountBadge count={3} size="sm" />
          </Box>
        </Card>
      </Section>

      <Section title="Superficies" hint="Sin sombras: la separación es luminancia + hairline.">
        <Box gap="m">
          <Card gap="xs">
            <Text variant="label">Card elevated</Text>
            <Text variant="caption">Fondo de tarjeta con borde hairline.</Text>
          </Card>
          <Card variant="flat" gap="xs">
            <Text variant="label">Card flat</Text>
            <Text variant="caption">Fondo muted, sin borde.</Text>
          </Card>
          <Card gap="m">
            <Input label="Campo de texto" placeholder="Escribe algo" />
            <Box flexDirection="row" gap="s">
              <Button label="Cancelar" variant="ghost" size="sm" />
              <Button label="Confirmar" size="sm" />
            </Box>
          </Card>
        </Box>
      </Section>

      <Section title="Tipografía">
        <Card gap="s">
          <Text variant="header">Header 26</Text>
          <Text variant="title">Title 19</Text>
          <Text variant="subtitle">Subtitle 15</Text>
          <Text variant="body">Body 14 — el texto base de la aplicación.</Text>
          <Text variant="bodySmall">BodySmall 13 — texto secundario denso.</Text>
          <Text variant="label">Label 12</Text>
          <Text variant="caption">Caption 12 — metadatos y ayudas.</Text>
        </Card>
      </Section>
    </ScrollView>
  );
}
