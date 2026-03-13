"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";

const BRANDS: { name: string; slug: string }[] = [
  { name: "Zara", slug: "zara" },
  { name: "Uniqlo", slug: "uniqlo" },
  { name: "Massimo Dutti", slug: "massimo-dutti" },
  { name: "Stüssy", slug: "stussy" },
  { name: "Supreme", slug: "supreme" },
  { name: "COS", slug: "cos" },
  { name: "Prada", slug: "prada" },
  { name: "Stone Island", slug: "stone-island" },
  { name: "Brandy Melville", slug: "brandy-melville" },
  { name: "Nike", slug: "nike" },
  { name: "Adidas", slug: "adidas" },
  { name: "New Brand", slug: "new-brand" },
];

const FILTER_WHITE_SLUGS = new Set([
  "brandy-melville",
  "zara",
  "massimo-dutti",
  "nike",
  "stone-island",
  "adidas",
  "stussy",
  "new-brand",
]);

const SCROLL_DURATION_FAST = 45;
const SCROLL_DURATION_SLOW = 90;

function BrandCard({
  brand,
  index,
  isHovered,
  onHoverStart,
  onHoverEnd,
}: {
  brand: (typeof BRANDS)[0];
  index: number;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const [useSvg, setUseSvg] = useState(false);
  const [showText, setShowText] = useState(false);
  const ext = useSvg ? "svg" : "png";
  const logoPath = `/images/brands/${brand.slug}.${ext}`;

  const handleImgError = useCallback(() => {
    if (!useSvg) setUseSvg(true);
    else setShowText(true);
  }, [useSvg]);

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-visible py-8"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onTouchStart={onHoverStart}
      onTouchEnd={onHoverEnd}
    >
      {!showText ? (
        <motion.div
          className="relative h-16 w-32 md:h-24 md:w-48"
          animate={{ scale: isHovered ? 1.15 : 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <Image
            src={logoPath}
            alt={brand.name}
            fill
            className={`object-contain object-center ${FILTER_WHITE_SLUGS.has(brand.slug) ? "[filter:brightness(0)_invert(1)]" : ""}`}
            sizes="320px"
            onError={handleImgError}
            unoptimized
          />
        </motion.div>
      ) : (
        <span className="font-serif text-xl font-light uppercase tracking-[0.25em] text-white/90 md:text-2xl">
          {brand.name}
        </span>
      )}
    </div>
  );
}

export function BrandMarquee() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const doubled = [...BRANDS, ...BRANDS];

  const handleHoverStart = useCallback((id: string) => () => setHoveredId(id), []);
  const handleHoverEnd = useCallback(() => setHoveredId(null), []);

  const duration = hoveredId ? SCROLL_DURATION_SLOW : SCROLL_DURATION_FAST;

  return (
    <section className="relative w-full overflow-hidden bg-black py-16">
      <p className="mb-10 text-center text-xs font-medium uppercase tracking-[0.4em] text-white/40">
        New brands dropping soon
      </p>
      <div className="relative w-full overflow-hidden py-6">
        <motion.div
          className="flex w-max items-center gap-24"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            repeat: Infinity,
            repeatType: "loop",
            duration,
            ease: "linear",
          }}
        >
          {doubled.map((brand, i) => {
            const id = `${brand.slug}-${i}`;
            return (
              <BrandCard
                key={id}
                brand={brand}
                index={i}
                isHovered={hoveredId === id}
                onHoverStart={handleHoverStart(id)}
                onHoverEnd={handleHoverEnd}
              />
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
