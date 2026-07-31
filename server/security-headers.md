# Serving Entopic over a network — required security headers

**When this matters:** only if Entopic is served from a web server (a clinic
LAN, an intranet, or hosting). Opened from a local file (`file://`), HTTP
headers do not exist and none of this applies.

**Why it matters:** the app already ships a Content-Security-Policy as a
`<meta>` tag, which covers the biggest risk (restricting where data can be
sent). But four protections can **only** come from the server, and without them
a networked deployment is materially weaker than a local one:

| Header | What it stops |
|---|---|
| `Strict-Transport-Security` | A downgrade to plain HTTP, where session tokens and patient data travel in the clear |
| `X-Frame-Options: DENY` | Another site framing Entopic and tricking a clinician into clicking things (clickjacking) |
| `X-Content-Type-Options: nosniff` | The browser guessing a file is script when it is not |
| `Referrer-Policy: no-referrer` | Patient identifiers in a URL leaking to other sites via the Referer header |

`Permissions-Policy` is included to switch off device APIs Entopic never uses,
so a compromised page cannot reach the camera or microphone.

---

## nginx

```nginx
server {
    listen 443 ssl http2;
    server_name entopic.example.clinic;

    # TLS is a precondition — HSTS on plain HTTP is meaningless.
    ssl_certificate     /etc/ssl/certs/entopic.crt;
    ssl_certificate_key /etc/ssl/private/entopic.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options           "DENY"        always;
    add_header X-Content-Type-Options    "nosniff"     always;
    add_header Referrer-Policy           "no-referrer" always;
    add_header Permissions-Policy        "camera=(), microphone=(), geolocation=(), payment=()" always;

    # Must MATCH the <meta> CSP in index.html. If you add an LLM proxy on
    # another host, add it to connect-src in BOTH places or requests will fail.
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com; object-src 'none'; base-uri 'self'; form-action 'self'" always;

    root /var/www/entopic;
    index index.html;
}
```

> **Note on `add_header`:** in nginx, an `add_header` in a `location` block
> replaces *all* inherited headers rather than adding to them. If you add any
> `location` block with its own `add_header`, repeat these lines inside it.

---

## Caddy

```
entopic.example.clinic {
    root * /var/www/entopic
    file_server
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options           "DENY"
        X-Content-Type-Options    "nosniff"
        Referrer-Policy           "no-referrer"
        Permissions-Policy        "camera=(), microphone=(), geolocation=(), payment=()"
    }
}
```

---

## Netlify / static hosts (`_headers` file at the site root)

```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

---

## Verifying it worked

```
curl -sI https://entopic.example.clinic | grep -iE 'strict-transport|x-frame|nosniff|referrer|content-security'
```

All five should appear. If `Strict-Transport-Security` is missing, check TLS is
actually terminating here and not at a proxy in front that strips headers.

---

## What these headers do NOT do

They protect the *transport and the browser context*. They do nothing about a
stolen device, a shared passphrase, or a clinician leaving a terminal unlocked —
those are the record vault, clinic mode and the idle lock. Headers are one layer,
not the layer.
