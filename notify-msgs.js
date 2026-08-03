// ============================================================================
// notify-msgs.js — ملف مخصص وحدو لإشعارات الرسائل (خاصة + مجموعات + خارجية)
// ============================================================================
// السبب: الكود ديال هاد الإشعارات كان موزع بين chat.js/groups.js/private-chat.js
// وكيعتمد على استدعاءات updateBellNotifications()/updateMsgsNotifications() لازم
// تتنادى بالضبط فكل مكان لي البيانات كتبدل — إلا نسات شي بلاصة وحدة (أو طاحت
// بخطأ)، الإشعار يبقى ميت بلا ما تعرف ليه. هاد الملف كيحل هاد المشكل بجذورها:
//   1) عندو دالة وحيدة refreshMsgsBadge() كتحسب وتعرض كل حاجة، كل جزء محمي
//      بوحدو (try/catch) باش شي خطأ ما يبلقيش الباقي.
//   2) عندو "فحص ذاتي" (setInterval كل 3 ثواني) كيعاود يحسب من جديد بروحو —
//      حتى ولو حتى listener ماتنادى، الشارة/القائمة كتصلح روحها فأقرب فحص.
//   3) كتاخد بلاصة الدالتين القديمين updateMsgsNotifications/renderMsgsCenter
//      (كتحملهم من بعد chat.js فـindex.html، فهي لي كتبقى الفعلية).
// ============================================================================

let __notifyMsgsLastError = null;
let __notifyMsgsLastRefresh = null;
let __notifyMsgsLastTotal = null;
let __notifyMsgsBadgeFound = null;
let __notifyMsgsBadgeDisplay = null;

function refreshMsgsBadge() {
  const badge = document.getElementById('msgs-badge');
  __notifyMsgsBadgeFound = !!badge;
  let total = 0;

  // ⚠️ safeNum: كل قيمة كتزاد لل total كتعدي من هنا — إلا رجعت شي حاجة ماشي رقم صحيح
  // (undefined/NaN بسبب خطأ فدالة واحدة)، كنبدلوها بـ0 عوض ما نخليوها تفسد total كاملة.
  // هادشي هو لي كان واقع: computeExternalIncomingInvites() كانت كترجع رقم ديجا، وكنا
  // كنزيدو ليها .length مرة أخرى (رقم معندوش .length → undefined → NaN → total كاملة NaN
  // → total > 0 ديما false → الشارة ديما مخبية، حتى ولو كاين إشعارات حقيقيين).
  const safeNum = (v) => (typeof v === 'number' && !isNaN(v)) ? v : 0;

  try { if (typeof computeGroupChatUnread === 'function') total += safeNum(computeGroupChatUnread()); }
  catch (e) { console.error('[notify-msgs] group unread failed:', e); __notifyMsgsLastError = 'group unread: ' + e.message; }

  try { if (typeof computeTotalPrivateUnread === 'function') total += safeNum(computeTotalPrivateUnread()); }
  catch (e) { console.error('[notify-msgs] private unread failed:', e); __notifyMsgsLastError = 'private unread: ' + e.message; }

  try { if (typeof computeTotalExternalUnread === 'function') total += safeNum(computeTotalExternalUnread()); }
  catch (e) { console.error('[notify-msgs] external unread failed:', e); __notifyMsgsLastError = 'external unread: ' + e.message; }

  try { if (typeof computeExternalIncomingInvites === 'function') total += safeNum(computeExternalIncomingInvites()); }
  catch (e) { console.error('[notify-msgs] external invites failed:', e); __notifyMsgsLastError = 'external invites: ' + e.message; }

  try { if (typeof computeNewGroupJoinNotifs === 'function') total += safeNum(computeNewGroupJoinNotifs().length); }
  catch (e) { console.error('[notify-msgs] group joins failed:', e); __notifyMsgsLastError = 'group joins: ' + e.message; }

  __notifyMsgsLastRefresh = new Date();
  __notifyMsgsLastTotal = total;

  if (badge) {
    if (total > 0) { badge.innerText = total > 9 ? '9+' : String(total); badge.style.display = 'flex'; }
    else { badge.style.display = 'none'; }
    __notifyMsgsBadgeDisplay = badge.style.display;
  } else {
    __notifyMsgsBadgeDisplay = 'ELEMENT_NOT_FOUND';
  }

  const box = document.getElementById('msgs-center-box');
  if (box && box.classList.contains('show')) {
    if (typeof renderMsgsCenter === 'function') {
      try { renderMsgsCenter(); }
      catch (e) { console.error('[notify-msgs] renderMsgsCenter failed:', e); __notifyMsgsLastError = 'renderMsgsCenter: ' + e.message; }
    }
    renderNotifyMsgsDebugFooter();
  }
}

// ⚠️ شريط تشخيص مؤقت — كيبين تحت قائمة الإشعارات أرقام الكاش الداخلي وآخر خطأ (إلا كاين)،
// باش يقدر أي حد يعطيني screenshot بلا ما يحتاج يحل الـconsole. نقدر نمسحوه من بعد ما نأكدو.
function renderNotifyMsgsDebugFooter() {
  const box = document.getElementById('msgs-center-content');
  if (!box) return;
  const uidOk = (typeof currentUid !== 'undefined' && !!currentUid);
  const priv = (typeof privateChatsCache !== 'undefined') ? privateChatsCache.length : 'n/a';
  const grp = (typeof ownedGroupsCache !== 'undefined') ? ownedGroupsCache.length : 'n/a';
  const extGrp = (typeof externalGroupsCache !== 'undefined') ? externalGroupsCache.length : 'n/a';
  const extChat = (typeof externalChatsCache !== 'undefined') ? externalChatsCache.length : 'n/a';
  const time = __notifyMsgsLastRefresh ? __notifyMsgsLastRefresh.toLocaleTimeString() : 'n/a';
  const err = __notifyMsgsLastError ? __notifyMsgsLastError : 'لا خطأ';
  const debugHtml = `<div style="margin-top:10px;padding:8px;border-top:1px dashed #64748b;font-size:11px;color:#94a3b8;direction:ltr;text-align:left;">
    DEBUG • uid:${uidOk ? 'ok' : 'MISSING'} • priv:${priv} • grp:${grp} • extGrp:${extGrp} • extChat:${extChat} • refresh:${time}<br>
    total:${__notifyMsgsLastTotal} • badgeFound:${__notifyMsgsBadgeFound} • badgeDisplay:${__notifyMsgsBadgeDisplay}<br>
    err: ${err}
  </div>`;
  box.innerHTML += debugHtml;
}

// ⚠️ كتاخد بلاصة الدالة ديال chat.js — كل نداء ليها فباقي الملفات (updateBellNotifications،
// groups.js، private-chat.js...) غايوصل لهنا مباشرة
function updateMsgsNotifications() {
  refreshMsgsBadge();
}

// فحص ذاتي دوري: نت تاي إلا شي listener فات أو طاح بخطأ صامت، هاد الفحص كيعاود
// يحسب من الكاش المحلي (privateChatsCache/ownedGroupsCache/...) لي ديما محدثة
// من onSnapshot ديال باقي الملفات، حتى ولو نسات باقي الملفات تنادي الدالة
setInterval(() => {
  try { refreshMsgsBadge(); } catch (e) { console.error('[notify-msgs] self-check failed:', e); }
}, 3000);

document.addEventListener('DOMContentLoaded', () => {
  try { refreshMsgsBadge(); } catch (e) {}
});
