    // ==================== Groupes (متعددين، بحال واتساب: كل مجموعة بالأعضاء والدردشة ديالها) ====================
    let ownedGroupsCache = [];      // المجموعات ديال الحساب ديالي (currentUid هو صاحبها)
    let externalGroupsCache = [];   // مجموعات ديال حسابات أخرين تزدت ليهم بالكود
    let ownedGroupsUnsub = null;
    let externalGroupsUnsub = null;
    let currentGroupId = null;
    let groupMsgsUnsub = null;
    let groupMsgsCache = [];

    // مجموعات مزادة قبل ما نزيدو allAuthorizedUids (لحماية الرسائل) ماعندهاش هاد الحقل بعد.
    // كل مرة كنقراو المجموعات ديالنا، كنكملو الحقل الناقص تلقائياً باش تخدم رسائلها.
    function backfillMissingAuthorizedUids(groups) {
      groups.forEach(g => {
        if (g.allAuthorizedUids) return;
        const extUids = Object.values(g.externalMembers || {}).map(m => m.uid).filter(Boolean);
        const all = Array.from(new Set([...(g.memberIds || []), ...extUids]));
        db.collection('groups').doc(g.id).update({ allAuthorizedUids: all }).catch(() => {});
      });
    }

    function startGroupsListeners() {
      if (ownedGroupsUnsub) { ownedGroupsUnsub(); ownedGroupsUnsub = null; }
      if (externalGroupsUnsub) { externalGroupsUnsub(); externalGroupsUnsub = null; }
      ownedGroupsCache = []; externalGroupsCache = [];
      if (!currentUid) return;
      // ⚠️ تصحيح: كنقراو بـ memberIds array-contains عوض ownerUid — باش كل عضو مزاد
      // لمجموعة (ماشي غير خالقها) يقدر يشوفها ويوصل ليها.
      ownedGroupsUnsub = db.collection('groups').where('memberIds', 'array-contains', currentUid).onSnapshot(snap => {
        ownedGroupsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        backfillMissingAuthorizedUids(ownedGroupsCache);
        renderGroupsList();
        updateBellNotifications();
        updateChatUnreadBadge();
        __directGroupDebugUpdate();
      }, err => console.error('[DeepliteClim] ownedGroups listener died:', err));
      const p = getDeviceProfile();
      if (p && p.code) {
        externalGroupsUnsub = db.collection('groups').where('externalMemberCodes', 'array-contains', p.code).onSnapshot(snap => {
          externalGroupsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          backfillMissingAuthorizedUids(externalGroupsCache);
          renderGroupsList();
          updateBellNotifications();
          updateChatUnreadBadge();
          __directGroupDebugUpdate();
        }, err => console.error('[DeepliteClim] externalGroups listener died:', err));
      }
    }

    // ⚠️ اختبار معزول مؤقت: كيكتب مباشرة فشريط أحمر ثابت فوق الصفحة، بلا ما يمر بأي
    // دالة أخرى (لا computeGroupChatUnread، لا updateBellNotifications، لا notify-msgs) —
    // باش نتأكدو واش الـlistener ديال المجموعات كيتوصل بيه فعلا بتحديثات حية.
    let __directGroupDebugCount = 0;
    function __directGroupDebugUpdate() {
      __directGroupDebugCount++;
      let el = document.getElementById('__direct-group-debug');
      if (!el) {
        el = document.createElement('div');
        el.id = '__direct-group-debug';
        el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#dc2626;color:#fff;font-size:11px;padding:4px 8px;direction:ltr;text-align:left;';
        document.body.appendChild(el);
      }
      const myId = currentUid;
      let total = 0;
      ownedGroupsCache.forEach(g => { total += (g.unread && myId && g.unread[myId]) || 0; });
      el.innerText = 'GROUP-DEBUG • listener fired: ' + __directGroupDebugCount + 'x • groups: ' + ownedGroupsCache.length + ' • unread total: ' + total + ' • ' + new Date().toLocaleTimeString();
    }

    function restartExternalGroupsListenerIfNeeded() {
      const p = getDeviceProfile();
      if (!externalGroupsUnsub && p && p.code && currentUid) {
        externalGroupsUnsub = db.collection('groups').where('externalMemberCodes', 'array-contains', p.code).onSnapshot(snap => {
          externalGroupsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          renderGroupsList();
          updateBellNotifications();
          updateChatUnreadBadge();
        }, err => console.error('[DeepliteClim] externalGroups listener died:', err));
      }
    }

    function myVisibleGroups() {
      return ownedGroupsCache.concat(externalGroupsCache);
    }

    function findGroupById(id) {
      return ownedGroupsCache.find(g => g.id === id) || externalGroupsCache.find(g => g.id === id);
    }

    function isGroupExternalForMe(g) {
      return !!g && !((g.memberIds || []).includes(currentUid));
    }

    function myGroupSenderKey(g) {
      if (!g) return null;
      if (isGroupExternalForMe(g)) { const p = getDeviceProfile(); return p ? p.code : null; }
      return currentUid;
    }

    function renderGroupsList() {
      const box = document.getElementById('groups-list');
      if (!box) return;
      const groups = myVisibleGroups();
      if (!groups.length) {
        box.innerHTML = emptyStateHTML(
          '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="8" r="3"/><circle cx="16.2" cy="9" r="2.6"/><path d="M3 19c.7-3 3-4.8 5.7-4.8S13.8 16 14.5 19"/><path d="M14.9 14.5c2.1.4 3.6 1.9 4.1 4.4"/></svg>',
          'لا توجد أي مجموعة حتى الآن', 'Aucun groupe pour le moment',
          'أنشئ مجموعة جديدة أو انضم برمز', 'Créez-en un ou rejoignez avec un code'
        );
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
      const myId = currentUid;
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
      const myId = currentUid;
      const chosen = Array.from(document.querySelectorAll('.cg-member-cb:checked')).map(cb => cb.value);
      const memberIds = Array.from(new Set([myId, ...chosen]));
      generateUniqueGroupCode(code => {
        db.collection('groups').add({
          ownerUid: currentUid,
          name,
          inviteCode: code,
          memberIds,
          allAuthorizedUids: memberIds, // ⚠️ يجمع memberIds + أي عضو خارجي دخل بالكود لاحقاً — الـrules كتخدم بيه باش تحمي الرسائل
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
          if (g.ownerUid === currentUid && (g.memberIds || []).includes(currentUid)) {
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
            ['externalMembers.' + myCode]: { uid: currentUid, deviceId: currentUid, name: deviceDisplayName(p), avatar: p.avatar || '', avatarIsPhoto: !!p.avatarIsPhoto },
            allAuthorizedUids: firebase.firestore.FieldValue.arrayUnion(currentUid),
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
          alert(currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> تم حظرك، لا يمكنك إرسال رسائل.' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Vous avez été bloqué, vous ne pouvez pas envoyer de messages.');
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
        db.collection('groups').doc(currentGroupId).update(unreadUpdate).catch(err => {
          console.error('[DeepliteClim] group unread update failed:', err);
          showSaveError(err);
        });
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

    // ⚠️ computeGroupChatUnread() ولات معرّفة فـchat.js، ماشي هنا (كانت هنا نسخة قديمة مكررة)
    function updateChatUnreadBadge() {
      const badge = document.getElementById('chat-unread-badge');
      const homeBadge = document.getElementById('badge-chat');
      const topBadge = document.getElementById('msgs-badge');
      const unread = computeGroupChatUnread() + computeTotalPrivateUnread();
      if (unread > 0) {
        if (badge) { badge.innerText = unread > 9 ? '9+' : String(unread); badge.style.display = 'flex'; }
        if (homeBadge) { homeBadge.innerText = unread > 9 ? '9+' : String(unread); homeBadge.style.display = 'flex'; }
        // ⚠️ تحديث مباشر وبسيط لنفس الشارة الفوقانية (msgs-badge)، بنفس الطريقة المباشرة
        // اللي كتخدم بيها badge-chat — بلا ما تعدي عبر السلسلة الطويلة ديال
        // updateBellNotifications/computeMsgsBellTotal اللي كانت كتخيب أحيانا.
        if (topBadge) { topBadge.innerText = unread > 9 ? '9+' : String(unread); topBadge.style.display = 'flex'; }
      } else {
        if (badge) badge.style.display = 'none';
        if (homeBadge) homeBadge.style.display = 'none';
        if (topBadge) topBadge.style.display = 'none';
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
      const myId = currentUid;
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
        allAuthorizedUids: firebase.firestore.FieldValue.arrayUnion(memberId),
        ['unread.' + memberId]: 0
      }).then(() => {
        const g = findGroupById(currentGroupId);
        if (g) { g.memberIds = Array.from(new Set([...(g.memberIds || []), memberId])); renderGroupCurrentMembers(g); renderGroupAddMembers(g); }
      });
    }

    function removeGroupMember(key, isExternal) {
      if (!currentGroupId) return;
      if (!confirm(currentLang === 'ar' ? 'هل أنت متأكد من رغبتك في إزالة هذا العضو من المجموعة؟' : 'Retirer ce membre du groupe ?')) return;
      const g = findGroupById(currentGroupId);
      if (isExternal) {
        const extUid = g && g.externalMembers && g.externalMembers[key] ? g.externalMembers[key].uid : null;
        const update = {
          externalMemberCodes: firebase.firestore.FieldValue.arrayRemove(key),
          ['externalMembers.' + key]: firebase.firestore.FieldValue.delete()
        };
        if (extUid) update.allAuthorizedUids = firebase.firestore.FieldValue.arrayRemove(extUid);
        db.collection('groups').doc(currentGroupId).update(update).then(() => {
          const g2 = findGroupById(currentGroupId);
          if (g2) { g2.externalMemberCodes = (g2.externalMemberCodes || []).filter(c => c !== key); delete g2.externalMembers[key]; renderGroupCurrentMembers(g2); }
        });
      } else {
        db.collection('groups').doc(currentGroupId).update({
          memberIds: firebase.firestore.FieldValue.arrayRemove(key),
          allAuthorizedUids: firebase.firestore.FieldValue.arrayRemove(key)
        }).then(() => {
          const g2 = findGroupById(currentGroupId);
          if (g2) { g2.memberIds = (g2.memberIds || []).filter(id => id !== key); renderGroupCurrentMembers(g2); renderGroupAddMembers(g2); }
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

    function isGroupOwner(g) {
      return !!g && g.ownerUid === currentUid;
    }

    function deleteCurrentGroup() {
      if (!currentGroupId) return;
      const g = findGroupById(currentGroupId);
      if (!isGroupOwner(g)) {
        alert(currentLang === 'ar' ? 'حذف المجموعة متاح فقط لمن أنشأها.' : "Seul le créateur du groupe peut le supprimer.");
        return;
      }
      if (!confirm(currentLang === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذه المجموعة نهائياً؟ لن تتمكن من استعادتها!' : 'Supprimer définitivement ce groupe ? Cette action est irréversible !')) return;
      const groupId = currentGroupId;
      db.collection('groups').doc(groupId).delete().then(() => {
        closeGroupSettings();
        closeGroupChat();
      });
    }

