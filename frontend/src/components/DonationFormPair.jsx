/**
 * One horizontal row on desktop: two DonationFormRow children (label|field × 2).
 */
export default function DonationFormPair({ children, className = '' }) {
  return <div className={`donation-form-pair ${className}`.trim()}>{children}</div>;
}
