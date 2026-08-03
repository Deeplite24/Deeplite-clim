const firebaseConfig = {
      apiKey: "AIzaSyA2hKP_SOEA3pnNs1g3CVDXUWdDQzkap0E",
      authDomain: "deeplite-514a2.firebaseapp.com",
      projectId: "deeplite-514a2",
      storageBucket: "deeplite-514a2.firebasestorage.app",
      messagingSenderId: "665734874626",
      appId: "1:665734874626:web:34c006c8a1bde6f7d3491b"
    };

    if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    const auth = firebase.auth();
    const db = firebase.firestore();

    // ⚠️ التخزين المؤقت المحلي (offline persistence) تعطل: كان كيسبب بيانات قديمة عالقة
    // ملي كيتبدل الحساب فنفس الجهاز بلا reload (switchToAccount) — الكاش كان مشترك بين
    // الحسابات، وهادشي كان السبب الحقيقي ديال إشعارات الرسائل الخاصة اللي كانت كتبقى
    // خاصرة (0) رغم أن الكتابة فـFirestore كانت ناجحة فعلا.
    // db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    //   if (err.code === 'failed-precondition') {
    //     console.warn('Offline persistence: تبويب آخر مفتوح، التفعيل غير ممكن فهاد التبويب.');
    //   } else if (err.code === 'unimplemented') {
    //     console.warn('Offline persistence: المتصفح ماعندوش الدعم اللازم.');
    //   }
    // });
