"use client";

import { useSiteContent } from "@/components/cms/content-context";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

/* ==================================================================
   MediaLightbox — modale plein-écran pour vidéo OU image.
   - `videoSrc` prioritaire → lecture vidéo (autoplay + controls)
   - sinon `imageSrc` → image agrandie centrée
   - Fermeture par Escape / clic backdrop / bouton X
   - Verrouille le scroll de la page
   ================================================================== */

export type MediaLightboxProps = {
  open: boolean;
  onClose: () => void;
  /** Vidéo MP4 — si présente, prend le pas sur l'image */
  videoSrc?: string;
  /** Image — utilisée si videoSrc absent */
  imageSrc?: string;
  /** Poster pour la vidéo (image affichée avant lecture) */
  poster?: string;
  /** Texte alternatif pour l'image */
  alt?: string;
  title?: string;
  subtitle?: string;
};

export function VideoLightbox({
  open,
  onClose,
  videoSrc,
  imageSrc,
  poster,
  alt,
  title,
  subtitle,
}: MediaLightboxProps) {
  const { ui: copy } = useSiteContent();
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Fermeture Escape + lock du scroll
  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialog) {
        const targets = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], video[controls], [tabindex="0"]')];
        const first = targets[0]; const last = targets[targets.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Autoplay vidéo si présente
    const v = videoRef.current;
    if (v && videoSrc) {
      v.currentTime = 0;
      v.play().catch(() => {
        /* autoplay refusé : l'utilisateur cliquera */
      });
    }

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
      if (v) {
        v.pause();
        v.currentTime = 0;
      }
    };
  }, [open, onClose, videoSrc]);

  const isVideo = Boolean(videoSrc);
  const hasMedia = isVideo || Boolean(imageSrc);

  return (
    <AnimatePresence>
      {open && hasMedia && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={title ?? (isVideo ? copy.videoLabel : copy.imageLabel)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xl"
          onClick={onClose}
        >
          {/* Bouton fermeture */}
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.closeLabel}
            className="absolute right-5 top-5 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-foreground/20 bg-background/40 text-foreground backdrop-blur-md transition-all duration-500 hover:border-gold hover:bg-gold/10 hover:text-gold md:right-8 md:top-8"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>

          {/* Conteneur média */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[1400px] px-5 md:px-10"
          >
            <div
              className={
                isVideo
                  ? "relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black shadow-[0_30px_120px_-20px_rgba(0,0,0,0.8)]"
                  : "relative mx-auto flex max-h-[80vh] w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-black shadow-[0_30px_120px_-20px_rgba(0,0,0,0.8)]"
              }
            >
              {isVideo ? (
                <video
                  data-mis-analytics="manual"
                  ref={videoRef}
                  src={videoSrc}
                  poster={poster}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt={alt ?? title ?? ""}
                  className="max-h-[80vh] w-auto max-w-full object-contain"
                />
              )}
            </div>

            {/* Légende */}
            {(title || subtitle) && (
              <div className="mt-6 flex flex-col items-center text-center md:mt-8">
                {title && (
                  <h3 className="font-serif text-2xl leading-tight tracking-[-0.01em] text-foreground md:text-3xl">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="mt-2 font-serif text-base italic text-foreground-muted md:text-lg">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
