import sys

path = "src/lib/festivalCreative.ts"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update FestivalStyle type and add PictureSettings
old_type = 'export type FestivalStyle = "traditional" | "minimal" | "luxury" | "contemporary";'
new_type = '''export type FestivalStyle =
  | "traditional"
  | "sanctum"
  | "editorial-full"
  | "mandala-radial"
  | "luxury"
  | "tanjore-heirloom"
  | "minimal"
  | "contemporary";

export type PictureShape = "default" | "arch" | "circle" | "oval" | "sanctum" | "bleed" | "square";
export type PictureTreatment = "natural" | "divine-aura" | "temple-glow" | "antique-gold";

export interface PictureSettings {
  shape?: PictureShape;
  scale?: number;
  focusY?: number;
  treatment?: PictureTreatment;
  beadedBorder?: boolean;
  showAura?: boolean;
}'''

assert old_type in text, "old_type not found"
text = text.replace(old_type, new_type, 1)

# 2. Update CARD_STYLES
old_styles = """export const CARD_STYLES: CardStyleMeta[] = [
  {
    key: "traditional",
    name: "Traditional",
    purpose: "A mango-leaf toran, an arched portrait, the date on a gold seal, diyas at the foot.",
    bestFor: "Temple festivals, Pongal, Deepavali, family and community groups.",
    defaultTheme: "kumkum",
    defaultDisplay: "cinzel",
    defaultScript: "classic",
    defaultLogo: "plaque",
  },
  {
    key: "minimal",
    name: "Minimal",
    purpose: "Mostly ground, one gold rule, the greeting set left like a letter.",
    bestFor: "A series where the words carry the day, and quiet weekdays.",
    defaultTheme: "ivory",
    defaultDisplay: "marcellus",
    defaultScript: "classic",
    defaultLogo: "wordmark",
  },
  {
    key: "luxury",
    name: "Luxury",
    purpose: "Double gold frame, portrait in an oval, the date engraved on a plate.",
    bestFor: "Invitations, New Year, anything that should read as an heirloom.",
    defaultTheme: "midnight",
    defaultDisplay: "cinzel",
    defaultScript: "classic",
    defaultLogo: "wordmark",
  },
  {
    key: "contemporary",
    name: "Contemporary",
    purpose: "A hard colour block, a big sans greeting, art cropped into a window.",
    bestFor: "Younger audiences, reels, weekdays that need reach.",
    defaultTheme: "sand",
    defaultDisplay: "jakarta",
    defaultScript: "bold",
    defaultLogo: "corner",
  },
];"""

new_styles = """export const CARD_STYLES: CardStyleMeta[] = [
  {
    key: "traditional",
    name: "Traditional",
    purpose: "A mango-leaf toran, an arched portrait, the date on a gold seal, diyas at the foot.",
    bestFor: "Temple festivals, Pongal, Deepavali, family and community groups.",
    defaultTheme: "kumkum",
    defaultDisplay: "cinzel",
    defaultScript: "classic",
    defaultLogo: "plaque",
  },
  {
    key: "sanctum",
    name: "Temple Sanctum",
    purpose: "Shrine mandapam, carved pilasters, kalasam crest, and twin brass vilakku lamps.",
    bestFor: "Grand temple utsavams, Pradosham, Brahmotsavam, Deepavali, Thai Poosam.",
    defaultTheme: "kumkum",
    defaultDisplay: "cinzel",
    defaultScript: "classic",
    defaultLogo: "plaque",
  },
  {
    key: "editorial-full",
    name: "Full Devotional Bleed",
    purpose: "High-impact bleed portrait with celestial gradient veil, starlight, and modern editorial type.",
    bestFor: "Instagram reels, high-reach feed heroes, immersive devotional posters.",
    defaultTheme: "midnight",
    defaultDisplay: "cinzel",
    defaultScript: "bold",
    defaultLogo: "service-top-right",
  },
  {
    key: "mandala-radial",
    name: "Sacred Mandala",
    purpose: "Concentric 32-petal gold filigree mandala framing a large circular sacred portrait.",
    bestFor: "Guru Purnima, Navaratri, Maha Shivaratri, solar Sankranti festivals.",
    defaultTheme: "saffron",
    defaultDisplay: "marcellus",
    defaultScript: "classic",
    defaultLogo: "wordmark",
  },
  {
    key: "luxury",
    name: "Luxury Cameo",
    purpose: "Double gold frame, portrait in an oval medallion, date engraved on a plate.",
    bestFor: "Invitations, New Year, anything that should read as an heirloom.",
    defaultTheme: "midnight",
    defaultDisplay: "cinzel",
    defaultScript: "classic",
    defaultLogo: "wordmark",
  },
  {
    key: "tanjore-heirloom",
    name: "Tanjore Gold Leaf",
    purpose: "Embossed 24k gold leaf repoussé borders, corner rosettes, sacred velvet ground.",
    bestFor: "Varalakshmi Vratham, Janmashtami, Rama Navami, heirloom family wishes.",
    defaultTheme: "kumkum",
    defaultDisplay: "cinzel",
    defaultScript: "classic",
    defaultLogo: "wordmark",
  },
  {
    key: "minimal",
    name: "Minimal",
    purpose: "Mostly ground, one gold rule, the greeting set left like a letter.",
    bestFor: "A series where the words carry the day, and quiet weekdays.",
    defaultTheme: "ivory",
    defaultDisplay: "marcellus",
    defaultScript: "classic",
    defaultLogo: "wordmark",
  },
  {
    key: "contemporary",
    name: "Contemporary",
    purpose: "A hard colour block, a big sans greeting, art cropped into a window.",
    bestFor: "Younger audiences, reels, weekdays that need reach.",
    defaultTheme: "sand",
    defaultDisplay: "jakarta",
    defaultScript: "bold",
    defaultLogo: "corner",
  },
];"""

assert old_styles in text, "old_styles not found"
text = text.replace(old_styles, new_styles, 1)

# 3. Update FestivalCardInput & Scene to include pictureSettings
old_input = """  brandLockup?: BrandLockupSettings;
  /** Show the platform's safe-area guides (editor only, never exported). */
  showSafeArea?: boolean;
  scale?: number;
}"""

new_input = """  brandLockup?: BrandLockupSettings;
  /** Controls for picture shape, scale, focus, aura, and artistic treatment. */
  pictureSettings?: PictureSettings;
  /** Show the platform's safe-area guides (editor only, never exported). */
  showSafeArea?: boolean;
  scale?: number;
}"""

assert old_input in text, "old_input not found"
text = text.replace(old_input, new_input, 1)

old_scene = """  logoPlacement: LogoPlacement;
  brandLockup: BrandLockupSettings;
}"""

new_scene = """  logoPlacement: LogoPlacement;
  brandLockup: BrandLockupSettings;
  pictureSettings?: PictureSettings;
}"""

assert old_scene in text, "old_scene not found"
text = text.replace(old_scene, new_scene, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("PART 1 SUCCESS")
