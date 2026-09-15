import {
  Box,
  CircuitBoard,
  Droplets,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Per-section icon map — single source for both the quick-nav chips and the
 * section card headers. Keys are BookingSection.service_section values.
 */
export const SECTION_ICONS: Record<string, LucideIcon> = {
  repair: Wrench,
  switch: Zap,
  stabilizer: Droplets,
  lubricant: Droplets,
  pcb: CircuitBoard,
  cleaning: Sparkles,
  keycap_stem: Box,
};

export function getSectionIcon(sectionKey: string): LucideIcon {
  return SECTION_ICONS[sectionKey] ?? Wrench;
}
