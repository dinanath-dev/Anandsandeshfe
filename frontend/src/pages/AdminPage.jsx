import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Download, Eye, Lock, LogOut, Pencil, RefreshCcw, Users } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import PageHeader from '../components/PageHeader.jsx';
import {
  adminLogin,
  downloadSubscriptionsPdf,
  getBookSubscriptions,
  getMagazineSubscriptions,
  getSubmissions,
  getSubscriptionFilterMeta,
  listAdminUsers,
  updateAdminUser,
  verifySubmission
} from '../services/api.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import {
  clearAdminSession,
  getAdminRole,
  getAdminToken,
  isAdminAuthenticated,
  isAdminPortalConfigured,
  saveAdminSession
} from '../utils/adminAuth.js';
import { useSeo } from '../utils/seo.js';

const EMPTY_FILTERS = {
  status: '',
  state: '',
  city: '',
  subscription_type: '',
  search: '',
  type: 'all'
};

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

function SubscriptionFilters({ filters, meta, onChange, onApply, onDownload, isLoading, t }) {
  return (
    <div className="card mb-5 space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="block">
          <span className="label">{t('admin.filters.type')}</span>
          <select className="input" value={filters.type} onChange={(e) => onChange('type', e.target.value)}>
            <option value="all">{t('admin.filters.typeAll')}</option>
            <option value="magazine">{t('admin.filters.typeMagazine')}</option>
            <option value="books">{t('admin.filters.typeBooks')}</option>
          </select>
        </label>
        <label className="block">
          <span className="label">{t('admin.filters.status')}</span>
          <select className="input" value={filters.status} onChange={(e) => onChange('status', e.target.value)}>
            <option value="">{t('admin.filterAll')}</option>
            <option value="pending">{t('admin.filterPending')}</option>
            <option value="verified">{t('admin.filterVerified')}</option>
            <option value="failed">{t('admin.filterFailed')}</option>
          </select>
        </label>
        <label className="block">
          <span className="label">{t('admin.filters.state')}</span>
          <input
            className="input"
            list="admin-states"
            value={filters.state}
            onChange={(e) => onChange('state', e.target.value)}
            placeholder={t('admin.filters.statePlaceholder')}
          />
          <datalist id="admin-states">
            {(meta.states || []).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="label">{t('admin.filters.city')}</span>
          <input
            className="input"
            list="admin-cities"
            value={filters.city}
            onChange={(e) => onChange('city', e.target.value)}
            placeholder={t('admin.filters.cityPlaceholder')}
          />
          <datalist id="admin-cities">
            {(meta.cities || []).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="label">{t('admin.filters.plan')}</span>
          <select
            className="input"
            value={filters.subscription_type}
            onChange={(e) => onChange('subscription_type', e.target.value)}
          >
            <option value="">{t('admin.filterAll')}</option>
            <option value="yearly">{t('admin.oneYear')}</option>
            <option value="five_year">{t('admin.fiveYear')}</option>
          </select>
        </label>
        <label className="block">
          <span className="label">{t('admin.filters.search')}</span>
          <input
            className="input"
            value={filters.search}
            onChange={(e) => onChange('search', e.target.value)}
            placeholder={t('admin.filters.searchPlaceholder')}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary inline-flex items-center gap-2" type="button" onClick={onApply} disabled={isLoading}>
          {isLoading ? <InlineLoader size={18} /> : <RefreshCcw size={16} />}
          {t('admin.filters.apply')}
        </button>
        <button
          className="btn-secondary inline-flex items-center gap-2"
          type="button"
          onClick={onDownload}
          disabled={isLoading}
        >
          <Download size={16} />
          {t('admin.filters.downloadPdf')}
        </button>
      </div>
    </div>
  );
}

function UserEditModal({ user, onClose, onSave, saving, t }) {
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    subscriber_no: user.subscriber_no ?? '',
    is_verified: Boolean(user.is_verified)
  });

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      subscriber_no: form.subscriber_no === '' ? undefined : Number(form.subscriber_no),
      is_verified: form.is_verified
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-md space-y-4 p-6">
        <h2 className="text-xl font-black text-ink">{t('admin.users.editTitle')}</h2>
        <p className="text-xs text-muted">{t('admin.users.editId')}: {user.id}</p>
        <label className="block">
          <span className="label">{t('admin.users.fullName')}</span>
          <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">{t('admin.emailLabel')}</span>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">{t('admin.users.subscriberNo')}</span>
          <input
            className="input"
            type="number"
            min="1"
            value={form.subscriber_no}
            onChange={(e) => setForm({ ...form, subscriber_no: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={form.is_verified}
            onChange={(e) => setForm({ ...form, is_verified: e.target.checked })}
          />
          {t('admin.users.verified')}
        </label>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" type="submit" disabled={saving}>
            {saving ? t('admin.users.saving') : t('admin.users.save')}
          </button>
          <button className="btn-secondary flex-1" type="button" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
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

  const [token, setToken] = useState(() => getAdminToken());
  const [role, setRole] = useState(() => getAdminRole());
  const [activeTab, setActiveTab] = useState('payments');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [filter, setFilter] = useState('all');
  const [submissions, setSubmissions] = useState([]);
  const [magazineRows, setMagazineRows] = useState([]);
  const [bookRows, setBookRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [subFilters, setSubFilters] = useState(EMPTY_FILTERS);
  const [filterMeta, setFilterMeta] = useState({ states: [], cities: [] });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

  const superAdmin = role === 'super_admin';

  const counts = useMemo(
    () => ({
      all: submissions.length,
      pending: submissions.filter((item) => item.payment_status === 'pending').length,
      verified: submissions.filter((item) => item.payment_status === 'verified').length
    }),
    [submissions]
  );

  const visibleSubmissions = useMemo(() => {
    if (filter === 'all') return submissions;
    return submissions.filter((item) => item.payment_status === filter);
  }, [filter, submissions]);

  function handleAuthError(err) {
    setError(err.message);
    if (err.status === 401 || err.message.toLowerCase().includes('admin')) {
      clearAdminSession();
      setToken('');
      setRole('');
    }
  }

  async function loadSubmissions(activeToken = token) {
    if (!activeToken) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await getSubmissions(activeToken);
      setSubmissions(data.submissions);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  }

  const loadSubscriptionData = useCallback(
    async (activeToken = token, filters = subFilters) => {
      if (!activeToken || !superAdmin) return;
      setIsLoading(true);
      setError('');
      try {
        const shared = {
          status: filters.status || undefined,
          state: filters.state || undefined,
          city: filters.city || undefined,
          subscription_type: filters.subscription_type || undefined,
          search: filters.search || undefined
        };
        const requests = [];
        if (filters.type === 'all' || filters.type === 'magazine') {
          requests.push(getMagazineSubscriptions(activeToken, shared));
        } else {
          requests.push(Promise.resolve({ submissions: [] }));
        }
        if (filters.type === 'all' || filters.type === 'books') {
          requests.push(getBookSubscriptions(activeToken, shared));
        } else {
          requests.push(Promise.resolve({ orders: [] }));
        }
        const [magazineData, bookData] = await Promise.all(requests);
        setMagazineRows(magazineData.submissions || []);
        setBookRows(bookData.orders || []);
      } catch (err) {
        handleAuthError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [token, superAdmin, subFilters]
  );

  async function loadUsers(activeToken = token, search = userSearch) {
    if (!activeToken || !superAdmin) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await listAdminUsers(activeToken, search);
      setUsers(data.users || []);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadFilterMeta(activeToken = token) {
    if (!activeToken || !superAdmin) return;
    try {
      const data = await getSubscriptionFilterMeta(activeToken);
      setFilterMeta(data);
    } catch {
      /* non-critical */
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    if (!isAdminPortalConfigured()) {
      setError(t('admin.portalNotConfigured'));
      return;
    }
    try {
      const data = await adminLogin({ email, password });
      saveAdminSession({ token: data.token, role: data.role });
      setToken(data.token);
      setRole(data.role);
      setEmail('');
      setPassword('');
      await loadSubmissions(data.token);
      if (data.role === 'super_admin') {
        await loadFilterMeta(data.token);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogout() {
    clearAdminSession();
    setToken('');
    setRole('');
    setSubmissions([]);
    setMagazineRows([]);
    setBookRows([]);
    setUsers([]);
  }

  async function handleVerify(id) {
    setError('');
    try {
      await verifySubmission(token, id);
      await loadSubmissions();
    } catch (err) {
      handleAuthError(err);
    }
  }

  async function handleSaveUser(patch) {
    if (!editingUser) return;
    setIsSavingUser(true);
    setError('');
    try {
      await updateAdminUser(token, editingUser.id, patch);
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsSavingUser(false);
    }
  }

  function updateSubFilter(key, value) {
    setSubFilters((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (!isAdminAuthenticated()) return;
    if (activeTab === 'payments') loadSubmissions();
    if (activeTab === 'subscriptions' && superAdmin) {
      loadFilterMeta();
      loadSubscriptionData();
    }
    if (activeTab === 'users' && superAdmin) loadUsers();
  }, [token, activeTab, superAdmin]);

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
            {!isAdminPortalConfigured() ? <Alert>{t('admin.portalNotConfigured')}</Alert> : null}
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
            <button className="btn-primary w-full" type="submit" disabled={!isAdminPortalConfigured()}>
              {t('admin.loginButton')}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      {isLoading && submissions.length === 0 && activeTab === 'payments' ? (
        <LoadingBlock label={t('loaders.loadingSubmissions')} />
      ) : null}
      <section className="content-wrap py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
            eyebrow={t('admin.eyebrow')}
            title={t('admin.pageTitle')}
            description={superAdmin ? t('admin.pageDescriptionSuper') : t('admin.pageDescription')}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase text-[#0d2d7f]">
              {superAdmin ? t('admin.roleSuper') : t('admin.roleAdmin')}
            </span>
            <button className="btn-secondary inline-flex items-center gap-2" type="button" onClick={handleLogout}>
              <LogOut size={16} />
              {t('admin.logout')}
            </button>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-bold ${activeTab === 'payments' ? 'bg-primary text-white' : 'bg-white text-muted border border-ink/10'}`}
            onClick={() => setActiveTab('payments')}
          >
            {t('admin.tabs.payments')}
          </button>
          {superAdmin ? (
            <>
              <button
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-bold ${activeTab === 'subscriptions' ? 'bg-primary text-white' : 'bg-white text-muted border border-ink/10'}`}
                onClick={() => setActiveTab('subscriptions')}
              >
                {t('admin.tabs.subscriptions')}
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-bold ${activeTab === 'users' ? 'bg-primary text-white' : 'bg-white text-muted border border-ink/10'}`}
                onClick={() => setActiveTab('users')}
              >
                <Users size={15} />
                {t('admin.tabs.users')}
              </button>
            </>
          ) : null}
        </div>

        {error ? (
          <div className="mb-5">
            <Alert>{error}</Alert>
          </div>
        ) : null}

        {activeTab === 'payments' ? (
          <>
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
              <button
                className="btn-secondary inline-flex items-center gap-2"
                onClick={() => loadSubmissions()}
                disabled={isLoading}
              >
                {isLoading ? <InlineLoader size={20} /> : <RefreshCcw size={18} aria-hidden />}
                {isLoading ? t('admin.refreshing') : t('admin.refresh')}
              </button>
            </div>

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
                          {item.gender ? (
                            <p className="text-xs capitalize text-muted">
                              {t('admin.genderLabel')} {item.gender}
                            </p>
                          ) : null}
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
                            <a
                              className="btn-secondary min-h-10 px-3 py-2 text-xs"
                              href={item.screenshot_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Eye size={15} /> {t('admin.view')}
                            </a>
                          ) : (
                            '-'
                          )}
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
                          <p className="text-center font-semibold text-muted">{t('admin.noSubmissions')}</p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}

        {activeTab === 'subscriptions' && superAdmin ? (
          <>
            <SubscriptionFilters
              filters={subFilters}
              meta={filterMeta}
              onChange={updateSubFilter}
              onApply={() => loadSubscriptionData(token, subFilters)}
              onDownload={async () => {
                setError('');
                try {
                  await downloadSubscriptionsPdf(token, subFilters);
                } catch (err) {
                  handleAuthError(err);
                }
              }}
              isLoading={isLoading}
              t={t}
            />

            {(subFilters.type === 'all' || subFilters.type === 'magazine') && (
              <div className="card mb-6 overflow-hidden">
                <div className="border-b border-ink/10 bg-brand-surface px-4 py-3 font-black text-ink">
                  {t('admin.tabs.magazine')} ({magazineRows.length})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                    <thead className="bg-white text-ink">
                      <tr>
                        <th className="px-4 py-3 font-black">#</th>
                        <th className="px-4 py-3 font-black">{t('admin.table.name')}</th>
                        <th className="px-4 py-3 font-black">{t('admin.table.contact')}</th>
                        <th className="px-4 py-3 font-black">{t('admin.filters.state')}</th>
                        <th className="px-4 py-3 font-black">{t('admin.filters.city')}</th>
                        <th className="px-4 py-3 font-black">{t('admin.table.subscription')}</th>
                        <th className="px-4 py-3 font-black">{t('admin.table.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {magazineRows.map((item) => (
                        <tr key={item.id} className="border-t border-ink/10">
                          <td className="px-4 py-3">{item.subscriber_no || item.id}</td>
                          <td className="px-4 py-3 font-semibold">{item.name || '-'}</td>
                          <td className="px-4 py-3 text-muted">
                            <p>{item.mobile || '-'}</p>
                            <p>{item.email || '-'}</p>
                          </td>
                          <td className="px-4 py-3">{item.state || '-'}</td>
                          <td className="px-4 py-3">{item.town || item.city || '-'}</td>
                          <td className="px-4 py-3">
                            {item.subscription_type === 'five_year' ? t('admin.fiveYear') : item.subscription_type === 'yearly' ? t('admin.oneYear') : '-'}
                          </td>
                          <td className="px-4 py-3">{item.payment_status || '-'}</td>
                        </tr>
                      ))}
                      {!magazineRows.length ? (
                        <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-muted">
                            {t('admin.noSubmissions')}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(subFilters.type === 'all' || subFilters.type === 'books') && (
              <div className="card overflow-hidden">
                <div className="border-b border-ink/10 bg-brand-surface px-4 py-3 font-black text-ink">
                  {t('admin.tabs.books')} ({bookRows.length})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                    <thead className="bg-white text-ink">
                      <tr>
                        <th className="px-4 py-3 font-black">{t('admin.books.orderId')}</th>
                        <th className="px-4 py-3 font-black">{t('admin.table.name')}</th>
                        <th className="px-4 py-3 font-black">{t('admin.books.title')}</th>
                        <th className="px-4 py-3 font-black">{t('admin.filters.state')}</th>
                        <th className="px-4 py-3 font-black">{t('admin.filters.city')}</th>
                        <th className="px-4 py-3 font-black">{t('admin.books.amount')}</th>
                        <th className="px-4 py-3 font-black">{t('admin.table.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookRows.map((item) => (
                        <tr key={item.id} className="border-t border-ink/10">
                          <td className="px-4 py-3 font-mono text-xs">{String(item.id).slice(0, 8)}…</td>
                          <td className="px-4 py-3 font-semibold">{item.name || '-'}</td>
                          <td className="px-4 py-3">{item.book_name || '-'}</td>
                          <td className="px-4 py-3">{item.state || '-'}</td>
                          <td className="px-4 py-3">{item.city || '-'}</td>
                          <td className="px-4 py-3">
                            {item.total_amount_paise != null ? `₹${(item.total_amount_paise / 100).toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3">{item.payment_status || '-'}</td>
                        </tr>
                      ))}
                      {!bookRows.length ? (
                        <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-muted">
                            {t('admin.noBookOrders')}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : null}

        {activeTab === 'users' && superAdmin ? (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <input
                className="input max-w-md"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={t('admin.users.searchPlaceholder')}
              />
              <button className="btn-secondary inline-flex items-center gap-2" type="button" onClick={() => loadUsers()} disabled={isLoading}>
                {isLoading ? <InlineLoader size={18} /> : <RefreshCcw size={16} />}
                {t('admin.refresh')}
              </button>
            </div>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead className="bg-brand-surface text-ink">
                    <tr>
                      <th className="px-4 py-3 font-black">{t('admin.users.subscriberNo')}</th>
                      <th className="px-4 py-3 font-black">{t('admin.users.fullName')}</th>
                      <th className="px-4 py-3 font-black">{t('admin.emailLabel')}</th>
                      <th className="px-4 py-3 font-black">{t('admin.users.verified')}</th>
                      <th className="px-4 py-3 font-black">{t('admin.users.lastLogin')}</th>
                      <th className="px-4 py-3 font-black">{t('admin.table.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t border-ink/10">
                        <td className="px-4 py-3">{user.subscriber_no ?? '-'}</td>
                        <td className="px-4 py-3 font-semibold">{user.full_name || '-'}</td>
                        <td className="px-4 py-3 text-muted">{user.email}</td>
                        <td className="px-4 py-3">{user.is_verified ? t('common.yes') : t('common.no')}</td>
                        <td className="px-4 py-3 text-xs text-muted">
                          {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
                            type="button"
                            onClick={() => setEditingUser(user)}
                          >
                            <Pencil size={14} />
                            {t('admin.users.edit')}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!users.length ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-muted">
                          {t('admin.users.none')}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </section>

      {editingUser ? (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveUser}
          saving={isSavingUser}
          t={t}
        />
      ) : null}
    </main>
  );
}
