const TOKEN_KEY = 'token'
const USERNAME_KEY = 'username'

/**
 * Reads the `exp` claim without pulling in a JWT library. This is only used to
 * avoid showing a logged-in screen with a dead token — the server still
 * verifies the signature on every request.
 */
function readPayload(token) {
  try {
    const [, payload] = token.split('.')
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUsername() {
  return localStorage.getItem(USERNAME_KEY) || ''
}

export function saveSession({ token, username }) {
  localStorage.setItem(TOKEN_KEY, token)
  if (username) localStorage.setItem(USERNAME_KEY, username)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
}

export function isTokenExpired(token) {
  const payload = readPayload(token)
  if (!payload?.exp) return true
  return payload.exp * 1000 <= Date.now()
}

/** True only when there is a token and it has not expired yet. */
export function hasValidSession() {
  const token = getToken()
  return Boolean(token) && !isTokenExpired(token)
}
