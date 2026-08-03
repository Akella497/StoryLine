// api/auth/logout.js
// Удаляет cookie и разлогинивает

export default function handler(req, res) {
  res.setHeader('Set-Cookie', [
    'gh_token=; Path=/; HttpOnly; Max-Age=0',
    'gh_login=; Path=/; Max-Age=0',
    'gh_avatar=; Path=/; Max-Age=0'
  ]);
  res.redirect('/');
}
