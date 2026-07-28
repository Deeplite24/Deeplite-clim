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
          ${formatCreatedInfo(d)}
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
          ${formatCreatedInfo(d)}
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
            ${formatCreatedInfo(d)}
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
          ${formatCreatedInfo(d)}
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
        db.collection('users').doc(currentUid).collection('cheques').add({ num, owner, amount, type, date, createdByDeviceId: getDeviceId(), createdByName: (getDeviceProfile() ? deviceDisplayName(getDeviceProfile()) : currentUserLabel()), createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: new Date().toISOString(), updatedBy: currentUserLabel() }).then(() => {
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
        db.collection('users').doc(currentUid).collection('stock').add({ name, qty, price, date, createdByDeviceId: getDeviceId(), createdByName: (getDeviceProfile() ? deviceDisplayName(getDeviceProfile()) : currentUserLabel()), createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: new Date().toISOString(), updatedBy: currentUserLabel() }).then(() => {
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
        db.collection('users').doc(currentUid).collection('installations').add({ client, phone, map, clim, service, date, createdByDeviceId: getDeviceId(), createdByName: (getDeviceProfile() ? deviceDisplayName(getDeviceProfile()) : currentUserLabel()), createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: new Date().toISOString(), updatedBy: currentUserLabel() }).then(() => {
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
        db.collection('users').doc(currentUid).collection('notes').add({ text, datetime, createdByDeviceId: getDeviceId(), createdByName: (getDeviceProfile() ? deviceDisplayName(getDeviceProfile()) : currentUserLabel()), createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: new Date().toISOString(), updatedBy: currentUserLabel() }).then(() => {
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

