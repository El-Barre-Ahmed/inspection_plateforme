import { Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DossiersPage from './pages/DossiersPage';
import DossierDetailPage from './pages/DossierDetailPage';
import { AuthContext, decodeToken } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-4xl rounded-3xl border border-border bg-surface2 p-8 shadow-soft">
      <h1 className="text-3xl font-semibold text-text">Analyses & Statistiques Direction</h1>
      <p className="mt-4 text-muted">
        Cet espace d'analyse décisionnelle contient les indicateurs clés et les rapports confidentiels réservés aux directeurs et administrateurs de la CNSS.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6 text-text">
          <h3 className="font-semibold text-lg text-[#f0f4f8]">Rapports stratégiques</h3>
          <p className="text-sm text-muted mt-2">Dette consolidée par secteur d'activité, analyses de risques de fraudes et performances trimestrielles d'inspection.</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 text-text">
          <h3 className="font-semibold text-lg text-[#f0f4f8]">Alertes & Anomalies</h3>
          <p className="text-sm text-muted mt-2">Dossiers classés "Critique" nécessitant une intervention prioritaire ou une réassignation d'inspecteur.</p>
        </div>
      </div>
    </div>
  );
}

function ErrorPage({ status, message, onClear }: { status: number; message: string; onClear: () => void }) {
  let title = "Une erreur est survenue";
  let desc = message || "Une erreur inattendue s'est produite.";

  if (status === 403) {
    title = "Accès refusé";
    desc = "Vous n'avez pas les autorisations nécessaires pour accéder à cette ressource.";
  } else if (status === 404) {
    title = "Ressource introuvable";
    desc = "La ressource ou la page que vous recherchez n'existe pas.";
  } else if (status === 500) {
    title = "Erreur serveur";
    desc = "Erreur serveur, réessayez plus tard.";
  } else if (status === 0) {
    title = "Réseau hors ligne";
    desc = "Impossible de contacter le serveur. Veuillez vérifier votre connexion.";
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center items-center text-center px-4">
      <div className="rounded-3xl border border-border bg-surface2 p-8 shadow-soft w-full">
        <div className="text-4xl mb-4 text-[#3d7ab5]">⚠️</div>
        <h1 className="text-2xl font-semibold text-text mb-2">{title}</h1>
        <p className="text-sm text-muted mb-6">{desc}</p>
        <button
          onClick={onClear}
          className="w-full rounded-2xl bg-[#3d7ab5] hover:bg-[#2d6a9f] px-4 py-3 text-sm font-semibold text-white transition"
        >
          Retour
        </button>
      </div>
    </div>
  );
}

function App() {
  const readStored = (key: string) => {
    const v = localStorage.getItem(key);
    return v && v !== 'null' && v !== 'undefined' ? v : null;
  };

  const [token, setTokenState] = useState<string | null>(() => readStored('accessToken'));
  const [refreshToken, setRefreshTokenState] = useState<string | null>(() => readStored('refreshToken'));
  const [username, setUsernameState] = useState<string | null>(() => readStored('username'));
  const [role, setRoleState] = useState<string | null>(() => readStored('role'));
  const [globalError, setGlobalError] = useState<{ status: number; message: string } | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Clear global error when navigating
  useEffect(() => {
    setGlobalError(null);
  }, [location.pathname]);

  const auth = useMemo(
    () => ({
      token,
      refreshToken,
      username,
      role,
      setToken: (
        value: string | null,
        refreshValue: string | null = null,
        userVal: string | null = null,
        roleVal: string | null = null
      ) => {
        setTokenState(value);
        setRefreshTokenState(refreshValue);

        if (value) {
          localStorage.setItem('accessToken', value);
          if (refreshValue) {
            localStorage.setItem('refreshToken', refreshValue);
          }

          if (userVal && roleVal) {
            setUsernameState(userVal);
            setRoleState(roleVal);
            localStorage.setItem('username', userVal);
            localStorage.setItem('role', roleVal);
          } else {
            // Decode token payload
            const decoded = decodeToken(value);
            if (decoded) {
              const savedUsername = decoded.username || null;
              const savedRole = decoded.role || null;
              setUsernameState(savedUsername);
              setRoleState(savedRole);
              if (savedUsername) {
                localStorage.setItem('username', savedUsername);
              }
              if (savedRole) {
                localStorage.setItem('role', savedRole);
              }
            }
          }
        } else {
          setUsernameState(null);
          setRoleState(null);
          setRefreshTokenState(null);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('username');
          localStorage.removeItem('role');
          // Redirect with state or directly
          navigate('/login');
        }
      }
    }),
    [navigate, token, refreshToken, username, role]
  );

  const handleGlobalError = (status: number, message: string) => {
    if (status === 401) {
      navigate('/login?message=Session expirée');
    } else {
      setGlobalError({ status, message });
    }
  };

  const clearGlobalError = () => {
    setGlobalError(null);
    window.history.back();
  };

  return (
    <AuthContext.Provider value={{ ...auth, onGlobalError: handleGlobalError } as any}>
      <div className="min-h-screen flex flex-col bg-surface text-text">
        <Header />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {globalError ? (
            <ErrorPage
              status={globalError.status}
              message={globalError.message}
              onClear={clearGlobalError}
            />
          ) : (
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dossiers"
                element={
                  <ProtectedRoute>
                    <DossiersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dossiers/:pk"
                element={
                  <ProtectedRoute>
                    <DossierDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute allowedRoles={['DIRECTEUR', 'ADMIN']}>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/403"
                element={
                  <ErrorPage
                    status={403}
                    message="Accès refusé"
                    onClear={() => {
                      setGlobalError(null);
                      navigate('/dashboard');
                    }}
                  />
                }
              />
              <Route
                path="/"
                element={
                  token
                    ? (role === 'INSPECTEUR'
                        ? <Navigate to="/dossiers" replace />
                        : <Navigate to="/dashboard" replace />)
                    : <Navigate to="/login" replace />
                }
              />
              <Route
                path="*"
                element={
                  <ErrorPage
                    status={404}
                    message="Ressource introuvable"
                    onClear={() => {
                      setGlobalError(null);
                      navigate('/dashboard');
                    }}
                  />
                }
              />
            </Routes>
          )}
        </main>
        <Footer />
      </div>
    </AuthContext.Provider>
  );
}

export default App;
