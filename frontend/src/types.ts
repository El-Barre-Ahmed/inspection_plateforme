export type Dossier = {
  id: number;
  id_emp_hash: string;
  forme_nom: string;
  emp_secteur: string;
  reg_key: string;
  anciennete_annees?: number;
  emp_effectif?: number;
  emp_stop_co?: boolean;
  activity_status?: string;
  has_declaration?: boolean;
  has_payment?: boolean;
  montant_dette_total: number;
  niveau_risque: string;
  niveau_anomalie?: string;
  quadrant: string;
  statut: string;
  priorite: string;
  score_global?: number;
  inspecteur?: { id: number; username: string; full_name: string };
  traite?: boolean;
  comments_url?: string;
};

export type Commentaire = {
  id: number;
  auteur: number;
  auteur_name: string;
  contenu: string;
  type_commentaire: string;
  created_at: string;
  is_interne: boolean;
  is_read?: boolean;
  read_at?: string | null;
};

export type WorkflowEvent = {
  id: number;
  dossier: number;
  acteur: number | null;
  ancien_statut: string;
  nouveau_statut: string;
  commentaire?: string;
  timestamp: string;
};

export type Kpis = {
  total_dossiers: number;
  dossiers_critiques: number;
  dossiers_en_cours: number;
  dossiers_clotures: number;
  dossiers_traites: number;
  dossiers_non_traites: number;
  taux_traitement: number;
  montant_dette_total: number;
  nb_fraudes_confirmees: number;
};

export type RegionStat = {
  reg_key: string;
  nb_dossiers: number;
  avg_score_global: number;
  nb_critiques: number;
  montant_dette: number;
};

export type InspecteurPerf = {
  inspecteur__id: number;
  inspecteur__username: string;
  nb_dossiers_assignes: number;
  nb_traites: number;
  nb_en_cours: number;
  score_moyen_portefeuille: number;
  taux_traitement: number;
};
