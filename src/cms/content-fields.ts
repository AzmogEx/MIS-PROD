import type { Field } from "payload";
import { defaultContent, type SiteContent } from "./seed-content";

const labels: Record<string, string> = {
  analyticsTitle:'Consentement · titre',analyticsDescription:'Consentement · explication',analyticsAllow:'Consentement · autoriser',analyticsDecline:'Consentement · refuser',analyticsAccepted:'Consentement · état autorisé',analyticsRefused:'Consentement · état refusé',analyticsWithdraw:'Consentement · retrait',analyticsChange:'Consentement · changer de choix',analyticsLabel:'Consentement · nom accessible',
  site: "Identité du studio", navigation: "En-tête et navigation", footer: "Pied de page", hero: "Accueil · Introduction",
  manifesto: "Accueil · Manifeste", stats: "Chiffres du studio", universesSection: "Accueil · Présentation des univers",
  universes: "Univers", projects: "Réalisations", portfolioSection: "Accueil · Réalisations", clients: "Références affichées",
  testimonials: "Témoignages", clientsSection: "Accueil · Confiance", cta: "Appel à projet partagé", universeTemplate: "Pages univers · Textes partagés",
  pricing: "Tarifs mariage", ui: "Microtextes et lecteurs", title: "Titre", subtitle: "Sous-titre", description: "Description",
  legalEyebrow: "Surtitre des pages légales", lastUpdateLabel: "Libellé de dernière mise à jour", formUnavailable: "Formulaire indisponible ({{email}} = contact)", downloadLabel: "Télécharger", privacyLabel: "Lien de confidentialité", productionLabel: "Libellé production de l’image de partage",
  titleBefore: "Titre · avant l'emphase", titleEmphasis: "Titre · emphase", titleAfter: "Titre · après l'emphase",
  eyebrow: "Surtitre", label: "Libellé", href: "Adresse du lien", name: "Nom", fullName: "Nom complet", tagline: "Signature",
  slug: "Adresse / identifiant", imageSrc: "Adresse de l'image", videoSrc: "Adresse de la vidéo", videoUrl: "Vidéo de fond",
  alt: "Texte alternatif", source: "Origine / justificatif", verified: "Vérification éditoriale effectuée", verifiedAt: "Date de vérification",
  items: "Éléments", links: "Liens", columns: "Colonnes", socialLinks: "Réseaux sociaux", formulas: "Formules", services: "Prestations",
  addons: "Options", bullets: "Inclusions", highlights: "Points clés", tags: "Étiquettes", quote: "Citation", author: "Auteur",
  organization: "Organisation", role: "Fonction", year: "Année", number: "Numéro éditorial", price: "Prix", note: "Mention",
  key: "Identifiant stable", value: "Valeur", card: "Carte de présentation", portfolio: "Galerie", shortName: "Nom court", intro: "Introduction",
  pitch: "Promesse", ambiance: "Ambiance", shape: "Format", featured: "Mise en avant", duration: "Durée affichée", format: "Type de réalisation",
  client: "Client / lieu", seed: "Identifiant visuel historique Picsum", poster: "Affiche vidéo", firstVerb: "Ligne 1 · emphase", firstRest: "Ligne 1 · suite",
  secondVerb: "Ligne 2 · emphase", secondRest: "Ligne 2 · suite", thirdVerb: "Ligne 3 · emphase", thirdRest: "Ligne 3 · suite",
  introduction: "Introduction", pillars: "Piliers", verb: "Verbe", body: "Texte", decimals: "Décimales", prefix: "Préfixe", suffix: "Suffixe", kicker: "Accroche",
  logo: "Signature du logo", logoImage: "Image du logo", logoAlt: "Nom accessible du logo", studioLabel: "Libellé studio", briefLabel: "Bouton brief", briefHref: "Lien du brief",
  menuOpen: "Ouvrir le menu · texte accessible", menuClose: "Fermer le menu · texte accessible", menuLabel: "Nom accessible du menu", signature: "Signature", homeLabel: "Lien accueil · texte accessible",
  sinceLabel: "Libellé depuis", contactLabel: "Libellé contact", socialLabel: "Titre des réseaux sociaux", rightsLabel: "Mention des droits", icon: "Icône",
  showreelLabel: "Bouton showreel", showreelHref: "Lien du showreel", universesLabel: "Bouton univers", universesHref: "Lien des univers", onAirLabel: "Indicateur de diffusion", studioEyebrow: "Surtitre studio",
  liveLabel: "Libellé direct", scrollLabel: "Invitation au défilement", backgroundLabel: "Vidéo de fond · texte accessible", autoplay: "Lecture automatique", showTimecode: "Afficher l'horloge de diffusion",
  heading: "Titre accessible", ctaLabel: "Bouton principal", ctaHref: "Lien du bouton principal", openLabel: "Libellé ouvrir", forLabel: "Liaison pour", limit: "Nombre maximum affiché",
  clientsLabel: "Bandeau clients · texte accessible", testimonialPrefix: "Préfixe des témoignages", manifestoEyebrow: "Surtitre du manifeste", formulasEyebrow: "Surtitre des formules",
  formulasEmphasis: "Titre des formules · emphase", formulasTitle: "Titre des formules · suite", portfolioEyebrow: "Surtitre des réalisations", portfolioEmphasis: "Titre des réalisations · emphase", portfolioTitle: "Titre des réalisations · suite",
  portfolioSubtitle: "Sous-titre des réalisations", portfolioCta: "Bouton galerie", portfolioHref: "Lien du bouton galerie", caption: "Légende", serviceLabel: "Sélecteur des prestations · nom accessible",
  droneNote: "Mention drone", addonsEyebrow: "Surtitre des options", addonsTitle: "Titre des options", addonsSubtitle: "Sous-titre des options", footerNote: "Mention de bas de section",
  formulaCta: "Bouton de formule", featuredKey: "Identifiant de formule mise en avant", featuredLabel: "Badge de mise en avant", currency: "Symbole monétaire", closeLabel: "Fermer · texte accessible", videoLabel: "Lecteur vidéo · nom accessible", imageLabel: "Aperçu image · nom accessible",
  city: "Ville", foundedYear: "Année de création", url: "Adresse canonique du site", email: "Adresse email", phone: "Téléphone affiché", phoneE164: "Téléphone pour le lien d'appel", address: "Adresse postale", street: "Rue", postalCode: "Code postal", country: "Pays",
  legal: "Informations légales", legalForm: "Forme juridique", siret: "SIRET", vatNumber: "Mention de TVA", director: "Directeur de publication", directorTitle: "Qualité du directeur", social: "Liens sociaux de l'identité", instagram: "Instagram", linkedin: "LinkedIn", youtube: "YouTube", host: "Hébergeur déclaré", website: "Site de l'hébergeur",
  identity: "Icônes et partage", favicon: "Icône du site", shortcutIcon: "Icône raccourci", appleIcon: "Icône Apple", shareImage: "Image de partage par défaut",
  appearance: "Apparence globale", gold: "Accent principal", goldBright: "Accent lumineux", goldDeep: "Accent profond", background: "Fond principal", backgroundElevated: "Fond surélevé", backgroundSubtle: "Fond secondaire",
  foreground: "Texte principal", foregroundMuted: "Texte secondaire", foregroundSubtle: "Texte discret", serifFont: "Police éditoriale", sansFont: "Police de lecture", spacingScale: "Échelle des espacements", animations: "Activer les animations",
  notFound: "Page introuvable (404)", seoTitle: "Titre de référencement", seoDescription: "Description de référencement", homeHref: "Lien de retour à l'accueil",
};

