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
  const navigate = useNavigate();

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
    query.set('page_size', '100');

    request(`/dossiers/?${query.toString()}`)
      .then((data) => {
        setDossiers(data.results ?? data);
      })
      .catch((err) => {
        setError((err as Error).message);
      });
  }, [token, refreshToken, setToken, onGlobalError, search, statut, niveauRisque, inspecteurId, quadrant, traite]);

  useEffect(() => {
    if (!token || !role || (role !== 'DIRECTEUR' && role !== 'ADMIN')) return;

    const request = createRequest(token, refreshToken, setToken, onGlobalError);
    request('/inspecteurs/')
      .then((data) => setInspecteurs(data))
      .catch(() => {
        // ignore inspector list loading errors here, filters will remain hidden
      });
  }, [token, refreshToken, setToken, onGlobalError, role]);

  const totalDossiers = useMemo(() => dossiers.length, [dossiers]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="rounded-3xl border border-border bg-surface2 p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Dossiers d'Inspection</div>
            <h1 className="mt-2 text-3xl font-semibold text-text">Tous les dossiers</h1>
            <div className="text-sm text-muted mt-1">{totalDossiers} dossiers affichés</div>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une entreprise ou ID EMP hash..."
              className="rounded-2xl border border-border bg-surface px-4 py-3 text-text outline-none focus:border-accent placeholder-muted/50"
            />
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
              className="rounded-2xl border border-border bg-surface px-4 py-3 text-text outline-none focus:border-accent"
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
              className="rounded-2xl border border-border bg-surface px-4 py-3 text-text outline-none focus:border-accent"
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
                className="rounded-2xl border border-border bg-surface px-4 py-3 text-text outline-none focus:border-accent"
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
              className="rounded-2xl border border-border bg-surface px-4 py-3 text-text outline-none focus:border-accent"
            >
              <option value="">Traitement</option>
              <option value="true">Traité</option>
              <option value="false">Non traité</option>
            </select>
            <select
              value={niveauRisque}
              onChange={(e) => setNiveauRisque(e.target.value)}
              className="rounded-2xl border border-border bg-surface px-4 py-3 text-text outline-none focus:border-accent"
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
          <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="border-b border-border bg-surface2">
              <tr>
                <th className="px-6 py-4 text-muted font-semibold">ID</th>
                <th className="px-6 py-4 text-muted font-semibold">Entreprise</th>
                <th className="px-6 py-4 text-muted font-semibold">Secteur</th>
                <th className="px-6 py-4 text-muted font-semibold">Risque</th>
                <th className="px-6 py-4 text-muted font-semibold">Statut</th>
                <th className="px-6 py-4 text-muted font-semibold text-right">Score</th>
                <th className="px-6 py-4 text-muted font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dossiers.map((dossier) => (
                <tr
                  key={dossier.id}
                  onClick={() => navigate(`/dossiers/${dossier.id}`)}
                  className="hover:bg-surface2/50 cursor-pointer transition"
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
                  <td colSpan={7} className="px-6 py-8 text-center text-muted">
                    Aucun dossier trouvé pour ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
