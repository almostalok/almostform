import {
  FormType,
  FormStatus,
  SceneType,
  QuestionType,
  EvaluationMethod,
  LogicOperator,
  LogicAction,
} from "@/lib/constants";

export interface QuestionOption {
  id: string;
  questionId: string;
  label: string;
  value: string;
  position: number;
}

export interface ValidationConfig {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  minSelections?: number;
  maxSelections?: number;
  maxSizeBytes?: number;
  allowedTypes?: string[];
}

export interface RubricLevel {
  points: number;
  description: string;
}

export interface RubricCriterion {
  id: string;
  title: string;
  maxPoints: number;
  levels: RubricLevel[];
}

export interface EvaluationConfig {
  enabled: boolean;
  maxMarks: number;
  weight: number; // percentage 0-100
  method: EvaluationMethod;
  correctAnswer?: string | string[] | number | boolean;
  numberRange?: { min: number; max: number };
  ratingMapping?: Record<number, number>;
  rubricCriteria?: RubricCriterion[];
}

export interface QuestionSchema {
  id: string;
  sceneId: string;
  position: number;
  type: QuestionType;
  label: string;
  description?: string;
  required: boolean;
  options?: QuestionOption[];
  validation?: ValidationConfig;
  evaluationConfig?: EvaluationConfig;
}

export interface SceneSchema {
  id: string;
  type: SceneType;
  position: number;
  content: {
    title?: string;
    description?: string;
  };
  questions: QuestionSchema[];
}

export interface LogicRuleSchema {
  id: string;
  sourceQuestionId: string;
  operator: LogicOperator;
  comparisonValue: string;
  action: LogicAction;
  targetSceneId: string;
}

export interface ExperienceSchema {
  id: string;
  workspaceId: string;
  versionId: string;
  versionNumber: number;
  metadata: {
    title: string;
    description?: string;
    type: FormType;
    slug: string;
    status: FormStatus;
  };
  scenes: SceneSchema[];
  logicRules: LogicRuleSchema[];
  settings: {
    responseCollectionEnabled: boolean;
  };
}

export interface ResponseAnswerInput {
  questionId: string;
  value: any; // string, number, string[], or file object { fileId, name, url, size, type }
}

export interface FileAnswerValue {
  fileId: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
}
