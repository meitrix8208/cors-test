const CORS_HEADERS = [
  "access-control-allow-methods",
  "access-control-allow-headers",
  "access-control-allow-origin",
  "access-control-max-age",
  "access-control-allow-credentials",
] as const;

const VALID_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "HEAD",
  "OPTIONS",
] as const;
type HttpMethod = (typeof VALID_METHODS)[number];

interface TestResult {
  headers: Record<string, string>;
  status: number;
  ok: boolean;
  error?: string;
}

function encodeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function fetchHeaders(
  url: string,
  method: string,
  origin: string,
): Promise<TestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: { Origin: origin },
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return { headers, status: response.status, ok: true };
  } catch (err) {
    return {
      headers: {},
      status: 0,
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function renderHeadersTable(headers: Record<string, string>): string {
  if (Object.keys(headers).length === 0) return "";

  return Object.entries(headers)
    .map(([key, value]) => {
      const isCors = CORS_HEADERS.includes(
        key as (typeof CORS_HEADERS)[number],
      );
      return `<tr class="${isCors ? "cors-row" : ""}">
        <td class="header-key">${encodeHTML(key)}</td>
        <td class="header-val">${encodeHTML(value)}</td>
      </tr>`;
    })
    .join("\n");
}

function renderCorsStatus(
  headers: Record<string, string>,
  origin: string,
): string {
  const allowOrigin = headers["access-control-allow-origin"];

  if (!allowOrigin) {
    return `
      <div class="status-box status-error">
        <span class="status-icon">✗</span>
        <div>
          <strong>CORS NOT CONFIGURED</strong>
          <p>Missing <code>access-control-allow-origin</code> header. Cross-origin requests will be blocked by browsers.</p>
        </div>
      </div>
      <div class="fix-box">
        <p class="fix-title">// how to fix</p>
        <p>Add the following header to your server response:</p>
        <pre>Access-Control-Allow-Origin: *</pre>
        <p>Or for specific origins:</p>
        <pre>Access-Control-Allow-Origin: ${encodeHTML(origin)}</pre>
      </div>`;
  }

  if (allowOrigin === "*") {
    return `
      <div class="status-box status-success">
        <span class="status-icon">✓</span>
        <div>
          <strong>CORS CONFIGURED — WILDCARD</strong>
          <p>All origins allowed. This URL will work with any cross-origin request.</p>
        </div>
      </div>`;
  }

  const originMatches =
    allowOrigin === origin || allowOrigin === new URL(origin).origin;
  return `
    <div class="status-box ${originMatches ? "status-warning" : "status-error"}">
      <span class="status-icon">${originMatches ? "~" : "✗"}</span>
      <div>
        <strong>CORS CONFIGURED — RESTRICTED</strong>
        <p>Only allows: <code>${encodeHTML(allowOrigin)}</code></p>
        ${!originMatches ? `<p class="mt-2">⚠ Tested origin <code>${encodeHTML(origin)}</code> does not match.</p>` : ""}
      </div>
    </div>`;
}

function renderResults(
  result: TestResult | null,
  url: string,
  origin: string,
): string {
  if (!result) {
    return `
    <div class="info-section">
      <h2>// what is cors?</h2>
      <p>
        <strong>Cross-Origin Resource Sharing</strong> is a browser security mechanism that controls
        how resources are shared between different origins (domains, protocols, ports).
        When a script on <code>example.com</code> tries to fetch <code>api.other.com</code>,
        the browser checks for CORS headers before allowing it.
      </p>
      <h2>// how this works</h2>
      <p>
        This tool makes a real HTTP request to your URL with an <code>Origin</code> header
        and inspects the response headers. CORS headers are highlighted in the output.
      </p>
      <h2>// which method?</h2>
      <p>
        Use <code>GET</code> for static assets (scripts, fonts, images).
        Use <code>OPTIONS</code> to test preflight requests for API calls.
        Use the specific method matching your actual request for other cases.
      </p>
    </div>`;
  }

  if (result.error) {
    return `
    <div class="status-box status-error">
      <span class="status-icon">!</span>
      <div>
        <strong>REQUEST FAILED</strong>
        <p>${encodeHTML(result.error)}</p>
      </div>
    </div>`;
  }

  return `
    <div class="results-section">
      <h2>// cors status</h2>
      ${renderCorsStatus(result.headers, origin)}

      <h2 class="mt-6">// response headers <span class="badge">HTTP ${result.status}</span></h2>
      <div class="table-wrap">
        <table class="headers-table">
          <thead>
            <tr>
              <th>header</th>
              <th>value</th>
            </tr>
          </thead>
          <tbody>
            ${renderHeadersTable(result.headers)}
          </tbody>
        </table>
      </div>
      ${
        Object.keys(result.headers).some((k) => CORS_HEADERS.includes(k as any))
          ? '<p class="legend"><span class="cors-highlight-sample"></span> CORS-related headers highlighted</p>'
          : '<p class="legend muted">No CORS headers found in response.</p>'
      }
    </div>`;
}

function renderPage(
  url: string,
  origin: string,
  method: string,
  result: TestResult | null,
  requestUrl: string,
): string {
  const shareUrl = url ? requestUrl : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CORS Tester — Inspect Cross-Origin Headers</title>
  <meta name="description" content="Test any URL for CORS headers. Inspect, debug and fix cross-origin resource sharing issues.">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="CORS Tester">
  <meta property="og:description" content="Test any URL for CORS headers. Fast, free, open source.">
  <meta property="twitter:card" content="summary">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%221em%22 font-size=%2280%22>🌐</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #0a0b0e;
      --surface:  #111318;
      --border:   #1e2128;
      --border2:  #2a2f3a;
      --text:     #d4d8e2;
      --muted:    #5a6070;
      --accent:   #00e5ff;
      --accent2:  #7b61ff;
      --success:  #00e096;
      --warning:  #ffbe3d;
      --error:    #ff4f6a;
      --code-bg:  #0d0f14;
      --font-mono: 'JetBrains Mono', monospace;
      --font-head: 'Syne', sans-serif;
    }

    html { font-size: 16px; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 0.875rem;
      line-height: 1.7;
      min-height: 100vh;
    }

    /* ── Layout ── */
    .app {
      max-width: 820px;
      margin: 0 auto;
      padding: 2rem 1.5rem 4rem;
    }

    /* ── Header ── */
    header {
      border-bottom: 1px solid var(--border2);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    .logo {
      font-family: var(--font-head);
      font-size: 1.75rem;
      font-weight: 800;
      color: #fff;
      text-decoration: none;
      letter-spacing: -0.03em;
    }
    .logo span { color: var(--accent); }
    .tagline {
      color: var(--muted);
      font-size: 0.75rem;
      margin-top: 0.25rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    /* ── Form ── */
    .form-card {
      background: var(--surface);
      border: 1px solid var(--border2);
      border-radius: 6px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .form-grid .full { grid-column: 1 / -1; }

    label {
      display: block;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 0.4rem;
    }
    input, select {
      width: 100%;
      background: var(--code-bg);
      border: 1px solid var(--border2);
      border-radius: 4px;
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      padding: 0.55rem 0.75rem;
      transition: border-color 0.15s, box-shadow 0.15s;
      outline: none;
      appearance: none;
    }
    input:focus, select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 15%, transparent);
    }
    input::placeholder { color: var(--muted); }

    select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1em' height='1em' viewBox='0 0 24 24'%3E%3C!-- Icon from Material Symbols by Google --%3E%3Cpath fill='%23ffffff' d='m12 16l4-4l-1.4-1.4l-1.6 1.6V8h-2v4.2l-1.6-1.6L8 12zm0 6q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      padding-right: 2rem;
      cursor: pointer;
    }

    .hint { font-size: 0.7rem; color: var(--muted); margin-top: 0.35rem; }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--accent);
      color: #000;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 0.6rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;
    }
    .btn:hover { background: color-mix(in srgb, var(--accent) 85%, #fff); }
    .btn:active { transform: scale(0.98); }

    .form-footer {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border);
    }

    /* ── Results ── */
    h2 {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 1rem;
    }
    .mt-2 { margin-top: 0.5rem; }
    .mt-6 { margin-top: 1.75rem; }

    .badge {
      display: inline-block;
      background: var(--border2);
      color: var(--text);
      font-size: 0.65rem;
      padding: 0.15rem 0.45rem;
      border-radius: 3px;
      vertical-align: middle;
      margin-left: 0.4rem;
    }

    /* Status boxes */
    .status-box {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      padding: 1rem 1.25rem;
      border-radius: 5px;
      border-left: 3px solid;
      margin-bottom: 1rem;
    }
    .status-success { background: color-mix(in srgb, var(--success) 8%, transparent); border-color: var(--success); }
    .status-warning  { background: color-mix(in srgb, var(--warning) 8%, transparent);  border-color: var(--warning); }
    .status-error   { background: color-mix(in srgb, var(--error) 8%, transparent);   border-color: var(--error); }

    .status-icon {
      font-size: 1.2rem;
      font-weight: 700;
      line-height: 1;
      flex-shrink: 0;
      padding-top: 0.1rem;
    }
    .status-success .status-icon { color: var(--success); }
    .status-warning  .status-icon { color: var(--warning); }
    .status-error   .status-icon { color: var(--error); }

    .status-box strong { display: block; color: #fff; font-size: 0.8rem; letter-spacing: 0.06em; margin-bottom: 0.25rem; }
    .status-box p { font-size: 0.8rem; color: var(--text); }
    .status-box code {
      background: rgba(255,255,255,0.07);
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
      font-size: 0.75rem;
    }

    /* Fix box */
    .fix-box {
      background: var(--code-bg);
      border: 1px solid var(--border2);
      border-radius: 5px;
      padding: 1rem 1.25rem;
      margin-top: 0.75rem;
    }
    .fix-title { color: var(--accent2); font-size: 0.72rem; letter-spacing: 0.06em; margin-bottom: 0.5rem; }
    .fix-box p { font-size: 0.8rem; margin-bottom: 0.5rem; }
    .fix-box pre {
      background: rgba(0,0,0,0.4);
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 0.6rem 0.75rem;
      font-size: 0.78rem;
      color: var(--accent);
      overflow-x: auto;
      margin-bottom: 0.5rem;
    }

    /* Headers table */
    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--border2);
      border-radius: 5px;
    }
    .headers-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
    }
    .headers-table th {
      background: var(--code-bg);
      color: var(--muted);
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 0.5rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border2);
    }
    .headers-table td {
      padding: 0.45rem 0.75rem;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    .headers-table tr:last-child td { border-bottom: none; }
    .headers-table tr:hover td { background: rgba(255,255,255,0.02); }
    .header-key { color: var(--muted); white-space: nowrap; padding-right: 1rem; }
    .header-val { color: var(--text); word-break: break-word; }

    .cors-row td { background: color-mix(in srgb, var(--accent) 5%, transparent) !important; }
    .cors-row .header-key { color: var(--accent); font-weight: 500; }
    .cors-row .header-val { color: #fff; }

    .legend {
      font-size: 0.7rem;
      color: var(--muted);
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .cors-highlight-sample {
      display: inline-block;
      width: 12px;
      height: 12px;
      background: color-mix(in srgb, var(--accent) 25%, transparent);
      border: 1px solid var(--accent);
      border-radius: 2px;
    }
    .legend.muted { color: var(--error); }

    /* Info section */
    .info-section h2 { margin-top: 1.5rem; }
    .info-section h2:first-child { margin-top: 0; }
    .info-section p { font-size: 0.82rem; color: var(--text); margin-bottom: 1rem; }
    .info-section code {
      background: var(--code-bg);
      border: 1px solid var(--border2);
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
      color: var(--accent);
      font-size: 0.78rem;
    }

    /* Footer */
    footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
      font-size: 0.72rem;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    footer a { color: var(--accent2); text-decoration: none; }
    footer a:hover { text-decoration: underline; }

    /* Animations */
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .form-card, .results-section, .info-section {
      animation: fade-in 0.25s ease;
    }

    /* Mobile */
    @media (max-width: 580px) {
      .form-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
<div class="app">

  <header>
    <a href="/" class="logo">CORS<span>.</span>TEST</a>
    <p class="tagline">Inspect Cross-Origin Resource Sharing headers</p>
  </header>

  <div class="form-card">
    <form method="GET" action="/">
      <div class="form-grid">
        <div class="full">
          <label for="url">Target URL</label>
          <input
            id="url"
            name="url"
            type="url"
            required
            value="${encodeHTML(url)}"
            placeholder="https://api.example.com/endpoint"
            autofocus
          />
        </div>
        <div>
          <label for="origin">Origin</label>
          <input
            id="origin"
            name="origin"
            type="url"
            required
            value="${encodeHTML(origin)}"
            placeholder="https://your-site.com"
          />
          <p class="hint">Should match your AllowedOrigins if not using wildcard</p>
        </div>
        <div>
          <label for="method">HTTP Method</label>
          <select id="method" name="method" aria-label="HTTP method">
            ${VALID_METHODS.map((m) => `<option value="${m}"${m === method ? " selected" : ""}>${m}</option>`).join("")}
          </select>
          <p class="hint">Use OPTIONS to test preflight requests</p>
        </div>
      </div>
      <div class="form-footer">
        <button class="btn" type="submit">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M6 3v3l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          RUN TEST
        </button>
        ${shareUrl ? `<button class="btn" type="button" onclick="navigator.clipboard.writeText('${encodeHTML(shareUrl)}').then(() => { this.textContent = '✓ Copied!'; setTimeout(() => this.textContent = '↗ Copy link', 2000) })">↗ Copy link</button>` : ""}
        </div>
    </form>
  </div>

  ${renderResults(result, url, origin)}

  <footer>
    <span>Built with ♥ on Cloudflare Workers</span>
    <span>
      <a href="https://github.com/meitrix8208/cors-test" target="_blank">GitHub</a>
      · <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS" target="_blank">MDN CORS docs</a>
    </span>
  </footer>

</div>
</body>
</html>`;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const { searchParams, href } = new URL(request.url);

    const url = searchParams.get("url") ?? "";
    const origin = searchParams.get("origin") ?? "https://cors.infraforge.cc";
    const method = (searchParams.get("method") ?? "GET").toUpperCase();

    if (url !== "" && !isValidUrl(url)) {
      return new Response("Invalid URL", { status: 400 });
    }
    if (!isValidUrl(origin)) {
      return new Response("Invalid origin", { status: 400 });
    }
    if (!VALID_METHODS.includes(method as HttpMethod)) {
      return new Response("Invalid HTTP method", { status: 400 });
    }

    const result = url !== "" ? await fetchHeaders(url, method, origin) : null;

    const body = renderPage(url, origin, method, result, href);

    return new Response(body, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Content-Security-Policy": "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; img-src 'self' data:",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store",
      },
    });
  },
};