export const contentLabels = labels;

function label(name: string) { return labels[name] ?? name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, x => x.toUpperCase()); }
function sampleRows(values: unknown[]): unknown {
  if (!values.length) return "";
  if (typeof values[0] !== "object" || values[0] === null) return values[0];
  return Object.assign({}, ...values.filter(x => x && typeof x === "object"));
}

/** Every historical value is a native, labelled CMS field. No JSON editor. */
function fieldsFor(value: Record<string, unknown>): Field[] {
  return Object.entries(value).map(([name, sample]): Field => {
    const common = { name, label: label(name) };
    if (["gold", "goldBright", "goldDeep", "background", "backgroundElevated", "backgroundSubtle", "foreground", "foregroundMuted", "foregroundSubtle"].includes(name)) return {
      ...common, type: "text", required: true, defaultValue: sample,
      validate: (input: unknown) => (typeof input === "string" && /^#[0-9a-f]{6}$/i.test(input)) || "Choisissez une couleur valide au format #RRGGBB.",
      admin: { components: { Field: "@/components/cms/global-appearance#ColorField" } },
    } as Field;
    if (name === "spacingScale") return { ...common, type: "number", required: true, defaultValue: 1, min: 0.8, max: 1.4, admin: { step: 0.05, description: "1 conserve le rythme du site. Entre 0,8 (compact) et 1,4 (aéré). Contrôlez aussi l'aperçu mobile." } };
    if (name === "serifFont") return { ...common, type: "select", required: true, defaultValue: "studio", options: [{ label: "Studio · Instrument Serif", value: "studio" }, { label: "Georgia", value: "georgia" }, { label: "Palatino", value: "palatino" }, { label: "Times New Roman", value: "times" }] };
    if (name === "sansFont") return { ...common, type: "select", required: true, defaultValue: "studio", options: [{ label: "Studio · Inter", value: "studio" }, { label: "Police système", value: "system" }, { label: "Arial", value: "arial" }, { label: "Verdana", value: "verdana" }] };
    if (Array.isArray(sample)) {
      const row = sampleRows(sample);
      return { ...common, type: "array", maxRows: 300,
        ...(["universes", "projects"].includes(name) ? { validate: (items: unknown) => {
          if (!Array.isArray(items)) return true;
          const slugs = items.map(item => item && typeof item === "object" ? (item as Record<string, unknown>).slug : "");
          return new Set(slugs).size === slugs.length || "Chaque adresse / identifiant doit être unique dans cette liste.";
        } } : {}),
        fields: row && typeof row === "object" ? fieldsFor(row as Record<string, unknown>) : [{ name: "value", label: "Texte", type: "text", maxLength: 10000 }],
      };
    }
    if (sample && typeof sample === "object") return { ...common, type: "group", fields: fieldsFor(sample as Record<string, unknown>) };
    if (typeof sample === "boolean") return { ...common, type: "checkbox", ...(name === "animations" ? { defaultValue: true } : {}) };
    if (typeof sample === "number") return { ...common, type: "number", min: 0, ...(name === "decimals" ? { max: 4 } : {}) };
    if (name === "ambiance") return { ...common, type: "select", options: [{ label: "Chaleureux", value: "warm" }, { label: "Broadcast", value: "cold" }, { label: "Champagne", value: "champagne" }], defaultValue: "warm" };
    if (name === "shape") return { ...common, type: "select", options: [{ label: "Portrait", value: "tall" }, { label: "Paysage", value: "wide" }, { label: "Carré", value: "square" }], defaultValue: "wide" };
    if (name === "icon") return { ...common, type: "select", options: ["instagram", "linkedin", "youtube"], defaultValue: "instagram" };
    if (name === "slug") return { ...common, type: "text", required: true, maxLength: 120, validate: (input: unknown) => (typeof input === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input)) || "Utilisez des lettres minuscules, chiffres et tirets, sans espace." };
    return { ...common, type: typeof sample === "string" && sample.length > 110 ? "textarea" : "text", maxLength: 12000,
      ...(/^(favicon|shortcutIcon|appleIcon|shareImage|logoImage)$/.test(name) ? { admin: { components: { Field: '@/components/cms/media-asset-field#MediaAssetField' }, description: 'Choisissez une image publique dans la médiathèque. L’adresse est remplie automatiquement ; l’édition reste un brouillon jusqu’à publication.' } } : {}),
      ...(name === "source" ? { admin: { description: "Les données importées ne deviennent pas une preuve commerciale par leur import. Conservez l'origine et le justificatif." } } : {}),
      ...(/^(favicon|shortcutIcon|appleIcon|shareImage)$/.test(name) ? { validate: (input: unknown) => !input || (typeof input === "string" && (/^(\/[^/]|https:\/\/)/i.test(input))) || "Utilisez un chemin de média /local ou une adresse HTTPS." } : {}),
      ...(/^(href|logoImage|poster|url|website|instagram|linkedin|youtube)$|(Href|Src|Url)$/.test(name) ? { validate: (input: unknown) => !input || (typeof input === "string" && (/^(\/[^/]|\/$|#|https:\/\/|mailto:|tel:)/i.test(input))) || "Utilisez une adresse HTTPS, un chemin /local, une ancre, mailto: ou tel:." } : {}),
    } as Field;
  });
}

// One row per named group keeps each localized SQLite join below its JSON
// argument limit. The public/editor model remains an ordinary named object.
export const contentFields: Field[] = fieldsFor(defaultContent as unknown as Record<string, unknown>).map(field =>
  field.type === 'group' ? { ...field, type: 'array', minRows: 1, maxRows: 1, localized: true } as Field : { ...field, localized: true } as Field
);
const singleGroups = new Set(Object.entries(defaultContent).filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value)).map(([key]) => key));

export function toPayloadContent(value: unknown = defaultContent): Record<string, unknown> {
  const encode = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(row => typeof row === "object" && row !== null ? encode(row) : { value: row });
    if (item && typeof item === "object") return Object.fromEntries(Object.entries(item).map(([key, row]) => [key, encode(row)]));
    return item;
  };
  const encoded = encode(value) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(encoded).map(([key, item]) => [key, singleGroups.has(key) && !Array.isArray(item) ? [item] : item]));
}

/** Decode both CMS rows and the original string arrays, with defaults for absent groups. */
export function fromPayloadContent(value: unknown): SiteContent {
  const empty = (sample: unknown): unknown => {
    if (Array.isArray(sample)) return [];
    if (sample && typeof sample === "object") return Object.fromEntries(Object.entries(sample).map(([key, item]) => [key, key === "ambiance" ? "warm" : key === "shape" ? "wide" : empty(item)]));
    return typeof sample === "boolean" ? false : typeof sample === "number" ? 0 : "";
  };
  const decode = (data: unknown, sample: unknown): unknown => {
    if (data === undefined) return sample;
    if (data === null) return empty(sample);
    if (Array.isArray(sample)) {
      if (!Array.isArray(data)) return sample;
      const row = sampleRows(sample);
      return data.map(item => typeof row === "object" && row !== null ? decode(item, Object.fromEntries(Object.entries(row).map(([key, template]) => [key, (item as Record<string, unknown>)?.[key] == null ? key === "ambiance" ? "warm" : key === "shape" ? "wide" : empty(template) : template]))) : (item && typeof item === "object" && "value" in item ? item.value : item));
    }
    if (sample && typeof sample === "object") {
      if (!data || typeof data !== "object") return sample;
      return Object.fromEntries(Object.entries(sample).map(([key, template]) => [key, decode((data as Record<string, unknown>)[key], template)]));
    }
    return typeof data === typeof sample ? data : sample;
  };
  const source = value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, singleGroups.has(key) && Array.isArray(item) ? item[0] ?? null : item])) : defaultContent;
  return decode(source, defaultContent) as SiteContent;
}
