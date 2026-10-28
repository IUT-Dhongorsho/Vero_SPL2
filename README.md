<p align="center">
  <img src="doc/readme/logo.png" alt="Vero" width="260">
</p>

<h3 align="center">Your team's work. One place.</h3>

<p align="center">
  Boards, notes, chat, video calls and a calendar, organised by project and module.<br>
  Built by three people for Software Project Lab 2, IUT, 2026.
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB">
  <img alt="Node" src="https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white">
  <img alt="Redis" src="https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white">
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-010101?logo=socket.io&logoColor=white">
  <img alt="Mediasoup" src="https://img.shields.io/badge/Mediasoup-SFU-5B5BD6">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white">
  <img alt="CI" src="https://github.com/IUT-Dhongorsho/Vero_SPL2/actions/workflows/ci.yml/badge.svg">
</p>

<p align="center">
  <a href="#why">Why</a> ·
  <a href="#the-idea">The idea</a> ·
  <a href="#features">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#tech-stack">Tech stack</a> ·
  <a href="#run-it">Run it</a> ·
  <a href="#repository-layout">Layout</a> ·
  <a href="#engineering-notes">Engineering notes</a> ·
  <a href="#team">Team</a>
</p>

---

## Why

A student team in 2026 runs one project across six tools: a task list, a Kanban board, a notes app, a chat app, a video app and a calendar. None of them know about each other. A decision made in a call never reaches the board. A deadline in the notes never reaches the calendar.

Vero puts all of it in one window, and makes the pieces aware of each other.

<p align="center"><img src="doc/readme/board-full.png" alt="Vero workspace with the board open" width="900"></p>

## The idea

Everything hangs off one concept.

```
Project
└── Module  (Frontend, Backend, DB schema, …)
    ├── Board      Kanban: Backlog → In progress → In review → Done
    ├── Notes      live collaborative documents
    ├── Chat       one room, right people already in it
    └── Meet       a call room, no links
```

When you create a module, its tools are provisioned for it. You never set anything up. Membership and roles (`admin`, `member`, `viewer`) are per project and flow down to every module.

## Features

<details open>
<summary><b>Board</b> — plan it</summary>
<br>
<img src="doc/readme/board-full.png" alt="Kanban board" width="800">

- Four default columns, custom columns, drag-and-drop with keyboard support (`dnd-kit`)
- Optimistic updates: the card moves instantly, rolls back with a toast if the server disagrees
- Assignee, priority, due date with overdue badges, labels, description
- Assigning a task publishes `task.assigned`; the assignee gets a bell, an email and a browser push
</details>

<details>
<summary><b>Notes</b> — write it together</summary>
<br>
<img src="doc/readme/note-crop.png" alt="Collaborative note" width="800">

- Tiptap editor on top of a Yjs CRDT: several people type at once, text converges without locks
- Live cursors and names through Yjs awareness
- Private notes save plain HTML over REST; public editable notes go through the WebSocket room
- Ask AI for a digest of any note (Gemini, through the AI worker)
- Meeting transcripts and minutes land here automatically
</details>

<details>
<summary><b>Chat</b> — talk it through</summary>
<br>
<img src="doc/readme/chat-crop.png" alt="Module chat" width="800">

- One group channel per module, created the moment the module exists (gRPC from project-service)
- Direct messages between connected users (friend-request style connections)
- Socket.IO rooms, typing indicators, presence, read receipts, optimistic bubbles reconciled by `clientId`
- Redis adapter so two chat instances share the same rooms
</details>

<details>
<summary><b>Meet</b> — right here</summary>
<br>
<img src="doc/readme/meet-left.png" alt="Video call" width="500">

- Our own media server: a Mediasoup SFU. Each person uploads once, the server forwards to everyone else
- Camera, mic, screen share; Opus / VP8 / VP9 / H264
- Live transcription: one browser mixes the call audio, sends 6-second chunks, Whisper (Groq, OpenAI fallback) writes the transcript into a note
- When the call ends, Gemini writes the meeting minutes into a second note
</details>
