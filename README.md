# EUD-6171 — Consent or Pay (PUR) E2E test pages

Manual, browser-driven E2E harness for the **Consent or Pay (PUR)** TCF wall
(parent: EUD-5866). Automated coverage lives in
`packages/test/cmp/cypress/e2e/tcf/consentOrPayTCF.cy.ts`.

## Pages

| Path | Purpose | Wall expected? |
|---|---|---|
| `index.html` | Publisher home — shows the PUR Wall | ✅ yes |
| `article/index.html` | Second content path (`/article`) — Wall on a non-excluded page | ✅ yes |
| `login.html` | Target of the Wall **Login** link; mock login → `/subscribed` | ❌ (exclude `/login`) |
| `subscribe-return.html` | Optional Stripe "after payment" redirect target → `/subscribed` | n/a |
| `subscribed/index.html` | Post-subscription / logged-in area (`/subscribed`, excluded) | ❌ no |

Each page injects the Usercentrics loader via `cmp-test-kit.js` and renders a
checks toolbar. The loader URL + `settingsId` are overridable on the home page
(persisted in `localStorage`).

## 1. Admin UI configuration (sandbox)

Configure a **TCF** settings (v2.2 or v3) in the sandbox Admin UI and copy its `settingsId`:

- **Legal Specifications → Consent or Pay = ON**
- **Content → Consent or Pay**:
  - *Reject & Subscribe link* = your **Stripe Payment Link** (test mode, see §2)
  - *Login link* = `/login.html`
  - PUR texts: opt-in title, pricing, subscriber login message, etc.
- **Excluded pages**: `/subscribed` and `/login` (so those pages are reachable). Max 10 URLs.
- **Service Settings → Publisher Restrictions**: mark some purposes **Mandatory**
  (required for consent); leave others Flexible.
- Optionally set *Show Vendor Toggles = false* to verify vendor toggles hide in the second layer.

Paste the loader URL (`https://web.cmp.usercentrics-sandbox.eu/ui/loader.js`) and the
`settingsId` into the loader panel on `index.html`, keep `data-sandbox` ticked, Apply & reload.

## 2. Stripe test payment (Payment Links)

No backend needed — use **Stripe Payment Links in Test mode**:

1. Stripe Dashboard → toggle **Test mode**.
2. Create a Product (e.g. "Subscription 2,49€/mo") and a **Payment Link**.
3. Payment Link → **After payment**: either *Redirect* to `subscribe-return.html`'s
   public URL, or *Show confirmation page* (then continue manually).
4. Put the Payment Link URL into *Reject & Subscribe link* in the Admin UI.
5. Pay with test card **`4242 4242 4242 4242`**, any future expiry, any CVC/ZIP.

**localhost caveat:** Stripe redirects require a public URL. For redirect-back either
deploy these pages, tunnel with `ngrok http 5500`, or use the confirmation page +
manual "continue" link on `subscribe-return.html`.

## 3. Run locally

```bash
npx http-server qa/EUD-6171/test-pages -p 5500
# open http://localhost:5500/
```

Serving over HTTP (not `file://`) is required so path-based `excludedPages`
matching works (`/subscribed`, `/login`, `/article`).

## 4. Scenario matrix (EUD-5866 acceptance criteria)

| AC | Scenario | Page | Pass condition |
|---|---|---|---|
| 1.1 | PUR mode active → Wall renders | `index.html` | Wall with Subscribe + Accept cards |
| 1.2 | Deny All / first-layer toggles disabled | `index.html` | No Deny All / toggles on the Wall |
| 2.1 | Reject & Subscribe → Stripe | `index.html` | Click → Stripe test checkout |
| 2.1 | Login → login page | `index.html` | Click Login → `/login.html` |
| 2.2 | Excluded pages suppress the Wall | `subscribed/` | No Wall after pay/login |
| 4.1 | Decline mandatory in L2 → back to Wall | `index.html` | Reject/Save in L2 returns to Wall |
| 4.2 | Accept All → TCF signal + close | `index.html` | CMP closes, TC string written |
| 2.4 | `showVendorToggles=false` hides vendor toggles | `index.html` (L2) | Vendor toggles hidden, categories remain |
| 4.3 | Language change updates PUR texts | `index.html` | All Wall texts localize |

Use the toolbar buttons (**Wall rendered?**, **Reject/Login links**, **Excluded page?**,
**showSecondLayer()**) and the **Log** panel to record results.
