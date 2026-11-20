import { GOALS, PLATFORMS, SERVICES, MONTAGE_STYLES, DURATION_PRESETS, PACES, MONTAGE_GOALS, SHOT_CATEGORIES } from "@/lib/constants";

const toOpts = (o: Record<string, string>) => Object.entries(o).map(([value, label]) => ({ value, label }));
export const GOAL_OPTIONS = toOpts(GOALS);
export const PLATFORM_OPTIONS = Object.entries(PLATFORMS).map(([value, p]) => ({ value, label: p.label }));
export const SERVICE_OPTIONS = toOpts(SERVICES);
export const STYLE_OPTIONS = toOpts(MONTAGE_STYLES);
export const DURATION_OPTIONS = Object.entries(DURATION_PRESETS).map(([value, d]) => ({ value, label: d.label }));
export const PACE_OPTIONS = Object.entries(PACES).map(([value, p]) => ({ value, label: p.label }));
export const MONTAGE_GOAL_OPTIONS = toOpts(MONTAGE_GOALS);
export const SHOT_OPTIONS = toOpts(SHOT_CATEGORIES);
