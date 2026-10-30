import type { DeityKey } from "../types";

export interface Deity {
  key: DeityKey;
  name: string;
  tamil: string;
  hindi: string;
  epithet: string;
  mantra: string;
  blessing: string;
  /** Festivals and moments this image is the natural lead for. */
  useFor: string[];
  accent: string;
  file: string;
  thumb: string;
}

export const DEITIES: Deity[] = [
  {
    key: "ganesha",
    name: "Ganesha",
    tamil: "விநாயகர்",
    hindi: "गणेश",
    epithet: "Remover of obstacles",
    mantra: "ॐ गं गणपतये नमः",
    blessing: "May every new beginning open without a single obstacle.",
    useFor: ["Vinayaka Chaturthi", "Deepavali", "new beginnings", "first report free"],
    accent: "#E0A84E",
    file: "/deities/ganesha.jpg",
    thumb: "/deities/thumbs/ganesha.jpg",
  },
  {
    key: "shiva",
    name: "Shiva",
    tamil: "சிவன்",
    hindi: "शिव",
    epithet: "The auspicious one",
    mantra: "ॐ नमः शिवाय",
    blessing: "May the still centre of your mind stay calm through every change.",
    useFor: ["Maha Shivaratri", "Pradosham", "Arudra Darshan", "transits"],
    accent: "#9FB8D6",
    file: "/deities/shiva.jpg",
    thumb: "/deities/thumbs/shiva.jpg",
  },
  {
    key: "murugan",
    name: "Murugan",
    tamil: "முருகன்",
    hindi: "कार्तिकेय",
    epithet: "The vel of clear intent",
    mantra: "ॐ சரவணபவ",
    blessing: "May your aim stay straight and your courage stay kind.",
    useFor: ["Thaipusam", "Panguni Uthiram", "Skanda Sashti", "Vaikasi Visakam", "Karthigai Deepam"],
    accent: "#E4B24C",
    file: "/deities/murugan.jpg",
    thumb: "/deities/thumbs/murugan.jpg",
  },
  {
    key: "lakshmi",
    name: "Lakshmi",
    tamil: "லக்ஷ்மி",
    hindi: "लक्ष्मी",
    epithet: "Steady abundance",
    mantra: "ॐ श्रीं महालक्ष्म्यै नमः",
    blessing: "May your home stay full, your ledgers stay honest, and your giving stay generous.",
    useFor: ["Varalakshmi Vratham", "Deepavali", "Aadi Perukku", "offers"],
    accent: "#F0C25C",
    file: "/deities/lakshmi.jpg",
    thumb: "/deities/thumbs/lakshmi.jpg",
  },
  {
    key: "saraswati",
    name: "Saraswati",
    tamil: "சரஸ்வதி",
    hindi: "सरस्वती",
    epithet: "Wisdom, music, learning",
    mantra: "ॐ ऐं सरस्वत्यै नमः",
    blessing: "May what you study settle in your mind and come out as your own voice.",
    useFor: ["Saraswati Puja", "Navaratri", "Vidyarambham", "baby naming"],
    accent: "#F3E7CE",
    file: "/deities/saraswati.jpg",
    thumb: "/deities/thumbs/saraswati.jpg",
  },
  {
    key: "durga",
    name: "Durga",
    tamil: "துர்க்கை",
    hindi: "दुर्गा",
    epithet: "Protection, fearless resolve",
    mantra: "ॐ दुं दुर्गायै नमः",
    blessing: "May what threatens you lose its grip before it reaches your door.",
    useFor: ["Navaratri", "Vijayadashami", "Aadi", "protection"],
    accent: "#E0574A",
    file: "/deities/durga.jpg",
    thumb: "/deities/thumbs/durga.jpg",
  },
  {
    key: "krishna",
    name: "Krishna",
    tamil: "கிருஷ்ணர்",
    hindi: "कृष्ण",
    epithet: "Play, love, clear counsel",
    mantra: "ॐ नमो भगवते वासुदेवाय",
    blessing: "May your work carry lightness, and your advice stay honest.",
    useFor: ["Krishna Janmashtami", "Gokulashtami", "Raksha Bandhan", "relationships"],
    accent: "#6FA7D8",
    file: "/deities/krishna.jpg",
    thumb: "/deities/thumbs/krishna.jpg",
  },
  {
    key: "rama",
    name: "Rama",
    tamil: "ராமர்",
    hindi: "राम",
    epithet: "Dharma, the straight line",
    mantra: "ॐ श्री रामाय नमः",
    blessing: "May the right choice stay obvious even when it is the harder one.",
    useFor: ["Rama Navami", "Vijayadashami", "marriage"],
    accent: "#D9B15E",
    file: "/deities/rama.jpg",
    thumb: "/deities/thumbs/rama.jpg",
  },
  {
    key: "hanuman",
    name: "Hanuman",
    tamil: "அனுமன்",
    hindi: "हनुमान",
    epithet: "Devotion and raw strength",
    mantra: "ॐ हनुमते नमः",
    blessing: "May your effort outlast your doubt.",
    useFor: ["Hanuman Jayanti", "Transits & Sade Sati", "Tuesdays", "courage"],
    accent: "#E2703A",
    file: "/deities/hanuman.jpg",
    thumb: "/deities/thumbs/hanuman.jpg",
  },
  {
    key: "venkateswara",
    name: "Venkateswara",
    tamil: "வெங்கடேசுவரர்",
    hindi: "वेंकटेश्वर",
    epithet: "Lord of the seven hills",
    mantra: "ॐ नमो वेंकटेशाय",
    blessing: "May what you carry to the hill come back lighter.",
    useFor: ["Vaikunta Ekadasi", "Purattasi Saturdays", "Muhurtham", "gratitude"],
    accent: "#D9A33F",
    file: "/deities/venkateswara.jpg",
    thumb: "/deities/thumbs/venkateswara.jpg",
  },
  {
    key: "ayyappa",
    name: "Ayyappa",
    tamil: "ஐயப்பன்",
    hindi: "अय्यप्पा",
    epithet: "Restraint before the climb",
    mantra: "स्वामिये शरणम् अय्यप्पा",
    blessing: "May your discipline outlast your enthusiasm.",
    useFor: ["Mandala Pooja", "Sabarimala season", "vratham", "new beginnings"],
    accent: "#4E7FA8",
    file: "/deities/ayyappa.jpg",
    thumb: "/deities/thumbs/ayyappa.jpg",
  },
  {
    key: "meenakshi",
    name: "Meenakshi",
    tamil: "மீனாட்சி",
    hindi: "मीनाक्षी",
    epithet: "The fish-eyed queen of Madurai",
    mantra: "ॐ श्री मीनाक्ष्यै नमः",
    blessing: "May the promise you make in public be the one you keep in private.",
    useFor: ["Chithirai Thiruvizha", "Meenakshi Thirukalyanam", "marriage", "Madurai"],
    accent: "#2F8F6B",
    file: "/deities/meenakshi.jpg",
    thumb: "/deities/thumbs/meenakshi.jpg",
  },
];

export const DEITY_MAP: Record<string, Deity> = Object.fromEntries(
  DEITIES.map((deity) => [deity.key, deity]),
);

export const getDeity = (key?: DeityKey | null): Deity | null => (key ? DEITY_MAP[key] ?? null : null);

export const DEITY_USAGE_NOTE =
  "These are reverence-led devotional paintings, not stock photos of murtis. Use them at full contrast, never crop the face, never place text across the eyes, and never tint them. If a festival has no image here, run the motif-only poster instead — an empty frame is better than a wrong deity.";
