// ============================================================================
// notify-msgs.js — ملف مخصص وحدو لإشعارات الرسائل (خاصة + مجموعات + خارجية)
// ============================================================================
// عندو دالة وحيدة refreshMsgsBadge() كتحسب وتعرض كل حاجة، كل جزء محمي بوحدو
// (try/catch) باش شي خطأ ما يبلقيش الباقي. عندها زوج شبكات أمان:
//   1) فحص ذاتي (setInterval كل 3 ثواني) من الكاش المحلي.
//   2) قراءة مباشرة من Firestore (بلا cache) كل 5 ثواني كملاذ أخير.
// كتاخد بلاصة updateMsgsNotifications/renderMsgsCenter القديمين (كتحملهم من
// بعد chat.js فـindex.html، فهي لي كتبقى الفعلية).
// ============================================================================

function refreshMsgsBadge() {
  const badge = document.getElementById('msgs-badge');
  let total = 0;
  const safeNum = (v) => (typeof v === 'number' && !isNaN(v)) ? v : 0;

  try { if (typeof computeGroupChatUnread === 'function') total += safeNum(computeGroupChatUnread()); }
  catch (e) { console.error('[notify-msgs] group unread failed:', e); }

  try { if (typeof computeTotalPrivateUnread === 'function') total += safeNum(computeTotalPrivateUnread()); }
  catch (e) { console.error('[notify-msgs] private unread failed:', e); }

  try { if (typeof computeTotalExternalUnread === 'function') total += safeNum(computeTotalExternalUnread()); }
  catch (e) { console.error('[notify-msgs] external unread failed:', e); }

  try { if (typeof computeExternalIncomingInvites === 'function') total += safeNum(computeExternalIncomingInvites()); }
  catch (e) { console.error('[notify-msgs] external invites failed:', e); }

  try { if (typeof computeNewGroupJoinNotifs === 'function') total += safeNum(computeNewGroupJoinNotifs().length); }
  catch (e) { console.error('[notify-msgs] group joins failed:', e); }

  if (badge) {
    if (total > 0) { badge.innerText = total > 9 ? '9+' : String(total); badge.style.display = 'flex'; }
    else { badge.style.display = 'none'; }
  }

  const box = document.getElementById('msgs-center-box');
  if (box && box.classList.contains('show') && typeof renderMsgsCenter === 'function') {
    try { renderMsgsCenter(); }
    catch (e) { console.error('[notify-msgs] renderMsgsCenter failed:', e); }
  }
}

// ⚠️ كتاخد بلاصة الدالة ديال chat.js — كل نداء ليها فباقي الملفات (updateBellNotifications،
// groups.js، private-chat.js...) غايوصل لهنا مباشرة
function updateMsgsNotifications() {
  refreshMsgsBadge();
}

// فحص ذاتي دوري: حتى ولو شي listener فات أو طاح بخطأ صامت، هاد الفحص كيعاود
// يحسب من الكاش المحلي كل 3 ثواني.
setInterval(() => {
  try { refreshMsgsBadge(); } catch (e) { console.error('[notify-msgs] self-check failed:', e); }
}, 3000);

// ⚠️ "الملاذ الأخير": قراءة مباشرة من Firestore (بلا أي cache/listener) كل 5 ثواني —
// شبكة أمان إضافية إلا وقع شي مشكل فالـlisteners.
function __directFetchMsgsUnread() {
  if (typeof db === 'undefined' || !db || typeof currentUid === 'undefined' || !currentUid) return;
  const myId = currentUid;
  let groupTotal = 0, privateTotal = 0;
  const groupPromise = db.collection('groups').where('memberIds', 'array-contains', myId).get()
    .then(snap => { groupTotal = 0; snap.forEach(d => { const g = d.data(); groupTotal += (g.unread && g.unread[myId]) || 0; }); })
    .catch(() => {});
  const privatePromise = (typeof currentCompanyId !== 'undefined' && currentCompanyId)
    ? db.collection('companies').doc(currentCompanyId).collection('privateChats').where('participants', 'array-contains', myId).get()
        .then(snap => { privateTotal = 0; snap.forEach(d => { const c = d.data(); privateTotal += (c.unread && c.unread[myId]) || 0; }); })
        .catch(() => {})
    : Promise.resolve();
  Promise.all([groupPromise, privatePromise]).then(() => {
    const total = groupTotal + privateTotal;
    const badge = document.getElementById('msgs-badge');
    if (badge && total > 0) { badge.innerText = total > 9 ? '9+' : String(total); badge.style.display = 'flex'; }
  });
}
setInterval(__directFetchMsgsUnread, 5000);
setTimeout(__directFetchMsgsUnread, 1500);

document.addEventListener('DOMContentLoaded', () => {
  try { refreshMsgsBadge(); } catch (e) {}
});
