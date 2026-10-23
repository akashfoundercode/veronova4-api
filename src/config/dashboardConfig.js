"use strict";

const API_PREFIX = "/api";

const DASHBOARD_ROUTES = Object.freeze({
  dashboard: "/admin/dashboard",
  dashboardCounts: "/admin/dashboard-counts",
  players: "/admin/players",
  playerDetails: "/admin/players/:id",
  playerStatus: "/admin/players/:id/status",
  attendance: "/admin/attendance",
  attendanceItem: "/admin/attendance/:id",
  fundTransfer: "/admin/fund-transfer",
  fundTransferHistory: "/admin/fund-transfer/history",
  vipLevels: "/admin/vip-levels",
  vipLevelItem: "/admin/vip-levels/:id",
  loginHistory: "/admin/login-history",
  mlmLevels: "/admin/mlm-levels",
  mlmLevelUser: "/admin/mlm-levels/:userId",
  salaryList: "/admin/salary-list",
  salaryUser: "/admin/salary-list/:userId",
  offers: "/admin/offers",
  offerItem: "/admin/offers/:id",
  gifts: "/admin/gifts",
  giftItem: "/admin/gifts/:id",
  giftHistory: "/admin/gift-history",
  banners: "/admin/banners",
  bannerItem: "/admin/banners/:id",
  activityBanners: "/admin/activity-banners",
  activityBannerItem: "/admin/activity-banners/:id",
  paymentLimits: "/admin/payment-limits",
  paymentLimitItem: "/admin/payment-limits/:id",
  depositsPending: "/admin/deposits/pending",
  depositsSuccess: "/admin/deposits/success",
  depositsReject: "/admin/deposits/reject",
  deposits: "/admin/deposits",
  depositItem: "/admin/deposits/:id",
  depositStatus: "/admin/deposits/:id/status",
  withdrawalsPending: "/admin/withdrawals/pending",
  withdrawalsApproved: "/admin/withdrawals/approved",
  withdrawalsReject: "/admin/withdrawals/reject",
  withdrawals: "/admin/withdrawals",
  withdrawalItem: "/admin/withdrawals/:id",
  withdrawalStatus: "/admin/withdrawals/:id/status",
  supportSettings: "/admin/support-settings",
  supportSettingItem: "/admin/support-settings/:id",
  aviatorTelemetry: "/admin/aviator/telemetry",
  aviatorDrops: "/admin/aviator/drops",
  aviator: "/admin/aviator",
  // WinGo Routes & URLs
  wingoBets: "/bets",
  wingoResults: "/results",
  wingoLastFiveResult: "/last_five_result",
  wingoLastResult: "/last_result",
  wingoWinAmount: "/win-amount",
  wingoBetHistory: "/bet_history",
  wingoFetch: "/fetch/:gameid",
  wingoColourPredictionStore: "/colour_prediction-store",
  wingoAdminSetResult: "/fetch_admin_set_Results/:id",
  wingoAutoResultInsert: "/auto_wingo_result_insert",
  wingoCron: "/crone/:game_id/",
  wingoCronNews: "/cron_news/:game_id/",
  wingoGameSerialNo: "/gameSerialNo",
  wingoFetchHistory: "/fetchhistory",
  wingoFetchHistoryByGame: "/fetchhistory/:gameid",
  wingoLive: "/admin/wingo/live",
  wingoLiveGame: "/admin/wingo/live/:gameid",
  wingoSetResult: "/admin/wingo/set-result",
  // Chicken Road Routes & URLs
  chickenBet: "/bet",
  chickenBetValues: "/bet_values",
  chickenHistory: "/history",
  chickenCashout: "/cashout",
  chickenMultiplier: "/multiplier",
  chickenRules: "/getGameRules",
  chickenUpdateRoastMultiplier: "/updateRoastMultiplier",
  chickenAddMultiplier: "/add_multiplier",
  chickenMultiplierUpdate: "/multiplier_update",
  chickenMultiplierDelete: "/multiplier_delete",
  chickenUpdateGameRules: "/updateGameRules",
  chickenUpdateBetValues: "/updateBetValues",
  chickenAdminMultiplier: "/admin/multiplier",
  // Jili Routes
  jiliGames: "/getjilligame",
  jiliLaunch: "/jilligame",
  // Customer Service Routes (14 REST endpoints)
  customerServices: "/customer_service",
  ifscModification: "/ifsc_modification",
  deleteAccount: "/delete_account",
  bankNameModification: "/bank_name_modification",
  gameIssueReport: "/game_issue_report",
  changeLoginPassword: "/change_login_password",
  usdtUserVerification: "/usdt-user-verification",
  submitOldUsdtAddress: "/submit-old-usdt-address",
  aviatorLuckyBonus: "/aviator-lucky-bonus",
  fetchByTypeId: "/fetch-by-typeid",
  depositProblem: "/deposit_Problem",
  depositPendingList: "/deposit_pending_list",
  withdrawPendingList: "/withdraw_pending_list",
  withdrawProblem: "/withdraw_Problem",
});

const WINGO_CONFIG = Object.freeze({
  socketUrl: "https://socket.funplay.services",
  socketEvent: "funplay_wingo",
  modes: Object.freeze({
    1: Object.freeze({ id: 1, name: "30 Second", timerKey: "timerBetTime", duration: 30 }),
    2: Object.freeze({ id: 2, name: "1 Minute", timerKey: "oneMinTimer", duration: 60 }),
    3: Object.freeze({ id: 3, name: "3 Minute", timerKey: "threeMinTimer", duration: 180 }),
    4: Object.freeze({ id: 4, name: "5 Minute", timerKey: "fiveMinTimer", duration: 300 }),
  }),
});

const CHICKEN_CONFIG = Object.freeze({
  difficultyTypes: Object.freeze({
    1: "Easy",
    2: "Medium",
    3: "Hard",
    4: "Hardcore",
  }),
});

const JILI_CONFIG = Object.freeze({
  providerUrl: "https://nuxapi.space/client.php",
  gamesUrl: "https://nuxapi.space/get_games.php?brand=JILI",
  brand: "JILI",
});

const CUSTOMER_SERVICE_CONFIG = Object.freeze({
  typeMap: Object.freeze({
    1: "IFSC Modification",
    2: "Delete Account",
    3: "Bank Name Modification",
    4: "Game Issue Complaint",
    5: "Change Login Password",
    6: "USDT User Verification",
    7: "Submit Old USDT Address",
  }),
});

const DASHBOARD_CONFIG = Object.freeze({
  route: DASHBOARD_ROUTES.dashboard,
  apiUrl: `${API_PREFIX}${DASHBOARD_ROUTES.dashboard}`,
  routes: DASHBOARD_ROUTES,
  wingo: WINGO_CONFIG,
  chicken: CHICKEN_CONFIG,
  jili: JILI_CONFIG,
  customerService: CUSTOMER_SERVICE_CONFIG,
});

module.exports = {
  DASHBOARD_ROUTES,
  DASHBOARD_CONFIG,
  WINGO_CONFIG,
  CHICKEN_CONFIG,
  JILI_CONFIG,
  CUSTOMER_SERVICE_CONFIG,
};
