import AdminToolbar from './AdminToolbar.jsx';
import BrandedSiteHeader from './BrandedSiteHeader.jsx';

export default function AdminBrandedLayout({
  subtitle,
  badge,
  onLogout,
  logoutLabel,
  children,
  narrow = false
}) {
  return (
    <div className="donation-page admin-branded-page min-h-screen text-ink ps-[max(0px,env(safe-area-inset-left))] pe-[max(0px,env(safe-area-inset-right))]">
      {onLogout ? (
        <AdminToolbar badge={badge} onLogout={onLogout} logoutLabel={logoutLabel} />
      ) : null}
      <BrandedSiteHeader subtitle={subtitle} hideLogo />
      <div
        className={
          narrow
            ? 'relative z-[1] mx-auto flex w-full max-w-md justify-center px-4 pb-[max(4rem,env(safe-area-inset-bottom)+3rem)] pt-2 sm:pb-16'
            : 'admin-content-wrap relative z-[1] pb-[max(4rem,env(safe-area-inset-bottom)+3rem)] pt-2 sm:pb-16'
        }
      >
        {children}
      </div>
    </div>
  );
}
