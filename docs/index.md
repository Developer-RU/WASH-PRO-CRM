---
layout: default
---

<div class="hero">
  <img class="banner" src="{{ '/assets/banner.png' | relative_url }}" alt="WASH PRO CRM / SCADA">
  {% include hero-badges.html %}
  <p class="hero-lead">
    Локальная CRM/SCADA-система для автомоек самообслуживания на базе
    <a href="https://github.com/Dynamic-API-Platform/Dynamic-API-Platform">Dynamic API Platform</a>
  </p>
</div>

**Локальная система управления автомойками самообслуживания** — мониторинг постов в реальном времени, карты клиентов, аналитика, финансы, справочники валют и типов скидок, архивирование и Telegram-уведомления.

<p class="quick-links">
  <a href="{{ '/getting-started/' | relative_url }}">Быстрый старт</a> ·
  <a href="{{ '/architecture/' | relative_url }}">Архитектура</a> ·
  <a href="{{ '/dashboard/' | relative_url }}">Dashboard</a> ·
  <a href="{{ '/database-schema/' | relative_url }}">Схема данных</a>
</p>

## Возможности

| Модуль | Описание |
|--------|----------|
| **Обзор** | KPI, графики выручки и использования, уведомления |
| **Объекты и посты** | Автомойки, посты с серийным номером контроллера |
| **SCADA** | Текущее состояние всех постов, live-таймер режима |
| **Карты** | Скидочные, сервисные, VIP; привязка к посту |
| **Аналитика** | Использование и финансы до/после инкассации |
| **Справочники** | Валюты, типы скидок (1–5) |
| **Архив и бэкапы** | Политики хранения, `mongodump` по расписанию |
| **Telegram** | Бот для администраторов |
| **Live-данные** | Автообновление без перезагрузки страницы |

## Стек

| Компонент | Технология |
|-----------|------------|
| API | Dynamic API Platform **v1.5.6** (Node.js + MongoDB) |
| Dashboard | React 18 + TypeScript + Vite + Tailwind |
| Очередь | RabbitMQ |
| Обработка телеметрии | message-processor (Node.js) |
| Инфраструктура | Docker Compose |

## Быстрый старт

```bash
git clone https://github.com/Developer-RU/WASH-PRO-CRM.git
cd WASH-PRO-CRM
cp .env.example .env
chmod +x scripts/*.sh
./scripts/start.sh
```

| Сервис | URL |
|--------|-----|
| Dashboard | http://localhost |
| Dynamic API | http://localhost:3001 |
| Dynamic API Panel | http://localhost:8080 |

**Логин по умолчанию:** `admin` / `Admin123!` — смените в `.env` перед production.

### Демо-данные (опционально)

```bash
./scripts/generate-demo-data.sh
./scripts/generate-demo-cards.sh
```

## Структура репозитория

```
WASH-PRO-CRM/
├── dashboard/              # React CRM Dashboard
├── dynamic-api/            # Dynamic API Platform (vendored)
├── services/
│   ├── init-seed/          # CRM endpoints, RBAC, seed
│   ├── message-processor/  # RabbitMQ → API
│   ├── backup/
│   └── telegram-bot/
├── config/rabbitmq/
├── scripts/                # start, seed, demo data, backup
├── docs/                   # Документация (GitHub Pages)
├── wiki/                   # Копия для GitHub Wiki
└── docker-compose.yml
```

## Лицензия

WASH PRO CRM — проприетарный проект.  
[Dynamic API Platform](https://github.com/Dynamic-API-Platform/Dynamic-API-Platform) — Apache License 2.0.
