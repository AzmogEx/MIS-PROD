"use client";

import { useHistoricalGrid } from "@/components/cms/historical-grid";

import { useSiteContent } from "@/components/cms/content-context";
import { useAnalytics } from "@/components/cms/analytics";

import { useState } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { RevealText } from "@/components/motion/reveal-text";
import { VideoLightbox } from "@/components/site/video-lightbox";
import type { PortfolioProject } from "@/data/portfolio";
import { cn } from "@/lib/utils";

/* ==================================================================
   Section Portfolio — grille bento éditoriale, façon magazine.
     · 1 showreel "featured" en panoramique haut de section
     · 6 projets en grid 12 cols asymétrique (rythmes 7/5, 5/7, 6/6)
     · Hover : zoom image, voile gradient, reveal description + tags
     · Liseré or au hover, flèche slide
     · Tags d'univers en eyebrow gold (warm/cold/champagne)
     · Animations motion staggered à l'apparition
   ================================================================== */

/** Couleur d'eyebrow par univers */

/** Image Picsum dimensionnée selon la forme */
function picsumUrl(seed: string, w: number, h: number) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

export function PortfolioSection() {
  const gridLayout = useHistoricalGrid();
  const analytics = useAnalytics();
  const { projects: PORTFOLIO_PROJECTS, portfolioSection: copy } = useSiteContent();
  const featured = PORTFOLIO_PROJECTS.find((p) => p.featured);
  const rest = PORTFOLIO_PROJECTS.filter((p) => !p.featured).slice(0, copy.limit);

  const [active, setActive] = useState<PortfolioProject | null>(null);

  return (
    <section data-cms-field="portfolioSection"
      id="realisations"
      aria-labelledby="portfolio-heading"
      className="relative scroll-mt-24 border-t border-border bg-background py-24 md:py-32"
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

          <h2
            id="portfolio-heading"
            className="font-serif text-balance text-[clamp(2rem,4.5vw,3.75rem)] leading-[1.05] tracking-[-0.02em] text-foreground md:col-span-9"
          >
            <RevealText immediate={false} stagger={0.05} className="block">
              {copy.titleBefore}<em className="italic">{copy.titleEmphasis}</em>{copy.titleAfter}
            </RevealText>
            <RevealText
              immediate={false}
              stagger={0.05}
              delay={0.2}
              className="block text-foreground-muted"
            >
              {copy.subtitle}
            </RevealText>
          </h2>
        </div>

        {/* Showreel featured */}
        {featured && (
          <FeaturedCard
            project={featured}
            onPlay={() => { analytics.track('project_view', { reference: `project:${featured.slug}` }); setActive(featured); }}
          />
        )}

        {/* Grille des projets */}
        <ul data-cms-grid={gridLayout} className="mt-6 grid gap-4 md:mt-8 md:grid-cols-12 md:gap-5">
          {rest.map((project, i) => (
            <ProjectCard
              key={project.slug}
              project={project}
              index={i}
              onPlay={() => { analytics.track('project_view', { reference: `project:${project.slug}` }); setActive(project); }}
            />
          ))}
        </ul>

        {/* Lien voir tous les projets */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 flex items-center justify-center md:mt-24"
        >
          <Link
            href={copy.ctaHref}
            className="group inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.32em] text-foreground-muted transition-colors hover:text-gold"
          >
            <span className="h-px w-8 bg-foreground-muted/40 transition-all duration-500 group-hover:w-16 group-hover:bg-gold" />
            <span>{copy.ctaLabel}</span>
            <ArrowUpRight
              className="h-3.5 w-3.5 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              strokeWidth={1.25}
            />
          </Link>
        </motion.div>
      </div>

      {/* Lightbox vidéo OU image */}
      <VideoLightbox
        open={active !== null}
        onClose={() => setActive(null)}
        videoSrc={active?.videoSrc}
        imageSrc={
          active && !active.videoSrc
            ? active.imageSrc || picsumUrl(active.seed, 2400, 1600)
            : undefined
        }
        alt={active ? active.alt || `${active.title} — ${active.client}` : undefined}
        title={active?.title}
        subtitle={active?.client}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Showreel featured — full width, aspect 21/9 desktop                */
/* ------------------------------------------------------------------ */

function FeaturedCard({
  project,
  onPlay,
}: {
  project: PortfolioProject;
  onPlay: () => void;
}) {
  const { portfolioSection: copy } = useSiteContent();
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <CardShell
        onOpen={onPlay}
        ariaLabel={`${copy.openLabel} ${project.title}`}
        className="group relative block aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border bg-background-elevated md:aspect-[21/9]"
      >
        <Image
          unoptimized={Boolean(project.imageSrc)}
          src={project.imageSrc || picsumUrl(project.seed, 2400, 1100)}
          alt={project.alt || `${project.title} — ${project.client}`}
          fill
          priority
          sizes="(min-width: 1280px) 1400px, 100vw"
          className="object-cover transition-transform duration-[1500ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
        />

        {/* Voile assombrissant */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40 transition-opacity duration-700 group-hover:from-black/85" />

        {/* Grain subtil */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        >
          <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice">
            <filter id="featured-noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves="2"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#featured-noise)" />
          </svg>
        </div>

        {/* Eyebrow + numéro */}
        <div className="absolute left-7 top-7 flex items-center gap-3 md:left-10 md:top-10">
          <span className="h-px w-8 bg-gold md:w-12" />
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
            {copy.showreelLabel} · {project.year}
          </span>
        </div>

        {/* Durée top-right */}
        {project.duration && (
          <div className="absolute right-7 top-7 hidden font-mono text-[10px] uppercase tracking-[0.32em] text-foreground/70 md:right-10 md:top-10 md:block">
            {project.duration}
          </div>
        )}

        {/* Bouton play centré */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center md:h-24 md:w-24">
            {/* Halo or pulsé */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-gold/20 blur-2xl transition-all duration-700 group-hover:scale-125 group-hover:bg-gold/40"
            />
            {/* Anneau extérieur */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border border-foreground/30 transition-all duration-700 group-hover:scale-110 group-hover:border-gold/80"
            />
            {/* Disque central */}
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-md transition-all duration-700 group-hover:bg-gold md:h-16 md:w-16">
              <Play
                className="h-5 w-5 translate-x-0.5 text-foreground transition-colors duration-500 group-hover:text-background"
                strokeWidth={1.5}
                fill="currentColor"
              />
            </span>
          </div>
        </div>

        {/* Bloc bas — titre + meta */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-7 md:flex-row md:items-end md:justify-between md:p-10">
          <div>
            <h3 className="font-serif text-3xl leading-[1.05] tracking-[-0.02em] text-foreground md:text-5xl lg:text-6xl">
              {project.title}
            </h3>
            <p className="mt-2 font-serif text-base italic text-foreground-muted md:mt-3 md:text-lg">
              {project.client}
            </p>
          </div>

          <ul className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-foreground/15 bg-background/40 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-foreground/80 backdrop-blur-md"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>

        {/* Liseré or au hover */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-gold/0 transition-all duration-700 group-hover:ring-gold/30" />
      </CardShell>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* CardShell — bouton si vidéo dispo, lien d'ancre sinon              */
/* ------------------------------------------------------------------ */

function CardShell({
  onOpen,
  ariaLabel,
  className,
  children,
}: {
  onOpen: () => void;
  ariaLabel: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className={cn("cursor-pointer text-left", className)}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Project card — col-span + aspect ratio dictés par la position       */
/* ------------------------------------------------------------------ */

/** Pattern desktop : alterne 7/5, 5/7, 6/6 sur 12 cols, par paire de lignes. */
const COL_SPANS = [
  "md:col-span-7",
  "md:col-span-5",
  "md:col-span-5",
  "md:col-span-7",
  "md:col-span-6",
  "md:col-span-6",
];

const ASPECTS = [
  "aspect-[16/10]",
  "aspect-[3/4]",
  "aspect-[3/4]",
  "aspect-[16/10]",
  "aspect-[4/3]",
  "aspect-[4/3]",
];

function ProjectCard({
  project,
  index,
  onPlay,
}: {
  project: PortfolioProject;
  index: number;
  onPlay: () => void;
}) {
  const { portfolioSection: copy, universes } = useSiteContent();
  const colSpan = COL_SPANS[index % COL_SPANS.length];
  const aspect = ASPECTS[index % ASPECTS.length];

  return (
    <motion.li
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 1.1,
        ease: [0.16, 1, 0.3, 1],
        delay: (index % 2) * 0.12,
      }}
      className={cn("col-span-12", colSpan)}
    >
      <CardShell
        onOpen={onPlay}
        ariaLabel={`${copy.openLabel} ${project.title} ${copy.forLabel} ${project.client}`}
        className={cn(
          "group relative block w-full overflow-hidden rounded-2xl border border-border bg-background-elevated",
          aspect,
        )}
      >
        <Image
          unoptimized={Boolean(project.imageSrc)}
          src={project.imageSrc || picsumUrl(
            project.seed,
            project.shape === "tall" ? 900 : 1400,
            project.shape === "tall" ? 1200 : project.shape === "square" ? 1050 : 880,
          )}
          alt={project.alt || `${project.title} — ${project.client}`}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-[1500ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
        />

        {/* Voile gradient bas → haut */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10 transition-opacity duration-700 group-hover:from-black/90" />

        {/* Grain */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        >
          <svg className="h-full w-full" preserveAspectRatio="xMidYMid slice">
            <filter id={`pf-noise-${project.slug}`}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves="2"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect
              width="100%"
              height="100%"
              filter={`url(#pf-noise-${project.slug})`}
            />
          </svg>
        </div>

        {/* Numéro éditorial top-left */}
        <div className="absolute left-6 top-6 flex items-center gap-3 md:left-7 md:top-7">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-foreground/80">
            {project.number}
          </span>
          <span className="h-px w-8 bg-foreground/30" />
        </div>

        {/* Flèche top-right */}
        <div className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-foreground/20 bg-background/30 backdrop-blur-md transition-all duration-700 group-hover:border-gold group-hover:bg-gold/10 md:right-7 md:top-7">
          <ArrowUpRight
            className="h-3.5 w-3.5 text-foreground/80 transition-all duration-500 group-hover:text-gold group-hover:-translate-y-px group-hover:translate-x-px"
            strokeWidth={1.25}
          />
        </div>

        {/* Bloc bas — meta + titre */}
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
          {/* Eyebrow univers */}
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
            {universes.find(universe => universe.slug === project.universe)?.eyebrow ?? project.universe}
          </p>

          {/* Titre */}
          <h3 className="mb-1 font-serif text-2xl leading-[1.05] tracking-[-0.02em] text-foreground md:text-3xl">
            {project.title}
          </h3>

          {/* Client */}
          <p className="font-serif text-sm italic text-foreground-muted md:text-base">
            {project.client}
          </p>

          {/* Format · année (visible) */}
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/60">
            {project.format} · {project.year}
          </p>

          {/* Reveal au hover : description + tags */}
          <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr] max-md:grid-rows-[1fr]">
            <div className="overflow-hidden">
              <div className="pt-4">
                <p className="max-w-md font-sans text-[13px] leading-relaxed text-foreground-muted">
                  {project.description}
                </p>
                <ul className="mt-4 flex flex-wrap gap-x-2 gap-y-1.5">
                  {project.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-foreground/15 bg-foreground/[0.04] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/80"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Liseré or au hover */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-gold/0 transition-all duration-700 group-hover:ring-gold/30" />
      </CardShell>
    </motion.li>
  );
}
