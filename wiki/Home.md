# WASH PRO CRM / SCADA

Локальная CRM/SCADA-система для автомоек самообслуживания на базе [Dynamic API Platform](https://github.com/Dynamic-API-Platform/Dynamic-API-Platform).

**Документация (GitHub Pages):** https://developer-ru.github.io/WASH-PRO-CRM/

## Возможности

- Управление автомойками и постами (серийный номер — у поста)
- SCADA: текущее состояние постов в реальном времени (live-таймер режима)
- Карты: скидочные, сервисные, VIP с привязкой к посту
- Статистика использования и финансов (до/после инкассации)
- Справочники валют и типов скидок (номера 1–5)
- Архивирование и резервное копирование MongoDB
- Telegram-бот и уведомления
- RBAC: Administrator / Operator / Viewer

## Быстрый старт

```bash
git clone https://github.com/Developer-RU/WASH-PRO-CRM.git
cd WASH-PRO-CRM
cp .env.example .env
chmod +x scripts/*.sh
./scripts/start.sh
```

| Интерфейс | URL |
|-----------|-----|
| Dashboard | http://localhost |
| Dynamic API Panel | http://localhost:8080 |
| API health | http://localhost:3001/api/health |

Логин: `admin` / `Admin123!`

## Разделы Wiki

- [Dashboard](Dashboard) — веб-интерфейс CRM
- [Схема данных](Database-Schema) — API endpoints и MongoDB
- [Быстрый старт](Getting-Started) — установка и демо-данные

## Архитектура

```
Контроллеры → RabbitMQ → Message Processor → Dynamic API → MongoDB
                                                      ↑
Dashboard (React) ──────────── nginx /api proxy ──────┘
```

## Репозиторий

https://github.com/Developer-RU/WASH-PRO-CRM
