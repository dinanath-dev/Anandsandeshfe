import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, Eye, EyeOff, Mail } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  getCurrentUser,
  loginWithPassword,
  requestEmailOtp,
  resetPasswordWithOtp,
  verifyEmailOtp
} from '../services/api.js';
import { clearPendingOtp, getPendingOtp, isUserAuthenticated, savePendingOtp, saveUserAuth } from '../utils/auth.js';
import { useSeo } from '../utils/seo.js';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import OtpInboxHint from '../components/OtpInboxHint.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function buildMaskedEmail(email) {
  const [name = '', domain = ''] = email.split('@');
  if (!name || !domain) return email;
  const visible = name.length <= 2 ? name[0] || '' : `${name[0]}${name[name.length - 1]}`;
  return `${visible}${'•'.repeat(Math.max(name.length - 2, 2))}@${domain}`;
}

export default function AuthPage() {
  useSeo({
    title: 'Login — Anand Sandesh Karyalay | Shri Anandpur Dham',
    description:
      'Sign in or create an account to subscribe to Anand Sandesh magazine online. Official Anand Sandesh Karyalay, Shri Anandpur Dham, 473331.',
    canonical: 'https://anandsandeshkaryalay.online/login'
  });

  const { t } = useTranslation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const otpRefs = useRef([]);
  const [mode, setMode] = useState('signup');
  const [flow, setFlow] = useState('normal');
  const [loginTab, setLoginTab] = useState('otp');
  const [step, setStep] = useState('details');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [otpValues, setOtpValues] = useState(Array.from({ length: OTP_LENGTH }, () => ''));
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [devOtp, setDevOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    password: false,
    confirmPassword: false,
    newPassword: false,
    confirmNewPassword: false
  });

  useEffect(() => {
    if (step !== 'otp' || resendIn <= 0) return undefined;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [step, resendIn]);

  useEffect(() => {
    const pending = getPendingOtp();
    if (!pending?.email) return;

    if (pending.flow === 'forgot' || pending.mode === 'reset') {
      setFlow('forgot');
      setMode('login');
    } else {
      setMode(pending.mode === 'login' ? 'login' : 'signup');
    }
    setForm({
      fullName: pending.fullName || '',
      email: pending.email || '',
      password: '',
      confirmPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    setDevOtp(pending.devOtp || '');
    setStep('otp');

    const expMs =
      typeof pending.expiresAt === 'string' ? Date.parse(pending.expiresAt) : Number(pending.expiresAt);
    const secondsLeft = Number.isFinite(expMs)
      ? Math.max(0, Math.ceil((expMs - Date.now()) / 1000))
      : RESEND_SECONDS;
    setResendIn(secondsLeft > RESEND_SECONDS ? RESEND_SECONDS : secondsLeft);
  }, []);

  if (isUserAuthenticated()) {
    return <Navigate to="/profile" replace />;
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
    setStatus('');
  }

  function togglePasswordVisibility(field) {
    setVisiblePasswords((current) => ({
      ...current,
      [field]: !current[field]
    }));
  }

  function resetOtpBoxes() {
    setOtpValues(Array.from({ length: OTP_LENGTH }, () => ''));
    window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
  }

  function validateBeforeSendOtp() {
    if (!form.email.trim()) {
      setError(t('auth.errors.emailRequired'));
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError(t('auth.errors.emailInvalid'));
      return false;
    }

    if (flow === 'forgot') return true;

    if (mode === 'signup') {
      if (!form.fullName.trim()) {
        setError(t('auth.errors.nameRequired'));
        return false;
      }
      if (form.password.trim().length < 6) {
        setError(t('auth.errors.passwordTooShort'));
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setError(t('auth.errors.passwordsMismatch'));
        return false;
      }
    }

    return true;
  }

  async function issueOtp() {
    const email = form.email.trim().toLowerCase();
    const effectiveMode = flow === 'forgot' ? 'reset' : mode;

    const payload = {
      email,
      fullName: mode === 'signup' ? form.fullName.trim() : '',
      mode: effectiveMode
    };

    if (effectiveMode === 'signup') {
      payload.password = form.password.trim();
    }

    const data = await requestEmailOtp(payload);
    const expMs = typeof data.expiresAt === 'string' ? Date.parse(data.expiresAt) : Number(data.expiresAt);

    savePendingOtp({
      ...payload,
      flow: flow === 'forgot' ? 'forgot' : 'normal',
      expiresAt: Number.isFinite(expMs) ? expMs : Date.now() + 10 * 60 * 1000,
      devOtp: data.devOtp || ''
    });
    setDevOtp(data.devOtp || '');
    setStep('otp');
    setResendIn(RESEND_SECONDS);
    resetOtpBoxes();
    setStatus(
      data.message ||
        t('auth.otpSentMessage', { email: buildMaskedEmail(email) })
    );
    showToast(t('auth.otpSentToast'), { type: 'info' });
  }

  async function handleSendOtp(event) {
    event.preventDefault();
    setError('');
    setStatus('');

    if (!validateBeforeSendOtp()) return;

    setIsSendingOtp(true);
    try {
      await issueOtp();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handlePasswordLogin(event) {
    event.preventDefault();
    setError('');
    setStatus('');

    if (!form.email.trim()) {
      setError(t('auth.errors.emailRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError(t('auth.errors.emailInvalid'));
      return;
    }
    if (!form.password.trim()) {
      setError(t('auth.errors.passwordRequired'));
      return;
    }

    setIsLoggingIn(true);
    try {
      const data = await loginWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password.trim()
      });
      const verifiedAt = new Date().toISOString();
      saveUserAuth({
        token: data.token,
        user: data.user,
        verifiedAt
      });
      try {
        const me = await getCurrentUser();
        if (me?.user) {
          saveUserAuth({
            token: data.token,
            user: { ...data.user, ...me.user },
            verifiedAt
          });
        }
      } catch {
        // Optional profile refresh failed; token is already stored.
      }
      clearPendingOtp();
      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setError('');
    setStatus('');

    const enteredOtp = otpValues.join('');
    if (enteredOtp.length !== OTP_LENGTH) {
      setError(t('auth.errors.otpIncomplete'));
      return;
    }
    if (form.newPassword.trim().length < 6) {
      setError(t('auth.errors.newPasswordTooShort'));
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError(t('auth.errors.newPasswordsMismatch'));
      return;
    }

    setIsResettingPassword(true);
    try {
      await resetPasswordWithOtp({
        email: form.email.trim().toLowerCase(),
        otp: enteredOtp,
        newPassword: form.newPassword.trim()
      });
      setStatus(t('auth.passwordResetSuccess'));
      clearPendingOtp();
      setFlow('normal');
      setLoginTab('password');
      setStep('details');
      setOtpValues(Array.from({ length: OTP_LENGTH }, () => ''));
      setForm((current) => ({
        ...current,
        password: '',
        confirmPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsResettingPassword(false);
    }
  }

  function handleOtpChange(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtpValues((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    setError('');

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index, event) {
    if (event.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpPaste(event) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] || '');
    setOtpValues(next);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    if (flow === 'forgot') return;

    setError('');
    setStatus('');

    const enteredOtp = otpValues.join('');
    if (enteredOtp.length !== OTP_LENGTH) {
      setError(t('auth.errors.otpIncomplete'));
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const data = await verifyEmailOtp({
        email: form.email.trim().toLowerCase(),
        otp: enteredOtp
      });

      const verifiedAt = new Date().toISOString();
      saveUserAuth({
        token: data.token,
        user: data.user,
        verifiedAt
      });
      try {
        const me = await getCurrentUser();
        if (me?.user) {
          saveUserAuth({
            token: data.token,
            user: { ...data.user, ...me.user },
            verifiedAt
          });
        }
      } catch {
        // Optional profile refresh failed; token is already stored.
      }
      clearPendingOtp();

      navigate('/profile', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleResendOtp() {
    if (resendIn > 0) return;
    setError('');
    setStatus('');

    setIsSendingOtp(true);
    try {
      await issueOtp();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSendingOtp(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setFlow('normal');
    setLoginTab('otp');
    setStep('details');
    setError('');
    setStatus('');
    setDevOtp('');
    setOtpValues(Array.from({ length: OTP_LENGTH }, () => ''));
    setForm({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    clearPendingOtp();
  }

  function selectLoginTab(tab) {
    setLoginTab(tab);
    setStep('details');
    setFlow('normal');
    setError('');
    setStatus('');
    setDevOtp('');
    setOtpValues(Array.from({ length: OTP_LENGTH }, () => ''));
    clearPendingOtp();
  }

  const showStepper =
    step === 'otp' ||
    (step === 'details' &&
      (mode === 'signup' || flow === 'forgot' || (mode === 'login' && loginTab === 'otp')));

  const cardTitle =
    flow === 'forgot'
      ? t('auth.cardTitleReset')
      : mode === 'signup'
        ? t('auth.cardTitleSignup')
        : t('auth.cardTitleLogin');

  return (
    <main className="auth-page min-h-screen overflow-x-hidden px-3 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
      {isLoggingIn ? <LoadingBlock label={t('loaders.signingIn')} /> : null}
      {isVerifyingOtp ? <LoadingBlock label={t('auth.verifying')} /> : null}
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-lg items-center justify-center sm:min-h-[calc(100vh-2.5rem)]">
        <section className="relative w-full px-1 py-4 sm:px-2 sm:py-8">
          <div className="auth-card-shape auth-card-shape-one" aria-hidden />
          <div className="auth-card-shape auth-card-shape-two" aria-hidden />

          <div className="relative z-[1] w-full">
            <div className="rounded-[2rem] border border-white/25 bg-white/15 p-5 shadow-[0_18px_50px_rgba(6,13,26,0.28)] ring-1 ring-white/15 backdrop-blur-xl sm:p-7">
              <p className="mb-4">
                <Link
                  to="/"
                  className="text-sm font-semibold text-primary transition hover:text-slate-900"
                >
                  ← {t('auth.backHome')}
                </Link>
              </p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">{t('auth.welcomeEyebrow')}</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-900">{cardTitle}</h2>
                </div>
                <div className="rounded-2xl bg-white/25 p-3 text-primary ring-1 ring-white/35 backdrop-blur-sm">
                  <Mail size={22} />
                </div>
              </div>

              {flow === 'forgot' ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setFlow('normal');
                      setLoginTab('password');
                      setStep('details');
                      setError('');
                      setStatus('');
                      clearPendingOtp();
                    }}
                    className="text-sm font-semibold text-primary transition hover:text-slate-900"
                  >
                    {t('auth.backToSignIn')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-900/10 p-1 backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${mode === 'signup' ? 'bg-white/45 text-slate-900 shadow-sm ring-1 ring-white/40 backdrop-blur-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {t('auth.tabSignup')}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${mode === 'login' ? 'bg-white/45 text-slate-900 shadow-sm ring-1 ring-white/40 backdrop-blur-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {t('auth.tabLogin')}
                    </button>
                  </div>

                  {mode === 'login' ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-900/10 p-1 backdrop-blur-sm">
                      <button
                        type="button"
                        onClick={() => selectLoginTab('otp')}
                        className={`rounded-2xl px-3 py-2.5 text-xs font-bold transition sm:text-sm ${loginTab === 'otp' ? 'bg-white/45 text-slate-900 shadow-sm ring-1 ring-white/40 backdrop-blur-sm' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        {t('auth.tabOtp')}
                      </button>
                      <button
                        type="button"
                        onClick={() => selectLoginTab('password')}
                        className={`rounded-2xl px-3 py-2.5 text-xs font-bold transition sm:text-sm ${loginTab === 'password' ? 'bg-white/45 text-slate-900 shadow-sm ring-1 ring-white/40 backdrop-blur-sm' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        {t('auth.tabPassword')}
                      </button>
                    </div>
                  ) : null}
                </>
              )}

              {showStepper ? (
                <div className="mt-6 flex items-center gap-3 text-sm text-slate-600">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${step === 'details' ? 'bg-primary text-white shadow-sm' : 'bg-white/35 text-slate-800 ring-1 ring-white/30'}`}
                  >
                    1
                  </span>
                  <div className="h-px flex-1 bg-white/35" />
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${step === 'otp' ? 'bg-primary text-white shadow-sm' : 'bg-white/35 text-slate-800 ring-1 ring-white/30'}`}
                  >
                    2
                  </span>
                </div>
              ) : null}

              {step === 'details' ? (
                mode === 'login' && loginTab === 'password' && flow === 'normal' ? (
                  <form className="mt-6 space-y-4" onSubmit={handlePasswordLogin}>
                    <label className="block">
                      <span className="auth-label">{t('auth.labelEmail')}</span>
                      <input
                        className="auth-input"
                        type="email"
                        placeholder={t('auth.placeholderEmail')}
                        value={form.email}
                        onChange={(event) => updateField('email', event.target.value)}
                        autoComplete="email"
                      />
                    </label>
                    <label className="block">
                      <span className="auth-label">{t('auth.labelPassword')}</span>
                      <div className="relative">
                        <input
                          className="auth-input pr-12"
                          type={visiblePasswords.password ? 'text' : 'password'}
                          placeholder={t('auth.placeholderPasswordLogin')}
                          value={form.password}
                          onChange={(event) => updateField('password', event.target.value)}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('password')}
                          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-600 transition hover:text-slate-900"
                          aria-label={visiblePasswords.password ? t('auth.togglePasswordHide') : t('auth.togglePasswordShow')}
                        >
                          {visiblePasswords.password ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </label>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setFlow('forgot');
                          setStep('details');
                          setError('');
                          setStatus('');
                          clearPendingOtp();
                          setOtpValues(Array.from({ length: OTP_LENGTH }, () => ''));
                        }}
                        className="text-sm font-semibold text-[#234d36] underline-offset-2 transition hover:text-[#17311f] hover:underline"
                      >
                        {t('auth.forgotPassword')}
                      </button>
                    </div>

                    {error ? <p className="auth-error">{error}</p> : null}
                    {status ? <p className="auth-success">{status}</p> : null}

                    <button className="auth-primary-btn w-full" type="submit" disabled={isLoggingIn}>
                      {isLoggingIn ? <InlineLoader size={22} /> : null}
                      {isLoggingIn ? t('auth.signingIn') : t('auth.signIn')}
                      {!isLoggingIn ? <ArrowRight size={18} aria-hidden /> : null}
                    </button>
                  </form>
                ) : (
                  <form className="mt-6 space-y-4" onSubmit={handleSendOtp}>
                    {mode === 'signup' ? (
                      <>
                        <label className="block">
                          <span className="auth-label">{t('auth.labelFullName')}</span>
                          <input
                            className="auth-input"
                            type="text"
                            placeholder={t('auth.placeholderFullName')}
                            value={form.fullName}
                            onChange={(event) => updateField('fullName', event.target.value)}
                            autoComplete="name"
                          />
                        </label>
                        <label className="block">
                          <span className="auth-label">{t('auth.labelEmail')}</span>
                          <input
                            className="auth-input"
                            type="email"
                            placeholder={t('auth.placeholderEmail')}
                            value={form.email}
                            onChange={(event) => updateField('email', event.target.value)}
                            autoComplete="email"
                          />
                        </label>
                        <label className="block">
                          <span className="auth-label">{t('auth.labelPassword')}</span>
                          <div className="relative">
                            <input
                              className="auth-input pr-12"
                              type={visiblePasswords.password ? 'text' : 'password'}
                              placeholder={t('auth.placeholderPasswordSignup')}
                              value={form.password}
                              onChange={(event) => updateField('password', event.target.value)}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('password')}
                              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-600 transition hover:text-slate-900"
                              aria-label={visiblePasswords.password ? t('auth.togglePasswordHide') : t('auth.togglePasswordShow')}
                            >
                              {visiblePasswords.password ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </label>
                        <label className="block">
                          <span className="auth-label">{t('auth.labelConfirmPassword')}</span>
                          <div className="relative">
                            <input
                              className="auth-input pr-12"
                              type={visiblePasswords.confirmPassword ? 'text' : 'password'}
                              placeholder={t('auth.placeholderConfirmPassword')}
                              value={form.confirmPassword}
                              onChange={(event) => updateField('confirmPassword', event.target.value)}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('confirmPassword')}
                              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-600 transition hover:text-slate-900"
                              aria-label={visiblePasswords.confirmPassword ? t('auth.toggleConfirmHide') : t('auth.toggleConfirmShow')}
                            >
                              {visiblePasswords.confirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </label>
                      </>
                    ) : (
                      <label className="block">
                        <span className="auth-label">{t('auth.labelEmail')}</span>
                        <input
                          className="auth-input"
                          type="email"
                          placeholder={t('auth.placeholderEmail')}
                          value={form.email}
                          onChange={(event) => updateField('email', event.target.value)}
                          autoComplete="email"
                        />
                      </label>
                    )}

                    {error ? <p className="auth-error">{error}</p> : null}
                    {status ? <p className="auth-success">{status}</p> : null}

                    <button className="auth-primary-btn w-full" type="submit" disabled={isSendingOtp}>
                      {isSendingOtp ? <InlineLoader size={22} /> : null}
                      {isSendingOtp
                        ? t('auth.sendingOtp')
                        : flow === 'forgot'
                          ? t('auth.sendResetCode')
                          : t('auth.continueWithOtp')}
                      {!isSendingOtp ? <ArrowRight size={18} aria-hidden /> : null}
                    </button>

                    <p className="text-center text-sm text-[#6b806f]">
                      {flow === 'forgot'
                        ? t('auth.forgotHelp')
                        : mode === 'signup'
                          ? t('auth.signupHelp')
                          : t('auth.loginHelp')}
                    </p>
                  </form>
                )
              ) : flow === 'forgot' ? (
                <form className="mt-6" onSubmit={handleResetPassword}>
                  <OtpInboxHint
                    emailMasked={buildMaskedEmail(form.email.trim().toLowerCase())}
                    devOtp={devOtp}
                  >
                    <p>{t('auth.chooseNewPassword')}</p>
                  </OtpInboxHint>

                  <div className="mt-5 grid grid-cols-6 gap-1.5 sm:gap-3">
                    {otpValues.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          otpRefs.current[index] = element;
                        }}
                        className="auth-otp-input min-w-0"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(event) => handleOtpChange(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        onPaste={handleOtpPaste}
                        aria-label={t('auth.otpDigitAria', { n: index + 1 })}
                      />
                    ))}
                  </div>

                  <label className="mt-5 block">
                    <span className="auth-label">{t('auth.labelNewPassword')}</span>
                    <div className="relative">
                      <input
                        className="auth-input pr-12"
                        type={visiblePasswords.newPassword ? 'text' : 'password'}
                        placeholder={t('auth.placeholderNewPassword')}
                        value={form.newPassword}
                        onChange={(event) => updateField('newPassword', event.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('newPassword')}
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-600 transition hover:text-slate-900"
                        aria-label={visiblePasswords.newPassword ? t('auth.toggleNewHide') : t('auth.toggleNewShow')}
                      >
                        {visiblePasswords.newPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>
                  <label className="mt-3 block">
                    <span className="auth-label">{t('auth.labelConfirmNewPassword')}</span>
                    <div className="relative">
                      <input
                        className="auth-input pr-12"
                        type={visiblePasswords.confirmNewPassword ? 'text' : 'password'}
                        placeholder={t('auth.placeholderConfirmNewPassword')}
                        value={form.confirmNewPassword}
                        onChange={(event) => updateField('confirmNewPassword', event.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirmNewPassword')}
                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-600 transition hover:text-slate-900"
                        aria-label={visiblePasswords.confirmNewPassword ? t('auth.toggleConfirmNewHide') : t('auth.toggleConfirmNewShow')}
                      >
                        {visiblePasswords.confirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>

                  {error ? <p className="auth-error mt-4">{error}</p> : null}
                  {status ? <p className="auth-success mt-4">{status}</p> : null}

                  <button
                    className="auth-primary-btn mt-5 w-full"
                    type="submit"
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? <InlineLoader size={22} /> : null}
                    {isResettingPassword ? t('auth.updating') : t('auth.updatePassword')}
                    {!isResettingPassword ? <ChevronRight size={18} aria-hidden /> : null}
                  </button>

                  <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('details');
                        setError('');
                        setStatus('');
                      }}
                      className="font-semibold text-[#234d36] transition hover:text-[#17311f]"
                    >
                      {t('common.changeEmail')}
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendIn > 0 || isSendingOtp}
                      className="inline-flex items-center gap-2 font-semibold text-[#234d36] transition hover:text-[#17311f] disabled:cursor-not-allowed disabled:text-[#97aa9b]"
                    >
                      {isSendingOtp ? <InlineLoader size={18} /> : null}
                      {resendIn > 0
                        ? t('common.resendIn', { seconds: resendIn })
                        : isSendingOtp
                          ? t('common.sending')
                          : t('common.resendOtp')}
                    </button>
                  </div>
                </form>
              ) : (
                <form className="mt-6" onSubmit={handleVerifyOtp}>
                  <OtpInboxHint
                    emailMasked={buildMaskedEmail(form.email.trim().toLowerCase())}
                    devOtp={devOtp}
                  />

                  <div className="mt-5 grid grid-cols-6 gap-1.5 sm:gap-3">
                    {otpValues.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          otpRefs.current[index] = element;
                        }}
                        className="auth-otp-input min-w-0"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(event) => handleOtpChange(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        onPaste={handleOtpPaste}
                        aria-label={t('auth.otpDigitAria', { n: index + 1 })}
                      />
                    ))}
                  </div>

                  {error ? <p className="auth-error mt-4">{error}</p> : null}
                  {status ? <p className="auth-success mt-4">{status}</p> : null}

                  <button className="auth-primary-btn mt-5 w-full" type="submit" disabled={isVerifyingOtp}>
                    {isVerifyingOtp ? t('auth.verifying') : t('auth.verifyAndContinue')}
                    {!isVerifyingOtp ? <ChevronRight size={18} aria-hidden /> : null}
                  </button>

                  <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('details');
                        setError('');
                        setStatus('');
                      }}
                      className="font-semibold text-[#234d36] transition hover:text-[#17311f]"
                    >
                      {t('common.changeEmail')}
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendIn > 0 || isSendingOtp}
                      className="inline-flex items-center gap-2 font-semibold text-[#234d36] transition hover:text-[#17311f] disabled:cursor-not-allowed disabled:text-[#97aa9b]"
                    >
                      {isSendingOtp ? <InlineLoader size={18} /> : null}
                      {resendIn > 0
                        ? t('common.resendIn', { seconds: resendIn })
                        : isSendingOtp
                          ? t('common.sending')
                          : t('common.resendOtp')}
                    </button>
                  </div>

                  <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[#f7f8f7] px-4 py-3 text-sm text-[#5b7060]">
                    <CheckCircle2 size={18} className="text-[#2c7b49]" />
                    {t('auth.afterOtpHint')}
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>

    </main>
  );
}
