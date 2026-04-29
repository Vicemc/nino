# Akiofeira — Anime Feed Local

Versão 100% local/offline do Anime Feed.

## O que esta versão faz

- Não usa AniList API.
- Salva tudo em SQLite local (`server/anime-feed.sqlite`, ou o caminho de `DB_PATH`).
- Permite registrar animes manualmente com:
  - nome;
  - imagem;
  - episódios vistos;
  - total de episódios;
  - dia que sai;
  - nota;
  - estado: Assistindo, Pausado, Completo ou Droppado;
  - fila: Akiofeira, Emiliafeira ou Outros;
  - link de Informações;
  - link para Assistir.
- A página principal mostra só os animes em **Assistindo**.
- As outras abas mostram **Pausados**, **Completos** e **Droppados**.

## Rodar

```bash
npm run install:all
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:4000
```

## Configuração opcional

Copie o arquivo de exemplo:

```bash
cd server
cp example.env .env
```

Exemplo:

```env
PORT=4000
CLIENT_URL=http://localhost:5173
LOCAL_USER_NAME=Akio
DB_PATH=anime-feed.sqlite
```
