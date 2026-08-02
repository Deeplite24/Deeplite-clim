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

function refreshMsgsBadge() {
  const badge = document.getElementById('msgs-badge');
  let total = 0;

  try { if (typeof computeGroupChatUnread === 'function') total += computeGroupChatUnread(); }
  catch (e) { console.error('[notify-msgs] group unread failed:', e); }

  try { if (typeof computeTotalPrivateUnread === 'function') total += computeTotalPrivateUnread(); }
  catch (e) { console.error('[notify-msgs] private unread failed:', e); }

  try { if (typeof computeTotalExternalUnread === 'function') total += computeTotalExternalUnread(); }
  catch (e) { console.error('[notify-msgs] external unread failed:', e); }

  try { if (typeof computeExternalIncomingInvites === 'function') total += computeExternalIncomingInvites().length; }
  catch (e) { console.error('[notify-msgs] external invites failed:', e); }

  try { if (typeof computeNewGroupJoinNotifs === 'function') total += computeNewGroupJoinNotifs().length; }
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

// فحص ذاتي دوري: نت تاي إلا شي listener فات أو طاح بخطأ صامت، هاد الفحص كيعاود
// يحسب من الكاش المحلي (privateChatsCache/ownedGroupsCache/...) لي ديما محدثة
// من onSnapshot ديال باقي الملفات، حتى ولو نسات باقي الملفات تنادي الدالة
setInterval(() => {
  try { refreshMsgsBadge(); } catch (e) { console.error('[notify-msgs] self-check failed:', e); }
}, 3000);

document.addEventListener('DOMContentLoaded', () => {
  try { refreshMsgsBadge(); } catch (e) {}
});
