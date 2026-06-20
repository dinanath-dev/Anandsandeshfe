/**
 * Styled radio/checkbox group — matches donation form field styling.
 */
export default function FormChoiceGroup({ legend, required, error, invalid, children }) {
  return (
    <fieldset className={`donation-choice-group ${invalid ? 'donation-choice-group--invalid' : ''}`}>
      <legend className="donation-choice-group-legend">
        {legend}
        {required ? <span className="donation-form-required" aria-hidden> *</span> : null}
      </legend>
      <div className="donation-choice-group-options">{children}</div>
      {error ? <p className="donation-form-hint">{error}</p> : null}
    </fieldset>
  );
}

export function FormChoiceOption({
  name,
  type = 'radio',
  value,
  checked,
  onChange,
  allowDeselect = false,
  title,
  hint,
  children
}) {
  const id = `${name}-${value || 'opt'}`;

  function handleRadioClick(event) {
    if (type !== 'radio' || !allowDeselect || !checked) return;
    event.preventDefault();
    onChange?.({ target: { name, value: '', type: 'radio', checked: false } });
  }

  return (
    <label htmlFor={id} className="donation-choice-option">
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        checked={checked}
        onClick={handleRadioClick}
        onChange={onChange}
        className="donation-choice-input"
      />
      <span className="donation-choice-copy">
        <span className="donation-choice-title">{title ?? children}</span>
        {hint ? <span className="donation-choice-hint">{hint}</span> : null}
      </span>
    </label>
  );
}
