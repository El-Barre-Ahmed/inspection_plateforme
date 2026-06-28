import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRequest } from '../api/api';
import { AuthContext } from '../context/AuthContext';
import { Dossier } from '../types';

const statutColors: Record<string, string> = {
  NOUVEAU: 'bg-[#1e3a5f] text-[#cbd5e1] border border-[#2f4460]',
  EN_COURS: 'bg-[#3d7ab5]/20 text-[#f0f4f8] border border-[#3d7ab5]',
  SUSPENDU: 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30',
  CLOTURE: 'bg-green-500/10 text-green-300 border border-green-500/30'
};

const risqueColors: Record<string, string> = {
  FAIBLE: 'bg-green-500/10 text-green-300 border border-green-500/30',
  MOYEN: 'bg-yellow-500/10 text-yellow-300 border border-[#3d7ab5]/40',
  ELEVÉ: 'bg-orange-500/10 text-orange-300 border border-orange-500/30',
  ÉLEVÉ: 'bg-orange-500/10 text-orange-300 border border-orange-500/30',
  CRITIQUE: 'bg-red-500/10 text-red-300 border border-red-500/30'
};

const prioriteColors: Record<string, string> = {
  BASSE: 'bg-slate-100 text-slate-700 border border-slate-200',
  MOYENNE: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  HAUTE: 'bg-orange-100 text-orange-700 border border-orange-200',
  URGENTE: 'bg-red-100 text-red-700 border border-red-200'
};

