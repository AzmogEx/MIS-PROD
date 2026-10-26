"use client";

import { useSiteContent } from "@/components/cms/content-context";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";
import { HeroBackground } from "@/components/site/hero-background";
import { RevealText } from "@/components/motion/reveal-text";


/* ---------------------------------------------------------------
   Hero — 100vh, slogan sur 3 lignes en serif, animation séquencée
   accélérée (gain ~1s sur la version précédente) :
     1. Eyebrow à 0.15s
     2. Slogan ligne 1 à 0.4s
     3. Slogan ligne 2 à 0.85s
     4. Slogan ligne 3 à 1.3s
     5. CTA + scroll indicator à 1.8s

   En signature broadcast : timecode mono live en bas à gauche,
   indicateur REC pulsé à droite. Ces détails posent l'univers
   "régie TV" sans crier.
   --------------------------------------------------------------- */

export function HeroSection({ headingLevel = 1 }: { headingLevel?: 1 | 2 }) {
  const { site: SITE, hero: copy } = useSiteContent();
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <section data-cms-field="hero" className="relative h-screen min-h-[700px] w-full overflow-hidden">
      <HeroBackground videoSrc={SITE.hero.videoUrl} />

      <div className="relative z-10 mx-auto flex h-full max-w-[1440px] flex-col justify-center px-6 md:px-10">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="mb-10 flex items-center gap-4 md:mb-14"
        >
          <span className="h-px w-12 bg-gold md:w-20" />
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
            {copy.studioLabel} · {SITE.city} · {SITE.foundedYear}
          </span>
        </motion.div>

        {/* Slogan — 3 lignes serif, italique sur les verbes */}
        <Heading className="font-serif text-balance text-[clamp(2.75rem,8vw,7.5rem)] font-normal leading-[1.02] tracking-[-0.02em] text-foreground">
          <RevealText as="span" delay={0.4} stagger={0.06} className="block">
            <em className="italic">{copy.firstVerb}</em>
            {copy.firstRest}
          </RevealText>
          <RevealText as="span" delay={0.85} stagger={0.06} className="block">
            <em className="italic">{copy.secondVerb}</em>
            {copy.secondRest}
          </RevealText>
          <RevealText
            as="span"
            delay={1.3}
            stagger={0.06}
            className="block text-foreground-muted"
          >
            <em className="italic text-foreground">{copy.thirdVerb}</em>{copy.thirdRest}
          </RevealText>
        </Heading>

        {/* CTA + meta bas */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 1.8 }}
          className="mt-14 flex flex-col items-start gap-8 md:mt-20 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-6">
            <Link
              href={copy.showreelHref}
              className="group relative inline-flex h-14 items-center gap-3 overflow-hidden rounded-full border border-border-strong bg-foreground/[0.02] px-7 font-mono text-[11px] uppercase tracking-[0.28em] text-foreground backdrop-blur-md transition-all duration-700 hover:border-gold hover:bg-gold/[0.08] hover:text-gold"
            >
              <span className="relative z-10">{copy.showreelLabel}</span>
              <span className="relative z-10 transition-transform duration-500 group-hover:translate-x-1">
                →
              </span>
              {/* glow gold au hover */}
              <span className="absolute inset-0 -z-0 opacity-0 blur-xl transition-opacity duration-700 group-hover:opacity-100 bg-gold/30" />
            </Link>

            <Link
              href={copy.universesHref}
              className="group hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-foreground-muted transition-colors hover:text-foreground md:inline-flex"
            >
              <span className="h-px w-6 bg-foreground-muted/40 transition-all duration-500 group-hover:w-12 group-hover:bg-gold" />
              <span>{copy.universesLabel}</span>
            </Link>
          </div>

          <ScrollIndicator />
        </motion.div>

        {/* Coin droit haut — REC broadcast indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="absolute right-6 top-32 hidden flex-col items-end gap-3 md:right-10 md:flex"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/60 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-foreground/80">
              {copy.onAirLabel}
            </span>
          </div>
          <span className="h-8 w-px bg-foreground-subtle/30" />
          <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-foreground-subtle">
            {copy.studioEyebrow}
          </span>
        </motion.div>

        {/* Coin gauche bas — timecode broadcast live */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.1 }}
          className="absolute bottom-8 left-6 hidden items-center gap-3 md:left-10 md:flex"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-foreground-subtle">
            {copy.liveLabel}
          </span>
          {copy.showTimecode && <Timecode />}
        </motion.div>
      </div>
    </section>
  );
}

function ScrollIndicator() {
  const { hero: copy } = useSiteContent();
  return (
    <div className="flex items-center gap-3 self-end md:self-auto">
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
    </div>
  );
}

/**
 * Timecode broadcast HH:MM:SS:FF (FF = frame, 24fps).
 * Mis à jour 4× par seconde côté client uniquement (perf).
 * Initialisé à null pour éviter le mismatch SSR.
 */
function Timecode() {
  const [tc, setTc] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      // Frame approximative (24fps) basée sur les ms
      const ff = String(Math.floor((now.getMilliseconds() / 1000) * 24)).padStart(2, "0");
      setTc(`${hh}:${mm}:${ss}:${ff}`);
    };
    update();
    const id = window.setInterval(update, 250);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-[10px] tabular-nums tracking-[0.18em] text-gold/80">
      {tc ?? "00:00:00:00"}
    </span>
  );
}
