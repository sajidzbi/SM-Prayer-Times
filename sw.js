/* SM Prayer Times — Service Worker (real file, offline-first)
   -----------------------------------------------------------
   یہ فائل index.html کے بالکل اسی فولڈر میں ہونی چاہیے۔
   حکمتِ عملی: Cache-first — اگر ریسورس cache میں موجود ہے تو فوراً
   وہیں سے دیا جائے (انٹرنیٹ کی بالکل ضرورت نہیں)۔ اگر cache میں
   نہیں تو network سے لے کر cache میں محفوظ کر لیا جائے۔ اگر network
   بھی ناکام ہو (آف لائن) اور یہ navigation request ہو تو محفوظ شدہ
   index.html واپس دے دی جائے — یوں کبھی بھی "Network unavailable"
   جیسا پیغام یا خالی صفحہ نظر نہیں آئے گا۔
*/

const VER = 'sm-prayer-real-v1';
const OFFLINE_URLS = ['./', './index.html'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(VER).then(function (c) {
      return Promise.allSettled(
        OFFLINE_URLS.map(function (u) {
          return c.add(u).catch(function () {});
        })
      );
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return k !== VER;
            })
            .map(function (k) {
              return caches.delete(k);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
      .then(function () {
        return self.clients.matchAll({ type: 'window' }).then(function (cs) {
          cs.forEach(function (c) {
            c.postMessage({ type: 'APP_UPDATED', version: VER });
          });
        });
      })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  const isNavigation = e.request.mode === 'navigate';

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;

      return fetch(e.request)
        .then(function (res) {
          if (res && res.ok && res.type !== 'opaque') {
            const clone = res.clone();
            caches.open(VER).then(function (c) {
              c.put(e.request, clone);
            });
          }
          return res;
        })
        .catch(function () {
          // آف لائن اور کچھ بھی دستیاب نہیں — کم از کم مرکزی صفحہ دکھائیں
          if (isNavigation) return caches.match('./index.html');
          return caches.match('./');
        });
    })
  );
});
