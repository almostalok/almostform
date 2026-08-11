import { z } from "zod";
import {
  FORM_TYPES,
  FORM_STATUSES,
  SCENE_TYPES,
  QUESTION_TYPES,
  EVALUATION_METHODS,
  LOGIC_OPERATORS,
  LOGIC_ACTIONS,
  CANDIDATE_STATUSES,
} from "@/lib/constants";

export const createFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().optional(),
  type: z.enum([FORM_TYPES.GENERAL, FORM_TYPES.SURVEY, FORM_TYPES.QUIZ, FORM_TYPES.HIRING]),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens").optional(),
});

export const updateFormSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().optional(),
  type: z.enum([FORM_TYPES.GENERAL, FORM_TYPES.SURVEY, FORM_TYPES.QUIZ, FORM_TYPES.HIRING]).optional(),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum([FORM_STATUSES.DRAFT, FORM_STATUSES.PUBLISHED, FORM_STATUSES.ARCHIVED]).optional(),
});

export const createSceneSchema = z.object({
  type: z.enum([SCENE_TYPES.INTRO, SCENE_TYPES.CONTENT, SCENE_TYPES.QUESTION, SCENE_TYPES.ENDING]).default(SCENE_TYPES.QUESTION),
  title: z.string().optional(),
  description: z.string().optional(),
  position: z.number().int().optional(),
});

export const updateSceneSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum([SCENE_TYPES.INTRO, SCENE_TYPES.CONTENT, SCENE_TYPES.QUESTION, SCENE_TYPES.ENDING]).optional(),
  position: z.number().int().optional(),
});

export const questionOptionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Option label is required"),
  value: z.string().min(1, "Option value is required"),
  position: z.number().int().default(0),
});

export const evaluationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  maxMarks: z.number().min(0).default(10),
  weight: z.number().min(0).max(100).default(0),
  method: z.enum([EVALUATION_METHODS.AUTOMATIC, EVALUATION_METHODS.MANUAL, EVALUATION_METHODS.RUBRIC, EVALUATION_METHODS.AI_ASSISTED]).default(EVALUATION_METHODS.AUTOMATIC),
  correctAnswer: z.union([z.string(), z.array(z.string()), z.number(), z.boolean()]).optional(),
  numberRange: z.object({ min: z.number(), max: z.number() }).optional(),
  ratingMapping: z.record(z.string(), z.number()).optional(),
});

export const createQuestionSchema = z.object({
  sceneId: z.string().min(1),
  type: z.enum([
    QUESTION_TYPES.SHORT_TEXT,
    QUESTION_TYPES.LONG_TEXT,
    QUESTION_TYPES.EMAIL,
    QUESTION_TYPES.NUMBER,
    QUESTION_TYPES.SINGLE_CHOICE,
    QUESTION_TYPES.MULTIPLE_CHOICE,
    QUESTION_TYPES.RATING,
    QUESTION_TYPES.URL,
    QUESTION_TYPES.FILE,
    QUESTION_TYPES.YES_NO,
  ]),
  label: z.string().min(1, "Question label is required"),
  description: z.string().optional(),
  required: z.boolean().default(false),
  position: z.number().int().optional(),
  options: z.array(questionOptionSchema).optional(),
  validation: z.record(z.string(), z.any()).optional(),
  evaluationConfig: evaluationConfigSchema.optional(),
});

export const updateQuestionSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  position: z.number().int().optional(),
  options: z.array(questionOptionSchema).optional(),
  validation: z.record(z.string(), z.any()).optional(),
  evaluationConfig: evaluationConfigSchema.optional(),
});

export const createLogicRuleSchema = z.object({
  sourceQuestionId: z.string().min(1),
  operator: z.enum([
    LOGIC_OPERATORS.EQUALS,
    LOGIC_OPERATORS.NOT_EQUALS,
    LOGIC_OPERATORS.CONTAINS,
    LOGIC_OPERATORS.GREATER_THAN,
    LOGIC_OPERATORS.LESS_THAN,
  ]),
  comparisonValue: z.string(),
  action: z.enum([LOGIC_ACTIONS.SHOW_SCENE, LOGIC_ACTIONS.HIDE_SCENE]),
  targetSceneId: z.string().min(1),
});

export const submitResponseAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: z.any(),
});

export const submitResponseSchema = z.object({
  sessionId: z.string().min(1),
  answers: z.array(submitResponseAnswerSchema),
});

export const updateCandidateEvaluationSchema = z.object({
  candidateStatus: z.enum([
    CANDIDATE_STATUSES.NEW,
    CANDIDATE_STATUSES.REVIEWING,
    CANDIDATE_STATUSES.SHORTLISTED,
    CANDIDATE_STATUSES.REJECTED,
    CANDIDATE_STATUSES.ON_HOLD,
  ]).optional(),
  manualScores: z.record(z.string(), z.number()).optional(),
  note: z.string().optional(),
});
