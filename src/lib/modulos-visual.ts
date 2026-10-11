import {
  KanbanSquare,
  Gavel,
  Headset,
  Handshake,
  DraftingCompass,
  ShoppingCart,
  CalendarClock,
  FlaskConical,
  GraduationCap,
  Settings2,
} from "lucide-react";
import type { ModuloKey } from "./modulos";

// Ícone e cor de cada módulo, iguais na página de entrada e nas abas de módulo do topo.
export const VISUAL_MODULO: Record<ModuloKey, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; cor: string }> = {
  orcamento: { icon: KanbanSquare, cor: "#26405C" },
  diretoria: { icon: Gavel, cor: "#946522" },
  atendimento: { icon: Headset, cor: "#3E6E9E" },
  aceite: { icon: Handshake, cor: "#2E6B4F" },
  engenharia: { icon: DraftingCompass, cor: "#6C63B5" },
  compras: { icon: ShoppingCart, cor: "#8C5A21" },
  pcp: { icon: CalendarClock, cor: "#2C7A8C" },
  laboratorio: { icon: FlaskConical, cor: "#7A3B69" },
  treinamentos: { icon: GraduationCap, cor: "#2F6B5E" },
  administracao: { icon: Settings2, cor: "#233248" },
};
