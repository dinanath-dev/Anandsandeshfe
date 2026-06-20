/** Card section header with coloured icon — Design 2 layout. */
export default function FormSectionCard({ id, title, icon: Icon, accent = 'teal', children }) {
  return (
    <section className={`form-card form-card--${accent}`} aria-labelledby={id}>
      <header className="form-card-header">
        <span className={`form-card-icon form-card-icon--${accent}`} aria-hidden>
          <Icon size={18} strokeWidth={2.25} />
        </span>
        <h2 id={id} className="form-card-title">
          {title}
        </h2>
      </header>
      <div className="form-card-body">{children}</div>
    </section>
  );
}
