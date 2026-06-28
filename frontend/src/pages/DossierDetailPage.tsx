import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createRequest, ApiError } from '../api/api';
import { AuthContext } from '../context/AuthContext';
import { Dossier, Commentaire, WorkflowEvent } from '../types';
import { parsePipeSeparated, getBadgeColor } from '../utils/parseHelpers';

export default function DossierDetailPage() {
  const { pk } = useParams();
  const navigate = useNavigate();
  const { token, refreshToken, setToken, onGlobalError, role } = useContext(AuthContext);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [comments, setComments] = useState<Commentaire[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowEvent[]>([]);
  const [statut, setStatut] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [traite, setTraite] = useState(false);
  const [inspecteurUsername, setInspecteurUsername] = useState('');
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [inspecteurs, setInspecteurs] = useState<Array<{ id: number; username: string; full_name: string }>>([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsCount, setCommentsCount] = useState(0);
  const [commentsNext, setCommentsNext] = useState<string | null>(null);
  const [commentsPrevious, setCommentsPrevious] = useState<string | null>(null);
  const [commentFilter, setCommentFilter] = useState<'ALL' | 'OBSERVATION' | 'ALERTE' | 'DECISION'>('ALL');
  const [commentType, setCommentType] = useState<'OBSERVATION' | 'ALERTE' | 'DECISION'>('OBSERVATION');
  const [priorite, setPriorite] = useState<'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE'>('MOYENNE');

  const prioriteColors: Record<string, string> = {
    BASSE: 'bg-slate-100 text-slate-700 border border-slate-200',
    MOYENNE: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    HAUTE: 'bg-orange-100 text-orange-700 border border-orange-200',
    URGENTE: 'bg-red-100 text-red-700 border border-red-200'
  };

  const commentTypeStyles: Record<string, string> = {
    OBSERVATION: 'bg-slate-100 text-slate-700 border border-slate-200',
    ALERTE: 'bg-red-100 text-red-700 border border-red-200',
    DECISION: 'bg-blue-100 text-blue-700 border border-blue-200'
  };

  useEffect(() => {
    if (!token || !pk) return;
    setLoading(true);
    const request = createRequest(token, refreshToken, setToken, onGlobalError);

    request(`/dossiers/${pk}/`)
      .then((dossierData) => {
        setDossier(dossierData);
        setStatut(dossierData.statut);
        setTraite(dossierData.traite || false);
        setPriorite((dossierData.priorite as 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE') || 'MOYENNE');

        return Promise.all([
          request('/workflow-events/').then((data) => data.results ?? data),
          request(`/dossiers/${dossierData.id_emp_hash}/comments/?page_size=5&page=1`).then((data) => data),
          (role === 'DIRECTEUR' || role === 'ADMIN') ? request('/inspecteurs/').then((data) => data) : Promise.resolve([])
        ]).then(([workflowData, commentsData, inspecteursData]) => {
          setWorkflow((workflowData as WorkflowEvent[]).filter((event) => event.dossier === dossierData.id));
          setComments((commentsData.results ?? commentsData) as Commentaire[]);
          setCommentsCount(commentsData.count ?? 0);
          setCommentsNext(commentsData.next ?? null);
          setCommentsPrevious(commentsData.previous ?? null);
          setCommentsPage(1);
          if (Array.isArray(inspecteursData)) {
            setInspecteurs(inspecteursData);
          }
          setLoading(false);
        });
      })
      .catch(() => {
        setLoading(false);
      });
  }, [token, refreshToken, setToken, onGlobalError, pk, role]);

  // Load comments on page change
  useEffect(() => {
    if (!token || !dossier || commentsPage === 1) return;
    const request = createRequest(token, refreshToken, setToken, onGlobalError);
    request(`/dossiers/${dossier.id_emp_hash}/comments/?page_size=5&page=${commentsPage}`)
      .then((data) => {
        setComments((data.results ?? data) as Commentaire[]);
        setCommentsCount(data.count ?? 0);
        setCommentsNext(data.next ?? null);
        setCommentsPrevious(data.previous ?? null);
      })
      .catch(() => {
        // ignore
      });
  }, [token, refreshToken, setToken, onGlobalError, dossier, commentsPage]);

  const handleStatusChange = async () => {
    if (!token || !dossier) return;
    
    const isConfirmed = window.confirm(
      `Confirmez-vous le passage du dossier au statut "${statut}" ?`
    );
    if (!isConfirmed) return;

    setError(null);
    const request = createRequest(token, refreshToken, setToken, onGlobalError);
    try {
      await request(`/dossiers/${pk}/changer-statut/`, {
        method: 'POST',
        body: JSON.stringify({ statut, commentaire: 'Mise à jour du statut depuis la plateforme' })
      });
      const updated = await request(`/dossiers/${pk}/`);
      setDossier(updated);
      setStatut(updated.statut);

      // Reload workflow events
      const workflowData = await request('/workflow-events/').then((data) => data.results ?? data);
      setWorkflow((workflowData as WorkflowEvent[]).filter((event) => event.dossier === updated.id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePriorityChange = async () => {
    if (!token || !dossier) return;
    
    setError(null);
    const request = createRequest(token, refreshToken, setToken, onGlobalError);
    try {
      const updated = await request(`/dossiers/${pk}/`, {
        method: 'PATCH',
        body: JSON.stringify({ priorite })
      });
      setDossier(updated);
      setPriorite((updated.priorite as 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE') || 'MOYENNE');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const addComment = async () => {
    if (!token || !dossier) return;
    if (!comment.trim()) {
      setFieldErrors({ comment: ["Le contenu du commentaire ne peut pas être vide."] });
      return;
    }

    setError(null);
    setFieldErrors({});
    const request = createRequest(token, refreshToken, setToken, onGlobalError);
    try {
      const newComment = await request(`/dossiers/${dossier.id_emp_hash}/comments/`, {
        method: 'POST',
        body: JSON.stringify({ contenu: comment, type_commentaire: commentType, is_interne: true })
      });
      setComments((prev) => [newComment, ...prev]);
      setComment('');
      setCommentType('OBSERVATION');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.fields) {
        setFieldErrors(err.fields);
      } else {
        setError((err as Error).message);
      }
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!token) return;
    
    const isConfirmed = window.confirm("Voulez-vous vraiment supprimer ce commentaire ?");
    if (!isConfirmed) return;

    setError(null);
    const request = createRequest(token, refreshToken, setToken, onGlobalError);
    try {
      await request(`/comments/${commentId}/`, { method: 'DELETE' });
      setComments((prev) => prev.filter((item) => item.id !== commentId));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleMarkTreated = async () => {
    if (!token || !dossier || role !== 'DIRECTEUR' && role !== 'ADMIN') return;
    
    setError(null);
    const request = createRequest(token, refreshToken, setToken, onGlobalError);
    try {
      const updated = await request(`/dossiers/${pk}/marquer-traite/`, {
        method: 'POST',
        body: JSON.stringify({ traite: !traite })
      });
      setDossier(updated);
      setTraite(updated.traite || false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleAssignInspecteur = async () => {
    if (!token || !dossier || !inspecteurUsername || (role !== 'DIRECTEUR' && role !== 'ADMIN')) return;
    
    setError(null);
    const request = createRequest(token, refreshToken, setToken, onGlobalError);
    try {
      const updated = await request(`/dossiers/${pk}/assigner-inspecteur/`, {
        method: 'POST',
        body: JSON.stringify({ inspecteur_id: parseInt(inspecteurUsername) })
      });
      setDossier(updated);
      setInspecteurUsername('');
      setShowAssignForm(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted">
        Chargement des détails du dossier...
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="mx-auto max-w-md text-center py-12">
        <h2 className="text-xl font-semibold text-text">Dossier introuvable</h2>
        <button
          onClick={() => navigate('/dossiers')}
          className="mt-4 rounded-xl bg-accent hover:bg-[#2d6a9f] px-4 py-2 text-sm text-white transition"
        >
          Retour aux dossiers
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-8">
      <div className="rounded-2xl border border-border bg-surface2/60 backdrop-blur-sm p-7 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dossiers')}
                className="text-sm text-accent hover:underline flex items-center gap-1 transition"
              >
                ← Retour
              </button>
              <span className="text-xs uppercase tracking-[0.15em] text-muted/75 font-semibold">Dossier #{dossier.id}</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold text-text">{typeof dossier.forme_nom === 'string' ? dossier.forme_nom : 'Dossier sans nom'}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
              className="rounded-lg border border-border bg-surface px-4 py-2.5 text-text outline-none focus:border-accent text-sm transition"
            >
              <option value="NOUVEAU">Nouveau</option>
              <option value="EN_COURS">En cours</option>
              <option value="SUSPENDU">Suspendu</option>
              <option value="CLOTURE">Clôturé</option>
            </select>
            <button
              onClick={handleStatusChange}
              className="rounded-lg bg-accent hover:bg-[#2d6a9f] px-4 py-2.5 text-sm font-semibold text-white transition"
            >
              Changer le statut
            </button>
            <select
              value={priorite}
              onChange={(e) => setPriorite(e.target.value as 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE')}
              className="rounded-lg border border-border bg-surface px-4 py-2.5 text-text outline-none focus:border-accent text-sm transition"
            >
              <option value="BASSE">Priorité Basse</option>
              <option value="MOYENNE">Priorité Moyenne</option>
              <option value="HAUTE">Priorité Haute</option>
              <option value="URGENTE">Priorité Urgente</option>
            </select>
            <button
              onClick={handlePriorityChange}
              className="rounded-lg border border-border bg-surface hover:bg-surface2 px-4 py-2.5 text-sm font-semibold text-text transition"
            >
              Sauvegarder priorité
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* File Information Details */}
          <section className="rounded-xl border border-border bg-surface p-6 space-y-5">
            <h2 className="text-lg font-semibold text-text border-b border-border/50 pb-3">Informations Générales</h2>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border/50 bg-surface2/50 p-4">
                <div className="text-xs uppercase tracking-[0.15em] font-semibold text-muted/75">Niveau de risque</div>
                <div className="mt-2 text-lg font-bold text-text">{typeof dossier.risk?.niveau_risque === 'string' ? dossier.risk.niveau_risque : 'N/A'}</div>
                <div className="mt-1 text-xs text-muted/75">Score risque: {typeof dossier.risk?.score_global === 'number' ? dossier.risk.score_global.toFixed(1) : '0.0'}</div>
              </div>
              
              <div className="rounded-lg border border-border/50 bg-surface2/50 p-4">
                <div className="text-xs uppercase tracking-[0.15em] font-semibold text-muted/75">Statut Actuel</div>
                <div className="mt-2 text-lg font-bold text-accent">{typeof dossier.statut === 'string' ? dossier.statut : 'N/A'}</div>
                <div className="mt-3 text-xs uppercase tracking-[0.15em] font-semibold text-muted/75 mb-1">Priorité</div>
                <div className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  priorite === 'BASSE' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                  priorite === 'MOYENNE' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                  priorite === 'HAUTE' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                  'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {priorite}
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.15em] font-semibold text-muted/75">Traité</div>
                <div className="mt-1 text-sm text-text">{dossier.traite ? '✓ Oui' : '○ Non'}</div>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-surface2/50 p-5 space-y-3 text-sm">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted/75 font-medium">Secteur :</span>
                <span className="text-text font-semibold">{typeof dossier.emp_secteur === 'string' ? dossier.emp_secteur : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted/75 font-medium">Région CNSS :</span>
                <span className="text-text font-semibold">{typeof dossier.reg_key === 'string' ? dossier.reg_key : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted/75 font-medium">Effectif déclaré :</span>
                <span className="text-text font-semibold">{dossier.emp_effectif ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted/75 font-medium">Ancienneté :</span>
                <span className="text-text font-semibold">{dossier.anciennete_annees ?? 'N/A'} ans</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted/75 font-medium">Montant Dette :</span>
                <span className="text-text font-bold text-accent">{typeof dossier.montant_dette_total === 'number' ? dossier.montant_dette_total.toLocaleString() : '0'} MRO</span>
              </div>
            </div>

            {/* Inspector and Treatment Status Actions (Director/Admin only) */}
            {(role === 'DIRECTEUR' || role === 'ADMIN') && (
              <div className="space-y-4 pt-2 border-t border-border/50">
                <h3 className="text-xs font-semibold text-text uppercase tracking-[0.15em]">Actions Administrateur</h3>
                
                {/* Mark as Treated */}
                <button
                  onClick={handleMarkTreated}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    traite
                      ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30'
                      : 'bg-surface2/50 text-muted/75 hover:text-text border border-border/50 hover:border-accent'
                  }`}
                >
                  {traite ? '✓ Dossier Traité' : '○ Marquer comme Traité'}
                </button>

                {/* Assign Inspector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted/75 uppercase tracking-[0.15em] font-semibold">Inspecteur Assigné</label>
                    <span className="text-sm font-semibold text-text">{dossier.inspecteur?.full_name || 'Aucun'}</span>
                  </div>
                  {showAssignForm ? (
                    <div className="flex gap-2">
                      <select
                        value={inspecteurUsername}
                        onChange={(e) => setInspecteurUsername(e.target.value)}
                        className="flex-1 rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-text outline-none focus:border-accent transition"
                      >
                        <option value="">Sélectionner un inspecteur...</option>
                        {inspecteurs.map((insp) => (
                          <option key={insp.id} value={insp.id.toString()}>
                            {insp.full_name} (@{insp.username})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAssignInspecteur}
                        disabled={!inspecteurUsername.trim()}
                        className="rounded-lg bg-accent hover:bg-[#2d6a9f] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition"
                      >
                        Assigner
                      </button>
                      <button
                        onClick={() => setShowAssignForm(false)}
                        className="rounded-xl border border-border bg-surface hover:bg-surface2 px-4 py-2 text-sm font-semibold text-text transition"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAssignForm(true)}
                      className="w-full rounded-xl border border-border bg-surface2 hover:bg-surface px-4 py-2 text-sm font-semibold text-text transition"
                    >
                      Changer l'inspecteur
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Comments and Workflow Events */}
          <section className="space-y-6">
            {/* Rules Explainability Section */}
            {dossier.regles && (dossier.regles.regles_declenchees || dossier.regles.nb_regles) && (
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
                <h2 className="text-lg font-semibold text-text border-b border-border pb-3">Moteur de Règles - Explainabilité</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-surface2 p-4 space-y-3">
                    <div className="text-xs uppercase tracking-[0.15em] font-semibold text-muted">Règles Déclenchées</div>
                    <div className="text-sm font-medium text-text mb-2">Total: {typeof dossier.regles.nb_regles === 'number' ? dossier.regles.nb_regles : 0} règles</div>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const rules = parsePipeSeparated(dossier.regles.regles_declenchees);
                        if (rules.length > 0) {
                          return rules.map((rule) => (
                            <span key={rule} className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold ${getBadgeColor(rule)}`}>
                              {rule}
                            </span>
                          ));
                        }
                        if ((dossier.regles.nb_regles ?? 0) > 0) {
                          return (
                            <span className="inline-flex rounded-lg px-3 py-1 text-xs font-semibold bg-surface border border-border text-muted">
                              {dossier.regles.nb_regles} règle(s) (détails indisponibles)
                            </span>
                          );
                        }
                        return <span className="text-sm text-muted">Aucune règle déclenchée</span>;
                      })()}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-surface2 p-4 space-y-3">
                    <div className="text-xs uppercase tracking-[0.15em] font-semibold text-muted">Interactions Détectées</div>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const interactions = parsePipeSeparated(dossier.regles.interactions_detectees);
                        if (interactions.length > 0) {
                          return interactions.map((interaction) => (
                            <span key={interaction} className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold ${getBadgeColor(interaction)}`}>
                              {interaction}
                            </span>
                          ));
                        }
                        // Fallback: backend may return '{}' or '[]' as strings while nb_regles > 0
                        if ((dossier.regles.nb_regles ?? 0) > 0) {
                          return (
                            <span className="inline-flex rounded-lg px-3 py-1 text-xs font-semibold bg-surface border border-border text-muted">
                              {dossier.regles.nb_regles} interaction(s) (détails indisponibles)
                            </span>
                          );
                        }
                        return <span className="text-sm text-muted">Aucune interaction détectée</span>;
                      })()}
                    </div>
                  </div>
                </div>
                {(dossier.regles.top_feature_1 || dossier.regles.top_feature_2 || dossier.regles.top_feature_3) && (
                  <div className="rounded-xl border border-border bg-surface2 p-4 space-y-2">
                    <div className="text-xs uppercase tracking-[0.15em] text-muted font-semibold">Top Features de Risque</div>
                    <ul className="space-y-1 text-sm text-text">
                      {typeof dossier.regles.top_feature_1 === 'string' && dossier.regles.top_feature_1 && <li>• {dossier.regles.top_feature_1}</li>}
                      {typeof dossier.regles.top_feature_2 === 'string' && dossier.regles.top_feature_2 && <li>• {dossier.regles.top_feature_2}</li>}
                      {typeof dossier.regles.top_feature_3 === 'string' && dossier.regles.top_feature_3 && <li>• {dossier.regles.top_feature_3}</li>}
                    </ul>
                  </div>
                )}
                {typeof dossier.regles.recommandation_1 === 'string' && dossier.regles.recommandation_1 && (
                  <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                    <div className="text-xs uppercase tracking-[0.15em] text-accent font-semibold mb-2">Recommandation</div>
                    <p className="text-sm text-text leading-relaxed">{dossier.regles.recommandation_1}</p>
                  </div>
                )}
              </div>
            )}

            {/* Anomaly Detection Section */}
            {dossier.anomalie && (dossier.anomalie.score_anomalie !== undefined || dossier.anomalie.niveau_anomalie) && (
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
                <h2 className="text-lg font-semibold text-text border-b border-border pb-3">Détection d'Anomalies</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-surface2 p-4">
                    <div className="text-xs uppercase tracking-[0.15em] text-muted">Score d'Anomalie</div>
                    <div className="mt-2 text-lg font-bold text-text">{(dossier.anomalie.score_anomalie || 0).toFixed(2)}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-surface2 p-4">
                    <div className="text-xs uppercase tracking-[0.15em] text-muted">Niveau d'Anomalie</div>
                    <div className="mt-2 text-base font-semibold text-text">{dossier.anomalie.niveau_anomalie || 'N/A'}</div>
                    {dossier.anomalie.is_outlier_iforest && (
                      <div className="mt-2 inline-flex rounded-full bg-red-500/10 text-red-300 border border-red-500/30 px-2.5 py-1 text-xs font-semibold">
                        Outlier Détecté
                      </div>
                    )}
                  </div>
                </div>
                {(dossier.anomalie.anomalie_top_1 || dossier.anomalie.anomalie_top_2 || dossier.anomalie.anomalie_top_3) && (
                  <div className="rounded-xl border border-border bg-surface2 p-4 space-y-2">
                    <div className="text-xs uppercase tracking-[0.15em] text-muted font-semibold">Anomalies Principales</div>
                    <ul className="space-y-1 text-sm text-text">
                      {typeof dossier.anomalie.anomalie_top_1 === 'string' && dossier.anomalie.anomalie_top_1 && <li>• {dossier.anomalie.anomalie_top_1}</li>}
                      {typeof dossier.anomalie.anomalie_top_2 === 'string' && dossier.anomalie.anomalie_top_2 && <li>• {dossier.anomalie.anomalie_top_2}</li>}
                      {typeof dossier.anomalie.anomalie_top_3 === 'string' && dossier.anomalie.anomalie_top_3 && <li>• {dossier.anomalie.anomalie_top_3}</li>}
                    </ul>
                  </div>
                )}
                {typeof dossier.anomalie.recommandation_2 === 'string' && dossier.anomalie.recommandation_2 && (
                  <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                    <div className="text-xs uppercase tracking-[0.15em] text-accent font-semibold mb-2">Recommandation</div>
                    <p className="text-sm text-text leading-relaxed">{dossier.anomalie.recommandation_2}</p>
                  </div>
                )}
              </div>
            )}

            {/* Comment adding form */}
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-5">
              <h2 className="text-lg font-semibold text-text border-b border-border pb-3">Commentaires & Observations</h2>
              
              <div className="space-y-4">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Écrire un commentaire..."
                  className={`w-full rounded-xl border ${fieldErrors.comment ? 'border-red-500' : 'border-border'} bg-surface2 px-4 py-3 text-text outline-none focus:border-accent text-sm placeholder-muted/50 transition`}
                />
                {fieldErrors.comment && (
                  <p className="text-xs text-red-400 font-medium">{fieldErrors.comment[0]}</p>
                )}
                
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs uppercase tracking-[0.1em] text-muted mb-2 font-semibold">Type de commentaire</label>
                    <select
                      value={commentType}
                      onChange={(e) => setCommentType(e.target.value as 'OBSERVATION' | 'ALERTE' | 'DECISION')}
                      className="w-full rounded-xl border border-border bg-surface2 px-4 py-2.5 text-text outline-none focus:border-accent text-sm transition"
                    >
                      <option value="OBSERVATION">Observation</option>
                      <option value="ALERTE">Alerte</option>
                      <option value="DECISION">Décision</option>
                    </select>
                  </div>
                  <div className="flex-none">
                    <button
                      onClick={addComment}
                      disabled={!comment.trim()}
                      className="rounded-xl bg-accent hover:bg-[#2d6a9f] disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-semibold text-white transition mt-[22px]"
                    >
                      Publier
                    </button>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="mt-6 space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {comments.length > 0 ? (
                  <>
                    {comments.map((item) => (
                      <div key={item.id} className="rounded-xl border border-border bg-surface2 p-4 text-sm hover:border-accent/30 transition">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-medium text-text truncate">{typeof item.auteur_name === 'string' ? item.auteur_name : 'Inconnu'}</span>
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0 ${commentTypeStyles[typeof item.type_commentaire === 'string' ? item.type_commentaire : 'OBSERVATION'] ?? 'bg-surface border border-border text-text'}`}>
                              {typeof item.type_commentaire === 'string' ? item.type_commentaire : 'OBSERVATION'}
                            </span>
                          </div>
                          <span className="text-xs text-muted flex-shrink-0">{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-text leading-relaxed mb-3">{typeof item.contenu === 'string' ? item.contenu : ''}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted">{new Date(item.created_at).toLocaleTimeString()}</span>
                          <button
                            onClick={() => deleteComment(item.id)}
                            className="text-xs text-red-400 hover:text-red-300 transition font-medium"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-center text-sm text-muted py-8">Aucun commentaire pour le moment.</p>
                )}
              </div>

              {/* Comments Pagination */}
              {commentsCount > 5 && (
                <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <div className="font-semibold">
                      {commentsCount} commentaire{commentsCount > 1 ? 's' : ''} - 
                      Page {commentsPage} sur {Math.ceil(commentsCount / 5)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setCommentsPage(Math.max(1, commentsPage - 1))}
                      disabled={commentsPage === 1}
                      className="rounded-lg border border-border bg-surface hover:bg-surface2 px-3 py-1.5 text-xs font-semibold text-text transition disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ← Précédent
                    </button>
                    <span className="text-xs text-muted px-2">
                      {(commentsPage - 1) * 5 + 1}–{Math.min(commentsPage * 5, commentsCount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCommentsPage(commentsPage + 1)}
                      disabled={commentsPage >= Math.ceil(commentsCount / 5)}
                      className="rounded-lg border border-border bg-surface hover:bg-surface2 px-3 py-1.5 text-xs font-semibold text-text transition disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Suivant →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Workflow Events List */}
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold text-text border-b border-border pb-3">Historique des Événements Workflow</h2>
              <div className="mt-4 space-y-3 max-h-[200px] overflow-y-auto pr-1">
                {workflow.map((event) => (
                  <div key={event.id} className="rounded-xl border border-border bg-surface2 p-4 text-sm">
                    <div className="flex items-center justify-between text-xs text-muted mb-2">
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                      <span className="font-semibold text-accent">{event.ancien_statut} → {event.nouveau_statut}</span>
                    </div>
                    <p className="text-text font-medium">{typeof event.commentaire === 'string' ? event.commentaire || 'Aucun commentaire renseigné.' : 'Aucun commentaire renseigné.'}</p>
                  </div>
                ))}
                {workflow.length === 0 && (
                  <p className="text-center text-sm text-muted py-4">Aucun événement de transition enregistré.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
