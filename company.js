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
      selectedCompanyLogo = '';
      const logoPreview = document.getElementById('cs-logo-preview');
      if (logoPreview) logoPreview.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#64748b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><circle cx="12" cy="14" r="3.3"/></svg>`;
      const logoInput = document.getElementById('cs-logo-input');
      if (logoInput) logoInput.value = '';
    }

    // ---------------- شعار الشركة (اختياري) — نفس منطق تصغير/تربيع صورة البروفايل ----------------
    let selectedCompanyLogo = '';

    function handleCompanyLogoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement('canvas');
          const size = 200;
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d');
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          selectedCompanyLogo = dataUrl;
          const preview = document.getElementById('cs-logo-preview');
          if (preview) preview.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; object-fit:cover;">`;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
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
        logo: selectedCompanyLogo || '',
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
        // loadUserData() ولات كتشغل startMembersListener/startPrivateChatsListener من داخلها
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
          alert(currentLang === 'ar' ? 'هذا الكود سبق استخدامه من قبل!' : 'Ce code a déjà été utilisé !');
          return;
        }
        if (codeData.expiresAt && codeData.expiresAt.toDate() < new Date()) {
          alert(currentLang === 'ar' ? 'انتهت صلاحية هذا الكود، يرجى طلب كود جديد من المسؤول.' : "Ce code a expiré, demandez-en un nouveau à l'administrateur.");
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
          permissions: { cheques: false, stock: false, installations: false, notes: false }, // العامل الجديد بلا صلاحيات، الـadmin هو لي كيعطيه من "العمال"
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
          // loadUserData() ولات كتشغل startMembersListener/startPrivateChatsListener من داخلها
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
      startActiveInviteCodesListener();
    }

    function closeCompanyInviteModal() {
      document.getElementById('company-invite-modal').classList.remove('show');
      if (activeInviteCodesUnsub) { activeInviteCodesUnsub(); activeInviteCodesUnsub = null; }
    }

    function generateNewInviteCode() {
      if (currentUserRole !== 'admin' || !currentCompanyId) return;
      const code = generateInviteCodeString();
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // صالح ساعتين غير
      // نلغيو كل الأكواد القديمة اللي مازال نشيطة (ماتستعملاتش) قبل ما نزيدو الكود الجديد،
      // باش يبقى غير كود واحد صالح فكل مرة (كنقرأو مباشرة من Firestore عوض الكاش، حيت الكاش
      // يقدر ما يكونش تعمر بعد ملي كتفتح المودال لأول مرة)
      db.collection('inviteCodes').where('companyId', '==', currentCompanyId).where('used', '==', false).get()
        .then(snap => Promise.all(snap.docs.map(d => d.ref.delete().catch(() => {}))))
        .then(() => db.collection('inviteCodes').doc(code).set({
          companyId: currentCompanyId,
          createdBy: currentUid,
          used: false,
          expiresAt,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })).then(() => {
          document.getElementById('ci-invite-code').textContent = code;
        }).catch(err => {
          console.error('generateInviteCode error:', err);
          alert(currentLang === 'ar' ? 'حدث خطأ أثناء توليد الكود، حاول مرة أخرى.' : "Une erreur s'est produite, réessayez.");
        });
    }

    // ---------------- الأكواد النشيطة (مازال ما تستعملوش) + إلغاء ----------------
    let activeInviteCodesCache = [];
    let activeInviteCodesUnsub = null;

    function startActiveInviteCodesListener() {
      if (activeInviteCodesUnsub) { activeInviteCodesUnsub(); activeInviteCodesUnsub = null; }
      activeInviteCodesCache = [];
      if (!currentCompanyId) return;
      activeInviteCodesUnsub = db.collection('inviteCodes')
        .where('companyId', '==', currentCompanyId)
        .where('used', '==', false)
        .onSnapshot(snap => {
          activeInviteCodesCache = snap.docs.map(d => ({ code: d.id, ...d.data() }));
          renderActiveInviteCodes();
        }, err => console.error('startActiveInviteCodesListener error:', err));
    }

    function renderActiveInviteCodes() {
      const box = document.getElementById('active-invite-codes-list');
      if (!box) return;
      const now = new Date();
      const valid = activeInviteCodesCache.filter(c => !c.expiresAt || c.expiresAt.toDate() > now);
      if (!valid.length) {
        box.innerHTML = `<div style="font-size:11px; color:#94a3b8; text-align:center;">${currentLang === 'ar' ? 'لا يوجد أي كود نشط حالياً.' : 'Aucun code actif pour le moment.'}</div>`;
        return;
      }
      box.innerHTML = valid.map(c => {
        const expText = c.expiresAt ? formatDateTimeFull(new Date(c.expiresAt.toDate())) : '';
        return `<div class="invite-code-row" style="display:flex; align-items:center; justify-content:space-between; border:1px solid #334155; border-radius:10px; padding:8px 10px; margin-bottom:6px;">
          <div>
            <div style="font-size:15px; font-weight:800; letter-spacing:2px; color:#38bdf8;">${c.code}</div>
            <div style="font-size:10px; color:#94a3b8;">${currentLang === 'ar' ? 'صالح حتى:' : "Valide jusqu'au :"} ${expText}</div>
          </div>
          <button class="emp-btn emp-danger" style="font-size:11px;" onclick="revokeInviteCode('${c.code}')">${currentLang === 'ar' ? 'إلغاء' : 'Révoquer'}</button>
        </div>`;
      }).join('');
    }

    function revokeInviteCode(code) {
      if (currentUserRole !== 'admin' || !currentCompanyId) return;
      if (!confirm(currentLang === 'ar' ? 'هل تريد إلغاء هذا الكود؟ لن يبقى صالحاً للاستخدام.' : 'Révoquer ce code ? Il ne pourra plus être utilisé.')) return;
      db.collection('inviteCodes').doc(code).delete().catch(err => {
        console.error('revokeInviteCode error:', err);
        alert(currentLang === 'ar' ? 'وقع خطأ فالإلغاء، حاول من جديد.' : "Une erreur s'est produite, réessayez.");
      });
    }

    // ==================== 👥 قائمة عمال الشركة (اللي دخلو بكود دعوة) + الصلاحيات ====================
    // هادي ماشي نفس "teamMembersCache" ديال chat.js (لي هو نظام الأجهزة المتعددة تحت نفس الحساب)،
    // هادي كتقرا من companies/{companyId}/access ولّي فيها العمال الحقيقيين (كل واحد بحسابو الخاص).
    let companyAccessCache = [];
    let companyAccessUnsubscribe = null;

    function defaultMemberPermissions() {
      return {
        cheques: { add: false, edit: false, delete: false },
        stock: { add: false, edit: false, delete: false },
        installations: { add: false, edit: false, delete: false },
        notes: { add: false, edit: false, delete: false }
      };
    }

    // كتحول قيمة قديمة (boolean وحدة لكامل القسم) أو جديدة (add/edit/delete) لنفس الشكل، باش نبقاو متوافقين مع البيانات القديمة
    function normalizeSectionPerm(val) {
      if (val && typeof val === 'object') {
        return { add: !!val.add, edit: !!val.edit, delete: !!val.delete };
      }
      const legacy = !!val;
      return { add: legacy, edit: legacy, delete: legacy };
    }

    function startAccessListener(companyId) {
      if (companyAccessUnsubscribe) { companyAccessUnsubscribe(); companyAccessUnsubscribe = null; }
      companyAccessCache = [];
      if (!companyId) { renderCompanyEmployeesList(); return; }
      companyAccessUnsubscribe = db.collection('companies').doc(companyId).collection('access').onSnapshot(snap => {
        companyAccessCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCompanyEmployeesList();
        updateEmployeesBadge();
        if (typeof renderCompanyBrandUI === 'function') renderCompanyBrandUI(); // باش زر التعديل يبان/يخبى حسب الدور ملي يتعرف
        // ⚠️ الصلاحيات (companyAccessCache) يمكن توصل من بعد ما كانت اللوائح ديال الشيكات/الستوك/
        // التركيبات/الملاحظات دارت الرندر ديالها الأول (Firestore ماكيضمنش ترتيب وصول الـsnapshots).
        // بلا هاد الأسطر، أيقونات تعديل/مسح كانت كتبقى مخبية حتى يوقع رندر آخر عشوائي (بحال زيادة عنصر جديد).
        if (typeof renderChequesListUI === 'function') renderChequesListUI();
        if (typeof renderStockListUI === 'function') renderStockListUI();
        if (typeof renderInstallationsListUI === 'function') renderInstallationsListUI();
        if (typeof renderNotesListUI === 'function') renderNotesListUI();
      }, err => console.error('startAccessListener error:', err));
    }

    // شارة عدد العمال (فبطاقة "العمال" فالصفحة الرئيسية) — كنعتمدو على عدد العمال الحقيقيين
    // ديال الشركة (companyAccessCache) بلا احتساب راسي، عوض ما تبقى واقفة على 0 حتى تفتح شاشة الدردشة.
    function updateEmployeesBadge() {
      const empBadge = document.getElementById('badge-employees');
      if (!empBadge) return;
      const count = companyAccessCache.filter(m => m.id !== currentUid).length;
      empBadge.innerText = count;
    }

    function memberPermissions(m) {
      const def = defaultMemberPermissions();
      if (!m) return def;
      if (m.role === 'admin') {
        // الـadmin عندو كامل الصلاحيات ديما
        const full = {};
        Object.keys(def).forEach(section => { full[section] = { add: true, edit: true, delete: true }; });
        return full;
      }
      const raw = m.permissions || {};
      const out = {};
      Object.keys(def).forEach(section => { out[section] = normalizeSectionPerm(raw[section]); });
      return out;
    }

    // كتخدم فأي بلاصة فالتطبيق باش نعرفو واش المستخدم الحالي عندو الحق فقسم معين. action = 'add' | 'edit' | 'delete' (اختياري: بلا action كترجع true إلا كان عندو شي صلاحية فالقسم)
    function hasSectionPermission(section, action) {
      if (isCurrentUserAdmin()) return true;
      if (!currentUid) return false;
      const me = companyAccessCache.find(x => x.id === currentUid);
      if (!me || me.blocked) return false;
      const perms = memberPermissions(me)[section];
      if (!perms) return false;
      if (!action) return !!(perms.add || perms.edit || perms.delete);
      return !!perms[action];
    }

    function toggleMemberPermission(uid, section, action) {
      if (!isCurrentUserAdmin() || !currentCompanyId) return;
      const m = companyAccessCache.find(x => x.id === uid);
      if (!m || m.role === 'admin') return;
      const current = memberPermissions(m);
      const sectionPerms = Object.assign({}, current[section]);
      sectionPerms[action] = !sectionPerms[action];
      db.collection('companies').doc(currentCompanyId).collection('access').doc(uid)
        .set({ permissions: { [section]: sectionPerms } }, { merge: true })
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

    // المسؤول غير هو لي يقدر يبدل سمية عامل. السمية اللي كيختارها المسؤول كتبقى هي لي كتبان
    // (nameSetByAdmin) حتى لو العامل بدل السمية ديالو فالبروفايل الشخصي ديالو من بعد.
    function renameEmployee(uid) {
      if (!isCurrentUserAdmin() || !currentCompanyId) return;
      const m = companyAccessCache.find(x => x.id === uid);
      if (!m) return;
      const newName = prompt(currentLang === 'ar' ? 'السمية الجديدة لهاد العامل:' : 'Nouveau nom pour cet employé :', m.name || '');
      if (newName === null) return;
      const trimmed = newName.trim();
      if (!trimmed) return;
      db.collection('companies').doc(currentCompanyId).collection('access').doc(uid)
        .set({ name: trimmed, nameSetByAdmin: true }, { merge: true }).catch(err => console.error('renameEmployee error:', err));
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
      const empName = m.name || (currentLang === 'ar' ? 'هذا العامل' : 'cet employé');
      if (!confirm(currentLang === 'ar'
        ? (isAdmin ? `هل تريد تنحية ${empName} عن منصب مسؤول؟` : `ترقية ${empName} إلى مسؤول؟ سيحصل على كامل الصلاحيات وقدرة إدارة العمال.`)
        : (isAdmin ? `Voulez-vous retirer ${empName} du poste d'administrateur ?` : `Promouvoir ${empName} en "Administrateur" ? Il obtiendra tous les droits et la gestion des employés.`))) return;
      db.collection('companies').doc(currentCompanyId).collection('access').doc(uid).set({ role: newRole }, { merge: true }).catch(err => console.error('toggleAccessRole error:', err));
    }

    function removeEmployeeFromCompany(uid) {
      if (!isCurrentUserAdmin() || !currentCompanyId) return;
      const m = companyAccessCache.find(x => x.id === uid);
      if (!m) return;
      if (m.role === 'admin' && companyAccessCache.filter(x => x.role === 'admin').length <= 1) {
        alert(currentLang === 'ar' ? 'يجب أن يبقى مسؤول واحد على الأقل في الشركة، لا يمكن إزالته.' : 'Il doit rester au moins un administrateur, impossible de le retirer.');
        return;
      }
      if (!confirm(currentLang === 'ar' ? 'هل أنت متأكد من إزالة هذا العامل نهائياً من الشركة؟ سيفقد الوصول إلى جميع بيانات الشركة، ولن يتمكن من العودة إلا بكود دعوة جديد.' : 'Retirer définitivement cet employé de la société ? Il perdra tout accès aux données et devra rejoindre à nouveau avec un nouveau code.')) return;
      db.collection('companies').doc(currentCompanyId).collection('access').doc(uid).delete().catch(err => {
        console.error('removeEmployeeFromCompany error:', err);
        alert(currentLang === 'ar' ? 'وقع خطأ فالإزالة، حاول من جديد.' : "Une erreur s'est produite, réessayez.");
      });
    }

    function renderCompanyEmployeesList() {
      const box = document.getElementById('company-employees-list');
      if (!box) return;
      const iAmAdmin = isCurrentUserAdmin();
      const subEl = document.getElementById('company-emp-sub-t');

      // عامل عادي (ماشي مسؤول): نعطيوه لائحة مبسطة للقراءة فقط — كيشوف المسؤول (وباقي
      // العمال) بأيقونة/بادج توضح الدور، والاسم كيتبدل live (كيجي من companyAccessCache
      // اللي كيتجدد فالوقت الحقيقي عبر startAccessListener) — بلا أزرار إدارة (ترقية/حظر/صلاحيات)،
      // غير زر "دردشة خاصة" باش يقدر يبعث رسالة مباشرة (خصوصاً للمسؤول).
      if (!iAmAdmin) {
        if (subEl) subEl.innerHTML = currentLang === 'ar'
          ? 'هنا تشوف المسؤول وباقي العمال فالشركة، ويمكنك مراسلة أي واحد منهم بشكل خاص.'
          : "Vous voyez ici l'administrateur et les autres employés de l'entreprise, et pouvez leur écrire en privé.";

        const others = companyAccessCache.filter(m => m.id !== currentUid);
        if (!others.length) {
          box.innerHTML = `<div class="chat-empty">${currentLang === 'ar' ? 'لا يوجد أي عامل آخر بعد.' : "Aucun autre employé pour l'instant."}</div>`;
          return;
        }

        box.innerHTML = others.map(m => {
          const mIsAdmin = m.role === 'admin';
          const blocked = !!m.blocked;
          const roleBadge = `<span class="emp-name-badge ${mIsAdmin ? 'emp-name-badge-blue' : 'emp-name-badge-gray'}">${mIsAdmin
            ? `<svg viewBox="0 0 24 24" width="12" height="12" style="vertical-align:-2px;margin-inline-end:2px" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h16M5 18l1.2-9L9 12l3-6 3 6 2.8-3 1.2 9"/></svg>${currentLang === 'ar' ? 'مسؤول' : 'Administrateur'}`
            : (currentLang === 'ar' ? 'عامل عادي' : 'Employé')}</span>`;
          const blockedBadge = blocked ? `<span class="emp-name-badge emp-name-badge-red">${currentLang === 'ar' ? 'محظور' : 'Bloqué'}</span>` : '';
          const chatBtn = `<button class="emp-icon-btn emp-icon-btn-blue" title="${currentLang === 'ar' ? 'دردشة خاصة' : 'Chat privé'}" onclick="openPrivateChat('${m.id}')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 6l9 7 9-7"/></svg></button>`;
          return `<div class="emp-item ${blocked ? 'emp-blocked' : ''}">
            <div class="emp-top-row" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
              <div class="members-list-info">
                <div class="members-list-name">${m.name || (currentLang === 'ar' ? 'عامل' : 'Employé')}</div>
                ${roleBadge} ${blockedBadge}
              </div>
              <div class="emp-icon-actions" style="display:flex; gap:6px;">${chatBtn}</div>
            </div>
          </div>`;
        }).join('');
        return;
      }
      // مسؤول: كنرجعو للعنوان الفرعي الأصلي (فحالة تمت ترقيته دابا فهاد الجلسة)
      if (subEl && typeof translations !== 'undefined' && translations[currentLang]) subEl.innerHTML = translations[currentLang].companyEmpSubT;

      const others = companyAccessCache.filter(m => m.id !== currentUid);

      if (!others.length) {
        box.innerHTML = `<div class="chat-empty">${currentLang === 'ar' ? 'لا يوجد أي عامل انضم بعد بكود دعوة الشركة.' : "Aucun employé n'a encore rejoint la société via un code d'invitation."}</div>`;
        return;
      }

      box.innerHTML = others.map(m => {
        const perms = memberPermissions(m);
        const mIsAdmin = m.role === 'admin';
        const blocked = !!m.blocked;
        const canToggle = iAmAdmin && !blocked;
        // أيقونات الصلاحيات الفرعية (تعديل / مسح / إضافة). كل وحدة كتبان ملوّنة إلا كانت ممنوحة، ومطفية إلا لا.
        const actionIcons = {
          edit: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
          delete: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14M9 7V4.5h6V7M7 7l1 12.5h8L17 7"/></svg>',
          add: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>'
        };
        const actionLabels = currentLang === 'ar'
          ? { edit: 'تعديل', delete: 'مسح', add: 'إضافة' }
          : { edit: 'Modifier', delete: 'Supprimer', add: 'Ajouter' };
        const actionBtn = (section, action, active) => `
          <button type="button" class="emp-perm-action-btn ${active ? 'active' : ''} ${canToggle ? 'can-toggle' : ''}" title="${actionLabels[action]}"
            ${canToggle ? `onclick="toggleMemberPermission('${m.id}','${section}','${action}')"` : 'disabled'}>
            ${actionIcons[action]} ${actionLabels[action]}
          </button>`;
        const permRow = (key, label) => {
          const p = perms[key] || { add: false, edit: false, delete: false };
          return `
          <div class="emp-perm-section" style="margin:8px 0;">
            <div class="emp-section-title">${label}</div>
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-inline-start:18px; margin-top:5px;">
              <span class="emp-allowed-label">${currentLang === 'ar' ? 'مسموح بـ:' : 'Autorisé pour :'}</span>
              ${actionBtn(key, 'edit', p.edit)}
              ${actionBtn(key, 'delete', p.delete)}
              ${actionBtn(key, 'add', p.add)}
            </div>
          </div>`;
        };
        const roleBadge = `<span class="emp-name-badge ${mIsAdmin ? 'emp-name-badge-blue' : 'emp-name-badge-gray'}">${mIsAdmin ? (currentLang === 'ar' ? 'مسؤول' : 'Administrateur') : (currentLang === 'ar' ? 'عامل عادي' : 'Employé')}</span>`;
        const blockedBadge = blocked ? `<span class="emp-name-badge emp-name-badge-red">${currentLang === 'ar' ? 'محظور' : 'Bloqué'}</span>` : '';
        const chatBtn = `<button class="emp-icon-btn emp-icon-btn-blue" title="${currentLang === 'ar' ? 'دردشة خاصة' : 'Chat privé'}" onclick="openPrivateChat('${m.id}')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 6l9 7 9-7"/></svg></button>`;
        const renameBtn = iAmAdmin ? `<button class="emp-icon-btn emp-icon-btn-gray" title="${currentLang === 'ar' ? 'تعديل السمية' : 'Renommer'}" onclick="renameEmployee('${m.id}')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 20l1-4.2L15.8 5 19 8.2 8.2 19z"/><line x1="13.8" y1="6.9" x2="17" y2="10.1"/></svg></button>` : '';
        const roleBtn = iAmAdmin ? `<button class="emp-icon-btn emp-icon-btn-gray" title="${mIsAdmin ? (currentLang === 'ar' ? 'تنزيل لعامل عادي' : 'Rétrograder') : (currentLang === 'ar' ? 'ترقية لمسؤول' : 'Promouvoir admin')}" onclick="toggleAccessRole('${m.id}')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="8" r="3.4"/><path d="M6 20c.8-3.2 3.2-5 6-5s5.2 1.8 6 5"/></svg></button>` : '';
        const blockBtn = iAmAdmin ? `<button class="emp-icon-btn ${blocked ? 'emp-icon-btn-green' : 'emp-icon-btn-red'}" title="${blocked ? (currentLang === 'ar' ? 'فك الحظر' : 'Débloquer') : (currentLang === 'ar' ? 'حظر' : 'Bloquer')}" onclick="toggleAccessBlock('${m.id}')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/>${blocked ? '' : '<line x1="5.5" y1="18.5" x2="18.5" y2="5.5"/>'}</svg></button>` : '';
        const removeBtn = iAmAdmin ? `<button class="emp-icon-btn emp-icon-btn-red" title="${currentLang === 'ar' ? 'إزالة نهائياً' : 'Retirer'}" onclick="removeEmployeeFromCompany('${m.id}')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M5 7h14M9 7V4.5h6V7M7 7l1 12.5h8L17 7"/></svg></button>` : '';

        return `<div class="emp-item ${blocked ? 'emp-blocked' : ''}">
          <div class="emp-top-row" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div class="members-list-info">
              <div class="members-list-name">${m.name || (currentLang === 'ar' ? 'عامل' : 'Employé')}</div>
              ${roleBadge} ${blockedBadge}
            </div>
            <div class="emp-icon-actions" style="display:flex; gap:6px;">${chatBtn}${renameBtn}${roleBtn}${blockBtn}${removeBtn}</div>
          </div>
          ${!mIsAdmin ? `<div class="emp-perms-row" style="margin:8px 0; display:flex; flex-direction:column;">
            ${permRow('cheques', currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-inline-end:2px" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg> الشيكات' : 'Chèques')}
            ${permRow('stock', currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-inline-end:2px" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/></svg> المخزون' : 'Stock')}
            ${permRow('installations', currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-inline-end:2px" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> التركيب/الخدمات' : 'Installations')}
            ${permRow('notes', currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;margin-inline-end:2px" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/></svg> الملاحظات' : 'Notes')}
          </div>` : `<div class="emp-admin-note">${currentLang === 'ar' ? 'المسؤول لديه كامل الصلاحيات تلقائياً.' : "L'administrateur a tous les droits automatiquement."}</div>`}
        </div>`;
      }).join('');
    }

    // ==================== 🏷️ معلومات الشركة (اسم + شعار) — عرض/تعديل ====================
    let companyInfoCache = null; // { name, logo }
    let companyInfoUnsubscribe = null;

    function startCompanyInfoListener(companyId) {
      if (companyInfoUnsubscribe) { companyInfoUnsubscribe(); companyInfoUnsubscribe = null; }
      companyInfoCache = null;
      if (!companyId) { renderCompanyBrandUI(); return; }
      companyInfoUnsubscribe = db.collection('companies').doc(companyId).collection('info').doc('data')
        .onSnapshot(doc => {
          companyInfoCache = doc.exists ? doc.data() : null;
          renderCompanyBrandUI();
        }, err => console.error('startCompanyInfoListener error:', err));
    }

    function renderCompanyBrandUI() {
      const card = document.getElementById('company-brand-card');
      const logoBox = document.getElementById('company-brand-logo');
      const nameBox = document.getElementById('company-brand-name');
      const editBtn = document.getElementById('btn-edit-company-brand');
      if (!card || !logoBox || !nameBox) return;
      if (!companyInfoCache || !companyInfoCache.name) { card.style.display = 'none'; return; }
      card.style.display = 'block';
      logoBox.innerHTML = companyInfoCache.logo
        ? `<img src="${companyInfoCache.logo}" style="width:100%; height:100%; object-fit:cover;">`
        : `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#64748b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><circle cx="12" cy="14" r="3.3"/></svg>`;
      nameBox.textContent = companyInfoCache.name;
      if (editBtn) editBtn.style.display = isCurrentUserAdmin() ? 'inline-flex' : 'none';
    }

    // تعديل اسم/شعار الشركة — admin غير. صورة جديدة اختيارية (إلا ماختارش، الاسم غير يتبدل)
    function openEditCompanyBrand() {
      if (!isCurrentUserAdmin() || !currentCompanyId) return;
      const newName = prompt(currentLang === 'ar' ? 'الاسم الجديد للشركة:' : 'Nouveau nom de la société :', (companyInfoCache && companyInfoCache.name) || '');
      if (newName === null) return;
      const trimmed = newName.trim();
      if (!trimmed) return;
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = (event) => {
        const file = event.target.files[0];
        const save = (logoDataUrl) => {
          const payload = { name: trimmed };
          if (logoDataUrl !== undefined) payload.logo = logoDataUrl;
          db.collection('companies').doc(currentCompanyId).collection('info').doc('data')
            .set(payload, { merge: true }).catch(err => {
              console.error('openEditCompanyBrand error:', err);
              alert(currentLang === 'ar' ? 'وقع خطأ فالتعديل، حاول من جديد.' : "Une erreur s'est produite, réessayez.");
            });
        };
        if (!file) { save(undefined); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 200;
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext('2d');
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
            save(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      };
      if (confirm(currentLang === 'ar' ? 'هل تريد أيضاً تغيير شعار الشركة؟ (إلغاء = تبديل الاسم فقط)' : 'Voulez-vous aussi changer le logo ? (Annuler = changer juste le nom)')) {
        input.click();
      } else {
        db.collection('companies').doc(currentCompanyId).collection('info').doc('data')
          .set({ name: trimmed }, { merge: true }).catch(err => {
            console.error('openEditCompanyBrand error:', err);
            alert(currentLang === 'ar' ? 'وقع خطأ فالتعديل، حاول من جديد.' : "Une erreur s'est produite, réessayez.");
          });
      }
    }

    // ==================== 🚪 مغادرة الشركة الحالية (admin ولا عامل) ====================
    // - عامل عادي: كيمسح وثيقة access ديالو غير، ويرجع لشاشة إنشاء/انضمام شركة.
    // - admin ومعه admin آخر أو أعضاء آخرين: خاصو يولي "عامل" الأول (ما نقدروش نخليو
    //   شركة بلا admin) — كنطلبو منه يرقي شخص آخر لـadmin قبل ما يقدر يخرج.
    // - admin وحيد فالشركة (بلا أي عضو آخر): الخروج هنا كيعني حذف الشركة بكاملها
    //   (بياناتها: شيكات/مخزون/تركيب/ملاحظات) — بحال بالضبط منطق حذف الحساب.
    function leaveCurrentCompany() {
      if (!currentCompanyId || !currentUid) return;
      const iAmAdmin = isCurrentUserAdmin();
      const others = companyAccessCache.filter(m => m.id !== currentUid);
      const otherAdmins = others.filter(m => m.role === 'admin');

      if (iAmAdmin && others.length > 0 && otherAdmins.length === 0) {
        alert(currentLang === 'ar'
          ? 'أنت المسؤول الوحيد وباقي معك عمال آخرين، خاصك ترقي عامل آخر لمسؤول قبل ما تقدر تخرج.'
          : "Vous êtes le seul administrateur et il reste d'autres employés, promouvez-en un avant de pouvoir quitter.");
        return;
      }

      const soleMember = others.length === 0;
      const warn = soleMember
        ? (currentLang === 'ar'
          ? '⚠️ أنت الوحيد فهاد الشركة. مغادرتها غادي تمسح نهائياً كل بياناتها (شيكات، مخزون، تركيب، ملاحظات)! متأكد؟'
          : "⚠️ Vous êtes seul dans cette société. La quitter supprimera DÉFINITIVEMENT toutes ses données (chèques, stock, installations, notes) ! Confirmer ?")
        : (currentLang === 'ar'
          ? 'هل تريد مغادرة هذه الشركة؟ غادي تفقد الوصول لبياناتها، ولن تقدر ترجع إلا بكود دعوة جديد.'
          : "Voulez-vous quitter cette société ? Vous perdrez l'accès à ses données et ne pourrez revenir qu'avec un nouveau code d'invitation.");
      if (!confirm(warn)) return;

      const companyId = currentCompanyId;
      const uid = currentUid;

      const cleanup = soleMember
        ? (() => {
            const deleteWholeCollection = (col) => db.collection('companies').doc(companyId).collection(col).get()
              .then(s => Promise.all(s.docs.map(d => d.ref.delete())));
            const deleteInviteCodes = () => db.collection('inviteCodes').where('companyId', '==', companyId).get()
              .then(s => Promise.all(s.docs.map(d => d.ref.delete())));
            return Promise.all([
              deleteWholeCollection('cheques'),
              deleteWholeCollection('stock'),
              deleteWholeCollection('installations'),
              deleteWholeCollection('notes'),
              deleteInviteCodes(),
              db.collection('companies').doc(companyId).collection('access').doc(uid).delete()
            ]).then(() => db.collection('companies').doc(companyId).collection('info').doc('data').delete().catch(() => {}));
          })()
        : db.collection('companies').doc(companyId).collection('access').doc(uid).delete();

      cleanup
        .then(() => db.collection('users').doc(uid).collection('profile').doc('info').set({ companyId: firebase.firestore.FieldValue.delete() }, { merge: true }))
        .then(() => {
          alert(currentLang === 'ar' ? 'تمت مغادرة الشركة.' : 'Vous avez quitté la société.');
          // ⚠️ بزاف ديال listeners (groups/private chats/members/access...) مربوطين بـcurrentCompanyId
          // القديم، أبسط وأضمن طريقة نرجعو بيها لحالة "بلا شركة" هي reload كامل للصفحة
          // (auth.onAuthStateChanged غادي يعاود يقرا companyId الجديد = null ويبين شاشة الإعداد)
          location.reload();
        })
        .catch(err => {
          console.error('leaveCurrentCompany error:', err);
          alert(currentLang === 'ar' ? 'وقع خطأ فمغادرة الشركة، حاول من جديد.' : "Une erreur s'est produite, réessayez.");
        });
    }
