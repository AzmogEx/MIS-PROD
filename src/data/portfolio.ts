/**
 * Projets phares affichés sur la page d'accueil (section "Réalisations").
 *
 * Chaque entrée combine un univers (warm / cold / champagne), un format
 * (mariage, plateau TV, documentaire…), un client et une année. Les images
 * passent par Picsum (seed stable) — à remplacer par des stills réels
 * quand le client fournira ses rushes.
 *
 * Le premier projet (`featured: true`) est promu en grand format en haut
 * de la grille pour servir de "showreel".
 */

import type { UniverseSlug } from "@/data/universes";

export type PortfolioProject = {
  /** Identifiant slug — utilisé pour la future page projet */
  slug: string;
  /** Numérotation éditoriale affichée en eyebrow */
  number: string;
  /** Titre court mis en avant sur la card */
  title: string;
  /** Client / lieu — sous-titre en serif italique */
  client: string;
  /** Univers MIS auquel appartient le projet */
  universe: UniverseSlug;
  /** Format / catégorie (ex: "Plateau TV", "Documentaire de vie") */
  format: string;
  /** Année de réalisation */
  year: number;
  /** Description courte révélée au hover */
  description: string;
  /** Tags affichés en bas de card */
  tags: string[];
  /** Seed Picsum pour image stable */
  seed: string;
  /** Format visuel — "tall" (3/4) | "wide" (16/9) | "square" (1/1) */
  shape: "tall" | "wide" | "square";
  /** Mise en avant XXL (showreel) — un seul projet "featured: true" attendu */
  featured?: boolean;
  /** Durée affichée pour le showreel, optionnel */
  duration?: string;
  /**
   * Chemin de la vidéo (placée dans /public/videos/) — déclenche la lightbox
   * au clic. Si absent, la card reste cliquable mais sans lecture.
   * Ex: "/videos/showreel-2025.mp4"
   */
  videoSrc?: string;
  imageSrc?: string;
  alt?: string;
  source?: string;
  verified?: boolean;
};

export const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    slug: "showreel-2025",
    number: "00",
    title: "Showreel 2025",
    client: "MIS · Compilation",
    universe: "entreprises",
    format: "Showreel",
    year: 2025,
    description:
      "Une année de captations, plateaux mobiles, mariages et documentaires de vie condensée en 90 secondes. Le langage visuel du studio.",
    tags: ["8K", "HDR", "Multi-formats"],
    seed: "mzn-showreel-2025",
    shape: "wide",
    featured: true,
    duration: "1 : 32",
  },
  {
    slug: "convention-groupe-x",
    number: "01",
    title: "Convention annuelle",
    client: "Groupe X · Montpellier",
    universe: "entreprises",
    format: "Plateau TV mobile",
    year: 2024,
    description:
      "Régie ATEM 6 caméras, streaming 4K HDR vers 1 200 collaborateurs, fond LED, double animation. Latence sub-seconde.",
    tags: ["6 caméras", "Streaming 4K", "Régie ATEM"],
    seed: "mzn-port-convention",
    shape: "tall",
  },
  {
    slug: "memoires-saint-joseph",
    number: "02",
    title: "Mémoires de Saint-Joseph",
    client: "EHPAD Saint-Joseph · Nîmes",
    universe: "institutions",
    format: "Documentaire de vie",
    year: 2024,
    description:
      "Six résidents, six histoires. Atelier mémoire mené sur trois mois, avec restitution en projection collective. Format 22 minutes.",
    tags: ["Atelier mémoire", "Documentaire", "22 min"],
    seed: "mzn-port-saintjoseph",
    shape: "square",
  },
  {
    slug: "lucile-marc-camargue",
    number: "03",
    title: "Lucile & Marc",
    client: "Mariage · Domaine de Camargue",
    universe: "particuliers",
    format: "Film de mariage cinématographique",
    year: 2024,
    description:
      "Deux chefs-opérateurs, un drone, une journée filmée comme un long-métrage. Restitution en film court 5 min + film long 38 min.",
    tags: ["Mariage", "Drone", "Étalonnage cinéma"],
    seed: "mzn-port-camargue",
    shape: "tall",
  },
  {
    slug: "lancement-produit-live",
    number: "04",
    title: "Lancement produit",
    client: "Maison F. · Paris",
    universe: "entreprises",
    format: "Live streaming 4K",
    year: 2024,
    description:
      "Diffusion 4K HDR multi-plateformes depuis un site sans fibre. Bonding LiveU 14 modems, 8 000 viewers simultanés, replay nettoyé sous 24h.",
    tags: ["LiveU", "4K HDR", "8 000 viewers"],
    seed: "mzn-port-lancement",
    shape: "wide",
  },
  {
    slug: "henri-92-ans",
    number: "05",
    title: "Le récit d'Henri",
    client: "Biographie privée · 92 ans",
    universe: "institutions",
    format: "Documentaire de vie",
    year: 2023,
    description:
      "Quatre séances d'interview, soixante ans d'archives photo numérisées, un coffret bois remis à la famille. La mémoire qu'on transmet.",
    tags: ["Biographie", "Archives", "Coffret bois"],
    seed: "mzn-port-henri",
    shape: "square",
  },
  {
    slug: "campagne-bientraitance",
    number: "06",
    title: "Campagne bientraitance",
    client: "ARS Occitanie",
    universe: "institutions",
    format: "Films de sensibilisation",
    year: 2024,
    description:
      "Trois films courts de 90 secondes chacun, diffusés en EHPAD, sur le web et en formation. Comédiens encadrés, voix off, sous-titres SME.",
    tags: ["Sensibilisation", "3 films", "Sous-titres SME"],
    seed: "mzn-port-bientraitance",
    shape: "wide",
  },
  {
    slug: "camille-theo-camargue",
    number: "07",
    title: "Camille & Théo",
    client: "Mariage · Camargue",
    universe: "particuliers",
    format: "Film de mariage",
    year: 2025,
    description:
      "Cérémonie laïque en bord d'étang, golden hour parfaite, montage en 9:16 inclus pour les réseaux. Bande-son licenciée originale.",
    tags: ["Mariage", "9:16 inclus", "Bande-son licenciée"],
    seed: "mzn-port-camille",
    shape: "tall",
  },
];

/** Univers disponibles pour les filtres — labels courts UI */
export const PORTFOLIO_FILTERS: { value: UniverseSlug | "all"; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "institutions", label: "Institutions" },
  { value: "entreprises", label: "Entreprises" },
  { value: "particuliers", label: "Particuliers" },
];
