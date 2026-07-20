import { decisionConfig } from "../../config/decisionConfig";
import type { MarketSnapshot, ScoreResult, TrendDirection } from "../../models/types";

const directionSign = (direction: TrendDirection | undefined): number => {
  if (direction === "BULLISH") {
    return 1;
  }
  if (direction === "BEARISH") {
    return -1;
  }
  return 0;
};

const clampScore = (score: number): number => Math.max(-100, Math.min(100, Math.round(score)));

export const scoreSnapshot = (snapshot: MarketSnapshot): ScoreResult => {
  let score = 0;
  const bullishEvidence: string[] = [];
  const bearishEvidence: string[] = [];
  const reasonCodes: string[] = [];

  const trendDirection = snapshot.trend?.direction;
  const trendStrength = snapshot.trend?.strength ?? 0;
  const trendContribution =
    directionSign(trendDirection) *
    decisionConfig.scoringWeights.trendDirection *
    (trendStrength / 100);
  score += trendContribution;

  if (trendDirection === "BULLISH") {
    bullishEvidence.push(`Bullish trend strength ${trendStrength}`);
    reasonCodes.push("TREND_BULLISH");
  } else if (trendDirection === "BEARISH") {
    bearishEvidence.push(`Bearish trend strength ${trendStrength}`);
    reasonCodes.push("TREND_BEARISH");
  }

  const candleDirection = snapshot.confirmationCandle?.direction;
  const candleSign = directionSign(candleDirection);
  if (snapshot.confirmationCandle?.confirmed) {
    score += candleSign * decisionConfig.scoringWeights.confirmationCandle;
    if (candleDirection === "BULLISH") {
      bullishEvidence.push("Confirmed bullish candle");
      reasonCodes.push("CANDLE_BULLISH");
    } else if (candleDirection === "BEARISH") {
      bearishEvidence.push("Confirmed bearish candle");
      reasonCodes.push("CANDLE_BEARISH");
    }
  }

  const valueMigration = snapshot.marketProfile?.valueMigration;
  if (valueMigration === "UP") {
    score += decisionConfig.scoringWeights.valueMigration;
    bullishEvidence.push("Market profile value migration up");
    reasonCodes.push("VALUE_MIGRATION_UP");
  } else if (valueMigration === "DOWN") {
    score -= decisionConfig.scoringWeights.valueMigration;
    bearishEvidence.push("Market profile value migration down");
    reasonCodes.push("VALUE_MIGRATION_DOWN");
  }

  const acceptance = snapshot.sessionVolumeProfile?.acceptanceState ?? snapshot.marketProfile?.acceptanceState;
  if (acceptance === "ACCEPTANCE" && candleSign !== 0) {
    score += candleSign * decisionConfig.scoringWeights.acceptance;
    if (candleSign > 0) {
      bullishEvidence.push("Acceptance supports bullish continuation");
      reasonCodes.push("ACCEPTANCE_BULLISH");
    } else {
      bearishEvidence.push("Acceptance supports bearish continuation");
      reasonCodes.push("ACCEPTANCE_BEARISH");
    }
  }

  const setupScore = clampScore(score);
  const marketRegime =
    trendDirection === "BULLISH"
      ? "TRENDING_UP"
      : trendDirection === "BEARISH"
        ? "TRENDING_DOWN"
        : trendDirection === "NEUTRAL"
          ? "RANGING"
          : "UNKNOWN";

  return {
    score: setupScore,
    bullishEvidence,
    bearishEvidence,
    reasonCodes,
    marketRegime
  };
};

export const directionFromScore = (score: number): "BUY" | "SELL" | "WAIT" => {
  if (score >= decisionConfig.thresholds.buy) {
    return "BUY";
  }
  if (score <= decisionConfig.thresholds.sell) {
    return "SELL";
  }
  return "WAIT";
};
