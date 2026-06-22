/**
 * Stacked field: label above control (modern form layout).
 */
export default function DonationFormRow({
  label,
  required,
  optional,
  error,
  children,
  labelFor,
  className = ''
}) {
  const LabelTag = labelFor ? 'label' : 'div';
  const labelProps = labelFor ? { htmlFor: labelFor } : {};

  return (
    <div className={`donation-form-row ${className}`.trim()}>
      <LabelTag {...labelProps} className={`donation-form-label ${labelFor ? 'cursor-pointer' : ''}`}>
        {label}
        {required ? <span className="donation-form-required" aria-hidden> *</span> : null}
        {optional ? <span className="donation-form-optional"> ({optional})</span> : null}
      </LabelTag>
      <div className="donation-form-field min-w-0">
        {children}
        {error ? <p className="donation-form-hint">{error}</p> : null}
      </div>
    </div>
  );
}
