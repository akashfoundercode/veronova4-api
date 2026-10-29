# Veronova Game API

Node.js REST API foundation for integrating multiple game providers. The service
owns a consistent client-facing API; each upstream game's protocol and response
format stays isolated in that game's provider adapter.

## Project structure

```text
src/
├── app.js                         # Express app and middleware wiring
├── server.js                      # HTTP server startup and port
├── config/
│   ├── index.js                   # Runtime and environment configuration
│   ├── apiRoutes.js               # Central names for all client-facing API paths
│   └── database.js                # Lazy MySQL connection pool
├── routes/
│   └── index.js                   # Versioned API route composition
├── modules/                       # Client-facing business capabilities
│   ├── horseRace/                 # Global horse race API, engine, admin tools, and sockets
│   │   ├── horseRace.routes.js    # Isolated /api/horse-race route group
│   │   ├── services/raceEngine.js # Persistent global race lifecycle engine
│   │   └── services/socket.service.js # Shared Socket.IO namespace adapter
│   ├── health/
│   │   ├── health.controller.js   # HTTP request/response handling
│   │   └── health.routes.js
│   ├── auth/
│   │   ├── auth.routes.js         # Login, profile, wallet and logout
│   │   ├── auth.controller.js
│   │   └── auth.service.js        # Existing users and Sanctum token storage
│   ├── wingo/                     # First ported Laravel game (game IDs 1–4)
│       ├── wingo.routes.js        # Laravel-compatible /api Wingo URLs
│       ├── wingo.controller.js    # Request validation and response shapes
│       └── wingo.service.js       # Bets, rounds, results, wallet settlement
│   ├── aviator/                   # Aviator API (game ID 5)
│       ├── aviator.routes.js      # Laravel-compatible /api Aviator URLs
│       ├── aviator.controller.js  # Request validation and response shapes
│       ├── aviator.service.js     # Bets, cashout, history and cancellation
│       └── aviator.socket.js      # Isolated real-time Aviator game namespace
│   ├── games/                     # Shared legacy game endpoints
│   │   ├── game.routes.js         # Shared bets and bet-history URLs
│   │   └── game.controller.js     # Dispatch by game ID
│   ├── dragonTiger/               # Dragon Tiger (game ID 10)
│   │   ├── dragonTiger.controller.js # Batch betting and shared API dispatch
│   │   └── dragonTiger.service.js # Bets, cards, results and settlement
│   └── trx/                       # TRX games (game IDs 6–9)
│       ├── trx.routes.js          # TRX result APIs
│       ├── trx.controller.js      # TRX request validation and responses
│       └── trx.service.js         # TRX bets, result feed and settlement
├── providers/                     # One isolated adapter per upstream game API
│   ├── providerRegistry.js        # Resolves a game key to its adapter
│   ├── shared/
│   │   ├── httpClient.js          # Timeouts, auth headers, upstream errors
│   │   └── providerError.js       # Normalized provider failures
│   ├── game-one/
│   │   ├── gameOne.client.js      # Provider-specific HTTP calls
│   │   ├── gameOne.mapper.js      # Provider DTO -> internal domain model
│   │   └── gameOne.provider.js    # Implements provider operations
│   └── game-two/                  # Same pattern for each additional game API
├── middleware/
│   ├── errorHandler.js            # One consistent REST error response
│   └── notFound.js                # Explicit unknown-route response
└── shared/
    └── errors/
        └── AppError.js            # Expected application errors
test/
├── health.test.js
└── providers/                     # Provider adapter contract/integration tests
docs/
└── architecture.md               # Boundaries, request flow and conventions
```

Folders for a game are added when its real API contract is available; sample
provider names above are placeholders, not connected providers.

## API route configuration

All active API prefixes and endpoint paths are declared in
`src/config/apiRoutes.js`. Auth, shared games, Wingo, Aviator, TRX, and health route registration
references that map, so changing a route there updates the Express endpoints consistently.
Keep this file as the source of truth when adding a game's routes; update this
README's endpoint table and examples to match any intentional public URL change.

## Start locally

