import AdminPage from './AdminPage.jsx';
import { BOOKS_PORTAL_SLUG } from '../utils/adminAuth.js';

export default function BooksAdminPage() {
  return <AdminPage portalSlug={BOOKS_PORTAL_SLUG} booksOnly />;
}
