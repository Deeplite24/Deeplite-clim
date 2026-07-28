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

    // الكاش المحلي (localStorage) — كيبقى دايما آخر نسخة معروفة، باش يبان الشريط بسرعة
    // من غير ما نتسناو Firestore، ويخدم كـ fallback فحالة انقطاع الاتصال.
    function getLocalNavShortcuts() {
      try { return JSON.parse(localStorage.getItem(navShortcutsStorageKey()) || '[]'); } catch (e) { return []; }
    }

    // navShortcutsCache = null معناه مازال ماجاش الجواب من Firestore، فنستعملو localStorage مؤقتا.
    // من بعد ما يجي أول snapshot، هاد المتغير كيبقى هو المصدر الحقيقي (يتزامن بين الأجهزة).
    let navShortcutsCache = null;
    let navShortcutsUnsub = null;

    function getNavShortcuts() {
      return navShortcutsCache !== null ? navShortcutsCache : getLocalNavShortcuts();
    }

    function saveNavShortcuts(list) {
      navShortcutsCache = list;
      localStorage.setItem(navShortcutsStorageKey(), JSON.stringify(list));
      if (currentUid) {
        db.collection('users').doc(currentUid).collection('settings').doc('navShortcuts')
          .set({ list, updatedAt: new Date().toISOString() }, { merge: true })
          .catch(() => {}); // إذا مافيهاش نت، Firestore persistence غادي تحفظها وتبعتها منين يرجع الاتصال
      }
    }

    // كيتشغل عند تسجيل الدخول (فـ init.js) باش يزامن الاختصارات بين الأجهزة ديال نفس الحساب.
    function startNavShortcutsListener(uid) {
      navShortcutsUnsub = db.collection('users').doc(uid).collection('settings').doc('navShortcuts')
        .onSnapshot(doc => {
          if (doc.exists && Array.isArray(doc.data().list)) {
            navShortcutsCache = doc.data().list;
            localStorage.setItem(navShortcutsStorageKey(), JSON.stringify(navShortcutsCache));
          } else {
            // ماكاينش وثيقة فـ Firestore بعد (أول مرة، أو حساب قديم) — نرفعو النسخة المحلية إلى فوق
            const localList = getLocalNavShortcuts();
            navShortcutsCache = localList;
            if (localList.length) {
              db.collection('users').doc(uid).collection('settings').doc('navShortcuts')
                .set({ list: localList, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
            }
          }
          renderNavShortcuts();
        }, () => {}); // fallback: إذا وقع خطأ فـ Firestore، الشريط كيبقى خدام بـ localStorage عادي
    }

    function stopNavShortcutsListener() {
      if (navShortcutsUnsub) { navShortcutsUnsub(); navShortcutsUnsub = null; }
      navShortcutsCache = null;
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

    // إعادة ترتيب اختصار: dir = -1 (لأعلى/قبل) أو 1 (لأسفل/بعد)
    function moveNavShortcut(id, dir) {
      const list = getNavShortcuts();
      const i = list.indexOf(id);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      saveNavShortcuts(list);
      renderNavShortcuts();
      if (document.getElementById('shortcut-picker-box').classList.contains('show')) openShortcutPicker();
    }

    function openShortcutPicker() {
      document.getElementById('sp-title-t').innerHTML = (currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> أضف اختصارًا إلى الشريط السفلي ' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Ajouter un raccourci ') + `<span style="font-size:12px; cursor:pointer;" onclick="closeShortcutPicker()">✕ ${currentLang === 'ar' ? 'إغلاق' : 'Fermer'}</span>`;
      const active = getNavShortcuts();
      const remaining = availableNavShortcuts.filter(s => !active.includes(s.id));
      const content = document.getElementById('shortcut-picker-content');

      let activeHtml = '';
      if (active.length) {
        const activeLabel = currentLang === 'ar' ? 'النشطة (رتّبها بالأسهم)' : 'Actifs (réordonner avec les flèches)';
        activeHtml = `<div class="shortcut-picker-section-label">${activeLabel}</div>` + active.map((id, idx) => {
          const cfg = availableNavShortcuts.find(s => s.id === id);
          if (!cfg) return '';
          const label = currentLang === 'ar' ? cfg.labelAr : cfg.labelFr;
          const upDisabled = idx === 0 ? 'disabled' : '';
          const downDisabled = idx === active.length - 1 ? 'disabled' : '';
          return `<div class="shortcut-picker-row shortcut-picker-row-active">
            <span class="sp-icon">${svgIcon(cfg.icon, 18)}</span> <span style="flex:1">${label}</span>
            <button type="button" onclick="moveNavShortcut('${id}', -1)" ${upDisabled} title="${currentLang === 'ar' ? 'لأعلى' : 'Monter'}">▲</button>
            <button type="button" onclick="moveNavShortcut('${id}', 1)" ${downDisabled} title="${currentLang === 'ar' ? 'لأسفل' : 'Descendre'}">▼</button>
            <button type="button" onclick="removeNavShortcut('${id}')" title="${currentLang === 'ar' ? 'إزالة' : 'Retirer'}">✕</button>
          </div>`;
        }).join('');
      }

      let remainingHtml = '';
      if (remaining.length === 0) {
        remainingHtml = active.length ? '' : `<div class="shortcut-picker-empty">${currentLang === 'ar' ? 'لقد أضفت جميع الاختصارات المتاحة.' : 'Vous avez déjà ajouté tous les raccourcis disponibles.'}</div>`;
      } else {
        const addLabel = currentLang === 'ar' ? 'إضافة اختصار' : 'Ajouter un raccourci';
        remainingHtml = `<div class="shortcut-picker-section-label">${addLabel}</div>` + remaining.map(s => `<div class="shortcut-picker-row" onclick="addNavShortcut('${s.id}')">
          <span class="sp-icon">${svgIcon(s.icon, 18)}</span> <span>${currentLang === 'ar' ? s.labelAr : s.labelFr}</span>
        </div>`).join('');
      }

      content.innerHTML = activeHtml + remainingHtml;
      closeAllFloatingPopups();
      document.getElementById('shortcut-picker-box').classList.add('show');
      syncFloatingBackdrop();
    }

    function closeShortcutPicker() {
      document.getElementById('shortcut-picker-box').classList.remove('show');
      syncFloatingBackdrop();
    }

