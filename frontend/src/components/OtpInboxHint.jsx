import { AlertTriangle, Mail } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';

/**
 * Highlighted inbox + spam-folder guidance shown on OTP entry screens.
 */
export default function OtpInboxHint({ emailMasked, devOtp, children }) {
  const { t } = useTranslation();

  return (
    <div className="otp-inbox-hint">
      <p className="otp-inbox-hint__lead">
        <Mail size={17} aria-hidden className="shrink-0" />
        <span>{t('auth.otpSentTo', { email: emailMasked })}</span>
      </p>

      {devOtp ? (
        <p className="otp-inbox-hint__dev">
          {t('auth.smtpDevHelper').split('{otp}')[0]}
          <span className="font-black text-[#17311f]">{devOtp}</span>
          {t('auth.smtpDevHelper').split('{otp}')[1] || ''}
        </p>
      ) : (
        <>
          <p className="otp-inbox-hint__inbox">{t('auth.checkInbox')}</p>
          <div className="otp-inbox-hint__spam" role="note">
            <AlertTriangle size={20} aria-hidden className="otp-inbox-hint__spam-icon" />
            <div className="min-w-0">
              <p className="otp-inbox-hint__spam-title">{t('auth.checkSpamTitle')}</p>
              <p className="otp-inbox-hint__spam-body">{t('auth.checkSpamHint')}</p>
            </div>
          </div>
          {children ? <div className="otp-inbox-hint__extra">{children}</div> : null}
        </>
      )}
    </div>
  );
}
