import {
  Inter,
  Montserrat,
  Work_Sans,
  Playfair_Display,
  Source_Sans_3,
  Lora,
  Open_Sans,
  Cormorant_Garamond,
  Fira_Sans,
  Roboto_Slab,
  Roboto,
  Economica,
  Bricolage_Grotesque,
} from "next/font/google";

// Pre-load all fonts at build time
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  display: "swap",
});

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant-garamond",
  display: "swap",
});

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fira-sans",
  display: "swap",
});

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-roboto-slab",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

const economica = Economica({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-economica",
  display: "swap",
});

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage-grotesque",
  display: "swap",
});

// All font instances for className injection
export const fontInstances = {
  inter,
  montserrat,
  workSans,
  playfairDisplay,
  sourceSans3,
  lora,
  openSans,
  cormorantGaramond,
  firaSans,
  robotoSlab,
  roboto,
  economica,
  bricolageGrotesque,
};

// Map font names (as they come from API) to CSS variables
const fontNameToVar: Record<string, string> = {
  "Inter": "var(--font-inter)",
  "Montserrat": "var(--font-montserrat)",
  "Work Sans": "var(--font-work-sans)",
  "Playfair Display": "var(--font-playfair-display)",
  "Source Sans Pro": "var(--font-source-sans)",
  "Source Sans 3": "var(--font-source-sans)",
  "Lora": "var(--font-lora)",
  "Open Sans": "var(--font-open-sans)",
  "Cormorant Garamond": "var(--font-cormorant-garamond)",
  "Fira Sans": "var(--font-fira-sans)",
  "Roboto Slab": "var(--font-roboto-slab)",
  "Roboto": "var(--font-roboto)",
  "Economica": "var(--font-economica)",
  "Bricolage Grotesque": "var(--font-bricolage-grotesque)",
};

// Default font (Inter)
const DEFAULT_FONT_VAR = "var(--font-inter)";

// Get CSS variable for a font name
export function getFontVar(fontName?: string): string {
  if (!fontName) return DEFAULT_FONT_VAR;
  return fontNameToVar[fontName] || DEFAULT_FONT_VAR;
}

// Get all font variable classNames for <html>
export function getAllFontVariables(): string {
  return Object.values(fontInstances)
    .map((f) => f.variable)
    .join(" ");
}

// Available font names for UI/validation
export const availableFonts = Object.keys(fontNameToVar);
