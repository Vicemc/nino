import Database from 'better-sqlite3';

export const db = new Database(process.env.DB_PATH || 'anime-feed.sqlite');
db.pragma('journal_mode = WAL');

export const now = () => Math.floor(Date.now() / 1000);

const DEFAULT_QUEUES = [
  { name: 'Akiofeira', season: null, year: null, order_index: 0 },
  { name: 'Emiliafeira', season: null, year: null, order_index: 1 },
  { name: 'Outros', season: null, year: null, order_index: 2 }
];

export const STATUSES = ['WATCHING', 'PAUSED', 'COMPLETED', 'DROPPED'];
export const SEASONS = ['Inverno', 'Primavera', 'Verão', 'Outono'];

function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(row => row.name === column);
}

function addColumnIfMissing(table, column, definition) {
  if (!columnExists(table, column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

db.exec(`
CREATE TABLE IF NOT EXISTS anime (
  anilist_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  cover_image TEXT,
  status TEXT NOT NULL DEFAULT 'WATCHING',
  queue TEXT NOT NULL DEFAULT 'Outros',
  progress INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  total_episodes INTEGER,
  airing_day TEXT,
  info_url TEXT,
  watch_url TEXT,
  note TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS queues (
  name TEXT PRIMARY KEY,
  season TEXT,
  year INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`);

addColumnIfMissing('anime', 'queue', "TEXT NOT NULL DEFAULT 'Outros'");
addColumnIfMissing('anime', 'progress', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('anime', 'order_index', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('anime', 'total_episodes', 'INTEGER');
addColumnIfMissing('anime', 'airing_day', 'TEXT');
addColumnIfMissing('anime', 'info_url', 'TEXT');
addColumnIfMissing('anime', 'watch_url', 'TEXT');
addColumnIfMissing('anime', 'note', 'TEXT');
addColumnIfMissing('anime', 'updated_at', `INTEGER NOT NULL DEFAULT ${now()}`);

seedDefaultQueues();
importExistingAnimeQueues();

try {
  db.prepare("UPDATE anime SET status = 'WATCHING' WHERE status = 'CURRENT'").run();
  if (columnExists('anime', 'crunchyroll_url')) {
    db.prepare("UPDATE anime SET watch_url = crunchyroll_url WHERE (watch_url IS NULL OR watch_url = '') AND crunchyroll_url IS NOT NULL AND crunchyroll_url != ''").run();
  }
  if (columnExists('anime', 'prime_url')) {
    db.prepare("UPDATE anime SET watch_url = prime_url WHERE (watch_url IS NULL OR watch_url = '') AND prime_url IS NOT NULL AND prime_url != ''").run();
  }
  if (columnExists('anime', 'netflix_url')) {
    db.prepare("UPDATE anime SET watch_url = netflix_url WHERE (watch_url IS NULL OR watch_url = '') AND netflix_url IS NOT NULL AND netflix_url != ''").run();
  }
} catch {
  // Migração compatível com bancos antigos. Se uma coluna não existir, ignora.
}

function seedDefaultQueues() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM queues').get().count;
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO queues (name, season, year, order_index, created_at, updated_at)
    VALUES (@name, @season, @year, @order_index, @created_at, @updated_at)
  `);

  const timestamp = now();
  for (const queue of DEFAULT_QUEUES) {
    insert.run({ ...queue, created_at: timestamp, updated_at: timestamp });
  }
}

function importExistingAnimeQueues() {
  const existingQueues = new Set(listQueues().map(queue => queue.name));
  const animeQueues = db.prepare(`
    SELECT DISTINCT queue FROM anime
    WHERE queue IS NOT NULL AND TRIM(queue) != ''
  `).all();

  const insert = db.prepare(`
    INSERT INTO queues (name, season, year, order_index, created_at, updated_at)
    VALUES (@name, NULL, NULL, @order_index, @created_at, @updated_at)
  `);

  let nextIndex = existingQueues.size;
  const timestamp = now();

  for (const row of animeQueues) {
    const name = String(row.queue || '').trim();
    if (!name || existingQueues.has(name)) continue;
    insert.run({ name, order_index: nextIndex++, created_at: timestamp, updated_at: timestamp });
    existingQueues.add(name);
  }
}

export function normalizeStatus(status) {
  const normalized = String(status || 'WATCHING').toUpperCase();
  return STATUSES.includes(normalized) ? normalized : 'WATCHING';
}

export function normalizeQueue(queue) {
  const name = String(queue || '').trim();
  if (!name) return getDefaultQueueName();
  const exists = db.prepare('SELECT 1 FROM queues WHERE name = ?').get(name);
  return exists ? name : getDefaultQueueName();
}

export function getDefaultQueueName() {
  const outros = db.prepare('SELECT name FROM queues WHERE name = ?').get('Outros');
  if (outros) return 'Outros';
  const first = db.prepare('SELECT name FROM queues ORDER BY order_index, name LIMIT 1').get();
  return first?.name || 'Outros';
}

export function listQueues() {
  return db.prepare(`
    SELECT * FROM queues
    ORDER BY order_index, name
  `).all();
}

export function getQueue(name) {
  return db.prepare('SELECT * FROM queues WHERE name = ?').get(String(name || '').trim());
}

export function createQueue(payload) {
  const data = sanitizeQueuePayload(payload);
  if (!data.name) throw new Error('queue_name_required');
  if (getQueue(data.name)) throw new Error('queue_already_exists');

  const timestamp = now();
  db.prepare(`
    INSERT INTO queues (name, season, year, order_index, created_at, updated_at)
    VALUES (@name, @season, @year, @order_index, @created_at, @updated_at)
  `).run({ ...data, created_at: timestamp, updated_at: timestamp });

  return getQueue(data.name);
}

export function updateQueue(name, payload) {
  const current = getQueue(name);
  if (!current) return null;

  const data = sanitizeQueuePayload({ ...current, ...payload });
  if (!data.name) throw new Error('queue_name_required');

  const duplicate = data.name !== current.name && getQueue(data.name);
  if (duplicate) throw new Error('queue_already_exists');

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE queues SET
        name = @name,
        season = @season,
        year = @year,
        order_index = @order_index,
        updated_at = @updated_at
      WHERE name = @old_name
    `).run({ ...data, old_name: current.name, updated_at: now() });

    if (data.name !== current.name) {
      db.prepare('UPDATE anime SET queue = ? WHERE queue = ?').run(data.name, current.name);
    }
  });

  transaction();
  return getQueue(data.name);
}

export function deleteQueue(name, fallbackQueueName) {
  const current = getQueue(name);
  if (!current) return false;

  const remainingQueues = listQueues().filter(queue => queue.name !== current.name);
  if (remainingQueues.length === 0) throw new Error('cannot_delete_last_queue');

  const fallback = remainingQueues.find(queue => queue.name === fallbackQueueName)?.name
    || remainingQueues.find(queue => queue.name === 'Outros')?.name
    || remainingQueues[0].name;

  const transaction = db.transaction(() => {
    db.prepare('UPDATE anime SET queue = ? WHERE queue = ?').run(fallback, current.name);
    db.prepare('DELETE FROM queues WHERE name = ?').run(current.name);
  });

  transaction();
  return true;
}

export function listAnime({ status } = {}) {
  if (status) {
    return db.prepare(`
      SELECT * FROM anime
      WHERE status = ?
      ORDER BY queue, order_index, title
    `).all(normalizeStatus(status));
  }

  return db.prepare(`
    SELECT * FROM anime
    ORDER BY status, queue, order_index, title
  `).all();
}

export function getAnime(id) {
  return db.prepare('SELECT * FROM anime WHERE anilist_id = ?').get(Number(id));
}

export function createAnime(payload) {
  const data = sanitizeAnimePayload(payload);
  const result = db.prepare(`
    INSERT INTO anime (
      title, cover_image, status, queue, progress, order_index,
      total_episodes, airing_day, info_url, watch_url, note, updated_at
    ) VALUES (
      @title, @cover_image, @status, @queue, @progress, @order_index,
      @total_episodes, @airing_day, @info_url, @watch_url, @note, @updated_at
    )
  `).run({ ...data, updated_at: now() });

  return getAnime(result.lastInsertRowid);
}

export function updateAnime(id, payload) {
  const current = getAnime(id);
  if (!current) return null;

  const data = sanitizeAnimePayload({ ...current, ...payload });
  db.prepare(`
    UPDATE anime SET
      title = @title,
      cover_image = @cover_image,
      status = @status,
      queue = @queue,
      progress = @progress,
      order_index = @order_index,
      total_episodes = @total_episodes,
      airing_day = @airing_day,
      info_url = @info_url,
      watch_url = @watch_url,
      note = @note,
      updated_at = @updated_at
    WHERE anilist_id = @id
  `).run({ ...data, id: Number(id), updated_at: now() });

  return getAnime(id);
}

export function deleteAnime(id) {
  return db.prepare('DELETE FROM anime WHERE anilist_id = ?').run(Number(id)).changes > 0;
}

export function sanitizeAnimePayload(payload) {
  const progress = Math.max(0, Number(payload.progress ?? 0) || 0);
  const rawTotal = payload.total_episodes === '' || payload.total_episodes == null
    ? null
    : Math.max(0, Number(payload.total_episodes) || 0);

  return {
    title: String(payload.title || '').trim(),
    cover_image: nullableString(payload.cover_image),
    status: normalizeStatus(payload.status),
    queue: normalizeQueue(payload.queue),
    progress,
    order_index: Number(payload.order_index ?? 0) || 0,
    total_episodes: rawTotal,
    airing_day: nullableString(payload.airing_day),
    info_url: nullableString(payload.info_url),
    watch_url: nullableString(payload.watch_url),
    note: nullableString(payload.note)
  };
}

function sanitizeQueuePayload(payload) {
  const rawSeason = nullableString(payload.season);
  const year = payload.year === '' || payload.year == null ? null : Number(payload.year);

  return {
    name: String(payload.name || '').trim(),
    season: rawSeason && SEASONS.includes(rawSeason) ? rawSeason : null,
    year: year && year >= 2026 ? year : null,
    order_index: Number(payload.order_index ?? 0) || 0
  };
}

function nullableString(value) {
  const text = String(value ?? '').trim();
  return text || null;
}
