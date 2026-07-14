import { useEffect, useState } from 'react';
import Alert from '../components/Alert.jsx';
import { LoadingBlock } from '../components/Loader.jsx';
import { getAdminPortalMeta } from '../services/api.js';
import AccountsPage from './AccountsPage.jsx';
import AdminPage from './AdminPage.jsx';

/**
 * Renders the staff panel for any subdomain slug that exists in admin_portals.
 * e.g. ebooks.localhost:5173 after inserting slug=ebooks in the DB.
 */
export default function HostAdminPortal({ slug }) {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setMeta(null);
    setError('');
    getAdminPortalMeta(slug)
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Portal not found.');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <main className="page-shell">
        <section className="content-wrap flex min-h-[calc(100vh-3rem)] items-center justify-center p-6">
          <div className="card max-w-md p-6">
            <Alert>{error}</Alert>
            <p className="mt-3 text-sm text-muted">
              Add slug <strong className="text-ink">{slug}</strong> to the <code>admin_portals</code> table in
              Supabase, then reload.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!meta) {
    return <LoadingBlock label="Loading portal…" />;
  }

  if (meta.accounts_only) {
    return <AccountsPage portalSlug={meta.slug} portalLabel={meta.label} />;
  }

  return <AdminPage portalSlug={meta.slug} booksOnly={meta.books_only} portalLabel={meta.label} />;
}
