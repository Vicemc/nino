// Build local/offline: este arquivo fica apenas para compatibilidade com imports antigos.
// Nenhuma função aqui chama AniList.

export async function getViewer() {
  return { id: 'local', name: process.env.LOCAL_USER_NAME || 'Akio' };
}

export async function saveProgress() {
  return { ok: true, offline: true };
}

export async function saveMediaListEntry() {
  return { ok: true, offline: true };
}

export function getAniListDebugState() {
  return { total: 0, calls: [], offline: true };
}
