import BrandedSiteHeader from './BrandedSiteHeader.jsx';
import LogoutButton from './LogoutButton.jsx';
import { isUserAuthenticated } from '../utils/auth.js';

export default function DonationLayout({ subtitle, children, showLogout, compactHeader = true }) {
  const shouldShowLogout = showLogout ?? isUserAuthenticated();

  return (
    <div className="donation-page min-h-screen text-ink ps-[max(0px,env(safe-area-inset-left))] pe-[max(0px,env(safe-area-inset-right))]">
      {shouldShowLogout ? <LogoutButton /> : null}
      <BrandedSiteHeader subtitle={subtitle} compact={compactHeader} />

      <div className="relative z-[1] mx-auto w-full max-w-[min(100%,56rem)] px-3 pb-[max(1.5rem,env(safe-area-inset-bottom)+1rem)] pt-0 sm:max-w-[min(100%,64rem)] sm:px-5 sm:pb-8 md:px-6 lg:max-w-[min(100%,72rem)]">
        {children}
      </div>
    </div>
  );
}
