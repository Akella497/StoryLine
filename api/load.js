// api/load.js
// Отдаёт сохранённые данные персонажа из GitHub репозитория

const OWNER = process.env.GITHUB_REPO_OWNER || process.env.VERCEL_GIT_REPO_OWNER || 'Akella497';
const REPO = process.env.GITHUB_REPO_NAME || process.env.VERCEL_GIT_REPO_SLUG || 'Charlist-AldrinVeil';
const FILE_PATH = process.env.GITHUB_DATA_FILE || 'data.json';

export default async function handler(req, res) {
  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        headers: {
          Accept: 'application/vnd.github+json'
          // Публичный репозиторий — токен не нужен для чтения
        }
      }
    );

    if (!getRes.ok) {
      // Файл ещё не существует — возвращаем пустой объект
      return res.json({ data: null });
    }

    const fileData = await getRes.json();
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const data = JSON.parse(content);

    res.json({ data });
  } catch (e) {
    res.json({ data: null });
  }
}
