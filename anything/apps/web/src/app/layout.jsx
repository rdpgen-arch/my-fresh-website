"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Task 2A: GTM container ID injected via env variable.
// Set NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX in your environment.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;0,14..32,900&display=swap"
          rel="stylesheet"
        />

        {/* GTM */}
        {GTM_ID && (
          <>
            <script>{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());`}</script>
            <script
              async
              src={`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`}
            />
          </>
        )}

        <style>{`
          /* ═══════════════════════════════════════════════════════
             ACCENT COLOR — Change --accent to repaint everything
             ═══════════════════════════════════════════════════════ */
          :root {
            /* Primary accent — replace this single value to rebrand */
            --accent:          #5B21B6;
            --accent-hover:    #4C1D95;
            --accent-fg:       #ffffff;
            --accent-muted:    #EDE9FE;
            --accent-muted-fg: #5B21B6;

            /* ── Brand palette ─────────────────────────────── */
            --c-primary:       #0f172a;
            --c-primary-hover: #1e293b;
            --c-primary-fg:    #ffffff;
            --c-accent:        var(--accent);
            --c-accent-hover:  var(--accent-hover);
            --c-accent-fg:     var(--accent-fg);
            --c-success:       #16a34a;
            --c-warning:       #d97706;
            --c-danger:        #dc2626;

            /* ── Neutral surface ───────────────────────────── */
            --c-bg:            #ffffff;
            --c-surface:       #f9fafb;
            --c-surface-2:     #f3f4f6;
            --c-border:        #e5e7eb;
            --c-border-subtle: #f3f4f6;

            /* ── Text ──────────────────────────────────────── */
            --c-text:          #111827;
            --c-text-2:        #374151;
            --c-text-muted:    #6b7280;
            --c-text-faint:    #9ca3af;

            /* ── Typography ────────────────────────────────── */
            --font-heading: 'Inter', system-ui, sans-serif;
            --font-body:    'Inter', system-ui, sans-serif;
            --font-mono:    'JetBrains Mono', 'Fira Code', ui-monospace, monospace;

            /* ── Radius ────────────────────────────────────── */
            --radius-sm:   4px;
            --radius-base: 8px;
            --radius-lg:   12px;
            --radius-xl:   16px;
            --radius-2xl:  20px;
            --radius-full: 9999px;

            /* ── Shadows ───────────────────────────────────── */
            --shadow-xs:  0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-sm:  0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.05);
            --shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04);
            --shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.04);
            --shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.06), 0 8px 10px -6px rgb(0 0 0 / 0.03);

            /* ── Transitions ───────────────────────────────── */
            --t-fast:   100ms ease;
            --t-base:   150ms ease;
            --t-slow:   250ms ease;
          }

          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            font-family: var(--font-body);
            font-size: 14px;
            line-height: 1.6;
            background: var(--c-bg);
            color: var(--c-text);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }

          h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-heading);
            font-weight: 700;
            letter-spacing: -0.025em;
            line-height: 1.2;
            color: var(--c-text);
          }

          a { color: inherit; }

          /* Smooth scrollbar */
          ::-webkit-scrollbar { width: 5px; height: 5px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: var(--c-border); border-radius: 99px; }
          ::-webkit-scrollbar-thumb:hover { background: var(--c-text-muted); }

          input, textarea, select, button { font-family: inherit; font-size: inherit; }
          button { cursor: pointer; }

          /* Global utility classes */
          .card {
            background: var(--c-bg);
            border: 1px solid var(--c-border);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-xs);
          }
          .btn-accent {
            background: var(--accent);
            color: var(--accent-fg);
            border: none;
            border-radius: var(--radius-base);
            font-weight: 600;
            transition: background var(--t-base), transform var(--t-fast);
          }
          .btn-accent:hover { background: var(--accent-hover); transform: translateY(-1px); }
          .btn-accent:active { transform: translateY(0); }

          /* Skeleton shimmer */
          @keyframes shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position:  200% 0; }
          }
          .skeleton {
            background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 50%, #f3f4f6 75%);
            background-size: 200% 100%;
            animation: shimmer 1.4s infinite;
            border-radius: var(--radius-base);
          }

          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
          @keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

          .animate-fade-in { animation: fadeIn 0.25s ease-out both; }
          .animate-spin { animation: spin 0.75s linear infinite; }
          .animate-pulse { animation: pulse 1.8s ease-in-out infinite; }
        `}</style>
      </head>
      <body>
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
