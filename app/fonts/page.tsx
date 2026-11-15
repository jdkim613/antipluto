import type { Metadata } from "next";
import Link from "next/link";
import {
  Alegreya,
  Bitter,
  Bodoni_Moda,
  Cormorant_Garamond,
  Crimson_Pro,
  DM_Mono,
  DM_Serif_Display,
  EB_Garamond,
  Fraunces,
  Geist_Mono,
  IBM_Plex_Mono,
  Inconsolata,
  Instrument_Serif,
  JetBrains_Mono,
  Libre_Baskerville,
  Literata,
  Lora,
  Newsreader,
  Playfair_Display,
  Prata,
  Source_Serif_4,
  Space_Mono,
  Spectral,
  Zilla_Slab,
} from "next/font/google";

const geist = Geist_Mono({ subsets: ["latin"], weight: "400", preload: false });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: "400", preload: false });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: "400", preload: false });
const space = Space_Mono({ subsets: ["latin"], weight: "400", preload: false });
const dm = DM_Mono({ subsets: ["latin"], weight: "400", preload: false });
const inconsolata = Inconsolata({ subsets: ["latin"], weight: "400", preload: false });
const newsreader = Newsreader({ subsets: ["latin"], weight: "400", preload: false });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", preload: false });
const fraunces = Fraunces({ subsets: ["latin"], weight: "400", preload: false });
const lora = Lora({ subsets: ["latin"], weight: "400", preload: false });
const baskerville = Libre_Baskerville({ subsets: ["latin"], weight: "400", preload: false });
const source = Source_Serif_4({ subsets: ["latin"], weight: "400", preload: false });
const alegreya = Alegreya({ subsets: ["latin"], weight: "400", preload: false });
const bitter = Bitter({ subsets: ["latin"], weight: "400", preload: false });
const bodoni = Bodoni_Moda({ subsets: ["latin"], weight: "400", preload: false });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: "400", preload: false });
const crimson = Crimson_Pro({ subsets: ["latin"], weight: "400", preload: false });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", preload: false });
const garamond = EB_Garamond({ subsets: ["latin"], weight: "400", preload: false });
const literata = Literata({ subsets: ["latin"], weight: "400", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], weight: "400", preload: false });
const prata = Prata({ subsets: ["latin"], weight: "400", preload: false });
const spectral = Spectral({ subsets: ["latin"], weight: "400", preload: false });
const zilla = Zilla_Slab({ subsets: ["latin"], weight: "400", preload: false });

