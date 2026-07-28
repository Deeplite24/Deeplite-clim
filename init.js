    // ==================== Bootstrap final : تشغيل التطبيق بعد تحميل كل الوحدات ====================
    // هاد الملف كيتحمل فالأخير على قصد، حيت الكود لي فيه (خصوصا onAuthStateChanged) كيستدعي
    // دوال معرفة فملفات أخرين (data.js, ui.js, chat.js...) وخاصهم يكونو تعرفو قبل ما يتشغل هاد الكود.
    auth.onAuthStateChanged(user => {
      if (user) {
        currentUid = user.uid;
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        loadUserData(currentUid);
        loadUserProfile(currentUid);
        renderAccountSwitcher();
        ensureDeviceProfile();
        startGroupsListeners();
        startMembersListener(currentUid);
        startPrivateChatsListener(currentUid);
        startNavShortcutsListener(currentUid);
        upsertMember();
        initExternalFeatures();
      } else {
        currentUid = null;
        stopNavShortcutsListener();
        if (ownedGroupsUnsub) { ownedGroupsUnsub(); ownedGroupsUnsub = null; }
        if (externalGroupsUnsub) { externalGroupsUnsub(); externalGroupsUnsub = null; }
        if (groupMsgsUnsub) { groupMsgsUnsub(); groupMsgsUnsub = null; }
        ownedGroupsCache = []; externalGroupsCache = []; groupMsgsCache = []; currentGroupId = null;
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

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }
