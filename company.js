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

      // مؤقتا: كل كتابة وحدها بلا batch باش نعرفو بالضبط فين واقعة رفضة الصلاحية
      // ملاحظة: access خاصو يتخلق قبل info، حيت الـRule ديال access كتتحقق
      // "!exists(info/data)" — إلا خلقنا info قبل، هاد الشرط غادي يفشل دايما
      infoDocRef.collection('access').doc(currentUid).set({
        role: 'admin',
        name: currentUserLabel(),
        addedAt: firebase.firestore.FieldValue.serverTimestamp(),
        blocked: false
      }).then(() => {
        return infoDocRef.collection('info').doc('data').set({
          name,
          createdBy: currentUid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => { throw { step: 2, err }; });
      }, err => { throw { step: 1, err }; }).then(() => {
        return db.collection('users').doc(currentUid).collection('profile').doc('info')
          .set({ companyId }, { merge: true })
          .catch(err => { throw { step: 3, err }; });
      }).then(() => {
        currentCompanyId = companyId;
        currentUserRole = 'admin';
        currentUserProfile = Object.assign({}, currentUserProfile, { companyId });
        closeCompanySetupScreenAfterSuccess();
        loadUserData(currentUid);
        renderAccountSwitcher();
        ensureDeviceProfile();
        startGroupsListeners();
        startMembersListener(currentUid);
        startPrivateChatsListener(currentUid);
        upsertMember();
        initExternalFeatures();
        if (typeof toggleAdminInviteButton === 'function') toggleAdminInviteButton();
      }).catch(wrapped => {
        const step = wrapped && wrapped.step;
        const err = (wrapped && wrapped.err) || wrapped;
        console.error('createCompany error at step', step, err);
        alert('DEBUG step ' + step + ': ' + (err.code || '') + ' — ' + (err.message || err));
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
          loadUserData(currentUid);
          renderAccountSwitcher();
          ensureDeviceProfile();
          startGroupsListeners();
          startMembersListener(currentUid);
          startPrivateChatsListener(currentUid);
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
