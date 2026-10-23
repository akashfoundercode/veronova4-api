# Horse-race API integration

The horse-race service is integrated into the existing HTTP server and
Socket.IO server. Its REST routes are isolated under `/api/horse-race` to avoid
colliding with existing `/api/auth`, `/api/bets`, `/api/wallet`, and game APIs.
The horse-race socket namespace is `/horse-race`; event names and payloads keep
the supplied backend protocol.

## REST API

All paths below are relative to `/api/horse-race`. Protected player endpoints
use `Authorization: Bearer <horse-race JWT>`; admin endpoints marked **admin**
require a horse-race admin session. Guest/read-only endpoints are public unless
otherwise noted.

### Authentication and game accounts

| Method | Path | Access |
| --- | --- | --- |
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | Player |
| POST, GET | `/auth/logout` | Player |
| POST | `/auth/activity` | Player |
| POST, GET | `/logout` | Player (legacy alias) |
| POST | `/game/initialize`, `/games/initialize` | Player |
| GET | `/game/me`, `/games/me` | Player |
| GET | `/game/users`, `/games/users` | Admin |
| GET | `/game/all`, `/games/all` | Admin |
| GET | `/game/results`, `/games/results` | Public |
| GET | `/game/previous-results`, `/games/previous-results` | Public |

### Races

Each race path is available under both `/races` (canonical) and `/race`
(legacy alias). Thus, for example, `/races/current` and `/race/current` are
both valid.

| Method | Suffix |
| --- | --- |
| GET | `/current`, `/current/pool`, `/pool`, `/live-pool` |
| GET | `/result-screen`, `/current/result` |
| POST | `/bet`, `/bet/cancel`, `/bet/minus`, `/cancel`, `/minus` |
| DELETE | `/bet`, `/cancel` |
| GET | `/my-bets` |
| GET | `/previous-results`, `/results`, `/previous-games` |
| GET | `/matches-results`, `/history` |
| GET | `/:id/result-screen`, `/:id/result`, `/:id/horses`, `/:id` |
| GET | `/` (recent races) |

Race pools and result screens accept optional player authentication where
applicable. Bet placement, cancellation, and `/my-bets` require a player
session.

### Bets

Each path is available under both `/bets` (canonical) and `/bet` (legacy
alias).

| Method | Suffix |
| --- | --- |
| GET | `/`, `/current`, `/history` |
| GET | `/pool`, `/live-pool`, `/breakdown`, `/live-ledger`, `/live` |
| POST | `/`, `/place`, `/cancel`, `/remove`, `/minus`, `/undo`, `/clear` |
| DELETE | `/`, `/cancel`, `/remove`, `/:id` |

Bet list/history/pool routes are public or optionally authenticated as in the
source contract; mutations require a player session.

### Wallets

Each path is available under both `/wallet` (canonical) and `/wallets` (legacy
alias).

| Method | Suffix |
| --- | --- |
| GET | `/`, `/me`, `/transactions`, `/ledger` |

These are optionally authenticated and return the source contract's guest
fallback when no horse-race token is supplied.

### Horses

Each path is available under both `/horses` (canonical) and `/horse` (legacy
alias).

| Method | Suffix | Access |
| --- | --- | --- |
| GET | `/`, `/:id` | Public |
| POST | `/` | Admin |
| PUT, PATCH, DELETE | `/:id` | Admin |
| POST | `/upload`, `/:id/image` | Admin; multipart image upload |

Uploads accept the source middleware's image fields and are served from
`/uploads/horses/`.

### Admin

All admin routes are under `/admin` and, except the login/reset routes, require
a horse-race admin session.

| Method | Suffix |
| --- | --- |
| POST | `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/logout` |
| GET | `/auth/me` |
| GET | `/analytics`, `/metrics`, `/races/live-bets`, `/races/pool`, `/live-pot` |
| POST | `/race/force-winner`, `/race/extend-time` |
| GET | `/race/scheduled-winners` |
| DELETE | `/race/force-winner`, `/race/force-winner/:gameSerial` |
| POST | `/wallets/bonus-all`, `/wallets/airdrop`, `/wallets/adjust`, `/wallets/credit`, `/wallets/debit` |
| GET | `/wallets/transactions`, `/wallets/ledger`, `/wallet/transactions`, `/wallet/ledger` |
| POST | `/jackpot/force`, `/jackpot/config`, `/jackpot/mode` |
| GET | `/jackpot/config`, `/jackpot/status` |
| DELETE | `/jackpot/force`, `/jackpot/force/:gameSerial` |

## Socket.IO

Connect the shared Socket.IO server at namespace `/horse-race` (for example,
`io("https://host/horse-race")`). The namespace joins clients to `races`;
authenticated players also join `user_<id>`, and authenticated admins join
`admin`. Send the horse-race JWT as `auth.token`, an `Authorization` handshake
header, or the `token` query parameter. Admin-only commands are rejected for
non-admin sessions. Request handlers use Socket.IO acknowledgements when
provided; otherwise they emit their corresponding `*_result` event.

### Client-to-server events

`bet:place`, `bet:cancel`, `bet:remove`, `bet:minus`, `bet:clear`,
`subscribe:user`, `wallet:subscribe`, `wallet:get`, `get:wallet`,
`admin:jackpot_control`, `admin:jackpot_status`,
`admin:live_race_snapshot:get`, `admin:set_forced_winner`,
`admin:extend_time`, `admin:clear_forced_winner`, `admin:set_jackpot`,
`admin:clear_jackpot`, `admin:configure_jackpot`, `admin:set_jackpot_mode`.

Bet and wallet calls use the authenticated player identity from the handshake;
admin controls require an authenticated admin. `admin:jackpot_control`,
`admin:jackpot_status`, `admin:live_race_snapshot:get`, and the other control
calls acknowledge a result when a callback is passed.

### Server-to-client events

**Race lifecycle and betting:** `race:current_state`, `race:created`,
`race:betting_open`, `race:state_changed`, `race:state_change`,
`race:betting_closed_tick`, `race:betting_closed`, `race:countdown_tick`,
`race:track_update`, `race:running_track`, `race:result`, `race:jackpot`,
`race:forced_winner`, `race:time_extended`, `race:bet_pool_update`,
`active_players:update`, `bet:live`.

**Wallet:** `wallet:balance`, `wallet:update`, `wallet`, `balance:update`.

**Admin:** `admin:jackpot_control_result`, `admin:jackpot_status_result`,
`admin:live_race_snapshot`, `admin:metrics_update`, `admin:bet_live`,
`admin:bet_pool_update`, `admin:wallet_transaction`, `admin:ledger_entry`,
`bet:ledger_entry`, `admin:race_control_updated`,
`admin:jackpot_time_scheduled`, `admin:jackpot_updated`,
`admin:jackpot_config_updated`.

The lifecycle payloads contain the authoritative race snapshot/countdown,
track positions, results, or pool data for the named event. Wallet events carry
the wallet snapshot; the compatible wallet aliases emit the same payload.

## Database and runtime setup

The horse subsystem uses tables also named `users`, `wallets`, `games`, and
`bets`. It therefore connects to a **dedicated MySQL schema**, not the existing
service schema. It shares `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`,
and `DB_CONNECTION_LIMIT`, but selects `HORSE_DB_DATABASE`. The configured
MySQL user must have privileges on that schema. The module creates a lazy,
separate pool for the dedicated schema; it does not create a second HTTP or
Socket.IO server.

1. Create an empty schema dedicated to horse-race data.
2. Set `HORSE_DB_DATABASE` to that schema in `.env`. Set `HORSE_JWT_SECRET` to
   a strong secret (or configure the service-wide `JWT_SECRET` fallback).
3. Apply `docs/horse-race-schema.sql` to that schema. It defines the 14 tables
   and seeds the 12 initial horses.
4. Start the service normally with `npm start`.

The application does not run the archive's `initializeDatabase()` routine:
that routine contains database creation, migration, table-drop/repair, and
seeding logic which must not run against the existing multi-game schema.
Existing/incomplete horse schemas must be migrated manually before startup.
Horse player/admin accounts, wallets, and session tokens are isolated from the
existing service's account tables. Race durations and odds retain the source
configuration variables `RACE_BETTING_OPEN_MS`, `RACE_BETTING_CLOSED_MS`,
`RACE_COUNTDOWN_MS`, `RACE_RUNNING_MS`, `RACE_FINISHING_MS`,
`RACE_RESULT_MS`, `RACE_NEXT_DELAY_MS`, `RACE_HORSES_COUNT`, `TIMEZONE`,
`DEFAULT_ODDS`, `JACKPOT_ENABLED`, and `JACKPOT_PROBABILITY`.

If `HORSE_DB_DATABASE` is unset or matches `DB_DATABASE`, the main API still
starts, but the horse-race engine and socket namespace stay disabled and a
configuration warning is logged. Configure the dedicated schema and apply the
SQL setup above to enable them.

Image files are written under `uploads/horses/`; keep this directory writable
and provision persistent storage if uploads must survive redeploys. No archive
uploads or secrets are included in this integration.