```sh
npm install
npm run dev
```

The starter health endpoint is `GET http://localhost:3000/api/v1/health`.
Set `PORT` to use a different port. Run tests with `npm test`.
Copy `.env.example` to `.env` and set the existing MySQL connection values
before calling database-backed APIs.

## Horse-race integration

The horse-race backend is integrated without a second listener. Its REST API
is namespaced at `/api/horse-race` to avoid collisions with existing
authentication, betting, wallet, and game routes; real-time updates use the
shared Socket.IO server's `/horse-race` namespace. It requires a dedicated
MySQL schema because its table contracts overlap existing table names. See
[the horse-race integration guide](docs/horse-race-api.md) and apply
`docs/horse-race-schema.sql` to the database named by `HORSE_DB_DATABASE`.

## Wingo migration

Wingo is the first Laravel game module ported to Node.js. Its routes stay under
`/api` (not `/api/v1`) to preserve existing client URLs. Game IDs 1–4 use the
existing `game_settings`, `virtual_games`, `bets`, `betlogs`, `bet_results`,
`admin_winner_results`, and `users` tables. The Node service does not create or
rename database tables or columns.

| Method | Existing URL | Purpose |
| --- | --- | --- |
| POST | `/api/register` | Create a user in the existing shared `users` table |
| POST | `/api/login` | Log into an existing shared account |
| GET | `/api/profile` | Read the authenticated user's profile and wallets |
| GET | `/api/wallet` | Read the authenticated user's wallet balances |
| POST | `/api/logout` | Revoke the current bearer token |
| POST | `/api/main_wallet_transfer` | Transfer third-party wallet funds to the main wallet |
| GET | `/api/admin/dashboard?period=7d` | Admin-only dashboard cards and chart data; `period` supports `7d` or `30d` |
| GET | `/api/admin/dashboard-counts` | Admin-only standalone dashboard summary counts (alias: `/api/admin/counts`) |
| GET | `/api/gameSerialNo` | Set the initial daily round numbers |
| POST | `/api/bets` | Place a single bet for the configured shared games (game IDs 1–18 and 20–26, excluding provider-specific TRX dispatch where applicable) |
| POST | `/api/dragon_bet` | Place a batch bet for Dragon Tiger, Andar Bahar, 7 Up Down, or Red & Black (game IDs 10, 13, 15, 16) |
| GET | `/api/win-amount` | Read a user's result and payout |
| GET | `/api/results` | Paginated results |
| GET | `/api/last_five_result` | Result history |
| GET | `/api/last_result` | Latest result |
| POST | `/api/bet_history` | Shared bet history for supported game IDs |
| GET | `/api/get_results?game_id=:id` | Fetch and settle the provider result |
| GET | `/api/cron_news/:game_id/` | Settle a shared-game round (Laravel URL) |
| GET | `/api/crone/:game_id/` | Existing Node-compatible shared-game cron alias |
| POST | `/api/auto_wingo_result_insert` | Add an admin-selected result |
| GET | `/api/fetchhistory?gameid=:id` | Admin result history |
| GET | `/api/fetch_admin_set_Results/:id` | Admin-selected results |

Request fields stay compatible with the Laravel controller:

- `POST /api/register`: `mobile`, `country_code`, `password`,
  `password_confirmation`; optional `email`, `referral_code`. Registration
  returns `data.userId` and `data.token`.
- `POST /api/login`: `identity` (email or mobile), `password`,
  `country_code`; optional `login_token`. Success response includes `id`,
  `token`, and `token_type: "Bearer"`.
- `GET /api/profile` and `GET /api/wallet`: send
  the Bearer authorization header with the token returned by register or
  login; the wallet account is identified by that authenticated token, not a
  caller-supplied user ID.
- `POST /api/main_wallet_transfer`: send the bearer token and `id` matching the
  authenticated user.
- `GET /api/admin/dashboard`: send the administrator bearer token; optional
  `period=7d` (default) or `period=30d` controls the comparison windows and
  daily chart series.
