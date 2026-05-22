/**
 * User-facing message when login/catalog fetch fails at the network layer.
 * @param {*} err
 * @param {string} apiUrl - URL the client attempted (resolved login URL)
 */
export function loginNetworkErrorMessage(err, apiUrl) {
  const raw = String(err?.data?.message ?? err?.message ?? '')
  const isNetwork =
    err?.status === 0 ||
    /load failed|failed to fetch|networkerror|network error|timed out|timeout|abort/i.test(raw)

  if (!isNetwork) {
    return raw || 'Login failed'
  }

  const proxyTarget =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_PROXY_TARGET
      ? import.meta.env.VITE_API_PROXY_TARGET
      : ''

  const viaProxy = /localhost|127\.0\.0\.1/i.test(apiUrl)
  const healthBase = (apiUrl || '').replace(/\/api\/?$/i, '') || apiUrl || 'https://your-node:44300'

  let msg = `Cannot reach the PBX API (${apiUrl || 'unknown'}). `
  if (viaProxy && proxyTarget) {
    msg += `Dev proxy targets ${proxyTarget}. Restart \`npm run dev\` after changing .env. `
  }
  msg +=
    'Check: (1) API/nginx on that host is up, (2) EC2 security group allows inbound TCP 44300 from your IP, '
  msg +=
    `(3) from Mac: \`curl -k -m 8 -o /dev/null -w "%{http_code}" ${healthBase}/up\`. `
  msg +=
    'If the node is SSH-only, tunnel: `ssh -L 44300:127.0.0.1:44300 ubuntu@<host>` then set `VITE_API_PROXY_TARGET=https://127.0.0.1:44300` and use `http://localhost:5173/api` at login.'

  return msg
}
