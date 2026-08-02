    // قراءة/تعمير آمنة لخانة فورم: إلا العنصر ماكانش موجود فـ index.html (مثلاً نسخة قديمة
    // منشورة ماعندهاش خانة جديدة)، كنرجعو قيمة افتراضية عوض ما ندوزو exception توقف الدالة كاملة.
    function safeVal(id, fallback) {
      const el = document.getElementById(id);
      return el ? el.value : (fallback !== undefined ? fallback : '');
    }
    function safeSetVal(id, val) {
      const el = document.getElementById(id);
      if (el) el.value = val;
    }

    // ⚠️ الپارامتر دابا هو companyId (ماشي uid) — البيانات (شيكات، ستوك، انستالاسيون، ملاحظات)
    // ولات مشتركة بين جميع أعضاء نفس الشركة، عوض ما كانت معزولة لكل حساب Firebase وحدو
    function loadUserData(companyId) {
      dataLoading = { cheques: true, stock: true, installations: true, notes: true };
      renderNavShortcuts();
      if (typeof startAccessListener === 'function') startAccessListener(companyId); // قائمة عمال الشركة + الصلاحيات ديالهم
      if (typeof startMembersListener === 'function') startMembersListener(companyId); // دليل الأعضاء (بحال الاسم الحالي، الحظر...)
      if (typeof upsertMember === 'function') upsertMember(); // كنحدثو السمية الحالية فكل دخول، باش ما تبقاش سمية قديمة
      db.collection('companies').doc(companyId).collection('cheques').onSnapshot(snapshot => {
        dataLoading.cheques = false;
        if (snapshot.empty) {
          globalData.cheques = [];
        } else {
          const arr = [];
          snapshot.forEach(doc => { const d = doc.data(); d.id = doc.id; arr.push(d); });
          globalData.cheques = arr;
        }
        renderChequesListUI();
      });

      db.collection('companies').doc(companyId).collection('stock').onSnapshot(snapshot => {
        dataLoading.stock = false;
        if (snapshot.empty) {
          globalData.stock = [];
        } else {
          const arr = [];
          snapshot.forEach(doc => { const d = doc.data(); d.id = doc.id; arr.push(d); });
          globalData.stock = arr;
        }
        renderStockListUI();
      });

      db.collection('companies').doc(companyId).collection('installations').onSnapshot(snapshot => {
        dataLoading.installations = false;
        if (snapshot.empty) {
          globalData.installations = [];
        } else {
          const arr = [];
          snapshot.forEach(doc => { const d = doc.data(); d.id = doc.id; arr.push(d); });
          globalData.installations = arr;
        }
        renderInstallationsListUI();
      });

      db.collection('companies').doc(companyId).collection('notes').onSnapshot(snapshot => {
        dataLoading.notes = false;
        if (snapshot.empty) {
          globalData.notes = [];
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
    function renderHomeStats() {
      const outEl = document.getElementById('stat-cheques-out');
      if (!outEl) return; // الصفحة الرئيسية ماشي مفتوحة بعد فالـ DOM

      let outTotal = 0, inTotal = 0;
      globalData.cheques.forEach(c => {
        const amt = Number(c.amount) || 0;
        if (c.type === 'شيك صادر') outTotal += amt;
        else if (c.type === 'شيك وارد') inTotal += amt;
      });
      document.getElementById('stat-cheques-out').textContent = formatNumberManual(outTotal) + ' DH';
      document.getElementById('stat-cheques-in').textContent = formatNumberManual(inTotal) + ' DH';

      let stockValue = 0, lowCount = 0;
      globalData.stock.forEach(s => {
        stockValue += (Number(s.qty) || 0) * (Number(s.price) || 0);
        if (s.minQty && Number(s.qty) <= Number(s.minQty)) lowCount++;
      });
      document.getElementById('stat-stock-value').textContent = formatNumberManual(stockValue) + ' DH';

      const lowCard = document.getElementById('stat-low-stock-card');
      document.getElementById('stat-low-stock-count').textContent = lowCount;
      lowCard.style.display = lowCount > 0 ? '' : 'none';

      const labels = {
        ar: { out: 'شيكات صادرة', in: 'شيكات واردة', stock: 'قيمة المخزون', low: 'قطعة منخفضة المخزون' },
        fr: { out: 'Chèques émis', in: 'Chèques reçus', stock: 'Valeur du stock', low: 'Articles en stock bas' }
      };
      const l = labels[currentLang] || labels.ar;
      document.getElementById('stat-cheques-out-lbl').textContent = l.out;
      document.getElementById('stat-cheques-in-lbl').textContent = l.in;
      document.getElementById('stat-stock-value-lbl').textContent = l.stock;
      document.getElementById('stat-low-stock-lbl').textContent = l.low;
    }

    function renderChequesListUI() {
      const t = translations[currentLang];
      const list = document.getElementById('cheques-list');
      if (!list) return;
      if (dataLoading.cheques) {
        list.innerHTML = loadingStateHTML();
        return;
      }
      if (globalData.cheques.length === 0) {
        list.innerHTML = emptyStateHTML(
          '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.2"/><line x1="2" y1="9.5" x2="22" y2="9.5"/></svg>',
          'لا توجد شيكات بعد', 'Aucun chèque pour le moment',
          'املأ النموذج أعلاه واضغط على "+ تسجيل الشيك" لإضافة أول شيك', 'Remplissez le formulaire ci-dessus et appuyez sur "+ Enregistrer le chèque" pour créer le premier'
        );
      } else {
        list.innerHTML = sortWithPendingLast(globalData.cheques).map(d => `<div class="item-card ${d.pendingEdit ? 'has-pending-edit' : ''}" id="cheques-item-${d.id}">
          <div class="item-header"><span class="item-title">#${d.num} - ${d.owner}</span><span class="item-badge">${d.amount} DH</span></div>
          <div class="item-sub">${d.type} | ${d.date ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5"/></svg> ' + d.date.replace('T', ' ') : '-'}</div>
          ${formatCreatedInfo(d)}
          ${formatUpdateInfo(d)}
          ${renderPreviousValueBox('cheques', d)}
          ${renderPendingEditBox('cheques', d)}
          <div class="item-actions"><span></span><span style="display:flex; gap:8px;"><button class="btn-edit" onclick="startEditCheque('${d.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 20l1-4.2L15.8 5 19 8.2 8.2 19z"/><line x1="13.8" y1="6.9" x2="17" y2="10.1"/></svg></button>${deleteBtnHtml('cheques', d.id, t)}</span></div>
        </div>`).join('');
      }
      updateNotificationBoxes();
      showPersistentRemindersNotification();
      applySearchFilter('cheques');
      updateBellNotifications();
      renderHomeStats();
    }

    function renderStockListUI() {
      const t = translations[currentLang];
      const list = document.getElementById('stock-list');
      if (!list) return;
      if (dataLoading.stock) {
        list.innerHTML = loadingStateHTML();
        return;
      }
      if (globalData.stock.length === 0) {
        list.innerHTML = emptyStateHTML(
          '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
          'المخزن فارغ حاليا', 'Le stock est vide',
          'املأ النموذج أعلاه واضغط على "+ إضافة للمخزن" لإضافة أول قطعة', 'Remplissez le formulaire ci-dessus et appuyez sur "+ Ajouter au stock" pour créer le premier article'
        );
      } else {
        list.innerHTML = sortWithPendingLast(globalData.stock).map(d => {
          const isLow = d.minQty && Number(d.qty) <= Number(d.minQty);
          const lowBadge = isLow ? `<span class="stock-low-badge">⚠️ ${currentLang === 'ar' ? 'منخفض' : 'Bas'}</span>` : '';
          return `<div class="item-card ${d.pendingEdit ? 'has-pending-edit' : ''}" id="stock-item-${d.id}">
          <div class="item-header"><span class="item-title">${d.name}${lowBadge}</span><span class="item-badge">Qty: ${d.qty} | ${d.price || 0} DH</span></div>
          <div class="item-sub">${d.date ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5"/></svg> ' + d.date.replace('T', ' ') : '-'}</div>
          ${formatCreatedInfo(d)}
          ${formatUpdateInfo(d)}
          ${renderPreviousValueBox('stock', d)}
          ${renderPendingEditBox('stock', d)}
          <div class="item-actions"><span></span><span style="display:flex; gap:8px;"><button class="btn-edit" onclick="startEditStock('${d.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 20l1-4.2L15.8 5 19 8.2 8.2 19z"/><line x1="13.8" y1="6.9" x2="17" y2="10.1"/></svg></button>${deleteBtnHtml('stock', d.id, t)}</span></div>
        </div>`;
        }).join('');
      }
      updateNotificationBoxes();
      showPersistentRemindersNotification();
      applySearchFilter('stock');
      updateBellNotifications();
      renderHomeStats();
    }

    function renderInstallationsListUI() {
      const t = translations[currentLang];
      const list = document.getElementById('install-list');
      if (!list) return;
      if (dataLoading.installations) {
        list.innerHTML = loadingStateHTML();
        return;
      }
      if (globalData.installations.length === 0) {
        list.innerHTML = emptyStateHTML(
          '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.4 17.6 3 21m2-13 3 3m10.6 8.6L21 21m-6.3-9.7 5.6-5.6a4.2 4.2 0 0 1-5.5 5.5l-6.9 6.9a1.5 1.5 0 0 1-2.1-2.1l6.9-6.9a4.2 4.2 0 0 1 5.5-5.5l-3.6 3.6z"/></svg>',
          'لا توجد مواعيد بعد', 'Aucun rendez-vous pour le moment',
          'املأ النموذج أعلاه واضغط على "+ تسجيل الخدمة" لإضافة أول موعد', 'Remplissez le formulaire ci-dessus et appuyez sur "+ Enregistrer le service" pour créer le premier'
        );
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
            <div class="item-sub">${d.date ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5"/></svg> ' + d.date.replace('T', ' ') : '-'}${repeatBadgeHtml(d.repeat)}</div>
            ${formatCreatedInfo(d)}
          ${formatUpdateInfo(d)}
            ${renderPreviousValueBox('installations', d)}
            ${renderPendingEditBox('installations', d)}
            <div class="item-actions">${mapButtonHtml}<span style="display:flex; gap:8px;"><button class="btn-map-link" onclick="printServiceCertificate('${d.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><rect x="6" y="14" width="12" height="7"/></svg> ${currentLang === 'ar' ? 'طباعة شهادة' : 'Certificat'}</button><button class="btn-edit" onclick="startEditInstallation('${d.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 20l1-4.2L15.8 5 19 8.2 8.2 19z"/><line x1="13.8" y1="6.9" x2="17" y2="10.1"/></svg></button>${deleteBtnHtml('installations', d.id, t)}</span></div>
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
      if (dataLoading.notes) {
        list.innerHTML = loadingStateHTML();
        return;
      }
      if (globalData.notes.length === 0) {
        list.innerHTML = emptyStateHTML(
          '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="14" height="18" rx="1.4"/><line x1="7" y1="8" x2="14" y2="8"/><line x1="7" y1="12" x2="11.5" y2="12"/></svg>',
          'لا توجد ملاحظات بعد', 'Aucune note pour le moment',
          'املأ النموذج أعلاه واضغط على "+ حفظ الملاحظة" لإضافة أول ملاحظة', 'Remplissez le formulaire ci-dessus et appuyez sur "+ Enregistrer la note" pour créer la première'
        );
      } else {
        list.innerHTML = sortWithPendingLast(globalData.notes).map(d => `<div class="item-card ${d.pendingEdit ? 'has-pending-edit' : ''}" id="notes-item-${d.id}">
          <div class="item-title" style="white-space: pre-wrap;">${d.text}</div>
          ${d.datetime ? `<div class="item-sub"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6M4.5 6l1.5-1.5M19.5 6 18 4.5"/></svg> ${d.datetime.replace('T', ' ')}${repeatBadgeHtml(d.repeat)}</div>` : ''}
          ${formatCreatedInfo(d)}
          ${formatUpdateInfo(d)}
          ${renderPreviousValueBox('notes', d)}
          ${renderPendingEditBox('notes', d)}
          <div class="item-actions"><span></span><span style="display:flex; gap:8px;"><button class="btn-edit" onclick="startEditNote('${d.id}')"><svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 20l1-4.2L15.8 5 19 8.2 8.2 19z"/><line x1="13.8" y1="6.9" x2="17" y2="10.1"/></svg></button>${deleteBtnHtml('notes', d.id, t)}</span></div>
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
      document.getElementById('item-minqty').value = item.minQty || '';
      document.getElementById('item-date').value = item.date || '';
      document.getElementById('stk-btn-add').innerHTML = currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> تحديث السلعة' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> Mettre à jour';
      document.getElementById('stk-cancel-edit').classList.add('show');
      openSection('stock-section');
      window.scrollTo(0, 0);
    }

    function cancelEditStock() {
      editingItem.stock = null;
      document.getElementById('item-name').value = ''; document.getElementById('item-qty').value = ''; document.getElementById('item-price').value = ''; document.getElementById('item-minqty').value = ''; document.getElementById('item-date').value = '';
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
      safeSetVal('install-repeat', item.repeat || '');
      document.getElementById('srv-btn-add').innerHTML = currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> تحديث الخدمة' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> Mettre à jour';
      document.getElementById('srv-cancel-edit').classList.add('show');
      openSection('install-section');
      window.scrollTo(0, 0);
    }

    function cancelEditInstallation() {
      editingItem.installations = null;
      document.getElementById('client-name').value = ''; document.getElementById('client-phone').value = ''; document.getElementById('client-map').value = ''; document.getElementById('clim-type').value = ''; document.getElementById('service-type').selectedIndex = 0; document.getElementById('install-date').value = ''; safeSetVal('install-repeat', '');
      document.getElementById('srv-btn-add').innerHTML = translations[currentLang].srvBtnAdd;
      document.getElementById('srv-cancel-edit').classList.remove('show');
    }

    function startEditNote(id) {
      const item = globalData.notes.find(x => x.id === id);
      if (!item) return;
      editingItem.notes = id;
      document.getElementById('note-text').value = item.text;
      document.getElementById('note-datetime').value = item.datetime || '';
      safeSetVal('note-repeat', item.repeat || '');
      document.getElementById('nts-btn-add').innerHTML = currentLang === 'ar' ? '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> تحديث الملاحظة' : '<svg viewBox="0 0 24 24" width="15" height="15" style="vertical-align:-3px;margin-inline-end:3px" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ><path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h8V4"/><rect x="8" y="13" width="8" height="6"/></svg> Mettre à jour';
      document.getElementById('nts-cancel-edit').classList.add('show');
      openSection('notes-section');
      window.scrollTo(0, 0);
    }

    function cancelEditNote() {
      editingItem.notes = null;
      document.getElementById('note-text').value = ''; document.getElementById('note-datetime').value = ''; safeSetVal('note-repeat', '');
      document.getElementById('nts-btn-add').innerHTML = translations[currentLang].ntsBtnAdd;
      document.getElementById('nts-cancel-edit').classList.remove('show');
    }

    function addCheque() {
      if (!currentUid) return;
      if (typeof hasSectionPermission === 'function' && !hasSectionPermission('cheques')) {
        alert(currentLang === 'ar' ? 'ماعندكش الصلاحية باش تزيد أو تعدل الشيكات، تواصل مع المسؤول.' : "Vous n'avez pas la permission d'ajouter ou modifier les chèques, contactez l'administrateur.");
        return;
      }
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
        db.collection('companies').doc(currentCompanyId).collection('cheques').add({ num, owner, amount, type, date, createdByDeviceId: getDeviceId(), createdByName: (getDeviceProfile() ? deviceDisplayName(getDeviceProfile()) : currentUserLabel()), createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: new Date().toISOString(), updatedBy: (getDeviceProfile() ? deviceDisplayName(getDeviceProfile()) : currentUserLabel()) }).then(() => {
          document.getElementById('chk-num').value = ''; document.getElementById('chk-owner').value = ''; document.getElementById('chk-amount').value = ''; document.getElementById('chk-type').selectedIndex = 0; document.getElementById('chk-date').value = '';
        }).catch(showSaveError);
      }
    }

    function addStockItem() {
      if (!currentUid) return;
      if (typeof hasSectionPermission === 'function' && !hasSectionPermission('stock')) {
        alert(currentLang === 'ar' ? 'ماعندكش الصلاحية باش تزيد أو تعدل المخزون، تواصل مع المسؤول.' : "Vous n'avez pas la permission d'ajouter ou modifier le stock, contactez l'administrateur.");
        return;
      }
      const name = document.getElementById('item-name').value.trim();
      const qty = document.getElementById('item-qty').value.trim();
      const price = document.getElementById('item-price').value.trim() || "0";
      const minQty = document.getElementById('item-minqty').value.trim() || "";
      const date = document.getElementById('item-date').value;
      if (!name || !qty) { alert(currentLang === 'ar' ? "المرجو إدخال اسم القطعة والكمية!\nVeuillez entrer le nom et la quantité !" : "Veuillez entrer le nom et la quantité !\nالمرجو إدخال اسم القطعة والكمية!"); return; }
      if (editingItem.stock) {
        submitPendingEdit('stock', editingItem.stock, { name, qty, price, minQty, date });
        cancelEditStock();
      } else {
        db.collection('companies').doc(currentCompanyId).collection('stock').add({ name, qty, price, minQty, date, createdByDeviceId: getDeviceId(), createdByName: (getDeviceProfile() ? deviceDisplayName(getDeviceProfile()) : currentUserLabel()), createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: new Date().toISOString(), updatedBy: (getDeviceProfile() ? deviceDisplayName(getDeviceProfile()) : currentUserLabel()) }).then(() => {
          document.getElementById('item-name').value = ''; document.getElementById('item-qty').value = ''; document.getElementById('item-price').value = ''; document.getElementById('item-minqty').value = ''; document.getElementById('item-date').value = '';
        }).catch(showSaveError);
      }
    }

    function addInstallation() {
      if (!currentUid) return;
      if (typeof hasSectionPermission === 'function' && !hasSectionPermission('installations')) {
        alert(currentLang === 'ar' ? 'ماعندكش الصلاحية باش تزيد أو تعدل التركيب/الخدمات، تواصل مع المسؤول.' : "Vous n'avez pas la permission d'ajouter ou modifier les installations/services, contactez l'administrateur.");
        return;
      }
      const client = document.getElementById('client-name').value.trim();
      const phone = document.getElementById('client-phone').value.trim();
      const map = document.getElementById('client-map').value.trim();
      const clim = document.getElementById('clim-type').value.trim();
      const service = document.getElementById('service-type').value;
      const date = document.getElementById('install-date').value;
      const repeat = safeVal('install-repeat', '');
      if (!client || !service) { alert(currentLang === 'ar' ? "المرجو إدخال اسم الزبون ونوع الخدمة!\nVeuillez entrer le client et le service !" : "Veuillez entrer le client et le service !\nالمرجو إدخال اسم الزبون ونوع الخدمة!"); return; }
      if (editingItem.installations) {
        submitPendingEdit('installations', editingItem.installations, { client, phone, map, clim, service, date, repeat });
        cancelEditInstallation();
      } else {
        db.collection('companies').doc(currentCompanyId).collection('installations').add({ client, phone, map, clim, service, date, repeat, createdByDeviceId: getDeviceId(), createdByName: (getDeviceProfile() ? deviceDisplayName(getDeviceProfile()) : currentUserLabel()), createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: new Date().toISOString(), updatedBy: (getDeviceProfile() ? deviceDisplayName(getDeviceProfile()) : currentUserLabel()) }).then(() => {
          document.getElementById('client-name').value = ''; document.getElementById('client-phone').value = ''; document.getElementById('client-map').value = ''; document.getElementById('clim-type').value = ''; document.getElementById('service-type').selectedIndex = 0; document.getElementById('install-date').value = ''; safeSetVal('install-repeat', '');
        }).catch(showSaveError);
      }
    }

    function addNote() {
      if (!currentUid) return;
      if (typeof hasSectionPermission === 'function' && !hasSectionPermission('notes')) {
        alert(currentLang === 'ar' ? 'ماعندكش الصلاحية باش تزيد أو تعدل الملاحظات، تواصل مع المسؤول.' : "Vous n'avez pas la permission d'ajouter ou modifier les notes, contactez l'administrateur.");
        return;
      }
      const text = document.getElementById('note-text').value.trim();
      const datetime = document.getElementById('note-datetime').value;
      const repeat = safeVal('note-repeat', '');
      if (!text) { alert(currentLang === 'ar' ? "المرجو كتابة نص الملاحظة!\nVeuillez écrire la note !" : "Veuillez écrire la note !\nالمرجو كتابة نص الملاحظة!"); return; }
      if (editingItem.notes) {
        submitPendingEdit('notes', editingItem.notes, { text, datetime, repeat });
        cancelEditNote();
      } else {
        db.collection('companies').doc(currentCompanyId).collection('notes').add({ text, datetime, repeat, createdByDeviceId: getDeviceId(), createdByName: (getDeviceProfile() ? deviceDisplayName(getDeviceProfile()) : currentUserLabel()), createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: new Date().toISOString(), updatedBy: (getDeviceProfile() ? deviceDisplayName(getDeviceProfile()) : currentUserLabel()) }).then(() => {
          document.getElementById('note-text').value = ''; document.getElementById('note-datetime').value = ''; safeSetVal('note-repeat', '');
        }).catch(showSaveError);
      }
    }

    function repeatBadgeHtml(repeat) {
      if (!repeat) return '';
      const labels = {
        daily: currentLang === 'ar' ? '🔁 يومي' : '🔁 Quotidien',
        weekly: currentLang === 'ar' ? '🔁 أسبوعي' : '🔁 Hebdomadaire',
        monthly: currentLang === 'ar' ? '🔁 شهري' : '🔁 Mensuel'
      };
      if (!labels[repeat]) return '';
      return ` <span style="font-size:10px; color:#38bdf8;">${labels[repeat]}</span>`;
    }

    function advanceDateByRepeat(date, repeat) {
      const d = new Date(date);
      if (repeat === 'daily') d.setDate(d.getDate() + 1);
      else if (repeat === 'weekly') d.setDate(d.getDate() + 7);
      else if (repeat === 'monthly') d.setMonth(d.getMonth() + 1);
      return d;
    }

    function toDatetimeLocalValue(date) {
      const pad = n => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    // ملي وقت تذكير/موعد متكرر يفوت، كنقدمو التاريخ تلقائياً للمرة الجاية عوض ما نخليوه يبقى فايت
    function advanceRecurringItems() {
      if (!currentCompanyId) return;
      const now = new Date();
      globalData.notes.forEach(d => {
        if (!d.repeat || !d.datetime) return;
        let dt = new Date(d.datetime);
        if (isNaN(dt) || dt >= now) return;
        while (dt < now) dt = advanceDateByRepeat(dt, d.repeat);
        db.collection('companies').doc(currentCompanyId).collection('notes').doc(d.id).update({ datetime: toDatetimeLocalValue(dt) }).catch(() => {});
      });
      globalData.installations.forEach(d => {
        if (!d.repeat || !d.date) return;
        let dt = new Date(d.date);
        if (isNaN(dt) || dt >= now) return;
        while (dt < now) dt = advanceDateByRepeat(dt, d.repeat);
        db.collection('companies').doc(currentCompanyId).collection('installations').doc(d.id).update({ date: toDatetimeLocalValue(dt) }).catch(() => {});
      });
    }

    setInterval(advanceRecurringItems, 60000);

    function deleteBtnHtml(col, id, t) {
      return isCurrentUserAdmin() ? `<button class="btn-delete" onclick="deleteItem('${col}','${id}')">${t.delBtn}</button>` : '';
    }

    function deleteItem(col, id) {
      if (!currentCompanyId) return;
      if (!isCurrentUserAdmin()) {
        alert(currentLang === 'ar' ? 'الحذف متاح فقط للمسؤول، تواصل معه.' : "La suppression est réservée à l'administrateur, contactez-le.");
        return;
      }
      if (confirm(currentLang === 'ar' ? "هل أنت متأكد من الحذف؟\nÊtes-vous sûr de vouloir supprimer ?" : "Êtes-vous sûr de vouloir supprimer ?\nهل أنت متأكد من الحذف؟")) { 
        db.collection('companies').doc(currentCompanyId).collection(col).doc(id).delete().catch(showSaveError); 
      }
    }

    // إصلاح لمرة وحدة: العناصر القديمة لي عندها updatedBy غالط (بسبب بگ قديم كان كيستعمل
    // currentUserLabel() عوض اسم بروفايل الجهاز). كنصلح غير العناصر لي عمرها ماتعدلات
    // بصح (الفرق بين وقت الإنشاء ووقت آخر تعديل صغير جداً)، باش ما نخربقش تعديلات حقيقية
    // دارها شخص آخر من بعد الإنشاء.
    function fixOldUpdatedByNames() {
      if (!currentCompanyId) return;
      if (!isCurrentUserAdmin()) {
        alert(currentLang === 'ar' ? 'هذا الإجراء متاح فقط للمسؤول.' : "Cette action est réservée à l'administrateur.");
        return;
      }
      if (!confirm(currentLang === 'ar' ? 'سيقوم هذا الإجراء بتصحيح اسم "آخر تعديل" في العناصر القديمة التي لم يتم تعديلها فعلياً منذ إضافتها. هل أنت متأكد؟' : 'Cette action va corriger le nom "dernière modification" des anciens éléments jamais réellement modifiés. Continuer ?')) return;

      const collections = ['cheques', 'stock', 'installations', 'notes'];
      let fixedCount = 0;
      let batch = db.batch();
      let opsInBatch = 0;
      const commits = [];

      collections.forEach(col => {
        (globalData[col] || []).forEach(d => {
          if (!d.createdByName || !d.createdAt || typeof d.createdAt.toDate !== 'function' || !d.updatedAt) return;
          if (d.updatedBy === d.createdByName) return; // مزيان ديجا
          const createdMs = d.createdAt.toDate().getTime();
          const updatedMs = new Date(d.updatedAt).getTime();
          if (isNaN(updatedMs) || Math.abs(updatedMs - createdMs) > 60000) return; // فرق كبير = تعديل حقيقي، ما نمسوش
          const ref = db.collection('companies').doc(currentCompanyId).collection(col).doc(d.id);
          batch.update(ref, { updatedBy: d.createdByName });
          fixedCount++;
          opsInBatch++;
          if (opsInBatch >= 400) { // حد Firestore لكل batch هو 500
            commits.push(batch.commit());
            batch = db.batch();
            opsInBatch = 0;
          }
        });
      });
      if (opsInBatch > 0) commits.push(batch.commit());

      if (fixedCount === 0) {
        alert(currentLang === 'ar' ? 'لا يوجد أي عنصر بحاجة إلى إصلاح.' : 'Aucun élément à corriger.');
        return;
      }
      Promise.all(commits).then(() => {
        alert(currentLang === 'ar' ? `تم إصلاح ${fixedCount} عنصر بنجاح.` : `${fixedCount} élément(s) corrigé(s) avec succès.`);
      }).catch(err => {
        console.error('fixOldUpdatedByNames error:', err);
        alert(currentLang === 'ar' ? 'وقع خطأ أثناء الإصلاح، حاول من جديد.' : "Une erreur s'est produite, réessayez.");
      });
    }

    function confirmAndDeleteEverything() {
      if (!currentCompanyId) return;
      if (!isCurrentUserAdmin()) {
        alert(currentLang === 'ar' ? 'هذا الإجراء متاح فقط للمسؤول.' : "Cette action est réservée à l'administrateur.");
        return;
      }
      let msg1 = currentLang === 'ar' ? "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> تحذير خطير: هل أنت متأكد تماماً أنك تريد مسح كاع بيانات التطبيق؟\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> Attention : Voulez-vous vraiment tout supprimer ?" : "<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> Attention : Voulez-vous vraiment tout supprimer ?\n<svg viewBox='0 0 24 24' width='15' height='15' style='vertical-align:-3px;margin-inline-end:3px' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' ><path d='M12 3 2 20h20z'/><line x1='12' y1='9.5' x2='12' y2='14'/><circle cx='12' cy='17' r='0.7' fill='currentColor' stroke='none'/></svg> تحذير خطير: هل أنت متأكد تماماً أنك تريد مسح كاع بيانات التطبيق؟";
      if (confirm(msg1)) {
        let promptMsg = currentLang === 'ar' ? "لأمانة بياناتك، اكتب كلمة (مسح) أو (supprimer) للتأكيد:\nTapez (supprimer) pour confirmer :" : "Tapez (supprimer) pour confirmer :\nلأمانة بياناتك، اكتب كلمة (مسح) أو (supprimer) للتأكيد:";
        let confirm2 = prompt(promptMsg);
        if (confirm2 === "مسح" || confirm2 === "supprimer") {
          ['cheques', 'stock', 'installations', 'notes'].forEach(col => {
            db.collection('companies').doc(currentCompanyId).collection(col).get().then(snap => snap.forEach(d => d.ref.delete()));
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
          <p>Date: ${formatDateTimeFull(new Date())}</p>
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

    function printServiceCertificate(id) {
      const d = globalData.installations.find(x => x.id === id);
      if (!d) return;
      const isAr = currentLang === 'ar';
      const dateStr = d.date ? d.date.replace('T', ' ') : formatDateTimeFull(new Date());
      let printWindow = window.open('', '_blank');
      let htmlContent = `
        <html lang="${currentLang}" dir="${translations[currentLang].dir}">
        <head>
          <meta charset="UTF-8">
          <title>Deep Lite Clim - ${isAr ? 'شهادة خدمة' : 'Certificat de service'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #000; direction: ${translations[currentLang].dir}; }
            .cert-box { max-width: 650px; margin: 0 auto; border: 2px solid #0284c7; border-radius: 10px; padding: 30px; }
            h1 { text-align: center; color: #0284c7; margin-bottom: 2px; }
            .cert-title { text-align: center; font-size: 16px; color: #1e293b; margin-bottom: 25px; font-weight: bold; }
            .cert-date { text-align: center; color: #64748b; font-size: 12px; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 30px; }
            td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
            td.lbl { color: #64748b; width: 35%; font-weight: bold; }
            .sign-row { display: flex; justify-content: space-between; margin-top: 50px; font-size: 13px; }
            .sign-box { width: 45%; text-align: center; }
            .sign-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; }
          </style>
        </head>
        <body>
          <div class="cert-box">
            <h1>Deep Lite Clim</h1>
            <div class="cert-title">${isAr ? 'شهادة إتمام خدمة / تدخل' : "Certificat d'intervention / service"}</div>
            <div class="cert-date">${isAr ? 'التاريخ:' : 'Date :'} ${dateStr}</div>
            <table>
              <tr><td class="lbl">${isAr ? 'الزبون' : 'Client'}</td><td>${d.client}</td></tr>
              <tr><td class="lbl">${isAr ? 'رقم الهاتف' : 'Téléphone'}</td><td>${d.phone || '-'}</td></tr>
              <tr><td class="lbl">${isAr ? 'نوع المكيف / التفاصيل' : 'Type de clim / Détails'}</td><td>${d.clim || '-'}</td></tr>
              <tr><td class="lbl">${isAr ? 'نوع الخدمة' : 'Type de service'}</td><td>${d.service}</td></tr>
            </table>
            <div class="sign-row">
              <div class="sign-box"><div class="sign-line">${isAr ? 'توقيع التقني' : 'Signature technicien'}</div></div>
              <div class="sign-box"><div class="sign-line">${isAr ? 'توقيع الزبون' : 'Signature client'}</div></div>
            </div>
          </div>
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
          <p>Date: ${formatDateTimeFull(new Date())}</p>
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

