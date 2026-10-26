"use client";

import { useSiteContent } from "@/components/cms/content-context";

import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useRef } from "react";

/**
 * Fond de la Hero. Trois couches empilées :
 *  1. Vidéo (ou fallback gradient animé si absente)
 *  2. Vignettage radial pour pousser le regard vers le centre
 *  3. Grain SVG très subtil pour le rendu "pellicule"
 *
 * Parallax : la couche vidéo se translate de 0 → -120px sur la
 * première fenêtre de scroll, créant une dérive cinématographique
 * pendant que le texte sort plus vite.
 */
export function HeroBackground({ videoSrc }: { videoSrc?: string }) {
  const { hero: copy } = useSiteContent();
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.4]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="absolute inset-0 overflow-hidden bg-background"
    >
      {/* Couche 1 — vidéo / fallback */}
      <motion.div
        style={reducedMotion ? undefined : { y, scale, opacity }}
        className="absolute inset-0 h-[110%] w-full"
      >
        {videoSrc ? (
          <video
            data-mis-analytics="auto"
            src={videoSrc}
            autoPlay={copy.autoplay && !reducedMotion}
            poster={copy.poster || undefined}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
            style={{ backgroundColor: "#050505" }}
            aria-label={copy.backgroundLabel}
          />
        ) : (
          <FallbackGradient />
        )}
      </motion.div>

      {/* Couche 2 — vignettage radial cinéma (allégé pour laisser respirer la vidéo) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 45%, rgba(5,5,5,0.55) 80%, rgba(5,5,5,0.88) 100%)",
        }}
      />

      {/* Couche 3 — dégradé sombre haut (nav) + bas (CTA / timecode), milieu transparent */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/15 to-background/90" />

      {/* Couche 4 — grain SVG très discret */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay">
        <Grain />
      </div>
    </div>
  );
}

/* ---------- Fallback gradient animé (en attendant la vidéo) --------- */

function FallbackGradient() {
  return (
    <div className="relative h-full w-full">
      {/* Gradient principal mouvant */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(201,169,97,0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 70% 60%, rgba(201,169,97,0.08) 0%, transparent 50%), #050505",
            "radial-gradient(ellipse 80% 60% at 60% 50%, rgba(201,169,97,0.18) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 30% 70%, rgba(201,169,97,0.10) 0%, transparent 50%), #050505",
            "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(201,169,97,0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 70% 60%, rgba(201,169,97,0.08) 0%, transparent 50%), #050505",
          ],
        }}
        transition={{ duration: 14, ease: "easeInOut", repeat: Infinity }}
      />
      {/* Lignes de lumière diagonales très subtiles */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 0%, transparent 40%, rgba(245,243,238,0.4) 50%, transparent 60%, transparent 100%)",
          backgroundSize: "300% 300%",
          animation: "shimmer 18s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
        }
      `}</style>
    </div>
  );
}

/* ---------- Grain SVG cinéma --------- */

function Grain() {
  return (
    <svg
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <filter id="hero-noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#hero-noise)" />
    </svg>
  );
}
