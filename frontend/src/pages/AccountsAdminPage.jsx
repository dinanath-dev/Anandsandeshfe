import AccountsPage from './AccountsPage.jsx';
import { ACCOUNTS_PORTAL_SLUG } from '../utils/adminAuth.js';

export default function AccountsAdminPage() {
  return <AccountsPage portalSlug={ACCOUNTS_PORTAL_SLUG} />;
}
