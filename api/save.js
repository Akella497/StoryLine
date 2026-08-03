// api/save.js
// Сохраняет данные персонажа (JSON) в GitHub репозиторий

const OWNER = process.env.GITHUB_REPO_OWNER || process.env.VERCEL_GIT_REPO_OWNER || 'Akella497';
const REPO = process.env.GITHUB_REPO_NAME || process.env.VERCEL_GIT_REPO_SLUG || 'Charlist-AldrinVeil';
const FILE_PATH = process.env.GITHUB_DATA_FILE || 'data.json';

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

async function getJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString('utf-8').trim();
  return rawBody ? JSON.parse(rawBody) : {};
}

function getCommitToken(cookies) {
  // Предпочтительно использовать сервисный токен, чтобы редакторам не требовался прямой write-доступ к репозиторию.
  // Если переменная не задана, используем пользовательский OAuth токен (старое поведение).
  return process.env.GITHUB_REPO_TOKEN || cookies.gh_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const cookies = parseCookies(req.headers.cookie || '');
  const login = cookies.gh_login;
  const token = getCommitToken(cookies);

  if (!login || !token) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const allowedEditors = getAllowedEditors();
  if (!allowedEditors.has(normalizeLogin(login))) {
    return res.status(403).json({ error: 'Нет доступа' });
  }

  const payload = await getJsonBody(req);
  const { data } = payload || {};
  if (!data) return res.status(400).json({ error: 'Нет данных' });

  const content = JSON.stringify(data, null, 2);

  try {
    // Получаем текущий SHA файла
    let sha = null;
    const getRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    );
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }

    // Коммитим JSON
    const encoded = Buffer.from(content, 'utf-8').toString('base64');
    const body = {
      message: `✦ Обновление данных [${new Date().toLocaleString('ru')}]`,
      content: encoded,
      ...(sha ? { sha } : {})
    };

    const putRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!putRes.ok) {
      const err = await putRes.json();
      return res.status(500).json({ error: err.message });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function parseCookies(str) {
  return Object.fromEntries(
    str.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
}
