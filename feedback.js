/* Story Sparks feedback widget - standalone, no dependencies.
   Submissions go to a private Supabase table (insert-only for visitors;
   only the site owner can read them). */
(function () {
  "use strict";
  var SB_URL = "https://hqulstolcnmxmtdmxoat.supabase.co";
  var SB_KEY = "sb_publishable_MpA-5Ns-9-SYGzp7aCNNnQ_p-54PIt1";
  var MIN_INTERVAL_MS = 60000;
  var MAX_LEN = 1000;

  var css = [
    "#ssfb-btn{position:fixed;right:18px;bottom:18px;z-index:99999;",
    "background:#e6b84f;color:#14213d;border:none;border-radius:999px;",
    "padding:12px 20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;",
    "font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);}",
    "#ssfb-btn:hover{background:#f2c765}",
    "#ssfb-overlay{position:fixed;inset:0;z-index:100000;background:rgba(10,15,30,.6);",
    "display:flex;align-items:center;justify-content:center;padding:16px;}",
    "#ssfb-card{background:#fdf8ec;color:#1c2440;border-radius:14px;max-width:430px;width:100%;",
    "padding:22px 22px 18px;font-family:Georgia,'Times New Roman',serif;",
    "box-shadow:0 12px 40px rgba(0,0,0,.45);position:relative;}",
    "#ssfb-card h2{margin:0 0 4px;font-size:20px;color:#14213d;}",
    "#ssfb-card p.sub{margin:0 0 12px;font-size:13px;color:#5a6280;line-height:1.4;}",
    "#ssfb-card textarea,#ssfb-card input.ssfb-in{width:100%;box-sizing:border-box;",
    "border:1px solid #cbbd93;border-radius:8px;padding:10px;font-size:14px;",
    "font-family:inherit;background:#fffdf6;color:#1c2440;margin-bottom:10px;resize:vertical;}",
    "#ssfb-card textarea{min-height:110px;}",
    "#ssfb-row{display:flex;justify-content:space-between;align-items:center;gap:10px;}",
    "#ssfb-count{font-size:12px;color:#8a8266;}",
    "#ssfb-send{background:#e6b84f;color:#14213d;border:none;border-radius:8px;",
    "padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;}",
    "#ssfb-send:disabled{opacity:.55;cursor:default;}",
    "#ssfb-close{position:absolute;top:10px;right:12px;background:none;border:none;",
    "font-size:18px;cursor:pointer;color:#8a8266;}",
    "#ssfb-hp{position:absolute;left:-9999px;top:-9999px;}"
  ].join("");

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var btn = document.createElement("button");
    btn.id = "ssfb-btn";
    btn.type = "button";
    btn.textContent = "✦ Send feedback";
    document.body.appendChild(btn);

    var overlay = null;

    function close() {
      if (overlay) { overlay.remove(); overlay = null; }
    }

    function open() {
      if (overlay) return;
      overlay = document.createElement("div");
      overlay.id = "ssfb-overlay";
      overlay.innerHTML =
        '<div id="ssfb-card" role="dialog" aria-label="Send feedback">' +
        '<button id="ssfb-close" type="button" aria-label="Close">✕</button>' +
        '<h2>Send feedback</h2>' +
        '<p class="sub">Story Sparks is brand new. Tell us what works, what is confusing, or what you would love to see. Your message goes privately to the site owner.</p>' +
        '<textarea id="ssfb-msg" maxlength="' + MAX_LEN + '" placeholder="Your feedback..."></textarea>' +
        '<input class="ssfb-in" id="ssfb-contact" type="text" maxlength="120" placeholder="Name or contact (optional)">' +
        '<input id="ssfb-hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<div id="ssfb-row"><span id="ssfb-count">0 / ' + MAX_LEN + '</span>' +
        '<button id="ssfb-send" type="button">Send</button></div>' +
        '</div>';
      document.body.appendChild(overlay);

      var msg = overlay.querySelector("#ssfb-msg");
      var contact = overlay.querySelector("#ssfb-contact");
      var hp = overlay.querySelector("#ssfb-hp");
      var send = overlay.querySelector("#ssfb-send");
      var count = overlay.querySelector("#ssfb-count");

      overlay.querySelector("#ssfb-close").addEventListener("click", close);
      overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
      document.addEventListener("keydown", function esc(e) {
        if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
      });
      msg.addEventListener("input", function () {
        count.textContent = msg.value.length + " / " + MAX_LEN;
      });
      msg.focus();

      send.addEventListener("click", function () {
        var text = msg.value.trim();
        if (hp.value) { close(); return; } // honeypot: pretend success, drop it
        if (!text) { msg.focus(); return; }
        var last = 0;
        try { last = parseInt(localStorage.getItem("ssfb_last") || "0", 10) || 0; } catch (e) {}
        var wait = MIN_INTERVAL_MS - (Date.now() - last);
        if (wait > 0) {
          count.textContent = "Please wait " + Math.ceil(wait / 1000) + "s before sending again.";
          return;
        }
        send.disabled = true;
        send.textContent = "Sending...";
        fetch(SB_URL + "/rest/v1/feedback", {
          method: "POST",
          headers: {
            "apikey": SB_KEY,
            "Authorization": "Bearer " + SB_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({
            message: text.slice(0, MAX_LEN),
            contact: contact.value.trim().slice(0, 120) || null,
            page: (location.pathname + location.hash).slice(0, 200)
          })
        }).then(function (r) {
          if (!r.ok) throw new Error("bad status");
          try { localStorage.setItem("ssfb_last", String(Date.now())); } catch (e) {}
          overlay.querySelector("#ssfb-card").innerHTML =
            '<button id="ssfb-close" type="button" aria-label="Close">✕</button>' +
            '<h2>Thank you!</h2>' +
            '<p class="sub">Your feedback was sent privately to the Story Sparks team.</p>';
          overlay.querySelector("#ssfb-close").addEventListener("click", close);
          setTimeout(close, 3500);
        }).catch(function () {
          send.disabled = false;
          send.textContent = "Send";
          count.textContent = "Could not send. Check your connection and try again.";
        });
      });
    }

    btn.addEventListener("click", open);
  });
})();
