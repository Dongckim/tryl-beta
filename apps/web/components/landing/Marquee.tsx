"use client";

const FASHION_WORDS = [
  "STYLE",
  "FIT",
  "EDITORIAL",
  "COUTURE",
  "VOGUE",
  "TRY-ON",
  "VIRTUAL",
  "FASHION",
  "ARCHIVE",
  "CLOSET",
  "CURATED",
  "BESPOKE",
];

export function Marquee() {
  const repeated = [...FASHION_WORDS, ...FASHION_WORDS];
  return (
    <div className="relative w-full overflow-hidden border-y border-white/10 py-4">
      <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
        {repeated.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="font-serif text-2xl font-light tracking-[0.4em] text-white/60 md:text-3xl"
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
