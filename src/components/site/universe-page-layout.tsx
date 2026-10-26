"use client";

import { useHistoricalGrid } from "@/components/cms/historical-grid";

import { useSiteContent } from "@/components/cms/content-context";

import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { RevealText } from "@/components/motion/reveal-text";
import { CtaSection } from "@/components/site/cta-section";
import { VideoLightbox } from "@/components/site/video-lightbox";
import { useAnalytics } from "@/components/cms/analytics";
import { cn } from "@/lib/utils";
import type { Universe } from "@/data/universes";

/** Construit une URL Picsum stable à partir du seed + ratio voulu. */
function picsumUrl(seed: string, w: number, h: number) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

/* ==================================================================
   Template page univers — réutilisé par /institutions /entreprises
   /particuliers. Sections :
     1. Hero ciblé (titre + sous-titre + scroll indicator) — palette
        spécifique selon ambiance
     2. Manifeste (intro + pitch)
     3. Formules / services en liste élégante avec bordures fines
     4. Galerie portfolio masonry (placeholders gradients)
     5. CTA finale
   ================================================================== */

export function UniversePageLayout({
  universe,
  afterFormulas,
  headingLevel = 1,
}: {
  universe: Universe;
  headingLevel?: 1 | 2;
  /** Slot optionnel inséré entre la grille de formules et le portfolio. */
  afterFormulas?: ReactNode;
}) {
  return (
    <div className="relative">
      <UniverseHero universe={universe} headingLevel={headingLevel} />
      <UniverseManifesto universe={universe} />
      <UniverseFormulas universe={universe} />
      {afterFormulas}
      <UniversePortfolio universe={universe} />
      <CtaSection />
    </div>
  );
}

/* ---------------------- 1. Hero ciblé --------------------- */

function UniverseHero({ universe, headingLevel }: { universe: Universe; headingLevel: 1 | 2 }) {
  const { universeTemplate: copy } = useSiteContent();
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);

  return (
    <section
      ref={ref}
      className="relative h-screen min-h-[700px] w-full overflow-hidden"
    >
      {/* Background ambiance */}
      <motion.div style={{ y, opacity }} className="absolute inset-0">
        <AmbianceBackground ambiance={universe.ambiance} />
      </motion.div>

      {/* Voile lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/30 to-background" />

      {/* Contenu hero */}
      <div className="relative z-10 mx-auto flex h-full max-w-[1440px] flex-col justify-center px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="mb-10 flex items-center gap-4 md:mb-14"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-foreground-subtle">
            ({universe.number})
          </span>
          <span className="h-px w-12 bg-gold md:w-20" />
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
            {universe.eyebrow}
          </span>
        </motion.div>

        <Heading className="font-serif text-balance text-[clamp(2.75rem,8vw,7.5rem)] leading-[1.02] tracking-[-0.02em] text-foreground">
          <RevealText delay={0.6} stagger={0.07} className="block">
            {universe.title}
          </RevealText>
        </Heading>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 1.4 }}
          className="mt-10 max-w-2xl font-serif text-xl italic text-foreground-muted md:text-2xl"
        >
          {universe.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 2 }}
          className="mt-16 flex items-center gap-3"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-foreground-subtle">
            {copy.scrollLabel}
          </span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="text-foreground-subtle"
          >
            <ArrowDown className="h-3 w-3" strokeWidth={1.25} />
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------------- Background ambiance --------------------- */

function AmbianceBackground({ ambiance }: { ambiance: Universe["ambiance"] }) {
  const gradient = {
    warm: `radial-gradient(ellipse 80% 60% at 30% 30%, rgba(201,140,80,0.28) 0%, transparent 60%),
           radial-gradient(ellipse 70% 50% at 75% 75%, rgba(140,75,40,0.22) 0%, transparent 50%),
           linear-gradient(180deg, #1a1108 0%, #050505 100%)`,
    cold: `radial-gradient(ellipse 80% 60% at 70% 30%, rgba(80,120,180,0.25) 0%, transparent 60%),
           radial-gradient(ellipse 70% 50% at 25% 80%, rgba(40,60,100,0.3) 0%, transparent 50%),
           linear-gradient(180deg, #060a14 0%, #050505 100%)`,
    champagne: `radial-gradient(ellipse 80% 60% at 50% 30%, rgba(230,201,137,0.22) 0%, transparent 60%),
                radial-gradient(ellipse 70% 50% at 30% 90%, rgba(138,115,64,0.2) 0%, transparent 50%),
                linear-gradient(180deg, #14100a 0%, #050505 100%)`,
  }[ambiance];

  return (
    <>
      <motion.div
        className="absolute inset-0"
        style={{ background: gradient }}
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <filter id="universe-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#universe-noise)" />
        </svg>
      </div>
    </>
  );
}

