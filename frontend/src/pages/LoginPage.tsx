import { FormEvent, useContext, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { login, ApiError } from '../api/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const { token, role, setToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (token) {
      const target = role === 'INSPECTEUR' ? '/dossiers' : '/dashboard';
      navigate(target);
    }
  }, [token, role, navigate]);

  useEffect(() => {
    const msg = searchParams.get('message');
    if (msg) {
      setError(msg);
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    let hasLocalErrors = false;
    const currentFieldErrors: Record<string, string[]> = {};
    
    if (!username.trim()) {
      currentFieldErrors.username = ["Le nom d'utilisateur est requis."];
      hasLocalErrors = true;
    }
    if (!password.trim()) {
      currentFieldErrors.password = ["Le mot de passe est requis."];
      hasLocalErrors = true;
    }

    if (hasLocalErrors) {
      setFieldErrors(currentFieldErrors);
      return;
    }

    try {
      const data = await login(username, password);
      setToken(data.access, data.refresh, data.username, data.role);
      const target = data.role === 'INSPECTEUR' ? '/dossiers' : '/dashboard';
      navigate(target);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400 && err.fields) {
          setFieldErrors(err.fields);
        } else {
          setError(err.message || "Nom d'utilisateur ou mot de passe incorrect.");
        }
      } else {
        setError("Impossible de contacter le serveur.");
      }
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-160px)] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-3xl border border-border bg-surface2 p-8 shadow-soft">
        <div className="mb-8 text-center">
          <img
            src="/cnss-logo.webp"
            alt="CNSS"
            className="mx-auto h-20 w-20 rounded-full object-cover border border-border bg-white mb-4"
          />
          <h1 className="text-2xl font-semibold text-text">CNSS — Inspection Plateforme</h1>
          <p className="mt-2 text-sm text-muted">Accédez à votre espace d'inspection sécurisé.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-muted">Nom d'utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full rounded-2xl border ${fieldErrors.username ? 'border-red-500' : 'border-border'} bg-surface px-4 py-3 text-white outline-none transition focus:border-accent`}
              placeholder="admin"
            />
            {fieldErrors.username && (
              <p className="mt-1 text-xs text-red-400 font-medium">{fieldErrors.username[0]}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-muted">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-2xl border ${fieldErrors.password ? 'border-red-500' : 'border-border'} bg-surface px-4 py-3 text-white outline-none transition focus:border-accent`}
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-400 font-medium">{fieldErrors.password[0]}</p>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-accent hover:bg-[#2d6a9f] px-4 py-3 text-sm font-semibold text-white transition shadow-soft"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
