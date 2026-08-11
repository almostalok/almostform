import { QuestionSchema, EvaluationConfig } from "@/types/form-schema";

export interface QuestionScoreResult {
  questionId: string;
  autoScore: number | null;
  maxMarks: number;
  weight: number;
  normalizedScore: number;
  evaluable: boolean;
}

export interface EvaluationSummary {
  totalScore: number;
  maxScore: number;
  normalizedScore: number; // 0 - 100
  questionScores: Record<string, QuestionScoreResult>;
  isValidWeights: boolean;
  weightSum: number;
}

/**
 * Calculates the score for an individual question answer based on its evaluation configuration.
 */
export function evaluateQuestionAnswer(
  question: QuestionSchema,
  answerValue: any
): { autoScore: number | null; evaluable: boolean } {
  const config = question.evaluationConfig;

  if (!config || !config.enabled || config.method === "MANUAL" || config.method === "RUBRIC") {
    return { autoScore: null, evaluable: false };
  }

  if (answerValue === undefined || answerValue === null || answerValue === "") {
    return { autoScore: 0, evaluable: true };
  }

  const maxMarks = config.maxMarks || 10;

  switch (question.type) {
    case "SINGLE_CHOICE": {
      const correctStr = String(config.correctAnswer ?? "").trim().toLowerCase();
      const ansStr = String(answerValue ?? "").trim().toLowerCase();
      const isCorrect = correctStr !== "" && correctStr === ansStr;
      return { autoScore: isCorrect ? maxMarks : 0, evaluable: true };
    }

    case "YES_NO": {
      const correctStr = String(config.correctAnswer ?? "").trim().toLowerCase();
      const ansStr = String(answerValue ?? "").trim().toLowerCase();
      const isCorrect = correctStr !== "" && correctStr === ansStr;
      return { autoScore: isCorrect ? maxMarks : 0, evaluable: true };
    }

    case "MULTIPLE_CHOICE": {
      if (!Array.isArray(config.correctAnswer) || !Array.isArray(answerValue)) {
        return { autoScore: 0, evaluable: true };
      }
      const correctSet = new Set(config.correctAnswer.map((v) => String(v).trim().toLowerCase()));
      const userSet = new Set(answerValue.map((v) => String(v).trim().toLowerCase()));

      if (correctSet.size === 0) return { autoScore: 0, evaluable: true };

      // Exact set match
      let isExactMatch = correctSet.size === userSet.size;
      if (isExactMatch) {
        for (const item of correctSet) {
          if (!userSet.has(item)) {
            isExactMatch = false;
            break;
          }
        }
      }

      if (isExactMatch) {
        return { autoScore: maxMarks, evaluable: true };
      }

      // Proportional score based on correct matches minus incorrect
      let matches = 0;
      let extraWrong = 0;
      for (const val of userSet) {
        if (correctSet.has(val)) {
          matches++;
        } else {
          extraWrong++;
        }
      }
      const proportionalFraction = Math.max(0, (matches - extraWrong) / correctSet.size);
      const score = Math.round(proportionalFraction * maxMarks * 100) / 100;

      return { autoScore: score, evaluable: true };
    }

    case "NUMBER": {
      const numVal = Number(answerValue);
      if (isNaN(numVal)) return { autoScore: 0, evaluable: true };

      if (config.numberRange) {
        const { min, max } = config.numberRange;
        if (numVal >= min && numVal <= max) {
          return { autoScore: maxMarks, evaluable: true };
        }
        return { autoScore: 0, evaluable: true };
      }

      if (config.correctAnswer !== undefined) {
        const expectedNum = Number(config.correctAnswer);
        if (!isNaN(expectedNum) && numVal === expectedNum) {
          return { autoScore: maxMarks, evaluable: true };
        }
      }
      return { autoScore: 0, evaluable: true };
    }

    case "RATING": {
      const ratingVal = Number(answerValue);
      if (isNaN(ratingVal)) return { autoScore: 0, evaluable: true };

      if (config.ratingMapping && config.ratingMapping[ratingVal] !== undefined) {
        return { autoScore: Number(config.ratingMapping[ratingVal]), evaluable: true };
      }

      // Default rating calculation: (rating / 5) * maxMarks
      const defaultScore = Math.round((ratingVal / 5) * maxMarks * 100) / 100;
      return { autoScore: defaultScore, evaluable: true };
    }

    default:
      return { autoScore: null, evaluable: false };
  }
}

/**
 * Calculates weighted score totals for a set of answers against questions in a hiring form.
 * Formula: finalScore = sum( (obtainedScore / questionMaxMarks) * weight )
 */
export function calculateOverallFormScore(
  questions: QuestionSchema[],
  answersMap: Record<string, any>,
  manualScoresMap: Record<string, number> = {}
): EvaluationSummary {
  let totalScore = 0;
  let maxScore = 0;
  let weightSum = 0;

  const questionScores: Record<string, QuestionScoreResult> = {};

  for (const q of questions) {
    const evalConfig = q.evaluationConfig;
    if (!evalConfig || !evalConfig.enabled) continue;

    const maxMarks = evalConfig.maxMarks || 10;
    const weight = evalConfig.weight || 0;
    weightSum += weight;

    let obtainedScore: number | null = null;
    let evaluable = true;

    // Check if there is a manual score override first
    if (manualScoresMap[q.id] !== undefined && manualScoresMap[q.id] !== null) {
      obtainedScore = Math.min(maxMarks, Math.max(0, manualScoresMap[q.id]));
    } else {
      const autoResult = evaluateQuestionAnswer(q, answersMap[q.id]);
      obtainedScore = autoResult.autoScore;
      evaluable = autoResult.evaluable;
    }

    const actualObtained = obtainedScore ?? 0;
    const normalizedQuestionScore = maxMarks > 0 ? (actualObtained / maxMarks) * weight : 0;

    totalScore += actualObtained;
    maxScore += maxMarks;

    questionScores[q.id] = {
      questionId: q.id,
      autoScore: obtainedScore,
      maxMarks,
      weight,
      normalizedScore: Math.round(normalizedQuestionScore * 100) / 100,
      evaluable,
    };
  }

  const isValidWeights = Math.abs(weightSum - 100) < 0.1 || weightSum === 0;

  // Normalized final score out of 100
  let finalNormalizedScore = 0;
  if (weightSum > 0) {
    for (const qId in questionScores) {
      finalNormalizedScore += questionScores[qId].normalizedScore;
    }
  } else if (maxScore > 0) {
    finalNormalizedScore = (totalScore / maxScore) * 100;
  }

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore,
    normalizedScore: Math.round(finalNormalizedScore * 100) / 100,
    questionScores,
    isValidWeights,
    weightSum,
  };
}
