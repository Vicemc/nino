import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = import.meta.env.VITE_API_URL || '';

const STATUS_TABS = [
  { value: 'WATCHING', label: 'Assistindo' },
  { value: 'PAUSED', label: 'Pausados' },
  { value: 'COMPLETED', label: 'Completos' },
  { value: 'DROPPED', label: 'Droppados' }
];

const STATUS_LABELS = Object.fromEntries(STATUS_TABS.map(tab => [tab.value, tab.label]));

const WEEK_DAYS = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
  'Irregular / Sem dia fixo'
];

const SEASONS = ['Inverno', 'Primavera', 'Verão', 'Outono'];
const YEARS = Array.from({ length: 15 }, (_, index) => String(2026 + index));

const EMPTY_FORM = {
  title: '',
  cover_image: '',
  progress: 0,
  total_episodes: '',
  airing_day: '',
  note: '',
  status: 'WATCHING',
  queue: 'Outros',
  order_index: 0,
  info_url: '',
  watch_url: ''
};

const EMPTY_QUEUE_FORM = {
  name: '',
  season: '',
  year: '',
  order_index: 0
};

async function api(path, options = {}) {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function toForm(anime, queues) {
  const defaultQueue = queues.find(queue => queue.name === 'Outros')?.name || queues[0]?.name || 'Outros';
  if (!anime) return { ...EMPTY_FORM, queue: defaultQueue };
  return {
    title: anime.title || '',
    cover_image: anime.cover_image || '',
    progress: anime.progress ?? 0,
    total_episodes: anime.total_episodes ?? '',
    airing_day: anime.airing_day || '',
    note: anime.note || '',
    status: anime.status || 'WATCHING',
    queue: anime.queue || defaultQueue,
    order_index: anime.order_index ?? 0,
    info_url: anime.info_url || '',
    watch_url: anime.watch_url || ''
  };
}

function getNextEpisodeNumber(item) {
  return (Number(item.progress) || 0) + 1;
}

function getWatchUrl(item) {
  if (item.watch_url) return item.watch_url;
  const query = encodeURIComponent(`${item.title} episode ${getNextEpisodeNumber(item)}`);
  return `https://www.google.com/search?q=${query}`;
}

function openUrl(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function normalizeAnimePayload(form) {
  return {
    ...form,
    progress: Number(form.progress) || 0,
    total_episodes: form.total_episodes === '' ? null : Number(form.total_episodes),
    order_index: Number(form.order_index) || 0
  };
}

function normalizeQueuePayload(form) {
  return {
    ...form,
    name: String(form.name || '').trim(),
    season: form.season || null,
    year: form.year === '' ? null : Number(form.year),
    order_index: Number(form.order_index) || 0
  };
}

function formatQueueTrait(queue) {
  const parts = [queue.season, queue.year].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'Sem temporada';
}

function AnimeFormModal({ initialAnime, queues, onClose, onSave }) {
  const [form, setForm] = useState(() => toForm(initialAnime, queues));
  const isEditing = Boolean(initialAnime?.anilist_id);

  function update(field, value) {
    setForm(current => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    await onSave(normalizeAnimePayload(form), initialAnime?.anilist_id);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal anime-form" onClick={event => event.stopPropagation()} onSubmit={submit}>
        <div>
          <h2>{isEditing ? 'Editar anime' : 'Registrar anime'}</h2>
          <p className="muted">Tudo fica salvo localmente no SQLite. Nenhuma API externa é chamada.</p>
        </div>

        <label>
          Nome
          <input value={form.title} onChange={event => update('title', event.target.value)} required placeholder="Ex.: Naruto" />
        </label>

        <label>
          Imagem
          <input value={form.cover_image} onChange={event => update('cover_image', event.target.value)} placeholder="https://..." />
        </label>

        <div className="form-grid-2">
          <label>
            Episódios vistos
            <input type="number" min="0" value={form.progress} onChange={event => update('progress', event.target.value)} />
          </label>
          <label>
            Total de episódios
            <input type="number" min="0" value={form.total_episodes} onChange={event => update('total_episodes', event.target.value)} placeholder="?" />
          </label>
        </div>

        <div className="form-grid-2">
          <label>
            Dia que sai
            <select value={form.airing_day} onChange={event => update('airing_day', event.target.value)}>
              <option value="">Não definido</option>
              {WEEK_DAYS.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
          </label>

          <label>
            Estado
            <select value={form.status} onChange={event => update('status', event.target.value)}>
              {STATUS_TABS.map(tab => <option key={tab.value} value={tab.value}>{tab.label}</option>)}
            </select>
          </label>
        </div>

        <div className="form-grid-2">
          <label>
            Fila
            <select value={form.queue} onChange={event => update('queue', event.target.value)}>
              {queues.map(queue => <option key={queue.name} value={queue.name}>{queue.name}</option>)}
            </select>
          </label>
          <label>
            Índice
            <input type="number" min="0" value={form.order_index} onChange={event => update('order_index', event.target.value)} />
          </label>
        </div>

        <label>
          Nota
          <input value={form.note} onChange={event => update('note', event.target.value)} placeholder="Ex.: bom, hype, continuar depois..." />
        </label>

        <label>
          Link do AniList / Informações
          <input value={form.info_url} onChange={event => update('info_url', event.target.value)} placeholder="https://anilist.co/anime/..." />
        </label>

        <label>
          Link para assistir
          <input value={form.watch_url} onChange={event => update('watch_url', event.target.value)} placeholder="Crunchyroll, Netflix, Prime, etc." />
        </label>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancelar</button>
          <button className="button" type="submit">Salvar</button>
        </div>
      </form>
    </div>
  );
}

function QueueManagerModal({ queues, onClose, onCreate, onUpdate, onDelete }) {
  const [newQueue, setNewQueue] = useState({ ...EMPTY_QUEUE_FORM, order_index: queues.length });
  const [drafts, setDrafts] = useState(() => Object.fromEntries(queues.map(queue => [queue.name, { ...queue }])));

  function updateDraft(originalName, field, value) {
    setDrafts(current => ({
      ...current,
      [originalName]: {
        ...current[originalName],
        [field]: value
      }
    }));
  }

  async function submitNewQueue(event) {
    event.preventDefault();
    await onCreate(normalizeQueuePayload(newQueue));
    setNewQueue({ ...EMPTY_QUEUE_FORM, order_index: queues.length + 1 });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal queue-manager" onClick={event => event.stopPropagation()}>
        <div>
          <h2>Gerenciar filas</h2>
          <p className="muted">Renomear uma fila também move os animes antigos para o novo nome.</p>
        </div>

        <div className="queue-editor-list">
          {queues.map(queue => {
            const draft = drafts[queue.name] || queue;
            return (
              <form
                key={queue.name}
                className="queue-editor-row"
                onSubmit={event => {
                  event.preventDefault();
                  onUpdate(queue.name, normalizeQueuePayload(draft));
                }}
              >
                <label>
                  Nome
                  <input value={draft.name || ''} onChange={event => updateDraft(queue.name, 'name', event.target.value)} required />
                </label>

                <label>
                  Temporada
                  <select value={draft.season || ''} onChange={event => updateDraft(queue.name, 'season', event.target.value)}>
                    <option value="">Sem temporada</option>
                    {SEASONS.map(season => <option key={season} value={season}>{season}</option>)}
                  </select>
                </label>

                <label>
                  Ano
                  <select value={draft.year || ''} onChange={event => updateDraft(queue.name, 'year', event.target.value)}>
                    <option value="">Sem ano</option>
                    {YEARS.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </label>

                <label>
                  Ordem
                  <input type="number" value={draft.order_index ?? 0} onChange={event => updateDraft(queue.name, 'order_index', event.target.value)} />
                </label>

                <div className="queue-editor-actions">
                  <button className="button compact-button" type="submit">Salvar</button>
                  <button className="button danger compact-button" type="button" onClick={() => onDelete(queue.name)}>Excluir</button>
                </div>
              </form>
            );
          })}
        </div>

        <form className="new-queue-form" onSubmit={submitNewQueue}>
          <h3>Adicionar fila</h3>
          <div className="form-grid-4">
            <label>
              Nome
              <input value={newQueue.name} onChange={event => setNewQueue(current => ({ ...current, name: event.target.value }))} required placeholder="Ex.: Sábado" />
            </label>
            <label>
              Temporada
              <select value={newQueue.season} onChange={event => setNewQueue(current => ({ ...current, season: event.target.value }))}>
                <option value="">Sem temporada</option>
                {SEASONS.map(season => <option key={season} value={season}>{season}</option>)}
              </select>
            </label>
            <label>
              Ano
              <select value={newQueue.year} onChange={event => setNewQueue(current => ({ ...current, year: event.target.value }))}>
                <option value="">Sem ano</option>
                {YEARS.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <label>
              Ordem
              <input type="number" value={newQueue.order_index} onChange={event => setNewQueue(current => ({ ...current, order_index: event.target.value }))} />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Fechar</button>
            <button className="button" type="submit">Adicionar</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AnimeCard({ item, compact = false, onWatch, onEdit, onDelete, onStatusChange }) {
  const nextEpisode = getNextEpisodeNumber(item);
  const progressText = `${item.progress || 0}${item.total_episodes ? ` / ${item.total_episodes}` : ' / ?'}`;

  return (
    <article className={compact ? 'anime-card compact' : 'anime-card'}>
      {item.cover_image ? (
        <img src={item.cover_image} alt="" />
      ) : (
        <div className="cover-placeholder">Sem imagem</div>
      )}

      <div className="anime-card-body">
        <div className="anime-card-main">
          <h3>{item.title}</h3>
          <p className="progress-counter">{progressText} vistos</p>
          {item.airing_day && <p className="muted">Sai: {item.airing_day}</p>}
          {item.note && <p className="note-line">{item.note}</p>}
          {item.status === 'WATCHING' && <p className="muted">Próximo: ep. {nextEpisode}</p>}
        </div>

        <div className="anime-card-actions">
          <button className="button watch-button" type="button" onClick={() => onWatch(item)}>
            Assistir
          </button>
          <button className="button secondary small-button" type="button" onClick={() => openUrl(item.info_url)} disabled={!item.info_url}>
            Info
          </button>
          <button className="button small-button" type="button" onClick={() => onEdit(item)}>
            Editar
          </button>
          <button className="button danger small-button" type="button" onClick={() => onDelete(item)}>
            Excluir
          </button>
        </div>

        <div className="anime-card-meta">
          <span className="status-pill">{STATUS_LABELS[item.status] || item.status}</span>
          <span className="queue-pill">{item.queue}</span>
        </div>

        <select className="status-select" value={item.status} onChange={event => onStatusChange(item, event.target.value)}>
          {STATUS_TABS.map(tab => <option key={tab.value} value={tab.value}>{tab.label}</option>)}
        </select>
      </div>
    </article>
  );
}

function App() {
  const [me, setMe] = useState(null);
  const [anime, setAnime] = useState([]);
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState('Todos');
  const [activeStatus, setActiveStatus] = useState('WATCHING');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [queueManagerOpen, setQueueManagerOpen] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  async function load() {
    setError('');
    const [meData, animeData, queueData] = await Promise.all([
      api('/api/me'),
      api('/api/anime'),
      api('/api/queues')
    ]);
    setMe(meData);
    setAnime(animeData);
    setQueues(queueData);
  }

  useEffect(() => {
    load()
      .catch(err => setError(String(err.message || err)))
      .finally(() => setReady(true));
  }, []);

  const watchingByQueue = useMemo(() => {
    const map = Object.fromEntries(queues.map(queue => [queue.name, []]));
    const watching = anime.filter(item => item.status === 'WATCHING');
    for (const item of watching) {
      const queueName = map[item.queue] ? item.queue : queues[0]?.name;
      if (queueName) map[queueName].push(item);
    }
    for (const queue of Object.keys(map)) {
      map[queue].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.title.localeCompare(b.title));
    }
    return map;
  }, [anime, queues]);

  const statusItems = useMemo(() => {
    return anime
      .filter(item => item.status === activeStatus)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.title.localeCompare(b.title));
  }, [anime, activeStatus]);

  async function saveAnime(payload, id) {
    if (id) {
      await api(`/api/anime/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    } else {
      await api('/api/anime', { method: 'POST', body: JSON.stringify(payload) });
    }

    setFormOpen(false);
    setEditing(null);
    await load();
  }

  async function createQueue(payload) {
    await api('/api/queues', { method: 'POST', body: JSON.stringify(payload) });
    await load();
  }

  async function saveQueue(name, payload) {
    await api(`/api/queues/${encodeURIComponent(name)}`, { method: 'PATCH', body: JSON.stringify(payload) });
    if (selectedQueue === name && payload.name !== name) setSelectedQueue(payload.name);
    await load();
  }

  async function removeQueue(name) {
    if (!window.confirm(`Excluir a fila "${name}"? Os animes dela serão movidos para outra fila.`)) return;
    await api(`/api/queues/${encodeURIComponent(name)}`, { method: 'DELETE', body: JSON.stringify({ fallback_queue: 'Outros' }) });
    if (selectedQueue === name) setSelectedQueue('Todos');
    await load();
  }

  function openCreateForm() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEditForm(item) {
    setEditing(item);
    setFormOpen(true);
  }

  async function deleteAnime(item) {
    if (!window.confirm(`Excluir "${item.title}" do banco local?`)) return;
    await api(`/api/anime/${item.anilist_id}`, { method: 'DELETE' });
    await load();
  }

  async function changeStatus(item, status) {
    await api(`/api/anime/${item.anilist_id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
    await load();
  }

  async function watchAnime(item) {
    openUrl(getWatchUrl(item));
    const nextProgress = Number(item.progress || 0) + 1;
    await api(`/api/anime/${item.anilist_id}/watch`, {
      method: 'POST',
      body: JSON.stringify({ progress: nextProgress })
    });
    await load();
  }

  if (!ready) return <main className="page"><p>Carregando...</p></main>;

  const visibleQueues = queues.filter(queue => selectedQueue === 'Todos' || selectedQueue === queue.name);

  return (
    <main className="page">
      <img
            className="app-banner"
            src="/banner.png"
            alt="Banner da Nino"
      />
      <header className="topbar">
       
        <div>
          <h1>Nino</h1>
          <p>Sua assistente principal para ver animes~</p>
        </div>
        <div className="topbar-actions">
          <button className="button secondary" type="button" onClick={() => setQueueManagerOpen(true)}>Gerenciar filas</button>
          <button className="button" type="button" onClick={openCreateForm}>Registrar anime</button>
        </div>
      </header>

      {error && <pre className="error">{error}</pre>}

      <nav className="status-nav">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            className={activeStatus === tab.value ? 'chip active' : 'chip'}
            onClick={() => setActiveStatus(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeStatus === 'WATCHING' ? (
        <>
          <section className="filters">
            <button
              type="button"
              className={selectedQueue === 'Todos' ? 'chip active' : 'chip'}
              onClick={() => setSelectedQueue('Todos')}
            >
              Todos
            </button>
            {queues.map(queue => (
              <button
                key={queue.name}
                type="button"
                className={selectedQueue === queue.name ? 'chip active' : 'chip'}
                onClick={() => setSelectedQueue(queue.name)}
                title={formatQueueTrait(queue)}
              >
                {queue.name}
              </button>
            ))}
          </section>

          <section className="queue-grid">
            {visibleQueues.map(queue => (
              <section className="panel queue-panel" key={queue.name}>
                <div className="queue-title-row">
                  <div>
                    <h2>{queue.name}</h2>
                    <p className="queue-trait">{formatQueueTrait(queue)}</p>
                  </div>
                  <span className="muted">{watchingByQueue[queue.name]?.length || 0} anime(s)</span>
                </div>

                {!watchingByQueue[queue.name]?.length && <p className="muted">Nada aqui.</p>}

                <div className="queue-list">
                  {(watchingByQueue[queue.name] || []).map(item => (
                    <AnimeCard
                      key={item.anilist_id}
                      item={item}
                      compact
                      onWatch={watchAnime}
                      onEdit={openEditForm}
                      onDelete={deleteAnime}
                      onStatusChange={changeStatus}
                    />
                  ))}
                </div>
              </section>
            ))}
          </section>
        </>
      ) : (
        <section className="panel library-panel">
          <div className="queue-title-row">
            <h2>{STATUS_LABELS[activeStatus]}</h2>
            <span className="muted">{statusItems.length} anime(s)</span>
          </div>

          {!statusItems.length && <p className="muted">Nada aqui.</p>}

          <div className="library-grid">
            {statusItems.map(item => (
              <AnimeCard
                key={item.anilist_id}
                item={item}
                onWatch={watchAnime}
                onEdit={openEditForm}
                onDelete={deleteAnime}
                onStatusChange={changeStatus}
              />
            ))}
          </div>
        </section>
      )}

      {formOpen && (
        <AnimeFormModal
          initialAnime={editing}
          queues={queues}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSave={saveAnime}
        />
      )}

      {queueManagerOpen && (
        <QueueManagerModal
          queues={queues}
          onClose={() => setQueueManagerOpen(false)}
          onCreate={createQueue}
          onUpdate={saveQueue}
          onDelete={removeQueue}
        />
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
