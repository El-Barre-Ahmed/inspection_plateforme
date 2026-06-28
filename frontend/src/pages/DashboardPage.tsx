import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { createRequest } from '../api/api';
import { Kpis, RegionStat, InspecteurPerf, Dossier, Commentaire } from '../types';

function Card({ title, value, children }: { title: string; value: string | number; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm hover:shadow-md transition h-full flex flex-col">
      <div className="text-xs uppercase tracking-[0.15em] font-semibold text-muted/75">{title}</div>
      <div className="mt-3 text-2xl font-semibold text-text">{value}</div>
      {children && <div className="mt-4 flex-1">{children}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { token, role, refreshToken, setToken, onGlobalError } = useContext(AuthContext);
  const navigate = useNavigate();
  const request = createRequest(token, refreshToken, setToken, onGlobalError);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [repartitionRisque, setRepartitionRisque] = useState<Record<string, number>>({});
  const [repartitionQuadrant, setRepartitionQuadrant] = useState<Record<string, number>>({});
  const [regions, setRegions] = useState<RegionStat[]>([]);
  const [inspecteurs, setInspecteurs] = useState<InspecteurPerf[]>([]);
  
  // Inspector-specific state
  const [inspectorStats, setInspectorStats] = useState<{ statut: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [alertSignature, setAlertSignature] = useState('');
  const [criticalDossiers, setCriticalDossiers] = useState<Dossier[]>([]);
  const [notifications, setNotifications] = useState<Commentaire[]>([]);

  const getDismissedAlertSignature = () => {
    return typeof window !== 'undefined' ? localStorage.getItem('dashboard_alert_signature') ?? '' : '';
  };

  const setDismissedAlertSignature = (signature: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_alert_signature', signature);
    }
  };

  useEffect(() => {
    if (role !== 'INSPECTEUR') return;
    const inP = inspectorStats.find((item) => item.statut === 'EN_COURS')?.total ?? 0;
    const susp = inspectorStats.find((item) => item.statut === 'SUSPENDU')?.total ?? 0;
    const dossierSignature = criticalDossiers
      .map((d) => `${d.id}-${d.forme_nom}-${d.statut}-${d.traite ? 'T' : 'F'}`)
      .sort()
      .join(',');
    const signature = `${inP}-${susp}-${dossierSignature}`;

    setAlertSignature(signature);
    setAlertDismissed(getDismissedAlertSignature() !== signature);
  }, [inspectorStats, criticalDossiers, role]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const request = createRequest(token, refreshToken, setToken, onGlobalError);

    if (role === 'DIRECTEUR' || role === 'ADMIN') {
      Promise.all([
        request('/dashboard/'),
        request('/top-regions/'),
        request('/performance-inspecteurs/')
      ])
        .then(([dashboardData, regionsData, inspectorData]) => {
          setKpis(dashboardData.kpis);
          setRepartitionRisque(dashboardData.repartition_risque || {});
          setRepartitionQuadrant(dashboardData.repartition_quadrant || {});
          setRegions(regionsData);
          setInspecteurs(inspectorData);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      // Inspector dashboard
      request('/dossiers/mes-stats/')
        .then((data) => {
          const stats = data.dossiers_par_statut || [];
          setInspectorStats(stats);

          // If there are critical dossiers, additionally fetch a short list (EN_COURS + SUSPENDU)
          const inP = stats.find((item: any) => item.statut === 'EN_COURS')?.total ?? 0;
          const susp = stats.find((item: any) => item.statut === 'SUSPENDU')?.total ?? 0;
          const crit = inP + susp;

          if (crit > 0) {
            Promise.all([
              request('/dossiers/?statut=EN_COURS&page_size=5'),
              request('/dossiers/?statut=SUSPENDU&page_size=5')
            ])
              .then(([enCoursData, suspData]) => {
                const enCours = enCoursData.results ?? enCoursData;
                const suspList = suspData.results ?? suspData;
                const combined = [...(enCours || []), ...(suspList || [])];
                setCriticalDossiers(combined.slice(0, 5));
              })
              .catch(() => {
                // ignore fetching critical list errors
              });
          } else {
            setCriticalDossiers([]);
          }

          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
    // fetch notifications for inspector
    if (role === 'INSPECTEUR') {
      request('/notifications/')
        .then((data) => setNotifications(data))
        .catch(() => {});
    }
  }, [token, role, refreshToken, setToken, onGlobalError]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted">
        Chargement des données du tableau de bord...
      </div>
    );
  }

  // Render Inspector Dashboard

  if (role === 'INSPECTEUR') {
    const totalAssigned = inspectorStats.reduce((sum, item) => sum + item.total, 0);
    const inProgress = inspectorStats.find((item) => item.statut === 'EN_COURS')?.total ?? 0;
    const suspended = inspectorStats.find((item) => item.statut === 'SUSPENDU')?.total ?? 0;
    const criticalAlert = inProgress + suspended;

    return (
      <div className="mx-auto max-w-7xl space-y-10 pb-8">
        {criticalAlert > 0 && !alertDismissed && (
          <div className="relative rounded-2xl border border-red-300/50 bg-red-50/60 p-6 text-red-700 shadow-sm">
            <button
              onClick={() => {
                setAlertDismissed(true);
                setDismissedAlertSignature(alertSignature);
              }}
              aria-label="Fermer l'alerte"
              className="absolute right-4 top-4 rounded-full px-2 py-1 text-red-700 hover:bg-red-100/50 transition"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold text-red-800">⚠️ Alerte d'Inspection</h2>
            <p className="mt-2 text-sm text-red-700">
              {criticalAlert} dossier(s) nécessitent une action prioritaire.
            </p>
            {criticalDossiers.length > 0 && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="font-semibold text-red-800">ID(s) concerné(s) :</div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {criticalDossiers.map((dossier) => (
                    <button
                      key={dossier.id}
                      type="button"
                      onClick={() => navigate(`/dossiers/${dossier.id}`)}
                      className="block w-full text-left text-accent hover:text-accent/80 underline transition text-sm"
                    >
                      #{dossier.id} — {typeof dossier.forme_nom === 'string' ? dossier.forme_nom : dossier.id_emp_hash}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="rounded-2xl border border-border bg-surface2/60 p-7 backdrop-blur-sm">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-semibold text-muted/75">Espace Inspecteur</div>
            <h1 className="mt-3 text-3xl font-bold text-text">Mon Tableau de Bord</h1>
            <p className="mt-2 text-sm text-muted/75">Consultez l'état d'avancement de vos dossiers assignés.</p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card title="Total dossiers assignés" value={totalAssigned} />
            {['NOUVEAU', 'EN_COURS', 'SUSPENDU', 'CLOTURE'].map((st) => {
              const statVal = inspectorStats.find((item) => item.statut === st)?.total ?? 0;
              return (
                <Card
                  key={st}
                  title={`Dossiers ${st.replace('_', ' ').toLowerCase()}`}
                  value={statVal}
                />
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface2/60 p-7 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-text mb-5">Mes actions rapides</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <button
              onClick={() => navigate('/dossiers')}
              className="flex w-full flex-col justify-between rounded-xl border border-border bg-surface hover:border-accent hover:bg-surface/80 transition p-6 text-left shadow-sm"
            >
              <div>
                <h3 className="text-lg font-semibold text-text">Gérer mes dossiers</h3>
                <p className="text-sm text-muted/75 mt-2">Accéder à la liste des entreprises à inspecter, filtrer et rechercher.</p>
              </div>
              <span className="mt-4 text-xs font-semibold text-accent uppercase tracking-wider">Accéder →</span>
            </button>
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-text">Assistance CNSS</h3>
              <p className="text-sm text-muted/75 mt-2">Pour toute anomalie ou réassignation, contactez l'administrateur.</p>
              <span className="block mt-4 text-xs font-semibold text-accent uppercase tracking-wider">support@cnss.mr</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Executive Dashboard (DIRECTEUR / ADMIN)
  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-8">
      <div className="rounded-2xl border border-border bg-surface2/60 backdrop-blur-sm p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-semibold text-muted/75">Espace Direction</div>
            <h1 className="mt-3 text-3xl font-bold text-text">Vue d'ensemble décisionnelle</h1>
            <p className="mt-2 text-sm text-muted/75">Analyses consolidées de l'activité d'inspection de la CNSS.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <Card title="Total dossiers" value={kpis?.total_dossiers ?? 0} />
          <Card title="Distribution par quadrant" value="">
            <div className="space-y-2 text-sm">
              {Object.entries(repartitionQuadrant).map(([quadrant, count]) => (
                <div key={quadrant} className="flex justify-between items-center text-muted/80">
                  <span className="text-sm">{quadrant}</span>
                  <strong className="text-text font-semibold">{count}</strong>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Dossiers traités" value={kpis?.dossiers_traites ?? 0} />
          <Card title="Dossiers non traités" value={kpis?.dossiers_non_traites ?? 0} />
          <Card title="Taux de traitement" value={`${((kpis?.taux_traitement ?? 0) * 100).toFixed(0)}%`} />
          <Card title="Dette totale" value={`${(kpis?.montant_dette_total ?? 0).toLocaleString()} MRO`} />
          <Card title="Répartition par risque" value="">
            <div className="space-y-2 text-sm">
              {Object.entries(repartitionRisque).map(([risque, count]) => (
                <div key={risque} className="flex justify-between items-center text-muted/80">
                  <span className="text-sm">{risque}</span>
                  <strong className="text-text font-semibold">{count}</strong>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface2/60 backdrop-blur-sm p-7 flex flex-col shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-5 pb-4 border-b border-border/50">Top Régions à Risque Financier</h2>
          <div className="overflow-x-auto flex-1 rounded-lg border border-border bg-surface">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="border-b border-border bg-surface2/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-muted font-semibold text-xs uppercase">Région</th>
                  <th className="px-4 py-3 text-muted font-semibold text-xs uppercase text-right">Dossiers</th>
                  <th className="px-4 py-3 text-muted font-semibold text-xs uppercase text-right">Critiques</th>
                  <th className="px-4 py-3 text-muted font-semibold text-xs uppercase text-right">Dette Totale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {regions.map((region) => (
                  <tr key={region.reg_key} className="hover:bg-surface2/40 transition">
                    <td className="px-4 py-3 text-text font-semibold">{region.reg_key}</td>
                    <td className="px-4 py-3 text-muted text-right">{region.nb_dossiers}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={region.nb_critiques > 0 ? 'text-red-500 font-semibold' : 'text-muted'}>
                        {region.nb_critiques}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text font-medium text-right">{(region.montant_dette || 0).toLocaleString()} MRO</td>
                  </tr>
                ))}
                {regions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted">Aucune donnée disponible</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface2/60 backdrop-blur-sm p-7 flex flex-col shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-5 pb-4 border-b border-border/50">Performance des Inspecteurs</h2>
          <div className="overflow-x-auto flex-1 rounded-lg border border-border bg-surface">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="border-b border-border bg-surface2/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-muted font-semibold text-xs uppercase">Inspecteur</th>
                  <th className="px-4 py-3 text-muted font-semibold text-xs uppercase text-right">Assignés</th>
                  <th className="px-4 py-3 text-muted font-semibold text-xs uppercase text-right">En cours</th>
                  <th className="px-4 py-3 text-muted font-semibold text-xs uppercase text-right">Clôturés</th>
                  <th className="px-4 py-3 text-muted font-semibold text-xs uppercase text-right">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {inspecteurs.map((inspecteur) => (
                  <tr key={inspecteur.inspecteur__id} className="hover:bg-surface2/40 transition">
                    <td className="px-4 py-3 text-text font-semibold">{inspecteur.inspecteur__username}</td>
                    <td className="px-4 py-3 text-muted text-right">{inspecteur.nb_dossiers_assignes}</td>
                    <td className="px-4 py-3 text-muted text-right">{inspecteur.nb_en_cours}</td>
                    <td className="px-4 py-3 text-muted text-right">{inspecteur.nb_traites}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-block rounded-lg bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                        {Math.round(inspecteur.taux_traitement * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {inspecteurs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">Aucune donnée disponible</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
