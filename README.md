# Nino

Um app simples para organizar seus animes localmente, sem depender de APIs externas.

Você pode:

* Registrar animes manualmente
* Controlar episódios assistidos
* Organizar por filas (Akiofeira, Emiliafeira, etc.)
* Adicionar links para assistir ou ver informações
* Usar tudo offline

---

# 🚀 Como rodar (passo a passo simples)

## 1. Instalar o Node.js

Baixe e instale:

👉 https://nodejs.org/

Depois de instalar, abra o terminal e teste:

```bash
node -v
npm -v
```

Se aparecer versão, está OK.

---

## 2. Baixar o projeto

Clique em:

Code → Download ZIP

Extraia o arquivo no seu computador.

---

## 3. Abrir a pasta no terminal

Vá até a pasta do projeto:

```bash
cd caminho/para/nino
```

Exemplo:

```bash
cd C:\Users\SeuNome\Downloads\nino
```

---

## 4. Instalar tudo

```bash
npm install
npm run install:all
```

---

## 5. Rodar o aplicativo

```bash
npm run dev
```

---

## 6. Abrir no navegador

Abra:

http://localhost:5173

Pronto 🎉

---

# 🧠 O que está rodando por trás

* Frontend: React
* Backend: Express
* Banco: SQLite (local, no seu PC)

Nada vai pra internet.

---

# 📁 Onde ficam seus dados

Seus dados ficam em um arquivo SQLite dentro da pasta:

server/

⚠️ Não delete esse arquivo se quiser manter seus animes.

---

# 🔧 Problemas comuns

## ❌ "concurrently não é reconhecido"

Você esqueceu de rodar:

```bash
npm install
```

---

## ❌ "Unexpected token <"

API não está rodando.

Certifique-se de rodar:

```bash
npm run dev
```

---

## ❌ Porta já está em uso

Feche outros programas ou reinicie o terminal.

---

# 💡 Futuro do projeto

Planejado:

* Login com Google (Firebase)
* Sincronização com AniList / MyAnimeList
* Versão online

---

# ❤️ Feito para uso pessoal

Esse projeto foi feito para uso simples, rápido e offline.

Se quiser evoluir, você pode adaptar como quiser.
