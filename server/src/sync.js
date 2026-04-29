// Build local/offline: sync externo desativado.
export async function syncAniList() {
  return {
    ok: true,
    skipped: true,
    offline: true,
    message: 'Este build não sincroniza com AniList.'
  };
}
