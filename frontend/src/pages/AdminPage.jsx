import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, Lock, RefreshCcw } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { adminLogin, getSubmissions, verifySubmission } from '../services/api.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useSeo } from '../utils/seo.js';

const ADMIN_TOKEN_KEY = 'adminToken';

function readAdminToken() {
  try {
    const legacy = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (legacy && !sessionStorage.getItem(ADMIN_TOKEN_KEY)) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, legacy);
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function saveAdminToken(token) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function formatSubmissionAddress(item) {
  const line = [
    item.house_no || item.address_1,
    item.street || item.address_2,
    item.area,
    item.town || item.city,
    item.district || item.tehsil,
    item.state,
    item.pin || item.pincode,
    item.rehbar || item.through
  ]
    .filter(Boolean)
    .join(', ');
  if (line && item.address) return `${line}. ${item.address}`;
  if (line) return line;
  if (item.address) return item.address;
  return [item.state, item.pin].filter(Boolean).join(' - ') || '-';
}

export default function AdminPage() {
  useSeo({
    title: 'Admin — Anand Sandesh Karyalay',
    description: 'Staff administration for Anand Sandesh Karyalay subscriptions.',
    canonical: 'https://anandsandeshkaryalay.online/admin',
    noindex: true
  });

  const { t } = useTranslation();
  const FILTER_LABELS = {
    all: t('admin.filterAll'),
    pending: t('admin.filterPending'),
    verified: t('admin.filterVerified')
  };
  const [token, setToken] = useState(() => readAdminToken());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [filter, setFilter] = useState('all');
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const counts = useMemo(() => ({
    all: submissions.length,
    pending: submissions.filter((item) => item.payment_status === 'pending').length,
    verified: submissions.filter((item) => item.payment_status === 'verified').length
  }), [submissions]);

  const visibleSubmissions = useMemo(() => {
    if (filter === 'all') return submissions;
    return submissions.filter((item) => item.payment_status === filter);
  }, [filter, submissions]);

  async function loadSubmissions(activeToken = token) {
    if (!activeToken) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await getSubmissions(activeToken);
      setSubmissions(data.submissions);
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes('admin')) {
        clearAdminToken();
        setToken('');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    try {
      const data = await adminLogin({ email, password });
      saveAdminToken(data.token);
      setToken(data.token);
      setEmail('');
      setPassword('');
      await loadSubmissions(data.token);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleVerify(id) {
    setError('');
    try {
      await verifySubmission(token, id);
      await loadSubmissions();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadSubmissions();
  }, [token]);

  if (!token) {
    return (
      <main className="page-shell">
        <section className="content-wrap flex min-h-[calc(100vh-3rem)] items-center justify-center">
          <form onSubmit={handleLogin} className="card w-full max-w-md space-y-5 p-6 sm:p-8">
            <div className="text-center">
              <Lock className="mx-auto mb-4 text-primary" size={52} />
              <h1 className="text-3xl font-black text-ink">{t('admin.loginTitle')}</h1>
              <p className="mt-2 text-muted">{t('admin.loginSubtitle')}</p>
            </div>
            {error ? <Alert>{error}</Alert> : null}
            <label className="block">
              <span className="label">{t('admin.emailLabel')}</span>
              <input
                className="input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">{t('admin.passwordLabel')}</span>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="btn-primary w-full" type="submit">{t('admin.loginButton')}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      {isLoading && submissions.length === 0 ? <LoadingBlock label={t('loaders.loadingSubmissions')} /> : null}
      <section className="content-wrap py-8">
        <PageHeader eyebrow={t('admin.eyebrow')} title={t('admin.pageTitle')} description={t('admin.pageDescription')} />

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-lg border border-ink/10 bg-white p-1 shadow-sm">
            {['all', 'pending', 'verified'].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-md px-4 py-2 text-sm font-bold transition ${filter === item ? 'bg-primary text-white' : 'text-muted hover:bg-primary/10'}`}
              >
                {FILTER_LABELS[item]} ({counts[item]})
              </button>
            ))}
          </div>
          <button className="btn-secondary inline-flex items-center gap-2" onClick={() => loadSubmissions()} disabled={isLoading}>
            {isLoading ? <InlineLoader size={20} /> : <RefreshCcw size={18} aria-hidden />}
            {isLoading ? t('admin.refreshing') : t('admin.refresh')}
          </button>
        </div>

        {error ? <div className="mb-5"><Alert>{error}</Alert></div> : null}

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm md:min-w-[820px] lg:min-w-[900px]">
              <thead className="bg-brand-surface text-ink">
                <tr>
                  <th className="px-4 py-4 font-black">{t('admin.table.name')}</th>
                  <th className="px-4 py-4 font-black">{t('admin.table.contact')}</th>
                  <th className="px-4 py-4 font-black">{t('admin.table.address')}</th>
                  <th className="px-4 py-4 font-black">{t('admin.table.subscription')}</th>
                  <th className="px-4 py-4 font-black">{t('admin.table.transaction')}</th>
                  <th className="px-4 py-4 font-black">{t('admin.table.status')}</th>
                  <th className="px-4 py-4 font-black">{t('admin.table.screenshot')}</th>
                  <th className="px-4 py-4 font-black">{t('admin.table.action')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleSubmissions.map((item) => (
                  <tr key={item.id} className="border-t border-ink/10 align-top">
                    <td className="px-4 py-4">
                      <p className="font-bold text-ink">{item.name || t('admin.notSubmitted')}</p>
                      {item.gender ? <p className="text-xs capitalize text-muted">{t('admin.genderLabel')} {item.gender}</p> : null}
                      <p className="text-xs text-muted">{new Date(item.created_at).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-4 text-muted">
                      <p>{item.mobile || '-'}</p>
                      <p>{item.email || '-'}</p>
                    </td>
                    <td className="max-w-72 px-4 py-4 text-muted">
                      <p className="whitespace-pre-wrap break-words">{formatSubmissionAddress(item)}</p>
                    </td>
                    <td className="max-w-[14rem] px-4 py-4 text-xs font-semibold text-ink">
                      <p>
                        {item.subscription_type === 'five_year'
                          ? t('admin.fiveYear')
                          : item.subscription_type === 'yearly'
                            ? t('admin.oneYear')
                            : item.subscription_type || '-'}
                      </p>
                      {item.anand_sandesh_lang ? (
                        <p className="mt-1 font-normal normal-case text-muted">
                          {t('admin.anandSandeshLabel')} {item.anand_sandesh_lang}
                        </p>
                      ) : null}
                      {item.spiritual_bliss === 'english' ? (
                        <p className="mt-0.5 font-normal normal-case text-muted">{t('admin.spiritualBlissEnglish')}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 font-medium text-ink">{item.transaction_id || '-'}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                          item.payment_status === 'verified'
                            ? 'bg-primary/20 text-[#0d2d7f]'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.payment_status === 'verified'
                          ? t('admin.filterVerified')
                          : item.payment_status === 'pending'
                            ? t('admin.filterPending')
                            : item.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {item.screenshot_url ? (
                        <a className="btn-secondary min-h-10 px-3 py-2 text-xs" href={item.screenshot_url} target="_blank" rel="noreferrer">
                          <Eye size={15} /> {t('admin.view')}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4">
                      {item.payment_status !== 'verified' ? (
                        <button className="btn-primary min-h-10 px-3 py-2 text-xs" onClick={() => handleVerify(item.id)}>
                          <Check size={15} /> {t('admin.markVerified')}
                        </button>
                      ) : (
                        <span className="font-semibold text-muted">{t('admin.done')}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!visibleSubmissions.length ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-10">
                      {isLoading && submissions.length === 0 ? (
                        <span className="sr-only">{t('loaders.loadingSubmissions')}</span>
                      ) : (
                        <p className="text-center font-semibold text-muted">{t('admin.noSubmissions')}</p>
                      )}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
