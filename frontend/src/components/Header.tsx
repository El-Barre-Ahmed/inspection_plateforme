import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Header() {
  const location = useLocation();
  const { token, username, role, setToken } = useContext(AuthContext);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Dossiers', path: '/dossiers' }
  ];


  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface2 px-4 py-3 shadow-soft">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/cnss-logo.webp" alt="CNSS" className="h-10 w-10 rounded-full object-cover border border-border bg-white" />
            <span className="text-lg font-semibold text-text hidden sm:inline-block">
              CNSS Inspection Plateforme
            </span>
          </Link>
        </div>

        {token && (
          <nav className="flex items-center gap-4 md:gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition ${
                  location.pathname === item.path
                    ? 'text-text border-b-2 border-accent pb-1'
                    : 'text-muted hover:text-text'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-4 text-sm">
          {token ? (
            <div className="flex items-center gap-3">
              <span className="text-muted hidden md:inline-block">
                Utilisateur: <strong className="text-text font-medium">{username}</strong> ({role})
              </span>
              <button
                onClick={() => setToken(null)}
                className="rounded-xl border border-border bg-surface hover:bg-red-500/10 hover:border-red-500/30 px-3 py-2 text-xs font-semibold text-text transition"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <span className="text-muted">Non connecté</span>
          )}
        </div>
      </div>
    </header>
  );
}
