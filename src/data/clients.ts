/**
 * Clients & témoignages affichés dans la section "Confiance" sur la home.
 * Données neutres / fictives à valider/remplacer par le client.
 */

export type Client = {
  /** Nom du client tel qu'il apparaît dans le marquee */
  name: string;
  /** Univers d'appartenance (pour filtrer/colorer si besoin) */
  universe: string;
};

export const CLIENTS: Client[] = [
  { name: "EHPAD Saint-Joseph", universe: "institutions" },
  { name: "ARS Occitanie", universe: "institutions" },
  { name: "Centre Hospitalier de Nîmes", universe: "institutions" },
  { name: "Fondation Hôpitaux", universe: "institutions" },
  { name: "Groupe Bourbon", universe: "entreprises" },
  { name: "Maison F.", universe: "entreprises" },
  { name: "CCI Gard", universe: "entreprises" },
  { name: "Conservatoire de Musique", universe: "institutions" },
  { name: "Ville de Nîmes", universe: "institutions" },
  { name: "Domaine de Camargue", universe: "particuliers" },
  { name: "Crédit Agricole Sud", universe: "entreprises" },
  { name: "Mairie d'Uzès", universe: "institutions" },
];

export type Testimonial = {
  /** Citation principale, sans guillemets — ils sont ajoutés en typographie */
  quote: string;
  /** Auteur du témoignage */
  author: string;
  /** Fonction de l'auteur */
  role: string;
  /** Organisation / entreprise de l'auteur */
  organization: string;
  /** Univers MIS concerné */
  universe: string;
  /** Projet associé (optionnel) — affiché en bas de citation */
  project?: string;
  /** Année du projet */
  year: number;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Les ateliers MIS ont changé la manière dont nos résidents se racontent. Et la manière dont leurs familles les écoutent.",
    author: "Marie L.",
    role: "Directrice",
    organization: "EHPAD Saint-Joseph · Nîmes",
    universe: "institutions",
    project: "Mémoires de Saint-Joseph · Documentaire de vie",
    year: 2024,
  },
  {
    quote:
      "Régie sub-seconde, plateau impeccable, équipe précise. Notre convention 1 200 personnes diffusée comme une émission TV. Sans la moindre frayeur.",
    author: "Julien R.",
    role: "Directeur communication",
    organization: "Groupe Bourbon",
    universe: "entreprises",
    project: "Convention annuelle · Plateau TV mobile",
    year: 2024,
  },
  {
    quote:
      "On voulait un souvenir. On a reçu un film. Vingt minutes qu'on regardera dans dix, vingt, trente ans, sans rougir.",
    author: "Lucile & Marc",
    role: "Mariés",
    organization: "Domaine de Camargue",
    universe: "particuliers",
    project: "Film de mariage cinématographique",
    year: 2024,
  },
];
