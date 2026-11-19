import {
  BookOpen,
  Bot,
  Brain,
  ChartLine,
  CircleCheck,
  Clock,
  Database,
  Eye,
  FileText,
  Flame,
  Info,
  LayoutTemplate,
  Lightbulb,
  ListChecks,
  Lock,
  MessageSquare,
  Repeat,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  Users,
  Wrench,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { IconName } from '../../content/types';

const MAP: Record<IconName, ComponentType<LucideProps>> = {
  target: Target,
  info: Info,
  database: Database,
  layout: LayoutTemplate,
  shield: ShieldCheck,
  check: CircleCheck,
  alert: TriangleAlert,
  message: MessageSquare,
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  users: Users,
  file: FileText,
  chart: ChartLine,
  clock: Clock,
  list: ListChecks,
  repeat: Repeat,
  lock: Lock,
  eye: Eye,
  wrench: Wrench,
  flame: Flame,
  brain: Brain,
  route: Route,
  bot: Bot,
  book: BookOpen,
  scale: Scale,
};

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const C = MAP[name] ?? Sparkles;
  return <C aria-hidden="true" {...props} />;
}
