import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LanguageToggle from './components/LanguageToggle.jsx';
import { LoadingBlock } from './components/Loader.jsx';
import { useTranslation } from './i18n/LanguageContext.jsx';
import { isUserAuthenticated } from './utils/auth.js';

const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const FormPage = lazy(() => import('./pages/FormPage.jsx'));
const ProfileOverviewPage = lazy(() => import('./pages/ProfileOverviewPage.jsx'));
const PaymentPage = lazy(() => import('./pages/PaymentPage.jsx'));
const SuccessPage = lazy(() => import('./pages/SuccessPage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));

function ProtectedRoute({ children }) {
  if (!isUserAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const { t } = useTranslation();
  return (
    <>
      <LanguageToggle />
      <Suspense fallback={<LoadingBlock label={t('loaders.loadingPage')} />}>
        <Routes>
        <Route path="/" element={<AuthPage />} />
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
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}
