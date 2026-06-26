# Быстрый старт

## Требования

- Docker 24+, Docker Compose v2
- 4 GB RAM
- Порты: 80, 3001, 8080

## Установка

```bash
git clone https://github.com/Developer-RU/WASH-PRO-CRM.git
cd WASH-PRO-CRM
cp .env.example .env
# Измените JWT_SECRET, пароли!
chmod +x scripts/*.sh
./scripts/start.sh
```

## Первый вход

| Интерфейс | URL |
|-----------|-----|
| Dashboard | http://localhost |
| Dynamic API Panel | http://localhost:8080 |

Логин: `admin` / `Admin123!`

## Настройка

1. Создайте **автомойку** (название, адрес).
2. Добавьте **посты** с уникальным **серийным номером**.
3. При необходимости настройте **Валюты** и **Типы скидок** (Admin).
4. Настройте **Telegram** (токен, ID администраторов).

## Демо-данные

```bash
./scripts/generate-demo-data.sh    # мойки, посты, статистика
./scripts/generate-demo-cards.sh   # карты с типами скидок 1–5
```

## Повторный seed

```bash
./scripts/run-init-seed.sh
```
