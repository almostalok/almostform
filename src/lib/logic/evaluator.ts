import { ExperienceSchema, LogicRuleSchema } from "@/types/form-schema";

export interface LogicEvaluationResult {
  hiddenSceneIds: Set<string>;
  shownSceneIds: Set<string>;
}

export function evaluateSingleRule(
  rule: LogicRuleSchema,
  answerValue: any
): boolean {
  if (answerValue === undefined || answerValue === null || answerValue === "") {
    return false;
  }

  const compVal = rule.comparisonValue;

  switch (rule.operator) {
    case "EQUALS": {
      if (Array.isArray(answerValue)) {
        return answerValue.some(
          (val) => String(val).trim().toLowerCase() === String(compVal).trim().toLowerCase()
        );
      }
      return String(answerValue).trim().toLowerCase() === String(compVal).trim().toLowerCase();
    }

    case "NOT_EQUALS": {
      if (Array.isArray(answerValue)) {
        return !answerValue.some(
          (val) => String(val).trim().toLowerCase() === String(compVal).trim().toLowerCase()
        );
      }
      return String(answerValue).trim().toLowerCase() !== String(compVal).trim().toLowerCase();
    }

    case "CONTAINS": {
      if (Array.isArray(answerValue)) {
        return answerValue.some((val) =>
          String(val).toLowerCase().includes(String(compVal).toLowerCase())
        );
      }
      return String(answerValue).toLowerCase().includes(String(compVal).toLowerCase());
    }

    case "GREATER_THAN": {
      const numAns = Number(answerValue);
      const numComp = Number(compVal);
      if (isNaN(numAns) || isNaN(numComp)) return false;
      return numAns > numComp;
    }

    case "LESS_THAN": {
      const numAns = Number(answerValue);
      const numComp = Number(compVal);
      if (isNaN(numAns) || isNaN(numComp)) return false;
      return numAns < numComp;
    }

    default:
      return false;
  }
}

/**
 * Evaluates all conditional logic rules in the form schema against the current set of respondent answers.
 * Returns sets of scene IDs that should be hidden or explicitly shown.
 */
export function evaluateLogic(
  schema: ExperienceSchema,
  answersMap: Record<string, any>
): LogicEvaluationResult {
  const hiddenSceneIds = new Set<string>();
  const shownSceneIds = new Set<string>();

  if (!schema.logicRules || schema.logicRules.length === 0) {
    return { hiddenSceneIds, shownSceneIds };
  }

  // Group rules by target scene
  const rulesByTargetScene: Record<string, LogicRuleSchema[]> = {};
  for (const rule of schema.logicRules) {
    if (!rulesByTargetScene[rule.targetSceneId]) {
      rulesByTargetScene[rule.targetSceneId] = [];
    }
    rulesByTargetScene[rule.targetSceneId].push(rule);
  }

  for (const targetSceneId in rulesByTargetScene) {
    const rules = rulesByTargetScene[targetSceneId];

    for (const rule of rules) {
      const answerVal = answersMap[rule.sourceQuestionId];
      const isMatch = evaluateSingleRule(rule, answerVal);

      if (isMatch) {
        if (rule.action === "SHOW_SCENE") {
          shownSceneIds.add(targetSceneId);
        } else if (rule.action === "HIDE_SCENE") {
          hiddenSceneIds.add(targetSceneId);
        }
      } else {
        // If a rule is SHOW_SCENE and it does not match, by default hide the target scene unless another rule shows it
        if (rule.action === "SHOW_SCENE") {
          hiddenSceneIds.add(targetSceneId);
        }
      }
    }
  }

  // Remove any scene from hidden if it was explicitly matched to be shown
  for (const sceneId of shownSceneIds) {
    hiddenSceneIds.delete(sceneId);
  }

  return { hiddenSceneIds, shownSceneIds };
}
