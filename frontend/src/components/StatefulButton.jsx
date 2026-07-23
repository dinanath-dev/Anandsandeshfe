import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * A button that animates through action states with icons:
 *   idle    → shows `label` + optional `icon`
 *   loading → spinner + `loadingLabel` + an indeterminate progress bar
 *   success → animated check + `successLabel`
 *   error   → animated alert + `errorLabel`
 *
 * Layer it on top of any existing button class via `className`
 * (e.g. "auth-primary-btn w-full", "btn-primary", "donation-form-submit-btn").
 *
 * @param {object} props
 * @param {'idle'|'loading'|'success'|'error'} [props.status]
 * @param {import('react').ReactNode} props.label
 * @param {import('react').ReactNode} [props.loadingLabel]
 * @param {import('react').ReactNode} [props.successLabel]
 * @param {import('react').ReactNode} [props.errorLabel]
 * @param {import('react').ReactNode} [props.icon] Idle-state icon.
 * @param {'start'|'end'} [props.iconPosition]
 * @param {string} [props.className]
 * @param {'button'|'submit'|'reset'} [props.type]
 * @param {boolean} [props.disabled]
 */
export default function StatefulButton({
  status = 'idle',
  label,
  loadingLabel,
  successLabel,
  errorLabel,
  icon = null,
  iconPosition = 'end',
  className = '',
  type = 'button',
  disabled = false,
  ...rest
}) {
  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  const currentLabel = isLoading
    ? loadingLabel ?? label
    : isSuccess
      ? successLabel ?? label
      : isError
        ? errorLabel ?? label
        : label;

  const currentIcon = isLoading ? (
    <Loader2 size={18} className="stateful-btn__spinner" aria-hidden />
  ) : isSuccess ? (
    <CheckCircle2 size={18} className="stateful-btn__pop" aria-hidden />
  ) : isError ? (
    <AlertCircle size={18} className="stateful-btn__pop" aria-hidden />
  ) : (
    icon
  );

  const showIconStart = currentIcon && iconPosition === 'start';
  const showIconEnd = currentIcon && iconPosition === 'end';

  return (
    <button
      type={type}
      className={`stateful-btn ${className}`.trim()}
      data-status={status}
      aria-busy={isLoading || undefined}
      aria-live="polite"
      disabled={disabled || isLoading || isSuccess}
      {...rest}
    >
      {isLoading ? <span className="stateful-btn__bar" aria-hidden /> : null}
      {showIconStart ? (
        <span key={`si-${status}`} className="stateful-btn__ico">
          {currentIcon}
        </span>
      ) : null}
      <span key={`sl-${status}`} className="stateful-btn__txt">
        {currentLabel}
      </span>
      {showIconEnd ? (
        <span key={`ei-${status}`} className="stateful-btn__ico">
          {currentIcon}
        </span>
      ) : null}
    </button>
  );
}
