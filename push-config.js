/* دفتر — إعدادات الإشعارات (Web Push)
   الملف ده بيتقري من التطبيق ومن الـ service worker.
   سيبهم فاضيين لحد ما ترفع سيرفر الإشعارات (شوف push/README.md)،
   وبعدين حط رابط السيرفر والمفتاح العام (VAPID public key) هنا
   وغيّر رقم VERSION في sw.js عشان الأجهزة تاخد التحديث. */
self.DAFTAR_PUSH = {
  server: '',          // مثال: 'https://daftar-push.YOUR-NAME.workers.dev'
  vapidPublicKey: '',  // المفتاح العام اللي طلع من push/generate-vapid-keys.mjs
};
