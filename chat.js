    // ==================== Team Members Directory (دابا الهوية الحقيقية = uid ديال الحساب) ====================
    let teamMembersCache = [];
    let membersUnsubscribe = null;

    // كنزيدو غير معلومات جانبية (أفاتار، هاتف) لوثيقة access الموجودة من قبل (تخلقات وقت
    // خلق/انضمام الشركة)، بلا ما نبدلو الاسم ديالها (name) اللي تعمر من قبل
    function upsertMember() {
      if (!currentUid || !currentCompanyId) return;
      const p = getDeviceProfile();
      if (!p || (!p.firstName && !p.lastName)) return;
      db.collection('companies').doc(currentCompanyId).collection('access').doc(currentUid).set({
        avatar: p.avatar || '', avatarIsPhoto: !!p.avatarIsPhoto, phone: p.phone || '',
        lastActive: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }

    function startMembersListener(companyId) {
      if (membersUnsubscribe) { membersUnsubscribe(); membersUnsubscribe = null; }
      teamMembersCache = [];
      if (!companyId) return;
      membersUnsubscribe = db.collection('companies').doc(companyId).collection('access').onSnapshot(snap => {
        teamMembersCache = snap.docs.map(d => ({ id: d.id, firstName: d.data().name || '', lastName: '', ...d.data() }));
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

    function startPrivateChatsListener(companyId) {
      if (privateChatsUnsubscribe) { privateChatsUnsubscribe(); privateChatsUnsubscribe = null; }
      privateChatsCache = [];
      if (!companyId) return;
      const myId = currentUid;
      privateChatsUnsubscribe = db.collection('companies').doc(companyId).collection('privateChats')
        .where('participants', 'array-contains', myId)
        .onSnapshot(snap => {
          privateChatsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          renderPrivateChatList();
          updateBellNotifications();
        });
    }

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

    // ==================== Employees Management (حظر / إضافة للدردشة الجماعية) ====================
    // ملاحظة توافق: الأعضاء اللي زادوا قبل هاد الميزة ماعندهمش حقل role — كنعتبروهم "مسؤول" باش
    // ماتوقفش عليهم الصلاحيات القديمة فجأة. غير role === 'member' الصريح هو لي كيقيد الصلاحيات.
    function memberIsAdmin(m) { return !m || m.role !== 'member'; }

    function isCurrentUserAdmin() {
      // ⚠️ دابا الدور الحقيقي جاي من companies/{companyId}/access/{uid} (currentUserRole)،
      // ماشي من نظام "الجهاز" القديم (teamMembersCache) اللي كان بديل مؤقت من قبل
      return currentUserRole === 'admin';
    }

    function countAdmins() {
      return teamMembersCache.filter(memberIsAdmin).length;
    }

    function toggleMemberRole(memberId) {
      if (!currentUid || !isCurrentUserAdmin()) return;
      const m = teamMembersCache.find(x => x.id === memberId);
      if (!m) return;
      const isAdmin = memberIsAdmin(m);
      if (isAdmin && countAdmins() <= 1) {
        alert(currentLang === 'ar' ? 'لا يمكن تنزيل هذا العضو، يجب أن يبقى مسؤول واحد على الأقل في الحساب.' : 'Impossible de rétrograder ce membre, il doit rester au moins un administrateur.');
        return;
      }
      const newRole = isAdmin ? 'member' : 'admin';
      if (!confirm(currentLang === 'ar'
        ? (isAdmin ? 'هل تريد تنزيل هذا العضو إلى "عامل عادي"؟ لن يتمكن بعدها من حذف العناصر أو إدارة العمال.' : 'هل تريد ترقية هذا العضو إلى "مسؤول"؟ سيحصل على كامل الصلاحيات.')
        : (isAdmin ? 'Rétrograder ce membre en "Employé" ? Il ne pourra plus supprimer d\'éléments ni gérer les employés.' : 'Promouvoir ce membre en "Administrateur" ? Il obtiendra tous les droits.'))) return;
      db.collection('companies').doc(currentCompanyId).collection('access').doc(memberId).set({ role: newRole }, { merge: true }).catch(() => {});
    }

    function isMemberBlocked(m) { return !!(m && m.blocked); }
    function isMemberInGroup(m) { return !m || m.inGroupChat !== false; }

    function toggleMemberBlock(memberId) {
      if (!currentUid || !isCurrentUserAdmin()) return;
      const m = teamMembersCache.find(x => x.id === memberId);
      const newVal = !isMemberBlocked(m);
      if (newVal && !confirm(currentLang === 'ar' ? 'هل أنت متأكد من رغبتك في حظر هذا الموظف؟ لن يتمكن من إرسال رسائل خاصة أو جماعية.' : 'Confirmer le blocage de cet employé ? Il ne pourra plus envoyer de messages (privés ou de groupe).')) return;
      db.collection('companies').doc(currentCompanyId).collection('access').doc(memberId).set({ blocked: newVal }, { merge: true }).catch(() => {});
    }

    function toggleMemberGroup(memberId) {
      if (!currentUid || !isCurrentUserAdmin()) return;
      const m = teamMembersCache.find(x => x.id === memberId);
      const newVal = !isMemberInGroup(m);
      db.collection('companies').doc(currentCompanyId).collection('access').doc(memberId).set({ inGroupChat: newVal }, { merge: true }).catch(() => {});
    }

    function renderEmployeesList() {
      const box = document.getElementById('employees-list');
      if (!box) return;
      const t = translations[currentLang];
      const myId = currentUid;
      const p = getDeviceProfile();
      const myCode = p && p.code ? p.code : null;
      const others = teamMembersCache.filter(m => m.id !== myId);

      const iAmAdmin = isCurrentUserAdmin();
      let html = others.map(m => {
        const avatarHtml = m.avatarIsPhoto && m.avatar ? `<img src="${m.avatar}">` : (m.avatar || '🙂');
        const blocked = isMemberBlocked(m);
        const mIsAdmin = memberIsAdmin(m);
        const roleBadge = `<span class="emp-name-badge ${mIsAdmin ? 'emp-name-badge-blue' : 'emp-name-badge-gray'}">${mIsAdmin ? (currentLang === 'ar' ? 'مسؤول' : 'Administrateur') : (currentLang === 'ar' ? 'عامل عادي' : 'Employé')}</span>`;
        const roleBtn = iAmAdmin ? `<button class="emp-btn" onclick="toggleMemberRole('${m.id}')">${mIsAdmin ? (currentLang === 'ar' ? 'تنزيل لعامل عادي' : 'Rétrograder') : (currentLang === 'ar' ? 'ترقية لمسؤول' : 'Promouvoir admin')}</button>` : '';
        const blockBtn = iAmAdmin ? `<button class="emp-btn ${blocked ? 'emp-danger' : ''}" onclick="toggleMemberBlock('${m.id}')">${blocked ? (currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5.5-6"/></svg> فك الحظر' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5.5-6"/></svg> Débloquer') : (currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> حظر' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Bloquer')}</button>` : '';
        return `<div class="emp-item ${blocked ? 'emp-blocked' : ''}">
          <div class="emp-top-row">
            <div class="members-list-avatar clickable" onclick="showMemberInfo('${m.id}')">${avatarHtml}</div>
            <div class="members-list-info">
              <div class="members-list-name clickable" onclick="showMemberInfo('${m.id}')">${deviceDisplayName(m)}</div>
              ${roleBadge}
              ${blocked ? `<span class="emp-name-badge">${currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> محظور' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Bloqué'}</span>` : ''}
            </div>
          </div>
          <div class="emp-actions">
            <button class="emp-btn" onclick="openPrivateChat('${m.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 6l9 7 9-7"/></svg> ${currentLang === 'ar' ? 'دردشة خاصة' : 'Chat privé'}</button>
            ${blockBtn}
            ${roleBtn}
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
                ${blocked ? `<span class="emp-name-badge">${currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> محظور' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Bloqué'}</span>` : `<span class="item-sub">${currentLang === 'ar' ? 'عامل مضاف بالدعوة' : 'Employé ajouté par invitation'}</span>`}
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
      const myId = currentUid;
      const key = privateChatKey(myId, otherId);
      privateMsgsUnsubscribe = db.collection('companies').doc(currentCompanyId).collection('privateChats').doc(key).collection('messages')
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
      const myId = currentUid;
      box.innerHTML = privateMsgsCache.map(m => {
        const mine = m.senderId === myId;
        const avatarHtml = m.senderAvatarIsPhoto && m.senderAvatar ? `<img src="${m.senderAvatar}">` : (m.senderAvatar || '🙂');
        let timeStr = '';
        try {
          if (m.createdAt && m.createdAt.toDate) timeStr = formatTimeShort(m.createdAt.toDate());
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
        parentRef.set(update, { merge: true });
        input.value = '';
        scrollPrivateChatToBottom();
      });
    }

    function markPrivateChatSeen(otherId) {
      if (!currentUid) return;
      const myId = currentUid;
      const key = privateChatKey(myId, otherId);
      const update = {};
      update['unread.' + myId] = 0;
      db.collection('companies').doc(currentCompanyId).collection('privateChats').doc(key).set(update, { merge: true }).catch(() => {});
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
        uid: currentUid, deviceId: currentUid,
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
      if (!p || !p.code) { alert(currentLang === 'ar' ? 'أكمل الملف الشخصي للجهاز أولاً!\nComplétez d\'abord le profil de l\'appareil !' : 'Complétez d\'abord le profil de l\'appareil !\nأكمل الملف الشخصي للجهاز أولاً!'); return; }
      const resolveCode = (cb) => {
        if (raw.includes('@')) {
          db.collection('emailDirectory').doc(raw.toLowerCase()).get().then(doc => {
            if (!doc.exists || !doc.data().code) { alert(currentLang === 'ar' ? 'لا يوجد عامل بهذا البريد الإلكتروني، تأكد منه أو استخدم اسم مستخدمه!\nAucun employé avec cet e-mail, vérifiez-le ou utilisez son nom d\'utilisateur !' : 'Aucun employé avec cet e-mail, vérifiez-le ou utilisez son nom d\'utilisateur !\nلا يوجد عامل بهذا البريد الإلكتروني، تأكد منه أو استخدم اسم مستخدمه!'); return; }
            cb(doc.data().code);
          }).catch(() => {});
        } else {
          cb(raw.toUpperCase());
        }
      };
      resolveCode((code) => {
        if (code === p.code) { alert(currentLang === 'ar' ? 'لا يمكنك إضافة نفسك كعامل!\nVous ne pouvez pas vous ajouter vous-même !' : 'Vous ne pouvez pas vous ajouter vous-même !\nلا يمكنك إضافة نفسك كعامل!'); return; }
        db.collection('codeDirectory').doc(code).get().then(doc => {
          if (!doc.exists) { alert(currentLang === 'ar' ? 'لا يوجد عامل بهذه المعلومات، تأكد منها!\nAucun employé trouvé avec ces informations, vérifiez-les !' : 'Aucun employé trouvé avec ces informations, vérifiez-les !\nلا يوجد عامل بهذه المعلومات، تأكد منها!'); return; }
          const target = doc.data();
          const chatKey = [p.code, code].sort().join('__');
          db.collection('externalChats').doc(chatKey).get().then(chatDoc => {
            if (chatDoc.exists) { input.value = ''; openExternalChat(chatKey, code); return; }
            db.collection('externalInvites').add({
              fromCode: p.code, fromUid: currentUid, fromDeviceId: currentUid, fromName: deviceDisplayName(p), fromAvatar: p.avatar || '', fromAvatarIsPhoto: !!p.avatarIsPhoto,
              toCode: code, toUid: target.uid || '', toDeviceId: target.deviceId || '', toName: target.name || code, toAvatar: target.avatar || '', toAvatarIsPhoto: !!target.avatarIsPhoto,
              status: 'pending', chatKey,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
              input.value = '';
              alert(currentLang === 'ar' ? 'تم إرسال الدعوة إلى العامل! يجب أن يوافق عليها لينضم إلى فريقك.\nInvitation envoyée à l\'employé ! Il doit l\'accepter pour rejoindre votre équipe.' : 'Invitation envoyée à l\'employé ! Il doit l\'accepter pour rejoindre votre équipe.\nتم إرسال الدعوة إلى العامل! يجب أن يوافق عليها لينضم إلى فريقك.');
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
          if (m.createdAt && m.createdAt.toDate) timeStr = formatTimeShort(m.createdAt.toDate());
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
      if (!currentlyBlocked && !confirm(currentLang === 'ar' ? 'هل أنت متأكد أنك تريد حظر هذا العامل؟ لن يتمكن من إرسال رسائل إليك.' : 'Confirmer le blocage de cet employé ? Il ne pourra plus vous envoyer de messages.')) return;
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
        alert(currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> هذه المحادثة محظورة، لا يمكنك إرسال رسائل.' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cette conversation est bloquée, envoi impossible.');
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
      const myId = currentUid;
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
      const myId = currentUid;
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

    // ==================== نظام الموافقة على التعديلات ====================
    // - إذا كان اللي كيعدل هو نفسو صاحب العنصر الأصلي (أو عنصر قديم بلا صاحب مسجل): التعديل يتطبق مباشرة.
    // - إذا كان شخص آخر: التعديل كيبقى "معلق" (pendingEdit) — حتى ولو تعدل بزاف ديال المرات قبل الموافقة،
    //   كيبقى دايما تعديل معلق واحد (كيتبدل بآخر نسخة مقترحة) — حتى يوافق عليه صاحب العنصر الأصلي.
    // - fallback: إذا صاحب العنصر ماجاوبش (تلف الهاتف، تبدل الموظف، إلخ)، من بعد 48 ساعة أي عضو آخر
    //   كيقدر يوافق أو يرفض، باش التعديل ما يبقاش معلق للأبد.
    const PENDING_EDIT_FALLBACK_HOURS = 48;
    function pendingEditFallbackOpen(pendingEdit) {
      if (!pendingEdit || !pendingEdit.proposedAt) return false;
      const elapsedMs = Date.now() - new Date(pendingEdit.proposedAt).getTime();
      return elapsedMs > PENDING_EDIT_FALLBACK_HOURS * 3600 * 1000;
    }
    function canActOnPendingEdit(item) {
      if (!item || !item.pendingEdit) return false;
      const myId = currentUid;
      if (isCurrentUserAdmin()) return true; // المسؤول يقدر يوافق أو يرفض أي تعديل، حتى ولو ماشي هو صاحب العنصر
      if (!item.createdByDeviceId || item.createdByDeviceId === myId) return true;
      return pendingEditFallbackOpen(item.pendingEdit);
    }

    function applyEditNow(col, id, data, name) {
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
      db.collection('companies').doc(currentCompanyId).collection(col).doc(id).update(updates).catch(showSaveError);
    }

    function sendEditForApproval(col, id, data, myId, name) {
      db.collection('companies').doc(currentCompanyId).collection(col).doc(id).update({
        pendingEdit: { data, proposedBy: myId, proposedByName: name, proposedAt: new Date().toISOString() }
      }).catch(showSaveError);
    }

    // ⚠️ إذا كان المسؤول (admin) هو لي كيعدل تعديل ديال عضو آخر، التعديل يتطبق مباشرة أوتوماتيكيا
    // (بلا ما يتسنى موافقة حد) — لأنه هو صاحب القرار النهائي فالشركة. نظام الموافقة (بانتظار/قبول/رفض)
    // كيبقى خدام بلا تبديل بالنسبة للأعضاء العاديين.
    function submitPendingEdit(col, id, data) {
      if (!currentCompanyId) return;
      const myId = currentUid;
      const p = getDeviceProfile();
      const name = p ? deviceDisplayName(p) : currentUserLabel();
      const item = (globalData[col] || []).find(x => x.id === id);
      const isCreator = !item || !item.createdByDeviceId || item.createdByDeviceId === myId;
      if (isCreator || isCurrentUserAdmin()) {
        applyEditNow(col, id, data, name);
      } else {
        sendEditForApproval(col, id, data, myId, name);
      }
    }

    function approveEdit(col, id) {
      if (!currentCompanyId) return;
      const item = (globalData[col] || []).find(x => x.id === id);
      if (!item || !item.pendingEdit) return;
      if (!canActOnPendingEdit(item)) return;
      const prevData = {};
      Object.keys(item.pendingEdit.data).forEach(k => { prevData[k] = item[k] !== undefined ? item[k] : null; });
      const updates = Object.assign({}, item.pendingEdit.data, {
        previousData: prevData,
        updatedAt: new Date().toISOString(),
        updatedBy: item.pendingEdit.proposedByName,
        pendingEdit: firebase.firestore.FieldValue.delete()
      });
      db.collection('companies').doc(currentCompanyId).collection(col).doc(id).update(updates);
    }

    function rejectEdit(col, id) {
      if (!currentCompanyId) return;
      const item = (globalData[col] || []).find(x => x.id === id);
      if (!item || !item.pendingEdit) return;
      if (!canActOnPendingEdit(item)) return;
      if (!confirm(translations[currentLang].confirmReject)) return;
      db.collection('companies').doc(currentCompanyId).collection(col).doc(id).update({ pendingEdit: firebase.firestore.FieldValue.delete() });
    }

    function renderPendingEditBox(col, d) {
      if (!d.pendingEdit) return '';
      const t = translations[currentLang];
      const canApprove = canActOnPendingEdit(d);
      let dateStr = '';
      try { dateStr = formatDateTimeShort(new Date(d.pendingEdit.proposedAt)); } catch (e) {}
      let actionsHtml;
      if (!canApprove) {
        actionsHtml = `<div class="pending-edit-waiting">${t.pendingWaitingOther}<div style="font-size:11px; opacity:0.8; margin-top:4px;">${t.pendingFallbackHint}</div></div>`;
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

    // ==================== تنسيق يدوي للتاريخ/الوقت/الأرقام ====================
    // بعض الأجهزة (خصوصاً Chrome Android قديم) ما عندهاش بيانات ICU كاملة لـ locale 'ar-MA'،
    // وهادشي كيخرج نص مكسور (مثلاً "Ccc Cccc" عوض التاريخ). الحل: نبنيو النص يدوياً بلا Intl.
    function pad2(n) { return String(n).padStart(2, '0'); }

    function formatDateTimeShort(date) {
      return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
    }

    function formatDateTimeFull(date) {
      return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
    }

    function formatTimeShort(date) {
      return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
    }

    function formatNumberManual(n) {
      n = Math.round(Number(n) || 0);
      const neg = n < 0;
      n = Math.abs(n);
      const withCommas = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return (neg ? '-' : '') + withCommas;
    }

    function formatUpdateInfo(d) {
      if (!d.updatedAt) return '';
      let dateStr = '';
      try {
        dateStr = formatDateTimeShort(new Date(d.updatedAt));
      } catch (e) {}
      const label = currentLang === 'ar' ? 'آخر تعديل' : 'Dernière modif.';
      return `<div class="item-sub" style="color:#38bdf8;">🕓 ${label}: ${d.updatedBy || '-'}${dateStr ? ' | ' + dateStr : ''}</div>`;
    }

    // كيبين شكون هو صاحب العنصر الأصلي (الجهاز لي زاد العنصر أول مرة) — هو هو لي عندو الحق
    // يوافق/يرفض على أي تعديل مقترح من جهاز آخر. هاد المعلومة ثابتة، ما كتبدلش حتى لو تعدل العنصر بعد ذلك.
    function formatCreatedInfo(d) {
      if (!d.createdByName) return '';
      const label = currentLang === 'ar' ? 'أضيف من طرف' : 'Ajouté par';
      return `<div class="item-sub" style="color:#94a3b8;">👤 ${label}: ${d.createdByName}</div>`;
    }

    const previousValueFieldLabels = {
      cheques: { num: { ar: 'رقم الشيك', fr: 'N° chèque' }, owner: { ar: 'الصاحب', fr: 'Propriétaire' }, amount: { ar: 'المبلغ', fr: 'Montant' }, type: { ar: 'النوع', fr: 'Type' }, date: { ar: 'التاريخ', fr: 'Date' } },
      stock: { name: { ar: 'الاسم', fr: 'Nom' }, qty: { ar: 'الكمية', fr: 'Quantité' }, price: { ar: 'الثمن', fr: 'Prix' }, minQty: { ar: 'الحد الأدنى', fr: 'Seuil minimum' }, date: { ar: 'التاريخ', fr: 'Date' } },
      installations: { client: { ar: 'الزبون', fr: 'Client' }, phone: { ar: 'الهاتف', fr: 'Téléphone' }, map: { ar: 'الموقع', fr: 'Position' }, clim: { ar: 'التفاصيل', fr: 'Détails' }, service: { ar: 'الخدمة', fr: 'Service' }, date: { ar: 'التاريخ', fr: 'Date' }, repeat: { ar: 'التكرار', fr: 'Récurrence' } },
      notes: { text: { ar: 'النص', fr: 'Texte' }, datetime: { ar: 'التاريخ', fr: 'Date' }, repeat: { ar: 'التكرار', fr: 'Récurrence' } }
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

