/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

// Initialize Firebase in the service worker when config is passed or available
self.addEventListener("push", function (event) {
  let payload = {
    title: "Clinic Queue Alert",
    body: "Your queue number is coming up soon. Please prepare to enter the consultation room.",
    icon: "/logo.svg",
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = {
        title: (data.notification && data.notification.title) || data.title || payload.title,
        body: (data.notification && data.notification.body) || data.body || payload.body,
        icon: "/logo.svg",
      };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: "/logo.svg",
      vibrate: [200, 100, 200, 100, 300],
      requireInteraction: true,
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow("/");
    })
  );
});
