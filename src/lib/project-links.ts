export function projectHref(p: { id: string; type: string; analyses?: Array<{ id: string }> }) {
  if (p.type === "ANALYSIS" && p.analyses?.[0]) return `/analysis/${p.analyses[0].id}`;
  if (p.type === "AUTO_MONTAGE") return `/montage/${p.id}`;
  return `/projects/${p.id}`;
}
