/**
 * After POST auth/login — either Bearer ready or needs TOTP challenge.
 * @param {object} res
 * @returns {{ kind: 'token', accessToken: string } | { kind: '2fa', challengeId: string } | { kind: 'error', message: string }}
 */
export function parseLoginResponse(res) {
  if (res?.requires_2fa && res?.challenge_id) {
    return { kind: '2fa', challengeId: String(res.challenge_id) }
  }
  if (res?.accessToken) {
    return { kind: 'token', accessToken: String(res.accessToken) }
  }
  return { kind: 'error', message: 'Unexpected login response' }
}
