"use client";

import { lazy, Suspense, type CSSProperties, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import type { TextFieldClientComponent, TextFieldClientProps } from "payload";
import { defaultContent, type SiteContent } from "@/cms/seed-content";

const serifFonts: Record<string, string> = { georgia: "Georgia, serif", palatino: '"Palatino Linotype", Palatino, serif', times: '"Times New Roman", Times, serif' };
const sansFonts: Record<string, string> = { system: "system-ui, -apple-system, sans-serif", arial: "Arial, Helvetica, sans-serif", verdana: "Verdana, Geneva, sans-serif" };
type AppearanceStyle = CSSProperties & Record<`--${string}`, string | number>;

/** Restrict values again at render time, including old imports and previews. */
export function appearanceStyle(content: Pick<SiteContent, "appearance">): AppearanceStyle {
  const input = content.appearance ?? defaultContent.appearance;
  const fallback = defaultContent.appearance;
  const color = (name: keyof typeof fallback): string => /^#[0-9a-f]{6}$/i.test(String(input[name])) ? String(input[name]) : String(fallback[name]);
  const scale = Number.isFinite(input.spacingScale) ? Math.max(0.8, Math.min(1.4, input.spacingScale)) : 1;
  const foreground = color("foreground");
  const rgb = [foreground.slice(1, 3), foreground.slice(3, 5), foreground.slice(5, 7)].map(part => parseInt(part, 16)).join(", ");
  return {
    "--gold": color("gold"), "--gold-bright": color("goldBright"), "--gold-deep": color("goldDeep"),
    "--background": color("background"), "--background-elevated": color("backgroundElevated"), "--background-subtle": color("backgroundSubtle"),
    "--foreground": foreground, "--foreground-muted": color("foregroundMuted"), "--foreground-subtle": color("foregroundSubtle"),
    "--border": `rgba(${rgb}, 0.08)`, "--border-strong": `rgba(${rgb}, 0.16)`, "--spacing": `${0.25 * scale}rem`,
    ...(serifFonts[input.serifFont] ? { "--font-serif-display": serifFonts[input.serifFont] } : {}),
    ...(sansFonts[input.sansFont] ? { "--font-sans-display": sansFonts[input.sansFont] } : {}),
    minHeight: "100dvh", backgroundColor: "var(--background)", color: "var(--foreground)", fontFamily: "var(--font-sans-display), system-ui, sans-serif",
  };
}

const staticStyles = `
.mis-global-appearance[data-animations="off"] *, .mis-global-appearance[data-animations="off"] *::before, .mis-global-appearance[data-animations="off"] *::after { animation: none !important; transition-duration: 0s !important; scroll-behavior: auto !important; }
.mis-global-appearance[data-animations="off"] [style*="transform"] { transform: none !important; }
.mis-global-appearance[data-animations="off"] [style*="opacity"] { opacity: 1 !important; }
@media (prefers-reduced-motion: reduce) {
  .mis-global-appearance *, .mis-global-appearance *::before, .mis-global-appearance *::after { animation: none !important; transition-duration: 0s !important; scroll-behavior: auto !important; }
  .mis-global-appearance [style*="transform"] { transform: none !important; }
  .mis-global-appearance [style*="opacity"] { opacity: 1 !important; }
}
`;

export function GlobalAppearance({ content, children }: { content: SiteContent; children: ReactNode }) {
  return <div className="mis-global-appearance" data-animations={content.appearance.animations ? "on" : "off"} style={appearanceStyle(content)}>
    <style>{staticStyles}</style>
    <MotionConfig reducedMotion={content.appearance.animations ? "user" : "always"}>{children}</MotionConfig>
  </div>;
}

// The administration dependency is loaded only when the color picker is mounted.
// Public pages importing GlobalAppearance do not fetch the Payload UI bundle.
const LazyColorField = lazy(async () => {
  const { useField, FieldLabel } = await import("@payloadcms/ui");
  function ColorInput({ path, field, readOnly }: TextFieldClientProps) {
    const { value, setValue, showError, errorMessage, disabled } = useField<string>({ path, validate: input => (typeof input === "string" && /^#[0-9a-f]{6}$/i.test(input)) || "Choisissez une couleur valide au format #RRGGBB." });
    const valid = /^#[0-9a-f]{6}$/i.test(value ?? "");
    return <div className="field-type text" style={{ marginBottom: "1.5rem" }}>
      <FieldLabel htmlFor={`field-${path}`} label={field.label} required={field.required} />
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <input id={`field-${path}`} type="color" value={valid ? value : "#050505"} disabled={readOnly || disabled} onChange={event => setValue(event.target.value)} style={{ width: 64, height: 44, padding: 3, cursor: "pointer" }} />
        <input aria-label="Valeur hexadécimale de la couleur" value={value ?? ""} readOnly={readOnly || disabled} maxLength={7} onChange={event => setValue(event.target.value)} placeholder="#c9a961" style={{ minHeight: 44, width: 140, fontFamily: "monospace" }} />
        <button type="button" disabled={readOnly || disabled} onClick={() => setValue((defaultContent.appearance as Record<string, unknown>)[field.name])} style={{ minHeight: 44, padding: "0.5rem 0.75rem", cursor: "pointer" }}>Valeur d&apos;origine</button>
      </div>
      {showError && <p role="alert" style={{ color: "var(--theme-error-500)", marginTop: 8 }}>{typeof errorMessage === "string" ? errorMessage : "Couleur invalide."}</p>}
    </div>;
  }
  return { default: ColorInput };
});

export const ColorField: TextFieldClientComponent = props => <Suspense fallback={<p>Chargement du sélecteur de couleur…</p>}><LazyColorField {...props} /></Suspense>;
