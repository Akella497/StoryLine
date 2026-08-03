// api/auth/login.js
// Перенаправляет пользователя на GitHub для авторизации

function getConfiguredRedirectUri() {
  const callbackUrl = String(process.env.GITHUB_OAUTH_CALLBACK_URL || '').trim();
  return callbackUrl || null;
}

function buildState(req) {
  const referer = req.headers.referer || '/';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'example.local';
  const proto = req.headers['x-forwarded-proto'] || 'https';

  // Разрешаем только относительный путь на текущем хосте.
  let returnTo = '/';
  try {
    const base = `${proto}://${host}`;
    const url = new URL(referer, base);
    returnTo = `${url.pathname}${url.search}${url.hash}`;
  } catch {
    returnTo = '/';
  }

  return Buffer.from(JSON.stringify({ returnTo }), 'utf-8').toString('base64url');
}

export default function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const scope = 'read:user repo';
  const state = buildState(req);
  const redirectUri = getConfiguredRedirectUri();

  const params = new URLSearchParams({
    client_id: clientId,
    scope,
    state
  });

  // Передаём redirect_uri только если он явно задан и совпадает с OAuth App settings.
  // Иначе GitHub использует Callback URL, заданный в самом OAuth App.
  if (redirectUri) {
    params.set('redirect_uri', redirectUri);
  }

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}
