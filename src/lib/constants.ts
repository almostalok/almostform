export const FORM_TYPES = {
  GENERAL: "GENERAL",
  SURVEY: "SURVEY",
  QUIZ: "QUIZ",
  HIRING: "HIRING",
} as const;

export type FormType = keyof typeof FORM_TYPES;

export const FORM_STATUSES = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export type FormStatus = keyof typeof FORM_STATUSES;

export const SCENE_TYPES = {
  INTRO: "INTRO",
  CONTENT: "CONTENT",
  QUESTION: "QUESTION",
  ENDING: "ENDING",
} as const;

export type SceneType = keyof typeof SCENE_TYPES;

export const QUESTION_TYPES = {
  SHORT_TEXT: "SHORT_TEXT",
  LONG_TEXT: "LONG_TEXT",
  EMAIL: "EMAIL",
  NUMBER: "NUMBER",
  SINGLE_CHOICE: "SINGLE_CHOICE",
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  RATING: "RATING",
  URL: "URL",
  FILE: "FILE",
  YES_NO: "YES_NO",
} as const;

export type QuestionType = keyof typeof QUESTION_TYPES;

export const RESPONSE_STATUSES = {
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
} as const;

export type ResponseStatus = keyof typeof RESPONSE_STATUSES;

export const CANDIDATE_STATUSES = {
  NEW: "NEW",
  REVIEWING: "REVIEWING",
  SHORTLISTED: "SHORTLISTED",
  REJECTED: "REJECTED",
  ON_HOLD: "ON_HOLD",
} as const;

export type CandidateStatus = keyof typeof CANDIDATE_STATUSES;

export const EVALUATION_METHODS = {
  AUTOMATIC: "AUTOMATIC",
  MANUAL: "MANUAL",
  RUBRIC: "RUBRIC",
  AI_ASSISTED: "AI_ASSISTED",
} as const;

export type EvaluationMethod = keyof typeof EVALUATION_METHODS;

export const LOGIC_OPERATORS = {
  EQUALS: "EQUALS",
  NOT_EQUALS: "NOT_EQUALS",
  CONTAINS: "CONTAINS",
  GREATER_THAN: "GREATER_THAN",
  LESS_THAN: "LESS_THAN",
} as const;

export type LogicOperator = keyof typeof LOGIC_OPERATORS;

export const LOGIC_ACTIONS = {
  SHOW_SCENE: "SHOW_SCENE",
  HIDE_SCENE: "HIDE_SCENE",
} as const;

export type LogicAction = keyof typeof LOGIC_ACTIONS;

export const FILE_LIMITS = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_FILES: 1,
  ALLOWED_TYPES: ["application/pdf", "image/png", "image/jpeg", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
} as const;

export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
} as const;
