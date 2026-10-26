"use client";

import { useHistoricalGrid } from "@/components/cms/historical-grid";

import { useSiteContent, useLocalizedHref } from "@/components/cms/content-context";

import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

import type { UniverseCardContent as Universe } from "@/cms/seed-content";


/**
 * Section "Les 3 Univers" — façon Apple :
 *  - Grille 3 colonnes desktop (cards plein-écran chacune)
 *  - Scroll-snap horizontal mobile/tablette
 *  - Card en arrière-plan : gradient placeholder + voile + grain
 *  - Hover : zoom léger background + reveal description + slide flèche
 */
export function UniversesSection() {
  const gridLayout = useHistoricalGrid();
  const { universes, universesSection: copy } = useSiteContent();
  const localize = useLocalizedHref();
  return (
    <section data-cms-field="universesSection"
      id="univers"
      aria-labelledby="universes-heading"
      className="relative scroll-mt-24 bg-background py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        {/* En-tête éditoriale */}
        <div className="mb-16 grid gap-8 md:mb-24 md:grid-cols-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono text-[10px] uppercase tracking-[0.4em] text-foreground-subtle md:col-span-3"
          >
            {copy.eyebrow}
          </motion.p>

          <motion.h2
            id="universes-heading"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="font-serif text-balance text-[clamp(2rem,4.5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] text-foreground md:col-span-9"
          >
            {copy.titleBefore}<em className="italic">{copy.titleEmphasis}</em>{copy.titleAfter}{" "}
            <span className="text-foreground-muted">
              {copy.subtitle}
            </span>
          </motion.h2>
        </div>

        {/* Cards */}
        <ul data-cms-grid={gridLayout}
          className={cn("cms-universe-cards",
            // Mobile / tablette : scroll-snap horizontal
            "scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-6",
            "-mx-6",
            // Desktop : grille 3 colonnes
            "md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 md:pb-0",
          )}
        >
          {universes.map((u, i) => (
            <UniverseCard key={u.number} universe={{ ...u.card, href: localize(`/${u.slug}`), eyebrow: u.eyebrow, title: u.title, number: u.number, ambiance: u.ambiance }} index={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function UniverseCard({
  universe,
  index,
}: {
  universe: Universe;
  index: number;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 1.2,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.12,
      }}
      className="flex-shrink-0 snap-center [width:min(85vw,420px)] md:w-auto"
    >
      <Link
        href={universe.href}
        className="group relative block aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-background-elevated"
      >
        {/* Background image / fallback gradient */}
        <CardBackground
          ambiance={universe.ambiance}
          imageSrc={universe.imageSrc}
        />

        {/* Voile assombrissant — s'allège au hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 transition-opacity duration-700 group-hover:opacity-80" />

        {/* Numéro éditorial top-left */}
        <div className="absolute left-7 top-7 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground/80">
            {universe.number}
          </span>
          <span className="h-px w-8 bg-foreground/30" />
        </div>

        {/* Flèche top-right (slide au hover) */}
        <div className="absolute right-7 top-7 flex h-10 w-10 items-center justify-center rounded-full border border-foreground/20 bg-background/20 backdrop-blur-md transition-all duration-700 group-hover:border-gold group-hover:bg-gold/10">
          <ArrowUpRight
            className="h-4 w-4 text-foreground/80 transition-all duration-500 group-hover:text-gold group-hover:-translate-y-px group-hover:translate-x-px"
            strokeWidth={1.25}
          />
        </div>

        {/* Contenu bas */}
        <div className="absolute inset-x-0 bottom-0 p-7 md:p-8">
          {/* Eyebrow */}
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
            {universe.eyebrow}
          </p>

          {/* Titre */}
          <h3 className="mb-3 font-serif text-3xl leading-[1.05] tracking-[-0.02em] text-foreground md:text-4xl">
            {universe.title}
          </h3>

          {/* Tagline */}
          <p className="font-sans text-sm text-foreground/80 md:text-base">
            {universe.tagline}
          </p>

          {/* Reveal au hover : description + highlights */}
          <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr] max-md:grid-rows-[1fr]">
            <div className="overflow-hidden">
              <div className="pt-5">
                <p className="font-sans text-[13px] leading-relaxed text-foreground-muted">
                  {universe.description}
                </p>

                <ul className="mt-5 flex flex-wrap gap-x-2 gap-y-1.5">
                  {universe.highlights.map((h) => (
                    <li
                      key={h}
                      className="rounded-full border border-foreground/15 bg-foreground/[0.04] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/80"
                    >
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Liseré or qui apparaît au hover */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-gold/0 transition-all duration-700 group-hover:ring-gold/30" />
      </Link>
    </motion.li>
  );
}

/* ---------- Background placeholder cinématique --------- */

function CardBackground({
  ambiance,
  imageSrc,
}: {
  ambiance: Universe["ambiance"];
  imageSrc: string;
}) {
  // 3 ambiances : warm (sépia chaleureux pour la mémoire/santé),
  // cold (bleu nuit broadcast), champagne (or doux pour particuliers)
  const gradient = {
    warm: `radial-gradient(ellipse 100% 70% at 30% 30%, rgba(201,140,80,0.35) 0%, transparent 55%),
           radial-gradient(ellipse 90% 60% at 70% 80%, rgba(140,75,40,0.3) 0%, transparent 50%),
           linear-gradient(180deg, #1a1108 0%, #0a0604 100%)`,
    cold: `radial-gradient(ellipse 100% 70% at 70% 30%, rgba(80,120,180,0.3) 0%, transparent 55%),
           radial-gradient(ellipse 90% 60% at 30% 80%, rgba(40,60,100,0.4) 0%, transparent 50%),
           linear-gradient(180deg, #060a14 0%, #03050a 100%)`,
    champagne: `radial-gradient(ellipse 100% 70% at 50% 30%, rgba(230,201,137,0.3) 0%, transparent 55%),
                radial-gradient(ellipse 90% 60% at 30% 90%, rgba(138,115,64,0.25) 0%, transparent 50%),
                linear-gradient(180deg, #14100a 0%, #080604 100%)`,
  }[ambiance];

  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 transition-transform duration-[1500ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
        style={{ background: gradient }}
      />
      {imageSrc && <Image
        unoptimized
        src={imageSrc}
        alt=""
        aria-hidden="true"
        fill
        sizes="(min-width: 768px) 31vw, 85vw"
        className="absolute inset-0 object-cover opacity-90 saturate-[0.9] transition-[transform,opacity,filter] duration-[1500ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06] group-hover:opacity-100 group-hover:saturate-100"
      />}
      {/* Grain subtil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
      >
        <svg
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <filter id="card-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#card-noise)" />
        </svg>
      </div>
    </>
  );
}
