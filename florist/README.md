# دفتر الورد — Florist Orders PWA

A mobile-first, Arabic (RTL) web app for managing flower **corners (كورنر ورد)** and **deliveries (دزات)**.
Plain HTML/CSS/JS — no build step, no server, no accounts. All data lives on the phone (IndexedDB).

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole UI |
| `styles.css` | Blush / sage / off-white theme |
| `app.js` | Calendar, orders, photos, search, backup |
| `sw.js` | Offline support (service worker) |
| `manifest.webmanifest` + `icons/` | Makes it installable on the home screen |

## Deploy for free (pick one)

### Option A — Netlify Drop (easiest, ~1 minute, no Git needed)
1. Go to **https://app.netlify.com/drop** and sign up / log in (free).
2. Drag the whole **`florist`** folder onto the page.
3. Netlify gives you a link like `https://random-name-123.netlify.app`.
4. Optional: **Site configuration → Change site name** to something nicer, e.g. `ward-orders` → `https://ward-orders.netlify.app`.
5. Send her the link.

To update later: open the site in Netlify → **Deploys** → drag the folder again.

### Option B — Vercel (from this GitHub repo)
1. Go to **https://vercel.com/new** and import the `candela` repository.
2. Set **Root Directory** to `florist`, **Framework Preset** to **Other**. Leave build command empty.
3. Click **Deploy** → you get `https://<name>.vercel.app`.

Every push to the repo redeploys automatically.

> After changing any file, bump `VERSION` in `sw.js` (e.g. `'v1'` → `'v2'`) so installed copies pick up the update.

## Installing on her phone

**iPhone (Safari):** open the link → tap the **Share** button → **Add to Home Screen** → **Add**.
**Android (Chrome):** open the link → menu ⋮ → **Install app** / **Add to Home screen** (or use “تثبيت التطبيق” in the app’s ⋯ menu).

## Important notes about the data

- Data is stored **only on that phone, in that browser**. It is not synced anywhere.
- On iPhone, the home-screen app keeps its **own** storage, separate from Safari. Install it first, then always open it from the icon.
- Use **⋯ → تصدير نسخة احتياطية** regularly (weekly is good) and keep the file in Files / iCloud / WhatsApp. That file restores everything, including photos, via **استيراد نسخة احتياطية** — also the way to move to a new phone.
- Photos are resized to max 1200px (JPEG) so storage stays small.

## Run locally

```bash
cd florist
python3 -m http.server 8080
# open http://localhost:8080
```
