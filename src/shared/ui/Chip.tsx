import { Badge, type BadgeTone } from './Badge';

/** @deprecated Use `BadgeTone`. */
export type ChipTone = BadgeTone;

type Props = {
  label: string;
  tone?: ChipTone;
};

/**
 * @deprecated Use `<Badge />` directly — it is the same
 * component with a second axis for visual weight. Kept as a thin alias so
 * existing call sites keep working.
 */
export function Chip({ label, tone = 'neutral' }: Props) {
  return <Badge label={label} tone={tone} />;
}
