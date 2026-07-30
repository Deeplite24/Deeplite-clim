    // ==================== 🏢 Company Setup : خلق شركة جديدة / الانضمام بكود دعوة ====================
    // هاد الملف كيتعامل مع الشاشة اللي كتبان ملي مستخدم مسجل الدخول ولكن ماشي مرتبط بأي شركة بعد،
    // وكيتعامل ossi مع توليد وإدارة أكواد الدعوة ديال الـadmin.

    function generateInviteCodeString() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بلا حروف/أرقام كتشابه (0/O, 1/I)
      let code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    }

    function openCompanySetupScreen() {
      document.getElementById('company-setup-section').style.display = 'block';
      const nameInput = document.getElementById('cs-company-name');
      const codeInput = document.getElementById('cs-join-code');
      if (nameInput) nameInput.value = '';
      if (codeInput) codeInput.value = '';
    }

    function closeCompanySetupScreenAfterSuccess() {
      document.getElementById('company-setup-section').style.display = 'none';
      document.getElementById('app-content').style.display = 'block';
    }

    function handleLogoutFromCompanySetup() {
      document.getElementById('company-setup-section').style.display = 'none';
      logout();
    }

    // ---------------- خلق شركة جديدة ----------------
    function submitCreateCompany() {
      const nameInput = document.getElementById('cs-company-name');
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        alert(currentLang === 'ar' ? 'المرجو إدخال اسم الشركة!' : 'Veuillez entrer le nom de la société !');
        return;
      }
      if (!currentUid) return;

      const companyId = 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      const infoDocRef = db.collection('companies').doc(companyId);
      const batch = db.batch();

      batch.set(infoDocRef.collection('access').doc(currentUid), {
        role: 'admin',
        name: currentUserLabel(),
        addedAt: firebase.firestore.FieldValue.serverTimestamp(),
        blocked: false
      });
      // adminUid هنا كتخدم مع getAfter() فالـRules باش تتأكد أن هاد الشركة تخلقات
      // فنفس اللحظة من طرف نفس الشخص اللي كيدير روحو admin (بلا ما تعتمد على exists()
      // اللي بانت غير موثوقة فحالة الكتابة المزدوجة فنفس الـbatch)
      batch.set(infoDocRef.collection('info').doc('data'), {
        name,
        adminUid: currentUid,
        createdBy: currentUid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      batch.set(db.collection('users').doc(currentUid).collection('profile').doc('info'), { companyId }, { merge: true });

      batch.commit().then(() => {
        currentCompanyId = companyId;
        currentUserRole = 'admin';
        currentUserProfile = Object.assign({}, currentUserProfile, { companyId });
        closeCompanySetupScreenAfterSuccess();
        loadUserData(currentCompanyId);
        renderAccountSwitcher();
        ensureDeviceProfile();
        startGroupsListeners();
        startMembersListener(currentCompanyId);
        startPrivateChatsListener(currentCompanyId);
        upsertMember();
        initExternalFeatures();
        if (typeof toggleAdminInviteButton === 'function') toggleAdminInviteButton();
      }).catch(err => {
        console.error('createCompany error:', err);
        alert(currentLang === 'ar' ? 'وقع خطأ فخلق الشركة، حاول من جديد.' : "Une erreur s'est produite lors de la création de la société, réessayez.");
      });
    }

    // ---------------- الانضمام لشركة بكود دعوة ----------------
    function submitJoinCompany() {
      const codeInput = document.getElementById('cs-join-code');
      const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
      if (!code) {
        alert(currentLang === 'ar' ? 'المرجو إدخال كود الدعوة!' : "Veuillez entrer le code d'invitation !");
        return;
      }
      if (!currentUid) return;

      db.collection('inviteCodes').doc(code).get().then(codeDoc => {
        if (!codeDoc.exists) {
          alert(currentLang === 'ar' ? 'الكود غير صحيح!' : 'Code invalide !');
          return;
        }
        const codeData = codeDoc.data();
        if (codeData.used) {
          alert(currentLang === 'ar' ? 'هاد الكود تم استعماله من قبل!' : 'Ce code a déjà été utilisé !');
          return;
        }
        const companyId = codeData.companyId;

        const batch = db.batch();
        const accessRef = db.collection('companies').doc(companyId).collection('access').doc(currentUid);
        batch.set(accessRef, {
          role: 'member',
          name: currentUserLabel(),
          addedAt: firebase.firestore.FieldValue.serverTimestamp(),
          blocked: false,
          permissions: { cheques: false, stock: false, notes: false }, // العامل الجديد بلا صلاحيات، الـadmin هو لي كيعطيه من "العمال"
          joinCode: code // خاص الـRule يتحقق من هاد الحقل باش يسمح بالإنشاء
        });
        const profileRef = db.collection('users').doc(currentUid).collection('profile').doc('info');
        batch.set(profileRef, { companyId }, { merge: true });
        const codeRef = db.collection('inviteCodes').doc(code);
        batch.update(codeRef, { used: true });

        batch.commit().then(() => {
          currentCompanyId = companyId;
          currentUserRole = 'member';
          currentUserProfile = Object.assign({}, currentUserProfile, { companyId });
          closeCompanySetupScreenAfterSuccess();
          loadUserData(currentCompanyId);
          renderAccountSwitcher();
          ensureDeviceProfile();
          startGroupsListeners();
          startMembersListener(currentCompanyId);
          startPrivateChatsListener(currentCompanyId);
          upsertMember();
          initExternalFeatures();
        }).catch(err => {
          console.error('joinCompany error:', err);
          alert('DEBUG: ' + (err.code || '') + ' — ' + (err.message || err));
        });
      }).catch(err => {
        console.error('joinCompany read error:', err);
        alert('DEBUG: ' + (err.code || '') + ' — ' + (err.message || err));
      });
    }

    // ---------------- زر دعوة عامل (admin غير) ----------------
    function toggleAdminInviteButton() {
      const btn = document.getElementById('invite-worker-btn');
      if (!btn) return;
      btn.style.display = (currentUserRole === 'admin') ? 'inline-flex' : 'none';
    }

    function openCompanyInviteModal() {
      if (currentUserRole !== 'admin' || !currentCompanyId) return;
      document.getElementById('ci-invite-code').textContent = '------';
      document.getElementById('company-invite-modal').classList.add('show');
      generateNewInviteCode();
    }

    function closeCompanyInviteModal() {
      document.getElementById('company-invite-modal').classList.remove('show');
    }

    function generateNewInviteCode() {
      if (currentUserRole !== 'admin' || !currentCompanyId) return;
      const code = generateInviteCodeString();
      db.collection('inviteCodes').doc(code).set({
        companyId: currentCompanyId,
        createdBy: currentUid,
        used: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        document.getElementById('ci-invite-code').textContent = code;
      }).catch(err => {
        console.error('generateInviteCode error:', err);
        alert(currentLang === 'ar' ? 'وقع خطأ فتوليد الكود، حاول من جديد.' : "Une erreur s'est produite, réessayez.");
      });
    }

    // ==================== 👥 قائمة عمال الشركة (اللي دخلو بكود دعوة) + الصلاحيات ====================
    // هادي ماشي نفس "teamMembersCache" ديال chat.js (لي هو نظام الأجهزة المتعددة تحت نفس الحساب)،
    // هادي كتقرا من companies/{companyId}/access ولّي فيها العمال الحقيقيين (كل واحد بحسابو الخاص).
    let companyAccessCache = [];
    let companyAccessUnsubscribe = null;

    function defaultMemberPermissions() {
      return { cheques: false, stock: false, notes: false };
    }

    function startAccessListener(companyId) {
      if (companyAccessUnsubscribe) { companyAccessUnsubscribe(); companyAccessUnsubscribe = null; }
      companyAccessCache = [];
      if (!companyId) { renderCompanyEmployeesList(); return; }
      companyAccessUnsubscribe = db.collection('companies').doc(companyId).collection('access').onSnapshot(snap => {
        companyAccessCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCompanyEmployeesList();
      }, err => console.error('startAccessListener error:', err));
    }

    function memberPermissions(m) {
      if (!m) return defaultMemberPermissions();
      if (m.role === 'admin') return { cheques: true, stock: true, notes: true }; // الـadmin عندو كامل الصلاحيات ديما
      return Object.assign(defaultMemberPermissions(), m.permissions || {});
    }

    // كتخدم فأي بلاصة فالتطبيق باش نعرفو واش المستخدم الحالي عندو الحق يزيد/يعدل فقسم معين
    function hasSectionPermission(section) {
      if (isCurrentUserAdmin()) return true;
      if (!currentUid) return false;
      const me = companyAccessCache.find(x => x.id === currentUid);
      if (!me || me.blocked) return false;
      return !!memberPermissions(me)[section];
    }

    function toggleMemberPermission(uid, section) {
      if (!isCurrentUserAdmin() || !currentCompanyId) return;
      const m = companyAccessCache.find(x => x.id === uid);
      if (!m || m.role === 'admin') return;
      const current = memberPermissions(m);
      const newVal = !current[section];
      db.collection('companies').doc(currentCompanyId).collection('access').doc(uid)
        .set({ permissions: { [section]: newVal } }, { merge: true })
        .catch(err => { console.error('toggleMemberPermission error:', err); });
    }

    function toggleAccessBlock(uid) {
      if (!isCurrentUserAdmin() || !currentCompanyId) return;
      const m = companyAccessCache.find(x => x.id === uid);
      if (!m) return;
      const newVal = !m.blocked;
      if (newVal && !confirm(currentLang === 'ar' ? 'هل أنت متأكد من حظر هذا العامل؟ لن يقدر يدخل لمعطيات الشركة.' : 'Confirmer le blocage de cet employé ? Il ne pourra plus accéder aux données de la société.')) return;
      db.collection('companies').doc(currentCompanyId).collection('access').doc(uid).set({ blocked: newVal }, { merge: true }).catch(err => console.error('toggleAccessBlock error:', err));
    }

    function toggleAccessRole(uid) {
      if (!isCurrentUserAdmin() || !currentCompanyId) return;
      const m = companyAccessCache.find(x => x.id === uid);
      if (!m) return;
      const isAdmin = m.role === 'admin';
      if (isAdmin && companyAccessCache.filter(x => x.role === 'admin').length <= 1) {
        alert(currentLang === 'ar' ? 'خاص يبقى مسؤول واحد على الأقل فالشركة.' : 'Il doit rester au moins un administrateur dans la société.');
        return;
      }
      const newRole = isAdmin ? 'member' : 'admin';
      if (!confirm(currentLang === 'ar'
        ? (isAdmin ? 'تنزيل هذا العامل من مسؤول إلى عامل عادي؟' : 'ترقية هذا العامل إلى مسؤول؟ غادي يحصل على كامل الصلاحيات وقدرة تسيير العمال.')
        : (isAdmin ? 'Rétrograder cet employé en "Employé" ?' : 'Promouvoir cet employé en "Administrateur" ? Il obtiendra tous les droits et la gestion des employés.'))) return;
      db.collection('companies').doc(currentCompanyId).collection('access').doc(uid).set({ role: newRole }, { merge: true }).catch(err => console.error('toggleAccessRole error:', err));
    }

    function renderCompanyEmployeesList() {
      const box = document.getElementById('company-employees-list');
      if (!box) return;
      const iAmAdmin = isCurrentUserAdmin();
      const others = companyAccessCache.filter(m => m.id !== currentUid);

      if (!others.length) {
        box.innerHTML = `<div class="chat-empty">${currentLang === 'ar' ? 'ماكاين حتى عامل دخل بعد بكود الدعوة ديال الشركة.' : "Aucun employé n'a encore rejoint la société via un code d'invitation."}</div>`;
        return;
      }

      box.innerHTML = others.map(m => {
        const perms = memberPermissions(m);
        const mIsAdmin = m.role === 'admin';
        const blocked = !!m.blocked;
        const permRow = (key, label) => `
          <label class="emp-perm-toggle" style="display:inline-flex; align-items:center; gap:5px; font-size:12px; color:${perms[key] ? '#4ade80' : '#94a3b8'}; margin-inline-end:12px; ${iAmAdmin && !blocked ? 'cursor:pointer;' : 'opacity:0.6;'}">
            <input type="checkbox" ${perms[key] ? 'checked' : ''} ${(iAmAdmin && !blocked) ? '' : 'disabled'} onchange="toggleMemberPermission('${m.id}','${key}')" style="width:15px; height:15px; accent-color:#22c55e;">
            ${label}
          </label>`;
        const roleBadge = `<span class="emp-name-badge" style="background:${mIsAdmin ? 'rgba(56,189,248,0.16)' : 'rgba(148,163,184,0.16)'}; color:${mIsAdmin ? '#38bdf8' : '#94a3b8'};">${mIsAdmin ? (currentLang === 'ar' ? 'مسؤول' : 'Administrateur') : (currentLang === 'ar' ? 'عامل عادي' : 'Employé')}</span>`;
        const blockedBadge = blocked ? `<span class="emp-name-badge" style="background:rgba(248,113,113,0.16); color:#f87171;">${currentLang === 'ar' ? 'محظور' : 'Bloqué'}</span>` : '';
        const roleBtn = iAmAdmin ? `<button class="emp-btn" onclick="toggleAccessRole('${m.id}')">${mIsAdmin ? (currentLang === 'ar' ? 'تنزيل لعامل عادي' : 'Rétrograder') : (currentLang === 'ar' ? 'ترقية لمسؤول' : 'Promouvoir admin')}</button>` : '';
        const blockBtn = iAmAdmin ? `<button class="emp-btn ${blocked ? 'emp-danger' : ''}" onclick="toggleAccessBlock('${m.id}')">${blocked ? (currentLang === 'ar' ? 'فك الحظر' : 'Débloquer') : (currentLang === 'ar' ? 'حظر' : 'Bloquer')}</button>` : '';

        return `<div class="emp-item ${blocked ? 'emp-blocked' : ''}">
          <div class="emp-top-row">
            <div class="members-list-info">
              <div class="members-list-name">${m.name || (currentLang === 'ar' ? 'عامل' : 'Employé')}</div>
              ${roleBadge} ${blockedBadge}
            </div>
          </div>
          ${!mIsAdmin ? `<div class="emp-perms-row" style="margin:8px 0; display:flex; flex-wrap:wrap;">
            ${permRow('cheques', currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-inline-end:2px" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg> الشيكات' : 'Chèques')}
            ${permRow('stock', currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-inline-end:2px" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/></svg> المخزون' : 'Stock')}
            ${permRow('notes', currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-inline-end:2px" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/></svg> الملاحظات' : 'Notes')}
          </div>` : `<div style="font-size:11px; color:#94a3b8; margin:6px 0;">${currentLang === 'ar' ? 'المسؤول عندو كامل الصلاحيات تلقائياً.' : "L'administrateur a tous les droits automatiquement."}</div>`}
          <div class="emp-actions">${roleBtn}${blockBtn}</div>
        </div>`;
      }).join('');
    }
