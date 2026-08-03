    // ====================================================================
    // Private Chat (محادثة فردية بين عضوين فنفس الشركة)
    // ====================================================================
    // هاد الملف فيه كل شي مرتبط بالدردشة الخاصة: الحالة (state)، الـlisteners
    // ديال Firestore، الإرسال، العرض، وحساب/عرض الإشعارات المرتبطة بيها.
    // كيعتمد على متغيرات ودوال معرّفة فملفات أخرين (خاصهم يتحملو قبل هاد الملف
    // فـindex.html): teamMembersCache/isMemberBlocked/deviceDisplayName (core.js/chat.js)،
    // db/firebase (firebase-config.js)، currentUid/currentCompanyId/translations/currentLang
    // (core.js/ui.js)، openSection/formatTimeShort/showMemberInfo (ui.js/chat.js)،
    // getDeviceProfile/openDeviceProfileModal/escapeChatText/showSaveError (core.js).
    // كيتنادى من داخلها updateBellNotifications() (فـchat.js) كل مرة كتبدل الحالة، باش
    // شارة/مركز الإشعارات المشترك (اللي كيجمع دردشة الفريق + الخاصة + الخارجية) يتحدث.

    let privateChatsUnsubscribe = null;
    let privateChatsCache = [];
    let currentPrivateChatWith = null;
    let privateMsgsUnsubscribe = null;
    let privateMsgsCache = [];

    function privateChatKey(idA, idB) { return [idA, idB].sort().join('__'); }

    function __showSendDebug(status) {
      let el = document.getElementById('__send-debug');
      if (!el) {
        el = document.createElement('div');
        el.id = '__send-debug';
        el.style.cssText = 'position:fixed;top:66px;left:0;right:0;z-index:999999;background:#ea580c;color:#fff;font-size:11px;padding:4px 8px;direction:ltr;text-align:left;';
        document.body.appendChild(el);
      }
      el.innerText = 'SEND-DEBUG • ' + status;
    }

    let __privateListenerCompanyId = null;
    function startPrivateChatsListener(companyId) {
      if (privateChatsUnsubscribe) { privateChatsUnsubscribe(); privateChatsUnsubscribe = null; }
      privateChatsCache = [];
      __privateListenerCompanyId = companyId;
      if (!companyId) return;
      const myId = currentUid;
      privateChatsUnsubscribe = db.collection('companies').doc(companyId).collection('privateChats')
        .where('participants', 'array-contains', myId)
        .onSnapshot(snap => {
          privateChatsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          renderPrivateChatList();
          if (currentPrivateChatWith) renderPrivateMessages();
          updateBellNotifications();
          if (typeof updateChatUnreadBadge === 'function') updateChatUnreadBadge();
          __directPrivateDebugUpdate();
        }, err => { console.error('[DeepliteClim] privateChats listener died:', err); __directPrivateDebugUpdate('ERROR: ' + err.message); });
    }

    // ⚠️ اختبار معزول مؤقت، بحال __directGroupDebugUpdate() فـgroups.js بالضبط — كيكتب
    // مباشرة فشريط أزرق ثابت فوق الصفحة، بلا ما يمر بأي دالة أخرى (لا computeTotalPrivateUnread،
    // لا updateBellNotifications، لا notify-msgs) — باش نتأكدو واش الـlistener ديال الدردشة
    // الخاصة كيتوصل بيه فعلا بتحديثات حية، ونشوفو القيمة الخام ديال unread مباشرة من Firestore.
    let __directPrivateDebugCount = 0;
    function __directPrivateDebugUpdate(status) {
      __directPrivateDebugCount++;
      let el = document.getElementById('__direct-private-debug');
      if (!el) {
        el = document.createElement('div');
        el.id = '__direct-private-debug';
        el.style.cssText = 'position:fixed;top:22px;left:0;right:0;z-index:999999;background:#2563eb;color:#fff;font-size:11px;padding:4px 8px;direction:ltr;text-align:left;';
        document.body.appendChild(el);
      }
      if (status) { el.innerText = 'PRIVATE-DEBUG • ' + status; return; }
      const myId = currentUid;
      let total = 0;
      privateChatsCache.forEach(c => { total += (c.unread && myId && c.unread[myId]) || 0; });
      el.innerText = 'PRIVATE-DEBUG • listener fired: ' + __directPrivateDebugCount + 'x • convs: ' + privateChatsCache.length + ' • unread total: ' + total + ' • uid:' + (myId ? myId.slice(0,6) : 'NONE') + ' • listenerCompany:' + (__privateListenerCompanyId ? __privateListenerCompanyId.slice(0,10) : 'NONE') + ' • ' + new Date().toLocaleTimeString();
    }
    // كتبان فالحين ملي يتحمل الملف، قبل حتى ما تجاوب Firestore — إلا بقات عالقة عند
    // هاد الحالة "waiting..." معناه الـlistener عمرو ماتنادى أو عمرو ماجاوب
    document.addEventListener('DOMContentLoaded', () => __directPrivateDebugUpdate('waiting for listener to start...'));
    setTimeout(() => __directPrivateDebugUpdate('waiting for listener to start...'), 500);

    function computeTotalPrivateUnread() {
      const myId = currentUid;
      return privateChatsCache.reduce((sum, c) => sum + ((c.unread && c.unread[myId]) || 0), 0);
    }

    function renderPrivateNotifRows() {
      const myId = currentUid;
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
      const myId = currentUid;
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
      const myId = currentUid;
      const myself = teamMembersCache.find(x => x.id === myId);
      if (isMemberBlocked(myself)) {
        alert(currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> تم حظرك من الدردشة، تواصل مع المسؤول.' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Vous avez été bloqué du chat, contactez le responsable.');
        return;
      }
      const other = teamMembersCache.find(x => x.id === otherId);
      if (isMemberBlocked(other)) {
        alert(currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> هذا العضو محظور، قم بإلغاء حظره من "العمال" لتتمكن من مراسلته.' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Ce membre est bloqué, débloquez-le depuis "Employés" pour lui écrire.');
        return;
      }
      currentPrivateChatWith = otherId;
      const m = teamMembersCache.find(x => x.id === otherId);
      document.getElementById('pchat-header-name').innerText = m ? deviceDisplayName(m) : (currentLang === 'ar' ? 'عضو' : 'Membre');
      document.getElementById('pchat-header-avatar').innerHTML = m && m.avatarIsPhoto && m.avatar ? `<img src="${m.avatar}">` : ((m && m.avatar) || '🙂');
      openSection('pchat-section');
      startPrivateMessagesListener(otherId);
    }

    function fromBellOpenPrivate(otherId) {
      document.getElementById('notif-center-box').classList.remove('show');
      document.getElementById('msgs-center-box').classList.remove('show');
      openPrivateChat(otherId);
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
      const myId = currentUid;
      const key = privateChatKey(myId, otherId);
      privateMsgsUnsubscribe = db.collection('companies').doc(currentCompanyId).collection('privateChats').doc(key).collection('messages')
        .orderBy('createdAt', 'asc')
        .onSnapshot(snap => {
          privateMsgsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          renderPrivateMessages();
          scrollPrivateChatToBottom();
          const pchatSec = document.getElementById('pchat-section');
          if (currentPrivateChatWith === otherId && pchatSec && pchatSec.classList.contains('active')) markPrivateChatSeen(otherId);
        });
    }

    function renderPrivateMessages() {
      const box = document.getElementById('pchat-messages');
      if (!box) return;
      if (!privateMsgsCache.length) {
        box.innerHTML = `<div class="chat-empty">${currentLang === 'ar' ? 'لا توجد رسائل بعد، ابدأ المحادثة!' : 'Aucun message, lancez la conversation !'}</div>`;
        return;
      }
      const myId = currentUid;
      const otherId = currentPrivateChatWith;
      const key = otherId ? privateChatKey(myId, otherId) : null;
      const conv = key ? privateChatsCache.find(c => c.id === key) : null;
      const otherSeenAt = (conv && conv.lastSeenAt && otherId && conv.lastSeenAt[otherId] && conv.lastSeenAt[otherId].toDate) ? conv.lastSeenAt[otherId].toDate() : null;
      box.innerHTML = privateMsgsCache.map(m => {
        const mine = m.senderId === myId;
        const avatarHtml = m.senderAvatarIsPhoto && m.senderAvatar ? `<img src="${m.senderAvatar}">` : (m.senderAvatar || '🙂');
        let timeStr = '';
        let msgDate = null;
        try {
          if (m.createdAt && m.createdAt.toDate) { msgDate = m.createdAt.toDate(); timeStr = formatTimeShort(msgDate); }
        } catch (e) {}
        let seenTick = '';
        if (mine) {
          const seen = !!(msgDate && otherSeenAt && otherSeenAt >= msgDate);
          seenTick = seen
            ? `<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-inline-start:3px" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12l4.5 4.5L15 8"/><path d="M9 12l4.5 4.5L22 8"/></svg>`
            : `<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-inline-start:3px" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l4.5 4.5L17 7"/></svg>`;
        }
        return `
          <div class="chat-msg-row ${mine ? 'mine' : ''}">
            <div class="chat-avatar clickable" onclick="showMemberInfo('${m.senderId}')">${avatarHtml}</div>
            <div class="chat-bubble-col">
              <div class="chat-bubble">${escapeChatText(m.text || '')}</div>
              <div class="chat-meta-row">${timeStr}${seenTick}</div>
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
      const myId = currentUid;
      const otherId = currentPrivateChatWith;
      const myself = teamMembersCache.find(x => x.id === myId);
      const other = teamMembersCache.find(x => x.id === otherId);
      if (isMemberBlocked(myself) || isMemberBlocked(other)) {
        alert(currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> هذه المحادثة محظورة، لا يمكنك إرسال رسائل.' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cette conversation est bloquée, envoi impossible.');
        return;
      }
      const key = privateChatKey(myId, otherId);
      const parentRef = db.collection('companies').doc(currentCompanyId).collection('privateChats').doc(key);
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
        parentRef.set(update, { merge: true }).then(() => {
          __showSendDebug('OK: wrote unread.' + otherId.slice(0,6) + '+1 → company:' + (currentCompanyId||'').slice(0,10) + ' key:' + key);
        }).catch(err => {
          console.error('sendPrivateMessage unread update error:', err);
          __showSendDebug('FAIL: ' + err.message);
          showSaveError(err);
        });
        input.value = '';
        scrollPrivateChatToBottom();
      }).catch(err => {
        console.error('sendPrivateMessage error:', err);
        showSaveError(err);
      });
    }

    function markPrivateChatSeen(otherId) {
      if (!currentUid) return;
      const myId = currentUid;
      const key = privateChatKey(myId, otherId);
      const update = {};
      update['unread.' + myId] = 0;
      update['lastSeenAt.' + myId] = firebase.firestore.FieldValue.serverTimestamp();
      db.collection('companies').doc(currentCompanyId).collection('privateChats').doc(key).set(update, { merge: true }).catch(() => {});
    }

    function scrollPrivateChatToBottom() {
      const box = document.getElementById('pchat-messages');
      if (box) box.scrollTop = box.scrollHeight;
    }
