import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createRequest, ApiError } from '../api/api';
import { AuthContext } from '../context/AuthContext';
import { Dossier, Commentaire, WorkflowEvent } from '../types';

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

  useEffect(() => {
    if (!token || !pk) return;
    setLoading(true);
    const request = createRequest(token, refreshToken, setToken, onGlobalError);

    request(`/dossiers/${pk}/`)
      .then((dossierData) => {
        setDossier(dossierData);
        setStatut(dossierData.statut);
        setTraite(dossierData.traite || false);

        return Promise.all([
          request('/workflow-events/').then((data) => data.results ?? data),
          request(`/dossiers/${dossierData.id_emp_hash}/comments/`).then((data) => data.results ?? data),
          (role === 'DIRECTEUR' || role === 'ADMIN') ? request('/inspecteurs/').then((data) => data) : Promise.resolve([])
        ]).then(([workflowData, commentsData, inspecteursData]) => {
          setWorkflow((workflowData as WorkflowEvent[]).filter((event) => event.dossier === dossierData.id));
          setComments(commentsData as Commentaire[]);
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
        body: JSON.stringify({ contenu: comment, type_commentaire: 'OBSERVATION', is_interne: true })
      });
      setComments((prev) => [newComment, ...prev]);
      setComment('');
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
      await request(`/comments/${commentId}/`, { method: 'DELETE', suppressGlobalError: true });
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

  const handleDeleteDossier = async () => {
    if (!token || !dossier) return;

    const isConfirmed = window.confirm(
      `Confirmez-vous la suppression définitive du dossier #${dossier.id} ?`
    );
    if (!isConfirmed) return;

    setError(null);
    const request = createRequest(token, refreshToken, setToken, onGlobalError);
    try {
      await request(`/dossiers/${pk}/`, { method: 'DELETE', suppressGlobalError: true });
      navigate('/dossiers');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Erreur ${err.status} : ${err.message}`);
      } else {
        setError((err as Error).message);
      }
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
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="rounded-3xl border border-border bg-surface2 p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dossiers')}
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                ← Retour
              </button>
              <span className="text-xs uppercase tracking-[0.2em] text-muted font-mono">Dossier #{dossier.id}</span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-text">{dossier.forme_nom}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-text outline-none focus:border-accent text-sm"
            >
              <option value="NOUVEAU">Nouveau</option>
              <option value="EN_COURS">En cours</option>
              <option value="SUSPENDU">Suspendu</option>
              <option value="CLOTURE">Clôturé</option>
            </select>
            <button
              onClick={handleStatusChange}
              className="rounded-xl bg-accent hover:bg-[#2d6a9f] px-4 py-2.5 text-sm font-semibold text-white transition"
            >
              Changer le statut
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* File Information Details */}
          <section className="rounded-2xl border border-border bg-surface p-6 space-y-6">
            <h2 className="text-lg font-semibold text-text border-b border-border pb-3">Informations Générales</h2>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface2 p-4">
                <div className="text-xs uppercase tracking-[0.15em] text-muted">Niveau de risque</div>
                <div className="mt-2 text-lg font-bold text-text">{dossier.niveau_risque}</div>
                <div className="mt-1 text-xs text-muted">Score global: {(dossier.score_global || 0).toFixed(1)}</div>
              </div>
              
              <div className="rounded-xl border border-border bg-surface2 p-4">
                <div className="text-xs uppercase tracking-[0.15em] text-muted">Statut Actuel</div>
                <div className="mt-2 text-lg font-bold text-accent">{dossier.statut}</div>
                <div className="mt-1 text-xs text-muted">Priorité: {dossier.priorite}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.15em] text-muted">Traité</div>
                <div className="mt-1 text-sm text-text">{dossier.traite ? 'Oui' : 'Non'}</div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface2 p-4 space-y-3 text-sm">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted">Secteur :</span>
                <span className="text-text font-medium">{dossier.emp_secteur}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted">Région CNSS :</span>
                <span className="text-text font-medium">{dossier.reg_key}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted">Effectif déclaré :</span>
                <span className="text-text font-medium">{dossier.emp_effectif ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted">Ancienneté :</span>
                <span className="text-text font-medium">{dossier.anciennete_annees ?? 'N/A'} ans</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Montant Dette :</span>
                <span className="text-text font-bold text-accent">{(dossier.montant_dette_total || 0).toLocaleString()} MRO</span>
              </div>
            </div>

            {/* Inspector and Treatment Status Actions (Director/Admin only) */}
            {(role === 'DIRECTEUR' || role === 'ADMIN') && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text uppercase tracking-[0.1em] border-t border-border pt-4">Actions Administrateur</h3>
                
                {/* Mark as Treated */}
                <button
                  onClick={handleMarkTreated}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    traite
                      ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30'
                      : 'bg-surface2 text-muted hover:text-text border border-border hover:border-accent'
                  }`}
                >
                  {traite ? '✓ Dossier Traité' : '○ Marquer comme Traité'}
                </button>

                {/* Assign Inspector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted uppercase tracking-[0.1em]">Inspecteur Assigné</label>
                    <span className="text-sm font-semibold text-text">{dossier.inspecteur?.full_name || 'Aucun'}</span>
                  </div>
                  {showAssignForm ? (
                    <div className="flex gap-2">
                      <select
                        value={inspecteurUsername}
                        onChange={(e) => setInspecteurUsername(e.target.value)}
                        className="flex-1 rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-text outline-none focus:border-accent"
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
                        className="rounded-xl bg-accent hover:bg-[#2d6a9f] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition"
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
                <button
                  onClick={handleDeleteDossier}
                  className="w-full rounded-xl border border-red-400 bg-red-500/10 text-red-700 hover:bg-red-500/15 px-4 py-3 text-sm font-semibold transition"
                >
                  Supprimer le dossier
                </button>
              </div>
            )}
          </section>

          {/* Comments and Workflow Events */}
          <section className="space-y-6">
            {/* Comment adding form */}
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
              <h2 className="text-lg font-semibold text-text border-b border-border pb-3">Commentaires & Observations</h2>
              
              <div className="space-y-3">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Écrire un commentaire..."
                  className={`w-full rounded-xl border ${fieldErrors.comment ? 'border-red-500' : 'border-border'} bg-surface2 px-4 py-3 text-text outline-none focus:border-accent text-sm placeholder-muted/50`}
                />
                {fieldErrors.comment && (
                  <p className="text-xs text-red-400 font-medium">{fieldErrors.comment[0]}</p>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={addComment}
                    className="rounded-xl bg-accent hover:bg-[#2d6a9f] px-4 py-2 text-sm font-semibold text-white transition"
                  >
                    Publier le commentaire
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div className="mt-4 space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {comments.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border bg-surface2 p-4 text-sm">
                    <div className="flex items-center justify-between gap-4 text-xs text-muted mb-2">
                      <span>{item.auteur_name}</span>
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-text leading-relaxed">{item.contenu}</p>
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => deleteComment(item.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-center text-sm text-muted py-4">Aucun commentaire pour le moment.</p>
                )}
              </div>
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
                    <p className="text-text font-medium">{event.commentaire || 'Aucun commentaire renseigné.'}</p>
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
