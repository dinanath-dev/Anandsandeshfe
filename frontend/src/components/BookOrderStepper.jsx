export default function BookOrderStepper({ currentStep, t }) {
  const steps = [
    { n: 1, label: t('books.stepMode') },
    { n: 2, label: t('books.stepBooks') },
    { n: 3, label: t('books.stepPayment') }
  ];

  return (
    <nav className="book-order-stepper" aria-label={t('books.stepperAria')}>
      <ol className="book-order-stepper-list">
        {steps.map((step, index) => {
          const done = currentStep > step.n;
          const active = currentStep === step.n;
          return (
            <li key={step.n} className="book-order-stepper-item">
              <div className="book-order-stepper-node">
                <span
                  className={`book-order-stepper-badge ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? '✓' : step.n}
                </span>
                <span className={`book-order-stepper-label ${active ? 'is-active' : ''}`}>{step.label}</span>
              </div>
              {index < steps.length - 1 ? <div className={`book-order-stepper-line ${done ? 'is-done' : ''}`} /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
