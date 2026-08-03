// api/auth/user.js
// Возвращает данные текущего авторизованного пользователя

const OWNER = process.env.GITHUB_REPO_OWNER || process.env.VERCEL_GIT_REPO_OWNER || 'Akella497';

function normalizeLogin(login) {
  return String(login || '').trim().toLowerCase();
}

function getAllowedEditors() {
  const editorsFromEnv = (process.env.ALLOWED_EDITORS || '')
    .split(',')
    .map(v => normalizeLogin(v))
    .filter(Boolean);

  return new Set([normalizeLogin(OWNER), ...editorsFromEnv]);
}

export default function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie || '');
  const login  = cookies.gh_login;
  const avatar = cookies.gh_avatar;

  if (!login) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const allowedEditors = getAllowedEditors();

  res.json({
    login,
    avatar_url: decodeURIComponent(avatar || ''),
    can_edit: allowedEditors.has(normalizeLogin(login)),
    is_owner: normalizeLogin(login) === normalizeLogin(OWNER)
  });
}

function parseCookies(cookieStr) {
  return Object.fromEntries(
    cookieStr.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
}
