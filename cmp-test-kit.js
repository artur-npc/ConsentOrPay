/* ============================================================================
 * Consent or Pay (PUR) test kit — EUD-6171
 *
 * Forked from qa/EUD-6100/test-pages/cmp-test-kit.js, specialised for the
 * Consent or Pay TCF wall. Each page sets `window.UC_TEST_CASE` BEFORE loading:
 *
 *   window.UC_TEST_CASE = {
 *     name: 'First Layer / Wall',
 *     expectWall: true,        // true = PUR wall must render; false = must NOT
 *     expectCmp: true,         // false on excluded pages where CMP must not render
 *   };
 *
 * The kit injects the Usercentrics loader itself. Loader URL, settingsId and the
 * data-sandbox flag are overridable at runtime via the loader panel (persisted
 * in localStorage). Configure the PUR attributes (rejectLink = Stripe Payment
 * Link, loginLink, excludedPages, mandatory purposes) in the Admin UI for that
 * settingsId — see README.md.
 *
 *   ucRenderLoaderPanel('#loader-panel')   -> loader override UI
 *   ucRenderToolbar('#toolbar', '#result') -> automated checks toolbar
 * ========================================================================== */
(function () {
  // Default sandbox loader. Replace DEFAULT_SETTINGS_ID with a sandbox settingsId
  // that has Consent or Pay enabled, or override it via the loader panel.
  var DEFAULT_LOADER = 'https://web.cmp.usercentrics-sandbox.eu/ui/pr/1483/loader.js';
  var DEFAULT_SETTINGS_ID = 'E76OGo2lbtUOvH';

  var LS_LOADER = 'uc-test:loaderUrl';
  var LS_SETTINGS = 'uc-test:settingsId';
  var LS_SANDBOX = 'uc-test:sandbox';

  var CASE = window.UC_TEST_CASE || { name: 'unnamed', expectWall: true, expectCmp: true };
  var resultEl = null;

  /* --- persisted loader config ------------------------------------------- */
  function lsGet(key, dflt) {
    try { var v = localStorage.getItem(key); return v === null ? dflt : v; } catch (e) { return dflt; }
  }
  function lsSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function lsDel(key) { try { localStorage.removeItem(key); } catch (e) {} }

  function getLoaderUrl() { return lsGet(LS_LOADER, DEFAULT_LOADER); }
  function getSettingsId() { return lsGet(LS_SETTINGS, DEFAULT_SETTINGS_ID); }
  function getSandbox() { return lsGet(LS_SANDBOX, '1') === '1'; }

  /* --- loader injection --------------------------------------------------- */
  function injectLoader() {
    if (document.getElementById('usercentrics-cmp')) return;
    var s = document.createElement('script');
    s.id = 'usercentrics-cmp';
    s.src = getLoaderUrl();
    s.setAttribute('data-settings-id', getSettingsId());
    if (getSandbox()) s.setAttribute('data-sandbox', '1');
    (document.body || document.head).appendChild(s);
  }

  /* --- log helpers -------------------------------------------------------- */
  function out(text, cls) { if (resultEl) { resultEl.textContent = text; resultEl.className = cls || ''; } }
  function log(msg) {
    if (!resultEl) return;
    if (resultEl.textContent === 'Waiting for CMP to load…') resultEl.textContent = '';
    resultEl.textContent += msg + '\n';
  }
  function verdict(lines) {
    var joined = lines.join('');
    out(lines.join('\n'), joined.indexOf('FAIL') > -1 ? 'fail' : joined.indexOf('WARN') > -1 ? 'warn' : 'ok');
  }

  /* --- DOM helpers -------------------------------------------------------- */
  function getCmpRoot() { return document.getElementById('usercentrics-cmp-ui'); }
  function getShadow() { var r = getCmpRoot(); return r && r.shadowRoot ? r.shadowRoot : null; }
  function q(sel) { var s = getShadow(); return s ? s.querySelector(sel) : null; }
  function isVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  // Wall elements (see partials/consentOrPayWall.mustache).
  function getSubscribeBtn() { return q('#uc-cop-subscribe-button'); }
  function getAcceptBtn() { return q('#uc-cop-accept-button'); }
  function getLoginLink() { return q('.cop-login-link'); }
  function getWall() { return q('.cop-cards') || q('#uc-cop-subscribe-button'); }

  /* --- Checks ------------------------------------------------------------- */
  function checkInit() {
    var lines = [];
    lines.push('Test case:      ' + CASE.name);
    lines.push('Loader:         ' + getLoaderUrl());
    lines.push('settingsId:     ' + getSettingsId() + '   data-sandbox: ' + (getSandbox() ? '1' : '(off)'));
    lines.push('Path:           ' + location.pathname);
    lines.push('window.UC_UI:   ' + (window.UC_UI ? 'OK exists' : 'FAIL not found'));
    lines.push('window.__ucCmp: ' + (window.__ucCmp ? 'OK exists' : 'FAIL not found'));
    lines.push('#usercentrics-cmp-ui: ' + (getCmpRoot() ? 'OK in DOM' : 'not in DOM'));
    lines.push('shadowRoot:           ' + (getShadow() ? 'OK present' : 'missing'));
    if (getSettingsId() === DEFAULT_SETTINGS_ID) {
      lines.push('');
      lines.push('WARN — settingsId is the placeholder. Set a real sandbox PUR settingsId via the loader panel.');
    }
    verdict(lines);
  }

  // Core wall check: is the Consent or Pay wall rendered as expected?
  function checkWall() {
    var shadow = getShadow();
    var lines = [];
    lines.push('Expecting wall: ' + (CASE.expectWall ? 'YES (must render)' : 'NO (must stay hidden)'));
    if (!shadow) {
      if (CASE.expectCmp === false) {
        out('PASS — CMP did not render at all (expected on an excluded page).', 'ok');
      } else {
        out('FAIL — #usercentrics-cmp-ui / shadowRoot not found. CMP did not render.', 'fail');
      }
      return;
    }
    var sub = getSubscribeBtn();
    var acc = getAcceptBtn();
    var wallShown = isVisible(getWall());
    lines.push('#uc-cop-subscribe-button: ' + (sub ? 'found' : 'NOT found'));
    lines.push('#uc-cop-accept-button:    ' + (acc ? 'found' : 'NOT found'));
    lines.push('wall visible:             ' + (wallShown ? 'yes' : 'no'));
    lines.push('');

    if (CASE.expectWall) {
      if (sub && acc && wallShown) lines.push('>>> PASS — Consent or Pay wall rendered (Reject&Subscribe + Accept).');
      else lines.push('>>> FAIL — wall not fully rendered. Check enableConsentOrPay + i18n.tcf.consentOrPay.');
    } else {
      if (sub || acc) {
        lines.push('>>> FAIL — wall is present but this page should NOT show it.');
      } else {
        lines.push('>>> PASS — wall correctly absent on this page.');
        lines.push('    NOTE: per current code, an excluded page falls back to the STANDARD');
        lines.push('    TCF banner (excludedPages suppresses only the wall, not the whole CMP).');
      }
    }
    verdict(lines);
  }

  // Verify the Reject&Subscribe / Login hrefs (Stripe Payment Link + login page).
  function checkLinks() {
    var sub = getSubscribeBtn();
    var login = getLoginLink();
    var lines = [];
    if (!sub) { out('FAIL — Reject&Subscribe button not found (wall not rendered?).', 'fail'); return; }
    var subHref = sub.getAttribute('href') || '(none)';
    var loginHref = login ? (login.getAttribute('href') || '(none)') : '(no login link)';
    lines.push('Reject & Subscribe href: ' + subHref);
    lines.push('Login link href:         ' + loginHref);
    lines.push('');
    var stripeOk = /stripe\.com|buy\.stripe/.test(subHref);
    lines.push(stripeOk ? '>>> Reject&Subscribe points at a Stripe URL — OK.'
      : '>>> WARN — Reject&Subscribe href is not a Stripe URL. Set rejectLink = Stripe Payment Link in Admin UI.');
    if (login) lines.push('Login link present — clicking it should navigate to the login page (loginLink).');
    verdict(lines);
  }

  // On excluded pages the CMP must not render the wall (subscribed users have access).
  function checkExcluded() {
    var shadow = getShadow();
    var lines = [];
    lines.push('Current path: ' + location.pathname);
    var wall = shadow ? getSubscribeBtn() : null;
    if (!shadow) {
      lines.push('CMP shadowRoot: absent');
      lines.push('>>> PASS — CMP not rendered (subscriber bypass).');
    } else if (!wall) {
      lines.push('CMP shadowRoot: present, but PUR wall: absent');
      lines.push('>>> PASS — wall suppressed on excluded page (standard banner may still show).');
    } else {
      lines.push('>>> FAIL — PUR wall is rendered on an excluded page. Check excludedPages config.');
    }
    verdict(lines);
  }

  function openLayer() {
    if (!window.__ucCmp) { out('FAIL — __ucCmp not found.', 'fail'); return; }
    window.__ucCmp.showSecondLayer();
    log('showSecondLayer() called — second layer should open. Decline a mandatory purpose and Save/Reject → wall must return.');
  }

  function clearSession() {
    if (!window.__ucCmp) { out('FAIL — __ucCmp not found.', 'fail'); return; }
    window.__ucCmp.clearUserSession()
      .then(function () { log('OK clearUserSession() — reloading…'); setTimeout(function () { location.reload(); }, 600); })
      .catch(function (e) { log('FAIL clearUserSession() — ' + e); });
  }

  /* --- Loader override panel --------------------------------------------- */
  function renderLoaderPanel(panelSel) {
    var host = document.querySelector(panelSel);
    if (!host) return;
    host.innerHTML =
      '<label>Loader URL<input type="text" id="uc-loader-url" placeholder="https://…/ui/loader.js"></label>' +
      '<label>settingsId (PUR)<input type="text" id="uc-settings-id" placeholder="settingsId"></label>' +
      '<label class="cb"><input type="checkbox" id="uc-sandbox"> add <code>data-sandbox="1"</code></label>' +
      '<div class="loader-actions">' +
      '<button id="uc-loader-apply">Apply &amp; reload</button>' +
      '<button id="uc-loader-reset">Reset to default</button></div>' +
      '<div class="loader-active" id="uc-loader-active"></div>';

    host.querySelector('#uc-loader-url').value = getLoaderUrl();
    host.querySelector('#uc-settings-id').value = getSettingsId();
    host.querySelector('#uc-sandbox').checked = getSandbox();
    host.querySelector('#uc-loader-active').textContent =
      'Active: ' + getLoaderUrl() + '  ·  settingsId=' + getSettingsId() + '  ·  data-sandbox=' + (getSandbox() ? '1' : '(off)');

    host.querySelector('#uc-loader-apply').addEventListener('click', function () {
      var url = host.querySelector('#uc-loader-url').value.trim();
      var sid = host.querySelector('#uc-settings-id').value.trim();
      if (!url || !sid) { alert('Loader URL and settingsId are required.'); return; }
      lsSet(LS_LOADER, url); lsSet(LS_SETTINGS, sid);
      lsSet(LS_SANDBOX, host.querySelector('#uc-sandbox').checked ? '1' : '0');
      location.reload();
    });
    host.querySelector('#uc-loader-reset').addEventListener('click', function () {
      lsDel(LS_LOADER); lsDel(LS_SETTINGS); lsDel(LS_SANDBOX); location.reload();
    });
  }

  /* --- Checks toolbar ----------------------------------------------------- */
  var BUTTONS = [
    ['CMP status', checkInit],
    ['Wall rendered?', checkWall],
    ['Reject/Login links', checkLinks],
    ['Excluded page?', checkExcluded],
    ['showSecondLayer()', openLayer],
    ['clearUserSession + reload', clearSession],
    ['Clear log', function () { out(''); }],
  ];

  function renderToolbar(toolbarSel, resultSel) {
    resultEl = document.querySelector(resultSel);
    var bar = document.querySelector(toolbarSel);
    BUTTONS.forEach(function (b) {
      var el = document.createElement('button');
      el.textContent = b[0];
      el.addEventListener('click', b[1]);
      bar.appendChild(el);
    });
  }

  window.addEventListener('UC_UI_INITIALIZED', function () { log('UC_UI_INITIALIZED received'); });
  window.addEventListener('UC_UI_CMP_EVENT', function (e) { log('UC_UI_CMP_EVENT: ' + JSON.stringify(e.detail)); });

  window.ucRenderLoaderPanel = renderLoaderPanel;
  window.ucRenderToolbar = renderToolbar;
  window.ucTestKit = { checkInit: checkInit, checkWall: checkWall, checkLinks: checkLinks, checkExcluded: checkExcluded };

  injectLoader();
})();
