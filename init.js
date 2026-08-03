    // ==================== Bootstrap final : تشغيل التطبيق بعد تحميل كل الوحدات ====================
    // هاد الملف كيتحمل فالأخير على قصد، حيت الكود لي فيه (خصوصا onAuthStateChanged) كيستدعي
    // دوال معرفة فملفات أخرين (data.js, ui.js, chat.js...) وخاصهم يكونو تعرفو قبل ما يتشغل هاد الكود.
    // كيخبي شاشة الترحيب (splash) بمجرد ما فايربيس يجاوب على حالة الدخول
    function hideAppSplash() {
      const splash = document.getElementById('app-splash');
      if (!splash) return;
      splash.classList.add('splash-hide');
      setTimeout(() => splash.remove(), 400);
    }

    auth.onAuthStateChanged(user => {
      hideAppSplash();
      if (user) {
        currentUid = user.uid;
        document.getElementById('auth-section').style.display = 'none';
        loadUserCompanyContext(currentUid).then(companyId => {
          if (!companyId) {
            // المستخدم عندو حساب Firebase صحيح، ولكن ماشي مرتبط بأي شركة بعد
            // (تسجيل أول مرة، أو الاسم مازال خاصو يتعمر) → نبينو له شاشة خلق/انضمام شركة
            document.getElementById('app-content').style.display = 'none';
            if (typeof openCompanySetupScreen === 'function') openCompanySetupScreen();
            return;
          }
          document.getElementById('company-setup-section').style.display = 'none';
          document.getElementById('app-content').style.display = 'block';
          // TODO (الخطوة الجاية): loadUserData وباقي الـlisteners خاصهم يتبدلو
          // باش يقراو من companies/{currentCompanyId}/... عوض users/{currentUid}/...
          loadUserData(currentCompanyId);
          renderAccountSwitcher();
          ensureDeviceProfile();
          startGroupsListeners();
          // ⚠️ ماشي هنا startMembersListener/startPrivateChatsListener — loadUserData() (فـdata.js)
          // ولات كتديرهم من داخلها فكل تسجيل دخول. كان عندنا نداء مكرر هنا (مرتين فنفس اللحظة:
          // مرة من loadUserData ومرة هنا) كيخلق listener ويهدمو مباشرة قبل ما يوصل أول نتيجة —
          // هو السبب لي إشعارات الرسائل الخاصة كانت خاصرة أحياناً بخلاف الكروبات (startGroupsListeners
          // كتنداوى مرة وحدة غير).
          upsertMember();
          initExternalFeatures();
          if (typeof toggleAdminInviteButton === 'function') toggleAdminInviteButton();
        });
      } else {
        currentUid = null;
        currentCompanyId = null;
        currentUserRole = null;
        document.getElementById('company-setup-section').style.display = 'none';
        if (ownedGroupsUnsub) { ownedGroupsUnsub(); ownedGroupsUnsub = null; }
        if (externalGroupsUnsub) { externalGroupsUnsub(); externalGroupsUnsub = null; }
        if (groupMsgsUnsub) { groupMsgsUnsub(); groupMsgsUnsub = null; }
        ownedGroupsCache = []; externalGroupsCache = []; groupMsgsCache = []; currentGroupId = null;
        if (typeof companyInfoUnsubscribe !== 'undefined' && companyInfoUnsubscribe) { companyInfoUnsubscribe(); companyInfoUnsubscribe = null; }
        if (typeof companyInfoCache !== 'undefined') companyInfoCache = null;
        if (membersUnsubscribe) { membersUnsubscribe(); membersUnsubscribe = null; }
        teamMembersCache = [];
        if (privateChatsUnsubscribe) { privateChatsUnsubscribe(); privateChatsUnsubscribe = null; }
        privateChatsCache = [];
        if (privateMsgsUnsubscribe) { privateMsgsUnsubscribe(); privateMsgsUnsubscribe = null; }
        privateMsgsCache = [];
        currentPrivateChatWith = null;
        if (externalInvitesUnsubIn) { externalInvitesUnsubIn(); externalInvitesUnsubIn = null; }
        if (externalInvitesUnsubOut) { externalInvitesUnsubOut(); externalInvitesUnsubOut = null; }
        externalInvitesInCache = []; externalInvitesOutCache = [];
        if (externalChatsUnsub) { externalChatsUnsub(); externalChatsUnsub = null; }
        externalChatsCache = [];
        if (externalMsgsUnsub) { externalMsgsUnsub(); externalMsgsUnsub = null; }
        externalMsgsCache = [];
        currentExternalChatKey = null; currentExternalChatWith = null;
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('app-content').style.display = 'none';
      }
    });

    applyLanguage();
    applyNotifSettingsSelects();

    // ⚠️ إصلاح: بزاف ديال متصفحات الهاتف كيقطعو الاتصال الدائم (WebSocket) ديال Firestore
    // ملي التطبيق يبقى فالخلفية (شاشة مسكرة / تبديل لتطبيق آخر)، ومايعاودوش يوصلوه
    // تلقائيا ملي ترجع للتطبيق — فتبقى كل الـlisteners (إشعارات، رسائل...) "خاصرة" بلا ما
    // تبان أي error، حتى تسكر التطبيق وتعاود تحلو من جديد. هاد الكود كيجبر Firestore
    // يعاود يتأكد من الاتصال ملي الصفحة توالي ظاهرة (visible) من جديد.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && typeof db !== 'undefined' && db) {
        db.disableNetwork().then(() => db.enableNetwork()).catch(() => {});
      }
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }
