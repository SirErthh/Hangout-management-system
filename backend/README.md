# Hangout Management API (PHP)

Simple REST backend for the Hangout Management System frontend. It uses plain PHP 8 with a lightweight router and PDO to communicate with the existing MySQL schema (`Hangout`).

## Prerequisites

- PHP 8.1+
- MySQL 8+ with database `Hangout`
- phpMyAdmin or any SQL client to import/export data

## Configuration

Copy `backend/config/config.php` if you need to change credentials or set the following environment variables before running `php`:

```
export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_DATABASE=Hangout
export DB_USERNAME=root
export DB_PASSWORD=root
export APP_KEY=your-secret
```

## Run the API locally

```
cd backend
php -S localhost:8000 public/index.php
```

The script auto-migrates required columns/tables, seeds default roles, an admin user (`admin@hangout.local` / `1234`), sample events, menu items, and venue tables the first time it starts.

### Expire stale table holds

Ticket purchases now create temporary holds on tables. To release holds that pass their 30-minute grace period, run:

```
php backend/bin/expire-reservation-holds.php
```

Schedule this command (e.g., cron) to keep your seating chart accurate.

## Key Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/api/auth/register` | Register customer (returns JWT + user profile) |
| POST | `/api/auth/login` | Login (supports legacy plain passwords) |
| GET | `/api/auth/me` | Retrieve profile via Bearer token |
| GET | `/api/events` | Public list of events |
| POST | `/api/events/{id}/orders` | Customer ticket purchase |
| GET | `/api/ticket-orders?mine=1` | Customer ticket history |
| PATCH | `/api/ticket-orders/{id}/status` | Staff/Admin status update |
| POST | `/api/ticket-orders/{id}/confirm` | Confirm single ticket code |
| GET | `/api/menu-items` | Menu catalogue |
| POST | `/api/menu-orders` | Create F&B order from cart |
| GET | `/api/fnb-orders?mine=1` | Customer F&B orders |
| GET | `/api/reservations?mine=1` | Customer reservations |
| POST | `/api/reservations` | Create reservation |
| GET | `/api/tables` | Staff tables overview |
| GET | `/api/day-closure` | Admin day-closure snapshot |

Admin/staff-only endpoints require `Authorization: Bearer <token>` where the token is obtained during login.

## Database Notes

- The bootstrapper runs lightweight migrations to add `ticket_code_prefix`, `max_capacity`, `description`, `assigned_table_id`, and a helper table `TICKET_CODE` if they do not exist.
- Ticket codes are stored in `TICKET_CODE` and generated sequentially per prefix (e.g. `JAZ001`).
- Table assignments update the `assigned_table_id` on `TABLE_RESERVATION`; no destructive changes are applied to the provided schema.

## Extending

- Additional middleware can be registered in `App\Support\Router`.
- Services under `backend/src/Services` encapsulate SQL access; controllers stay thin.
- Add new routes inside `backend/routes/api.php`.