- `POST /api/bets`: `userid`, `game_id`, `number`, `amount`
- `POST /api/dragon_bet`: `userid`, `game_id` (10, 13, 15, or 16), `json`
  (array of `{ "number": <configured option>, "amount": 1+ }` entries)
- `GET /api/win-amount`: `userid`, `game_id`, `games_no`
- `GET /api/results`: `game_id`, `limit`; optional `offset`, `from_date`,
  `to_date`, `status`
- `GET /api/last_five_result`: `game_id`, `limit`; optional `offset`,
  `from_date`, `to_date`
- `GET /api/last_result`: `game_id`
- `POST /api/bet_history`: `userid`, `game_id`; optional `limit`, `offset`,
  `from_date`, `to_date`
- `GET /api/get_results`: `game_id`
- `GET /api/crone/:game_id/`: supported shared-game ID in the path; TRX uses
  its separate `/api/trx/update_result_cron` endpoint
- `POST /api/auto_wingo_result_insert`: `period_num`, `card_number`,
  `gameid`; Dragon Tiger uses `gameid: 10` and `card_number` 1 (Dragon),
  2 (Tiger), or 3 (Tie)

The login token uses Laravel Sanctum's `id|plaintext` format and stores its
SHA-256 digest in the existing `personal_access_tokens` table. The protected
Wingo bet, win amount, and bet history endpoints require that bearer token and
reject a `userid` that does not match the authenticated account. Game result
reads remain public, like the existing Laravel routes.
The app flow is register (or use an existing account) → login → call profile or
wallet with the returned bearer token → place bets with the same authenticated
user ID. No new user or wallet tables are introduced.

The dashboard API (`GET /api/admin/dashboard`) returns `data.counts` (and top-level properties on `data`) for immediate counts, `data.metrics` for cards with percentage trends, and `data.charts`
for turnover, deposit/withdrawal, and player-growth series. A dedicated fast endpoint (`GET /api/admin/dashboard-counts` or `/api/admin/counts`) returns only the dashboard count values. Dashboard access
requires the existing administrator identity (`users.id = 1`, `role_id = 1`,
`verification = 2`) as well as a valid bearer token. Available count fields include:
`total_player`, `total_turnover`, `total_deposit`, `total_withdrawal`, `otp_pack_balance`,
`total_commission`, `total_games`, `feedbacks`, `chicken_road_admin_profit`, `chicken_road_admin_loss`,
`aviator_admin_profit`, `aviator_admin_loss`, `active_player`, `today_user`, `today_turnover`,
`today_deposit`, `today_withdrawal`, `pending_withdrawal`, `pending_deposit`, `illegal_betters`, and `demo_users`
(both snake_case and camelCase forms are provided). Each entry in `data.metrics` includes `value`,
`currentPeriod`, `previousPeriod`, `changePercent`, and `trend`. The Laravel
dashboard page does not define a separate revenue calculation, so
`totalRevenue` uses the approved deposit total, matching the displayed deposit
metric. Chart series contain one zero-filled record per day in the selected
range.

Dragon Tiger uses game ID 10 and the existing `virtual_games`, `cards`,
`betlogs`, `bets`, `bet_results`, `admin_winner_results`, and `users` tables.
Batch bets at `/api/dragon_bet` preserve the Laravel no-commission rule; the
shared `/api/bets` endpoint applies the standard 2% commission. Bet batches and
round settlement run transactionally, including wallet updates and result
recording. Other shared settlement paths preserve the Laravel payout basis for
Head Tail (14) and Dice (20), paying those games from the gross bet amount.
Andar Bahar (13) has its own service and controller in `src/modules/andarBahar`
and uses the existing `/api/dragon_bet`, bet-history, result, win-amount,
admin-result, and cron URLs. Its settlement generates the rank-card sequence
from the previous result card and settles configured winning options with the
Laravel wallet and period updates.
Head Tail (14) has its own service in `src/modules/headTail` and uses the
existing shared bet, history, result, admin-result, and cron URLs. It stores
the legacy heads/tails image URLs and pays winning bets from their gross amount.
7 Up Down (15) has its own service in `src/modules/sevenUpDown` and uses the
existing `/api/bets`, `/api/dragon_bet`, history, result, admin-result, and cron
URLs. It stores the legacy dice image URLs and dice total, pays matching result
options at 2x of the gross bet amount, and credits only the wallet.
Red & Black (16) has its own service in `src/modules/redBlack` and uses the
existing `/api/bets`, `/api/dragon_bet`, history, result, admin-result, and cron
URLs, including Laravel's `/api/cron_news/:game_id/` cron path. Its settlement
uses the ZIP's active pattern/global result selection, result-to-card-colour
mapping, result image fields, gross-amount multiplier payout, and wallet-only
credit behavior.

The existing `/api/fetchhistory` route was registered without the controller's
required game ID in Laravel. Node accepts the game ID as a `gameid` query value
and also supports `/api/fetchhistory/:gameid` for callers that already pass it
in the path.

The shared game service recognizes the Laravel `game_settings` IDs 1–18 and
20–26, with the existing TRX-specific handling retained for IDs 6–9. The
unversioned API URLs remain unchanged. The Laravel ZIP contains Plinko bet,
alternate bet, index-list, multiplier, and result methods. Their Node service
and controller logic are in `src/modules/plinko`, but the ZIP does not register
API routes for those methods, so this migration does not expose new Plinko
URLs. The ZIP also contains Mine bet, alternate bet, cashout, result, and
multiplier methods. Their Node service and controller logic are in
`src/modules/mine`; the ZIP has no registered Mine API routes, so no Mine URLs
are added.

The game IDs listed in the Laravel database dump map to:

| Game ID | Game |
| --- | --- |
| 11 | Plinko |
| 12 | Mine Game |
| 13 | Andar Bahar |
| 14 | Head Tail |
| 15 | 7 Up Down |
| 16 | Red & Black |
| 17 | Keno |
| 18 | Teen Patti |
| 20 | Dice |
| 21 | Titli Kabootar |
| 22 | Jhandi Munda |
| 23 | Hot Air Balloon |
| 24 | High Low |
| 25 | Jackpot |
| 26 | Mini Roulette |

## Aviator migration

Aviator game ID is `5`. All six Laravel API paths remain under `/api`, and their
path definitions live in `API_ROUTES.aviator` in `src/config/apiRoutes.js`.
The module uses the existing `aviator_bet`, `aviator_result`, `admin_settings`,
`users`, and `wallet_history` tables only.

| Method | URL | Purpose |
| --- | --- | --- |
| POST | `/api/aviator_bet` | Place an Aviator bet using the current wallet/recharge rules |
| GET | `/api/aviator_bet_new` | Place a bet using the legacy winning-wallet debit rules |
| POST | `/api/aviator_cashout` | Cash out a pending bet using the base64 JSON `salt` payload |
| POST | `/api/aviator_history` | Read a user's Aviator bets |
| GET | `/api/aviator_last_five_result` | Read the latest 25 completed crash multipliers |
| GET | `/api/aviator_bet_cancel` | Cancel a pending bet and refund its amount |

Bet requests require `uid`, `number`, `amount`, `game_id: 5`, and
`game_sr_num`; `stop_multiplier` is optional. History takes `uid` and
`game_id: 5` in its JSON body, with optional `limit`, `offset`, and `created_at`.
Bet cancellation uses `userid`, `number`, and `gamesno` query parameters.
Cashout preserves the Laravel request envelope: `salt` is base64-encoded JSON
containing `uid`, `number`, `multiplier`, and `game_sr_num`. Bet writes, cashout
credits, and cancellation refunds execute atomically.

The real-time game feed is available through the Socket.IO `/aviator`
namespace and emits the `verenova_aviator` event. Its payload is a JSON string
with `betTime`, `status`, `period`, and `timer`. The round settings and result
are loaded from `AVIATOR_RESULT_API_URL`, which defaults to
`https://root.veronova.co.in/Aviator/`. Each game can use its own Socket.IO
namespace; a client's disconnect does not stop the shared Aviator game loop.
Clients must connect to the `/aviator` namespace before listening for the
event, for example `const socket = io("https://<host>/aviator");` followed by
`socket.on("verenova_aviator", handler)`. The socket continues emitting the
current state if the round-settings API is temporarily unavailable.

Wingo uses the legacy 2% commission, bet-number multipliers, winner selection,
wallet/recharge fields, and result JSON. Bet placement and round settlement are
wrapped in MySQL transactions. No database schema or Laravel source is changed.
`/api/get_results` keeps Laravel's configured upstream result URL by default;
`RESULTS_API_URL` can point to the equivalent endpoint for the Node deployment.
The `/api/v1` prefix remains in place for the existing Node health endpoint;
legacy Laravel-compatible game URLs remain unversioned under `/api`.

The Wingo timer feed uses the isolated Socket.IO `/wingo` namespace and emits
the `verenova_wingo` event once per second. Its JSON-string payload includes
`timerBetTime`, `oneMinTimer`, `threeMinTimer`, `fiveMinTimer`, `tenMinTimer`,
and `timerStatus`. The existing timer endpoints are called at their respective
round boundaries using `WINGO_TIMER_API_URL` (default:
`https://root.veronova.co.in/api/crone/`, the Node-compatible Wingo cron
route).

## TRX migration

TRX periods use game IDs 6 (1 minute), 7 (3 minutes), 8 (5 minutes), and 9
(10 minutes). Shared `/api/bets` and `/api/bet_history` routes dispatch by
`game_id`; all TRX-only route paths are declared in `API_ROUTES.trx` in
`src/config/apiRoutes.js`.

| Method | URL | Purpose |
| --- | --- | --- |
| POST | `/api/trx_result` | Request a block hash from Gamebridge |
| GET | `/api/trx/result?gameid=:id&offset=:offset&limit=:limit` | Read paginated TRX results and next period |
| GET | `/api/trx/results/:game_id` | Fetch/process the latest TRX block record |
| GET | `/api/trx/results_by_periodno?gameid=:id&period_no=:period` | Look up a result for one period |
| GET | `/api/trx/update_result_cron?gameid=:id` | Settle pending bets for a game using stored TRX results |

TRX bets use the existing `bets`, `betlogs`, `users`, and `virtual_games`
tables; result processing uses the existing `trx_one_min_result`,
`trx_three_min_result`, `trx_five_min_result`, and `trx_ten_min_result`
tables. No schema changes are made. Bets, result insertion, and settlement use
transactions. Set `TRX_MANAGER_KEY` in the local `.env` to enable the
Gamebridge block-hash endpoint; never place provider keys in source code.

## Adding a game integration

1. Confirm the provider's API documentation, auth method, limits, and required
   operations. Do not put provider credentials in source code.
2. Add a kebab-case directory under `src/providers/` with a client, mapper, and
   provider adapter. Keep raw upstream URLs and provider DTOs inside it.
3. Register the adapter by a stable game key in `providerRegistry.js`.
4. Add or extend use cases in `modules/games/games.service.js`. Controllers
   should translate HTTP input/output only; they should not call providers.
5. Validate all incoming params/query/body at the module boundary and map
   provider responses into documented internal response schemas.
6. Add unit tests for mapping/error cases and contract/integration tests using
   mocked upstream responses. Add real sandbox tests only when credentials and
   a sandbox are provided.
7. Document the endpoint, auth requirements, request/response examples, and
   provider-specific environment variables before release.

## REST conventions

- Keep client routes versioned under `/api/v1`.
- Use resource nouns and HTTP methods for operations; don't expose provider
  endpoint paths directly to clients.
- Use one documented JSON response/error shape, pagination convention, and
  status-code policy across all game modules.
- Provider-specific authentication, retries, rate limits, timeouts and response
  mapping belong in `providers/`, not route handlers.
- Load secrets from environment or a secret manager; commit only names and safe
  examples in `.env.example`.
- Never log access tokens, API keys, or full sensitive upstream payloads.
# veronova_backend
# veronova4-api
# veronova4-api
# veronova4-api
