chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TRIGGER_CAPTCHA') {
    console.log('[doomscroll] triggered from', sender.tab?.url);
    sendResponse({ ok: true });
  }
  return true;
});

console.log('[doomscroll] service worker started');