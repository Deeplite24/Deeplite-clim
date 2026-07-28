const firebaseConfig = {
      apiKey: "AIzaSyA2hKP_SOEA3pnNs1g3CVDXUWdDQzkap0E",
      authDomain: "deeplite-514a2.firebaseapp.com",
      projectId: "deeplite-514a2",
      storageBucket: "deeplite-514a2.firebasestorage.app",
      messagingSenderId: "665734874626",
      appId: "1:665734874626:web:34c006c8a1bde6f7d3491b"
    };

    if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    const auth = firebase.auth();
    const db = firebase.firestore();

    // تفعيل العمل بدون إنترنت (offline persistence) — البيانات تبقى محفوظة محليا وتتزامن أوتوماتيكيا عند رجوع الاتصال
    db.enablePersistence({ synchronizeTabs: true }).catch(err => {
      if (err.code === 'failed-precondition') {
        console.warn('Offline persistence: تبويب آخر مفتوح، التفعيل غير ممكن فهاد التبويب.');
      } else if (err.code === 'unimplemented') {
        console.warn('Offline persistence: المتصفح ماعندوش الدعم اللازم.');
      }
    });

    let currentLang = 'ar';

    // بعض النصوص فالتطبيق فيها رموز SVG مبنية باش تبان فالواجهة (innerHTML).
    // alert() وإشعارات المتصفح (Notification) ماكيقدروش يعرضو HTML، فكيبان الكود خام.
    // هاد الدالة كتمسح أي وسم HTML/SVG قبل ما النص يوصل لهادشي.
    function stripTags(str) {
      return String(str == null ? '' : str).replace(/<[^>]*>/g, '').replace(/\s{2,}/g, ' ').trim();
    }
    const __nativeAlert = window.alert.bind(window);
    window.alert = function (msg) { __nativeAlert(stripTags(msg)); };
    let globalData = { cheques: [], stock: [], installations: [], notes: [] };
    let currentUid = null;

    // 🕓 من بدل شنو ومتى — باش نتفاداو تعارض البيانات بين الأجهزة
    let currentUserProfile = null;
    let selectedAvatarValue = '';
    let selectedAvatarIsPhoto = false;
    let forceProfileSetup = false;

    function currentUserLabel() {
      if (currentUserProfile && (currentUserProfile.firstName || currentUserProfile.lastName)) {
        return `${currentUserProfile.firstName || ''} ${currentUserProfile.lastName || ''}`.trim();
      }
      return (auth.currentUser && auth.currentUser.email) ? auth.currentUser.email.split('@')[0] : '?';
    }

    function getProfileDisplayName() { return currentUserLabel(); }

    function selectAvatarOption(el) {
      document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      selectedAvatarValue = el.getAttribute('data-avatar');
      selectedAvatarIsPhoto = false;
      document.getElementById('profile-photo-preview').innerHTML = '';
    }

    function handleProfilePhotoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement('canvas');
          const size = 150;
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d');
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          selectedAvatarValue = dataUrl;
          selectedAvatarIsPhoto = true;
          document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
          document.getElementById('profile-photo-preview').innerHTML = `<img src="${dataUrl}">`;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    function openProfileModal(forced) {
      forceProfileSetup = !!forced;
      document.getElementById('profile-close-btn').style.display = forceProfileSetup ? 'none' : 'inline-block';
      document.getElementById('profile-firstname').value = currentUserProfile ? (currentUserProfile.firstName || '') : '';
      document.getElementById('profile-lastname').value = currentUserProfile ? (currentUserProfile.lastName || '') : '';
      selectedAvatarValue = currentUserProfile ? (currentUserProfile.avatar || '') : '';
      selectedAvatarIsPhoto = currentUserProfile ? !!currentUserProfile.avatarIsPhoto : false;
      document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
      document.getElementById('profile-photo-preview').innerHTML = '';
      if (selectedAvatarIsPhoto && selectedAvatarValue) {
        document.getElementById('profile-photo-preview').innerHTML = `<img src="${selectedAvatarValue}">`;
      } else if (selectedAvatarValue) {
        const match = document.querySelector(`.avatar-option[data-avatar="${selectedAvatarValue}"]`);
        if (match) match.classList.add('selected');
      }
      document.getElementById('profile-setup-modal').classList.add('show');
    }

    function closeProfileModal() {
      if (forceProfileSetup) {
        alert(currentLang === 'ar' ? "المرجو ملء الاسم واللقب أولاً!" : "Veuillez d'abord remplir le nom et prénom !");
        return;
      }
      document.getElementById('profile-setup-modal').classList.remove('show');
    }

    function saveProfileInfo() {
      const firstName = document.getElementById('profile-firstname').value.trim();
      const lastName = document.getElementById('profile-lastname').value.trim();
      if (!firstName || !lastName) {
        alert(currentLang === 'ar' ? "المرجو ملء الاسم واللقب!\nVeuillez remplir le nom et le prénom !" : "Veuillez remplir le nom et le prénom !\nالمرجو ملء الاسم واللقب!");
        return;
      }
      if (!currentUid) return;
      const profileData = {
        firstName, lastName,
        avatar: selectedAvatarValue || '',
        avatarIsPhoto: selectedAvatarIsPhoto
      };
      db.collection('users').doc(currentUid).collection('profile').doc('info').set(profileData).then(() => {
        currentUserProfile = profileData;
        forceProfileSetup = false;
        document.getElementById('profile-setup-modal').classList.remove('show');
        if (typeof renderAccountSwitcher === 'function') renderAccountSwitcher();
      });
    }

    function loadUserProfile(uid) {
      db.collection('users').doc(uid).collection('profile').doc('info').get().then(doc => {
        if (doc.exists) {
          currentUserProfile = doc.data();
          if (typeof renderAccountSwitcher === 'function') renderAccountSwitcher();
        } else {
          currentUserProfile = null;
          openProfileModal(true);
        }
      });
    }

    // ==================== 📱Device Profile (خاص بكل جهاز، حتى ولو الحساب مشترك) ====================
    let deviceProfile = null;
    let selectedDeviceAvatarValue = '';
    let selectedDeviceAvatarIsPhoto = false;

    function getDeviceId() {
      let id = localStorage.getItem('deeplite_device_id');
      if (!id) {
        id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('deeplite_device_id', id);
      }
      return id;
    }

    function getDeviceProfile() {
      try { return JSON.parse(localStorage.getItem('deeplite_device_profile') || 'null'); } catch (e) { return null; }
    }

    function setDeviceProfile(profile) {
      localStorage.setItem('deeplite_device_profile', JSON.stringify(profile));
      deviceProfile = profile;
    }

    function ensureDeviceProfile() {
      deviceProfile = getDeviceProfile();
      if (!deviceProfile || (!deviceProfile.firstName && !deviceProfile.lastName)) {
        openDeviceProfileModal(true);
      }
    }

    function selectDeviceAvatarOption(el) {
      document.querySelectorAll('#device-avatar-picker .avatar-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      selectedDeviceAvatarValue = el.getAttribute('data-avatar');
      selectedDeviceAvatarIsPhoto = false;
      document.getElementById('device-profile-photo-preview').innerHTML = '';
    }

    function handleDeviceProfilePhotoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement('canvas');
          const size = 150;
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d');
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          selectedDeviceAvatarValue = dataUrl;
          selectedDeviceAvatarIsPhoto = true;
          document.querySelectorAll('#device-avatar-picker .avatar-option').forEach(o => o.classList.remove('selected'));
          document.getElementById('device-profile-photo-preview').innerHTML = `<img src="${dataUrl}">`;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    function openDeviceProfileModal(forced) {
      const p = getDeviceProfile();
      document.getElementById('device-profile-close-btn').style.display = forced ? 'none' : 'inline-block';
      document.getElementById('device-profile-firstname').value = p ? (p.firstName || '') : '';
      document.getElementById('device-profile-lastname').value = p ? (p.lastName || '') : '';
      document.getElementById('device-profile-phone').value = p ? (p.phone || '') : '';
      document.getElementById('device-profile-email').value = p ? (p.email || '') : '';
      selectedDeviceAvatarValue = p ? (p.avatar || '') : '';
      selectedDeviceAvatarIsPhoto = p ? !!p.avatarIsPhoto : false;
      document.querySelectorAll('#device-avatar-picker .avatar-option').forEach(o => o.classList.remove('selected'));
      document.getElementById('device-profile-photo-preview').innerHTML = '';
      if (selectedDeviceAvatarIsPhoto && selectedDeviceAvatarValue) {
        document.getElementById('device-profile-photo-preview').innerHTML = `<img src="${selectedDeviceAvatarValue}">`;
      } else if (selectedDeviceAvatarValue) {
        const match = document.querySelector(`#device-avatar-picker .avatar-option[data-avatar="${selectedDeviceAvatarValue}"]`);
        if (match) match.classList.add('selected');
      }
      document.getElementById('device-profile-modal').classList.add('show');
    }

    function closeDeviceProfileModal() {
      const p = getDeviceProfile();
      if (!p || (!p.firstName && !p.lastName)) {
        alert(currentLang === 'ar' ? "المرجو ملء الاسم واللقب أولاً!\nVeuillez d'abord remplir le nom et prénom !" : "Veuillez d'abord remplir le nom et prénom !\nالمرجو ملء الاسم واللقب أولاً!");
        return;
      }
      document.getElementById('device-profile-modal').classList.remove('show');
    }

    function saveDeviceProfileInfo() {
      const firstName = document.getElementById('device-profile-firstname').value.trim();
      const lastName = document.getElementById('device-profile-lastname').value.trim();
      const phone = document.getElementById('device-profile-phone').value.trim();
      const email = document.getElementById('device-profile-email').value.trim().toLowerCase();
      if (!firstName || !lastName) {
        alert(currentLang === 'ar' ? "المرجو ملء الاسم واللقب!\nVeuillez remplir le nom et le prénom !" : "Veuillez remplir le nom et le prénom !\nالمرجو ملء الاسم واللقب!");
        return;
      }
      const existing = getDeviceProfile();
      setDeviceProfile({ firstName, lastName, phone, email, code: existing ? existing.code : undefined, avatar: selectedDeviceAvatarValue || '', avatarIsPhoto: selectedDeviceAvatarIsPhoto });
      document.getElementById('device-profile-modal').classList.remove('show');
      renderChatMessages();
      upsertMember();
      initExternalFeatures();
      publishMyEmail();
    }

    function deviceDisplayName(p) {
      if (!p) return '?';
      return `${p.firstName || ''} ${p.lastName || ''}`.trim() || '?';
    }

    function deviceAvatarHtml(p) {
      if (p && p.avatarIsPhoto && p.avatar) return `<img src="${p.avatar}">`;
      if (p && p.avatar) return p.avatar;
      return '🙂';
    }

    // ==================== Groupes (متعددين، بحال واتساب: كل مجموعة بالأعضاء والدردشة ديالها) ====================
    let ownedGroupsCache = [];      // المجموعات ديال الحساب ديالي (currentUid هو صاحبها)
    let externalGroupsCache = [];   // مجموعات ديال حسابات أخرين تزدت ليهم بالكود
    let ownedGroupsUnsub = null;
    let externalGroupsUnsub = null;
    let currentGroupId = null;
    let groupMsgsUnsub = null;
    let groupMsgsCache = [];

    function startGroupsListeners() {
      if (ownedGroupsUnsub) { ownedGroupsUnsub(); ownedGroupsUnsub = null; }
      if (externalGroupsUnsub) { externalGroupsUnsub(); externalGroupsUnsub = null; }
      ownedGroupsCache = []; externalGroupsCache = [];
      if (!currentUid) return;
      ownedGroupsUnsub = db.collection('groups').where('ownerUid', '==', currentUid).onSnapshot(snap => {
        ownedGroupsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderGroupsList();
        updateChatUnreadBadge();
        updateBellNotifications();
      }, () => {});
      const p = getDeviceProfile();
      if (p && p.code) {
        externalGroupsUnsub = db.collection('groups').where('externalMemberCodes', 'array-contains', p.code).onSnapshot(snap => {
          externalGroupsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          renderGroupsList();
          updateChatUnreadBadge();
          updateBellNotifications();
        }, () => {});
      }
    }

    function restartExternalGroupsListenerIfNeeded() {
      const p = getDeviceProfile();
      if (!externalGroupsUnsub && p && p.code && currentUid) {
        externalGroupsUnsub = db.collection('groups').where('externalMemberCodes', 'array-contains', p.code).onSnapshot(snap => {
          externalGroupsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          renderGroupsList();
          updateChatUnreadBadge();
          updateBellNotifications();
        }, () => {});
      }
    }

    function myVisibleGroups() {
      const myId = getDeviceId();
      const internal = ownedGroupsCache.filter(g => (g.memberIds || []).includes(myId));
      return internal.concat(externalGroupsCache);
    }

    function findGroupById(id) {
      return ownedGroupsCache.find(g => g.id === id) || externalGroupsCache.find(g => g.id === id);
    }

    function isGroupExternalForMe(g) {
      return !!g && g.ownerUid !== currentUid;
    }

    function myGroupSenderKey(g) {
      if (!g) return null;
      if (isGroupExternalForMe(g)) { const p = getDeviceProfile(); return p ? p.code : null; }
      return getDeviceId();
    }

    function renderGroupsList() {
      const box = document.getElementById('groups-list');
      if (!box) return;
      const groups = myVisibleGroups();
      if (!groups.length) {
        box.innerHTML = `<div class="chat-empty">${currentLang === 'ar' ? 'لا توجد أي مجموعة حتى الآن، أنشئ مجموعة جديدة أو انضم برمز!' : 'Aucun groupe pour le moment, créez-en un ou rejoignez avec un code !'}</div>`;
        return;
      }
      box.innerHTML = groups.slice().sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || '')).map(g => {
        const key = myGroupSenderKey(g);
        const unread = (g.unread && key && g.unread[key]) || 0;
        return `<div class="members-list-item" onclick="openGroupChat('${g.id}')">
          <div class="members-list-avatar"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="8.5" cy="8" r="3"/><circle cx="16.2" cy="9" r="2.6"/><path d="M3 19c.7-3 3-4.8 5.7-4.8S13.8 16 14.5 19"/><path d="M14.9 14.5c2.1.4 3.6 1.9 4.1 4.4"/></svg></div>
          <div class="members-list-info">
            <div class="members-list-name">${escapeChatText(g.name || '')}</div>
            <div class="members-list-preview">${g.lastMessage ? escapeChatText(g.lastMessage) : (currentLang === 'ar' ? 'ابدأ الدردشة' : 'Démarrer la discussion')}</div>
          </div>
          ${unread > 0 ? `<span class="members-list-badge">${unread > 9 ? '9+' : unread}</span>` : ''}
        </div>`;
      }).join('');
    }

    function openCreateGroupModal() {
      document.getElementById('cg-name-input').value = '';
      const myId = getDeviceId();
      const others = teamMembersCache.filter(m => m.id !== myId && !isMemberBlocked(m));
      const box = document.getElementById('cg-members-list');
      if (!others.length) {
        box.innerHTML = `<div style="font-size:12px; color:#94a3b8;">${currentLang === 'ar' ? 'لا يوجد موظفون آخرون حالياً، يمكنك إضافتهم لاحقاً من إعدادات المجموعة.' : 'Aucun autre employé pour le moment, vous pourrez en ajouter depuis les réglages du groupe.'}</div>`;
      } else {
        box.innerHTML = others.map(m => {
          const avatarHtml = m.avatarIsPhoto && m.avatar ? `<img src="${m.avatar}">` : (m.avatar || '🙂');
          return `<label style="display:flex; align-items:center; gap:8px; padding:6px 0; cursor:pointer;">
            <input type="checkbox" value="${m.id}" class="cg-member-cb">
            <span style="font-size:18px;">${avatarHtml}</span>
            <span>${deviceDisplayName(m)}</span>
          </label>`;
        }).join('');
      }
      document.getElementById('create-group-modal').classList.add('show');
    }

    function closeCreateGroupModal() {
      document.getElementById('create-group-modal').classList.remove('show');
    }

    function submitCreateGroup() {
      if (!currentUid) return;
      const name = document.getElementById('cg-name-input').value.trim();
      if (!name) { alert(currentLang === 'ar' ? 'أدخل اسم المجموعة!\nEntrez un nom de groupe !' : 'Entrez un nom de groupe !\nأدخل اسم المجموعة!'); return; }
      const p = getDeviceProfile();
      if (!p || (!p.firstName && !p.lastName)) { closeCreateGroupModal(); openDeviceProfileModal(true); return; }
      const myId = getDeviceId();
      const chosen = Array.from(document.querySelectorAll('.cg-member-cb:checked')).map(cb => cb.value);
      const memberIds = Array.from(new Set([myId, ...chosen]));
      generateUniqueGroupCode(code => {
        db.collection('groups').add({
          ownerUid: currentUid,
          name,
          inviteCode: code,
          memberIds,
          externalMemberCodes: [],
          externalMembers: {},
          unread: {},
          lastMessage: '',
          lastMessageAt: new Date().toISOString(),
          createdBy: myId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(docRef => {
          closeCreateGroupModal();
          openGroupChat(docRef.id);
        });
      });
    }

    function generateUniqueGroupCode(cb, attemptsLeft) {
      if (attemptsLeft === undefined) attemptsLeft = 8;
      if (attemptsLeft <= 0) { cb(generateRandomCode()); return; }
      const candidate = generateRandomCode();
      db.collection('groups').where('inviteCode', '==', candidate).limit(1).get().then(snap => {
        if (!snap.empty) { generateUniqueGroupCode(cb, attemptsLeft - 1); return; }
        cb(candidate);
      }).catch(() => cb(candidate));
    }

    function joinGroupByCode() {
      const input = document.getElementById('groups-join-code-input');
      const code = (input.value || '').trim().toUpperCase();
      if (!code) return;
      const p = getDeviceProfile();
      if (!p || (!p.firstName && !p.lastName)) { openDeviceProfileModal(true); return; }
      ensureMyCode(myCode => {
        db.collection('groups').where('inviteCode', '==', code).limit(1).get().then(snap => {
          if (snap.empty) { alert(currentLang === 'ar' ? 'لا توجد مجموعة بهذا الرمز، يرجى التأكد منه!\nAucun groupe avec ce code, vérifiez-le !' : 'Aucun groupe avec ce code, vérifiez-le !\nلا توجد مجموعة بهذا الرمز، يرجى التأكد منه!'); return; }
          const doc = snap.docs[0];
          const g = doc.data();
          if (g.ownerUid === currentUid && (g.memberIds || []).includes(getDeviceId())) {
            input.value = '';
            openGroupChat(doc.id);
            return;
          }
          if ((g.externalMemberCodes || []).includes(myCode)) {
            input.value = '';
            openGroupChat(doc.id);
            return;
          }
          const update = {
            externalMemberCodes: firebase.firestore.FieldValue.arrayUnion(myCode),
            ['externalMembers.' + myCode]: { uid: currentUid, deviceId: getDeviceId(), name: deviceDisplayName(p), avatar: p.avatar || '', avatarIsPhoto: !!p.avatarIsPhoto },
            ['unread.' + myCode]: 0
          };
          doc.ref.update(update).then(() => {
            input.value = '';
            restartExternalGroupsListenerIfNeeded();
            setTimeout(() => openGroupChat(doc.id), 300);
          });
        }).catch(() => {});
      });
    }

    function openGroupChat(groupId) {
      const g = findGroupById(groupId);
      if (!g) return;
      currentGroupId = groupId;
      document.getElementById('chat-title-t').innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 5h16v10.5H10.5L6 19v-3.5H4z"/></svg> ' + (g.name || '');
      const gearBtn = document.getElementById('chat-group-settings-btn');
      if (gearBtn) gearBtn.style.display = isGroupExternalForMe(g) ? 'none' : 'inline-block';
      openSection('chat-section');
      startGroupMessagesListener(groupId);
      resetGroupUnreadForMe(groupId);
      markGroupJoinSeen(groupId);
      updateMsgsNotifications();
    }

    function closeGroupChat() {
      currentGroupId = null;
      if (groupMsgsUnsub) { groupMsgsUnsub(); groupMsgsUnsub = null; }
      groupMsgsCache = [];
      openSection('groups-list-section');
    }

    function resetGroupUnreadForMe(groupId) {
      const g = findGroupById(groupId);
      const key = myGroupSenderKey(g);
      if (!key) return;
      db.collection('groups').doc(groupId).update({ ['unread.' + key]: 0 }).catch(() => {});
    }

    function startGroupMessagesListener(groupId) {
      if (groupMsgsUnsub) { groupMsgsUnsub(); groupMsgsUnsub = null; }
      groupMsgsCache = [];
      groupMsgsUnsub = db.collection('groups').doc(groupId).collection('messages').orderBy('createdAt', 'asc').onSnapshot(snap => {
        groupMsgsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderChatMessages();
        const chatSec = document.getElementById('chat-section');
        if (chatSec && chatSec.classList.contains('active')) {
          markVisibleMessagesSeen();
          scrollChatToBottom();
        }
      }, () => {});
    }

    function sendChatMessage() {
      if (!currentGroupId) return;
      const g = findGroupById(currentGroupId);
      if (!g) return;
      const input = document.getElementById('chat-input');
      const text = input.value.trim();
      if (!text) return;
      const p = getDeviceProfile();
      if (!p || (!p.firstName && !p.lastName)) { openDeviceProfileModal(true); return; }
      const external = isGroupExternalForMe(g);
      const myKey = myGroupSenderKey(g);
      if (!myKey) return;
      if (!external) {
        const myself = teamMembersCache.find(x => x.id === myKey);
        if (isMemberBlocked(myself)) {
          alert(currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> تم حظرك، ماتقدرش تصيفط رسائل.' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Vous avez été bloqué, vous ne pouvez pas envoyer de messages.');
          return;
        }
      }
      const msg = {
        text,
        senderKey: myKey,
        isExternalSender: external,
        senderName: deviceDisplayName(p),
        senderAvatar: p.avatar || '',
        senderAvatarIsPhoto: !!p.avatarIsPhoto,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        seenBy: {}
      };
      msg.seenBy[myKey] = { name: deviceDisplayName(p), avatar: p.avatar || '', avatarIsPhoto: !!p.avatarIsPhoto, seenAt: new Date().toISOString() };
      const allKeys = (g.memberIds || []).concat(g.externalMemberCodes || []);
      const unreadUpdate = {};
      allKeys.forEach(k => { if (k !== myKey) unreadUpdate['unread.' + k] = firebase.firestore.FieldValue.increment(1); });
      unreadUpdate['unread.' + myKey] = 0;
      unreadUpdate.lastMessage = text;
      unreadUpdate.lastMessageAt = new Date().toISOString();
      db.collection('groups').doc(currentGroupId).collection('messages').add(msg).then(() => {
        db.collection('groups').doc(currentGroupId).update(unreadUpdate).catch(() => {});
        input.value = '';
        scrollChatToBottom();
      });
    }

    function renderChatMessages() {
      const box = document.getElementById('chat-messages');
      if (!box) return;
      if (!groupMsgsCache.length) {
        box.innerHTML = `<div class="chat-empty" id="chat-loading-txt">${currentLang === 'ar' ? 'لا توجد رسائل بعد، ابدأ الدردشة!' : 'Aucun message pour le moment, lancez la conversation !'}</div>`;
        return;
      }
      const g = findGroupById(currentGroupId);
      const myKey = myGroupSenderKey(g);
      box.innerHTML = groupMsgsCache.map(m => {
        const mine = m.senderKey === myKey;
        const avatarHtml = m.senderAvatarIsPhoto && m.senderAvatar ? `<img src="${m.senderAvatar}">` : (m.senderAvatar || '🙂');
        let timeStr = '';
        try {
          if (m.createdAt && m.createdAt.toDate) timeStr = m.createdAt.toDate().toLocaleTimeString(currentLang === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {}

        let seenHtml = '';
        if (mine && m.seenBy) {
          const others = Object.keys(m.seenBy).filter(id => id !== m.senderKey);
          if (others.length > 0) {
            const avatars = others.map(id => {
              const s = m.seenBy[id];
              const av = s && s.avatarIsPhoto && s.avatar ? `<img src="${s.avatar}">` : ((s && s.avatar) || '🙂');
              return `<span class="chat-seen-avatar" title="${s ? (s.name || '') : ''}">${av}</span>`;
            }).join('');
            seenHtml = `<div class="chat-seen-row">${avatars}<span class="chat-seen-label seen">✓✓</span></div>`;
          } else {
            seenHtml = `<div class="chat-seen-row"><span class="chat-seen-label">✓</span></div>`;
          }
        }

        const clickable = !m.isExternalSender;
        return `
          <div class="chat-msg-row ${mine ? 'mine' : ''}" data-msg-id="${m.id}">
            <div class="chat-avatar ${clickable ? 'clickable' : ''}" ${clickable ? `onclick="showMemberInfo('${m.senderKey}')"` : ''}>${avatarHtml}</div>
            <div class="chat-bubble-col">
              ${mine ? '' : `<div class="chat-sender-name ${clickable ? 'clickable' : ''}" ${clickable ? `onclick="showMemberInfo('${m.senderKey}')"` : ''}>${(m.senderName || '?')}</div>`}
              <div class="chat-bubble">${escapeChatText(m.text || '')}</div>
              <div class="chat-meta-row">${timeStr}</div>
              ${seenHtml}
            </div>
          </div>`;
      }).join('');
    }

    function escapeChatText(str) {
      const div = document.createElement('div');
      div.innerText = str;
      return div.innerHTML;
    }

    function markVisibleMessagesSeen() {
      if (!currentGroupId) return;
      const g = findGroupById(currentGroupId);
      const p = getDeviceProfile();
      if (!p || !g) return;
      const myKey = myGroupSenderKey(g);
      if (!myKey) return;
      groupMsgsCache.forEach(m => {
        if (m.senderKey !== myKey && (!m.seenBy || !m.seenBy[myKey])) {
          const update = {};
          update['seenBy.' + myKey] = { name: deviceDisplayName(p), avatar: p.avatar || '', avatarIsPhoto: !!p.avatarIsPhoto, seenAt: new Date().toISOString() };
          db.collection('groups').doc(currentGroupId).collection('messages').doc(m.id).update(update).catch(() => {});
        }
      });
    }

    function computeGroupChatUnread() {
      const myId = getDeviceId();
      const p = getDeviceProfile();
      let total = 0;
      ownedGroupsCache.forEach(g => { if ((g.memberIds || []).includes(myId)) total += (g.unread && g.unread[myId]) || 0; });
      if (p && p.code) externalGroupsCache.forEach(g => { total += (g.unread && g.unread[p.code]) || 0; });
      return total;
    }

    function updateChatUnreadBadge() {
      const badge = document.getElementById('chat-unread-badge');
      const homeBadge = document.getElementById('badge-chat');
      const unread = computeGroupChatUnread() + computeTotalPrivateUnread();
      if (unread > 0) {
        if (badge) { badge.innerText = unread > 9 ? '9+' : String(unread); badge.style.display = 'flex'; }
        if (homeBadge) { homeBadge.innerText = unread > 9 ? '9+' : String(unread); homeBadge.style.display = 'flex'; }
      } else {
        if (badge) badge.style.display = 'none';
        if (homeBadge) homeBadge.style.display = 'none';
      }
    }

    function scrollChatToBottom() {
      const box = document.getElementById('chat-messages');
      if (box) box.scrollTop = box.scrollHeight;
    }

    // ==================== Group Settings (تسمية، زيادة/حذف أعضاء، الكود، حذف المجموعة) ====================
    function openGroupSettings() {
      if (!currentGroupId) return;
      const g = findGroupById(currentGroupId);
      if (!g || isGroupExternalForMe(g)) return;
      document.getElementById('gs-name-input').value = g.name || '';
      document.getElementById('gs-invite-code').innerText = g.inviteCode || '------';
      renderGroupCurrentMembers(g);
      renderGroupAddMembers(g);
      document.getElementById('group-settings-modal').classList.add('show');
    }

    function closeGroupSettings() {
      document.getElementById('group-settings-modal').classList.remove('show');
    }

    function renderGroupCurrentMembers(g) {
      const box = document.getElementById('gs-current-members');
      if (!box) return;
      const myId = getDeviceId();
      let html = (g.memberIds || []).map(id => {
        const m = id === myId ? { ...(getDeviceProfile() || {}) } : teamMembersCache.find(x => x.id === id);
        const name = id === myId ? (currentLang === 'ar' ? 'راك أنت' : 'Vous') : (m ? deviceDisplayName(m) : id);
        const avatarHtml = m && m.avatarIsPhoto && m.avatar ? `<img src="${m.avatar}">` : ((m && m.avatar) || '🙂');
        const canRemove = id !== myId;
        return `<div class="members-list-item" style="cursor:default;">
          <div class="members-list-avatar">${avatarHtml}</div>
          <div class="members-list-info"><div class="members-list-name">${name}</div></div>
          ${canRemove ? `<button class="emp-btn emp-danger" onclick="removeGroupMember('${id}', false)">✕</button>` : ''}
        </div>`;
      }).join('');
      html += Object.keys(g.externalMembers || {}).map(code => {
        const em = g.externalMembers[code];
        const avatarHtml = em && em.avatarIsPhoto && em.avatar ? `<img src="${em.avatar}">` : ((em && em.avatar) || '🙂');
        return `<div class="members-list-item" style="cursor:default;">
          <div class="members-list-avatar">${avatarHtml}</div>
          <div class="members-list-info"><div class="members-list-name">${(em && em.name) || code}</div><span style="font-size:11px; color:#94a3b8;">${currentLang === 'ar' ? 'دخل بالكود' : 'Rejoint par code'}</span></div>
          <button class="emp-btn emp-danger" onclick="removeGroupMember('${code}', true)">✕</button>
        </div>`;
      }).join('');
      box.innerHTML = html || `<div class="chat-empty">${currentLang === 'ar' ? 'لا يوجد أعضاء' : 'Aucun membre'}</div>`;
    }

    function renderGroupAddMembers(g) {
      const box = document.getElementById('gs-add-members-list');
      if (!box) return;
      const notIn = teamMembersCache.filter(m => !(g.memberIds || []).includes(m.id) && !isMemberBlocked(m));
      if (!notIn.length) {
        box.innerHTML = `<div style="font-size:12px; color:#94a3b8;">${currentLang === 'ar' ? 'انضم الجميع بالفعل، لا يوجد موظفون آخرون لإضافتهم.' : 'Tout le monde est déjà dans le groupe.'}</div>`;
        return;
      }
      box.innerHTML = notIn.map(m => {
        const avatarHtml = m.avatarIsPhoto && m.avatar ? `<img src="${m.avatar}">` : (m.avatar || '🙂');
        return `<div class="members-list-item" onclick="addGroupMember('${m.id}')">
          <div class="members-list-avatar">${avatarHtml}</div>
          <div class="members-list-info"><div class="members-list-name">${deviceDisplayName(m)}</div></div>
          <span class="emp-btn emp-on">+ ${currentLang === 'ar' ? 'زيد' : 'Ajouter'}</span>
        </div>`;
      }).join('');
    }

    function addGroupMember(memberId) {
      if (!currentGroupId) return;
      db.collection('groups').doc(currentGroupId).update({
        memberIds: firebase.firestore.FieldValue.arrayUnion(memberId),
        ['unread.' + memberId]: 0
      }).then(() => {
        const g = findGroupById(currentGroupId);
        if (g) { g.memberIds = Array.from(new Set([...(g.memberIds || []), memberId])); renderGroupCurrentMembers(g); renderGroupAddMembers(g); }
      });
    }

    function removeGroupMember(key, isExternal) {
      if (!currentGroupId) return;
      if (!confirm(currentLang === 'ar' ? 'هل أنت متأكد من رغبتك في إزالة هذا العضو من المجموعة؟' : 'Retirer ce membre du groupe ?')) return;
      if (isExternal) {
        db.collection('groups').doc(currentGroupId).update({
          externalMemberCodes: firebase.firestore.FieldValue.arrayRemove(key),
          ['externalMembers.' + key]: firebase.firestore.FieldValue.delete()
        }).then(() => {
          const g = findGroupById(currentGroupId);
          if (g) { g.externalMemberCodes = (g.externalMemberCodes || []).filter(c => c !== key); delete g.externalMembers[key]; renderGroupCurrentMembers(g); }
        });
      } else {
        db.collection('groups').doc(currentGroupId).update({
          memberIds: firebase.firestore.FieldValue.arrayRemove(key)
        }).then(() => {
          const g = findGroupById(currentGroupId);
          if (g) { g.memberIds = (g.memberIds || []).filter(id => id !== key); renderGroupCurrentMembers(g); renderGroupAddMembers(g); }
        });
      }
    }

    function saveGroupName() {
      if (!currentGroupId) return;
      const name = document.getElementById('gs-name-input').value.trim();
      if (!name) return;
      db.collection('groups').doc(currentGroupId).update({ name }).then(() => {
        document.getElementById('chat-title-t').innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 5h16v10.5H10.5L6 19v-3.5H4z"/></svg> ' + name;
      });
    }

    function regenerateGroupCode() {
      if (!currentGroupId) return;
      generateUniqueGroupCode(code => {
        db.collection('groups').doc(currentGroupId).update({ inviteCode: code }).then(() => {
          document.getElementById('gs-invite-code').innerText = code;
        });
      });
    }

    function deleteCurrentGroup() {
      if (!currentGroupId) return;
      if (!confirm(currentLang === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذه المجموعة نهائياً؟ لن تتمكن من استعادتها!' : 'Supprimer définitivement ce groupe ? Cette action est irréversible !')) return;
      const groupId = currentGroupId;
      db.collection('groups').doc(groupId).delete().then(() => {
        closeGroupSettings();
        closeGroupChat();
      });
    }

    // ==================== Team Members Directory (باش نعرفو شكون داخل بنفس الحساب) ====================
    let teamMembersCache = [];
    let membersUnsubscribe = null;

    function upsertMember() {
      if (!currentUid) return;
      const p = getDeviceProfile();
      if (!p || (!p.firstName && !p.lastName)) return;
      const myId = getDeviceId();
      db.collection('users').doc(currentUid).collection('members').doc(myId).set({
        firstName: p.firstName || '', lastName: p.lastName || '', phone: p.phone || '',
        avatar: p.avatar || '', avatarIsPhoto: !!p.avatarIsPhoto,
        lastActive: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }

    function startMembersListener(uid) {
      if (membersUnsubscribe) { membersUnsubscribe(); membersUnsubscribe = null; }
      teamMembersCache = [];
      membersUnsubscribe = db.collection('users').doc(uid).collection('members').onSnapshot(snap => {
        teamMembersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderPrivateChatList();
        renderEmployeesList();
        updateBellNotifications();
      });
    }

    // ==================== Private Chat (محادثة فردية بين عضوين من نفس الحساب) ====================
    let privateChatsUnsubscribe = null;
    let privateChatsCache = [];
    let currentPrivateChatWith = null;
    let privateMsgsUnsubscribe = null;
    let privateMsgsCache = [];

    function privateChatKey(idA, idB) { return [idA, idB].sort().join('__'); }

    function startPrivateChatsListener(uid) {
      if (privateChatsUnsubscribe) { privateChatsUnsubscribe(); privateChatsUnsubscribe = null; }
      privateChatsCache = [];
      const myId = getDeviceId();
      privateChatsUnsubscribe = db.collection('users').doc(uid).collection('privateChats')
        .where('participants', 'array-contains', myId)
        .onSnapshot(snap => {
          privateChatsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          renderPrivateChatList();
          updateBellNotifications();
        });
    }

    function computeTotalPrivateUnread() {
      const myId = getDeviceId();
      return privateChatsCache.reduce((sum, c) => sum + ((c.unread && c.unread[myId]) || 0), 0);
    }

    function renderPrivateNotifRows() {
      const myId = getDeviceId();
      let rows = '';
      privateChatsCache.forEach(c => {
        const unread = (c.unread && c.unread[myId]) || 0;
        if (unread > 0) {
          const otherId = (c.participants || []).find(id => id !== myId);
          const m = teamMembersCache.find(x => x.id === otherId);
          const name = m ? deviceDisplayName(m) : (currentLang === 'ar' ? 'عضو' : 'Membre');
          rows += `<div class="notif-row" onclick="fromBellOpenPrivate('${otherId}')">
            <span class="notif-row-icon"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 6l9 7 9-7"/></svg></span>
            <span class="notif-row-text"><div class="notif-row-title">${name}</div><div class="notif-row-sub">${escapeChatText(c.lastMessage || '')}</div></span>
            <span class="notif-row-badge">${unread > 9 ? '9+' : unread}</span>
          </div>`;
        }
      });
      return rows;
    }

    function renderPrivateChatList() {
      const box = document.getElementById('pchat-members-list');
      if (!box) return;
      const t = translations[currentLang];
      const myId = getDeviceId();
      const others = teamMembersCache.filter(m => m.id !== myId);
      if (!others.length) {
        box.innerHTML = `<div class="chat-empty">${t.pchatEmptyMembers}</div>`;
        return;
      }
      box.innerHTML = others.map(m => {
        const key = privateChatKey(myId, m.id);
        const conv = privateChatsCache.find(c => c.id === key);
        const unread = conv && conv.unread ? (conv.unread[myId] || 0) : 0;
        const preview = conv && conv.lastMessage ? escapeChatText(conv.lastMessage) : t.pchatStartHint;
        const avatarHtml = m.avatarIsPhoto && m.avatar ? `<img src="${m.avatar}">` : (m.avatar || '🙂');
        return `<div class="members-list-item" onclick="openPrivateChat('${m.id}')">
          <div class="members-list-avatar">${avatarHtml}</div>
          <div class="members-list-info"><div class="members-list-name">${deviceDisplayName(m)}</div><div class="members-list-preview">${preview}</div></div>
          ${unread > 0 ? `<span class="members-list-badge">${unread > 9 ? '9+' : unread}</span>` : ''}
        </div>`;
      }).join('');
    }

    function openPrivateChat(otherId) {
      const myId = getDeviceId();
      const myself = teamMembersCache.find(x => x.id === myId);
      if (isMemberBlocked(myself)) {
        alert(currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> تم حظرك من الدردشة، تواصل مع المسؤول.' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Vous avez été bloqué du chat, contactez le responsable.');
        return;
      }
      const other = teamMembersCache.find(x => x.id === otherId);
      if (isMemberBlocked(other)) {
        alert(currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> هاد العضو محظور، فك الحظر عليه من "العمال" باش تقدر تهضر معاه.' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Ce membre est bloqué, débloquez-le depuis "Employés" pour lui écrire.');
        return;
      }
      currentPrivateChatWith = otherId;
      const m = teamMembersCache.find(x => x.id === otherId);
      document.getElementById('pchat-header-name').innerText = m ? deviceDisplayName(m) : (currentLang === 'ar' ? 'عضو' : 'Membre');
      document.getElementById('pchat-header-avatar').innerHTML = m && m.avatarIsPhoto && m.avatar ? `<img src="${m.avatar}">` : ((m && m.avatar) || '🙂');
      openSection('pchat-section');
      startPrivateMessagesListener(otherId);
    }

    // ==================== Employees Management (حظر / إضافة للدردشة الجماعية) ====================
    function isMemberBlocked(m) { return !!(m && m.blocked); }
    function isMemberInGroup(m) { return !m || m.inGroupChat !== false; }

    function toggleMemberBlock(memberId) {
      if (!currentUid) return;
      const m = teamMembersCache.find(x => x.id === memberId);
      const newVal = !isMemberBlocked(m);
      if (newVal && !confirm(currentLang === 'ar' ? 'هل أنت متأكد من رغبتك في حظر هذا الموظف؟ لن يتمكن من إرسال رسائل خاصة أو جماعية.' : 'Confirmer le blocage de cet employé ? Il ne pourra plus envoyer de messages (privés ou de groupe).')) return;
      db.collection('users').doc(currentUid).collection('members').doc(memberId).set({ blocked: newVal }, { merge: true }).catch(() => {});
    }

    function toggleMemberGroup(memberId) {
      if (!currentUid) return;
      const m = teamMembersCache.find(x => x.id === memberId);
      const newVal = !isMemberInGroup(m);
      db.collection('users').doc(currentUid).collection('members').doc(memberId).set({ inGroupChat: newVal }, { merge: true }).catch(() => {});
    }

    function renderEmployeesList() {
      const box = document.getElementById('employees-list');
      if (!box) return;
      const t = translations[currentLang];
      const myId = getDeviceId();
      const p = getDeviceProfile();
      const myCode = p && p.code ? p.code : null;
      const others = teamMembersCache.filter(m => m.id !== myId);

      let html = others.map(m => {
        const avatarHtml = m.avatarIsPhoto && m.avatar ? `<img src="${m.avatar}">` : (m.avatar || '🙂');
        const blocked = isMemberBlocked(m);
        return `<div class="emp-item ${blocked ? 'emp-blocked' : ''}">
          <div class="emp-top-row">
            <div class="members-list-avatar clickable" onclick="showMemberInfo('${m.id}')">${avatarHtml}</div>
            <div class="members-list-info">
              <div class="members-list-name clickable" onclick="showMemberInfo('${m.id}')">${deviceDisplayName(m)}</div>
              ${blocked ? `<span class="emp-name-badge">${currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> محظور' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Bloqué'}</span>` : ''}
            </div>
          </div>
          <div class="emp-actions">
            <button class="emp-btn" onclick="openPrivateChat('${m.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 6l9 7 9-7"/></svg> ${currentLang === 'ar' ? 'دردشة خاصة' : 'Chat privé'}</button>
            <button class="emp-btn ${blocked ? 'emp-danger' : ''}" onclick="toggleMemberBlock('${m.id}')">${blocked ? (currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5.5-6"/></svg> فك الحظر' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5.5-6"/></svg> Débloquer') : (currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> حظر' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Bloquer')}</button>
          </div>
        </div>`;
      }).join('');

      // Invited employees (added via email / username, from a different account)
      if (myCode) {
        externalChatsCache.forEach(c => {
          const otherCode = (c.participants || []).find(code => code !== myCode);
          if (!otherCode) return;
          const name = (c.names && c.names[otherCode]) || otherCode;
          const av = c.avatars && c.avatars[otherCode];
          const avatarHtml = av && av.avatarIsPhoto && av.avatar ? `<img src="${av.avatar}">` : ((av && av.avatar) || '🙂');
          const blocked = isExternalChatBlocked(c, myCode);
          html += `<div class="emp-item ${blocked ? 'emp-blocked' : ''}">
            <div class="emp-top-row">
              <div class="members-list-avatar">${avatarHtml}</div>
              <div class="members-list-info">
                <div class="members-list-name">${name}</div>
                ${blocked ? `<span class="emp-name-badge">${currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> محظور' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Bloqué'}</span>` : `<span style="font-size:11px; color:#94a3b8;">${currentLang === 'ar' ? 'عامل مضاف بالدعوة' : 'Employé ajouté par invitation'}</span>`}
              </div>
            </div>
            <div class="emp-actions">
              <button class="emp-btn" onclick="openExternalChat('${c.id}','${otherCode}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 6l9 7 9-7"/></svg> ${currentLang === 'ar' ? 'دردشة خاصة' : 'Chat privé'}</button>
              <button class="emp-btn ${blocked ? 'emp-danger' : ''}" onclick="toggleExternalChatBlock('${c.id}','${myCode}')">${blocked ? (currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5.5-6"/></svg> فك الحظر' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5.5-6"/></svg> Débloquer') : (currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> حظر' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Bloquer')}</button>
            </div>
          </div>`;
        });
        externalInvitesInCache.forEach(inv => {
          const av = inv.fromAvatarIsPhoto && inv.fromAvatar ? `<img src="${inv.fromAvatar}">` : (inv.fromAvatar || '🙂');
          html += `<div class="emp-item">
            <div class="emp-top-row">
              <div class="members-list-avatar">${av}</div>
              <div class="members-list-info">
                <div class="members-list-name">${inv.fromName || inv.fromCode}</div>
                <span style="font-size:11px; color:#94a3b8;">${t.exchtIncomingHint} (${inv.fromCode})</span>
              </div>
            </div>
            <div class="emp-actions">
              <button class="emp-btn emp-on" onclick="acceptExternalInvite('${inv.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5.5-6"/></svg> ${currentLang === 'ar' ? 'قبول' : 'Accepter'}</button>
              <button class="emp-btn emp-danger" onclick="rejectExternalInvite('${inv.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg> ${currentLang === 'ar' ? 'رفض' : 'Refuser'}</button>
            </div>
          </div>`;
        });
        externalInvitesOutCache.forEach(inv => {
          const av = inv.toAvatarIsPhoto && inv.toAvatar ? `<img src="${inv.toAvatar}">` : (inv.toAvatar || '🙂');
          html += `<div class="emp-item" style="opacity:0.7;">
            <div class="emp-top-row">
              <div class="members-list-avatar">${av}</div>
              <div class="members-list-info">
                <div class="members-list-name">${inv.toName || inv.toCode}</div>
                <span style="font-size:11px; color:#94a3b8;">${t.exchtPendingHint}</span>
              </div>
            </div>
          </div>`;
        });
      }

      const empBadge = document.getElementById('badge-employees');
      const totalCount = others.length + (myCode ? (externalChatsCache.length + externalInvitesInCache.length + externalInvitesOutCache.length) : 0);
      if (empBadge) empBadge.innerText = totalCount;
      box.innerHTML = html || `<div class="chat-empty">${t.pchatEmptyMembers}</div>`;
    }

    function fromBellOpenPrivate(otherId) {
      document.getElementById('notif-center-box').classList.remove('show');
      openPrivateChat(otherId);
    }

    function fromBellOpenExternal(chatKey, otherCode) {
      document.getElementById('notif-center-box').classList.remove('show');
      openExternalChat(chatKey, otherCode);
    }

    function closePrivateChat() {
      if (privateMsgsUnsubscribe) { privateMsgsUnsubscribe(); privateMsgsUnsubscribe = null; }
      currentPrivateChatWith = null;
      openSection('pchat-list-section');
    }

    function startPrivateMessagesListener(otherId) {
      if (privateMsgsUnsubscribe) { privateMsgsUnsubscribe(); privateMsgsUnsubscribe = null; }
      privateMsgsCache = [];
      if (!currentUid) return;
      const myId = getDeviceId();
      const key = privateChatKey(myId, otherId);
      privateMsgsUnsubscribe = db.collection('users').doc(currentUid).collection('privateChats').doc(key).collection('messages')
        .orderBy('createdAt', 'asc')
        .onSnapshot(snap => {
          privateMsgsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          renderPrivateMessages();
          scrollPrivateChatToBottom();
          if (currentPrivateChatWith === otherId) markPrivateChatSeen(otherId);
        });
    }

    function renderPrivateMessages() {
      const box = document.getElementById('pchat-messages');
      if (!box) return;
      if (!privateMsgsCache.length) {
        box.innerHTML = `<div class="chat-empty">${currentLang === 'ar' ? 'لا توجد رسائل بعد، ابدأ المحادثة!' : 'Aucun message, lancez la conversation !'}</div>`;
        return;
      }
      const myId = getDeviceId();
      box.innerHTML = privateMsgsCache.map(m => {
        const mine = m.senderId === myId;
        const avatarHtml = m.senderAvatarIsPhoto && m.senderAvatar ? `<img src="${m.senderAvatar}">` : (m.senderAvatar || '🙂');
        let timeStr = '';
        try {
          if (m.createdAt && m.createdAt.toDate) timeStr = m.createdAt.toDate().toLocaleTimeString(currentLang === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {}
        return `
          <div class="chat-msg-row ${mine ? 'mine' : ''}">
            <div class="chat-avatar clickable" onclick="showMemberInfo('${m.senderId}')">${avatarHtml}</div>
            <div class="chat-bubble-col">
              <div class="chat-bubble">${escapeChatText(m.text || '')}</div>
              <div class="chat-meta-row">${timeStr}</div>
            </div>
          </div>`;
      }).join('');
    }

    function sendPrivateMessage() {
      if (!currentUid || !currentPrivateChatWith) return;
      const input = document.getElementById('pchat-input');
      const text = input.value.trim();
      if (!text) return;
      const p = getDeviceProfile();
      if (!p || (!p.firstName && !p.lastName)) { openDeviceProfileModal(true); return; }
      const myId = getDeviceId();
      const otherId = currentPrivateChatWith;
      const myself = teamMembersCache.find(x => x.id === myId);
      const other = teamMembersCache.find(x => x.id === otherId);
      if (isMemberBlocked(myself) || isMemberBlocked(other)) {
        alert(currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> هاد المحادثة محظورة، ماتقدرش تصيفط رسائل.' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cette conversation est bloquée, envoi impossible.');
        return;
      }
      const key = privateChatKey(myId, otherId);
      const parentRef = db.collection('users').doc(currentUid).collection('privateChats').doc(key);
      const msg = {
        text, senderId: myId, senderName: deviceDisplayName(p),
        senderAvatar: p.avatar || '', senderAvatarIsPhoto: !!p.avatarIsPhoto,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      parentRef.collection('messages').add(msg).then(() => {
        const update = {
          participants: firebase.firestore.FieldValue.arrayUnion(myId, otherId),
          lastMessage: text,
          lastMessageAt: new Date().toISOString(),
          lastSenderId: myId
        };
        update['unread.' + otherId] = firebase.firestore.FieldValue.increment(1);
        update['unread.' + myId] = 0;
        parentRef.set(update, { merge: true });
        input.value = '';
        scrollPrivateChatToBottom();
      });
    }

    function markPrivateChatSeen(otherId) {
      if (!currentUid) return;
      const myId = getDeviceId();
      const key = privateChatKey(myId, otherId);
      const update = {};
      update['unread.' + myId] = 0;
      db.collection('users').doc(currentUid).collection('privateChats').doc(key).set(update, { merge: true }).catch(() => {});
    }

    function scrollPrivateChatToBottom() {
      const box = document.getElementById('pchat-messages');
      if (box) box.scrollTop = box.scrollHeight;
    }

    // ==================== Chat by Code (تواصل مع ناس من حسابات أخرى عن طريق كود مميز) ====================
    let externalInvitesUnsubIn = null, externalInvitesUnsubOut = null;
    let externalInvitesInCache = [], externalInvitesOutCache = [];
    let externalChatsUnsub = null;
    let externalChatsCache = [];
    let currentExternalChatKey = null;
    let currentExternalChatWith = null;
    let externalMsgsUnsub = null;
    let externalMsgsCache = [];

    function generateRandomCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    }

    function publishMyCode(code, p) {
      if (!code || !currentUid) return;
      db.collection('codeDirectory').doc(code).set({
        uid: currentUid, deviceId: getDeviceId(),
        name: deviceDisplayName(p), avatar: p.avatar || '', avatarIsPhoto: !!p.avatarIsPhoto, phone: p.phone || '', email: p.email || '',
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }

    function publishMyEmail() {
      const p = getDeviceProfile();
      if (!p || !p.email || !p.code) return;
      db.collection('emailDirectory').doc(p.email.toLowerCase()).set({
        code: p.code, updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }

    function ensureMyCode(callback) {
      const p = getDeviceProfile();
      if (!p || (!p.firstName && !p.lastName) || !currentUid) return;
      if (p.code) {
        publishMyCode(p.code, p);
        const box = document.getElementById('excht-my-code');
        if (box) box.innerText = p.code;
        if (callback) callback(p.code);
        return;
      }
      const tryCode = (attemptsLeft) => {
        if (attemptsLeft <= 0) return;
        const candidate = generateRandomCode();
        db.collection('codeDirectory').doc(candidate).get().then(doc => {
          if (doc.exists) { tryCode(attemptsLeft - 1); return; }
          const fresh = getDeviceProfile() || {};
          fresh.code = candidate;
          setDeviceProfile(fresh);
          publishMyCode(candidate, fresh);
          const box = document.getElementById('excht-my-code');
          if (box) box.innerText = candidate;
          if (callback) callback(candidate);
        }).catch(() => {});
      };
      tryCode(8);
    }

    function startExternalInvitesListeners() {
      const p = getDeviceProfile();
      if (!p || !p.code) return;
      if (externalInvitesUnsubIn) { externalInvitesUnsubIn(); externalInvitesUnsubIn = null; }
      if (externalInvitesUnsubOut) { externalInvitesUnsubOut(); externalInvitesUnsubOut = null; }
      externalInvitesInCache = []; externalInvitesOutCache = [];
      externalInvitesUnsubIn = db.collection('externalInvites').where('toCode', '==', p.code).where('status', '==', 'pending')
        .onSnapshot(snap => { externalInvitesInCache = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderExternalChatList(); renderEmployeesList(); updateBellNotifications(); }, () => {});
      externalInvitesUnsubOut = db.collection('externalInvites').where('fromCode', '==', p.code).where('status', '==', 'pending')
        .onSnapshot(snap => { externalInvitesOutCache = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderExternalChatList(); }, () => {});
    }

    function startExternalChatsListener() {
      const p = getDeviceProfile();
      if (!p || !p.code) return;
      if (externalChatsUnsub) { externalChatsUnsub(); externalChatsUnsub = null; }
      externalChatsCache = [];
      externalChatsUnsub = db.collection('externalChats').where('participants', 'array-contains', p.code)
        .onSnapshot(snap => { externalChatsCache = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderExternalChatList(); renderEmployeesList(); updateBellNotifications(); }, () => {});
    }

    function initExternalFeatures() {
      ensureMyCode(() => { startExternalInvitesListeners(); startExternalChatsListener(); publishMyEmail(); restartExternalGroupsListenerIfNeeded(); });
    }

    function computeTotalExternalUnread() {
      const p = getDeviceProfile();
      if (!p || !p.code) return 0;
      return externalChatsCache.reduce((sum, c) => sum + ((c.unread && c.unread[p.code]) || 0), 0);
    }

    function computeExternalIncomingInvites() {
      return externalInvitesInCache.length;
    }

    function sendEmployeeInvite() {
      const input = document.getElementById('excht-code-input');
      const raw = (input.value || '').trim();
      if (!raw) return;
      const p = getDeviceProfile();
      if (!p || !p.code) { alert(currentLang === 'ar' ? 'كمّل الملف الشخصي ديال الجهاز أولاً!\nComplétez d\'abord le profil de l\'appareil !' : 'Complétez d\'abord le profil de l\'appareil !\nكمّل الملف الشخصي ديال الجهاز أولاً!'); return; }
      const resolveCode = (cb) => {
        if (raw.includes('@')) {
          db.collection('emailDirectory').doc(raw.toLowerCase()).get().then(doc => {
            if (!doc.exists || !doc.data().code) { alert(currentLang === 'ar' ? 'ماكاينش عامل بهاد الإيميل، تأكد منو أو استعمل اسم المستخدم ديالو!\nAucun employé avec cet e-mail, vérifiez-le ou utilisez son nom d\'utilisateur !' : 'Aucun employé avec cet e-mail, vérifiez-le ou utilisez son nom d\'utilisateur !\nماكاينش عامل بهاد الإيميل، تأكد منو أو استعمل اسم المستخدم ديالو!'); return; }
            cb(doc.data().code);
          }).catch(() => {});
        } else {
          cb(raw.toUpperCase());
        }
      };
      resolveCode((code) => {
        if (code === p.code) { alert(currentLang === 'ar' ? 'ماتقدرش تزيد راسك كعامل!\nVous ne pouvez pas vous ajouter vous-même !' : 'Vous ne pouvez pas vous ajouter vous-même !\nماتقدرش تزيد راسك كعامل!'); return; }
        db.collection('codeDirectory').doc(code).get().then(doc => {
          if (!doc.exists) { alert(currentLang === 'ar' ? 'ماكاينش عامل بهاد المعلومات، تأكد منها!\nAucun employé trouvé avec ces informations, vérifiez-les !' : 'Aucun employé trouvé avec ces informations, vérifiez-les !\nماكاينش عامل بهاد المعلومات، تأكد منها!'); return; }
          const target = doc.data();
          const chatKey = [p.code, code].sort().join('__');
          db.collection('externalChats').doc(chatKey).get().then(chatDoc => {
            if (chatDoc.exists) { input.value = ''; openExternalChat(chatKey, code); return; }
            db.collection('externalInvites').add({
              fromCode: p.code, fromUid: currentUid, fromDeviceId: getDeviceId(), fromName: deviceDisplayName(p), fromAvatar: p.avatar || '', fromAvatarIsPhoto: !!p.avatarIsPhoto,
              toCode: code, toUid: target.uid || '', toDeviceId: target.deviceId || '', toName: target.name || code, toAvatar: target.avatar || '', toAvatarIsPhoto: !!target.avatarIsPhoto,
              status: 'pending', chatKey,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
              input.value = '';
              alert(currentLang === 'ar' ? 'تصيفطات الدعوة للعامل! خاصها توافق باش يتزاد لفريقك.\nInvitation envoyée à l\'employé ! Il doit l\'accepter pour rejoindre votre équipe.' : 'Invitation envoyée à l\'employé ! Il doit l\'accepter pour rejoindre votre équipe.\nتصيفطات الدعوة للعامل! خاصها توافق باش يتزاد لفريقك.');
            });
          });
        });
      });
    }

    function acceptExternalInvite(inviteId) {
      const inv = externalInvitesInCache.find(x => x.id === inviteId);
      if (!inv) return;
      const p = getDeviceProfile();
      const chatKey = inv.chatKey || [inv.fromCode, inv.toCode].sort().join('__');
      db.collection('externalChats').doc(chatKey).set({
        participants: [inv.fromCode, inv.toCode],
        names: { [inv.fromCode]: inv.fromName || inv.fromCode, [inv.toCode]: deviceDisplayName(p) },
        avatars: { [inv.fromCode]: { avatar: inv.fromAvatar || '', avatarIsPhoto: !!inv.fromAvatarIsPhoto }, [inv.toCode]: { avatar: p.avatar || '', avatarIsPhoto: !!p.avatarIsPhoto } },
        unread: { [inv.fromCode]: 0, [inv.toCode]: 0 },
        lastMessage: '', updatedAt: new Date().toISOString()
      }, { merge: true }).then(() => {
        db.collection('externalInvites').doc(inviteId).update({ status: 'accepted' });
      });
    }

    function rejectExternalInvite(inviteId) {
      db.collection('externalInvites').doc(inviteId).update({ status: 'rejected' });
    }

    function renderExternalChatList() {
      const box = document.getElementById('excht-list');
      if (!box) return;
      const t = translations[currentLang];
      const p = getDeviceProfile();
      const myCode = p && p.code ? p.code : null;
      const codeBox = document.getElementById('excht-my-code');
      if (codeBox) codeBox.innerText = myCode || '------';

      let html = '';
      externalInvitesInCache.forEach(inv => {
        const av = inv.fromAvatarIsPhoto && inv.fromAvatar ? `<img src="${inv.fromAvatar}">` : (inv.fromAvatar || '🙂');
        html += `<div class="members-list-item" style="cursor:default;">
          <div class="members-list-avatar">${av}</div>
          <div class="members-list-info"><div class="members-list-name">${inv.fromName || inv.fromCode}</div><div class="members-list-preview">${t.exchtIncomingHint} (${inv.fromCode})</div></div>
          <div style="display:flex; gap:6px; flex-shrink:0;">
            <span style="cursor:pointer; font-size:20px;" onclick="acceptExternalInvite('${inv.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5.5-6"/></svg></span>
            <span style="cursor:pointer; font-size:20px;" onclick="rejectExternalInvite('${inv.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg></span>
          </div>
        </div>`;
      });
      externalInvitesOutCache.forEach(inv => {
        const av = inv.toAvatarIsPhoto && inv.toAvatar ? `<img src="${inv.toAvatar}">` : (inv.toAvatar || '🙂');
        html += `<div class="members-list-item" style="cursor:default; opacity:0.7;">
          <div class="members-list-avatar">${av}</div>
          <div class="members-list-info"><div class="members-list-name">${inv.toName || inv.toCode}</div><div class="members-list-preview">${t.exchtPendingHint}</div></div>
        </div>`;
      });
      if (myCode) {
        externalChatsCache.forEach(c => {
          const otherCode = (c.participants || []).find(code => code !== myCode);
          if (!otherCode) return;
          const name = (c.names && c.names[otherCode]) || otherCode;
          const av = c.avatars && c.avatars[otherCode];
          const avatarHtml = av && av.avatarIsPhoto && av.avatar ? `<img src="${av.avatar}">` : ((av && av.avatar) || '🙂');
          const unread = (c.unread && c.unread[myCode]) || 0;
          const preview = c.lastMessage ? escapeChatText(c.lastMessage) : t.pchatStartHint;
          html += `<div class="members-list-item" onclick="openExternalChat('${c.id}','${otherCode}')">
            <div class="members-list-avatar">${avatarHtml}</div>
            <div class="members-list-info"><div class="members-list-name">${name}</div><div class="members-list-preview">${preview}</div></div>
            ${unread > 0 ? `<span class="members-list-badge">${unread > 9 ? '9+' : unread}</span>` : ''}
          </div>`;
        });
      }
      box.innerHTML = html || `<div class="chat-empty">${t.exchtEmpty}</div>`;
    }

    function openExternalChat(chatKey, otherCode) {
      currentExternalChatKey = chatKey;
      currentExternalChatWith = otherCode;
      const c = externalChatsCache.find(x => x.id === chatKey);
      const name = c && c.names ? (c.names[otherCode] || otherCode) : otherCode;
      const av = c && c.avatars ? c.avatars[otherCode] : null;
      document.getElementById('excht-header-name').innerText = name;
      document.getElementById('excht-header-avatar').innerHTML = av && av.avatarIsPhoto && av.avatar ? `<img src="${av.avatar}">` : ((av && av.avatar) || '🙂');
      openSection('excht-section');
      startExternalMessagesListener(chatKey);
    }

    function closeExternalChat() {
      if (externalMsgsUnsub) { externalMsgsUnsub(); externalMsgsUnsub = null; }
      currentExternalChatKey = null; currentExternalChatWith = null;
      openSection('excht-list-section');
    }

    function startExternalMessagesListener(chatKey) {
      if (externalMsgsUnsub) { externalMsgsUnsub(); externalMsgsUnsub = null; }
      externalMsgsCache = [];
      externalMsgsUnsub = db.collection('externalChats').doc(chatKey).collection('messages').orderBy('createdAt', 'asc')
        .onSnapshot(snap => {
          externalMsgsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          renderExternalMessages();
          scrollExternalChatToBottom();
          if (currentExternalChatKey === chatKey) markExternalChatSeen(chatKey);
        }, () => {});
    }

    function renderExternalMessages() {
      const box = document.getElementById('excht-messages');
      if (!box) return;
      if (!externalMsgsCache.length) {
        box.innerHTML = `<div class="chat-empty">${currentLang === 'ar' ? 'لا توجد رسائل بعد، ابدأ المحادثة!' : 'Aucun message, lancez la conversation !'}</div>`;
        return;
      }
      const p = getDeviceProfile();
      const myCode = p && p.code;
      box.innerHTML = externalMsgsCache.map(m => {
        const mine = m.senderCode === myCode;
        const avatarHtml = m.senderAvatarIsPhoto && m.senderAvatar ? `<img src="${m.senderAvatar}">` : (m.senderAvatar || '🙂');
        let timeStr = '';
        try {
          if (m.createdAt && m.createdAt.toDate) timeStr = m.createdAt.toDate().toLocaleTimeString(currentLang === 'ar' ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {}
        return `
          <div class="chat-msg-row ${mine ? 'mine' : ''}">
            <div class="chat-avatar">${avatarHtml}</div>
            <div class="chat-bubble-col">
              <div class="chat-bubble">${escapeChatText(m.text || '')}</div>
              <div class="chat-meta-row">${timeStr}</div>
            </div>
          </div>`;
      }).join('');
    }

    function isExternalChatBlocked(chat, code) {
      return !!(chat && chat.blockedBy && (chat.blockedBy[code]));
    }

    function toggleExternalChatBlock(chatKey, myCode) {
      const chat = externalChatsCache.find(x => x.id === chatKey);
      const currentlyBlocked = isExternalChatBlocked(chat, myCode);
      if (!currentlyBlocked && !confirm(currentLang === 'ar' ? 'واش متأكد بغيتي تحظر هاد العامل؟ ماغاديش يقدر يصيفط ليك رسائل.' : 'Confirmer le blocage de cet employé ? Il ne pourra plus vous envoyer de messages.')) return;
      const update = {};
      update['blockedBy.' + myCode] = !currentlyBlocked;
      db.collection('externalChats').doc(chatKey).set(update, { merge: true }).catch(() => {});
    }

    function sendExternalMessage() {
      if (!currentExternalChatKey || !currentExternalChatWith) return;
      const input = document.getElementById('excht-input');
      const text = input.value.trim();
      if (!text) return;
      const p = getDeviceProfile();
      if (!p || !p.code) return;
      const chat = externalChatsCache.find(x => x.id === currentExternalChatKey);
      if (isExternalChatBlocked(chat, p.code) || isExternalChatBlocked(chat, currentExternalChatWith)) {
        alert(currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> هاد المحادثة محظورة، ماتقدرش تصيفط رسائل.' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cette conversation est bloquée, envoi impossible.');
        return;
      }
      const msg = { text, senderCode: p.code, senderName: deviceDisplayName(p), senderAvatar: p.avatar || '', senderAvatarIsPhoto: !!p.avatarIsPhoto, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
      db.collection('externalChats').doc(currentExternalChatKey).collection('messages').add(msg).then(() => {
        input.value = '';
        const update = { lastMessage: text, updatedAt: new Date().toISOString() };
        update['unread.' + currentExternalChatWith] = firebase.firestore.FieldValue.increment(1);
        db.collection('externalChats').doc(currentExternalChatKey).update(update);
        scrollExternalChatToBottom();
      });
    }

    function markExternalChatSeen(chatKey) {
      const p = getDeviceProfile();
      if (!p || !p.code) return;
      const update = {};
      update['unread.' + p.code] = 0;
      db.collection('externalChats').doc(chatKey).set(update, { merge: true }).catch(() => {});
    }

    function scrollExternalChatToBottom() {
      const box = document.getElementById('excht-messages');
      if (box) box.scrollTop = box.scrollHeight;
    }

    // ==================== مركز الإشعارات (دردشة الفريق + دردشة خاصة + الموافقة على التعديلات) ====================
    const colIcons = { cheques: '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="2" y="5" width="20" height="14" rx="2.2"/><line x1="2" y1="9.5" x2="22" y2="9.5"/><path d="M16 15.5h4"/></svg>', stock: '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/></svg>', installations: '🛠️', notes: '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="4" y="3" width="14" height="18" rx="1.4"/><line x1="7" y1="8" x2="14" y2="8"/><line x1="7" y1="12" x2="11.5" y2="12"/></svg>' };

    function computePendingApprovalsForMe() {
      const myId = getDeviceId();
      const list = [];
      ['cheques', 'stock', 'installations', 'notes'].forEach(col => {
        (globalData[col] || []).forEach(d => {
          if (d.pendingEdit && d.pendingEdit.proposedBy !== myId) {
            list.push({ col, id: d.id, name: d.pendingEdit.proposedByName });
          }
        });
      });
      return list;
    }

    // ==== جرس التعديلات: خاص فقط بطلبات الموافقة على التعديلات ====
    function updateBellNotifications() {
      const badge = document.getElementById('bell-badge');
      const pending = computePendingApprovalsForMe();
      if (badge) {
        if (pending.length > 0) { badge.innerText = pending.length > 9 ? '9+' : String(pending.length); badge.style.display = 'flex'; }
        else { badge.style.display = 'none'; }
      }
      const box = document.getElementById('notif-center-box');
      if (box && box.classList.contains('show')) renderNotifCenter();
      updateMsgsNotifications();
    }

    function renderNotifCenter() {
      const box = document.getElementById('notif-center-content');
      if (!box) return;
      const t = translations[currentLang];
      let rows = '';
      computePendingApprovalsForMe().forEach(p => {
        const item = (globalData[p.col] || []).find(x => x.id === p.id);
        let preview = '';
        if (item) {
          if (p.col === 'notes') preview = (item.text || '').slice(0, 40);
          else if (p.col === 'cheques') preview = `#${item.num} - ${item.owner}`;
          else if (p.col === 'stock') preview = item.name;
          else if (p.col === 'installations') preview = item.client;
        }
        rows += `<div class="notif-row" onclick="fromBellGoToItem('${p.col}','${p.id}')">
          <span class="notif-row-icon">${colIcons[p.col]}</span>
          <span class="notif-row-text"><div class="notif-row-title">${t.pendingEditFrom} ${p.name}</div><div class="notif-row-sub">${preview}</div></span>
          <span class="notif-row-badge"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 20l1-4.2L15.8 5 19 8.2 8.2 19z"/><line x1="13.8" y1="6.9" x2="17" y2="10.1"/></svg></span>
        </div>`;
      });
      box.innerHTML = rows || `<div class="notif-center-empty">${t.notifCenterEmpty}</div>`;
    }

    function fromBellGoTo(sectionId) {
      document.getElementById('notif-center-box').classList.remove('show');
      openSection(sectionId);
    }

    // ==== <svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 6l9 7 9-7"/></svg> مركز إشعارات الرسائل: دردشة جماعية، دردشة خاصة، دردشات خارجية، والانضمام لمجموعة ====
    function getSeenGroupJoins() {
      try { return JSON.parse(localStorage.getItem('deeplite_seen_group_joins') || '[]'); } catch (e) { return []; }
    }
    function markGroupJoinSeen(groupId) {
      const list = getSeenGroupJoins();
      if (!list.includes(groupId)) { list.push(groupId); localStorage.setItem('deeplite_seen_group_joins', JSON.stringify(list)); }
    }
    function computeNewGroupJoinNotifs() {
      const myId = getDeviceId();
      const seen = getSeenGroupJoins();
      const list = [];
      myVisibleGroups().forEach(g => {
        if (seen.includes(g.id)) return;
        const isOwnerCreator = g.ownerUid === currentUid && g.createdBy === myId;
        if (isOwnerCreator) { markGroupJoinSeen(g.id); return; }
        list.push(g);
      });
      return list;
    }
    function computeMsgsBellTotal() {
      return computeGroupChatUnread() + computeTotalPrivateUnread() + computeTotalExternalUnread() + computeExternalIncomingInvites() + computeNewGroupJoinNotifs().length;
    }
    function updateMsgsNotifications() {
      const badge = document.getElementById('msgs-badge');
      const total = computeMsgsBellTotal();
      if (badge) {
        if (total > 0) { badge.innerText = total > 9 ? '9+' : String(total); badge.style.display = 'flex'; }
        else { badge.style.display = 'none'; }
      }
      updateChatUnreadBadge();
      const box = document.getElementById('msgs-center-box');
      if (box && box.classList.contains('show')) renderMsgsCenter();
    }

    function renderMsgsCenter() {
      const box = document.getElementById('msgs-center-content');
      if (!box) return;
      const t = translations[currentLang];
      let rows = '';
      computeNewGroupJoinNotifs().forEach(g => {
        rows += `<div class="notif-row" onclick="fromMsgsOpenGroup('${g.id}')">
          <span class="notif-row-icon"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="8.5" cy="8" r="3"/><circle cx="16.2" cy="9" r="2.6"/><path d="M3 19c.7-3 3-4.8 5.7-4.8S13.8 16 14.5 19"/><path d="M14.9 14.5c2.1.4 3.6 1.9 4.1 4.4"/></svg></span>
          <span class="notif-row-text"><div class="notif-row-title">${t.joinedGroupNotif} ${escapeChatText(g.name || '')}</div></span>
          <span class="join-group-badge">🆕</span>
        </div>`;
      });
      myVisibleGroups().forEach(g => {
        const key = myGroupSenderKey(g);
        const unread = (g.unread && key && g.unread[key]) || 0;
        if (unread > 0) {
          rows += `<div class="notif-row" onclick="fromMsgsOpenGroup('${g.id}')">
            <span class="notif-row-icon"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 5h16v10.5H10.5L6 19v-3.5H4z"/></svg></span>
            <span class="notif-row-text"><div class="notif-row-title">${escapeChatText(g.name || '')}</div><div class="notif-row-sub">${escapeChatText(g.lastMessage || '')}</div></span>
            <span class="notif-row-badge">${unread > 9 ? '9+' : unread}</span>
          </div>`;
        }
      });
      rows += renderPrivateNotifRows();
      externalInvitesInCache.forEach(inv => {
        rows += `<div class="notif-row" onclick="fromMsgsGoTo('excht-list-section')">
          <span class="notif-row-icon"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/></svg></span>
          <span class="notif-row-text"><div class="notif-row-title">${inv.fromName || inv.fromCode}</div><div class="notif-row-sub">${t.exchtIncomingHint}</div></span>
          <span class="notif-row-badge"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></span>
        </div>`;
      });
      const myCode = (getDeviceProfile() || {}).code;
      if (myCode) {
        externalChatsCache.forEach(c => {
          const unread = (c.unread && c.unread[myCode]) || 0;
          if (unread > 0) {
            const otherCode = (c.participants || []).find(code => code !== myCode);
            const name = (c.names && c.names[otherCode]) || otherCode;
            rows += `<div class="notif-row" onclick="fromMsgsOpenExternal('${c.id}','${otherCode}')">
              <span class="notif-row-icon"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/></svg></span>
              <span class="notif-row-text"><div class="notif-row-title">${name}</div><div class="notif-row-sub">${escapeChatText(c.lastMessage || '')}</div></span>
              <span class="notif-row-badge">${unread > 9 ? '9+' : unread}</span>
            </div>`;
          }
        });
      }
      box.innerHTML = rows || `<div class="notif-center-empty">${t.notifCenterEmpty}</div>`;
    }

    function toggleMsgsCenter() {
      document.getElementById('alert-box').classList.remove('show');
      document.getElementById('important-alerts-box').classList.remove('show');
      document.getElementById('notif-center-box').classList.remove('show');
      const box = document.getElementById('msgs-center-box');
      box.classList.toggle('show');
      if (box.classList.contains('show')) renderMsgsCenter();
      syncFloatingBackdrop();
    }

    function fromMsgsGoTo(sectionId) {
      document.getElementById('msgs-center-box').classList.remove('show');
      openSection(sectionId);
    }

    function fromMsgsOpenGroup(groupId) {
      markGroupJoinSeen(groupId);
      document.getElementById('msgs-center-box').classList.remove('show');
      openGroupChat(groupId);
    }

    function fromMsgsOpenExternal(chatId, otherCode) {
      document.getElementById('msgs-center-box').classList.remove('show');
      openExternalChat(chatId, otherCode);
    }

    function fromBellOpenGroup(groupId) {
      markGroupJoinSeen(groupId);
      document.getElementById('notif-center-box').classList.remove('show');
      openGroupChat(groupId);
    }

    function fromBellGoToItem(col, id) {
      document.getElementById('notif-center-box').classList.remove('show');
      goToItem(col, id);
    }

    function toggleNotifCenter() {
      document.getElementById('alert-box').classList.remove('show');
      document.getElementById('important-alerts-box').classList.remove('show');
      document.getElementById('msgs-center-box').classList.remove('show');
      const box = document.getElementById('notif-center-box');
      box.classList.toggle('show');
      if (box.classList.contains('show')) renderNotifCenter();
      syncFloatingBackdrop();
    }

    // ==================== تسجيل التعديلات (يتطبق التعديل مباشرة، وكيبان شكون بدلو ومتى + القيمة قبل التعديل) ====================
    function submitPendingEdit(col, id, data) {
      if (!currentUid) return;
      const p = getDeviceProfile();
      const name = p ? deviceDisplayName(p) : currentUserLabel();
      const item = (globalData[col] || []).find(x => x.id === id);
      const prevData = {};
      if (item) {
        Object.keys(data).forEach(k => { prevData[k] = item[k] !== undefined ? item[k] : null; });
      }
      const updates = Object.assign({}, data, {
        previousData: prevData,
        updatedAt: new Date().toISOString(),
        updatedBy: name,
        pendingEdit: firebase.firestore.FieldValue.delete()
      });
      db.collection('users').doc(currentUid).collection(col).doc(id).update(updates);
    }

    function approveEdit(col, id) {
      if (!currentUid) return;
      const item = (globalData[col] || []).find(x => x.id === id);
      if (!item || !item.pendingEdit) return;
      const myId = getDeviceId();
      if (item.pendingEdit.proposedBy === myId) return;
      const prevData = {};
      Object.keys(item.pendingEdit.data).forEach(k => { prevData[k] = item[k] !== undefined ? item[k] : null; });
      const updates = Object.assign({}, item.pendingEdit.data, {
        previousData: prevData,
        updatedAt: new Date().toISOString(),
        updatedBy: item.pendingEdit.proposedByName,
        pendingEdit: firebase.firestore.FieldValue.delete()
      });
      db.collection('users').doc(currentUid).collection(col).doc(id).update(updates);
    }

    function rejectEdit(col, id) {
      if (!currentUid) return;
      const item = (globalData[col] || []).find(x => x.id === id);
      if (!item || !item.pendingEdit) return;
      const myId = getDeviceId();
      if (item.pendingEdit.proposedBy === myId) return;
      if (!confirm(translations[currentLang].confirmReject)) return;
      db.collection('users').doc(currentUid).collection(col).doc(id).update({ pendingEdit: firebase.firestore.FieldValue.delete() });
    }

    function renderPendingEditBox(col, d) {
      if (!d.pendingEdit) return '';
      const t = translations[currentLang];
      const myId = getDeviceId();
      const isMine = d.pendingEdit.proposedBy === myId;
      let dateStr = '';
      try { dateStr = new Date(d.pendingEdit.proposedAt).toLocaleString(currentLang === 'ar' ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
      let actionsHtml;
      if (isMine) {
        actionsHtml = `<div class="pending-edit-waiting">${t.pendingWaitingOther}</div>`;
      } else {
        actionsHtml = `<div class="pending-edit-actions">
          <button class="btn-approve" onclick="approveEdit('${col}','${d.id}')">${t.btnApprove}</button>
          <button class="btn-reject" onclick="rejectEdit('${col}','${d.id}')">${t.btnReject}</button>
        </div>`;
      }
      return `<div class="pending-edit-box"><div class="pending-edit-label">⏳ ${t.pendingEditFrom} ${d.pendingEdit.proposedByName} ${dateStr ? '(' + dateStr + ')' : ''}</div>${actionsHtml}</div>`;
    }

    function sortWithPendingLast(arr) {
      return arr.map((v, i) => ({ v, i })).sort((a, b) => {
        const ap = a.v.pendingEdit ? 1 : 0, bp = b.v.pendingEdit ? 1 : 0;
        if (ap !== bp) return ap - bp;
        return a.i - b.i;
      }).map(x => x.v);
    }

    function formatUpdateInfo(d) {
      if (!d.updatedAt) return '';
      let dateStr = '';
      try {
        dateStr = new Date(d.updatedAt).toLocaleString(currentLang === 'ar' ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      } catch (e) {}
      const label = currentLang === 'ar' ? 'آخر تعديل' : 'Dernière modif.';
      return `<div class="item-sub" style="color:#38bdf8;">🕓 ${label}: ${d.updatedBy || '-'}${dateStr ? ' | ' + dateStr : ''}</div>`;
    }

    const previousValueFieldLabels = {
      cheques: { num: { ar: 'رقم الشيك', fr: 'N° chèque' }, owner: { ar: 'الصاحب', fr: 'Propriétaire' }, amount: { ar: 'المبلغ', fr: 'Montant' }, type: { ar: 'النوع', fr: 'Type' }, date: { ar: 'التاريخ', fr: 'Date' } },
      stock: { name: { ar: 'الاسم', fr: 'Nom' }, qty: { ar: 'الكمية', fr: 'Quantité' }, price: { ar: 'الثمن', fr: 'Prix' }, date: { ar: 'التاريخ', fr: 'Date' } },
      installations: { client: { ar: 'الزبون', fr: 'Client' }, phone: { ar: 'الهاتف', fr: 'Téléphone' }, map: { ar: 'الموقع', fr: 'Position' }, clim: { ar: 'التفاصيل', fr: 'Détails' }, service: { ar: 'الخدمة', fr: 'Service' }, date: { ar: 'التاريخ', fr: 'Date' } },
      notes: { text: { ar: 'النص', fr: 'Texte' }, datetime: { ar: 'التاريخ', fr: 'Date' } }
    };

    function renderPreviousValueBox(col, d) {
      if (!d.previousData) return '';
      const labels = previousValueFieldLabels[col] || {};
      const rows = Object.keys(d.previousData).map(k => {
        const oldVal = d.previousData[k];
        const newVal = d[k];
        if (oldVal === newVal || oldVal === undefined || oldVal === null || oldVal === '') return '';
        const lbl = labels[k] ? (currentLang === 'ar' ? labels[k].ar : labels[k].fr) : k;
        return `<div><span class="prev-field">${lbl}: ${oldVal}</span></div>`;
      }).filter(Boolean).join('');
      if (!rows) return '';
      const title = currentLang === 'ar' ? '↩️ القيمة قبل التعديل' : '↩️ Valeur avant modification';
      return `<div class="previous-value-box"><div class="prev-label">${title}</div>${rows}</div>`;
    }
    let countdownInterval = null;
    let generatedVerificationCode = null;

    const serviceID = "service_alk7cfw"; 
    const templateID = "template_bc1vmj8"; 
    const publicKey = "gN5-x3U81_44IzuNZ";

    const climSuggestionsList = [
      "Clim Daikool 9000", "Clim Daikool 12000", "Clim Samsung Inverter", "Clim LG Dual Inverter",
      "Clim Midea", "Clim Carrier", "Clim Daikin", "Compresseur Rotary", "Gaz R410A", "Gaz R32",
      "Tuyau Cuivre 1/4 - 3/8", "Tuyau Cuivre 1/4 - 1/2", "Carte Électronique Clim", "Télécommande Universelle Clim"
    ];

    const marketPriceSuggestions = [
      "2300", "2400", "2500", "2600", "2800", "2900", "3000", "3200", "3500", "3800", "4200", "150", "200", "300", "350", "500"
    ];

    function filterStockSuggestions(val) {
      const box = document.getElementById('custom-suggestions-box');
      if (!val.trim()) { box.style.display = 'none'; box.innerHTML = ''; return; }
      const query = val.toLowerCase();
      const filtered = climSuggestionsList.filter(item => item.toLowerCase().includes(query)).slice(0, 3);
      if (filtered.length === 0) { box.style.display = 'none'; box.innerHTML = ''; return; }
      box.innerHTML = '';
      filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerText = item;
        div.onclick = function() {
          document.getElementById('item-name').value = item;
          box.style.display = 'none';
          box.innerHTML = '';
          if(item.includes('9000')) { document.getElementById('item-price').value = "2400"; }
          else if(item.includes('12000')) { document.getElementById('item-price').value = "3000"; }
        };
        box.appendChild(div);
      });
      box.style.display = 'block';
    }

    function filterPriceSuggestions(val) {
      const box = document.getElementById('price-suggestions-box');
      if (!val.trim()) { box.style.display = 'none'; box.innerHTML = ''; return; }
      const query = val.toLowerCase();
      const filtered = marketPriceSuggestions.filter(p => p.includes(query)).slice(0, 3);
      if (filtered.length === 0) { box.style.display = 'none'; box.innerHTML = ''; return; }
      box.innerHTML = '';
      filtered.forEach(price => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerText = price + " DH (سعر السوق)";
        div.onclick = function() {
          document.getElementById('item-price').value = price;
          box.style.display = 'none';
          box.innerHTML = '';
        };
        box.appendChild(div);
      });
      box.style.display = 'block';
    }

    document.addEventListener('click', function(e) {
      if (!e.target.closest('#item-name') && !e.target.closest('#custom-suggestions-box')) {
        const box = document.getElementById('custom-suggestions-box');
        if(box) box.style.display = 'none';
      }
      if (!e.target.closest('#item-price') && !e.target.closest('#price-suggestions-box')) {
        const pBox = document.getElementById('price-suggestions-box');
        if(pBox) pBox.style.display = 'none';
      }
    });

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
        upsertMember();
        initExternalFeatures();
      } else {
        currentUid = null;
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
            msgAr = "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> كلمة السر ديال هاد الحساب تبدلت.";
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
          msgAr += "\n(الحساب السابق خرج هو الآخر، خاصك تدخل من جديد)";
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
        mEmpT: "العمال", mEmpD: "إضافة، دردشة خاصة، حظر", empTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='8' r='3.6'/><path d='M4.5 20.2c1-3.6 4-5.7 7.5-5.7s6.5 2.1 7.5 5.7'/><path d='M6.5 8.5c1.5-1 3.6-1.6 5.5-1.6s4 .6 5.5 1.6' stroke-width='1.4'/></svg> العمال", empSubT: "كل عامل عندو حساب فهاد التطبيق كيبان هنا تلقائياً. تقدر تهضر معاه فبريفي، تزيده للدردشة الجماعية، أو تحظره.",
        mPchtT: "دردشة خاصة", mPchtD: "محادثات فردية بين الأعضاء",
        chatChoiceTitle: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M4 5h16v10.5H10.5L6 19v-3.5H4z'/></svg> اختر نوع الدردشة", chatChoiceGroup: "دردشة جماعية", chatChoicePrivate: "دردشة خاصة", chatChoiceCode: "إضافة عامل", closeGeneric: "✕ إغلاق", memberInfoCall: "اتصال",
        exchtListT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><line x1='12' y1='8' x2='12' y2='16'/><line x1='8' y1='12' x2='16' y2='12'/></svg> إضافة عامل", exchtSub: "زيد عامل بالإيميل ديالو أو اسم المستخدم (الكود) باش يتزاد لدردشة الفريق.", exchtMyCodeLbl: "اسم المستخدم ديالك (شاركه مع المسؤول):", exchtCodeInputPh: "إيميل ولا اسم مستخدم ديال العامل...",
        exchtIncomingHint: "بغى يتزاد كعامل عندك", exchtPendingHint: "فانتظار الموافقة...", exchtEmpty: "ماكاينش عمال مزادين بعد. صيفط دعوة باش تبدا!",
        pchatListT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='8.5' cy='8' r='3'/><circle cx='16.2' cy='9' r='2.6'/><path d='M3 19c.7-3 3-4.8 5.7-4.8S13.8 16 14.5 19'/><path d='M14.9 14.5c2.1.4 3.6 1.9 4.1 4.4'/></svg> الأعضاء", pchatBackBtn: "← رجوع", pchatEmptyMembers: "ماكاينش أعضاء آخرين داخلين بنفس الحساب بعد.", pchatStartHint: "اضغط لبدء المحادثة",
        notifCenterTitle: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3a5 5 0 0 0-5 5v3.3L5.2 15h13.6L17 11.3V8a5 5 0 0 0-5-5z'/><path d='M9.5 18a2.5 2.5 0 0 0 5 0'/></svg> الإشعارات", notifCenterEmpty: "لا توجد إشعارات جديدة",
        msgsCenterTitle: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='5' width='18' height='14' rx='1.5'/><path d='M3 6l9 7 9-7'/></svg> الرسائل", joinedGroupNotif: "لقد انضممت إلى مجموعة:",
        groupsListTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='8.5' cy='8' r='3'/><circle cx='16.2' cy='9' r='2.6'/><path d='M3 19c.7-3 3-4.8 5.7-4.8S13.8 16 14.5 19'/><path d='M14.9 14.5c2.1.4 3.6 1.9 4.1 4.4'/></svg> المجموعات", groupsNewBtnT: "مجموعة جديدة", groupsJoinCodePh: "🔑 هل لديك رمز مجموعة؟ أدخله هنا...",
        cgTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><line x1='12' y1='8' x2='12' y2='16'/><line x1='8' y1='12' x2='16' y2='12'/></svg> مجموعة جديدة", cgMembersLbl: "اختر الأعضاء من موظفيك:", cgCreateBtn: "✓ إنشاء المجموعة",
        gsTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='3.2'/><path d='M12 3v2.4M12 18.6V21M4.2 12H6.6M17.4 12h2.4M6.3 6.3l1.7 1.7M16 16l1.7 1.7M17.7 6.3 16 8M8 16l-1.7 1.7'/></svg> إعدادات المجموعة", gsNameLbl: "اسم المجموعة:", gsMembersLbl: "الأعضاء الحاليون:", gsAddLbl: "أضف موظفاً من موظفيك:",
        gsCodeLbl: "رمز المجموعة (شاركه مع أي شخص ليتمكن من الدخول إليها مباشرة):", gsRegenBtn: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M20 12a8 8 0 1 1-2.9-6.2'/><path d='M20 4v5h-5'/></svg> رمز جديد", gsDeleteBtn: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M5 7h14M9 7V4.5h6V7M7 7l1 12.5h8L17 7'/></svg> حذف المجموعة",
        pendingEditFrom: "تعديل جديد من", pendingEditWaitingApproval: "بانتظار الموافقة", pendingWaitingOther: "بانتظار موافقة شخص آخر...",
        btnApprove: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> قبول", btnReject: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> رفض", confirmReject: "رفض هذا التعديل؟",
        editApprovedFrom: "تعديل من",
        chkFormT: "تسجيل شيك جديد", chkNumPh: "رقم الشيك", chkOwnerPh: "صاحب الشيك / الشركة الموردة", chkAmountPh: "مبلغ الشيك (DH)",
        chkOptDef: "نوع الشيك / الحالة", chkOpt1: "شيك صادر", chkOpt2: "شيك وارد", chkOpt3: "مضمون", chkLblDt: "تاريخ ووقت التنبيه:", chkBtnAdd: "+ تسجيل الشيك", chkListT: "سجل الشيكات",
        shortcutAddBtn: "+ إضافة",
        homeShortcutAddBtn: "+ إضافة قائمة رئيسية",
        stkFormT: "إضافة سلعة للمخزن", itemNamePh: "اسم المنتج / القطعة (اكتب أو اختر)", itemQtyPh: "الكمية", itemPricePh: "الثمن الواحد (DH)", stkLblDt: "وقت التنبيه (اختياري):", stkBtnAdd: "+ إضافة للمخزن", stkListT: "سجل المخزن",
        srvFormT: "تسجيل موعد / زبون", clientNamePh: "اسم الزبون", clientPhonePh: "رقم الهاتف (مثال: 06xxxxxxxx)", clientMapPh: "رابط Google Maps أو إحداثيات الموقع (اختياري)", climTypePh: "نوع المكيف / التفاصيل", srvOptDef: "اختيار نوع الخدمة", srvOpt1: "تركيب", srvOpt2: "تنظيف", srvOpt3: "مراجعة", srvOpt4: "إصلاح", srvLblDt: "وقت التنبيه (اختياري):", srvBtnAdd: "+ تسجيل الخدمة", srvListT: "سجل الزبائن والخدمات",
        ntsFormT: "إضافة ملاحظة / تذكير", noteTextPh: "اكتب الملاحظة أو التذكير هنا...", ntsLblDt: "وقت التنبيه (اختياري):", ntsBtnAdd: "+ حفظ الملاحظة", ntsListT: "كناش الملاحظات",
        setT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='3.2'/><path d='M12 3v2.4M12 18.6V21M4.2 12H6.6M17.4 12h2.4M6.3 6.3l1.7 1.7M16 16l1.7 1.7M17.7 6.3 16 8M8 16l-1.7 1.7'/></svg> إعدادات التطبيق والتقارير", setDesc: "يمكنك طباعة كاع معلومات التطبيق في ملف PDF منظم أو مسح البيانات.", btnPdf: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2'/><rect x='6' y='14' width='12' height='7'/></svg> طباعة تقرير PDF شامل", btnProfile: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='8' r='3.6'/><path d='M4.5 20.2c1-3.6 4-5.7 7.5-5.7s6.5 2.1 7.5 5.7'/></svg> تعديل الملف الشخصي", btnNotif: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3a5 5 0 0 0-5 5v3.3L5.2 15h13.6L17 11.3V8a5 5 0 0 0-5-5z'/><path d='M9.5 18a2.5 2.5 0 0 0 5 0'/></svg> تفعيل إشعارات الهاتف", btnDelAll: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> مسح جميع بيانات الحساب نهائياً",
        setNotifModeT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='13' r='8'/><path d='M12 9v4l3 2'/><path d='M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5'/></svg> نمط التنبيهات", setNotifModeDesc: "اختر الطريقة اللي بغيتي بيها توصلك التنبيهات على حساب اللي كيناسبك.",
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
        deviceProfileSub: "هاد المعلومات غادي تبان فقط فالدردشة باش نعرفو شكون كتب شنو، حتى ولو كلشي داخل بنفس الحساب.", deviceProfileFirstnamePh: "الاسم", deviceProfileLastnamePh: "اللقب", deviceProfilePhonePh: "رقم الهاتف (اختياري، باش يقدرو أعضاء الفريق يتصلو بيك)", deviceProfileEmailPh: "الإيميل الشخصي (اختياري، باش يقدر المسؤول يزيدك كعامل)", deviceProfileAvatarLbl: "اختر أفاتار (اختياري):", deviceProfileSaveBtn: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M4 4h13l3 3v13H4z'/><path d='M8 4v5h8V4'/><rect x='8' y='13' width='8' height='6'/></svg> حفظ",
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
        mEmpT: "Employés", mEmpD: "Ajouter, chat privé, bloquer", empTitleT: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='8' r='3.6'/><path d='M4.5 20.2c1-3.6 4-5.7 7.5-5.7s6.5 2.1 7.5 5.7'/><path d='M6.5 8.5c1.5-1 3.6-1.6 5.5-1.6s4 .6 5.5 1.6' stroke-width='1.4'/></svg> Employés", empSubT: "Chaque employé ayant un compte sur cette appli apparaît ici automatiquement. Vous pouvez lui écrire en privé, l'ajouter au groupe, ou le bloquer.",
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
        btnApprove: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M8 12.5l2.5 2.5 5.5-6'/></svg> Approuver", btnReject: "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><circle cx='12' cy='12' r='9'/><path d='M9 9l6 6M15 9l-6 6'/></svg> Rejeter", confirmReject: "Rejeter cette modification ?",
        editApprovedFrom: "Modification de",
        chkFormT: "Enregistrer un nouveau chèque", chkNumPh: "N° du chèque", chkOwnerPh: "Propriétaire / Fournisseur", chkAmountPh: "Montant (DH)",
        chkOptDef: "Type / Statut du chèque", chkOpt1: "Chèque émis", chkOpt2: "Chèque reçu", chkOpt3: "Garanti", chkLblDt: "Date et heure de l'alerte :", chkBtnAdd: "+ Enregistrer le chèque", chkListT: "Historique des chèques",
        shortcutAddBtn: "+ Ajouter",
        homeShortcutAddBtn: "+ Ajouter au menu principal",
        stkFormT: "Ajouter au stock", itemNamePh: "Nom du produit / pièce", itemQtyPh: "Quantité", itemPricePh: "Prix unitaire (DH)", stkLblDt: "Heure d'alerte (optionnel) :", stkBtnAdd: "+ Ajouter au stock", stkListT: "Historique du stock",
        srvFormT: "Enregistrer un RDV / Client", clientNamePh: "Nom du client", clientPhonePh: "Téléphone (ex: 06xxxxxxxx)", clientMapPh: "Lien Google Maps ou position (optionnel)", climTypePh: "Type de clim / Détails", srvOptDef: "Sélectionner le service", srvOpt1: "Installation", srvOpt2: "Nettoyage", srvOpt3: "Révision", srvOpt4: "Réparation", srvLblDt: "Heure d'alerte (optionnel) :", srvBtnAdd: "+ Enregistrer le service", srvListT: "Historique des clients & services",
        ntsFormT: "Ajouter une note / rappel", noteTextPh: "Écrivez votre note ou rappel ici...", ntsLblDt: "Heure d'alerte (optionnel) :", ntsBtnAdd: "+ Enregistrer la note", ntsListT: "Carnet de notes",
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
      document.getElementById('emp-title-t').innerHTML = t.empTitleT; document.getElementById('emp-sub-t').innerHTML = t.empSubT;
      renderEmployeesList();
      renderChequesListUI();
      renderStockListUI();
      renderInstallationsListUI();
      renderNotesListUI();
      renderNavShortcuts();

      document.getElementById('chat-choice-title').innerHTML = t.chatChoiceTitle;
      document.getElementById('chat-choice-group-t').innerHTML = t.chatChoiceGroup;
      document.getElementById('chat-choice-private-t').innerHTML = t.chatChoicePrivate;
      document.getElementById('chat-choice-code-t').innerHTML = t.chatChoiceCode;
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
      document.getElementById('srv-btn-add').innerHTML = t.srvBtnAdd;
      document.getElementById('srv-list-t').innerHTML = t.srvListT;

      document.getElementById('nts-form-t').innerHTML = t.ntsFormT;
      document.getElementById('note-text').placeholder = t.noteTextPh;
      document.getElementById('nts-lbl-dt').innerHTML = t.ntsLblDt;
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

      document.getElementById('nav-lbl-1').innerHTML = t.nav1;
      document.getElementById('nav-lbl-2').innerHTML = t.nav2;
      document.getElementById('nav-lbl-3').innerHTML = t.nav3;
      document.getElementById('nav-lbl-4').innerHTML = t.nav4;
      document.getElementById('nav-lbl-5').innerHTML = t.nav5;
      document.getElementById('nav-lbl-6').innerHTML = t.nav6;
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
      renderPrivateChatList();
      renderPrivateMessages();

      updateNotificationBoxes();
      updateBellNotifications();
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
      const myId = getDeviceId();
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
        alert(currentLang === 'ar' ? "المتصفح ديالك ما كيدعمش الإشعارات." : "Votre navigateur ne supporte pas les notifications.");
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

    // ==================== اختصارات الشريط السفلي ====================
    const ICON_PATHS = {
      cheques: '<rect x="2" y="5" width="20" height="14" rx="2.2"/><line x1="2" y1="9.5" x2="22" y2="9.5"/><path d="M14 15.5l2 2 4-4"/>',
      stock: '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/>',
      install: '<path d="M6.4 17.6 3 21m2-13 3 3m10.6 8.6L21 21m-6.3-9.7 5.6-5.6a4.2 4.2 0 0 1-5.5 5.5l-6.9 6.9a1.5 1.5 0 0 1-2.1-2.1l6.9-6.9a4.2 4.2 0 0 1 5.5-5.5l-3.6 3.6z"/>',
      notes: '<rect x="4" y="3" width="14" height="18" rx="1.4"/><line x1="7" y1="8" x2="14" y2="8"/><line x1="7" y1="12" x2="11.5" y2="12"/><path d="M15.3 17.2 19.4 13l1.6 1.6-4.1 4.2-2.1.5z"/>',
      chat: '<path d="M4 5h16v10.5H10.5L6 19v-3.5H4z"/><line x1="7.5" y1="8.8" x2="16.5" y2="8.8"/><line x1="7.5" y1="11.8" x2="13.5" y2="11.8"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.9 7.9 0 0 0 0-3l2-1.6-2-3.4-2.4.7a7.7 7.7 0 0 0-2.6-1.5L14 2h-4l-.4 2.7a7.7 7.7 0 0 0-2.6 1.5l-2.4-.7-2 3.4 2 1.6a7.9 7.9 0 0 0 0 3l-2 1.6 2 3.4 2.4-.7a7.7 7.7 0 0 0 2.6 1.5L10 22h4l.4-2.7a7.7 7.7 0 0 0 2.6-1.5l2.4.7 2-3.4z"/>',
      employees: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.2c1-3.6 4-5.7 7.5-5.7s6.5 2.1 7.5 5.7"/>',
      groups: '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="9.4" r="2.6"/><path d="M3.5 20c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5"/><path d="M14.2 15.3c2 .3 3.5 1.9 4.1 4.2"/>',
      home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9.5a1 1 0 0 0 1 1h3.2v-5.8h3.6v5.8H17a1 1 0 0 0 1-1V10"/>'
    };
    function svgIcon(name, size) {
      return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ''}</svg>`;
    }

    const availableNavShortcuts = [
      { id: 'cheques', icon: 'cheques', labelAr: 'الشيكات', labelFr: 'Chèques', onclick: "openSection('cheques-section')" },
      { id: 'stock', icon: 'stock', labelAr: 'المخزن', labelFr: 'Stock', onclick: "openSection('stock-section')" },
      { id: 'install', icon: 'install', labelAr: 'الخدمات', labelFr: 'Services', onclick: "openSection('install-section')" },
      { id: 'notes', icon: 'notes', labelAr: 'ملاحظات', labelFr: 'Notes', onclick: "openSection('notes-section')" },
      { id: 'chat', icon: 'chat', labelAr: 'دردشة', labelFr: 'Chat', onclick: "openChatChoice()" },
      { id: 'settings', icon: 'settings', labelAr: 'الإعدادات', labelFr: 'Paramètres', onclick: "openSection('settings-section')" },
      { id: 'employees', icon: 'employees', labelAr: 'العمال', labelFr: 'Employés', onclick: "openSection('employees-section')" },
      { id: 'groups', icon: 'groups', labelAr: 'المجموعات', labelFr: 'Groupes', onclick: "openSection('groups-list-section')" }
    ];

    function navShortcutsStorageKey() {
      return `deeplite_nav_shortcuts_${currentUid || 'guest'}`;
    }

    function getNavShortcuts() {
      try { return JSON.parse(localStorage.getItem(navShortcutsStorageKey()) || '[]'); } catch (e) { return []; }
    }

    function saveNavShortcuts(list) {
      localStorage.setItem(navShortcutsStorageKey(), JSON.stringify(list));
    }

    function renderNavShortcuts() {
      const wrap = document.getElementById('nav-custom-items');
      if (!wrap) return;
      const active = getNavShortcuts();
      wrap.innerHTML = active.map(id => {
        const cfg = availableNavShortcuts.find(s => s.id === id);
        if (!cfg) return '';
        const label = currentLang === 'ar' ? cfg.labelAr : cfg.labelFr;
        return `<div class="nav-item nav-item-custom" onclick="${cfg.onclick}">
          <span>${svgIcon(cfg.icon, 20)}</span> <span>${label}</span>
        </div>`;
      }).join('');
      updateShortcutToggleButtons();
    }

    function addNavShortcut(id) {
      const list = getNavShortcuts();
      if (!list.includes(id)) { list.push(id); saveNavShortcuts(list); renderNavShortcuts(); }
      closeShortcutPicker();
    }

    function removeNavShortcut(id) {
      const list = getNavShortcuts().filter(s => s !== id);
      saveNavShortcuts(list);
      renderNavShortcuts();
    }

    const toggleShortcutBtnMap = {
      'shortcut-add-btn-cheques': 'cheques',
      'shortcut-add-btn-stock': 'stock',
      'shortcut-add-btn-install': 'install',
      'shortcut-add-btn-notes': 'notes',
      'shortcut-add-btn-employees': 'employees',
      'shortcut-add-btn-chat': 'chat'
    };

    function updateShortcutToggleButtons() {
      const active = getNavShortcuts();
      Object.keys(toggleShortcutBtnMap).forEach(btnId => {
        const el = document.getElementById(btnId);
        if (!el) return;
        const isActive = active.includes(toggleShortcutBtnMap[btnId]);
        el.innerHTML = isActive ? (currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/></svg> إزالة' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Retirer') : (currentLang === 'ar' ? '+ إضافة' : '+ Ajouter');
        el.classList.toggle('is-added', isActive);
      });
    }

    function toggleNavShortcut(id) {
      const list = getNavShortcuts();
      if (list.includes(id)) { removeNavShortcut(id); } else { addNavShortcut(id); }
      updateShortcutToggleButtons();
    }

    function openShortcutPicker() {
      document.getElementById('sp-title-t').innerHTML = (currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> أضف اختصارًا إلى الشريط السفلي ' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Ajouter un raccourci ') + `<span style="font-size:12px; cursor:pointer;" onclick="closeShortcutPicker()">✕ ${currentLang === 'ar' ? 'إغلاق' : 'Fermer'}</span>`;
      const active = getNavShortcuts();
      const remaining = availableNavShortcuts.filter(s => !active.includes(s.id));
      const content = document.getElementById('shortcut-picker-content');
      if (remaining.length === 0) {
        content.innerHTML = `<div class="shortcut-picker-empty">${currentLang === 'ar' ? 'لقد أضفت جميع الاختصارات المتاحة.' : 'Vous avez déjà ajouté tous les raccourcis disponibles.'}</div>`;
      } else {
        content.innerHTML = remaining.map(s => `<div class="shortcut-picker-row" onclick="addNavShortcut('${s.id}')">
          <span class="sp-icon">${svgIcon(s.icon, 18)}</span> <span>${currentLang === 'ar' ? s.labelAr : s.labelFr}</span>
        </div>`).join('');
      }
      closeAllFloatingPopups();
      document.getElementById('shortcut-picker-box').classList.add('show');
      syncFloatingBackdrop();
    }

    function closeShortcutPicker() {
      document.getElementById('shortcut-picker-box').classList.remove('show');
      syncFloatingBackdrop();
    }

    function loadUserData(uid) {
      renderNavShortcuts();
      db.collection('users').doc(uid).collection('cheques').onSnapshot(snapshot => {
        if (snapshot.empty) {
          globalData.cheques = [];
        } else {
          const arr = [];
          snapshot.forEach(doc => { const d = doc.data(); d.id = doc.id; arr.push(d); });
          globalData.cheques = arr;
        }
        renderChequesListUI();
      });

      db.collection('users').doc(uid).collection('stock').onSnapshot(snapshot => {
        if (snapshot.empty) {
          globalData.stock = [];
        } else {
          const arr = [];
          snapshot.forEach(doc => { const d = doc.data(); d.id = doc.id; arr.push(d); });
          globalData.stock = arr;
        }
        renderStockListUI();
      });

      db.collection('users').doc(uid).collection('installations').onSnapshot(snapshot => {
        if (snapshot.empty) {
          globalData.installations = [];
        } else {
          const arr = [];
          snapshot.forEach(doc => { const d = doc.data(); d.id = doc.id; arr.push(d); });
          globalData.installations = arr;
        }
        renderInstallationsListUI();
      });

      db.collection('users').doc(uid).collection('notes').onSnapshot(snapshot => {
        const list = document.getElementById('notes-list');
        if (snapshot.empty) {
          globalData.notes = [];
          list.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:10px;">${currentLang==='ar'?'لا توجد ملاحظات':'Aucune note'}</div>`;
        } else {
          const arr = [];
          snapshot.forEach(doc => { const d = doc.data(); d.id = doc.id; arr.push(d); });
          globalData.notes = arr;
        }
        renderNotesListUI();
      });
    }

    // Ces 4 fonctions affichent les listes à partir de globalData en utilisant
    // la langue actuelle (translations[currentLang]) à chaque appel, au lieu
    // de garder une traduction figée. Elles sont appelées à la fois par les
    // écouteurs onSnapshot (quand les données changent) et par applyLanguage()
    // (quand on change la langue), donc le bouton "مسح/Supprimer" se traduit
    // maintenant immédiatement au changement de langue, sans attendre une
    // modification des données.
    function renderChequesListUI() {
      const t = translations[currentLang];
      const list = document.getElementById('cheques-list');
      if (!list) return;
      if (globalData.cheques.length === 0) {
        list.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:10px;">${currentLang==='ar'?'لا توجد شيكات':'Aucun chèque'}</div>`;
      } else {
        list.innerHTML = sortWithPendingLast(globalData.cheques).map(d => `<div class="item-card ${d.pendingEdit ? 'has-pending-edit' : ''}" id="cheques-item-${d.id}">
          <div class="item-header"><span class="item-title">#${d.num} - ${d.owner}</span><span class="item-badge">${d.amount} DH</span></div>
          <div class="item-sub">${d.type} | ${d.date ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5"/></svg> ' + d.date.replace('T', ' ') : '-'}</div>
          ${formatUpdateInfo(d)}
          ${renderPreviousValueBox('cheques', d)}
          ${renderPendingEditBox('cheques', d)}
          <div class="item-actions"><span></span><span style="display:flex; gap:8px;"><button class="btn-edit" onclick="startEditCheque('${d.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 20l1-4.2L15.8 5 19 8.2 8.2 19z"/><line x1="13.8" y1="6.9" x2="17" y2="10.1"/></svg></button><button class="btn-delete" onclick="deleteItem('cheques', '${d.id}')">${t.delBtn}</button></span></div>
        </div>`).join('');
      }
      updateNotificationBoxes();
      showPersistentRemindersNotification();
      applySearchFilter('cheques');
      updateBellNotifications();
    }

    function renderStockListUI() {
      const t = translations[currentLang];
      const list = document.getElementById('stock-list');
      if (!list) return;
      if (globalData.stock.length === 0) {
        list.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:10px;">${currentLang==='ar'?'المخزن فارغ':'Stock vide'}</div>`;
      } else {
        list.innerHTML = sortWithPendingLast(globalData.stock).map(d => `<div class="item-card ${d.pendingEdit ? 'has-pending-edit' : ''}" id="stock-item-${d.id}">
          <div class="item-header"><span class="item-title">${d.name}</span><span class="item-badge">Qty: ${d.qty} | ${d.price || 0} DH</span></div>
          <div class="item-sub">${d.date ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5"/></svg> ' + d.date.replace('T', ' ') : '-'}</div>
          ${formatUpdateInfo(d)}
          ${renderPreviousValueBox('stock', d)}
          ${renderPendingEditBox('stock', d)}
          <div class="item-actions"><span></span><span style="display:flex; gap:8px;"><button class="btn-edit" onclick="startEditStock('${d.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 20l1-4.2L15.8 5 19 8.2 8.2 19z"/><line x1="13.8" y1="6.9" x2="17" y2="10.1"/></svg></button><button class="btn-delete" onclick="deleteItem('stock', '${d.id}')">${t.delBtn}</button></span></div>
        </div>`).join('');
      }
      updateNotificationBoxes();
      showPersistentRemindersNotification();
      applySearchFilter('stock');
      updateBellNotifications();
    }

    function renderInstallationsListUI() {
      const t = translations[currentLang];
      const list = document.getElementById('install-list');
      if (!list) return;
      if (globalData.installations.length === 0) {
        list.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:10px;">${currentLang==='ar'?'لا توجد مواعيد':'Aucun rendez-vous'}</div>`;
      } else {
        list.innerHTML = sortWithPendingLast(globalData.installations).map(d => {
          let mapButtonHtml = '';
          if (d.map) {
            let mapUrl = d.map.startsWith('http') ? d.map : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.map)}`;
            mapButtonHtml = `<a href="${mapUrl}" target="_blank" class="btn-map-link"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z"/><line x1="9" y1="4" x2="9" y2="17"/><line x1="15" y1="6.5" x2="15" y2="19.5"/></svg> Maps</a>`;
          }
          return `<div class="item-card ${d.pendingEdit ? 'has-pending-edit' : ''}" id="installations-item-${d.id}">
            <div class="item-header"><span class="item-title">${d.client}</span><span class="item-badge">${d.service}</span></div>
            <div class="item-sub"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C11.2 21 3 12.8 3 3.7c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1z"/></svg> ${d.phone || '-'} | ${d.clim || '-'}</div>
            <div class="item-sub">${d.date ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5"/></svg> ' + d.date.replace('T', ' ') : '-'}</div>
            ${formatUpdateInfo(d)}
            ${renderPreviousValueBox('installations', d)}
            ${renderPendingEditBox('installations', d)}
            <div class="item-actions">${mapButtonHtml}<span style="display:flex; gap:8px;"><button class="btn-edit" onclick="startEditInstallation('${d.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 20l1-4.2L15.8 5 19 8.2 8.2 19z"/><line x1="13.8" y1="6.9" x2="17" y2="10.1"/></svg></button><button class="btn-delete" onclick="deleteItem('installations', '${d.id}')">${t.delBtn}</button></span></div>
          </div>`;
        }).join('');
      }
      updateNotificationBoxes();
      showPersistentRemindersNotification();
      applySearchFilter('installations');
      updateBellNotifications();
    }

    function renderNotesListUI() {
      const t = translations[currentLang];
      const list = document.getElementById('notes-list');
      if (!list) return;
      if (globalData.notes.length === 0) {
        list.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:10px;">${currentLang==='ar'?'لا توجد ملاحظات':'Aucune note'}</div>`;
      } else {
        list.innerHTML = sortWithPendingLast(globalData.notes).map(d => `<div class="item-card ${d.pendingEdit ? 'has-pending-edit' : ''}" id="notes-item-${d.id}">
          <div class="item-title" style="white-space: pre-wrap;">${d.text}</div>
          ${d.datetime ? `<div class="item-sub"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5"/></svg> ${d.datetime.replace('T', ' ')}</div>` : ''}
          ${formatUpdateInfo(d)}
          ${renderPreviousValueBox('notes', d)}
          ${renderPendingEditBox('notes', d)}
          <div class="item-actions"><span></span><span style="display:flex; gap:8px;"><button class="btn-edit" onclick="startEditNote('${d.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 20l1-4.2L15.8 5 19 8.2 8.2 19z"/><line x1="13.8" y1="6.9" x2="17" y2="10.1"/></svg></button><button class="btn-delete" onclick="deleteItem('notes', '${d.id}')">${t.delBtn}</button></span></div>
        </div>`).join('');
      }
      updateNotificationBoxes();
      showPersistentRemindersNotification();
      applySearchFilter('notes');
      updateBellNotifications();
    }

    // ==================== Edit Mode ====================
    let editingItem = { cheques: null, stock: null, installations: null, notes: null };

    function startEditCheque(id) {
      const item = globalData.cheques.find(x => x.id === id);
      if (!item) return;
      editingItem.cheques = id;
      document.getElementById('chk-num').value = item.num;
      document.getElementById('chk-owner').value = item.owner;
      document.getElementById('chk-amount').value = item.amount;
      document.getElementById('chk-type').value = item.type;
      document.getElementById('chk-date').value = item.date || '';
      document.getElementById('chk-btn-add').innerHTML = currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> تحديث الشيك' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> Mettre à jour';
      document.getElementById('chk-cancel-edit').classList.add('show');
      openSection('cheques-section');
      window.scrollTo(0, 0);
    }

    function cancelEditCheque() {
      editingItem.cheques = null;
      document.getElementById('chk-num').value = ''; document.getElementById('chk-owner').value = ''; document.getElementById('chk-amount').value = ''; document.getElementById('chk-type').selectedIndex = 0; document.getElementById('chk-date').value = '';
      document.getElementById('chk-btn-add').innerHTML = translations[currentLang].chkBtnAdd;
      document.getElementById('chk-cancel-edit').classList.remove('show');
    }

    function startEditStock(id) {
      const item = globalData.stock.find(x => x.id === id);
      if (!item) return;
      editingItem.stock = id;
      document.getElementById('item-name').value = item.name;
      document.getElementById('item-qty').value = item.qty;
      document.getElementById('item-price').value = item.price || '';
      document.getElementById('item-date').value = item.date || '';
      document.getElementById('stk-btn-add').innerHTML = currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> تحديث السلعة' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> Mettre à jour';
      document.getElementById('stk-cancel-edit').classList.add('show');
      openSection('stock-section');
      window.scrollTo(0, 0);
    }

    function cancelEditStock() {
      editingItem.stock = null;
      document.getElementById('item-name').value = ''; document.getElementById('item-qty').value = ''; document.getElementById('item-price').value = ''; document.getElementById('item-date').value = '';
      document.getElementById('stk-btn-add').innerHTML = translations[currentLang].stkBtnAdd;
      document.getElementById('stk-cancel-edit').classList.remove('show');
    }

    function startEditInstallation(id) {
      const item = globalData.installations.find(x => x.id === id);
      if (!item) return;
      editingItem.installations = id;
      document.getElementById('client-name').value = item.client;
      document.getElementById('client-phone').value = item.phone || '';
      document.getElementById('client-map').value = item.map || '';
      document.getElementById('clim-type').value = item.clim || '';
      document.getElementById('service-type').value = item.service;
      document.getElementById('install-date').value = item.date || '';
      document.getElementById('srv-btn-add').innerHTML = currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> تحديث الخدمة' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> Mettre à jour';
      document.getElementById('srv-cancel-edit').classList.add('show');
      openSection('install-section');
      window.scrollTo(0, 0);
    }

    function cancelEditInstallation() {
      editingItem.installations = null;
      document.getElementById('client-name').value = ''; document.getElementById('client-phone').value = ''; document.getElementById('client-map').value = ''; document.getElementById('clim-type').value = ''; document.getElementById('service-type').selectedIndex = 0; document.getElementById('install-date').value = '';
      document.getElementById('srv-btn-add').innerHTML = translations[currentLang].srvBtnAdd;
      document.getElementById('srv-cancel-edit').classList.remove('show');
    }

    function startEditNote(id) {
      const item = globalData.notes.find(x => x.id === id);
      if (!item) return;
      editingItem.notes = id;
      document.getElementById('note-text').value = item.text;
      document.getElementById('note-datetime').value = item.datetime || '';
      document.getElementById('nts-btn-add').innerHTML = currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> تحديث الملاحظة' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> Mettre à jour';
      document.getElementById('nts-cancel-edit').classList.add('show');
      openSection('notes-section');
      window.scrollTo(0, 0);
    }

    function cancelEditNote() {
      editingItem.notes = null;
      document.getElementById('note-text').value = ''; document.getElementById('note-datetime').value = '';
      document.getElementById('nts-btn-add').innerHTML = translations[currentLang].ntsBtnAdd;
      document.getElementById('nts-cancel-edit').classList.remove('show');
    }

    function addCheque() {
      if (!currentUid) return;
      const num = document.getElementById('chk-num').value.trim();
      const owner = document.getElementById('chk-owner').value.trim();
      const amount = document.getElementById('chk-amount').value.trim();
      const type = document.getElementById('chk-type').value;
      const date = document.getElementById('chk-date').value;
      if (!num || !owner || !amount || !type) { alert(currentLang === 'ar' ? "المرجو ملء جميع خانات الشيك!\nVeuillez remplir tous les champs !" : "Veuillez remplir tous les champs !\nالمرجو ملء جميع خانات الشيك!"); return; }
      if (editingItem.cheques) {
        submitPendingEdit('cheques', editingItem.cheques, { num, owner, amount, type, date });
        cancelEditCheque();
      } else {
        db.collection('users').doc(currentUid).collection('cheques').add({ num, owner, amount, type, date, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: new Date().toISOString(), updatedBy: currentUserLabel() }).then(() => {
          document.getElementById('chk-num').value = ''; document.getElementById('chk-owner').value = ''; document.getElementById('chk-amount').value = ''; document.getElementById('chk-type').selectedIndex = 0; document.getElementById('chk-date').value = '';
        });
      }
    }

    function addStockItem() {
      if (!currentUid) return;
      const name = document.getElementById('item-name').value.trim();
      const qty = document.getElementById('item-qty').value.trim();
      const price = document.getElementById('item-price').value.trim() || "0";
      const date = document.getElementById('item-date').value;
      if (!name || !qty) { alert(currentLang === 'ar' ? "المرجو إدخال اسم القطعة والكمية!\nVeuillez entrer le nom et la quantité !" : "Veuillez entrer le nom et la quantité !\nالمرجو إدخال اسم القطعة والكمية!"); return; }
      if (editingItem.stock) {
        submitPendingEdit('stock', editingItem.stock, { name, qty, price, date });
        cancelEditStock();
      } else {
        db.collection('users').doc(currentUid).collection('stock').add({ name, qty, price, date, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: new Date().toISOString(), updatedBy: currentUserLabel() }).then(() => {
          document.getElementById('item-name').value = ''; document.getElementById('item-qty').value = ''; document.getElementById('item-price').value = ''; document.getElementById('item-date').value = '';
        });
      }
    }

    function addInstallation() {
      if (!currentUid) return;
      const client = document.getElementById('client-name').value.trim();
      const phone = document.getElementById('client-phone').value.trim();
      const map = document.getElementById('client-map').value.trim();
      const clim = document.getElementById('clim-type').value.trim();
      const service = document.getElementById('service-type').value;
      const date = document.getElementById('install-date').value;
      if (!client || !service) { alert(currentLang === 'ar' ? "المرجو إدخال اسم الزبون ونوع الخدمة!\nVeuillez entrer le client et le service !" : "Veuillez entrer le client et le service !\nالمرجو إدخال اسم الزبون ونوع الخدمة!"); return; }
      if (editingItem.installations) {
        submitPendingEdit('installations', editingItem.installations, { client, phone, map, clim, service, date });
        cancelEditInstallation();
      } else {
        db.collection('users').doc(currentUid).collection('installations').add({ client, phone, map, clim, service, date, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: new Date().toISOString(), updatedBy: currentUserLabel() }).then(() => {
          document.getElementById('client-name').value = ''; document.getElementById('client-phone').value = ''; document.getElementById('client-map').value = ''; document.getElementById('clim-type').value = ''; document.getElementById('service-type').selectedIndex = 0; document.getElementById('install-date').value = '';
        });
      }
    }

    function addNote() {
      if (!currentUid) return;
      const text = document.getElementById('note-text').value.trim();
      const datetime = document.getElementById('note-datetime').value;
      if (!text) { alert(currentLang === 'ar' ? "المرجو كتابة نص الملاحظة!\nVeuillez écrire la note !" : "Veuillez écrire la note !\nالمرجو كتابة نص الملاحظة!"); return; }
      if (editingItem.notes) {
        submitPendingEdit('notes', editingItem.notes, { text, datetime });
        cancelEditNote();
      } else {
        db.collection('users').doc(currentUid).collection('notes').add({ text, datetime, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: new Date().toISOString(), updatedBy: currentUserLabel() }).then(() => {
          document.getElementById('note-text').value = ''; document.getElementById('note-datetime').value = '';
        });
      }
    }

    function deleteItem(col, id) {
      if (!currentUid) return;
      if (confirm(currentLang === 'ar' ? "هل أنت متأكد من الحذف؟\nÊtes-vous sûr de vouloir supprimer ?" : "Êtes-vous sûr de vouloir supprimer ?\nهل أنت متأكد من الحذف؟")) { 
        db.collection('users').doc(currentUid).collection(col).doc(id).delete(); 
      }
    }

    function confirmAndDeleteEverything() {
      if (!currentUid) return;
      let msg1 = currentLang === 'ar' ? "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> تحذير خطير: هل أنت متأكد تماماً أنك تريد مسح كاع بيانات التطبيق؟\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> Attention : Voulez-vous vraiment tout supprimer ?" : "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> Attention : Voulez-vous vraiment tout supprimer ?\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> تحذير خطير: هل أنت متأكد تماماً أنك تريد مسح كاع بيانات التطبيق؟";
      if (confirm(msg1)) {
        let promptMsg = currentLang === 'ar' ? "لأمانة بياناتك، اكتب كلمة (مسح) أو (supprimer) للتأكيد:\nTapez (supprimer) pour confirmer :" : "Tapez (supprimer) pour confirmer :\nلأمانة بياناتك، اكتب كلمة (مسح) أو (supprimer) للتأكيد:";
        let confirm2 = prompt(promptMsg);
        if (confirm2 === "مسح" || confirm2 === "supprimer") {
          ['cheques', 'stock', 'installations', 'notes'].forEach(col => {
            db.collection('users').doc(currentUid).collection(col).get().then(snap => snap.forEach(d => d.ref.delete()));
          });
          alert(currentLang === 'ar' ? "تم مسح جميع بيانات الحساب بنجاح!\nToutes les données ont été supprimées avec succès !" : "Toutes les données ont été supprimées avec succès !\nتم مسح جميع بيانات الحساب بنجاح!");
          openSection('home-section');
        } else {
          alert(currentLang === 'ar' ? "تم إلغاء العملية.\nOpération annulée." : "Opération annulée.\nتم إلغاء العملية.");
        }
      }
    }

    function exportSectionPDF(type) {
      const configs = {
        cheques: {
          title: currentLang === 'ar' ? 'سجل الشيكات' : 'Registre des chèques',
          headers: currentLang === 'ar' ? ['رقم', 'المالك', 'المبلغ', 'النوع', 'التاريخ'] : ['N°', 'Propriétaire', 'Montant', 'Type', 'Date'],
          rows: globalData.cheques.map(c => [c.num, c.owner, `${c.amount} DH`, c.type, c.date || '-'])
        },
        stock: {
          title: currentLang === 'ar' ? 'سجل المخزن' : 'Registre du stock',
          headers: currentLang === 'ar' ? ['المنتج', 'الكمية', 'الثمن', 'التاريخ'] : ['Article', 'Quantité', 'Prix', 'Date'],
          rows: globalData.stock.map(s => [s.name, s.qty, `${s.price || 0} DH`, s.date || '-'])
        },
        installations: {
          title: currentLang === 'ar' ? 'سجل الزبائن والخدمات' : 'Clients & Services',
          headers: currentLang === 'ar' ? ['الزبون', 'الهاتف', 'الموقع', 'التفاصيل', 'الخدمة', 'التاريخ'] : ['Client', 'Téléphone', 'Maps', 'Détails', 'Service', 'Date'],
          rows: globalData.installations.map(i => [i.client, i.phone || '-', i.map || '-', i.clim || '-', i.service, i.date || '-'])
        },
        notes: {
          title: currentLang === 'ar' ? 'كناش الملاحظات' : 'Notes',
          headers: currentLang === 'ar' ? ['الملاحظة', 'التاريخ'] : ['Note', 'Date'],
          rows: globalData.notes.map(n => [n.text, n.datetime || '-'])
        }
      };
      const cfg = configs[type];
      if (!cfg) return;
      let printWindow = window.open('', '_blank');
      let htmlContent = `
        <html lang="${currentLang}" dir="${translations[currentLang].dir}">
        <head>
          <meta charset="UTF-8">
          <title>Deep Lite Clim - ${cfg.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; direction: ${translations[currentLang].dir}; }
            h1 { text-align: center; color: #0284c7; margin-bottom: 5px; }
            p { text-align: center; color: #64748b; font-size: 12px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: ${currentLang==='ar'?'right':'left'}; }
            th { background-color: #f1f5f9; color: #0f172a; }
          </style>
        </head>
        <body>
          <h1>Deep Lite HVAC - ${cfg.title}</h1>
          <p>Date: ${new Date().toLocaleString()}</p>
          <table><tr>${cfg.headers.map(h => `<th>${h}</th>`).join('')}</tr>
          ${cfg.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
          </table>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }

    function printPDFReport() {
      let printWindow = window.open('', '_blank');
      let htmlContent = `
        <html lang="${currentLang}" dir="${translations[currentLang].dir}">
        <head>
          <meta charset="UTF-8">
          <title>Deep Lite Clim - Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; direction: ${translations[currentLang].dir}; }
            h1 { text-align: center; color: #0284c7; margin-bottom: 5px; }
            h2 { border-bottom: 2px solid #0284c7; padding-bottom: 5px; margin-top: 25px; color: #1e293b; font-size: 18px; }
            p { text-align: center; color: #64748b; font-size: 12px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: ${currentLang==='ar'?'right':'left'}; }
            th { background-color: #f1f5f9; color: #0f172a; }
          </style>
        </head>
        <body>
          <h1>Deep Lite HVAC - Report</h1>
          <p>Date: ${new Date().toLocaleString()}</p>
          <h2>Chèques (${globalData.cheques.length})</h2>
          <table><tr><th>N°</th><th>Propriétaire</th><th>Montant</th><th>Type</th><th>Date</th></tr>
          ${globalData.cheques.map(c => `<tr><td>${c.num}</td><td>${c.owner}</td><td>${c.amount} DH</td><td>${c.type}</td><td>${c.date || '-'}</td></tr>`).join('')}
          </table>
          <h2>Stock (${globalData.stock.length})</h2>
          <table><tr><th>Article</th><th>Quantité</th><th>Prix</th><th>Alerte</th></tr>
          ${globalData.stock.map(s => `<tr><td>${s.name}</td><td>${s.qty}</td><td>${s.price || 0} DH</td><td>${s.date || '-'}</td></tr>`).join('')}
          </table>
          <h2>Services & Clients (${globalData.installations.length})</h2>
          <table><tr><th>Client</th><th>Téléphone</th><th>Maps</th><th>Clim / Détails</th><th>Service</th><th>Date</th></tr>
          ${globalData.installations.map(i => `<tr><td>${i.client}</td><td>${i.phone || '-'}</td><td>${i.map || '-'}</td><td>${i.clim || '-'}</td><td>${i.service}</td><td>${i.date || '-'}</td></tr>`).join('')}
          </table>
          <h2>Notes (${globalData.notes.length})</h2>
          <table><tr><th>Note</th><th>Date</th></tr>
          ${globalData.notes.map(n => `<tr><td>${n.text}</td><td>${n.datetime || '-'}</td></tr>`).join('')}
          </table>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }

    applyLanguage();
    applyNotifSettingsSelects();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }
