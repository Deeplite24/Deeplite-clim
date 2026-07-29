
    let currentLang = 'ar';

    // بعض النصوص فالتطبيق فيها رموز SVG مبنية باش تبان فالواجهة (innerHTML).
    // alert() وإشعارات المتصفح (Notification) ماكيقدروش يعرضو HTML، فكيبان الكود خام.
    // هاد الدالة كتمسح أي وسم HTML/SVG قبل ما النص يوصل لهادشي.
    // حالة فارغة موحدة الشكل لكل القوائم (أيقونة + رسالة + تلميح)
    function emptyStateHTML(iconSvg, msgAr, msgFr, hintAr, hintFr) {
      const msg = currentLang === 'ar' ? msgAr : msgFr;
      const hint = currentLang === 'ar' ? hintAr : hintFr;
      return `<div class="empty-state">
        <div class="empty-state-icon">${iconSvg}</div>
        <div class="empty-state-msg">${msg}</div>
        ${hint ? `<div class="empty-state-hint">${hint}</div>` : ''}
      </div>`;
    }

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

