export { PLATFORMS } from "../constants";
import { CTA_KEYWORDS } from "../analysis/knowledge";
export const CTA_KEYWORDS_RE = new RegExp(CTA_KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
