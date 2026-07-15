import BrandedSiteHeader from './BrandedSiteHeader.jsx';
import LogoutButton from './LogoutButton.jsx';
import { isUserAuthenticated } from '../utils/auth.js';

export default function DonationLayout({ subtitle, children, showLogout, compactHeader = true }) {
  const shouldShowLogout = showLogout ?? isUserAuthenticated();

  return (
    <div className="donation-page min-h-screen text-ink ps-[max(0px,env(safe-area-inset-left))] pe-[max(0px,env(safe-area-inset-right))]">
      {shouldShowLogout ? <LogoutButton /> : null}
      <BrandedSiteHeader subtitle={subtitle} compact={compactHeader} />

      <div className="relative z-[1] mx-auto w-full max-w-[min(100%,80rem)] px-2.5 pb-[max(1rem,env(safe-area-inset-bottom)+0.5rem)] pt-0 sm:px-4 sm:pb-5 md:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
