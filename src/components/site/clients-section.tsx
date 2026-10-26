"use client";

import { useHistoricalGrid } from "@/components/cms/historical-grid";

import { useSiteContent } from "@/components/cms/content-context";

import { motion } from "motion/react";
import { RevealText } from "@/components/motion/reveal-text";
import type { Testimonial } from "@/data/clients";
import { cn } from "@/lib/utils";

/* ==================================================================
   Section Confiance — bandeau logos clients (marquee infinite) +
   trois témoignages en grille éditoriale.
     · Marquee : 2 copies du tableau translateX(-50%) sur 50s, pause hover
     · Témoignages : guillemet géant or, citation serif italique, méta mono
     · Hairline gold animée à l'apparition de chaque card
   ================================================================== */

export function ClientsSection() {
  const gridLayout = useHistoricalGrid();
  const { clientsSection: copy, testimonials } = useSiteContent();
  return (
    <section data-cms-field="clientsSection"
      id="confiance"
      aria-labelledby="clients-heading"
      className="relative scroll-mt-24 overflow-hidden border-t border-border bg-background-elevated py-24 md:py-32"
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
            id="clients-heading"
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
      </div>

      {/* Marquee logos — full-bleed */}
      <ClientsMarquee />

      {/* Témoignages */}
      <div className="mx-auto mt-24 max-w-[1440px] px-6 md:mt-32 md:px-10">
        <ul data-cms-grid={gridLayout} className="grid gap-px border-t border-border md:grid-cols-3">
          {testimonials.map((t, i) => (
            <TestimonialCard key={t.author} testimonial={t} index={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee logos clients                                               */
/* ------------------------------------------------------------------ */

function ClientsMarquee() {
  const { clients: CLIENTS, clientsSection: copy } = useSiteContent();
  // 2 copies du tableau pour la boucle parfaite (translateX 0 → -50%)
  const items = [...CLIENTS, ...CLIENTS];

  return (
    <div
      className="group relative w-full select-none"
      aria-label={copy.clientsLabel}
    >
      {/* Fade gauche / droite pour adoucir les bords */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background-elevated to-transparent md:w-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background-elevated to-transparent md:w-40"
      />

      {/* Hairlines or top + bottom */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent"
      />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent"
      />

      <div className="overflow-hidden py-10 md:py-14">
        <div className="animate-marquee flex w-max items-center gap-12 md:gap-20 [animation-play-state:running] group-hover:[animation-play-state:paused]">
          {items.map((client, i) => (
            <div
              key={`${client.name}-${i}`}
              className="flex shrink-0 items-center gap-6"
              aria-hidden={i >= CLIENTS.length}
            >
              <span className="font-serif text-2xl tracking-[-0.01em] text-foreground/80 transition-colors duration-500 hover:text-gold md:text-[1.75rem]">
                {client.name}
              </span>
              {/* Séparateur losange or */}
              <span
                aria-hidden
                className="h-1 w-1 rotate-45 bg-gold/40"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Carte témoignage                                                    */
/* ------------------------------------------------------------------ */

function TestimonialCard({
  testimonial,
  index,
}: {
  testimonial: Testimonial;
  index: number;
}) {
  const { clientsSection: copy } = useSiteContent();
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 1,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.12,
      }}
      className={cn(
        "group relative flex flex-col gap-6 px-2 py-12 md:px-10 md:py-16",
        index > 0 && "md:border-l md:border-border",
        index > 0 && "border-t border-border md:border-t-0",
      )}
    >
      {/* Hairline gold qui se déploie au hover */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-px w-full origin-left scale-x-0 bg-gold transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
      />

      {/* Numéro + ligne or */}
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
          {copy.testimonialPrefix}{String(index + 1).padStart(2, "0")}
        </span>
        <span className="h-px w-8 bg-gold/40" />
      </div>

      {/* Guillemet géant or */}
      <span
        aria-hidden
        className="-mb-8 -ml-2 font-serif text-[6rem] leading-none tracking-tight text-gold/40 md:text-[7rem]"
      >
        &ldquo;
      </span>

      {/* Citation */}
      <blockquote className="font-serif text-[clamp(1.25rem,1.6vw,1.5rem)] italic leading-[1.35] text-foreground">
        {testimonial.quote}
      </blockquote>

      {/* Méta auteur */}
      <footer className="mt-auto flex flex-col gap-1 pt-6">
        <span className="h-px w-10 bg-gold/60" />
        <p className="mt-3 font-sans text-sm text-foreground">
          {testimonial.author}
        </p>
        <p className="font-sans text-[13px] text-foreground-muted">
          {testimonial.role}, {testimonial.organization}
        </p>
        {testimonial.project && (
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.28em] text-foreground-subtle">
            {testimonial.project} · {testimonial.year}
          </p>
        )}
      </footer>
    </motion.li>
  );
}
