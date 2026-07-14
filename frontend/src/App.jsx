import { lazy, Suspense, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LanguageToggle from './components/LanguageToggle.jsx';
import { LoadingBlock } from './components/Loader.jsx';
import { useTranslation } from './i18n/LanguageContext.jsx';
import { isUserAuthenticated } from './utils/auth.js';
import { detectAdminSlugFromHost } from './utils/adminPortalHost.js';

const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const FormPage = lazy(() => import('./pages/FormPage.jsx'));
const ProfileOverviewPage = lazy(() => import('./pages/ProfileOverviewPage.jsx'));
const BookFormPage = lazy(() => import('./pages/BookFormPage.jsx'));
const BookPaymentPage = lazy(() => import('./pages/BookPaymentPage.jsx'));
const PaymentPage = lazy(() => import('./pages/PaymentPage.jsx'));
const SuccessPage = lazy(() => import('./pages/SuccessPage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const BooksAdminPage = lazy(() => import('./pages/BooksAdminPage.jsx'));
const AccountsAdminPage = lazy(() => import('./pages/AccountsAdminPage.jsx'));
const HostAdminPortal = lazy(() => import('./pages/HostAdminPortal.jsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));

function ProtectedRoute({ children }) {
  if (!isUserAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const { t } = useTranslation();
  const hostAdminSlug = useMemo(() => detectAdminSlugFromHost(), []);

  if (hostAdminSlug) {
    return (
      <>
        <LanguageToggle />
        <Suspense fallback={<LoadingBlock label={t('loaders.loadingPage')} />}>
          <HostAdminPortal slug={hostAdminSlug} />
        </Suspense>
      </>
    );
  }

  return (
    <>
      <LanguageToggle />
      <Suspense fallback={<LoadingBlock label={t('loaders.loadingPage')} />}>
        <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route
          path="/profile"
          element={(
            <ProtectedRoute>
              <ProfileOverviewPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/form"
          element={(
            <ProtectedRoute>
              <FormPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/books"
          element={(
            <ProtectedRoute>
              <BookFormPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/books/payment"
          element={(
            <ProtectedRoute>
              <BookPaymentPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/payment"
          element={(
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/success"
          element={(
            <ProtectedRoute>
              <SuccessPage />
            </ProtectedRoute>
          )}
        />
        <Route path="/admin" element={<AdminPage portalSlug="admin" />} />
        <Route path="/books-admin" element={<BooksAdminPage />} />
        <Route path="/accounts-admin" element={<AccountsAdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}
