    let authMode = 'login';

    // وضع الليل والنهار
    function applyTheme(mode) {
      document.body.classList.toggle('light-mode', mode === 'light');
      const icon = mode === 'light' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="4"/><path d="M12 2v2.4M12 19.6V22M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2 12h2.4M19.6 12H22M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/></svg>' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>';
      const btnA = document.getElementById('theme-toggle-auth');
      const btnM = document.getElementById('theme-toggle-main');
      if (btnA) btnA.innerHTML = icon;
      if (btnM) btnM.innerHTML = icon;
    }

    function toggleTheme() {
      const isLight = document.body.classList.contains('light-mode');
      const newMode = isLight ? 'dark' : 'light';
      localStorage.setItem('deeplite_theme', newMode);
      applyTheme(newMode);
    }

    applyTheme(localStorage.getItem('deeplite_theme') === 'light' ? 'light' : 'dark');

    // بانير الاتصال بالإنترنت
    function updateOfflineBanner() {
      const banner = document.getElementById('offline-banner');
      const txt = document.getElementById('offline-banner-txt');
      if (!banner) return;
      if (navigator.onLine) {
        banner.classList.remove('show');
        document.body.classList.remove('has-offline-banner');
      } else {
        if (txt) txt.innerHTML = currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 20h.01M8.7 16.7a4.8 4.8 0 0 1 6.6 0M5.3 13.3a9.6 9.6 0 0 1 13.4 0M2 10a14.3 14.3 0 0 1 20 0"/></svg> لا يوجد اتصال بالإنترنت — البيانات المعروضة محفوظة محليا' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 20h.01M8.7 16.7a4.8 4.8 0 0 1 6.6 0M5.3 13.3a9.6 9.6 0 0 1 13.4 0M2 10a14.3 14.3 0 0 1 20 0"/></svg> Pas de connexion Internet — données affichées en mode hors ligne';
        banner.classList.add('show');
        document.body.classList.add('has-offline-banner');
      }
    }
    window.addEventListener('online', updateOfflineBanner);
    window.addEventListener('offline', updateOfflineBanner);
    updateOfflineBanner();

    // تحقق الحقول (إطار أحمر على الحقل الغالط)
    function setFieldError(id, isError) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('input-error', isError);
    }

    function clearFieldErrorOnInput(id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => setFieldError(id, false));
    }
    ['auth-email', 'auth-password', 'auth-code-input'].forEach(clearFieldErrorOnInput);

    function switchToRegister() {
      authMode = 'register';
      document.getElementById('register-extra-fields').style.display = 'block';
      document.getElementById('login-buttons-box').style.display = 'none';
      document.getElementById('register-buttons-box').style.display = 'block';
      updateAuthTitle();
    }

    function switchToLogin() {
      authMode = 'login';
      document.getElementById('register-extra-fields').style.display = 'none';
      document.getElementById('login-buttons-box').style.display = 'block';
      document.getElementById('register-buttons-box').style.display = 'none';
      updateAuthTitle();
    }

    function updateAuthTitle() {
      document.getElementById('auth-main-title').innerHTML = authMode === 'register'
        ? (currentLang === 'ar' ? 'إنشاء <span>حساب جديد</span>' : 'Créer <span>un compte</span>')
        : (currentLang === 'ar' ? 'تسجيل <span>الدخول</span>' : 'Connexion <span></span>');
    }

    function showAuthErrorModal(msgAr, msgFr, showForgot, showRegister) {
      const fullMsg = currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`;
      document.getElementById('auth-error-text').innerText = fullMsg;

      const forgotBtn = document.getElementById('auth-error-forgot-btn');
      const registerBtn = document.getElementById('auth-error-register-btn');
      forgotBtn.style.display = showForgot ? 'block' : 'none';
      registerBtn.style.display = showRegister ? 'block' : 'none';
      forgotBtn.innerText = currentLang === 'ar' ? 'نسيت كلمة السر؟' : 'Mot de passe oublié ?';
      registerBtn.innerText = currentLang === 'ar' ? 'إنشاء حساب جديد' : 'Créer un compte';

      document.getElementById('auth-error-modal').classList.add('show');
    }

    function closeAuthErrorModal() {
      document.getElementById('auth-error-modal').classList.remove('show');
    }

    // ==================== Account Switcher ====================
    function getSavedAccounts() {
      try {
        return JSON.parse(localStorage.getItem('deeplite_accounts') || '[]');
      } catch (e) {
        return [];
      }
    }

    function setSavedAccounts(list) {
      localStorage.setItem('deeplite_accounts', JSON.stringify(list));
    }

    function upsertSavedAccount(email, password) {
      let list = getSavedAccounts();
      const idx = list.findIndex(acc => acc.email === email);
      if (idx >= 0) {
        list[idx].password = password;
      } else {
        list.push({ email, password });
      }
      setSavedAccounts(list);
    }

    function renderAccountSwitcher() {
      const bar = document.getElementById('account-switcher');
      if (!bar) return;
      const list = getSavedAccounts();
      const currentEmail = auth.currentUser ? auth.currentUser.email : null;
      bar.innerHTML = '';

      list.forEach(acc => {
        const chip = document.createElement('div');
        const isActive = acc.email === currentEmail;
        chip.className = 'account-chip' + (isActive ? ' active' : '');
        const shortName = acc.email.split('@')[0];

        if (isActive) {
          chip.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.2c1-3.6 4-5.7 7.5-5.7s6.5 2.1 7.5 5.7"/></svg> ${shortName}`;
        } else {
          chip.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.2c1-3.6 4-5.7 7.5-5.7s6.5 2.1 7.5 5.7"/></svg> ${shortName} <span class="account-chip-remove" onclick="event.stopPropagation(); removeSavedAccount('${acc.email}')">✕</span>`;
          chip.onclick = () => switchToAccount(acc.email);
        }
        bar.appendChild(chip);
      });

      const addChip = document.createElement('div');
      addChip.className = 'account-chip account-chip-add';
      addChip.innerText = '+';
      addChip.onclick = openAddAccountModal;
      bar.appendChild(addChip);
    }

    function removeSavedAccount(email) {
      let list = getSavedAccounts().filter(acc => acc.email !== email);
      setSavedAccounts(list);
      renderAccountSwitcher();
    }

    function openAddAccountModal() {
      document.getElementById('add-account-email').value = '';
      document.getElementById('add-account-password').value = '';
      document.getElementById('add-account-modal').classList.add('show');
    }

    function closeAddAccountModal() {
      document.getElementById('add-account-modal').classList.remove('show');
    }

    async function submitAddAccount() {
      const email = document.getElementById('add-account-email').value.trim();
      const password = document.getElementById('add-account-password').value.trim();

      if (!email || !password) {
        alert(currentLang === 'ar' ? "المرجو ملء البريد الإلكتروني وكلمة السر!\nVeuillez remplir l'email et le mot de passe !" : "Veuillez remplir l'email et le mot de passe !\nالمرجو ملء البريد الإلكتروني وكلمة السر!");
        return;
      }

      try {
        await auth.signInWithEmailAndPassword(email, password);
        upsertSavedAccount(email, password);
        closeAddAccountModal();
      } catch (err) {
        let msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> البريد الإلكتروني أو كلمة السر غير صحيحة!";
        let msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> E-mail ou mot de passe incorrect !";
        alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
      }
    }

    async function switchToAccount(email) {
      const list = getSavedAccounts();
      const acc = list.find(a => a.email === email);
      if (!acc) return;

      // نحتافظو بمعلومات الحساب الحالي باش نرجعو ليه إلا فشل التبديل
      const previousEmail = auth.currentUser ? auth.currentUser.email : null;
      const previousAcc = previousEmail ? list.find(a => a.email === previousEmail) : null;
      const wait = (ms) => new Promise(r => setTimeout(r, ms));

      try {
        await auth.signOut();
        await wait(250);
        await auth.signInWithEmailAndPassword(acc.email, acc.password);
      } catch (err) {
        console.error('switchToAccount failed:', err && err.code, err && err.message);

        // نحاولو نرجعو للحساب اللي كنا فيه قبل باش الماستخدم ما يبقاش خارج من التطبيق
        let restored = false;
        if (previousAcc) {
          try {
            await wait(250);
            await auth.signInWithEmailAndPassword(previousAcc.email, previousAcc.password);
            restored = true;
          } catch (e2) {
            console.error('restore previous session failed:', e2 && e2.code, e2 && e2.message);
          }
        }

        let msgAr, msgFr;
        switch (err.code) {
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
          case 'auth/invalid-login-credentials':
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> تم تغيير كلمة سر هذا الحساب.";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> Le mot de passe de ce compte a changé.";
            break;
          case 'auth/user-disabled':
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><line x1='6' y1='6' x2='18' y2='18'/></svg> هذا الحساب تم تعطيله من طرف الإدارة!";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><line x1='6' y1='6' x2='18' y2='18'/></svg> Ce compte a été désactivé par l'administrateur !";
            break;
          case 'auth/too-many-requests':
            msgAr = "⏳ محاولات كثيرة جداً، حاول مرة أخرى بعد دقائق.";
            msgFr = "⏳ Trop de tentatives, réessayez dans quelques minutes.";
            break;
          case 'auth/network-request-failed':
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><line x1='4' y1='18' x2='4' y2='14'/><line x1='9' y1='18' x2='9' y2='11'/><line x1='14' y1='18' x2='14' y2='8'/><line x1='19' y1='18' x2='19' y2='5'/></svg> لا يوجد اتصال بالإنترنت! تأكد من الاتصال وحاول مرة أخرى.";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><line x1='4' y1='18' x2='4' y2='14'/><line x1='9' y1='18' x2='9' y2='11'/><line x1='14' y1='18' x2='14' y2='8'/><line x1='19' y1='18' x2='19' y2='5'/></svg> Pas de connexion Internet ! Vérifiez votre connexion et réessayez.";
            break;
          default:
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> تعذر تبديل الحساب. يرجى إدخال كلمة السر الحالية.";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> Impossible de changer de compte. Veuillez saisir le mot de passe actuel.";
        }
        if (!restored) {
          msgAr += "\n(تم أيضاً تسجيل خروج الحساب السابق، يجب تسجيل الدخول من جديد)";
          msgFr += "\n(La session précédente a aussi été fermée, veuillez vous reconnecter)";
        }
        alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);

        // نفتحو مباشرة نافذة إضافة الحساب معمرة بالإيميل، باش غير يكتب كلمة السر الجديدة
        if (restored) {
          document.getElementById('add-account-email').value = acc.email;
          document.getElementById('add-account-password').value = '';
          document.getElementById('add-account-modal').classList.add('show');
        } else {
          document.getElementById('auth-email').value = acc.email;
        }
      }
    }

    function isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }

    async function handleLogin() {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value.trim();

      setFieldError('auth-email', false);
      setFieldError('auth-password', false);
      
      if (!email || !password) { 
        if (!email) setFieldError('auth-email', true);
        if (!password) setFieldError('auth-password', true);
        alert(currentLang === 'ar' ? "المرجو ملء البريد الإلكتروني وكلمة السر!\nVeuillez remplir l'email et le mot de passe !" : "Veuillez remplir l'email et le mot de passe !\nالمرجو ملء البريد الإلكتروني وكلمة السر!"); 
        return; 
      }
      
      if (!isValidEmail(email)) {
        setFieldError('auth-email', true);
        let msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> البريد الإلكتروني مكتوب بطريقة خاطئة!\nالرجاء التأكد من كتابة البريد بشكل صحيح (مثال: example@gmail.com).";
        let msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> Format d'e-mail incorrect !\nVeuillez vérifier la saisie de votre e-mail.";
        alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
        return;
      }

      try {
        await auth.signInWithEmailAndPassword(email, password);
        upsertSavedAccount(email, password);
      } catch (err) {
        let errCode = err.code;
        let msgAr = "", msgFr = "";

        switch (errCode) {
          // الإيميل ماشي مسجل فـ Firebase (كود قديم)
          case 'auth/user-not-found':
            setFieldError('auth-email', true);
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> هذا البريد الإلكتروني غير مسجل في النظام!";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> Cet e-mail n'est pas enregistré !";
            showAuthErrorModal(msgAr, msgFr, false, true);
            return;

          // كود جديد كيجمع بين "ماشي مسجل" و"كلمة السر غالطة" فـ نفس الوقت (Google ماعادش كيفرق بينهم لأسباب أمنية)
          case 'auth/invalid-credential':
          case 'auth/invalid-login-credentials':
            setFieldError('auth-email', true);
            setFieldError('auth-password', true);
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> البريد الإلكتروني غير مسجل أو كلمة السر غير صحيحة!";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> E-mail non enregistré ou mot de passe incorrect !";
            showAuthErrorModal(msgAr, msgFr, true, true);
            return;

          case 'auth/wrong-password':
            setFieldError('auth-password', true);
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> كلمة السر غير صحيحة!";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> Mot de passe incorrect !";
            showAuthErrorModal(msgAr, msgFr, true, false);
            return;

          case 'auth/invalid-email':
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> صيغة البريد الإلكتروني غير صحيحة!";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> Format d'e-mail invalide !";
            alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
            return;

          case 'auth/user-disabled':
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><line x1='6' y1='6' x2='18' y2='18'/></svg> هذا الحساب تم تعطيله من طرف الإدارة!";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><line x1='6' y1='6' x2='18' y2='18'/></svg> Ce compte a été désactivé par l'administrateur !";
            alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
            return;

          case 'auth/too-many-requests':
            msgAr = "⏳ محاولات كثيرة جداً وخاطئة!\nتم حظر الدخول مؤقتاً، حاول مرة أخرى بعد دقائق.";
            msgFr = "⏳ Trop de tentatives incorrectes !\nAccès temporairement bloqué, réessayez dans quelques minutes.";
            alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
            return;

          case 'auth/network-request-failed':
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><line x1='4' y1='18' x2='4' y2='14'/><line x1='9' y1='18' x2='9' y2='11'/><line x1='14' y1='18' x2='14' y2='8'/><line x1='19' y1='18' x2='19' y2='5'/></svg> لا يوجد اتصال بالإنترنت!\nتأكد من الاتصال وحاول مرة أخرى.";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><line x1='4' y1='18' x2='4' y2='14'/><line x1='9' y1='18' x2='9' y2='11'/><line x1='14' y1='18' x2='14' y2='8'/><line x1='19' y1='18' x2='19' y2='5'/></svg> Pas de connexion Internet !\nVérifiez votre connexion et réessayez.";
            alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
            return;

          default:
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> وقع خطأ غير متوقع، حاول مرة أخرى.\nرمز الخطأ: " + errCode;
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> Une erreur inattendue s'est produite, réessayez.\nCode erreur : " + errCode;
            alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
            return;
        }
      }
    }

    function sendVerificationEmail() {
      const email = document.getElementById('auth-email').value.trim();
      if (!email || !isValidEmail(email)) {
        alert(currentLang === 'ar' ? "المرجو إدخال بريد إلكتروني صحيح أولاً!\nVeuillez d'abord entrer un e-mail valide !" : "Veuillez d'abord entrer un e-mail valide !\nالمرجو إدخال بريد إلكتروني صحيح أولاً!");
        return;
      }

      generatedVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      const templateParams = {
        user_email: email,
        pass_code: generatedVerificationCode
      };

      emailjs.send(serviceID, templateID, templateParams, publicKey)
        .then(() => {
          alert(currentLang === 'ar' ? "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح، يرجى التحقق من بريدك (راجع خانة Spam).\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> Code envoyé avec succès, vérifiez votre boîte (Spam inclus)." : "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> Code envoyé avec succès, vérifiez votre boîte (Spam inclus).\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.");
        })
        .catch(() => {
          alert(currentLang === 'ar' ? "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> Code de vérification envoyé avec succès." : "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> Code de vérification envoyé avec succès.\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.");
        });
    }

    function handleRegister() {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value.trim();
      const userEnteredCode = document.getElementById('auth-code-input').value.trim();

      setFieldError('auth-email', false);
      setFieldError('auth-password', false);
      setFieldError('auth-code-input', false);

      if (!email || !password) { 
        if (!email) setFieldError('auth-email', true);
        if (!password) setFieldError('auth-password', true);
        alert(currentLang === 'ar' ? "المرجو ملء البريد الإلكتروني وكلمة السر!\nVeuillez remplir l'email et le mot de passe !" : "Veuillez remplir l'email et le mot de passe !\nالمرجو ملء البريد الإلكتروني وكلمة السر!"); 
        return; 
      }

      if (!isValidEmail(email)) {
        setFieldError('auth-email', true);
        alert(currentLang === 'ar' ? "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> البريد الإلكتروني مكتوب بطريقة خاطئة!" : "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> Format d'e-mail incorrect !");
        return;
      }

      if (password.length < 6) {
        setFieldError('auth-password', true);
        let msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> كلمة السر ضعيفة جداً!\nيجب أن تحتوي على 6 أحرف/أرقام على الأقل.";
        let msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> Mot de passe trop faible !\nIl doit contenir au moins 6 caractères.";
        alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
        return;
      }

      if (!generatedVerificationCode) {
        alert(currentLang === 'ar' ? "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> يجب عليك أولاً الضغط على زر (إرسال رمز التحقق لـ Gmail)!\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> Veuillez d'abord envoyer le code de vérification !" : "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> Veuillez d'abord envoyer le code de vérification !\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> يجب عليك أولاً الضغط على زر (إرسال رمز التحقق لـ Gmail)!");
        return;
      }

      if (userEnteredCode.length < 6 || !/^\d+$/.test(userEnteredCode)) {
        setFieldError('auth-code-input', true);
        let msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> يجب إدخال 6 أرقام على الأقل في خانة رمز التحقق!";
        let msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> Le code de vérification doit contenir au moins 6 chiffres !";
        alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
        return;
      }

      if (userEnteredCode !== generatedVerificationCode) {
        setFieldError('auth-code-input', true);
        let msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> رمز التحقق غير صحيح!\nيرجى التأكد من الرمز المرسل إلى بريدك الإلكتروني.";
        let msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> Code de vérification incorrect !\nVeuillez vérifier le code envoyé à votre e-mail.";
        alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
        return;
      }

      auth.createUserWithEmailAndPassword(email, password).then((uc) => {
        upsertSavedAccount(email, password);
        alert(currentLang === 'ar' ? "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> تم إنشاء الحساب بنجاح!\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> Compte créé avec succès !" : "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> Compte créé avec succès !\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> تم إنشاء الحساب بنجاح!");
      }).catch(err => {
        let errCode = err.code;
        let msgAr = "", msgFr = "";

        switch (errCode) {
          case 'auth/email-already-in-use':
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> هذا البريد مسجل مسبقاً! يرجى تسجيل الدخول أو استخدام (نسيت كلمة السر).";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> Cet e-mail est déjà utilisé ! Veuillez vous connecter ou utiliser (Mot de passe oublié).";
            alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
            switchToLogin();
            return;

          case 'auth/weak-password':
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> كلمة السر ضعيفة جداً!\nيجب أن تحتوي على 6 أحرف/أرقام على الأقل.";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> Mot de passe trop faible !\nIl doit contenir au moins 6 caractères.";
            alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
            return;

          case 'auth/invalid-email':
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> صيغة البريد الإلكتروني غير صحيحة!";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> Format d'e-mail invalide !";
            alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
            return;

          case 'auth/network-request-failed':
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><line x1='4' y1='18' x2='4' y2='14'/><line x1='9' y1='18' x2='9' y2='11'/><line x1='14' y1='18' x2='14' y2='8'/><line x1='19' y1='18' x2='19' y2='5'/></svg> لا يوجد اتصال بالإنترنت!\nتأكد من الاتصال وحاول مرة أخرى.";
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><line x1='4' y1='18' x2='4' y2='14'/><line x1='9' y1='18' x2='9' y2='11'/><line x1='14' y1='18' x2='14' y2='8'/><line x1='19' y1='18' x2='19' y2='5'/></svg> Pas de connexion Internet !\nVérifiez votre connexion et réessayez.";
            alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
            return;

          case 'auth/too-many-requests':
            msgAr = "⏳ محاولات كثيرة جداً!\nحاول مرة أخرى بعد دقائق.";
            msgFr = "⏳ Trop de tentatives !\nRéessayez dans quelques minutes.";
            alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
            return;

          default:
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> وقع خطأ غير متوقع، حاول مرة أخرى.\nرمز الخطأ: " + errCode;
            msgFr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> Une erreur inattendue s'est produite, réessayez.\nCode erreur : " + errCode;
            alert(currentLang === 'ar' ? `${msgAr}\n\n--------------------\n${msgFr}` : `${msgFr}\n\n--------------------\n${msgAr}`);
            return;
        }
      });
    }

    function handleForgotPassword() {
      const email = document.getElementById('auth-email').value.trim();
      if (!email || !isValidEmail(email)) {
        alert(currentLang === 'ar' ? "المرجو إدخال بريد إلكتروني صحيح أولاً!\nVeuillez d'abord entrer un e-mail valide !" : "Veuillez d'abord entrer un e-mail valide !\nالمرجو إدخال بريد إلكتروني صحيح أولاً!");
        return;
      }
      auth.sendPasswordResetEmail(email)
        .then(() => alert(currentLang === 'ar' ? "تم إرسال رابط تغيير كلمة السر إلى بريدك!\nLien de réinitialisation envoyé !" : "Lien de réinitialisation envoyé !\nتم إرسال رابط تغيير كلمة السر إلى بريدك!"))
        .catch(err => alert("Erreur: " + err.message));
    }

    function logout() { auth.signOut().then(() => window.location.reload()); }

    const translations = {
      ar: {
        langBtn: "FR 🇫🇷", dir: "rtl",
        authDesc: "تسيير شركة تركيب وصيانة", emailPh: "البريد الإلكتروني (Gmail)", passPh: "كلمة السر", codePh: "أدخل رمز التحقق المكون من 6 أرقام", sendCodeBtn: "📤 إرسال رمز التحقق لـ Gmail",
        btnLogin: "دخول", btnReg: "إتمام إنشاء الحساب", forgotPass: "نسيت كلمة السر؟",
        swtReg: "إنشاء حساب جديد", swtLog: "تسجيل الدخول", swtPrefixReg: "ليس لديك حساب؟", swtPrefixLog: "لديك حساب بالفعل؟",
        logoutBtn: "خروج", box1Title: "معلومات حسابك الإجمالية:", closeBox1: "✕ إغلاق",
        box2Title: "التنبيهات والوقت المتبقي:", closeBox2: "✕ إغلاق",
        mChkT: "الشيكات", mChkD: "متابعة واستحقاق الشيكات",
        mStkT: "المخزن", mStkD: "قطع الغيار والسلع",
        mSrvT: "الخدمات والزبائن", mSrvD: "تركيب، تنظيف، إصلاح",
        mNtsT: "الملاحظات", mNtsD: "كناش الملاحظات والمهام",
        mChtT: "دردشة", mChtD: "جماعية أو خاصة بين الأعضاء",
        mEmpT: "العمال", mEmpD: "إضافة، دردشة خاصة، حظر", empTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='8' r='3.6'/><path d='M4.5 20.2c1-3.6 4-5.7 7.5-5.7s6.5 2.1 7.5 5.7'/><path d='M6.5 8.5c1.5-1 3.6-1.6 5.5-1.6s4 .6 5.5 1.6' stroke-width='1.4'/></svg> العمال", empSubT: "يظهر هنا تلقائياً كل عامل لديه حساب في هذا التطبيق. يمكنك مراسلته بشكل خاص، أو إضافته إلى الدردشة الجماعية، أو حظره.", companyEmpTitleT: "عمال الشركة (الذين انضموا بكود الدعوة)", companyEmpSubT: "هنا ترى كل عامل انضم إلى الشركة بكود الدعوة، ويمكنك منحه صلاحية الإضافة أو التعديل في: الشيكات، المخزون، التركيب/الخدمات، أو الملاحظات.",
        mPchtT: "دردشة خاصة", mPchtD: "محادثات فردية بين الأعضاء",
        chatChoiceTitle: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M4 5h16v10.5H10.5L6 19v-3.5H4z'/></svg> اختر نوع الدردشة", chatChoiceGroup: "دردشة جماعية", chatChoicePrivate: "دردشة خاصة", chatChoiceCode: "إضافة عامل", closeGeneric: "✕ إغلاق", memberInfoCall: "اتصال",
        exchtListT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><line x1='12' y1='8' x2='12' y2='16'/><line x1='8' y1='12' x2='16' y2='12'/></svg> إضافة عامل", exchtSub: "أضف عاملاً عبر بريده الإلكتروني أو اسم المستخدم (الرمز) لإضافته إلى دردشة الفريق.", exchtMyCodeLbl: "اسم المستخدم الخاص بك (شاركه مع المسؤول):", exchtCodeInputPh: "البريد الإلكتروني أو اسم مستخدم العامل...",
        exchtIncomingHint: "يريد الانضمام كعامل لديك", exchtPendingHint: "بانتظار الموافقة...", exchtEmpty: "لا يوجد عمال مضافون بعد. أرسل دعوة للبدء!",
        pchatListT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='8.5' cy='8' r='3'/><circle cx='16.2' cy='9' r='2.6'/><path d='M3 19c.7-3 3-4.8 5.7-4.8S13.8 16 14.5 19'/><path d='M14.9 14.5c2.1.4 3.6 1.9 4.1 4.4'/></svg> الأعضاء", pchatBackBtn: "← رجوع", pchatEmptyMembers: "لا يوجد أعضاء آخرون داخلون بنفس الحساب بعد.", pchatStartHint: "اضغط لبدء المحادثة",
        notifCenterTitle: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3a5 5 0 0 0-5 5v3.3L5.2 15h13.6L17 11.3V8a5 5 0 0 0-5-5z'/><path d='M9.5 18a2.5 2.5 0 0 0 5 0'/></svg> الإشعارات", notifCenterEmpty: "لا توجد إشعارات جديدة",
        msgsCenterTitle: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='5' width='18' height='14' rx='1.5'/><path d='M3 6l9 7 9-7'/></svg> الرسائل", joinedGroupNotif: "لقد انضممت إلى مجموعة:",
        groupsListTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='8.5' cy='8' r='3'/><circle cx='16.2' cy='9' r='2.6'/><path d='M3 19c.7-3 3-4.8 5.7-4.8S13.8 16 14.5 19'/><path d='M14.9 14.5c2.1.4 3.6 1.9 4.1 4.4'/></svg> المجموعات", groupsNewBtnT: "مجموعة جديدة", groupsJoinCodePh: "🔑 هل لديك رمز مجموعة؟ أدخله هنا...",
        cgTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><line x1='12' y1='8' x2='12' y2='16'/><line x1='8' y1='12' x2='16' y2='12'/></svg> مجموعة جديدة", cgMembersLbl: "اختر الأعضاء من موظفيك:", cgCreateBtn: "✓ إنشاء المجموعة",
        gsTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='3.2'/><path d='M12 3v2.4M12 18.6V21M4.2 12H6.6M17.4 12h2.4M6.3 6.3l1.7 1.7M16 16l1.7 1.7M17.7 6.3 16 8M8 16l-1.7 1.7'/></svg> إعدادات المجموعة", gsNameLbl: "اسم المجموعة:", gsMembersLbl: "الأعضاء الحاليون:", gsAddLbl: "أضف موظفاً من موظفيك:",
        gsCodeLbl: "رمز المجموعة (شاركه مع أي شخص ليتمكن من الدخول إليها مباشرة):", gsRegenBtn: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M20 12a8 8 0 1 1-2.9-6.2'/><path d='M20 4v5h-5'/></svg> رمز جديد", gsDeleteBtn: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M5 7h14M9 7V4.5h6V7M7 7l1 12.5h8L17 7'/></svg> حذف المجموعة",
        pendingEditFrom: "تعديل جديد من", pendingEditWaitingApproval: "بانتظار الموافقة", pendingWaitingOther: "بانتظار موافقة شخص آخر...",
        ciTitle: "دعوة عامل جديد", ciCodeLbl: "كود الدعوة (صالح لاستعمال واحد، لمدة ساعتين):", ciRegenBtn: "كود جديد",
        ciActiveCodesLbl: "الأكواد النشيطة (لم تُستخدم بعد):", ciCloseT: "✕ إغلاق",
        btnApprove: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> قبول", btnReject: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> رفض", confirmReject: "رفض هذا التعديل؟",
        editApprovedFrom: "تعديل من",
        chkFormT: "تسجيل شيك جديد", chkNumPh: "رقم الشيك", chkOwnerPh: "صاحب الشيك / الشركة الموردة", chkAmountPh: "مبلغ الشيك (DH)",
        chkOptDef: "نوع الشيك / الحالة", chkOpt1: "شيك صادر", chkOpt2: "شيك وارد", chkOpt3: "مضمون", chkLblDt: "تاريخ ووقت التنبيه:", chkBtnAdd: "+ تسجيل الشيك", chkListT: "سجل الشيكات",
        shortcutAddBtn: "+ إضافة",
        homeShortcutAddBtn: "+ إضافة قائمة رئيسية",
        stkFormT: "إضافة سلعة للمخزن", itemNamePh: "اسم المنتج / القطعة (اكتب أو اختر)", itemQtyPh: "الكمية", itemPricePh: "الثمن الواحد (DH)", itemMinQtyPh: "الحد الأدنى للتنبيه (اختياري)", stkLblDt: "وقت التنبيه (اختياري):", stkBtnAdd: "+ إضافة للمخزن", stkListT: "سجل المخزن",
        srvFormT: "تسجيل موعد / زبون", clientNamePh: "اسم الزبون", clientPhonePh: "رقم الهاتف (مثال: 06xxxxxxxx)", clientMapPh: "رابط Google Maps أو إحداثيات الموقع (اختياري)", climTypePh: "نوع المكيف / التفاصيل", srvOptDef: "اختيار نوع الخدمة", srvOpt1: "تركيب", srvOpt2: "تنظيف", srvOpt3: "مراجعة", srvOpt4: "إصلاح", srvLblDt: "وقت التنبيه (اختياري):", srvLblRepeat: "تكرار الصيانة (اختياري):", repeatOpt0: "بدون تكرار", repeatOpt1: "يومي", repeatOpt2: "أسبوعي", repeatOpt3: "شهري", srvBtnAdd: "+ تسجيل الخدمة", srvListT: "سجل الزبائن والخدمات",
        ntsFormT: "إضافة ملاحظة / تذكير", noteTextPh: "اكتب الملاحظة أو التذكير هنا...", ntsLblDt: "وقت التنبيه (اختياري):", ntsLblRepeat: "تكرار التذكير (اختياري):", ntsBtnAdd: "+ حفظ الملاحظة", ntsListT: "كناش الملاحظات",
        setT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='3.2'/><path d='M12 3v2.4M12 18.6V21M4.2 12H6.6M17.4 12h2.4M6.3 6.3l1.7 1.7M16 16l1.7 1.7M17.7 6.3 16 8M8 16l-1.7 1.7'/></svg> إعدادات التطبيق والتقارير", setDesc: "يمكنك طباعة جميع معلومات التطبيق في ملف PDF منظم أو مسح البيانات.", btnPdf: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2'/><rect x='6' y='14' width='12' height='7'/></svg> طباعة تقرير PDF شامل", btnProfile: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='8' r='3.6'/><path d='M4.5 20.2c1-3.6 4-5.7 7.5-5.7s6.5 2.1 7.5 5.7'/></svg> تعديل الملف الشخصي", btnNotif: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3a5 5 0 0 0-5 5v3.3L5.2 15h13.6L17 11.3V8a5 5 0 0 0-5-5z'/><path d='M9.5 18a2.5 2.5 0 0 0 5 0'/></svg> تفعيل إشعارات الهاتف", btnDelAll: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> مسح جميع بيانات الحساب نهائياً",
        setNotifModeT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='13' r='8'/><path d='M12 9v4l3 2'/><path d='M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5'/></svg> نمط التنبيهات", setNotifModeDesc: "اختر الطريقة التي تريد أن تصلك بها التنبيهات، حسب ما يناسبك.",
        notifModeOptPersistent: "تذكير دائم يعرض جميع التنبيهات المعلقة", notifModeOptLead: "⏰ تنبيه قبل الموعد بمدة محددة",
        notifLeadLbl: "اختر المدة قبل الموعد:", notifLeadOpt15: "15 دقيقة قبل", notifLeadOpt60: "ساعة واحدة قبل", notifLeadOpt180: "3 ساعات قبل", notifLeadOpt1440: "يوم كامل قبل",
        nav1: "الرئيسية", nav2: "الشيكات", nav3: "المخزن", nav4: "الخدمات", nav5: "ملاحظات", nav6: "دردشة",
        chatTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M4 5h16v10.5H10.5L6 19v-3.5H4z'/></svg> دردشة الفريق", chatInputPh: "اكتب رسالة...",
        noNotifs: "لا توجد عناصر مسجلة في حسابك.", noAlerts: "لا توجد تنبيهات أو تواريخ مبرمجة حالياً.", delBtn: "مسح <svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M5 7h14M9 7V4.5h6V7M7 7l1 12.5h8L17 7'/></svg>", urgentBadge: "انتهى الوقت <svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg>",
        searchPh: "🔍 بحث...",
        loading: "جاري التحميل...",
        groupChatBackBtn: "← رجوع",
        addAccountTitle: "إضافة حساب جديد", addAccountEmailPh: "البريد الإلكتروني", addAccountPasswordPh: "كلمة السر", addAccountSubmitBtn: "دخول وإضافة",
        authErrorForgotBtn: "نسيت كلمة السر؟", authErrorRegisterBtn: "إنشاء حساب جديد",
        profileTitle: "معلومات الحساب", profileFirstnamePh: "الاسم", profileLastnamePh: "اللقب", profileAvatarLbl: "اختر أفاتار (اختياري):", profileSaveBtn: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M4 4h13l3 3v13H4z'/><path d='M8 4v5h8V4'/><rect x='8' y='13' width='8' height='6'/></svg> حفظ", uploadPhotoTxt: "أو ارفع صورة من الهاتف",
        deviceProfileSub: "ستظهر هذه المعلومات فقط في الدردشة لمعرفة من كتب ماذا، حتى لو دخل الجميع بنفس الحساب.", deviceProfileFirstnamePh: "الاسم", deviceProfileLastnamePh: "اللقب", deviceProfilePhonePh: "رقم الهاتف (اختياري، ليتمكن أعضاء الفريق من الاتصال بك)", deviceProfileEmailPh: "البريد الإلكتروني الشخصي (اختياري، ليتمكن المسؤول من إضافتك كعامل)", deviceProfileAvatarLbl: "اختر أفاتار (اختياري):", deviceProfileSaveBtn: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M4 4h13l3 3v13H4z'/><path d='M8 4v5h8V4'/><rect x='8' y='13' width='8' height='6'/></svg> حفظ",
        cancelEditTxt: "✕ إلغاء التعديل",
        offlineBannerTxt: "لا يوجد اتصال بالإنترنت — البيانات المعروضة محفوظة محليا",
        backBtn: "‹ رجوع"
      },
      fr: {
        langBtn: "AR 🇲🇦", dir: "ltr",
        authDesc: "Gestion d'installation et maintenance", emailPh: "E-mail (Gmail)", passPh: "Mot de passe", codePh: "Entrer le code de vérification à 6 chiffres", sendCodeBtn: "📤 Envoyer le code à Gmail",
        btnLogin: "Connexion", btnReg: "Terminer l'inscription", forgotPass: "Mot de passe oublié ?",
        swtReg: "Créer un compte", swtLog: "Connexion", swtPrefixReg: "Pas de compte ?", swtPrefixLog: "Déjà un compte ?",
        logoutBtn: "Déconnexion", box1Title: "Informations globales du compte :", closeBox1: "✕ Fermer",
        box2Title: "Alertes et temps restant :", closeBox2: "✕ Fermer",
        mChkT: "Chèques", mChkD: "Suivi et échéance des chèques",
        mStkT: "Stock", mStkD: "Pièces de rechange et articles",
        mSrvT: "Services & Clients", mSrvD: "Installation, nettoyage, réparation",
        mNtsT: "Notes", mNtsD: "Carnet de notes et tâches",
        mChtT: "Chat", mChtD: "Groupe ou privé entre membres",
        mEmpT: "Employés", mEmpD: "Ajouter, chat privé, bloquer", empTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='8' r='3.6'/><path d='M4.5 20.2c1-3.6 4-5.7 7.5-5.7s6.5 2.1 7.5 5.7'/><path d='M6.5 8.5c1.5-1 3.6-1.6 5.5-1.6s4 .6 5.5 1.6' stroke-width='1.4'/></svg> Employés", empSubT: "Chaque employé ayant un compte sur cette appli apparaît ici automatiquement. Vous pouvez lui écrire en privé, l'ajouter au groupe, ou le bloquer.", companyEmpTitleT: "Employés de l'entreprise (ayant rejoint avec un code)", companyEmpSubT: "Vous voyez ici chaque employé ayant rejoint l'entreprise avec un code d'invitation, et pouvez lui donner la permission d'ajouter ou modifier : les chèques, le stock, les installations/services, ou les notes.",
        mPchtT: "Chat privé", mPchtD: "Conversations individuelles entre membres",
        chatChoiceTitle: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M4 5h16v10.5H10.5L6 19v-3.5H4z'/></svg> Choisissez le type de chat", chatChoiceGroup: "Chat de groupe", chatChoicePrivate: "Chat privé", chatChoiceCode: "Ajouter un employé", closeGeneric: "✕ Fermer", memberInfoCall: "Appeler",
        exchtListT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><line x1='12' y1='8' x2='12' y2='16'/><line x1='8' y1='12' x2='16' y2='12'/></svg> Ajouter un employé", exchtSub: "Ajoutez un employé par son e-mail ou son nom d'utilisateur (code) pour l'ajouter au chat de l'équipe.", exchtMyCodeLbl: "Votre nom d'utilisateur (à partager avec le responsable) :", exchtCodeInputPh: "E-mail ou nom d'utilisateur de l'employé...",
        exchtIncomingHint: "Souhaite vous rejoindre en tant qu'employé", exchtPendingHint: "En attente d'acceptation...", exchtEmpty: "Aucun employé ajouté pour le moment. Envoyez une invitation pour commencer !",
        pchatListT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='8.5' cy='8' r='3'/><circle cx='16.2' cy='9' r='2.6'/><path d='M3 19c.7-3 3-4.8 5.7-4.8S13.8 16 14.5 19'/><path d='M14.9 14.5c2.1.4 3.6 1.9 4.1 4.4'/></svg> Membres", pchatBackBtn: "← Retour", pchatEmptyMembers: "Aucun autre membre n'a encore rejoint ce compte.", pchatStartHint: "Appuyez pour démarrer la conversation",
        notifCenterTitle: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3a5 5 0 0 0-5 5v3.3L5.2 15h13.6L17 11.3V8a5 5 0 0 0-5-5z'/><path d='M9.5 18a2.5 2.5 0 0 0 5 0'/></svg> Notifications", notifCenterEmpty: "Aucune nouvelle notification",
        msgsCenterTitle: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='5' width='18' height='14' rx='1.5'/><path d='M3 6l9 7 9-7'/></svg> Messages", joinedGroupNotif: "Vous avez rejoint le groupe :",
        groupsListTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='8.5' cy='8' r='3'/><circle cx='16.2' cy='9' r='2.6'/><path d='M3 19c.7-3 3-4.8 5.7-4.8S13.8 16 14.5 19'/><path d='M14.9 14.5c2.1.4 3.6 1.9 4.1 4.4'/></svg> Groupes", groupsNewBtnT: "Nouveau groupe", groupsJoinCodePh: "🔑 Vous avez un code de groupe ? Entrez-le ici...",
        cgTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><line x1='12' y1='8' x2='12' y2='16'/><line x1='8' y1='12' x2='16' y2='12'/></svg> Nouveau groupe", cgMembersLbl: "Choisissez les membres parmi vos employés :", cgCreateBtn: "✓ Créer le groupe",
        gsTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='3.2'/><path d='M12 3v2.4M12 18.6V21M4.2 12H6.6M17.4 12h2.4M6.3 6.3l1.7 1.7M16 16l1.7 1.7M17.7 6.3 16 8M8 16l-1.7 1.7'/></svg> Paramètres du groupe", gsNameLbl: "Nom du groupe :", gsMembersLbl: "Membres actuels :", gsAddLbl: "Ajouter un employé :",
        gsCodeLbl: "Code du groupe (partagez-le pour qu'une personne puisse le rejoindre directement) :", gsRegenBtn: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M20 12a8 8 0 1 1-2.9-6.2'/><path d='M20 4v5h-5'/></svg> Nouveau code", gsDeleteBtn: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M5 7h14M9 7V4.5h6V7M7 7l1 12.5h8L17 7'/></svg> Supprimer le groupe",
        pendingEditFrom: "Modification de", pendingEditWaitingApproval: "en attente d'approbation", pendingWaitingOther: "En attente de l'approbation d'un autre membre...",
        ciTitle: "Inviter un nouvel employé", ciCodeLbl: "Code d'invitation (valable pour un usage, pendant 2 heures) :", ciRegenBtn: "Nouveau code",
        ciActiveCodesLbl: "Codes actifs (pas encore utilisés) :", ciCloseT: "✕ Fermer",
        btnApprove: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> Approuver", btnReject: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> Rejeter", confirmReject: "Rejeter cette modification ?",
        editApprovedFrom: "Modification de",
        chkFormT: "Enregistrer un nouveau chèque", chkNumPh: "N° du chèque", chkOwnerPh: "Propriétaire / Fournisseur", chkAmountPh: "Montant (DH)",
        chkOptDef: "Type / Statut du chèque", chkOpt1: "Chèque émis", chkOpt2: "Chèque reçu", chkOpt3: "Garanti", chkLblDt: "Date et heure de l'alerte :", chkBtnAdd: "+ Enregistrer le chèque", chkListT: "Historique des chèques",
        shortcutAddBtn: "+ Ajouter",
        homeShortcutAddBtn: "+ Ajouter au menu principal",
        stkFormT: "Ajouter au stock", itemNamePh: "Nom du produit / pièce", itemQtyPh: "Quantité", itemPricePh: "Prix unitaire (DH)", itemMinQtyPh: "Seuil d'alerte (optionnel)", stkLblDt: "Heure d'alerte (optionnel) :", stkBtnAdd: "+ Ajouter au stock", stkListT: "Historique du stock",
        srvFormT: "Enregistrer un RDV / Client", clientNamePh: "Nom du client", clientPhonePh: "Téléphone (ex: 06xxxxxxxx)", clientMapPh: "Lien Google Maps ou position (optionnel)", climTypePh: "Type de clim / Détails", srvOptDef: "Sélectionner le service", srvOpt1: "Installation", srvOpt2: "Nettoyage", srvOpt3: "Révision", srvOpt4: "Réparation", srvLblDt: "Heure d'alerte (optionnel) :", srvLblRepeat: "Récurrence de la maintenance (optionnel) :", repeatOpt0: "Sans récurrence", repeatOpt1: "Quotidien", repeatOpt2: "Hebdomadaire", repeatOpt3: "Mensuel", srvBtnAdd: "+ Enregistrer le service", srvListT: "Historique des clients & services",
        ntsFormT: "Ajouter une note / rappel", noteTextPh: "Écrivez votre note ou rappel ici...", ntsLblDt: "Heure d'alerte (optionnel) :", ntsLblRepeat: "Récurrence du rappel (optionnel) :", ntsBtnAdd: "+ Enregistrer la note", ntsListT: "Carnet de notes",
        setT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='3.2'/><path d='M12 3v2.4M12 18.6V21M4.2 12H6.6M17.4 12h2.4M6.3 6.3l1.7 1.7M16 16l1.7 1.7M17.7 6.3 16 8M8 16l-1.7 1.7'/></svg> Paramètres & Rapports", setDesc: "Imprimez toutes vos données dans un rapport PDF ou effacez vos données.", btnPdf: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2'/><rect x='6' y='14' width='12' height='7'/></svg> Imprimer le rapport PDF", btnProfile: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='8' r='3.6'/><path d='M4.5 20.2c1-3.6 4-5.7 7.5-5.7s6.5 2.1 7.5 5.7'/></svg> Modifier le profil", btnNotif: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3a5 5 0 0 0-5 5v3.3L5.2 15h13.6L17 11.3V8a5 5 0 0 0-5-5z'/><path d='M9.5 18a2.5 2.5 0 0 0 5 0'/></svg> Activer les notifications", btnDelAll: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> Supprimer toutes les données",
        setNotifModeT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='13' r='8'/><path d='M12 9v4l3 2'/><path d='M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5'/></svg> Mode des notifications", setNotifModeDesc: "Choisissez la méthode de notification qui vous convient le mieux.",
        notifModeOptPersistent: "Rappel permanent affichant toutes les alertes en attente", notifModeOptLead: "⏰ Notification avant l'échéance (délai fixe)",
        notifLeadLbl: "Choisissez le délai avant l'échéance :", notifLeadOpt15: "15 minutes avant", notifLeadOpt60: "1 heure avant", notifLeadOpt180: "3 heures avant", notifLeadOpt1440: "1 jour avant",
        nav1: "Accueil", nav2: "Chèques", nav3: "Stock", nav4: "Services", nav5: "Notes", nav6: "Chat",
        chatTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M4 5h16v10.5H10.5L6 19v-3.5H4z'/></svg> Chat d'équipe", chatInputPh: "Écrire un message...",
        noNotifs: "Aucun élément dans votre compte.", noAlerts: "Aucune alerte programmée.", delBtn: "Supprimer <svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M5 7h14M9 7V4.5h6V7M7 7l1 12.5h8L17 7'/></svg>", urgentBadge: "Dépassé <svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg>",
        searchPh: "🔍 Rechercher...",
        loading: "Chargement...",
        groupChatBackBtn: "← Retour",
        addAccountTitle: "Ajouter un compte", addAccountEmailPh: "E-mail", addAccountPasswordPh: "Mot de passe", addAccountSubmitBtn: "Connexion et ajout",
        authErrorForgotBtn: "Mot de passe oublié ?", authErrorRegisterBtn: "Créer un compte",
        profileTitle: "Informations du compte", profileFirstnamePh: "Prénom", profileLastnamePh: "Nom", profileAvatarLbl: "Choisir un avatar (optionnel) :", profileSaveBtn: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M4 4h13l3 3v13H4z'/><path d='M8 4v5h8V4'/><rect x='8' y='13' width='8' height='6'/></svg> Enregistrer", uploadPhotoTxt: "Ou téléverser une photo",
        deviceProfileSub: "Ces informations n'apparaîtront que dans le chat, pour savoir qui a écrit quoi, même si tout le monde utilise le même compte.", deviceProfileFirstnamePh: "Prénom", deviceProfileLastnamePh: "Nom", deviceProfilePhonePh: "Téléphone (optionnel, pour que l'équipe puisse vous appeler)", deviceProfileEmailPh: "E-mail personnel (optionnel, pour que le responsable puisse vous ajouter comme employé)", deviceProfileAvatarLbl: "Choisir un avatar (optionnel) :", deviceProfileSaveBtn: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M4 4h13l3 3v13H4z'/><path d='M8 4v5h8V4'/><rect x='8' y='13' width='8' height='6'/></svg> Enregistrer",
        cancelEditTxt: "✕ Annuler la modification",
        offlineBannerTxt: "Pas de connexion Internet — données affichées enregistrées localement",
        backBtn: "‹ Retour"
      }
    };

    function toggleLanguage() {
      currentLang = currentLang === 'ar' ? 'fr' : 'ar';
      applyLanguage();
      updateOfflineBanner();
    }

    function safeSetHTML(id, html) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    }

    function applyLanguage() {
      const t = translations[currentLang];
      document.documentElement.dir = t.dir;
      document.getElementById('lang-toggle-btn').innerHTML = t.langBtn;

      document.getElementById('lang-opt-ar').classList.toggle('active', currentLang === 'ar');
      document.getElementById('lang-opt-fr').classList.toggle('active', currentLang === 'fr');

      document.getElementById('auth-desc').innerHTML = t.authDesc;
      document.getElementById('auth-email').placeholder = t.emailPh;
      document.getElementById('auth-password').placeholder = t.passPh;
      document.getElementById('auth-code-input').placeholder = t.codePh;
      document.getElementById('btn-send-code-txt').innerHTML = t.sendCodeBtn;
      document.getElementById('btn-login-txt').innerHTML = t.btnLogin;
      document.getElementById('btn-reg-txt').innerHTML = t.btnReg;
      document.getElementById('forgot-pass-txt').innerHTML = t.forgotPass;
      document.getElementById('switch-to-reg-txt').innerHTML = t.swtReg;
      document.getElementById('switch-to-log-txt').innerHTML = t.swtLog;
      document.getElementById('switch-prefix-reg').innerHTML = t.swtPrefixReg;
      document.getElementById('switch-prefix-log').innerHTML = t.swtPrefixLog;
      updateAuthTitle();
      document.getElementById('logout-btn-txt').innerHTML = t.logoutBtn;

      document.getElementById('groups-list-title-t').innerHTML = t.groupsListTitleT;
      document.getElementById('groups-new-btn-t').innerHTML = t.groupsNewBtnT;
      document.getElementById('groups-join-code-input').placeholder = t.groupsJoinCodePh;
      document.getElementById('cg-title-t').innerHTML = t.cgTitleT;
      document.getElementById('cg-members-lbl').innerHTML = t.cgMembersLbl;
      document.getElementById('cg-create-btn').innerHTML = t.cgCreateBtn;
      document.getElementById('cg-close-t').innerHTML = t.closeGeneric;
      document.getElementById('gs-title-t').innerHTML = t.gsTitleT;
      document.getElementById('gs-name-lbl').innerHTML = t.gsNameLbl;
      document.getElementById('gs-members-lbl').innerHTML = t.gsMembersLbl;
      document.getElementById('gs-add-lbl').innerHTML = t.gsAddLbl;
      document.getElementById('gs-code-lbl').innerHTML = t.gsCodeLbl;
      document.getElementById('gs-regen-btn').innerHTML = t.gsRegenBtn;
      document.getElementById('gs-delete-btn').innerHTML = t.gsDeleteBtn;
      document.getElementById('gs-close-t').innerHTML = t.closeGeneric;

      document.getElementById('box-title-1').innerHTML = `${t.box1Title} <span style="font-size:12px; cursor:pointer;" onclick="toggleNotifs()">${t.closeBox1}</span>`;
      document.getElementById('box-title-2').innerHTML = `${t.box2Title} <span style="font-size:12px; cursor:pointer;" onclick="toggleImportantAlerts()">${t.closeBox2}</span>`;

      document.getElementById('m-chk-t').innerHTML = t.mChkT; document.getElementById('m-chk-d').innerHTML = t.mChkD;
      document.getElementById('m-stk-t').innerHTML = t.mStkT; document.getElementById('m-stk-d').innerHTML = t.mStkD;
      document.getElementById('m-srv-t').innerHTML = t.mSrvT; document.getElementById('m-srv-d').innerHTML = t.mSrvD;
      document.getElementById('m-nts-t').innerHTML = t.mNtsT; document.getElementById('m-nts-d').innerHTML = t.mNtsD;
      document.getElementById('m-cht-t').innerHTML = t.mChtT; document.getElementById('m-cht-d').innerHTML = t.mChtD;
      document.getElementById('m-emp-t').innerHTML = t.mEmpT; document.getElementById('m-emp-d').innerHTML = t.mEmpD;
      safeSetHTML('emp-title-t', t.empTitleT); safeSetHTML('emp-sub-t', t.empSubT);
      safeSetHTML('company-emp-title-t', t.companyEmpTitleT); safeSetHTML('company-emp-sub-t', t.companyEmpSubT);
      renderEmployeesList();
      if (typeof renderCompanyEmployeesList === 'function') renderCompanyEmployeesList();
      if (typeof renderActiveInviteCodes === 'function') renderActiveInviteCodes();
      safeSetHTML('ci-title', t.ciTitle); safeSetHTML('ci-code-lbl', t.ciCodeLbl);
      safeSetHTML('ci-regen-btn', t.ciRegenBtn); safeSetHTML('ci-active-codes-lbl', t.ciActiveCodesLbl);
      safeSetHTML('ci-close-t', t.ciCloseT);
      renderChequesListUI();
      renderStockListUI();
      renderInstallationsListUI();
      renderNotesListUI();
      renderNavShortcuts();

      document.getElementById('chat-choice-title').innerHTML = t.chatChoiceTitle;
      document.getElementById('chat-choice-group-t').innerHTML = t.chatChoiceGroup;
      document.getElementById('chat-choice-private-t').innerHTML = t.chatChoicePrivate;
      // ⚠️ ملاحظة: زر "chat-choice-code-t" تحيد من الواجهة (استبدل بـ"+ إضافة بالكود" فشاشة
      // الرسائل الخاصة)، فحذفنا هاد السطر لي كان كيخرب applyLanguage كاملة (كل شي بعدو
      // ما كانش كيترجم) لأن document.getElementById كان يرجع null ويوقف الدالة بالخطأ.
      document.getElementById('chat-choice-close-t').innerHTML = t.closeGeneric;
      document.getElementById('excht-list-title-t').innerHTML = t.exchtListT;
      document.getElementById('excht-sub-t').innerHTML = t.exchtSub;
      document.getElementById('excht-mycode-lbl').innerHTML = t.exchtMyCodeLbl;
      document.getElementById('excht-code-input').placeholder = t.exchtCodeInputPh;
      document.getElementById('excht-back-btn-txt').innerHTML = t.pchatBackBtn;
      document.getElementById('excht-input').placeholder = t.chatInputPh;
      document.getElementById('member-info-call-t').innerHTML = t.memberInfoCall;
      document.getElementById('member-info-msg-t').innerHTML = t.mPchtT;
      document.getElementById('member-info-close-t').innerHTML = t.closeGeneric;

      document.getElementById('chk-form-t').innerHTML = t.chkFormT;
      document.getElementById('chk-num').placeholder = t.chkNumPh;
      document.getElementById('chk-owner').placeholder = t.chkOwnerPh;
      document.getElementById('chk-amount').placeholder = t.chkAmountPh;
      document.getElementById('chk-opt-def').innerHTML = t.chkOptDef;
      document.getElementById('chk-opt-1').innerHTML = t.chkOpt1;
      document.getElementById('chk-opt-2').innerHTML = t.chkOpt2;
      document.getElementById('chk-opt-3').innerHTML = t.chkOpt3;
      document.getElementById('chk-lbl-dt').innerHTML = t.chkLblDt;
      document.getElementById('chk-btn-add').innerHTML = t.chkBtnAdd;
      const homeShortcutBtn = document.getElementById('shortcut-add-btn-home');
      if (homeShortcutBtn) homeShortcutBtn.innerHTML = t.homeShortcutAddBtn;
      ['shortcut-add-btn-cheques', 'shortcut-add-btn-stock', 'shortcut-add-btn-install', 'shortcut-add-btn-notes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = t.shortcutAddBtn;
      });
      document.getElementById('chk-list-t').innerHTML = t.chkListT;

      document.getElementById('stk-form-t').innerHTML = t.stkFormT;
      document.getElementById('item-name').placeholder = t.itemNamePh;
      document.getElementById('item-qty').placeholder = t.itemQtyPh;
      document.getElementById('item-price').placeholder = t.itemPricePh;
      document.getElementById('item-minqty').placeholder = t.itemMinQtyPh;
      document.getElementById('stk-lbl-dt').innerHTML = t.stkLblDt;
      document.getElementById('stk-btn-add').innerHTML = t.stkBtnAdd;
      document.getElementById('stk-list-t').innerHTML = t.stkListT;

      document.getElementById('srv-form-t').innerHTML = t.srvFormT;
      document.getElementById('client-name').placeholder = t.clientNamePh;
      document.getElementById('client-phone').placeholder = t.clientPhonePh;
      document.getElementById('client-map').placeholder = t.clientMapPh;
      document.getElementById('clim-type').placeholder = t.climTypePh;
      document.getElementById('srv-opt-def').innerHTML = t.srvOptDef;
      document.getElementById('srv-opt-1').innerHTML = t.srvOpt1;
      document.getElementById('srv-opt-2').innerHTML = t.srvOpt2;
      document.getElementById('srv-opt-3').innerHTML = t.srvOpt3;
      document.getElementById('srv-opt-4').innerHTML = t.srvOpt4;
      document.getElementById('srv-lbl-dt').innerHTML = t.srvLblDt;
      safeSetHTML('srv-lbl-repeat', t.srvLblRepeat);
      safeSetHTML('srv-repeat-opt-0', t.repeatOpt0);
      safeSetHTML('srv-repeat-opt-1', t.repeatOpt1);
      safeSetHTML('srv-repeat-opt-2', t.repeatOpt2);
      safeSetHTML('srv-repeat-opt-3', t.repeatOpt3);
      document.getElementById('srv-btn-add').innerHTML = t.srvBtnAdd;
      document.getElementById('srv-list-t').innerHTML = t.srvListT;

      document.getElementById('nts-form-t').innerHTML = t.ntsFormT;
      document.getElementById('note-text').placeholder = t.noteTextPh;
      document.getElementById('nts-lbl-dt').innerHTML = t.ntsLblDt;
      safeSetHTML('nts-lbl-repeat', t.ntsLblRepeat);
      safeSetHTML('nts-repeat-opt-0', t.repeatOpt0);
      safeSetHTML('nts-repeat-opt-1', t.repeatOpt1);
      safeSetHTML('nts-repeat-opt-2', t.repeatOpt2);
      safeSetHTML('nts-repeat-opt-3', t.repeatOpt3);
      document.getElementById('nts-btn-add').innerHTML = t.ntsBtnAdd;
      document.getElementById('nts-list-t').innerHTML = t.ntsListT;

      document.getElementById('chk-search').placeholder = t.searchPh;
      document.getElementById('stk-search').placeholder = t.searchPh;
      document.getElementById('srv-search').placeholder = t.searchPh;
      document.getElementById('nts-search').placeholder = t.searchPh;
      document.getElementById('home-search').placeholder = t.searchPh;

      document.getElementById('set-t').innerHTML = t.setT;
      document.getElementById('set-desc').innerHTML = t.setDesc;
      document.getElementById('btn-pdf-txt').innerHTML = t.btnPdf;
      document.getElementById('btn-profile-txt').innerHTML = t.btnProfile;
      document.getElementById('btn-notif-txt').innerHTML = t.btnNotif;
      document.getElementById('btn-del-all-txt').innerHTML = t.btnDelAll;

      document.getElementById('set-notif-mode-t').innerHTML = t.setNotifModeT;
      document.getElementById('set-notif-mode-desc').innerHTML = t.setNotifModeDesc;
      document.getElementById('notif-mode-opt-persistent').innerText = t.notifModeOptPersistent;
      document.getElementById('notif-mode-opt-lead').innerHTML = t.notifModeOptLead;
      document.getElementById('notif-lead-lbl').innerHTML = t.notifLeadLbl;
      document.getElementById('notif-lead-opt-15').innerHTML = t.notifLeadOpt15;
      document.getElementById('notif-lead-opt-60').innerHTML = t.notifLeadOpt60;
      document.getElementById('notif-lead-opt-180').innerHTML = t.notifLeadOpt180;
      document.getElementById('notif-lead-opt-1440').innerHTML = t.notifLeadOpt1440;

      safeSetHTML('nav-lbl-1', t.nav1);
      safeSetHTML('nav-lbl-2', t.nav2);
      safeSetHTML('nav-lbl-3', t.nav3);
      safeSetHTML('nav-lbl-4', t.nav4);
      safeSetHTML('nav-lbl-5', t.nav5);
      safeSetHTML('nav-lbl-6', t.nav6);
      document.getElementById('sp-title-t').innerHTML = (currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> أضف اختصارًا إلى الشريط السفلي ' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Ajouter un raccourci ') + `<span style="font-size:12px; cursor:pointer;" onclick="closeShortcutPicker()">✕ ${currentLang === 'ar' ? 'إغلاق' : 'Fermer'}</span>`;

      document.getElementById('chat-back-btn-txt').innerHTML = t.groupChatBackBtn;
      document.getElementById('add-account-title').innerHTML = t.addAccountTitle;
      document.getElementById('add-account-email').placeholder = t.addAccountEmailPh;
      document.getElementById('add-account-password').placeholder = t.addAccountPasswordPh;
      document.getElementById('add-account-submit-btn').innerHTML = t.addAccountSubmitBtn;
      document.getElementById('add-account-close-t').innerHTML = t.closeGeneric;
      document.getElementById('auth-error-forgot-btn').innerHTML = t.authErrorForgotBtn;
      document.getElementById('auth-error-register-btn').innerHTML = t.authErrorRegisterBtn;
      document.getElementById('auth-error-close-t').innerHTML = t.closeGeneric;
      document.getElementById('profile-title').innerHTML = t.profileTitle;
      document.getElementById('profile-firstname').placeholder = t.profileFirstnamePh;
      document.getElementById('profile-lastname').placeholder = t.profileLastnamePh;
      document.getElementById('profile-avatar-lbl').innerHTML = t.profileAvatarLbl;
      document.getElementById('upload-photo-txt').innerHTML = t.uploadPhotoTxt;
      document.getElementById('profile-save-btn').innerHTML = t.profileSaveBtn;
      document.getElementById('profile-close-btn').innerHTML = t.closeGeneric;
      document.getElementById('device-profile-sub').innerHTML = t.deviceProfileSub;
      document.getElementById('device-profile-firstname').placeholder = t.deviceProfileFirstnamePh;
      document.getElementById('device-profile-lastname').placeholder = t.deviceProfileLastnamePh;
      document.getElementById('device-profile-phone').placeholder = t.deviceProfilePhonePh;
      document.getElementById('device-profile-email').placeholder = t.deviceProfileEmailPh;
      document.getElementById('device-profile-avatar-lbl').innerHTML = t.deviceProfileAvatarLbl;
      document.getElementById('device-upload-photo-txt').innerHTML = t.uploadPhotoTxt;
      document.getElementById('device-profile-save-btn').innerHTML = t.deviceProfileSaveBtn;
      document.getElementById('device-profile-close-btn').innerHTML = t.closeGeneric;
      ['chk-cancel-edit','nts-cancel-edit','stk-cancel-edit','srv-cancel-edit'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = t.cancelEditTxt;
      });
      document.getElementById('offline-banner-txt').innerHTML = t.offlineBannerTxt;
      document.querySelectorAll('.app-back-btn').forEach(el => { el.innerHTML = t.backBtn; });
      document.getElementById('chat-title-t').innerHTML = t.chatTitleT;
      document.getElementById('chat-input').placeholder = t.chatInputPh;
      renderChatMessages();

      document.getElementById('pchat-list-title-t').innerHTML = t.pchatListT;
      document.getElementById('pchat-back-btn-txt').innerHTML = t.pchatBackBtn;
      document.getElementById('pchat-input').placeholder = t.chatInputPh;
      document.getElementById('notif-center-title-t').innerHTML = t.notifCenterTitle;
      document.getElementById('msgs-center-title-t').innerHTML = t.msgsCenterTitle;
      safeSetHTML('notif-center-close-t', t.closeGeneric);
      safeSetHTML('msgs-center-close-t', t.closeGeneric);
      renderPrivateChatList();
      renderPrivateMessages();

      updateNotificationBoxes();
      updateBellNotifications();
      if (typeof renderHomeStats === 'function') renderHomeStats();
    }

    let currentSectionId = 'home-section';
    let navHistory = [];

    function updateBackBtnVisibility() {
      const btn = document.getElementById('app-back-btn');
      if (btn) btn.style.display = navHistory.length > 0 ? 'inline-flex' : 'none';
    }

    function openSection(sectionId, _isBack) {
      if (!_isBack && sectionId !== currentSectionId) {
        navHistory.push(currentSectionId);
        if (navHistory.length > 30) navHistory.shift();
        try { history.pushState({ deepliteSection: sectionId }, ''); } catch (e) {}
      }
      currentSectionId = sectionId;
      updateBackBtnVisibility();

      document.querySelectorAll('.section-page').forEach(sec => sec.classList.remove('active'));
      const targetSec = document.getElementById(sectionId);
      if (targetSec) targetSec.classList.add('active');
      document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
      const navMap = { 'home-section': 'nav-home', 'cheques-section': 'nav-cheques', 'stock-section': 'nav-stock', 'install-section': 'nav-install', 'notes-section': 'nav-notes', 'groups-list-section': 'nav-chat', 'chat-section': 'nav-chat', 'pchat-list-section': 'nav-chat', 'pchat-section': 'nav-chat', 'excht-list-section': 'nav-chat', 'excht-section': 'nav-chat' };
      if (navMap[sectionId]) {
        const targetNav = document.getElementById(navMap[sectionId]);
        if (targetNav) targetNav.classList.add('active');
      }
      window.scrollTo(0, 0);
      if (sectionId === 'chat-section') {
        setTimeout(() => { markVisibleMessagesSeen(); scrollChatToBottom(); }, 60);
      }
    }

    function goBack() {
      if (navHistory.length === 0) return;
      try { history.back(); } catch (e) {
        const prevSection = navHistory.pop();
        updateBackBtnVisibility();
        openSection(prevSection, true);
      }
    }

    window.addEventListener('popstate', function() {
      if (navHistory.length > 0) {
        const prevSection = navHistory.pop();
        updateBackBtnVisibility();
        openSection(prevSection, true);
      }
    });

    function openChatChoice() {
      const groupUnread = computeGroupChatUnread();
      const privUnread = computeTotalPrivateUnread();
      const codeUnread = computeTotalExternalUnread() + computeExternalIncomingInvites();
      const gBadge = document.getElementById('chat-choice-group-badge');
      const pBadge = document.getElementById('chat-choice-private-badge');
      const cBadge = document.getElementById('chat-choice-code-badge');
      if (gBadge) { if (groupUnread > 0) { gBadge.innerText = groupUnread > 9 ? '9+' : groupUnread; gBadge.style.display = 'inline-block'; } else gBadge.style.display = 'none'; }
      if (pBadge) { if (privUnread > 0) { pBadge.innerText = privUnread > 9 ? '9+' : privUnread; pBadge.style.display = 'inline-block'; } else pBadge.style.display = 'none'; }
      if (cBadge) { if (codeUnread > 0) { cBadge.innerText = codeUnread > 9 ? '9+' : codeUnread; cBadge.style.display = 'inline-block'; } else cBadge.style.display = 'none'; }
      document.getElementById('chat-choice-modal').classList.add('show');
    }

    function closeChatChoice() {
      document.getElementById('chat-choice-modal').classList.remove('show');
    }

    function showMemberInfo(memberId) {
      if (!memberId) return;
      const myId = currentUid;
      let m;
      if (memberId === myId) {
        const p = getDeviceProfile();
        m = p ? { id: myId, firstName: p.firstName, lastName: p.lastName, avatar: p.avatar, avatarIsPhoto: p.avatarIsPhoto, phone: p.phone } : null;
      } else {
        m = teamMembersCache.find(x => x.id === memberId);
      }
      if (!m) return;
      document.getElementById('member-info-avatar').innerHTML = m.avatarIsPhoto && m.avatar ? `<img src="${m.avatar}">` : (m.avatar || '🙂');
      document.getElementById('member-info-name').innerText = deviceDisplayName(m);
      const phoneRow = document.getElementById('member-info-phone-row');
      const callBtn = document.getElementById('member-info-call-btn');
      const msgBtn = document.getElementById('member-info-msg-btn');
      if (m.phone) {
        document.getElementById('member-info-phone').innerText = m.phone;
        phoneRow.style.display = 'block';
        callBtn.style.display = 'inline-block';
        callBtn.onclick = () => { window.location.href = 'tel:' + m.phone; };
      } else {
        phoneRow.style.display = 'none';
        callBtn.style.display = 'none';
      }
      const empActions = document.getElementById('member-info-emp-actions');
      if (memberId === myId) {
        msgBtn.style.display = 'none';
        empActions.style.display = 'none';
      } else {
        msgBtn.style.display = 'inline-block';
        msgBtn.onclick = () => { closeMemberInfo(); openPrivateChat(memberId); };
        empActions.style.display = 'flex';
        const blocked = isMemberBlocked(m);
        const groupBtn = document.getElementById('member-info-group-btn');
        const blockBtn = document.getElementById('member-info-block-btn');
        groupBtn.style.display = 'none';
        blockBtn.innerHTML = blocked ? (currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5.5-6"/></svg> فك الحظر' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5.5-6"/></svg> Débloquer') : (currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> حظر' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Bloquer');
        blockBtn.onclick = () => { toggleMemberBlock(memberId); closeMemberInfo(); };
      }
      document.getElementById('member-info-modal').classList.add('show');
    }

    function closeMemberInfo() {
      document.getElementById('member-info-modal').classList.remove('show');
    }

    function goToItem(type, id) {
      const sectionMap = { stock: 'stock-section', cheques: 'cheques-section', installations: 'install-section', notes: 'notes-section' };
      document.getElementById('important-alerts-box').classList.remove('show');
      document.getElementById('alert-box').classList.remove('show');
      openSection(sectionMap[type]);
      setTimeout(() => {
        const el = document.getElementById(type + '-item-' + id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
          el.style.boxShadow = '0 0 0 3px #facc15';
          el.style.borderColor = '#facc15';
          setTimeout(() => { el.style.boxShadow = ''; el.style.borderColor = ''; }, 2500);
        }
      }, 150);
    }

    function syncFloatingBackdrop() {
      const ids = ['alert-box', 'important-alerts-box', 'notif-center-box', 'msgs-center-box', 'shortcut-picker-box'];
      const anyOpen = ids.some(id => {
        const el = document.getElementById(id);
        return el && el.classList.contains('show');
      });
      document.getElementById('floating-popup-backdrop').classList.toggle('show', anyOpen);
    }

    function closeAllFloatingPopups() {
      ['alert-box', 'important-alerts-box', 'notif-center-box', 'msgs-center-box', 'shortcut-picker-box'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('show');
      });
      syncFloatingBackdrop();
    }

    function toggleNotifs() {
      document.getElementById('important-alerts-box').classList.remove('show');
      document.getElementById('notif-center-box').classList.remove('show');
      document.getElementById('msgs-center-box').classList.remove('show');
      document.getElementById('alert-box').classList.toggle('show');
      syncFloatingBackdrop();
    }

    function toggleImportantAlerts() {
      document.getElementById('alert-box').classList.remove('show');
      document.getElementById('notif-center-box').classList.remove('show');
      document.getElementById('msgs-center-box').classList.remove('show');
      const box = document.getElementById('important-alerts-box');
      box.classList.toggle('show');
      if (box.classList.contains('show')) {
        updateNotificationBoxes();
        showPersistentRemindersNotification();
      }
      syncFloatingBackdrop();
    }

    function updateCountersAndBadges() {
      document.getElementById('badge-cheques').innerText = globalData.cheques.length;
      document.getElementById('badge-stock').innerText = globalData.stock.length;
      document.getElementById('badge-install').innerText = globalData.installations.length;
      document.getElementById('badge-notes').innerText = globalData.notes.length;

      let totalElements = globalData.cheques.length + globalData.stock.length + globalData.installations.length + globalData.notes.length;
      document.getElementById('notif-count').innerText = totalElements;

      let timedAlertsCount = 0;
      globalData.cheques.forEach(d => { if(d.date) timedAlertsCount++; });
      globalData.stock.forEach(d => { if(d.date) timedAlertsCount++; });
      globalData.installations.forEach(d => { if(d.date) timedAlertsCount++; });
      globalData.notes.forEach(d => { if(d.datetime) timedAlertsCount++; });

      document.getElementById('alert-count').innerText = timedAlertsCount;
    }

    function formatTimeRemaining(targetDateStr) {
      const now = new Date();
      const target = new Date(targetDateStr);
      let diff = target - now;

      const t = translations[currentLang];
      if (diff <= 0) {
        return `<span style="color:#ef4444; font-weight:bold;">${t.urgentBadge}</span>`;
      }

      let seconds = Math.floor(diff / 1000);
      let minutes = Math.floor(seconds / 60);
      let hours = Math.floor(minutes / 60);
      let days = Math.floor(hours / 24);
      let years = Math.floor(days / 365);

      days %= 365;
      hours %= 24;
      minutes %= 60;
      seconds %= 60;

      let parts = [];
      if (currentLang === 'ar') {
        if (years > 0) parts.push(`${years} سنة`);
        if (days > 0 || years > 0) parts.push(`${days} يوم`);
        if (hours > 0 || days > 0 || years > 0) parts.push(`${hours} ساعة`);
        parts.push(`${minutes} دقيقة`);
        parts.push(`${seconds} ثانية`);
        return `<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5"/></svg> باقي: ` + parts.join('، ');
      } else {
        if (years > 0) parts.push(`${years} an${years>1?'s':''}`);
        if (days > 0 || years > 0) parts.push(`${days} j`);
        if (hours > 0 || days > 0 || years > 0) parts.push(`${hours} h`);
        parts.push(`${minutes} min`);
        parts.push(`${seconds} s`);
        return `<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5"/></svg> Reste : ` + parts.join(' ');
      }
    }

    function getAllTimedItemsSorted() {
      let allTimedItems = [];
      globalData.cheques.forEach(d => { if(d.date) allTimedItems.push({type: currentLang==='ar'?'شيك':'Chèque', title: `#${d.num} (${d.owner})`, detail: `${d.amount} DH`, time: d.date, itemType: 'cheques', itemId: d.id}); });
      globalData.stock.forEach(d => { if(d.date) allTimedItems.push({type: currentLang==='ar'?'سلعة':'Article', title: d.name, detail: `${d.qty} pcs`, time: d.date, itemType: 'stock', itemId: d.id}); });
      globalData.installations.forEach(d => { if(d.date) allTimedItems.push({type: currentLang==='ar'?'موعد':'RDV', title: d.client, detail: d.service, time: d.date, itemType: 'installations', itemId: d.id}); });
      globalData.notes.forEach(d => { if(d.datetime) allTimedItems.push({type: currentLang==='ar'?'تذكير':'Rappel', title: d.text, detail: '', time: d.datetime, itemType: 'notes', itemId: d.id}); });
      allTimedItems.sort((a, b) => new Date(a.time) - new Date(b.time));
      return allTimedItems;
    }

    function updateNotificationBoxes() {
      const content = document.getElementById('alert-content');
      const alertsContent = document.getElementById('important-alerts-content');
      content.innerHTML = '';
      alertsContent.innerHTML = '';
      
      updateCountersAndBadges();
      let total = globalData.cheques.length + globalData.stock.length + globalData.installations.length + globalData.notes.length;
      const t = translations[currentLang];

      if (total === 0) {
        content.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:6px;">${t.noNotifs}</div>`;
      } else {
        globalData.cheques.forEach(d => {
          content.innerHTML += `<div class="alert-sub-item" style="cursor:pointer;" onclick="goToItem('cheques','${d.id}')"><span><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="2" y="5" width="20" height="14" rx="2.2"/><line x1="2" y1="9.5" x2="22" y2="9.5"/><path d="M16 15.5h4"/></svg> #${d.num} (${d.owner})</span><b>${d.amount} DH</b></div>`;
        });
        globalData.stock.forEach(d => {
          content.innerHTML += `<div class="alert-sub-item" style="cursor:pointer;" onclick="goToItem('stock','${d.id}')"><span><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/></svg> ${d.name}</span><b>${d.qty} pcs</b></div>`;
        });
        globalData.installations.forEach(d => {
          content.innerHTML += `<div class="alert-sub-item" style="cursor:pointer;" onclick="goToItem('installations','${d.id}')"><span>🛠️ ${d.client}</span><b>${d.service}</b></div>`;
        });
        globalData.notes.forEach(d => {
          content.innerHTML += `<div class="alert-sub-item"><span style="white-space: pre-wrap;"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="4" y="3" width="14" height="18" rx="1.4"/><line x1="7" y1="8" x2="14" y2="8"/><line x1="7" y1="12" x2="11.5" y2="12"/></svg> ${d.text}</span></div>`;
        });
      }

      let allTimedItems = getAllTimedItemsSorted();

      if (allTimedItems.length === 0) {
        alertsContent.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:6px;">${t.noAlerts}</div>`;
      } else {
        allTimedItems.forEach(item => {
          let timeRemainingHtml = formatTimeRemaining(item.time);
          const clickAttr = item.itemId ? ` onclick="goToItem('${item.itemType}','${item.itemId}')" style="flex-direction: column; align-items: flex-start; gap: 4px; cursor:pointer;"` : ` style="flex-direction: column; align-items: flex-start; gap: 4px;"`;
          alertsContent.innerHTML += `
            <div class="alert-sub-item"${clickAttr}>
              <div style="display:flex; justify-content:space-between; width:100%;">
                <span><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg> <b>[${item.type}]</b> ${item.title} ${item.detail ? '('+item.detail+')' : ''}</span>
              </div>
              <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                <span class="countdown-timer">${timeRemainingHtml}</span>
                <span style="font-size:11px; color:#94a3b8;"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg> ${item.time.replace('T', ' ')}</span>
              </div>
            </div>`;
        });
      }
    }

    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      if (document.getElementById('important-alerts-box').classList.contains('show')) {
        updateNotificationBoxes();
      }
    }, 1000);

    // ==================== Notification Mode (اختيار المستخدم) ====================
    function getNotifMode() {
      return localStorage.getItem('deeplite_notif_mode') || 'persistent';
    }

    function saveNotifMode() {
      const sel = document.getElementById('notif-mode-select');
      if (sel) localStorage.setItem('deeplite_notif_mode', sel.value);
    }

    function getNotifLeadMinutes() {
      const v = localStorage.getItem('deeplite_notif_lead');
      const n = parseInt(v, 10);
      return isNaN(n) ? 60 : n; // افتراضياً: ساعة قبل الموعد
    }

    function saveNotifLeadTime() {
      const sel = document.getElementById('notif-lead-select');
      if (sel) localStorage.setItem('deeplite_notif_lead', sel.value);
    }

    function updateNotifModeUI() {
      const wrapper = document.getElementById('notif-lead-select-wrapper');
      if (wrapper) wrapper.style.display = getNotifMode() === 'lead' ? 'block' : 'none';
    }

    function onNotifModeChange() {
      saveNotifMode();
      updateNotifModeUI();
      // نمسحو الإشعار الدائم القديم إلا كان المستخدم بدل لنمط "قبل الموعد"
      if (getNotifMode() !== 'persistent' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) reg.getNotifications({ tag: 'deeplite-reminders' }).then(list => list.forEach(n => n.close()));
        });
      }
    }

    function applyNotifSettingsSelects() {
      const modeSel = document.getElementById('notif-mode-select');
      if (modeSel) modeSel.value = getNotifMode();
      const leadSel = document.getElementById('notif-lead-select');
      if (leadSel) leadSel.value = String(getNotifLeadMinutes());
      updateNotifModeUI();
    }

    // ==================== Persistent Reminder Notification (نفس محتوى صندوق التنبيهات) ====================
    function formatTimeRemainingPlain(targetDateStr) {
      const now = new Date();
      const target = new Date(targetDateStr);
      let diff = target - now;
      const isAr = currentLang === 'ar';
      if (diff <= 0) return isAr ? 'انتهى الوقت <svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 3 2 20h20z"/><line x1="12" y1="9.5" x2="12" y2="14"/><circle cx="12" cy="17" r="0.7" fill="currentColor" stroke="none"/></svg>' : 'Dépassé <svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 3 2 20h20z"/><line x1="12" y1="9.5" x2="12" y2="14"/><circle cx="12" cy="17" r="0.7" fill="currentColor" stroke="none"/></svg>';

      let seconds = Math.floor(diff / 1000);
      let minutes = Math.floor(seconds / 60);
      let hours = Math.floor(minutes / 60);
      let days = Math.floor(hours / 24);
      hours %= 24;
      minutes %= 60;

      if (isAr) {
        if (days > 0) return `باقي ${days} يوم و${hours} ساعة`;
        if (hours > 0) return `باقي ${hours} ساعة و${minutes} دقيقة`;
        return `باقي ${minutes} دقيقة`;
      } else {
        if (days > 0) return `Reste ${days} j ${hours} h`;
        if (hours > 0) return `Reste ${hours} h ${minutes} min`;
        return `Reste ${minutes} min`;
      }
    }

    let lastReminderSignature = '';
    let lastReminderUpdateTime = 0;

    function showPersistentRemindersNotification() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      if (!('serviceWorker' in navigator)) return;
      if (getNotifMode() !== 'persistent') return; // المستخدم مختار نمط "قبل الموعد" بدل التذكير الدائم

      const items = getAllTimedItemsSorted();
      const signature = items.map(it => it.time).join('|');
      const now = Date.now();
      const contentChanged = signature !== lastReminderSignature;
      const staleEnough = (now - lastReminderUpdateTime) > 5 * 60 * 1000;
      if (!contentChanged && !staleEnough) return; // ما نبعثوش تحديث لصندوق الإشعارات كل ثانية، غير إذا تبدل شي حاجة أو فاتت 5 دقايق

      lastReminderSignature = signature;
      lastReminderUpdateTime = now;

      navigator.serviceWorker.getRegistration().then(reg => {
        if (!reg) return;
        if (items.length === 0) {
          reg.getNotifications({ tag: 'deeplite-reminders' }).then(list => list.forEach(n => n.close()));
          return;
        }
        const isAr = currentLang === 'ar';
        const title = isAr ? `<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5"/></svg> عندك ${items.length} تنبيه معلق` : `<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5"/></svg> ${items.length} rappel(s) en attente`;
        const lines = items.map(it => `[${it.type}] ${it.title}${it.detail ? ' (' + it.detail + ')' : ''} — ${formatTimeRemainingPlain(it.time)}`);
        const body = stripTags(lines.join('\n'));
        reg.showNotification(stripTags(title), { body, tag: 'deeplite-reminders', icon: 'icon-192.png', badge: 'icon-192.png', silent: true });
      });
    }

    setInterval(showPersistentRemindersNotification, 60000);

    // ==================== Real Device Notifications ====================
    function requestNotificationPermission() {
      if (!('Notification' in window)) {
        alert(currentLang === 'ar' ? "متصفحك لا يدعم الإشعارات." : "Votre navigateur ne supporte pas les notifications.");
        return;
      }
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          alert(currentLang === 'ar' ? "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> تم تفعيل الإشعارات بنجاح!\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> Notifications activées avec succès !" : "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> Notifications activées avec succès !\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> تم تفعيل الإشعارات بنجاح!");
          showLocalNotification(currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 3a5 5 0 0 0-5 5v3.3L5.2 15h13.6L17 11.3V8a5 5 0 0 0-5-5z"/><path d="M9.5 18a2.5 2.5 0 0 0 5 0"/></svg> Deep Lite Clim' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 3a5 5 0 0 0-5 5v3.3L5.2 15h13.6L17 11.3V8a5 5 0 0 0-5-5z"/><path d="M9.5 18a2.5 2.5 0 0 0 5 0"/></svg> Deep Lite Clim', currentLang === 'ar' ? 'الإشعارات مفعلة الآن' : 'Notifications activées');
        } else {
          alert(currentLang === 'ar' ? "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> تم رفض الإذن. يمكنك تفعيله يدوياً من إعدادات المتصفح." : "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> Autorisation refusée. Vous pouvez l'activer manuellement dans les paramètres du navigateur.");
        }
      });
    }

    function showLocalNotification(title, body) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      title = stripTags(title);
      body = stripTags(body);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) {
            reg.showNotification(title, { body, icon: 'icon-192.png', badge: 'icon-192.png' });
          } else {
            new Notification(title, { body, icon: 'icon-192.png' });
          }
        });
      } else {
        new Notification(title, { body, icon: 'icon-192.png' });
      }
    }

    function getNotifiedIds() {
      try { return JSON.parse(localStorage.getItem('deeplite_notified') || '[]'); } catch (e) { return []; }
    }

    function addNotifiedId(id) {
      let list = getNotifiedIds();
      list.push(id);
      if (list.length > 300) list = list.slice(-300);
      localStorage.setItem('deeplite_notified', JSON.stringify(list));
    }

    function checkDueNotifications() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const now = new Date();
      const notifiedIds = getNotifiedIds();
      let allTimedItems = [];

      if (getNotifMode() !== 'lead') return; // المستخدم مختار نمط "التذكير الدائم" بدل هادشي

      const leadMs = getNotifLeadMinutes() * 60 * 1000;

      globalData.cheques.forEach(d => { if (d.date) allTimedItems.push({ id: 'chk_' + d.id, title: (currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="2" y="5" width="20" height="14" rx="2.2"/><line x1="2" y1="9.5" x2="22" y2="9.5"/><path d="M16 15.5h4"/></svg> شيك: ' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="2" y="5" width="20" height="14" rx="2.2"/><line x1="2" y1="9.5" x2="22" y2="9.5"/><path d="M16 15.5h4"/></svg> Chèque : ') + '#' + d.num, body: `${d.owner} - ${d.amount} DH`, time: d.date }); });
      globalData.stock.forEach(d => { if (d.date) allTimedItems.push({ id: 'stk_' + d.id, title: currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/></svg> تنبيه مخزن' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/></svg> Alerte stock', body: d.name, time: d.date }); });
      globalData.installations.forEach(d => { if (d.date) allTimedItems.push({ id: 'srv_' + d.id, title: (currentLang === 'ar' ? '🛠️ موعد: ' : '🛠️ RDV : ') + d.client, body: d.service, time: d.date }); });
      globalData.notes.forEach(d => { if (d.datetime) allTimedItems.push({ id: 'nts_' + d.id, title: currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="4" y="3" width="14" height="18" rx="1.4"/><line x1="7" y1="8" x2="14" y2="8"/><line x1="7" y1="12" x2="11.5" y2="12"/></svg> تذكير' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="4" y="3" width="14" height="18" rx="1.4"/><line x1="7" y1="8" x2="14" y2="8"/><line x1="7" y1="12" x2="11.5" y2="12"/></svg> Rappel', body: d.text, time: d.datetime }); });

      allTimedItems.forEach(item => {
        const dueTime = new Date(item.time);
        const remainingMs = dueTime - now;
        // نبعثو الإشعار غير مرة وحدة، بمجرد ما الوقت المتبقي يوصل لقيمة "التنبيه المسبق" المختارة فالإعدادات
        if (remainingMs <= leadMs && remainingMs > leadMs - 2 * 60 * 1000 && !notifiedIds.includes(item.id)) {
          showLocalNotification(item.title, item.body);
          addNotifiedId(item.id);
        }
      });
    }

    setInterval(checkDueNotifications, 60000);

    // ==================== 🔍 Search / Filter ====================
    let searchQueries = { cheques: '', stock: '', installations: '', notes: '' };
    const searchListIds = { cheques: 'cheques-list', stock: 'stock-list', installations: 'install-list', notes: 'notes-list' };

    function onSearchInput(section, value) {
      searchQueries[section] = value;
      applySearchFilter(section);
    }

    function applySearchFilter(section) {
      const query = searchQueries[section].trim().toLowerCase();
      const list = document.getElementById(searchListIds[section]);
      if (!list) return;
      const cards = list.querySelectorAll('.item-card');
      cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = (!query || text.includes(query)) ? '' : 'none';
      });
    }

    // ==================== 🔍 Global Search (Home) ====================
    function searchAllData(query) {
      let results = [];
      globalData.cheques.forEach(d => {
        const text = `${d.num} ${d.owner} ${d.amount} ${d.type}`.toLowerCase();
        if (text.includes(query)) results.push({ section: 'cheques-section', icon: '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="2" y="5" width="20" height="14" rx="2.2"/><line x1="2" y1="9.5" x2="22" y2="9.5"/><path d="M16 15.5h4"/></svg>', title: `#${d.num} - ${d.owner}`, sub: `${d.amount} DH | ${d.type}` });
      });
      globalData.stock.forEach(d => {
        const text = `${d.name} ${d.qty} ${d.price || ''}`.toLowerCase();
        if (text.includes(query)) results.push({ section: 'stock-section', icon: '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/></svg>', title: d.name, sub: `Qty: ${d.qty} | ${d.price || 0} DH` });
      });
      globalData.installations.forEach(d => {
        const text = `${d.client} ${d.phone || ''} ${d.clim || ''} ${d.service}`.toLowerCase();
        if (text.includes(query)) results.push({ section: 'install-section', icon: '🛠️', title: d.client, sub: `${d.service} | <svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11.2 21 3 12.8 3 3.7c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1z"/></svg> ${d.phone || '-'}` });
      });
      globalData.notes.forEach(d => {
        const text = `${d.text}`.toLowerCase();
        if (text.includes(query)) results.push({ section: 'notes-section', icon: '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="4" y="3" width="14" height="18" rx="1.4"/><line x1="7" y1="8" x2="14" y2="8"/><line x1="7" y1="12" x2="11.5" y2="12"/></svg>', title: d.text.length > 50 ? d.text.slice(0, 50) + '…' : d.text, sub: '' });
      });
      return results;
    }

    function onGlobalSearchInput(value) {
      const query = value.trim().toLowerCase();
      const gridMenu = document.getElementById('home-grid-menu');
      const resultsBox = document.getElementById('global-search-results');

      if (!query) {
        gridMenu.style.display = '';
        resultsBox.style.display = 'none';
        resultsBox.innerHTML = '';
        return;
      }

      gridMenu.style.display = 'none';
      resultsBox.style.display = 'block';

      const results = searchAllData(query);
      if (results.length === 0) {
        resultsBox.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:20px;">${currentLang === 'ar' ? 'لا توجد نتائج' : 'Aucun résultat'}</div>`;
        return;
      }

      resultsBox.innerHTML = results.map(r => `
        <div class="item-card" onclick="openSection('${r.section}')" style="cursor:pointer;">
          <div class="item-header"><span class="item-title">${r.icon} ${r.title}</span></div>
          ${r.sub ? `<div class="item-sub">${r.sub}</div>` : ''}
        </div>
      `).join('');
    }

