"use client";

import { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronUp, X } from "lucide-react";
import { SITE } from "@/data/site";

/* ==================================================================
   Indicateur de dev : liste les champs encore en placeholder
   ([À COMPLÉTER]) dans site.ts. Visible uniquement en dev,
   silencieux en prod, fermable, mémorise le choix de l'utilisateur.
   ================================================================== */

type Issue = { label: string; path: string };

function scanIssues(): Issue[] {
  const issues: Issue[] = [];
  const isPlaceholder = (v: string | undefined | null) =>
    typeof v === "string" && v.includes("[À COMPLÉTER]");

  if (SITE.phone.includes("0 00 00 00 00")) {
    issues.push({ label: "Téléphone réel du studio", path: "site.phone" });
  }
  if (isPlaceholder(SITE.address.street)) {
    issues.push({ label: "Adresse postale", path: "site.address.street" });
  }
  if (isPlaceholder(SITE.legal.legalForm)) {
    issues.push({ label: "Forme juridique + capital", path: "site.legal.legalForm" });
  }
  if (isPlaceholder(SITE.legal.siret)) {
    issues.push({ label: "SIRET", path: "site.legal.siret" });
  }
  if (isPlaceholder(SITE.legal.vatNumber)) {
    issues.push({ label: "TVA intracommunautaire", path: "site.legal.vatNumber" });
  }
  if (isPlaceholder(SITE.legal.director)) {
    issues.push({ label: "Directeur de la publication", path: "site.legal.director" });
  }
  if (SITE.social.instagram.endsWith("/")) {
    issues.push({ label: "URL Instagram", path: "site.social.instagram" });
  }
  if (SITE.social.linkedin.endsWith("/company/")) {
    issues.push({ label: "URL LinkedIn", path: "site.social.linkedin" });
  }
  if (SITE.social.youtube.endsWith("/@")) {
    issues.push({ label: "URL YouTube", path: "site.social.youtube" });
  }
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    issues.push({
      label: "Variable d'env NEXT_PUBLIC_SITE_URL",
      path: ".env.local",
    });
  }
  return issues;
}

const STORAGE_KEY = "mzn-dev-checklist-dismissed";

function subscribeDismissed(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("mis-checklist", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("mis-checklist", callback); };
}

export function DevChecklist() {
  const [open, setOpen] = useState(false);
  const dismissed = useSyncExternalStore(subscribeDismissed, () => localStorage.getItem(STORAGE_KEY) === "1", () => true);
  const issues = scanIssues();

  // Pas affiché en prod
  if (process.env.NODE_ENV !== "development") return null;
  if (dismissed || issues.length === 0) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    window.dispatchEvent(new Event("mis-checklist"));
  };

  return (
    <div className="fixed bottom-5 right-5 z-[100] font-mono text-foreground">
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="badge"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setOpen(true)}
            className="group flex items-center gap-3 rounded-full border border-gold/30 bg-[rgba(5,5,5,0.9)] px-4 py-2.5 text-[10px] uppercase tracking-[0.28em] backdrop-blur-md transition-all hover:border-gold/60"
            aria-label="Ouvrir la checklist développement"
          >
            <span className="flex h-2 w-2 items-center justify-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-gold/40" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-gold" />
            </span>
            <span className="text-gold">{issues.length} à compléter</span>
            <ChevronUp className="h-3 w-3 text-foreground-subtle transition-transform group-hover:-translate-y-px" strokeWidth={1.5} />
          </motion.button>
        ) : (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-[340px] overflow-hidden rounded-xl border border-gold/30 bg-[rgba(5,5,5,0.95)] backdrop-blur-xl"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                <span className="text-[10px] uppercase tracking-[0.32em] text-gold">
                  Dev · à compléter
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-1 text-foreground-subtle transition-colors hover:text-foreground"
                  aria-label="Réduire"
                >
                  <ChevronUp className="h-3.5 w-3.5 rotate-180" strokeWidth={1.5} />
                </button>
                <button
                  onClick={handleDismiss}
                  className="rounded p-1 text-foreground-subtle transition-colors hover:text-foreground"
                  aria-label="Masquer pour cette session"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </header>

            <ul className="max-h-[60vh] overflow-y-auto px-5 py-4">
              {issues.map((issue) => (
                <li
                  key={issue.path}
                  className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0"
                >
                  <span className="font-sans text-[13px] text-foreground">
                    {issue.label}
                  </span>
                  <code className="text-[10px] text-foreground-subtle">
                    {issue.path}
                  </code>
                </li>
              ))}
            </ul>

            <footer className="border-t border-border px-5 py-3 text-[10px] leading-relaxed text-foreground-subtle">
              Édite{" "}
              <code className="text-foreground-muted">src/data/site.ts</code>{" "}
              pour propager partout.
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
