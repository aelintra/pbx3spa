# How SPA apps are stored and served in production

You’re used to PHP: upload files to a server, the server runs PHP on each request. With an SPA, you’re not “running” anything in production — you’re **storing and serving static files**. This doc explains what gets deployed, where it can live, and the actual mechanism to publish and manage it.

---

## 1. What you’re actually deploying

After `npm run build`, you get a folder (often `dist/` or `build/`) containing:

- **index.html** — the one HTML shell
- **One or more JS files** — e.g. `assets/index-abc123.js` (the “bundled” app)
- **One or more CSS files** — e.g. `assets/index-def456.css`
- Sometimes **other assets** — images, fonts, etc.

These are **plain files**. No PHP, no Node, no runtime. The server’s job is only to **send these files** when a browser asks for them (and to send **index.html** for “any path” so client-side routing works — see SPA_BASICS.md).

So “deploy” = **put these files somewhere that can serve them over HTTP/HTTPS**.

---

## 2. Where the files can live (three main patterns)

### A. A normal web server (VPS or dedicated server)

- You have a **server** (e.g. DigitalOcean droplet, Linode, a box in your rack).
- You install **Nginx** (or Apache) and point the “document root” at a directory, e.g. `/var/www/pbx3-admin`.
- You **copy** the contents of `dist/` into that directory (e.g. via SFTP, rsync, or a deploy script).
- The server **serves** those files: request for `/` or `/tenants` → Nginx serves `index.html`; request for `/assets/index-abc123.js` → Nginx serves that file.

**Publish:** Build on your machine (or on CI), then upload: e.g. `rsync -avz dist/ user@server:/var/www/pbx3-admin/`.

**Manage:** You manage the server (OS, Nginx config, SSL cert, backups). No “platform” — it’s your box.

---

### B. Object storage + CDN (e.g. S3 + CloudFront)

- **Object storage** (e.g. **AWS S3**, GCP Cloud Storage, Azure Blob) is like a big file store. You create a “bucket,” and you upload your built files into it. The bucket is **not** a web server by itself — it’s just storage.
- A **CDN** (e.g. **AWS CloudFront**, Cloudflare, Fastly) sits in front. Users hit the CDN URL; the CDN is configured with an **origin** (your S3 bucket, or your server). The CDN fetches files from the origin and caches them at “edge” locations, then serves them to users. So:
  - **S3** = where the files are stored.
  - **CloudFront** = what the user actually talks to; it serves from cache or from S3.

**Publish:** Build locally (or in CI), then upload to S3, e.g.:

```bash
aws s3 sync dist/ s3://my-pbx3-admin-bucket --delete
```

Optionally invalidate CloudFront cache so the new files are used immediately (or rely on new filenames like `index-abc123.js` so cache busting is automatic).

**Manage:** You manage the S3 bucket (permissions, versioning if you want) and the CloudFront distribution (origin, HTTPS cert, custom domain). No server to SSH into — just AWS (or similar) config.

**Why people mention CloudFront:** It’s the standard way on AWS to serve static sites from S3 with HTTPS, custom domains, and global caching. “CloudFront” = the CDN; “S3” = the storage. Together they replace “a server with Nginx.”

---

### C. A “hosting platform” (Netlify, Vercel, Cloudflare Pages, etc.)

- You **don’t** manage a server or S3 yourself. You connect your **Git repo** (e.g. GitHub) to the platform.
- You tell the platform: “Build command: `npm run build`”, “Publish directory: `dist`” (or whatever your build outputs).
- When you **push to main** (or another branch), the platform **runs the build on their infrastructure** and then **stores and serves** the result. They handle storage, CDN, HTTPS, and “serve index.html for all paths” for you.

**Publish:** Push to Git. The platform builds and deploys. (Or you upload a pre-built folder via their UI/drag-and-drop.)

**Manage:** You manage the **project** in their UI: which repo, which branch, build command, env vars, custom domain. No server, no S3/CloudFront config unless you want to use your own.

