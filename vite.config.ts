import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev-only code exchange. The client secret stays in this process (`.env`,
 * never `VITE_`). The browser posts the authorization code; we trade it with
 * Google. Production static hosts do not run this — they use the ID-token
 * button or Supabase's stored secret.
 */
function googleExchangePlugin(env: Record<string, string>): Plugin {
  return {
    name: 'craftcv-google-exchange',
    configureServer(server) {
      server.middlewares.use('/api/google/exchange', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        const secret = env.GOOGLE_CLIENT_SECRET || '';
        const clientId = env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || '';
        if (!secret || !clientId) {
          res.statusCode = 501;
          res.end(JSON.stringify({ error: 'Google client secret is not configured on the server' }));
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        let body: { code?: string; redirectUri?: string } = {};
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { /* empty */ }
        if (!body.code) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'missing code' }));
          return;
        }
        const params = new URLSearchParams({
          code: body.code,
          client_id: clientId,
          client_secret: secret,
          redirect_uri: body.redirectUri || 'postmessage',
          grant_type: 'authorization_code',
        });
        try {
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params,
          });
          const text = await tokenRes.text();
          res.statusCode = tokenRes.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(text);
        } catch (err) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'token exchange failed' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  plugins: [react(), googleExchangePlugin(env)],
  // relative base: lets the built site run from any folder/subdomain
  // (Netlify, Vercel, GitHub Pages) without extra configuration
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  };
});
