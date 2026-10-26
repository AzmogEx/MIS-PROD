import { SITE } from "@/data/site";
import { UNIVERSES_LIST, type Universe } from "@/data/universes";
import { PORTFOLIO_PROJECTS, type PortfolioProject } from "@/data/portfolio";
import { CLIENTS, TESTIMONIALS } from "@/data/clients";
import {analyticsCopy} from './analytics-copy';

/** Source d'import historique, jamais une preuve commerciale vérifiée. */
const initialPillars = [
  {
    number: "I.",
    verb: "Capturer",
    title: "L'instant juste, pas l'instant facile.",
    body: "Repérage, écriture, lumière. Chaque captation est préparée pour qu'au tournage, on ne fasse plus que regarder ce qui doit être vu.",
  },
  {
    number: "II.",
    verb: "Diffuser",
    title: "L'expertise, sans dilution.",
    body: "Plateaux TV mobiles, streaming 4K HDR, multi-caméras. La régie broadcast professionnelle déplacée là où votre public se trouve, en latence sub-seconde.",
  },
  {
    number: "III.",
    verb: "Réveiller",
    title: "La mémoire qu'on transmet.",
    body: "Documentaires de vie, biographies vidéo, ateliers en EHPAD. Filmer l'humain avec la pudeur et la précision qu'exige ce qui ne se rejouera pas.",
  },
];
const initialStats = [
  {
    kicker: "Plus de",
    value: 500,
    suffix: "",
    label: "Projets réalisés",
  },
  {
    value: 8,
    suffix: " ans",
    label: "D'expertise broadcast",
  },
  {
    value: 4.9,
    decimals: 1,
    suffix: "★",
    label: "Note moyenne client",
  },
];
const initialCards = [
  {
    number: "01",
    href: "/institutions",
    eyebrow: "Institutions · Santé",
    title: "Réveiller la mémoire.",
    tagline: "EHPAD, hôpitaux, collectivités.",
    description:
      "Ateliers mémoire par l'image, stimulation cognitive, documentaires de vie pour les résidents, captation d'événements institutionnels.",
    highlights: [
      "Ateliers mémoire",
      "Documentaires de vie",
      "Stimulation cognitive",
    ],
    imageSrc: "/universes/institutions.webp",
    ambiance: "warm",
  },
  {
    number: "02",
    href: "/entreprises",
    eyebrow: "Entreprises · Broadcast",
    title: "Diffuser l'expertise.",
    tagline: "Plateaux TV mobiles, live streaming 4K.",
    description:
      "Captation multi-caméras, films corporate, webinaires hybrides, plateaux mobiles ATEM, streaming LiveU pour vos événements professionnels.",
    highlights: [
      "Live streaming 4K",
      "Multi-caméras",
      "Films corporate",
      "Webinaires hybrides",
    ],
    imageSrc: "/universes/entreprises.webp",
    ambiance: "cold",
  },
  {
    number: "03",
    href: "/particuliers",
    eyebrow: "Particuliers · Héritage",
    title: "Capturer l'instant.",
    tagline: "Mariages, biographies, événements familiaux.",
    description:
      "Films de mariage cinématographiques, biographies vidéo, récits de vie, événements familiaux, héritage filmé pour les générations futures.",
    highlights: [
      "Films de mariage",
      "Biographies vidéo",
      "Récits de vie",
    ],
    imageSrc: "/universes/particuliers.webp",
    ambiance: "champagne",
  },
];
const initialServices = [
  {
    key: "duo",
    label: "Duo Photo + Vidéo",
    caption: "Le couple photographe & vidéaste — l'expérience complète.",
    formulas: [
      {
        key: "essentiel",
        name: "Essentiel",
        price: 1490,
        bullets: [
          "Dès préparatifs au vin d'honneur",
          "Cérémonies · couple · invités",
          "Galerie privée en ligne",
          "Photos retouchées en nombre illimité",
          "Clip 5–10 minutes",
          "Images brutes vidéo livrées",
        ],
      },
      {
        key: "traditionnel",
        name: "Traditionnel",
        price: 1990,
        bullets: [
          "Dès préparatifs à la pièce montée",
          "Cérémonies · couple · invités · réception",
          "Galerie privée en ligne",
          "Photos retouchées en nombre illimité",
          "Clip 10–15 minutes",
          "Images brutes vidéo livrées",
        ],
      },
      {
        key: "tendance",
        name: "Tendance",
        price: 2490,
        bullets: [
          "Dès préparatifs à la pièce montée",
          "Cérémonies · couple · invités · réception",
          "Galerie privée en ligne",
          "Livre photo qualité 50 pages",
          "Photos retouchées en nombre illimité",
          "Clip 5–10 minutes",
          "Film 1h · cérémonies, discours, soirée",
          "Images brutes vidéo livrées",
        ],
      },
    ],
  },
  {
    key: "photographe",
    label: "Photographe seul",
    caption: "Pour celles et ceux qui privilégient l'image fixe.",
    formulas: [
      {
        key: "essentiel",
        name: "Essentiel",
        price: 790,
        bullets: [
          "Dès préparatifs au vin d'honneur",
          "Cérémonies · couple · invités",
          "Galerie privée en ligne",
          "Photos retouchées en nombre illimité",
        ],
      },
      {
        key: "traditionnel",
        name: "Traditionnel",
        price: 1090,
        bullets: [
          "Dès préparatifs à la pièce montée",
          "Cérémonies · couple · invités · réception",
          "Galerie privée en ligne",
          "Photos retouchées en nombre illimité",
        ],
      },
      {
        key: "tendance",
        name: "Tendance",
        price: 1290,
        bullets: [
          "Dès préparatifs à la pièce montée",
          "Cérémonies · couple · invités · réception",
          "Galerie privée en ligne",
          "Livre photo qualité 100 pages XXL",
          "Photos retouchées en nombre illimité",
        ],
      },
    ],
  },
  {
    key: "videaste",
    label: "Vidéaste seul",
    caption: "Le récit filmé, pour revivre la journée en mouvement.",
    formulas: [
      {
        key: "essentiel",
        name: "Essentiel",
        price: 790,
        bullets: [
          "Dès préparatifs au vin d'honneur",
          "Cérémonies · couple · invités",
          "Clip 5–10 minutes",
          "Images brutes vidéo livrées",
        ],
      },
      {
        key: "traditionnel",
        name: "Traditionnel",
        price: 1090,
        bullets: [
          "Dès préparatifs à la pièce montée",
          "Cérémonies · couple · invités · réception",
          "Clip 10–15 minutes",
          "Images brutes vidéo livrées",
        ],
      },
      {
        key: "tendance",
        name: "Tendance",
        price: 1290,
        bullets: [
          "Dès préparatifs à la pièce montée",
          "Cérémonies · couple · invités · réception",
          "Clip 5–10 minutes",
          "Film 1h · cérémonies, discours, soirée",
          "Images brutes vidéo livrées",
        ],
      },
    ],
  },
];
const initialAddons = [
  { label: "Images aériennes par drone", price: 200 },
  { label: "Deuxième photographe / vidéaste", price: 500 },
  { label: "Journée supplémentaire", price: 500 },
  { label: "Espace Photo Call éclairage pro", price: 300 },
  { label: "Livre photo 28×28 · 50 pages", price: 250 },
  { label: "Livre photo parents 21×28 · 30 pages", price: 100 },
  { label: "Création d'un diaporama photo", price: 150 },
  { label: "Tournage faire-part / save-the-date / teaser", price: 300 },
];
const initialNav = [
  { href: "/institutions", label: "Institutions" },
  { href: "/entreprises", label: "Entreprises" },
  { href: "/particuliers", label: "Particuliers" },
];
const initialFooter = [
  {
    label: "Univers",
    links: [
      { href: "/institutions", label: "Institutions · Santé" },
      { href: "/entreprises", label: "Entreprises · Broadcast" },
      { href: "/particuliers", label: "Particuliers · Héritage" },
    ],
  },
  {
    label: "Studio",
    links: [
      { href: "/#manifeste", label: "Manifeste" },
      { href: "/#realisations", label: "Réalisations" },
      { href: "/#confiance", label: "Confiance" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    label: "Légal",
    links: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/confidentialite", label: "Confidentialité" },
      { href: "/cgv", label: "CGV" },
    ],
  },
];


export type UniverseCardContent = {
  number: string; href: string; eyebrow: string; title: string; tagline: string;
  description: string; highlights: string[]; imageSrc: string;
  ambiance: "warm" | "cold" | "champagne";
};

type Mutable<T> = T extends string ? string : T extends number ? number : T extends boolean ? boolean : T extends ReadonlyArray<infer V> ? Mutable<V>[] : T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;

export const defaultContent = {
  site: { ...JSON.parse(JSON.stringify(SITE)), url: "https://mis-prod.fr" } as Mutable<typeof SITE>,
  identity: { favicon: "/favicon.svg", shortcutIcon: "/favicon.ico", appleIcon: "/apple-touch-icon.png", shareImage: "" },
  appearance: {
    gold: "#c9a961", goldBright: "#e6c989", goldDeep: "#8a7340",
    background: "#050505", backgroundElevated: "#0c0c0c", backgroundSubtle: "#111111",
    foreground: "#f5f3ee", foregroundMuted: "#a8a39a", foregroundSubtle: "#6b665e",
    serifFont: "studio", sansFont: "studio", spacingScale: 1, animations: true,
  },
  notFound: {
    seoTitle: "Page introuvable", seoDescription: "Cette page n'existe pas ou a été déplacée.", eyebrow: "Erreur 404",
    titleEmphasis: "Hors", titleAfter: " champ.", subtitle: "Cette page n'existe pas.",
    description: "Le lien est peut-être ancien, ou la page a été déplacée. Revenez à l'accueil ou parcourez nos univers.",
    homeLabel: "Retour à l'accueil", homeHref: "/", briefLabel: "Démarrer un brief", briefHref: "/contact", universesLabel: "Ou explorez un univers",
  },
  navigation: {
    logo: "MIS", logoImage: "", logoAlt: "MIS — Mémoire Image Son · accueil",
    studioLabel: "Studio", links: initialNav, briefLabel: "Brief projet", briefHref: "/contact",
    menuOpen: "Ouvrir le menu", menuClose: "Fermer le menu", menuLabel: "Navigation principale",
  },
  footer: {
    logo: "MIS", signature: "Mémoire · Image · Son", homeLabel: "Accueil MIS — Mémoire Image Son",
    studioLabel: "Studio", sinceLabel: "Depuis", contactLabel: "Contact", socialLabel: "Suivre le studio",
    rightsLabel: "Tous droits réservés", columns: initialFooter,
    socialLinks: [{ label: "Instagram", href: SITE.social.instagram, icon: "instagram" }, { label: "LinkedIn", href: SITE.social.linkedin, icon: "linkedin" }, { label: "YouTube", href: SITE.social.youtube, icon: "youtube" }],
  },
  hero: {
    studioLabel: "Studio", firstVerb: "Capturer", firstRest: " l’instant,", secondVerb: "diffuser", secondRest: " l’expertise,",
    thirdVerb: "réveiller", thirdRest: " la mémoire.", showreelLabel: "Voir le showreel", showreelHref: "#realisations",
    universesLabel: "Nos univers", universesHref: "#univers", onAirLabel: "On Air", studioEyebrow: "(01) — Studio",
    liveLabel: "Live ·", scrollLabel: "Scroll", backgroundLabel: "Ambiance vidéo de fond", poster: "",
    autoplay: true, showTimecode: true,
  },
  manifesto: {
    eyebrow: "(02) — Manifeste", titleBefore: "Trois ", titleEmphasis: "verbes", titleAfter: ".", subtitle: "Une seule exigence.",
    introduction: "Depuis 2017, MIS refuse l'image jetable. Chaque film, chaque captation, chaque atelier est conçu comme une pièce qui doit tenir dans dix ans, vingt ans. Parce qu'une mémoire qu'on filme n'a pas le droit d'être approximative.",
    pillars: initialPillars,
  },
  stats: {
    heading: "Chiffres clés du studio", eyebrow: "(03) — Le studio en chiffres",
    items: initialStats.map(item => ({ kicker: "", prefix: "", decimals: 0, ...item, source: "Valeur importée du dépôt, justificatif à fournir", verified: false, verifiedAt: "" })),
  },
  universesSection: {
    eyebrow: "(04) — Trois univers", titleBefore: "Une ", titleEmphasis: "même", titleAfter: " exigence.", subtitle: "Trois manières d'y répondre.",
  },
  universes: UNIVERSES_LIST.map(universe => ({
    ...universe,
    card: initialCards.find(card => card.href === `/${universe.slug}`) as UniverseCardContent,
    formulas: universe.formulas.map(formula => ({ meta: "", ...formula })),
    portfolio: universe.portfolio.map(item => ({ ...item, imageSrc: "", videoSrc: item.videoSrc ?? "", alt: `${item.title} — ${item.category}` })),
  })) as (Universe & { card: UniverseCardContent })[],
  projects: PORTFOLIO_PROJECTS.map(project => ({ featured: false, duration: "", ...project, imageSrc: "", videoSrc: project.videoSrc ?? "", alt: `${project.title} — ${project.client}`, source: "Import du dépôt ; visuels Picsum de démonstration", verified: false })) as PortfolioProject[],
  portfolioSection: {
    eyebrow: "(05) — Réalisations", titleBefore: "Le studio ", titleEmphasis: "en mouvement", titleAfter: ".", subtitle: "Quelques projets récents.",
    ctaLabel: "Demander le portfolio complet", ctaHref: "/contact", showreelLabel: "Showreel", openLabel: "Ouvrir", forLabel: "pour", limit: 6,
  },
  clients: CLIENTS.map(client => ({ ...client, verified: false, source: "Données neutres / fictives à valider/remplacer (commentaire du fichier source)" })),
  testimonials: TESTIMONIALS.map(item => ({ ...item, verified: false, source: "Données neutres / fictives à valider/remplacer (commentaire du fichier source)" })),
  clientsSection: {
    eyebrow: "(06) — Confiance", titleBefore: "Les structures qui nous ", titleEmphasis: "confient", titleAfter: "", subtitle: "ce qui ne se rejouera pas.", clientsLabel: "Clients du studio", testimonialPrefix: "T.",
  },
  cta: {
    eyebrow: "(07) — Brief projet", title: "Parlons", subtitle: "de votre projet.",
    description: "Captation, plateau TV mobile, atelier mémoire, mariage, documentaire : chaque univers a sa réponse. Décrivez-nous votre besoin, on revient vers vous sous 24 h.",
    label: "Démarrer un brief", href: "/contact", studioLabel: "Studio",
  },
  universeTemplate: {
    scrollLabel: "Manifeste", manifestoEyebrow: "(Manifeste)", formulasEyebrow: "(Formules)", formulasEmphasis: "Quatre", formulasTitle: " manières de travailler ensemble.",
    portfolioEyebrow: "(Réalisations)", portfolioEmphasis: "Quelques", portfolioTitle: " films récents.", portfolioSubtitle: "Plus de 500 dans nos archives.",
    portfolioCta: "Demander la bande démo complète", portfolioHref: "/contact", openLabel: "Ouvrir",
  },
  pricing: {
    services: initialServices, addons: initialAddons.map(addon => ({ ...addon, note: "" })),
    eyebrow: "(Tarifs 2025—2026)", titleBefore: "Trois ", titleEmphasis: "prestations", titleAfter: ",", subtitle: "chacune pensée comme un récit complet.",
    serviceLabel: "Choix de la prestation", droneNote: "Option drone · +200 €", addonsEyebrow: "(À la carte)", addonsTitle: "Sur-mesure.",
    addonsSubtitle: "Composez votre prestation selon vos envies.", footerNote: "Chaque mariage est unique — chaque souvenir doit l'être aussi. Parlons de votre journée.",
    ctaLabel: "Demander un devis personnalisé", ctaHref: "/contact", formulaCta: "Choisir cette formule", featuredKey: "tendance", featuredLabel: "Best-seller", currency: "€",
  },
  ui: { closeLabel: "Fermer", videoLabel: "Lecture vidéo", imageLabel: "Aperçu image", legalEyebrow: "Légal", lastUpdateLabel: "Dernière mise à jour", formUnavailable: "Le formulaire est momentanément indisponible. Contactez {{email}}.", downloadLabel: "Télécharger", privacyLabel: "Confidentialité", productionLabel: "Production",...analyticsCopy },
};

export type SiteContent = typeof defaultContent;