const groups = [
  // shortcut: these previews use installed fonts; self-host the chosen font when applying it to the site.
  {
    name: "Fontshare serif",
    fonts: [
      { name: "Sentient", font: { className: "", style: { fontFamily: '"Sentient Variable", serif' } }, note: "Warm, clear, understated." },
      { name: "Boska", font: { className: "", style: { fontFamily: '"Boska", serif' } }, note: "Elegant, expressive, with a more distinctive wordmark." },
      { name: "Gambarino", font: { className: "", style: { fontFamily: '"Gambarino", serif' } }, note: "Characterful and a little unconventional." },
      { name: "Gambetta", font: { className: "", style: { fontFamily: '"Gambetta", serif' } }, note: "Confident, warm, and comfortable to read." },
      { name: "Rowan", font: { className: "", style: { fontFamily: '"Rowan", serif' } }, note: "Soft edges and a relaxed, approachable feel." },
      { name: "Neco", font: { className: "", style: { fontFamily: '"Neco", serif' } }, note: "Compact, sturdy, with personality in the details." },
      { name: "Erode", font: { className: "", style: { fontFamily: '"Erode", serif' } }, note: "Calm and literary. A quieter option." },
      { name: "Paquito", font: { className: "", style: { fontFamily: '"Paquito", serif' } }, note: "Friendly, sturdy shapes with a slab-serif feel." },
      { name: "Recia", font: { className: "", style: { fontFamily: '"Recia", serif' } }, note: "Crisp details and an even reading rhythm." },
      { name: "Zodiak", font: { className: "", style: { fontFamily: '"Zodiak", serif' } }, note: "Broad, confident, and substantial." },
      { name: "Bespoke Serif", font: { className: "", style: { fontFamily: '"Bespoke Serif", serif' } }, note: "Balanced and restrained, with subtle character." },
      { name: "Bonny", font: { className: "", style: { fontFamily: '"Bonny", serif' } }, note: "Playful curves for a less formal direction." },
    ],
  },
  {
    name: "Fontshare mono",
    fonts: [
      { name: "Tabular", font: { className: "", style: { fontFamily: '"Tabular", monospace' } }, note: "A measured, practical companion for serif headlines." },
      { name: "Azeret Mono", font: { className: "", style: { fontFamily: '"Azeret Mono", monospace' } }, note: "Geometric and sturdy, with a technical feel." },
      { name: "RX100", font: { className: "", style: { fontFamily: '"RX100", monospace' } }, note: "Compact and utilitarian, with a retro character." },
    ],
  },
  {
    name: "Mono",
    fonts: [
      { name: "Geist Mono", font: geist, note: "Clean, precise, understated." },
      { name: "IBM Plex Mono", font: plex, note: "Technical with a human touch." },
      { name: "JetBrains Mono", font: jetbrains, note: "Crisp, open, code-inspired." },
      { name: "Space Mono", font: space, note: "Geometric and a little eccentric." },
      { name: "DM Mono", font: dm, note: "Soft, rounded, easygoing." },
      { name: "Inconsolata", font: inconsolata, note: "Narrow, light, quietly distinctive." },
    ],
  },
  {
    name: "Serif",
    fonts: [
      { name: "Newsreader", font: newsreader, note: "Selected for Antipluto. Warm and editorial." },
      { name: "Instrument Serif", font: instrument, note: "Elegant, narrow, expressive." },
      { name: "Fraunces", font: fraunces, note: "Rounded, playful, full of character." },
      { name: "Lora", font: lora, note: "Friendly and balanced." },
      { name: "Libre Baskerville", font: baskerville, note: "Classic, substantial, bookish." },
      { name: "Source Serif 4", font: source, note: "Quiet, readable, versatile." },
    ],
  },
  {
    name: "More serif",
    fonts: [
      { name: "Cormorant Garamond", font: cormorant, note: "Delicate, literary, expressive." },
      { name: "EB Garamond", font: garamond, note: "Traditional, graceful, familiar." },
      { name: "Crimson Pro", font: crimson, note: "Soft, compact, quietly bookish." },
      { name: "DM Serif Display", font: dmSerif, note: "Bold shapes with fine details." },
      { name: "Bodoni Moda", font: bodoni, note: "Sharp contrast, fashion-editorial feel." },
      { name: "Playfair Display", font: playfair, note: "Expressive curves and strong contrast." },
      { name: "Prata", font: prata, note: "Sculpted, upright, distinctive." },
      { name: "Literata", font: literata, note: "Contemporary, grounded, made for reading." },
      { name: "Spectral", font: spectral, note: "Angular details with an easy reading rhythm." },
      { name: "Alegreya", font: alegreya, note: "Lively, calligraphic, warm." },
      { name: "Bitter", font: bitter, note: "Sturdy, practical, substantial serifs." },
      { name: "Zilla Slab", font: zilla, note: "Friendly slab serif with a technical edge." },
    ],
  },
];

export const metadata: Metadata = {
  title: "Font studies — Antipluto",
  robots: { index: false, follow: false },
};

export default function FontsPage() {
  return (
    <main className="min-h-svh bg-white px-6 py-10 text-neutral-900 sm:px-16 sm:py-16">
      <header className="mb-16 max-w-2xl">
        <Link href="/" className="inline-flex min-h-11 items-center text-xs text-neutral-600 underline underline-offset-4 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4">
          Back to Antipluto
        </Link>
        <h1 className="mt-6 text-xl">Font studies</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Fifteen Fontshare additions from your Mac, plus the earlier options.
          The same words in each.
        </p>
        <nav aria-label="Font categories" className="mt-6 flex flex-wrap gap-x-6 gap-y-1">
          {groups.map((group) => (
            <a key={group.name} href={`#${group.name.toLowerCase().replaceAll(" ", "-")}`} className="inline-flex min-h-11 items-center text-xs text-neutral-600 underline underline-offset-4 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4">
              {group.name}
            </a>
          ))}
        </nav>
      </header>
      <div className="max-w-6xl space-y-20">
        {groups.map((group) => (
          <section key={group.name} aria-labelledby={group.name.toLowerCase().replaceAll(" ", "-")}>
            <h2 id={group.name.toLowerCase().replaceAll(" ", "-")} className="mb-8 scroll-mt-10 text-xs uppercase tracking-widest text-neutral-500">
              {group.name}
            </h2>
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-x-24">
              {group.fonts.map(({ name, font, note }) => (
                <article key={name} className="border-t border-neutral-200 pt-5">
                  <h3 className="text-xs font-medium">{name}</h3>
                  <div className={`${font.className} mt-6`} style={font.style}>
                    <p className="text-4xl leading-tight">antipluto</p>
                    <p className="mt-4 max-w-[36ch] text-xl leading-8 text-neutral-700">
                      We build products that make everyday life a little better.
                    </p>
                  </div>
                  <p className="mt-5 text-xs leading-5 text-neutral-500">{note}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