/* ---------------------- 2. Manifeste --------------------- */

function UniverseManifesto({ universe }: { universe: Universe }) {
  const { universeTemplate: copy } = useSiteContent();
  return (
    <section className="border-t border-border bg-background py-24 md:py-40">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono text-[10px] uppercase tracking-[0.4em] text-foreground-subtle md:col-span-3"
          >
            {copy.manifestoEyebrow}
          </motion.p>

          <div className="md:col-span-9">
            <h2 className="font-serif text-[clamp(1.875rem,3.8vw,3rem)] leading-[1.15] tracking-[-0.01em] text-foreground">
              <RevealText immediate={false} stagger={0.04}>
                {universe.pitch}
              </RevealText>
            </h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
              className="mt-10 max-w-2xl font-sans text-[15px] leading-relaxed text-foreground-muted md:text-base"
            >
              {universe.intro}
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------- 3. Formules --------------------- */

function UniverseFormulas({ universe }: { universe: Universe }) {
  const { universeTemplate: copy } = useSiteContent();
  return (
    <section className="border-t border-border bg-background py-24 md:py-32">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="mb-16 grid gap-8 md:mb-24 md:grid-cols-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-foreground-subtle md:col-span-3">
            {copy.formulasEyebrow}
          </p>
          <h2 className="font-serif text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-foreground md:col-span-9">
            <em className="italic">{copy.formulasEmphasis}</em>{copy.formulasTitle}
          </h2>
        </div>

        <ul className="border-t border-border">
          {universe.formulas.map((formula, i) => (
            <FormulaRow
              key={formula.number}
              formula={formula}
              index={i}
              total={universe.formulas.length}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

function FormulaRow({
  formula,
  index,
}: {
  formula: Universe["formulas"][number];
  index: number;
  total: number;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 1,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.06,
      }}
      className="group relative border-b border-border"
    >
      {/* Hairline gold qui se déploie au hover */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-px w-full origin-left scale-x-0 bg-gold transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
      />

      <div className="grid gap-8 py-10 md:grid-cols-12 md:gap-10 md:py-14">
        {/* Numéro */}
        <div className="md:col-span-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground-subtle transition-colors group-hover:text-gold">
            {formula.number}
          </span>
        </div>

        {/* Titre + description */}
        <div className="md:col-span-6">
          <h3 className="mb-4 font-serif text-2xl leading-tight text-foreground transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2 md:text-3xl">
            {formula.title}
          </h3>
          <p className="max-w-md font-sans text-sm leading-relaxed text-foreground-muted md:text-[15px]">
            {formula.description}
          </p>
        </div>

        {/* Bullets + meta */}
        <div className="md:col-span-4">
          <ul className="space-y-2">
            {formula.bullets.map((b) => (
              <li
                key={b}
                className="flex gap-3 font-sans text-[13px] leading-relaxed text-foreground-muted"
              >
                <span className="mt-2 inline-block h-px w-3 flex-shrink-0 bg-gold/60" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {formula.meta && (
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
              {formula.meta}
            </p>
          )}
        </div>
      </div>
    </motion.li>
  );
}

/* ---------------------- 4. Portfolio masonry --------------------- */

function UniversePortfolio({ universe }: { universe: Universe }) {
  const gridLayout = useHistoricalGrid();
  const analytics = useAnalytics();
  const { universeTemplate: copy } = useSiteContent();
  const [active, setActive] = useState<Universe["portfolio"][number] | null>(
    null,
  );

  return (
    <section className="border-t border-border bg-background-elevated py-24 md:py-32">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="mb-16 grid gap-8 md:mb-24 md:grid-cols-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-foreground-subtle md:col-span-3">
            {copy.portfolioEyebrow}
          </p>
          <h2 className="font-serif text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-foreground md:col-span-9">
            <em className="italic">{copy.portfolioEmphasis}</em>{copy.portfolioTitle}{" "}
            <span className="text-foreground-muted">
              {copy.portfolioSubtitle}
            </span>
          </h2>
        </div>

        {/* Masonry CSS columns — fluide, ne casse pas le ratio des items */}
        <div data-cms-grid={gridLayout} className="cms-universe-gallery columns-1 gap-5 md:columns-2 lg:columns-3">
          {universe.portfolio.map((item, i) => (
            <PortfolioCard
              key={item.title}
              item={item}
              index={i}
              onPlay={() => { analytics.track('project_view', { reference: `universe:${universe.slug}:${item.seed}` }); setActive(item); }}
            />
          ))}
        </div>

        <div className="mt-20 flex justify-center">
          <Link
            href={copy.portfolioHref}
            className="group inline-flex h-14 items-center gap-3 rounded-full border border-border-strong px-7 font-mono text-[11px] uppercase tracking-[0.28em] text-foreground transition-all duration-700 hover:border-gold hover:text-gold"
          >
            {copy.portfolioCta}
            <ArrowUpRight
              className="h-4 w-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              strokeWidth={1.5}
            />
          </Link>
        </div>
      </div>

      <VideoLightbox
        open={active !== null}
        onClose={() => setActive(null)}
        videoSrc={active?.videoSrc}
        imageSrc={
          active && !active.videoSrc
            ? active.imageSrc || picsumUrl(active.seed, 2000, 1500)
            : undefined
        }
        alt={active ? active.alt || `${active.title} — ${active.category}` : undefined}
        title={active?.title}
        subtitle={active?.category}
      />
    </section>
  );
}

function PortfolioCard({
  item,
  index,
  onPlay,
}: {
  item: Universe["portfolio"][number];
  index: number;
  onPlay: () => void;
}) {
  const { universeTemplate: copy } = useSiteContent();
  const dims = {
    tall: { w: 800, h: 1066, cls: "aspect-[3/4]" },
    wide: { w: 800, h: 600, cls: "aspect-[4/3]" },
    square: { w: 800, h: 800, cls: "aspect-square" },
  }[item.shape];

  const tint = {
    warm: "linear-gradient(135deg, rgba(201,140,80,0.18) 0%, rgba(20,12,5,0.6) 100%)",
    cold: "linear-gradient(135deg, rgba(80,120,180,0.18) 0%, rgba(8,12,25,0.6) 100%)",
    champagne:
      "linear-gradient(135deg, rgba(230,201,137,0.18) 0%, rgba(20,16,8,0.6) 100%)",
  }[item.ambiance];

  return (
    <motion.figure
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 1.1,
        ease: [0.16, 1, 0.3, 1],
        delay: (index % 3) * 0.08,
      }}
      className={cn(
        "group relative mb-5 inline-block w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-background-elevated",
        dims.cls,
      )}
      onClick={onPlay}
      role="button"
      tabIndex={0}
      aria-label={`${copy.openLabel} ${item.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay();
        }
      }}
    >
      {/* Image avec parallax-zoom au hover */}
      <div className="absolute inset-0 transition-transform duration-[1500ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]">
        <Image
          unoptimized={Boolean(item.imageSrc)}
          src={item.imageSrc || picsumUrl(item.seed, dims.w, dims.h)}
          alt={item.alt || `${item.title} — ${item.category}`}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
          loading={index < 3 ? "eager" : "lazy"}
        />
      </div>

      {/* Tint d'ambiance — donne la couleur de l'univers */}
      <div
        aria-hidden
        className="absolute inset-0 mix-blend-multiply"
        style={{ background: tint }}
      />

      {/* Voile sombre + dégradé bas pour lisibilité texte */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 transition-opacity duration-700 group-hover:opacity-70" />

      {/* Bouton play éphémère */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-foreground/20 bg-background/30 backdrop-blur-md transition-all duration-700 group-hover:border-gold group-hover:bg-gold/10">
          <span className="ml-0.5 h-0 w-0 border-y-[7px] border-l-[12px] border-y-transparent border-l-foreground transition-colors duration-500 group-hover:border-l-gold" />
        </span>
      </div>

      <figcaption className="absolute inset-x-0 bottom-0 p-5">
        <span className="block font-mono text-[9px] uppercase tracking-[0.32em] text-gold">
          {item.category}
        </span>
        <span className="mt-1.5 block font-serif text-base leading-tight text-foreground md:text-lg">
          {item.title}
        </span>
      </figcaption>
    </motion.figure>
  );
}