export default function DossiersPage() {
  const { token, refreshToken, setToken, onGlobalError, role } = useContext(AuthContext);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [niveauRisque, setNiveauRisque] = useState('');
  const [inspecteurId, setInspecteurId] = useState('');
  const [quadrant, setQuadrant] = useState('');
  const [traite, setTraite] = useState('');
  const [inspecteurs, setInspecteurs] = useState<Array<{ id: number; username: string; full_name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [previousPage, setPreviousPage] = useState<string | null>(null);
  const pageSize = 20;
  const navigate = useNavigate();

  useEffect(() => {
    setPage(1);
  }, [search, statut, niveauRisque, inspecteurId, quadrant, traite]);

  useEffect(() => {
    if (!token) return;
    const request = createRequest(token, refreshToken, setToken, onGlobalError);

    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (statut) query.set('statut', statut);
    if (niveauRisque) query.set('niveau_risque', niveauRisque);
    if (inspecteurId) query.set('inspecteur', inspecteurId);
    if (quadrant) query.set('quadrant', quadrant);
    if (traite) query.set('traite', traite === 'true' ? 'true' : 'false');
    query.set('page_size', String(pageSize));
    query.set('page', String(page));

    request(`/dossiers/?${query.toString()}`)
      .then((data) => {
        setDossiers(data.results ?? data);
        setCount(data.count ?? (Array.isArray(data) ? data.length : 0));
        setNextPage(data.next ?? null);
        setPreviousPage(data.previous ?? null);
      })
      .catch((err) => {
        setError((err as Error).message);
      });
  }, [token, refreshToken, setToken, onGlobalError, search, statut, niveauRisque, inspecteurId, quadrant, traite, page]);

  useEffect(() => {
    if (!token || !role || (role !== 'DIRECTEUR' && role !== 'ADMIN')) return;

    const request = createRequest(token, refreshToken, setToken, onGlobalError);
    request('/inspecteurs/')
      .then((data) => setInspecteurs(data))
      .catch(() => {
        // ignore inspector list loading errors here, filters will remain hidden
      });
  }, [token, refreshToken, setToken, onGlobalError, role]);

  const totalDossiers = useMemo(() => count || dossiers.length, [count, dossiers]);
  const totalPages = Math.max(1, Math.ceil((count || dossiers.length) / pageSize));

  const handlePreviousPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-8">
      <div className="rounded-2xl border border-border bg-surface2/60 backdrop-blur-sm p-7 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-semibold text-muted/75">Dossiers d'Inspection</div>
            <h1 className="mt-3 text-3xl font-bold text-text">Tous les dossiers</h1>
            <div className="text-sm text-muted/75 mt-2 font-medium">{totalDossiers} dossier{totalDossiers > 1 ? 's' : ''}</div>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder-muted/50"
            />
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-accent transition"
            >
              <option value="">Tous les statuts</option>
              <option value="NOUVEAU">Nouveau</option>
              <option value="EN_COURS">En cours</option>
              <option value="SUSPENDU">Suspendu</option>
              <option value="CLOTURE">Clôturé</option>
            </select>
            <select
              value={quadrant}
              onChange={(e) => setQuadrant(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-accent transition"
            >
              <option value="">Tous les quadrants</option>
              <option value="Q4_LOW_RISK_LOW_ANOMALY">Q4 - Faible risque / Faible anomalie</option>
              <option value="Q3_HIGH_RISK_LOW_ANOMALY">Q3 - Risque élevé / Faible anomalie</option>
              <option value="Q2_HIGH_RISK_HIGH_ANOMALY">Q2 - Risque élevé / Anomalie élevée</option>
              <option value="Q1_LOW_RISK_HIGH_ANOMALY">Q1 - Faible risque / Anomalie élevée</option>
            </select>
            {(role === 'DIRECTEUR' || role === 'ADMIN') && (
              <select
                value={inspecteurId}
                onChange={(e) => setInspecteurId(e.target.value)}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-accent transition"
              >
                <option value="">Tous les inspecteurs</option>
                {inspecteurs.map((inspecteur) => (
                  <option key={inspecteur.id} value={inspecteur.id.toString()}>
                    {inspecteur.full_name} (@{inspecteur.username})
                  </option>
                ))}
              </select>
            )}
            <select
              value={traite}
              onChange={(e) => setTraite(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-accent transition"
            >
              <option value="">Traitement</option>
              <option value="true">Traité</option>
              <option value="false">Non traité</option>
            </select>
            <select
              value={niveauRisque}
              onChange={(e) => setNiveauRisque(e.target.value)}
              className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-accent transition"
            >
              <option value="">Tous les risques</option>
              <option value="FAIBLE">Faible</option>
              <option value="MOYEN">Moyen</option>
              <option value="Élevé">Élevé</option>
              <option value="CRITIQUE">Critique</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="border-b border-border bg-surface2/50 sticky top-0">
              <tr>
                <th className="px-5 py-3.5 text-muted font-semibold text-xs uppercase">ID</th>
                <th className="px-5 py-3.5 text-muted font-semibold text-xs uppercase">Entreprise</th>
                <th className="px-5 py-3.5 text-muted font-semibold text-xs uppercase">Secteur</th>
                <th className="px-5 py-3.5 text-muted font-semibold text-xs uppercase">Risque</th>
                <th className="px-5 py-3.5 text-muted font-semibold text-xs uppercase">Priorité</th>
                <th className="px-5 py-3.5 text-muted font-semibold text-xs uppercase">Statut</th>
                <th className="px-5 py-3.5 text-muted font-semibold text-xs uppercase text-right">Score</th>
                <th className="px-5 py-3.5 text-muted font-semibold text-xs uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {dossiers.map((dossier) => (
                <tr
                  key={dossier.id}
                  onClick={() => navigate(`/dossiers/${dossier.id}`)}
                  className="hover:bg-surface2/40 cursor-pointer transition"
                >
                  <td className="px-6 py-4 text-muted font-mono text-xs">#{dossier.id}</td>
                  <td className="px-6 py-4 text-text font-semibold">{dossier.forme_nom}</td>
                  <td className="px-6 py-4 text-muted">{dossier.emp_secteur}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${risqueColors[dossier.niveau_risque] ?? 'bg-surface border border-border text-text'}`}>
                      {dossier.niveau_risque}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${prioriteColors[dossier.priorite] ?? 'bg-surface border border-border text-text'}`}>
                      {dossier.priorite}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statutColors[dossier.statut] ?? 'bg-surface border border-border text-text'}`}>
                      {dossier.statut}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text font-semibold text-right">
                    {(dossier.score_global || 0).toFixed(1)}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/dossiers/${dossier.id}`)}
                      className="rounded-xl border border-border bg-surface hover:bg-[#2d6a9f]/10 hover:border-[#2d6a9f]/30 px-3 py-2 text-xs font-semibold text-text transition"
                    >
                      Voir Détail
                    </button>
                  </td>
                </tr>
              ))}
              {dossiers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-muted">
                    Aucun dossier trouvé pour ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-5 border-t border-border/50 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted">
            <div className="font-semibold">
              {count} dossier{count > 1 ? 's' : ''} - 
              Page {page} sur {totalPages}
            </div>
          </div>
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <span className="text-xs text-muted px-2 sm:hidden">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count)}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={page <= 1}
                className="rounded-lg border border-border bg-surface hover:bg-surface2 px-3 py-1.5 text-xs font-semibold text-text transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Précédent
              </button>
              <span className="hidden text-xs text-muted px-2 sm:block">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, count)}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={page >= totalPages}
                className="rounded-lg border border-border bg-surface hover:bg-surface2 px-3 py-1.5 text-xs font-semibold text-text transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivant →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