---

## 3. Summary: what “publish” and “manage” mean in practice

| Pattern              | Where files live        | How you publish                    | What you manage                    |
|----------------------|-------------------------|------------------------------------|------------------------------------|
| **Web server (VPS)** | Directory on server      | Build → rsync/scp/SFTP to server    | Server, Nginx, SSL, backups        |
| **S3 + CloudFront**  | S3 bucket; CDN serves   | Build → `aws s3 sync` (and maybe invalidate) | Bucket, distribution, DNS, certs  |
| **Netlify / Vercel** | Their storage + CDN     | Push to Git (or upload build)      | Project config, repo, domain       |

So when you see “CloudFront,” the **mechanism** is: files live in S3 (or another origin); CloudFront is the public face that serves them; “publish” = upload new files to the origin (e.g. S3); “manage” = configure bucket + distribution + domain.

---

## 4. Recommended path if you’re new to this

- **Easiest:** Use **Netlify** or **Vercel**. Connect your GitHub repo, set build command and output directory. Push to main → they build and deploy. Free tier is enough for an admin app. You don’t need to learn S3 or CloudFront first.
- **If you already have a server:** Use **Nginx** and rsync (or a small script) to copy `dist/` after build. “Publish” = run the script; “manage” = normal server admin.
- **If you want to learn AWS (or are already there):** Use **S3** for the files and **CloudFront** as the origin. Publish = `npm run build` then `aws s3 sync dist/ s3://bucket --delete` (and optionally invalidate CloudFront). Manage = bucket + distribution in AWS console or IaC.

---

## 5. A few details that often trip people up

**“Serve index.html for every path”**  
For an SPA, the same `index.html` must be sent for `/`, `/tenants`, `/extensions/1000`, etc., so the JS can load and the client-side router can show the right view.  
- **Nginx:** `try_files $uri $uri/ /index.html;`  
- **S3 + CloudFront:** Configure S3 to serve `index.html` for 404s (or use CloudFront “custom error response” to return 200 with index.html for 403/404).  
- **Netlify/Vercel:** They usually do this by default for SPAs.

**HTTPS**  
- **Server:** Use Let’s Encrypt (e.g. certbot) or your host’s SSL.  
- **CloudFront:** Attach a certificate (ACM) to the distribution; point your domain to CloudFront.  
- **Netlify/Vercel:** They provide HTTPS by default when you add a custom domain.

**Environment / config**  
- The API base URL (or “which instance”) might be set at **build time** (env vars in the build) or at **runtime** (user types it in the app, or you read it from a config endpoint). For a multi-instance admin app, runtime config (user enters URL or picks from a list) is common, so you don’t need different “builds” per instance.

---

## 6. One concrete “publish” flow (example: Netlify)

1. Code lives in GitHub (e.g. `pbx3spa`).
2. In Netlify: “Add new site” → “Import from Git” → choose repo.
3. Build command: `npm run build`. Publish directory: `dist` (or whatever Vue/Vite outputs).
4. Deploy. Netlify runs `npm install` and `npm run build`, then serves the contents of `dist/`.
5. **Ongoing:** You push to `main` → Netlify automatically rebuilds and deploys. That’s “publish and manage” — push code, they handle the rest.

For **S3 + CloudFront**, the equivalent would be: push to main → **CI** (e.g. GitHub Actions) runs `npm run build` and `aws s3 sync dist/ s3://bucket --delete` (and optionally invalidates CloudFront). So “publish” is still “push to Git”; the difference is **who** runs the build and **where** the files go (Netlify’s infra vs your S3 bucket).

---

This should be enough to understand the **mechanism**: static files, where they live (server vs S3 vs platform), and how you publish (upload or push) and manage (server config vs bucket/distribution vs project settings). For the PBX3 admin app, starting with **Netlify or Vercel** is the least friction; you can move to S3 + CloudFront later if you want more control or are standardising on AWS.
