/**
 * Translation dictionary for the Anand Sandesh frontend.
 *
 * Lookup convention:
 *   t('group.key')              -> string
 *   t('group.key', { name })    -> interpolates {name} placeholders
 *
 * Falls back to English if a key is missing in Hindi.
 */

export const SUPPORTED_LANGUAGES = ['en', 'hi'];
export const DEFAULT_LANGUAGE = 'en';

export const translations = {
  en: {
    common: {
      logout: 'Log out',
      backToProfile: 'Back to profile',
      changeEmail: 'Change email',
      resendOtp: 'Resend OTP',
      resendIn: 'Resend in {seconds}s',
      sending: 'Sending...',
      yes: 'Yes',
      no: 'No',
      cancel: 'Cancel',
      submit: 'Submit',
      continue: 'Continue',
      english: 'English',
      hindi: 'Hindi',
      languageLabel: 'Language',
      switchToHindi: 'हिन्दी',
      switchToEnglish: 'English',
      loading: 'Loading…'
    },

    layout: {
      mantra: 'श्रीसद्गुरुदेवाय नमः',
      orgTitle: 'SHRI PARAMHANS ADVAIT MAT PUBLICATION SOCIETY',
      addressLine1: 'Anand Sandesh Karyalay',
      addressLine2: 'Shri Anandpur Dham',
      addressLine3: 'Post Office Shri Anandpur Dham, 473331',
      logoAlt: 'Shri Anandpur Dham — Shri Paramhans Advait Mat'
    },

    loaders: {
      signingIn: 'Signing you in…',
      loadingPage: 'Loading page...',
      loadingDetails: 'Loading your details…',
      loadingSubmission: 'Loading your submission…',
      loadingSubmissions: 'Loading submissions…',
      searchingRecords: 'Searching records...',
      savingForm: 'Saving your form…',
      startingCheckout: 'Starting secure checkout...'
    },

    auth: {
      heroBadge: 'Anand Sandesh — subscription portal',
      heroTitle: 'Login and sign up',
      heroAddress:
        'Anand Sandesh Karyale, Shri Anandpur Dham, Post Office Shri Anandpur,',
      heroPin: '473331',
      welcomeEyebrow: 'Welcome',
      cardTitleSignup: 'Create account',
      cardTitleLogin: 'Welcome back',
      cardTitleReset: 'Reset password',
      tabSignup: 'Sign up',
      tabLogin: 'Login',
      tabOtp: 'Email OTP',
      tabPassword: 'Password',
      backToSignIn: '← Back to sign in',
      labelFullName: 'Full name',
      placeholderFullName: 'Enter your full name',
      labelEmail: 'Email address',
      placeholderEmail: 'name@example.com',
      labelPassword: 'Password',
      placeholderPasswordSignup: 'At least 6 characters',
      placeholderPasswordLogin: 'Enter your password',
      labelConfirmPassword: 'Confirm password',
      placeholderConfirmPassword: 'Re-enter your password',
      labelNewPassword: 'New password',
      placeholderNewPassword: 'At least 6 characters',
      labelConfirmNewPassword: 'Confirm new password',
      placeholderConfirmNewPassword: 'Re-enter new password',
      forgotPassword: 'Forgot password?',
      signIn: 'Sign in',
      signingIn: 'Signing in...',
      sendingOtp: 'Sending OTP...',
      sendResetCode: 'Send reset code',
      continueWithOtp: 'Continue with email OTP',
      verifying: 'Verifying...',
      verifyAndContinue: 'Verify and continue',
      updating: 'Updating...',
      updatePassword: 'Update password',
      otpSentTo: 'Enter the OTP sent to {email}',
      smtpDevHelper:
        'SMTP is not configured yet, so use development OTP {otp}.',
      checkInbox: 'Check your inbox and enter the 6-digit code to continue.',
      checkSpamHint:
        "Can't find the email? Check your spam or junk folder — the OTP sometimes lands there.",
      chooseNewPassword: 'Then choose a new password below.',
      forgotHelp: 'We will email a one-time code to set a new password.',
      signupHelp:
        'A one-time OTP verifies your email and activates your account. You can sign in with this password later.',
      loginHelp: 'A one-time 6-digit code will be sent to your email.',
      otpDigitAria: 'OTP digit {n}',
      togglePasswordHide: 'Hide password',
      togglePasswordShow: 'Show password',
      toggleConfirmHide: 'Hide confirm password',
      toggleConfirmShow: 'Show confirm password',
      toggleNewHide: 'Hide new password',
      toggleNewShow: 'Show new password',
      toggleConfirmNewHide: 'Hide confirm new password',
      toggleConfirmNewShow: 'Show confirm new password',
      afterOtpHint:
        'After OTP verification you can use this password to sign in next time.',
      otpSentMessage:
        'A 6-digit verification code has been sent to {email}.',
      passwordResetSuccess:
        'Password reset successful. Sign in with your new password.',
      errors: {
        emailRequired: 'Please enter your email address.',
        emailInvalid: 'Please enter a valid email address.',
        nameRequired: 'Please enter your full name to create your account.',
        passwordTooShort: 'Password must be at least 6 characters.',
        passwordsMismatch: 'Passwords do not match.',
        passwordRequired: 'Please enter your password.',
        otpIncomplete: 'Please enter the complete 6-digit OTP.',
        newPasswordTooShort: 'New password must be at least 6 characters.',
        newPasswordsMismatch: 'New passwords do not match.'
      }
    },

    profile: {
      subtitle: 'Your contact details on file',
      cardEyebrow: 'Member portal',
      cardTitle: 'Account overview',
      subscriptionActive: 'Your Anand Sandesh subscription is paid and active.',
      validThrough: 'Valid through {date}',
      periodRemainingToday: 'Expires today',
      periodRemainingOneDay: '1 day remaining',
      periodRemainingDays: '{count} days remaining',
      periodRemainingOneMonth: '1 month remaining',
      periodRemainingMonths: '{count} months remaining',
      periodExpired: 'Subscription period has ended',
      actionsHeading: 'What would you like to do?',
      bannerMaskedHelp:
        'Phone and email are partially hidden. You can review or update the full values on the next screen.',
      offlineToggle: 'Subscribed offline before? Find your record',
      offlineHelp:
        'If you used a different email before or are new to this website, your details may still be in our database from the offline process. Search by the mobile number or subscriber number from your old form—we will show the saved address so you can confirm it is yours, then link it to this login.',
      offlineHelpStrongMobile: 'mobile number',
      offlineHelpStrongAddress: 'address',
      lookupTooltip:
        'Search with the 10-digit mobile or the subscriber number printed on your old Anand Sandesh form. We show your saved details so you can confirm and link them to this login.',
      searchByMobile: 'Mobile number',
      searchBySubscriber: 'Subscriber no.',
      labelSearchMobile: 'Mobile number',
      labelSearchSubscriber: 'Subscriber number',
      placeholderSearchMobile: '10-digit number',
      placeholderSearchSubscriber: 'e.g. 12345',
      searching: 'Searching…',
      searchDatabase: 'Search database',
      recordFound: 'Record found - confirm by address',
      pickRecord: 'Several records share this number - pick the one that matches you',
      nameOnFile: 'Name on file:',
      subscriberHint: 'Subscriber no. (hint):',
      emailOnFile: 'Email on file (masked):',
      addressOnFile: 'Address on file',
      linking: 'Linking…',
      linkRecord: 'This is my record — link to my account',
      nameLabel: 'Name',
      subscriberNoLabel: 'Subscriber number',
      mobileLabel: 'Mobile number',
      emailLabel: 'Email',
      addressLabel: 'Address',
      notOnFile: '— Not on file yet —',
      noSavedAddress: '— No saved address yet —',
      mobileAria: 'Mobile number (masked)',
      emailAria: 'Email (masked)',
      addressAria: 'Postal address',
      continueToForm: 'Continue to subscription form',
      buyBooks: 'Buy books',
      tooltipAria: 'About offline subscription lookup',
      pinEnding: 'PIN ending in {last4}',
      record: 'Record',
      sub: 'Sub.',
      errors: {
        mobileRequired:
          'Enter the same 10-digit mobile number you used for your offline subscription.',
        subscriberRequired: 'Enter the subscriber number from your old form.',
        notFound:
          'No offline record found. Check the mobile or subscriber number, or contact support.',
        searchFailed: 'Could not search. Please try again.',
        claimFailed: 'Could not link this record. Please try again.'
      },
      claimSuccess:
        'Your offline record is now linked to this account. You can continue to the form to pay or update details.'
    },

    books: {
      subtitle: 'Buy spiritual books',
      backToProfile: 'Back to profile',
      selectBook: 'Select a book',
      selectBooks: 'Select books',
      chooseBook: 'Choose a book…',
      priceLabel: 'Price',
      quantity: 'Qty',
      cartSummary: 'Your selection',
      totalLabel: 'Total',
      orderItems: 'Books in this order',
      saving: 'Saving order…',
      proceedToPayment: 'Proceed to payment',
      noBooks: 'No books are available right now. Please check back later.',
      paymentSubtitle: 'Book payment',
      paymentHeading: 'Complete your book order',
      paymentSummary: 'One-time secure payment via Razorpay. Your order is confirmed after server verification.',
      bookLabel: 'Book:',
      orderRef: 'Order ID:',
      payNow: 'Pay now',
      editOrder: 'Edit order',
      oneTimePayment: 'Book purchase',
      loadingCatalog: 'Loading book catalog…',
      errors: {
        loadFailed: 'Could not load books. Please try again.',
        bookRequired: 'Please select at least one book.',
        orderFailed: 'Could not create your order. Please try again.'
      }
    },

    form: {
      subtitle: 'My Submission Details for Anand Sandesh',
      verifiedTitle: 'Your subscription is already on file.',
      verifiedPaidPrefix: 'Your',
      verifiedPaidSuffix: 'plan is paid and verified',
      verifiedPeriodPrefix: '(through',
      verifiedPeriodSuffix: ').',
      verifiedRenews: '. Renewals follow your Razorpay subscription schedule.',
      verifiedSecondary:
        "You don't need to submit this form again. Use your profile to review masked contact details, or contact support if something looks wrong.",
      pendingPaymentPrefix: 'Payment still pending.',
      pendingPaymentBody:
        'After you save this form, use Proceed to payment to complete Razorpay checkout so your subscription can be verified.',
      saveSuccess: 'Your details were saved. Your subscription stays active.',
      labels: {
        name: 'Name',
        subscriberNo: 'Subscriber no',
        gender: 'Gender',
        mobile: 'Mobile number',
        email: 'Email',
        dob: 'Date of birth (optional)',
        rehbar: 'Rehbar',
        address: 'Address',
        state: 'State',
        town: 'Village / Town / City',
        district: 'District',
        pin: 'Pincode',
        anandSandesh: 'Anand Sandesh',
        spiritualBliss: 'Spiritual Bliss',
        subscription: 'Subscription'
      },
      placeholders: {
        selectGender: 'Select',
        male: 'Male',
        female: 'Female',
        day: 'Day',
        month: 'Month',
        year: 'Year',
        selectState: 'Please select state'
      },
      months: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ],
      languageOptionLabel: 'Language option',
      optionalEnglishOnly: 'Optional · English only',
      oneYear: 'One year',
      oneYearHint: 'Renews every year',
      fiveYear: '5 year',
      fiveYearHint: 'One payment for five years',
      proceedToPayment: 'Proceed to payment',
      saving: 'Saving...',
      subscriberNoTitle: 'Assigned when you sign in — not editable',
      emailHint: 'Email is compulsory.',
      emailTitle: 'Email is compulsory — you must enter a valid email address.',
      errors: {
        nameRequired: 'Name is required',
        mobileRequired: 'Mobile number is required',
        mobileInvalid: 'Enter a valid 10 digit mobile number',
        emailRequired: 'Email is required',
        emailInvalid: 'Enter a valid email',
        dobIncomplete: 'Select day, month, and year for date of birth',
        required: 'This field is required',
        addressRequired: 'Address is required',
        stateRequired: 'Please select state',
        districtRequired: 'District is required',
        pinRequired: 'Pincode is required',
        pinInvalid: 'Enter a valid pincode',
        genderRequired: 'Select gender',
        rehbarRequired: 'Rehbar is required',
        anandSandeshRequired: 'Choose Hindi or English for Anand Sandesh',
        subscriptionRequired: 'Choose one year or five year subscription',
        subscriberMissing:
          'Subscriber number not loaded. Wait a moment or sign in again.',
        fixHighlighted: 'Please fix the highlighted fields and try again.',
        couldNotSave: 'Could not save submission. Please try again.'
      }
    },

    payment: {
      subtitle: 'Payment',
      heading: 'Proceed to payment',
      summary:
        'Pay securely with Razorpay. Your subscription is confirmed only after our server verifies the payment signature.',
      summaryRecurring:
        'Pay securely with Razorpay. Your card or UPI will be charged automatically every year until you cancel. Renewals are handled by Razorpay and confirmed by our server via webhooks.',
      recurringDescription: 'Anand Sandesh — {plan} (auto-renews yearly)',
      planLabel: 'Plan:',
      referenceLabel: 'Reference ID:',
      configHelpA:
        'Recurring payments need a subscription plan in Razorpay. Test mode has the same feature: use the dashboard in Test mode, then Subscriptions → Plans → + Create plan. Copy the plan id (looks like plan_…).',
      configHelpB:
        'For quick local testing, add one id to VITE_RAZORPAY_PLAN_ID in .env (both 1-year and 5-year will use it until you set separate VITE_RAZORPAY_PLAN_ID_YEARLY / FIVE_YEAR). Restart the dev server after editing env.',
      payWithRazorpay: 'Pay with Razorpay',
      startingCheckout: 'Starting checkout…',
      editDetails: 'Edit details',
      alreadyPaidHeading: 'Already subscribed',
      alreadyPaidSummary: 'Your payment is already verified. No further action is needed.',
      viewConfirmation: 'View confirmation',
      oneYear: 'One year',
      fiveYear: '5 year',
      errors: {
        notSignedIn: 'You need to be signed in to pay.',
        checkoutFailed:
          'Payment checkout did not load. Refresh the page and try again.',
        notConfigured:
          'Razorpay is not fully configured for this plan. Contact support.',
        couldNotStart: 'Could not start subscription. Please try again.',
        paymentFailed: 'Payment failed.',
        paymentCancelled: 'Payment cancelled.',
        couldNotStartShort: 'Could not start payment.',
        mobileRequiredForUpi:
          'A valid 10-digit mobile number is required for UPI Autopay. Edit your form and add your mobile number, then try again.',
        emailRequiredForCheckout:
          'An email address is required for payment. Sign in with email or add it on your form, then try again.',
        alreadyPaid: 'This subscription is already paid.',
        verificationPending:
          'Payment was received, but verification is still pending.'
      }
    },

    success: {
      paymentSuccessful: 'Payment successful',
      paymentReceived: 'Payment received',
      submissionReceived: 'Submission received',
      paymentSuccessfulDesc:
        'Your subscription payment was verified. Your account will stay in sync with Razorpay via webhooks.',
      paymentReceivedDesc:
        'Your payment is completed at Razorpay. We are confirming it with the server and your subscription will reflect shortly.',
      submissionReceivedDesc:
        'Your details have been saved with pending status. An administrator may review your submission and uploaded document.',
      submitAnother: 'Submit another'
    },

    seo: {
      officialBadge: 'Official subscription portal',
      homeH1: 'Anand Sandesh Karyalay — Anand Sandesh magazine subscription',
      homeLead:
        'Subscribe to the Anand Sandesh (आनंद संदेश) monthly spiritual magazine in Hindi and English. Published by Shri Paramhans Advait Mat Publication Society from Shri Anandpur Dham, Madhya Pradesh.',
      homePublisher:
        'Address: Anand Sandesh Karyalay, Shri Anandpur Dham, Post Office Shri Anandpur — 473331, India.',
      officialDomain: 'Official website: anandsandeshkaryalay.online'
    },

    about: {
      eyebrow: 'Shri Anandpur Dham',
      pageTitle: 'About Anand Sandesh',
      pageSubtitle: 'Monthly spiritual magazine — Hindi & English',
      intro:
        'Anand Sandesh (आनंद संदेश, anandsandesh) is the beloved monthly magazine of Shri Paramhans Advait Mat. Readers across India and abroad receive spiritual articles, satsang, and teachings rooted in Indian philosophy and devotion.',
      publisherHeading: 'Publisher',
      publisherBody:
        'Anand Sandesh and related publications are published by the Shri Paramhans Advait Mat Publication Society from Shri Anandpur Dham, serving seekers with authentic spiritual literature.',
      magazineHeading: 'The Anand Sandesh Monthly Magazine',
      magazineBody:
        'Anand Sandesh is published every month as a printed magazine. Each issue brings readers closer to the path of satsang and inner peace through essays, serial chapters, and devotional writings.',
      magazinePoint1: 'Available in Hindi and English editions.',
      magazinePoint2:
        'Topics include spirituality, Indian philosophy, devotion (bhakti), satsang, and practical guidance for daily life.',
      magazinePoint3:
        'Distributed from Anand Sandesh Karyalay at Shri Anandpur Dham to subscribers across India and worldwide.',
      booksHeading: 'Other Spiritual Books & Publications',
      booksBody:
        'In addition to the monthly Anand Sandesh magazine, the Publication Society offers other books and literature related to spirituality, satsang, and the teachings of Shri Paramhans Advait Mat, including:',
      books: {
        item1: 'Spiritual discourses and satsang literature.',
        item2: 'Books on devotion, meditation, and Indian philosophy.',
        item3: 'Hindi and English publications for seekers and families.',
        item4: 'Periodic special editions and related spiritual titles.'
      },
      subscribeHeading: 'Online Subscription',
      subscribeBody:
        'Subscribe to Anand Sandesh through this official portal — create an account, complete your details, and pay securely online for yearly or multi-year membership.',
      subscribeCta: 'Subscribe to Anand Sandesh online',
      contactHeading: 'Contact & Address',
      addressName: 'Anand Sandesh Karyalay',
      addressLine1: 'Shri Anandpur Dham',
      addressLine2: 'Post Office Shri Anandpur',
      addressPin: '473331',
      addressRegion: 'Madhya Pradesh, India',
      contactNote:
        'For subscription enquiries, visit Anand Sandesh Karyalay at the address above or use this website to register and manage your membership.',
      officialSiteHeading: 'Official website only',
      officialSiteBody:
        'anandsandeshkaryalay.online is the official online portal of Anand Sandesh Karyalay, Shri Anandpur Dham — for magazine subscription, membership, and delivery. Other websites using a similar name are not affiliated with Shri Paramhans Advait Mat Publication Society.',
      backHome: 'Back to subscription portal',
      footerLink: 'About Anand Sandesh'
    },

    admin: {
      loginTitle: 'Admin Login',
      loginSubtitle:
        'Sign in with the admin email and password to review submissions.',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      loginButton: 'Login',
      eyebrow: 'Admin Panel',
      pageTitle: 'Payment submissions',
      pageDescription:
        'Review pending submissions, inspect uploaded screenshots, and mark completed payments as verified.',
      filterAll: 'all',
      filterPending: 'pending',
      filterVerified: 'verified',
      refresh: 'Refresh',
      refreshing: 'Refreshing...',
      table: {
        name: 'Name',
        contact: 'Contact',
        address: 'Address',
        subscription: 'Subscription',
        transaction: 'Transaction',
        status: 'Status',
        screenshot: 'Screenshot',
        action: 'Action'
      },
      notSubmitted: 'Not submitted',
      genderLabel: 'Gender:',
      anandSandeshLabel: 'Anand Sandesh:',
      spiritualBlissEnglish: 'Spiritual Bliss: English',
      view: 'View',
      markVerified: 'Mark as Verified',
      done: 'Done',
      noSubmissions: 'No submissions found.',
      oneYear: 'One year',
      fiveYear: '5 year'
    }
  },

  hi: {
    common: {
      logout: 'लॉग आउट',
      backToProfile: 'प्रोफ़ाइल पर वापस जाएँ',
      changeEmail: 'ईमेल बदलें',
      resendOtp: 'ओटीपी पुनः भेजें',
      resendIn: '{seconds} सेकंड में पुनः भेजें',
      sending: 'भेजा जा रहा है...',
      yes: 'हाँ',
      no: 'नहीं',
      cancel: 'रद्द करें',
      submit: 'जमा करें',
      continue: 'जारी रखें',
      english: 'अंग्रेज़ी',
      hindi: 'हिन्दी',
      languageLabel: 'भाषा',
      switchToHindi: 'हिन्दी',
      switchToEnglish: 'English',
      loading: 'लोड हो रहा है…'
    },

    layout: {
      mantra: 'श्रीसद्गुरुदेवाय नमः',
      orgTitle: 'श्री परमहंस अद्वैत मत प्रकाशन सोसायटी',
      addressLine1: 'आनंद संदेश कार्यालय',
      addressLine2: 'श्री आनंदपुर धाम',
      addressLine3: 'पोस्ट ऑफिस श्री आनंदपुर धाम, 473331',
      logoAlt: 'श्री आनंदपुर धाम — श्री परमहंस अद्वैत मत'
    },

    loaders: {
      signingIn: 'आपको साइन इन किया जा रहा है…',
      loadingPage: 'पृष्ठ लोड हो रहा है...',
      loadingDetails: 'आपका विवरण लोड हो रहा है…',
      loadingSubmission: 'आपकी प्रविष्टि लोड हो रही है…',
      loadingSubmissions: 'प्रविष्टियाँ लोड हो रही हैं…',
      searchingRecords: 'रिकॉर्ड खोजे जा रहे हैं...',
      savingForm: 'आपका फ़ॉर्म सहेजा जा रहा है…',
      startingCheckout: 'सुरक्षित भुगतान शुरू हो रहा है...'
    },

    auth: {
      heroBadge: 'आनंद संदेश — सदस्यता पोर्टल',
      heroTitle: 'लॉगिन और साइन अप',
      heroAddress:
        'आनंद संदेश कार्यालय, श्री आनंदपुर धाम, पोस्ट ऑफिस श्री आनंदपुर,',
      heroPin: '473331',
      welcomeEyebrow: 'स्वागत है',
      cardTitleSignup: 'खाता बनाएँ',
      cardTitleLogin: 'पुनः स्वागत है',
      cardTitleReset: 'पासवर्ड रीसेट करें',
      tabSignup: 'साइन अप',
      tabLogin: 'लॉगिन',
      tabOtp: 'ईमेल ओटीपी',
      tabPassword: 'पासवर्ड',
      backToSignIn: '← साइन इन पर वापस जाएँ',
      labelFullName: 'पूरा नाम',
      placeholderFullName: 'अपना पूरा नाम दर्ज करें',
      labelEmail: 'ईमेल पता',
      placeholderEmail: 'name@example.com',
      labelPassword: 'पासवर्ड',
      placeholderPasswordSignup: 'कम से कम 6 अक्षर',
      placeholderPasswordLogin: 'अपना पासवर्ड दर्ज करें',
      labelConfirmPassword: 'पासवर्ड की पुष्टि करें',
      placeholderConfirmPassword: 'अपना पासवर्ड पुनः दर्ज करें',
      labelNewPassword: 'नया पासवर्ड',
      placeholderNewPassword: 'कम से कम 6 अक्षर',
      labelConfirmNewPassword: 'नए पासवर्ड की पुष्टि करें',
      placeholderConfirmNewPassword: 'नया पासवर्ड पुनः दर्ज करें',
      forgotPassword: 'पासवर्ड भूल गए?',
      signIn: 'साइन इन करें',
      signingIn: 'साइन इन हो रहा है...',
      sendingOtp: 'ओटीपी भेजा जा रहा है...',
      sendResetCode: 'रीसेट कोड भेजें',
      continueWithOtp: 'ईमेल ओटीपी से जारी रखें',
      verifying: 'सत्यापन हो रहा है...',
      verifyAndContinue: 'सत्यापित करें और जारी रखें',
      updating: 'अपडेट हो रहा है...',
      updatePassword: 'पासवर्ड अपडेट करें',
      otpSentTo: '{email} पर भेजा गया ओटीपी दर्ज करें',
      smtpDevHelper:
        'SMTP अभी कॉन्फ़िगर नहीं हुआ है, इसलिए डेवलपमेंट ओटीपी {otp} का उपयोग करें।',
      checkInbox:
        'अपना इनबॉक्स देखें और जारी रखने के लिए 6-अंकीय कोड दर्ज करें।',
      checkSpamHint:
        'ईमेल नहीं मिला? स्पैम या जंक फ़ोल्डर भी देखें — ओटीपी कभी-कभी वहाँ पहुँच जाता है।',
      chooseNewPassword: 'फिर नीचे एक नया पासवर्ड चुनें।',
      forgotHelp:
        'हम नया पासवर्ड सेट करने के लिए ईमेल पर एक बार का कोड भेजेंगे।',
      signupHelp:
        'एक बार का ओटीपी आपके ईमेल को सत्यापित करता है और आपका खाता सक्रिय करता है। बाद में आप इस पासवर्ड से साइन इन कर सकते हैं।',
      loginHelp: 'आपके ईमेल पर एक बार का 6-अंकीय कोड भेजा जाएगा।',
      otpDigitAria: 'ओटीपी अंक {n}',
      togglePasswordHide: 'पासवर्ड छिपाएँ',
      togglePasswordShow: 'पासवर्ड दिखाएँ',
      toggleConfirmHide: 'पुष्टि पासवर्ड छिपाएँ',
      toggleConfirmShow: 'पुष्टि पासवर्ड दिखाएँ',
      toggleNewHide: 'नया पासवर्ड छिपाएँ',
      toggleNewShow: 'नया पासवर्ड दिखाएँ',
      toggleConfirmNewHide: 'नए पासवर्ड की पुष्टि छिपाएँ',
      toggleConfirmNewShow: 'नए पासवर्ड की पुष्टि दिखाएँ',
      afterOtpHint:
        'ओटीपी सत्यापन के बाद आप अगली बार साइन इन के लिए इस पासवर्ड का उपयोग कर सकते हैं।',
      otpSentMessage: '{email} पर 6-अंकीय सत्यापन कोड भेजा गया है।',
      passwordResetSuccess:
        'पासवर्ड सफलतापूर्वक रीसेट हो गया। अपने नए पासवर्ड से साइन इन करें।',
      errors: {
        emailRequired: 'कृपया अपना ईमेल पता दर्ज करें।',
        emailInvalid: 'कृपया एक मान्य ईमेल पता दर्ज करें।',
        nameRequired: 'खाता बनाने के लिए कृपया अपना पूरा नाम दर्ज करें।',
        passwordTooShort: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।',
        passwordsMismatch: 'पासवर्ड मेल नहीं खाते।',
        passwordRequired: 'कृपया अपना पासवर्ड दर्ज करें।',
        otpIncomplete: 'कृपया पूरा 6-अंकीय ओटीपी दर्ज करें।',
        newPasswordTooShort: 'नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।',
        newPasswordsMismatch: 'नए पासवर्ड मेल नहीं खाते।'
      }
    },

    profile: {
      subtitle: 'फ़ाइल पर मौजूद आपकी संपर्क जानकारी',
      cardEyebrow: 'सदस्य पोर्टल',
      cardTitle: 'खाता अवलोकन',
      subscriptionActive: 'आपकी आनंद संदेश सदस्यता भुगतान सहित सक्रिय है।',
      validThrough: '{date} तक मान्य',
      periodRemainingToday: 'आज समाप्त हो रही है',
      periodRemainingOneDay: '1 दिन शेष',
      periodRemainingDays: '{count} दिन शेष',
      periodRemainingOneMonth: '1 महीना शेष',
      periodRemainingMonths: '{count} महीने शेष',
      periodExpired: 'सदस्यता अवधि समाप्त हो गई है',
      actionsHeading: 'आप क्या करना चाहेंगे?',
      bannerMaskedHelp:
        'फ़ोन और ईमेल आंशिक रूप से छिपे हुए हैं। आप अगली स्क्रीन पर पूरी जानकारी देख या अपडेट कर सकते हैं।',
      offlineToggle: 'पहले ऑफ़लाइन सदस्यता ली थी? अपना रिकॉर्ड खोजें',
      offlineHelp:
        'यदि आपने पहले अलग ईमेल का उपयोग किया था या इस वेबसाइट पर नए हैं, तो आपकी जानकारी अभी भी हमारे डेटाबेस में ऑफ़लाइन प्रक्रिया से मौजूद हो सकती है। पुराने फ़ॉर्म का मोबाइल नंबर या सदस्य संख्या से खोजें — हम सहेजा गया पता दिखाएँगे ताकि आप पुष्टि कर सकें, फिर इसे इस लॉगिन से जोड़ें।',
      offlineHelpStrongMobile: 'मोबाइल नंबर',
      offlineHelpStrongAddress: 'पता',
      lookupTooltip:
        'पेपर फ़ॉर्म का 10-अंकीय मोबाइल या सदस्य संख्या से खोजें। हम सहेजी गई जानकारी दिखाएँगे ताकि आप पुष्टि कर इसे इस लॉगिन से जोड़ सकें।',
      searchByMobile: 'मोबाइल नंबर',
      searchBySubscriber: 'सदस्य संख्या',
      labelSearchMobile: 'मोबाइल नंबर',
      labelSearchSubscriber: 'सदस्य संख्या',
      placeholderSearchMobile: '10-अंकीय नंबर',
      placeholderSearchSubscriber: 'उदा. 12345',
      searching: 'खोज रहे हैं…',
      searchDatabase: 'डेटाबेस में खोजें',
      recordFound: 'रिकॉर्ड मिला - पते से पुष्टि करें',
      pickRecord:
        'इस नंबर पर कई रिकॉर्ड हैं - वह चुनें जो आपसे मेल खाता है',
      nameOnFile: 'फ़ाइल पर नाम:',
      subscriberHint: 'सदस्य संख्या (संकेत):',
      emailOnFile: 'फ़ाइल पर ईमेल (छिपा हुआ):',
      addressOnFile: 'फ़ाइल पर पता',
      linking: 'जोड़ा जा रहा है…',
      linkRecord: 'यह मेरा रिकॉर्ड है — मेरे खाते से जोड़ें',
      nameLabel: 'नाम',
      subscriberNoLabel: 'सदस्य संख्या',
      mobileLabel: 'मोबाइल नंबर',
      emailLabel: 'ईमेल',
      addressLabel: 'पता',
      notOnFile: '— अभी फ़ाइल पर नहीं —',
      noSavedAddress: '— अभी कोई पता सहेजा नहीं गया —',
      mobileAria: 'मोबाइल नंबर (छिपा हुआ)',
      emailAria: 'ईमेल (छिपा हुआ)',
      addressAria: 'डाक पता',
      continueToForm: 'सदस्यता फ़ॉर्म पर जारी रखें',
      buyBooks: 'पुस्तकें खरीदें',
      tooltipAria: 'ऑफ़लाइन सदस्यता खोज के बारे में',
      pinEnding: 'पिन के अंतिम 4 अंक: {last4}',
      record: 'रिकॉर्ड',
      sub: 'सदस्य',
      errors: {
        mobileRequired:
          'अपनी ऑफ़लाइन सदस्यता के लिए उपयोग किया गया वही 10-अंकीय मोबाइल नंबर दर्ज करें।',
        subscriberRequired: 'पुराने फ़ॉर्म की सदस्य संख्या दर्ज करें।',
        notFound:
          'कोई ऑफ़लाइन रिकॉर्ड नहीं मिला। मोबाइल या सदस्य संख्या जाँचें, या सहायता से संपर्क करें।',
        searchFailed: 'खोज नहीं हो सकी। कृपया पुनः प्रयास करें।',
        claimFailed:
          'इस रिकॉर्ड को नहीं जोड़ा जा सका। कृपया पुनः प्रयास करें।'
      },
      claimSuccess:
        'आपका ऑफ़लाइन रिकॉर्ड अब इस खाते से जुड़ गया है। आप भुगतान करने या विवरण अपडेट करने के लिए फ़ॉर्म पर जारी रख सकते हैं।'
    },

    books: {
      subtitle: 'आध्यात्मिक पुस्तकें खरीदें',
      backToProfile: 'प्रोफ़ाइल पर वापस',
      selectBook: 'पुस्तक चुनें',
      selectBooks: 'पुस्तकें चुनें',
      chooseBook: 'पुस्तक चुनें…',
      priceLabel: 'मूल्य',
      quantity: 'मात्रा',
      cartSummary: 'आपका चयन',
      totalLabel: 'कुल',
      orderItems: 'इस ऑर्डर में पुस्तकें',
      saving: 'ऑर्डर सहेजा जा रहा है…',
      proceedToPayment: 'भुगतान पर जाएँ',
      noBooks: 'अभी कोई पुस्तक उपलब्ध नहीं है। बाद में पुनः देखें।',
      paymentSubtitle: 'पुस्तक भुगतान',
      paymentHeading: 'अपना पुस्तक ऑर्डर पूरा करें',
      paymentSummary: 'Razorpay के माध्यम से एक बार का सुरक्षित भुगतान। सर्वर सत्यापन के बाद ऑर्डर पुष्ट होगा।',
      bookLabel: 'पुस्तक:',
      orderRef: 'ऑर्डर आईडी:',
      payNow: 'अभी भुगतान करें',
      editOrder: 'ऑर्डर संपादित करें',
      oneTimePayment: 'पुस्तक खरीद',
      loadingCatalog: 'पुस्तक सूची लोड हो रही है…',
      errors: {
        loadFailed: 'पुस्तकें लोड नहीं हो सकीं। पुनः प्रयास करें।',
        bookRequired: 'कृपया कम से कम एक पुस्तक चुनें।',
        orderFailed: 'ऑर्डर नहीं बन सका। पुनः प्रयास करें।'
      }
    },

    form: {
      subtitle: 'आनंद संदेश के लिए मेरी प्रविष्टि का विवरण',
      verifiedTitle: 'आपकी सदस्यता पहले से फ़ाइल पर है।',
      verifiedPaidPrefix: 'आपकी',
      verifiedPaidSuffix: 'योजना भुगतान सहित सत्यापित है',
      verifiedPeriodPrefix: '(तक',
      verifiedPeriodSuffix: ').',
      verifiedRenews:
        '. नवीनीकरण आपके Razorpay सदस्यता शेड्यूल के अनुसार होगा।',
      verifiedSecondary:
        'आपको यह फ़ॉर्म पुनः जमा करने की आवश्यकता नहीं है। छिपी संपर्क जानकारी देखने के लिए अपनी प्रोफ़ाइल का उपयोग करें, या यदि कुछ गलत लगे तो सहायता से संपर्क करें।',
      pendingPaymentPrefix: 'भुगतान अभी भी लंबित है।',
      pendingPaymentBody:
        'इस फ़ॉर्म को सहेजने के बाद, "भुगतान पर जाएँ" का उपयोग करके Razorpay चेकआउट पूरा करें ताकि आपकी सदस्यता सत्यापित हो सके।',
      saveSuccess:
        'आपका विवरण सहेज लिया गया। आपकी सदस्यता सक्रिय बनी रहेगी।',
      labels: {
        name: 'नाम',
        subscriberNo: 'सदस्य संख्या',
        gender: 'लिंग',
        mobile: 'मोबाइल नंबर',
        email: 'ईमेल',
        dob: 'जन्म तिथि (वैकल्पिक)',
        rehbar: 'रहबर',
        address: 'पता',
        state: 'राज्य',
        town: 'गाँव / कस्बा / शहर',
        district: 'ज़िला',
        pin: 'पिन कोड',
        anandSandesh: 'आनंद संदेश',
        spiritualBliss: 'स्पिरिचुअल ब्लिस',
        subscription: 'सदस्यता'
      },
      placeholders: {
        selectGender: 'चुनें',
        male: 'पुरुष',
        female: 'महिला',
        day: 'दिन',
        month: 'माह',
        year: 'वर्ष',
        selectState: 'कृपया राज्य चुनें'
      },
      months: [
        'जनवरी',
        'फ़रवरी',
        'मार्च',
        'अप्रैल',
        'मई',
        'जून',
        'जुलाई',
        'अगस्त',
        'सितंबर',
        'अक्टूबर',
        'नवंबर',
        'दिसंबर'
      ],
      languageOptionLabel: 'भाषा विकल्प',
      optionalEnglishOnly: 'वैकल्पिक · केवल अंग्रेज़ी',
      oneYear: 'एक वर्ष',
      oneYearHint: 'हर वर्ष नवीनीकृत',
      fiveYear: '5 वर्ष',
      fiveYearHint: 'पाँच वर्षों के लिए एक भुगतान',
      proceedToPayment: 'भुगतान पर जाएँ',
      saving: 'सहेजा जा रहा है...',
      subscriberNoTitle: 'साइन इन पर निर्धारित — संपादन योग्य नहीं',
      emailHint: 'ईमेल अनिवार्य है।',
      emailTitle: 'ईमेल अनिवार्य है — आपको एक मान्य ईमेल पता दर्ज करना होगा।',
      errors: {
        nameRequired: 'नाम आवश्यक है',
        mobileRequired: 'मोबाइल नंबर आवश्यक है',
        mobileInvalid: 'एक मान्य 10 अंकीय मोबाइल नंबर दर्ज करें',
        emailRequired: 'ईमेल आवश्यक है',
        emailInvalid: 'एक मान्य ईमेल दर्ज करें',
        dobIncomplete: 'जन्म तिथि के लिए दिन, माह और वर्ष चुनें',
        required: 'यह फ़ील्ड आवश्यक है',
        addressRequired: 'पता आवश्यक है',
        stateRequired: 'कृपया राज्य चुनें',
        districtRequired: 'ज़िला आवश्यक है',
        pinRequired: 'पिन कोड आवश्यक है',
        pinInvalid: 'एक मान्य पिन कोड दर्ज करें',
        genderRequired: 'लिंग चुनें',
        rehbarRequired: 'रहबर आवश्यक है',
        anandSandeshRequired:
          'आनंद संदेश के लिए हिन्दी या अंग्रेज़ी चुनें',
        subscriptionRequired: 'एक वर्ष या पाँच वर्ष की सदस्यता चुनें',
        subscriberMissing:
          'सदस्य संख्या लोड नहीं हुई। थोड़ी देर रुकें या पुनः साइन इन करें।',
        fixHighlighted:
          'कृपया चिह्नित फ़ील्ड ठीक करें और पुनः प्रयास करें।',
        couldNotSave:
          'प्रविष्टि सहेजी नहीं जा सकी। कृपया पुनः प्रयास करें।'
      }
    },

    payment: {
      subtitle: 'भुगतान',
      heading: 'भुगतान पर जाएँ',
      summary:
        'Razorpay के साथ सुरक्षित भुगतान करें। आपकी सदस्यता तभी पुष्ट होगी जब हमारा सर्वर भुगतान हस्ताक्षर सत्यापित कर ले।',
      summaryRecurring:
        'Razorpay के साथ सुरक्षित भुगतान करें। रद्द करने तक हर वर्ष आपके कार्ड या UPI से स्वचालित रूप से शुल्क लिया जाएगा। नवीनीकरण Razorpay द्वारा किया जाता है और वेबहुक के माध्यम से हमारे सर्वर द्वारा पुष्ट किया जाता है।',
      recurringDescription: 'Anand Sandesh — {plan} (प्रतिवर्ष स्वतः नवीनीकरण)',
      planLabel: 'योजना:',
      referenceLabel: 'संदर्भ आईडी:',
      configHelpA:
        'आवर्ती भुगतानों के लिए Razorpay में एक सदस्यता योजना आवश्यक है। टेस्ट मोड में भी यही सुविधा उपलब्ध है: डैशबोर्ड को टेस्ट मोड में खोलें, फिर Subscriptions → Plans → + Create plan। योजना आईडी कॉपी करें (जैसे plan_…)।',
      configHelpB:
        'त्वरित स्थानीय परीक्षण के लिए, .env में VITE_RAZORPAY_PLAN_ID में एक आईडी जोड़ें (1-वर्ष और 5-वर्ष दोनों इसी का उपयोग करेंगे जब तक आप अलग VITE_RAZORPAY_PLAN_ID_YEARLY / FIVE_YEAR सेट न करें)। env संपादित करने के बाद डेव सर्वर पुनः प्रारंभ करें।',
      payWithRazorpay: 'Razorpay से भुगतान करें',
      startingCheckout: 'चेकआउट शुरू हो रहा है…',
      editDetails: 'विवरण संपादित करें',
      alreadyPaidHeading: 'सदस्यता पहले से सक्रिय',
      alreadyPaidSummary: 'आपका भुगतान पहले ही सत्यापित है। आगे कोई कार्रवाई आवश्यक नहीं है।',
      viewConfirmation: 'पुष्टि देखें',
      oneYear: 'एक वर्ष',
      fiveYear: '5 वर्ष',
      errors: {
        notSignedIn: 'भुगतान करने के लिए आपको साइन इन करना होगा।',
        checkoutFailed:
          'भुगतान चेकआउट लोड नहीं हुआ। पृष्ठ रिफ़्रेश करके पुनः प्रयास करें।',
        notConfigured:
          'इस योजना के लिए Razorpay पूरी तरह कॉन्फ़िगर नहीं है। सहायता से संपर्क करें।',
        couldNotStart:
          'सदस्यता शुरू नहीं हो सकी। कृपया पुनः प्रयास करें।',
        paymentFailed: 'भुगतान विफल हुआ।',
        paymentCancelled: 'भुगतान रद्द किया गया।',
        couldNotStartShort: 'भुगतान शुरू नहीं हो सका।',
        mobileRequiredForUpi:
          'UPI Autopay के लिए मान्य 10 अंकीय मोबाइल नंबर आवश्यक है। फॉर्म में मोबाइल जोड़कर पुनः प्रयास करें।',
        emailRequiredForCheckout:
          'भुगतान के लिए ईमेल आवश्यक है। साइन इन करें या फॉर्म में ईमेल जोड़ें, फिर पुनः प्रयास करें।',
        alreadyPaid: 'यह सदस्यता पहले ही भुगतान की जा चुकी है।',
        verificationPending:
          'भुगतान प्राप्त हो गया है, लेकिन सत्यापन अभी लंबित है।'
      }
    },

    success: {
      paymentSuccessful: 'भुगतान सफल',
      paymentReceived: 'भुगतान प्राप्त हुआ',
      submissionReceived: 'प्रविष्टि प्राप्त हुई',
      paymentSuccessfulDesc:
        'आपका सदस्यता भुगतान सत्यापित हो गया है। आपका खाता वेबहुक के माध्यम से Razorpay के साथ समकालिक रहेगा।',
      paymentReceivedDesc:
        'आपका भुगतान Razorpay पर पूरा हो गया है। हम इसे सर्वर से पुष्ट कर रहे हैं और आपकी सदस्यता शीघ्र ही दिखाई देगी।',
      submissionReceivedDesc:
        'आपका विवरण लंबित स्थिति के साथ सहेज लिया गया है। एक प्रशासक आपकी प्रविष्टि और अपलोड किए गए दस्तावेज़ की समीक्षा कर सकता है।',
      submitAnother: 'एक और जमा करें'
    },

    seo: {
      officialBadge: 'आधिकारिक सदस्यता पोर्टल',
      homeH1: 'आनंद संदेश कार्यालय — आनंद संदेश पत्रिका सदस्यता',
      homeLead:
        'हिन्दी और अंग्रेज़ी में आनंद संदेश (Anand Sandesh) मासिक आध्यात्मिक पत्रिका की सदस्यता लें। श्री परमहंस अद्वैत मत प्रकाशन सोसायटी, श्री आनंदपुर धाम, मध्य प्रदेश से प्रकाशित।',
      homePublisher:
        'पता: आनंद संदेश कार्यालय, श्री आनंदपुर धाम, पोस्ट ऑफिस श्री आनंदपुर — 473331, भारत।',
      officialDomain: 'आधिकारिक वेबसाइट: anandsandeshkaryalay.online'
    },

    about: {
      eyebrow: 'श्री आनंदपुर धाम',
      pageTitle: 'आनंद संदेश के बारे में',
      pageSubtitle: 'मासिक आध्यात्मिक पत्रिका — हिन्दी और अंग्रेज़ी',
      intro:
        'आनंद संदेश (Anand Sandesh, anandsandesh) श्री परमहंस अद्वैत मत की प्रिय मासिक पत्रिका है। पूरे भारत और विदेश में पाठक आध्यात्म, सत्संग और भारतीय दर्शन पर आधारित लेख पढ़ते हैं।',
      publisherHeading: 'प्रकाशक',
      publisherBody:
        'आनंद संदेश और संबंधित प्रकाशन श्री परमहंस अद्वैत मत प्रकाशन सोसायटी, श्री आनंदपुर धाम से प्रकाशित होते हैं — साधकों को प्रामाणिक आध्यात्मिक साहित्य से जोड़ने के लिए।',
      magazineHeading: 'आनंद संदेश मासिक पत्रिका',
      magazineBody:
        'आनंद संदेश प्रत्येक माह मुद्रित पत्रिका के रूप में प्रकाशित होती है। प्रत्येक अंक में सत्संग, भक्ति और आंतरिक शांति के मार्ग पर लेख, धारावाहिक अध्याय और भक्तिमय लेखन होते हैं।',
      magazinePoint1: 'हिन्दी और अंग्रेज़ी संस्करण में उपलब्ध।',
      magazinePoint2:
        'विषयों में आध्यात्म, भारतीय दर्शन, भक्ति, सत्संग और दैनिक जीवन के लिए मार्गदर्शन शामिल हैं।',
      magazinePoint3:
        'श्री आनंदपुर धाम स्थित आनंद संदेश कार्यालय से भारत और विश्व भर के सदस्यों तक वितरण।',
      booksHeading: 'अन्य आध्यात्मिक पुस्तकें और प्रकाशन',
      booksBody:
        'मासिक आनंद संदेश पत्रिका के अतिरिक्त, प्रकाशन सोसायटी आध्यात्म, सत्संग और श्री परमहंस अद्वैत मत की शिक्षाओं से संबंधित अन्य पुस्तकें और साहित्य भी प्रदान करती है, जिनमें शामिल हैं:',
      books: {
        item1: 'आध्यात्मिक प्रवचन और सत्संग साहित्य।',
        item2: 'भक्ति, ध्यान और भारतीय दर्शन पर पुस्तकें।',
        item3: 'साधकों और परिवारों के लिए हिन्दी और अंग्रेज़ी प्रकाशन।',
        item4: 'विशेष संस्करण और संबंधित आध्यात्मिक शीर्षक।'
      },
      subscribeHeading: 'ऑनलाइन सदस्यता',
      subscribeBody:
        'इस आधिकारिक पोर्टल के माध्यम से आनंद संदेश की सदस्यता लें — खाता बनाएँ, विवरण भरें, और वार्षिक या बहु-वर्षीय सदस्यता के लिए सुरक्षित ऑनलाइन भुगतान करें।',
      subscribeCta: 'आनंद संदेश की ऑनलाइन सदस्यता लें',
      contactHeading: 'संपर्क और पता',
      addressName: 'आनंद संदेश कार्यालय',
      addressLine1: 'श्री आनंदपुर धाम',
      addressLine2: 'पोस्ट ऑफिस श्री आनंदपुर',
      addressPin: '473331',
      addressRegion: 'मध्य प्रदेश, भारत',
      contactNote:
        'सदस्यता संबंधी पूछताछ के लिए उपरोक्त पते पर आनंद संदेश कार्यालय पर आएँ या इस वेबसाइट पर पंजीकरण और सदस्यता प्रबंधन करें।',
      officialSiteHeading: 'केवल आधिकारिक वेबसाइट',
      officialSiteBody:
        'anandsandeshkaryalay.online आनंद संदेश कार्यालय, श्री आनंदपुर धाम की आधिकारिक ऑनलाइन साइट है — पत्रिका सदस्यता, सदस्यता प्रबंधन और डिलीवरी के लिए। समान नाम वाली अन्य वेबसाइटें श्री परमहंस अद्वैत मत प्रकाशन सोसायटी से संबद्ध नहीं हैं।',
      backHome: 'सदस्यता पोर्टल पर वापस जाएँ',
      footerLink: 'आनंद संदेश के बारे में'
    },

    admin: {
      loginTitle: 'व्यवस्थापक लॉगिन',
      loginSubtitle:
        'प्रविष्टियों की समीक्षा के लिए व्यवस्थापक ईमेल और पासवर्ड से साइन इन करें।',
      emailLabel: 'ईमेल',
      passwordLabel: 'पासवर्ड',
      loginButton: 'लॉगिन',
      eyebrow: 'व्यवस्थापक पैनल',
      pageTitle: 'भुगतान प्रविष्टियाँ',
      pageDescription:
        'लंबित प्रविष्टियों की समीक्षा करें, अपलोड किए गए स्क्रीनशॉट देखें, और पूर्ण भुगतानों को सत्यापित के रूप में चिह्नित करें।',
      filterAll: 'सभी',
      filterPending: 'लंबित',
      filterVerified: 'सत्यापित',
      refresh: 'रिफ़्रेश',
      refreshing: 'रिफ़्रेश हो रहा है...',
      table: {
        name: 'नाम',
        contact: 'संपर्क',
        address: 'पता',
        subscription: 'सदस्यता',
        transaction: 'लेन-देन',
        status: 'स्थिति',
        screenshot: 'स्क्रीनशॉट',
        action: 'क्रिया'
      },
      notSubmitted: 'जमा नहीं किया गया',
      genderLabel: 'लिंग:',
      anandSandeshLabel: 'आनंद संदेश:',
      spiritualBlissEnglish: 'स्पिरिचुअल ब्लिस: अंग्रेज़ी',
      view: 'देखें',
      markVerified: 'सत्यापित के रूप में चिह्नित करें',
      done: 'पूर्ण',
      noSubmissions: 'कोई प्रविष्टि नहीं मिली।',
      oneYear: 'एक वर्ष',
      fiveYear: '5 वर्ष'
    }
  }
};
