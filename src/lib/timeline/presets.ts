import type { CaptionPresetKey, CaptionStyle, TextAnimation } from "./types";

export const CAPTION_PRESETS: Record<CaptionPresetKey, { label: string; description: string; style: CaptionStyle; animation: TextAnimation; y: number }> = {
  minimal_premium: {
    label: "Minimal Premium",
    description: "Lekki, elegancki krój, bez obrysu, delikatny cień.",
    style: {
      preset: "minimal_premium", fontFamily: "Poppins", fontWeight: 500, fontSize: 56, color: "#FFFFFF", highlightColor: "#7FB2FF",
      outlineColor: "#000000", outlineWidth: 0, shadow: 2, background: "none", boxColor: "#000000", boxOpacity: 0.5, uppercase: false, letterSpacing: 1,
    },
    animation: "fade",
    y: 0.7,
  },
  bold_viral: {
    label: "Bold Viral",
    description: "Duże, wyraziste litery z obrysem i podświetleniem słów.",
    style: {
      preset: "bold_viral", fontFamily: "Anton", fontWeight: 400, fontSize: 92, color: "#FFFFFF", highlightColor: "#FFE14D",
      outlineColor: "#000000", outlineWidth: 6, shadow: 0, background: "none", boxColor: "#000000", boxOpacity: 0.6, uppercase: true, letterSpacing: 1,
    },
    animation: "pop",
    y: 0.62,
  },
  cinematic: {
    label: "Cinematic",
    description: "Klasyczne kapitaliki z szerokim odstępem, jak w zwiastunie.",
    style: {
      preset: "cinematic", fontFamily: "Cinzel", fontWeight: 400, fontSize: 60, color: "#F4EFE6", highlightColor: "#E7C77A",
      outlineColor: "#000000", outlineWidth: 0, shadow: 3, background: "none", boxColor: "#000000", boxOpacity: 0.5, uppercase: true, letterSpacing: 8,
    },
    animation: "fade",
    y: 0.5,
  },
  luxury: {
    label: "Luxury Automotive",
    description: "Szeryfowy krój w złotym kolorze — prestiż i elegancja.",
    style: {
      preset: "luxury", fontFamily: "Playfair Display", fontWeight: 400, fontSize: 66, color: "#D9B86C", highlightColor: "#FFFFFF",
      outlineColor: "#000000", outlineWidth: 0, shadow: 2, background: "none", boxColor: "#000000", boxOpacity: 0.5, uppercase: false, letterSpacing: 2,
    },
    animation: "slide-up",
    y: 0.72,
  },
  clean_modern: {
    label: "Clean Modern",
    description: "Nowoczesny bezszeryfowy krój na półprzezroczystym tle.",
    style: {
      preset: "clean_modern", fontFamily: "Montserrat", fontWeight: 700, fontSize: 54, color: "#FFFFFF", highlightColor: "#4C8DFF",
      outlineColor: "#000000", outlineWidth: 0, shadow: 0, background: "box", boxColor: "#0B0D12", boxOpacity: 0.62, uppercase: false, letterSpacing: 0,
    },
    animation: "slide-up",
    y: 0.72,
  },
};

/** Pliki fontów dla libass (pełne nazwy) i przeglądarki. */
export function assFontName(family: string, weight: number): { name: string; bold: boolean } {
  switch (family) {
    case "Poppins":
      return { name: weight >= 800 ? "Poppins ExtraBold" : weight >= 600 ? "Poppins SemiBold" : "Poppins Medium", bold: false };
    case "Montserrat":
      return { name: weight >= 800 ? "Montserrat ExtraBold" : weight >= 700 ? "Montserrat Bold" : "Montserrat SemiBold", bold: false };
    default:
      return { name: family, bold: false };
  }
}

/** Przybliżona średnia szerokość znaku (ułamek wielkości fontu) — łamanie linii identyczne w podglądzie i renderze. */
export const CHAR_WIDTH: Record<string, number> = {
  Poppins: 0.6,
  Montserrat: 0.64,
  Anton: 0.46,
  "Bebas Neue": 0.42,
  Cinzel: 0.74,
  "Playfair Display": 0.56,
};
