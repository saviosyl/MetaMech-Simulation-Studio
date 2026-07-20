export const BACKEND_VERSION = "1.0.0-mvp";
export const RULE_CONFIG_VERSION = "rules-1.0.0";

export const decisionConfig = {
  version: RULE_CONFIG_VERSION,
  thresholds: {
    buy: 70,
    sell: -70,
    minRiskRewardToTp2: 1.5,
    staleAfterMs: 5 * 60 * 1000
  },
  scoringWeights: {
    trendDirection: 45,
    trendStrength: 20,
    confirmationCandle: 20,
    valueMigration: 10,
    acceptance: 5
  },
  guards: {
    provisionalAllowed: false,
    safetyLock: false
  },
  decisionTtlMs: 15 * 60 * 1000
} as const;
