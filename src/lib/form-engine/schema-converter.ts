import { db } from "@/lib/db";
import { ExperienceSchema, SceneSchema, QuestionSchema, LogicRuleSchema } from "@/types/form-schema";
import { FormType, FormStatus, SceneType, QuestionType, EvaluationMethod, LogicOperator, LogicAction } from "@/lib/constants";

export async function getFormRuntimeSchema(formIdOrSlug: string): Promise<ExperienceSchema | null> {
  // Find form by ID or unique slug
  const form = await db.form.findFirst({
    where: {
      OR: [{ id: formIdOrSlug }, { slug: formIdOrSlug }],
    },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!form) return null;

  // Determine active version
  let activeVersion = null;
  if (form.currentVersionId) {
    activeVersion = await db.formVersion.findUnique({
      where: { id: form.currentVersionId },
    });
  }
  if (!activeVersion && form.versions.length > 0) {
    activeVersion = form.versions[0];
  }

  if (!activeVersion) return null;

  // If schemaJson exists, parse it directly as full contract
  if (activeVersion.schemaJson) {
    try {
      const parsed = JSON.parse(activeVersion.schemaJson) as ExperienceSchema;
      return parsed;
    } catch (e) {
      console.warn("Could not parse version schemaJson directly, reconstructing from relations...", e);
    }
  }

  // Reconstruct schema from relational tables
  const scenes = await db.scene.findMany({
    where: { formVersionId: activeVersion.id },
    orderBy: { position: "asc" },
    include: {
      questions: {
        orderBy: { position: "asc" },
        include: {
          options: {
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });

  const logicRules = await db.logicRule.findMany({
    where: { formVersionId: activeVersion.id },
  });

  const formattedScenes: SceneSchema[] = scenes.map((s) => ({
    id: s.id,
    type: s.type as SceneType,
    position: s.position,
    content: {
      title: s.title || undefined,
      description: s.description || undefined,
    },
    questions: s.questions.map((q) => ({
      id: q.id,
      sceneId: q.sceneId,
      position: q.position,
      type: q.type as QuestionType,
      label: q.label,
      description: q.description || undefined,
      required: q.required,
      options: q.options.map((o) => ({
        id: o.id,
        questionId: o.questionId,
        label: o.label,
        value: o.value,
        position: o.position,
      })),
      validation: q.validationJson ? JSON.parse(q.validationJson) : undefined,
      evaluationConfig: q.evaluationConfigJson ? JSON.parse(q.evaluationConfigJson) : undefined,
    })),
  }));

  const formattedLogicRules: LogicRuleSchema[] = logicRules.map((r) => ({
    id: r.id,
    sourceQuestionId: r.sourceQuestionId,
    operator: r.operator as LogicOperator,
    comparisonValue: r.comparisonValue,
    action: r.action as LogicAction,
    targetSceneId: r.targetSceneId,
  }));

  return {
    id: form.id,
    workspaceId: form.workspaceId,
    versionId: activeVersion.id,
    versionNumber: activeVersion.versionNumber,
    metadata: {
      title: form.title,
      description: form.description || undefined,
      type: form.type as FormType,
      slug: form.slug,
      status: form.status as FormStatus,
    },
    scenes: formattedScenes,
    logicRules: formattedLogicRules,
    settings: {
      responseCollectionEnabled: form.status === "PUBLISHED",
    },
  };
}
