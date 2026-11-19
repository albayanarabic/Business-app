# BizTrack Nigeria 🇳🇬

> **"Your Business. Your Records. Your Growth."**

**BizTrack Nigeria** is a Progressive Web App (PWA) designed for small and medium-sized Nigerian retail shops, traders, and wholesalers. It provides digital bookkeeping, stock management, profit tracking, and WhatsApp debt reminders.

---

## 📱 Mobile & PWA Features

- **Google Chrome "Add to Home Screen" Ready:** Fully compliant with PWA criteria (Web App Manifest, standalone display, maskable icons, and service worker).
- **Offline & Low Connectivity Support:** Core app shell, icons, and styles are cached using a service worker.
- **Mobile-First Android Navigation:** Touch-friendly bottom navigation bar, quick action floaters, and responsive forms designed for Android devices.
- **Direct WhatsApp Reminders:** Generates polite, culturally authentic Nigerian business payment reminders via standard WhatsApp web/app links (`https://wa.me/`).
- **Naira Formatting:** Authentic Nigerian Naira (`₦`) currency formatting throughout.
- **BizTrack AI (local mode):** Ask deterministic questions about records saved in this browser and prepare inventory, sales, expense, and repayment actions for confirmation. No AI provider, sign-in, or cross-device sync is configured; the assistant does not send business records to an AI service.

---

## 🚀 Deployment Instructions for Vercel

The project includes a ready-to-use `vercel.json` configured for Single Page Applications (SPA), client-side routing, and PWA service worker headers.

### Option A: Deploy via GitHub (Recommended)

1. Push this repository to your GitHub account:
   ```bash
   git remote add origin https://github.com/<your-username>/biztrack-nigeria.git
   git push -u origin main
   ```
2. Log in to [Vercel](https://vercel.com).
3. Click **"Add New"** > **"Project"**.
4. Import your `biztrack-nigeria` repository.
5. In the **Build and Output Settings**:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
6. Click **Deploy**. Vercel will provide an HTTPS URL (e.g. `https://biztrack-nigeria.vercel.app`).
   *(Note: HTTPS is required for Chrome PWA installation).*

### Option B: Deploy via Vercel CLI

1. Install the Vercel CLI globally (if not already installed):
   ```bash
   npm install -g vercel
   ```
2. Run the deployment command from the project root:
   ```bash
   vercel
   ```
3. Follow the prompts (accept default settings). For production, run:
   ```bash
   vercel --prod
   ```

---

## 🔑 Environment Variables

For this prototype, **no required environment variables are needed** to deploy and run the full application. 

All database operations (products, sales, debts, repayments, expenses, and business profile) are handled by the browser's persistent storage engine with preloaded Nigerian market sample data.

If you connect an optional backend service (such as Supabase) in a future development phase:
| Variable Name | Required | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Optional | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Optional | Your Supabase anon public API key |

---

## 📲 How to Install on Android (Google Chrome)

1. Open your deployed Vercel URL in **Google Chrome** on your Android phone.
2. An **"Install BizTrack App"** banner will appear automatically at the top of the app.
3. Tap **"Install"**, or tap the Chrome menu (⋮) in the top right and select **"Install app"** or **"Add to Home screen"**.
4. BizTrack will appear on your home screen with its app icon and open in full-screen standalone mode without browser URL bars.

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run focused BizTrack AI parsing checks
npm run test:assistant

# Run automated business flow verification test
node test-business-flow.js

# Build production bundle
npm run build
```
