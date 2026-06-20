import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function SubscriptionPlanPicker({ value, onChange, error }) {
  const { t } = useTranslation();

  const plans = [
    {
      id: 'yearly',
      title: t('form.oneYear'),
      price: t('form.planYearlyPrice'),
      hint: t('form.oneYearHint'),
      badge: null
    },
    {
      id: 'five_year',
      title: t('form.fiveYear'),
      price: t('form.planFiveYearPrice'),
      hint: t('form.fiveYearHint'),
      badge: t('form.planBestValue')
    }
  ];

  return (
    <div>
      <fieldset className={`form-plan-grid ${error ? 'form-plan-grid--invalid' : ''}`}>
        <legend className="sr-only">{t('form.labels.subscription')}</legend>
        {plans.map((plan) => {
          const selected = value === plan.id;
          return (
            <label
              key={plan.id}
              className={`form-plan-card ${selected ? 'form-plan-card--selected' : ''}`}
            >
              <input
                type="radio"
                name="subscription"
                value={plan.id}
                checked={selected}
                onChange={() => onChange(plan.id)}
                className="form-plan-radio"
              />
              <span className="form-plan-card-inner">
                <span className="form-plan-card-top">
                  <span className="form-plan-title">{plan.title}</span>
                  {plan.badge ? <span className="form-plan-badge">{plan.badge}</span> : null}
                </span>
                <span className="form-plan-price">{plan.price}</span>
                <span className="form-plan-hint">{plan.hint}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      {error ? <p className="donation-form-hint">{error}</p> : null}
    </div>
  );
}
