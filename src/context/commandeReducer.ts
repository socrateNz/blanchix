import type { Delai } from "@/lib/pricing-constants";

export interface ArticlePanier {
  catalogItemId: string;
  nom: string;
  prixUnitaire: number;
  quantite: number;
}

export interface ArticlePersonnaliseDraft {
  nom: string;
  quantiteEstimee: number;
  description?: string;
}

export interface AdresseDraft {
  quartier: string;
  rue: string;
  instructions?: string;
}

export interface ClientDraft {
  nom: string;
  telephone: string;
  email: string;
  whatsapp?: string;
}

export interface OrderResult {
  id: string;
  numero: string;
  sousTotal: number;
  fraisLivraison: number;
  majorationDelai: number;
  reduction: number;
  total: number;
}

export interface CommandeState {
  client: ClientDraft;
  adresseCollecte: AdresseDraft;
  creneauCollecteId: string | null;
  articles: ArticlePanier[];
  articlesPersonnalises: ArticlePersonnaliseDraft[];
  notesClient: string;
  delai: Delai | null;
  adresseLivraisonDifferente: boolean;
  adresseLivraison: AdresseDraft;
  orderResult: OrderResult | null;
}

export const initialCommandeState: CommandeState = {
  client: { nom: "", telephone: "", email: "", whatsapp: "" },
  adresseCollecte: { quartier: "", rue: "", instructions: "" },
  creneauCollecteId: null,
  articles: [],
  articlesPersonnalises: [],
  notesClient: "",
  delai: null,
  adresseLivraisonDifferente: false,
  adresseLivraison: { quartier: "", rue: "", instructions: "" },
  orderResult: null,
};

export type CommandeAction =
  | { type: "HYDRATE"; state: CommandeState }
  | { type: "SET_CLIENT"; client: ClientDraft }
  | { type: "SET_ADRESSE_COLLECTE"; adresse: AdresseDraft }
  | { type: "SET_CRENEAU_COLLECTE"; creneauId: string }
  | { type: "SET_ARTICLE_QTY"; article: Omit<ArticlePanier, "quantite">; quantite: number }
  | { type: "ADD_ARTICLE_PERSONNALISE"; article: ArticlePersonnaliseDraft }
  | { type: "REMOVE_ARTICLE_PERSONNALISE"; index: number }
  | { type: "SET_NOTES_CLIENT"; notes: string }
  | { type: "SET_DELAI"; delai: Delai }
  | { type: "SET_ADRESSE_LIVRAISON_DIFFERENTE"; value: boolean }
  | { type: "SET_ADRESSE_LIVRAISON"; adresse: AdresseDraft }
  | { type: "SET_ORDER_RESULT"; result: OrderResult }
  | { type: "RESET" };

export function commandeReducer(state: CommandeState, action: CommandeAction): CommandeState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "SET_CLIENT":
      return { ...state, client: action.client };
    case "SET_ADRESSE_COLLECTE":
      return { ...state, adresseCollecte: action.adresse };
    case "SET_CRENEAU_COLLECTE":
      return { ...state, creneauCollecteId: action.creneauId };
    case "SET_ARTICLE_QTY": {
      const sansArticle = state.articles.filter(
        (a) => a.catalogItemId !== action.article.catalogItemId
      );
      if (action.quantite <= 0) {
        return { ...state, articles: sansArticle };
      }
      return {
        ...state,
        articles: [...sansArticle, { ...action.article, quantite: action.quantite }],
      };
    }
    case "ADD_ARTICLE_PERSONNALISE":
      return { ...state, articlesPersonnalises: [...state.articlesPersonnalises, action.article] };
    case "REMOVE_ARTICLE_PERSONNALISE":
      return {
        ...state,
        articlesPersonnalises: state.articlesPersonnalises.filter((_, i) => i !== action.index),
      };
    case "SET_NOTES_CLIENT":
      return { ...state, notesClient: action.notes };
    case "SET_DELAI":
      return { ...state, delai: action.delai };
    case "SET_ADRESSE_LIVRAISON_DIFFERENTE":
      return { ...state, adresseLivraisonDifferente: action.value };
    case "SET_ADRESSE_LIVRAISON":
      return { ...state, adresseLivraison: action.adresse };
    case "SET_ORDER_RESULT":
      return { ...state, orderResult: action.result };
    case "RESET":
      return initialCommandeState;
    default:
      return state;
  }
}
