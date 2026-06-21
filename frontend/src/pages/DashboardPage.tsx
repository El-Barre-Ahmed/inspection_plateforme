import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { createRequest } from '../api/api';
import { Kpis, RegionStat, InspecteurPerf, Dossier, Commentaire } from '../types';

function Card({ title, value, children }: { title: string; value: string | number; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-surface2 p-6 shadow-soft">
      <div className="text-xs uppercase tracking-[0.2em] text-muted">{title}</div>
      <div className="mt-4 text-3xl font-semibold text-text">{value}</div>
      {children}
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
      <div className="mx-auto max-w-7xl space-y-8">
        {criticalAlert > 0 && !alertDismissed && (
          <div className="relative rounded-3xl border border-red-300 bg-red-50 p-6 text-red-700 shadow-soft">
            <button
              onClick={() => {
                setAlertDismissed(true);
                setDismissedAlertSignature(alertSignature);
              }}
              aria-label="Fermer l'alerte"
              className="absolute right-3 top-3 rounded-full px-2 py-1 text-red-700 hover:bg-red-100"
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold">Alerte d'Inspection</h2>
            <p className="mt-2 text-sm">
              {criticalAlert} dossier(s) nécessitent une action prioritaire.
            </p>
            {criticalDossiers.length > 0 && (
              <div className="mt-4 space-y-3 text-sm">
                <div className="font-semibold text-red-700">ID(s) concerné(s) :</div>
                <p className="text-text font-medium">
                  {criticalDossiers.map((dossier) => `#${dossier.id}`).join(', ')}
                </p>
                <div className="space-y-2">
                  {criticalDossiers.map((dossier) => (
                    <button
                      key={dossier.id}
                      type="button"
                      onClick={() => navigate(`/dossiers/${dossier.id}`)}
                      className="block text-left text-accent underline hover:text-accent/80"
                    >
                      #{dossier.id} — {dossier.forme_nom ?? dossier.id_emp_hash}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="rounded-3xl border border-border bg-surface2 p-6 shadow-soft">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Espace Inspecteur</div>
            <h1 className="mt-2 text-3xl font-semibold text-text">Mon Tableau de Bord</h1>
            <p className="mt-2 text-sm text-muted">Consultez l'état d'avancement de vos dossiers assignés.</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="rounded-3xl border border-border bg-surface2 p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-text mb-4">Mes actions rapides</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => navigate('/dossiers')}
              className="flex w-full flex-col justify-between rounded-2xl border border-border bg-surface p-5 hover:border-accent transition text-left"
            >
              <div>
                <h3 className="text-lg font-semibold text-text">Gérer mes dossiers</h3>
                <p className="text-sm text-muted mt-1">Accéder à la liste des entreprises à inspecter, filtrer et rechercher.</p>
              </div>
              <span className="mt-4 text-xs font-semibold text-accent uppercase tracking-wider">Accéder →</span>
            </button>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <h3 className="text-lg font-semibold text-text">Assistance CNSS</h3>
              <p className="text-sm text-muted mt-1">Pour toute anomalie de l'application ou réassignation de dossier, contactez l'administrateur.</p>
              <span className="block mt-4 text-xs font-semibold text-muted uppercase tracking-wider">support@cnss.mr</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Executive Dashboard (DIRECTEUR / ADMIN)
            {notifications.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface p-4 mt-4">
                <h3 className="text-sm font-semibold text-text mb-2">Notifications récentes</h3>
                <ul className="space-y-2">
                  {notifications.map((n) => {
                  const match = n.contenu.match(/\/dossiers\/(\d+)/);
                  const dossierId = match ? match[1] : undefined;
                  return (
                    <li key={n.created_at} className="flex items-center justify-between">
                      <div className={`text-sm ${n.is_read ? 'text-muted' : 'text-text font-medium'}`}>{n.contenu}</div>
                      <div className="flex items-center gap-2">
                        {dossierId && (
                          <button onClick={async () => {
                            try {
                              await request(`/notifications/${n.id}/read/`, { method: 'POST' });
                            } catch (e) {
                              // ignore
                            }
                            navigate(`/dossiers/${dossierId}`);
                          }} className="text-xs text-accent underline">
                            Voir
                          </button>
                        )}
                        {!n.is_read && (
                          <button onClick={async () => {
                            try {
                              await request(`/notifications/${n.id}/read/`, { method: 'POST' });
                              setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
                            } catch (e) {}
                          }} className="text-xs text-muted underline">Marquer lu</button>
                        )}
                      </div>
                    </li>
                  );
                })}
                </ul>
              </div>
            )}
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="rounded-3xl border border-border bg-surface2 p-6 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Espace Direction</div>
            <h1 className="mt-2 text-3xl font-semibold text-text">Vue d'ensemble décisionnelle</h1>
            <p className="mt-2 text-sm text-muted">Analyses consolidées de l'activité d'inspection de la CNSS.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card title="Total dossiers" value={kpis?.total_dossiers ?? 0} />
          <Card title="Distribution par quadrant" value="">
            <div className="mt-3 space-y-2 text-sm">
              {Object.entries(repartitionQuadrant).map(([quadrant, count]) => (
                <div key={quadrant} className="flex justify-between items-center text-muted">
                  <span>{quadrant}</span>
                  <strong className="text-text font-medium">{count}</strong>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Dossiers traités" value={kpis?.dossiers_traites ?? 0} />
          <Card title="Dossiers non traités" value={kpis?.dossiers_non_traites ?? 0} />
          <Card title="Taux de traitement" value={`${((kpis?.taux_traitement ?? 0) * 100).toFixed(0)}%`} />
          <Card title="Dette totale" value={`${(kpis?.montant_dette_total ?? 0).toLocaleString()} MRO`} />
          <Card title="Répartition par risque" value="">
            <div className="mt-3 space-y-2 text-sm">
              {Object.entries(repartitionRisque).map(([risque, count]) => (
                <div key={risque} className="flex justify-between items-center text-muted">
                  <span>{risque}</span>
                  <strong className="text-text font-medium">{count}</strong>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="rounded-3xl border border-border bg-surface2 p-6 shadow-soft flex flex-col">
          <h2 className="text-xl font-semibold text-text mb-4">Top Régions à Risque Financier</h2>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface flex-1">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="border-b border-border bg-surface2">
                <tr>
                  <th className="px-4 py-3 text-muted font-medium">Région</th>
                  <th className="px-4 py-3 text-muted font-medium text-right">Dossiers</th>
                  <th className="px-4 py-3 text-muted font-medium text-right">Critiques</th>
                  <th className="px-4 py-3 text-muted font-medium text-right">Dette Totale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {regions.map((region) => (
                  <tr key={region.reg_key} className="hover:bg-surface2/40">
                    <td className="px-4 py-3 text-text font-semibold">{region.reg_key}</td>
                    <td className="px-4 py-3 text-muted text-right">{region.nb_dossiers}</td>
                    <td className="px-4 py-3 text-muted text-right">
                      <span className={region.nb_critiques > 0 ? 'text-red-400 font-semibold' : 'text-muted'}>
                        {region.nb_critiques}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text font-medium text-right">{(region.montant_dette || 0).toLocaleString()} MRO</td>
                  </tr>
                ))}
                {regions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted">Aucune donnée disponible</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-surface2 p-6 shadow-soft flex flex-col">
          <h2 className="text-xl font-semibold text-text mb-4">Performance des Inspecteurs</h2>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface flex-1">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="border-b border-border bg-surface2">
                <tr>
                  <th className="px-4 py-3 text-muted font-medium">Inspecteur</th>
                  <th className="px-4 py-3 text-muted font-medium text-right">Assignés</th>
                  <th className="px-4 py-3 text-muted font-medium text-right">En cours</th>
                  <th className="px-4 py-3 text-muted font-medium text-right">Clôturés</th>
                  <th className="px-4 py-3 text-muted font-medium text-right">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inspecteurs.map((inspecteur) => (
                  <tr key={inspecteur.inspecteur__id} className="hover:bg-surface2/40">
                    <td className="px-4 py-3 text-text font-semibold">{inspecteur.inspecteur__username}</td>
                    <td className="px-4 py-3 text-muted text-right">{inspecteur.nb_dossiers_assignes}</td>
                    <td className="px-4 py-3 text-muted text-right">{inspecteur.nb_en_cours}</td>
                    <td className="px-4 py-3 text-muted text-right">{inspecteur.nb_traites}</td>
                    <td className="px-4 py-3 text-text font-medium text-right">
                      <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent">
                        {Math.round(inspecteur.taux_traitement * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {inspecteurs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted">Aucune donnée disponible</td>
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
