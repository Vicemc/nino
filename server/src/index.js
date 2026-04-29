import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  createAnime,
  createQueue,
  deleteAnime,
  deleteQueue,
  getAnime,
  listAnime,
  listQueues,
  normalizeStatus,
  updateAnime,
  updateQueue
} from './db.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors());
app.use(express.json());

const withErrorHandling = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/', (req, res) => {
  res.redirect(CLIENT_URL);
});

app.get('/api/me', (req, res) => {
  res.json({
    authenticated: true,
    offline: true,
    viewer: {
      id: 'local',
      name: process.env.LOCAL_USER_NAME || 'Nino'
    }
  });
});

app.get('/api/queues', (req, res) => {
  res.json(listQueues());
});

app.post('/api/queues', withErrorHandling(async (req, res) => {
  const queue = createQueue(req.body);
  res.status(201).json(queue);
}));

app.patch('/api/queues/:name', withErrorHandling(async (req, res) => {
  const queue = updateQueue(req.params.name, req.body);
  if (!queue) return res.status(404).json({ error: 'queue_not_found' });
  res.json(queue);
}));

app.delete('/api/queues/:name', withErrorHandling(async (req, res) => {
  const deleted = deleteQueue(req.params.name, req.body?.fallback_queue);
  if (!deleted) return res.status(404).json({ error: 'queue_not_found' });
  res.json({ ok: true });
}));

app.get('/api/anime', (req, res) => {
  res.json(listAnime({ status: req.query.status }));
});

app.get('/api/anime/:id', (req, res) => {
  const anime = getAnime(req.params.id);
  if (!anime) return res.status(404).json({ error: 'anime_not_found' });
  res.json(anime);
});

app.post('/api/anime', withErrorHandling(async (req, res) => {
  if (!String(req.body.title || '').trim()) {
    return res.status(400).json({ error: 'title_required' });
  }

  const anime = createAnime(req.body);
  res.status(201).json(anime);
}));

app.patch('/api/anime/:id', withErrorHandling(async (req, res) => {
  const anime = updateAnime(req.params.id, req.body);
  if (!anime) return res.status(404).json({ error: 'anime_not_found' });
  res.json(anime);
}));

app.put('/api/anime/:id', withErrorHandling(async (req, res) => {
  const anime = updateAnime(req.params.id, req.body);
  if (!anime) return res.status(404).json({ error: 'anime_not_found' });
  res.json(anime);
}));

app.delete('/api/anime/:id', (req, res) => {
  const deleted = deleteAnime(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'anime_not_found' });
  res.json({ ok: true });
});

app.post('/api/anime/:id/watch', withErrorHandling(async (req, res) => {
  const current = getAnime(req.params.id);
  if (!current) return res.status(404).json({ error: 'anime_not_found' });

  const requestedProgress = req.body?.progress;
  const nextProgress = requestedProgress == null
    ? Number(current.progress || 0) + 1
    : Number(requestedProgress);
  const maxProgress = current.total_episodes ? Number(current.total_episodes) : nextProgress;
  const progress = Math.max(Number(current.progress || 0), Math.min(nextProgress, maxProgress));
  const status = current.total_episodes && progress >= Number(current.total_episodes)
    ? 'COMPLETED'
    : normalizeStatus(req.body?.status || current.status);

  const anime = updateAnime(req.params.id, { ...current, progress, status });
  res.json(anime);
}));

app.post('/api/anime/:id/status', withErrorHandling(async (req, res) => {
  const current = getAnime(req.params.id);
  if (!current) return res.status(404).json({ error: 'anime_not_found' });

  const anime = updateAnime(req.params.id, {
    ...current,
    status: normalizeStatus(req.body.status)
  });
  res.json(anime);
}));

app.post('/api/anime/:id/completed', withErrorHandling(async (req, res) => {
  const current = getAnime(req.params.id);
  if (!current) return res.status(404).json({ error: 'anime_not_found' });
  const anime = updateAnime(req.params.id, { ...current, status: 'COMPLETED' });
  res.json(anime);
}));

app.post('/api/anime/:id/drop', withErrorHandling(async (req, res) => {
  const current = getAnime(req.params.id);
  if (!current) return res.status(404).json({ error: 'anime_not_found' });
  const anime = updateAnime(req.params.id, { ...current, status: 'DROPPED' });
  res.json(anime);
}));

app.post('/api/sync', (req, res) => {
  res.json({
    ok: true,
    skipped: true,
    offline: true,
    message: 'Este build é 100% local e não usa AniList API.'
  });
});

app.get('/api/sync/status', (req, res) => {
  res.json({
    offline: true,
    in_flight: false,
    last_sync_at: null,
    retry_after_ms: 0
  });
});

app.get('/debug/anilist-calls', (req, res) => {
  res.json({
    offline: true,
    total: 0,
    calls: [],
    message: 'Nenhuma chamada AniList existe neste build local.'
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  const message = String(err.message || err);
  const status = message.includes('required') || message.includes('exists') || message.includes('cannot_delete') ? 400 : 500;
  res.status(status).json({ error: 'internal_error', message });
});

app.listen(PORT, () => {
  console.log(`Nino local/offline rodando em http://localhost:${PORT}`);
});
