import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

const SECTIONS = [
  { key: "objectives", title: "Вопросы дознания" },
  { key: "dossier", title: "Досье по делу" },
  { key: "witnesses", title: "Очевидцы происшествия" },
  { key: "evidence", title: "Улики с места преступления" },
];

export default function Home() {
  const { data: session, status } = useSession();
  const [content, setContent] = useState(null);
  const [editing, setEditing] = useState({});
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState({});
  const [message, setMessage] = useState({});

  const isOwner = !!session?.isOwner;

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then(setContent);
  }, []);

  function startEdit(key) {
    setDrafts((d) => ({ ...d, [key]: JSON.stringify(content[key], null, 2) }));
    setEditing((e) => ({ ...e, [key]: true }));
    setMessage((m) => ({ ...m, [key]: null }));
  }

  function cancelEdit(key) {
    setEditing((e) => ({ ...e, [key]: false }));
  }

  async function save(key) {
    let parsed;
    try {
      parsed = JSON.parse(drafts[key]);
    } catch (e) {
      setMessage((m) => ({ ...m, [key]: "Ошибка в JSON: " + e.message }));
      return;
    }
    setSaving((s) => ({ ...s, [key]: true }));
    setMessage((m) => ({ ...m, [key]: null }));
    try {
      const resp = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: key, data: parsed }),
      });
      const body = await resp.json();
      if (resp.ok) {
        setContent((c) => ({ ...c, [key]: parsed }));
        setEditing((e) => ({ ...e, [key]: false }));
        setMessage((m) => ({
          ...m,
          [key]: "Сохранено и закоммичено. Изменения появятся на сайте после автопередеплоя Vercel (обычно до минуты).",
        }));
      } else {
        setMessage((m) => ({ ...m, [key]: "Ошибка: " + (body.error || "неизвестная") }));
      }
    } catch (e) {
      setMessage((m) => ({ ...m, [key]: "Ошибка сети: " + String(e) }));
    }
    setSaving((s) => ({ ...s, [key]: false }));
  }

  if (!content) {
    return <div className="loading">Загрузка архива Кирин-Тора…</div>;
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">Глаза Медива · Бюро дознания</div>
        <div className="auth">
          {status === "loading" && "…"}
          {status !== "loading" && !session && (
            <button onClick={() => signIn("github")}>Войти через GitHub</button>
          )}
          {session && (
            <>
              <span>
                {session.user?.name || session.login}{" "}
                {isOwner ? "(права редактора)" : "(без прав редактирования)"}
              </span>
              <button onClick={() => signOut()}>Выйти</button>
            </>
          )}
        </div>
      </header>

      {SECTIONS.map(({ key, title }) => (
        <section className="block" key={key}>
          <div className="block-head">
            <h2>{title}</h2>
            {isOwner && !editing[key] && (
              <button onClick={() => startEdit(key)}>Редактировать</button>
            )}
          </div>

          {!editing[key] && <SectionView sectionKey={key} data={content[key]} />}

          {editing[key] && (
            <div className="editor">
              <p className="hint">
                Правишь как JSON-массив объектов. Чтобы <b>добавить</b> пункт — скопируй существующий объект
                внутри массива (вместе с фигурными скобками), вставь как новый элемент через запятую и поменяй
                значения (не забудь уникальный <code>id</code>). Чтобы <b>удалить</b> — сотри объект целиком
                вместе с окружающими фигурными скобками и лишней запятой.
              </p>
              <textarea
                value={drafts[key]}
                onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                rows={16}
              />
              <div className="editor-actions">
                <button onClick={() => save(key)} disabled={saving[key]}>
                  {saving[key] ? "Сохранение…" : "Сохранить и закоммитить"}
                </button>
                <button onClick={() => cancelEdit(key)}>Отмена</button>
              </div>
            </div>
          )}

          {message[key] && <p className="msg">{message[key]}</p>}
        </section>
      ))}
    </div>
  );
}

function SectionView({ sectionKey, data }) {
  if (sectionKey === "objectives") {
    return (
      <div className="obj-grid">
        {data.map((o) => (
          <div className="obj-card" key={o.id} data-n={o.n}>
            <p>{o.text}</p>
          </div>
        ))}
      </div>
    );
  }
  if (sectionKey === "dossier") {
    return (
      <div className="dossier-grid">
        {data.map((p) => (
          <div className="dcard" key={p.id}>
            <h3>{p.name}</h3>
            <span className="role">{p.role}</span>
            <p>{p.text}</p>
          </div>
        ))}
      </div>
    );
  }
  if (sectionKey === "witnesses") {
    return (
      <div className="witness-list">
        {data.map((w) => (
          <div className="witem" key={w.id}>
            <h4>{w.title}</h4>
            <div className="who">{w.who}</div>
            <p>{w.text}</p>
          </div>
        ))}
      </div>
    );
  }
  if (sectionKey === "evidence") {
    return (
      <div className="evi-grid">
        {data.map((e) => (
          <div className="evi-card" key={e.id}>
            <h4>{e.title}</h4>
            <ul>
              {e.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
