import { LogOut } from 'lucide-react';

export default function AdminToolbar({ badge, onLogout, logoutLabel = 'Log out' }) {
  if (!onLogout) return null;

  return (
    <div className="admin-toolbar">
      {badge ? <span className="admin-report-badge hidden sm:inline-flex">{badge}</span> : null}
      <button type="button" className="admin-report-btn-secondary admin-toolbar__logout" onClick={onLogout}>
        <LogOut size={16} />
        {logoutLabel}
      </button>
    </div>
  );
}
