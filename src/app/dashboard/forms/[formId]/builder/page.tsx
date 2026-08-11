"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ExperienceSchema, SceneSchema, QuestionSchema, QuestionOption, LogicRuleSchema } from "@/types/form-schema";
import { QUESTION_TYPES, LOGIC_OPERATORS, LOGIC_ACTIONS, QuestionType, LogicOperator, LogicAction } from "@/lib/constants";
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, CheckCircle2, ChevronLeft, Settings, Layers, HelpCircle, Sliders, Globe } from "lucide-react";

export default function FormBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [schema, setSchema] = useState<ExperienceSchema | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"question" | "logic" | "settings">("question");

  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishErrors, setPublishErrors] = useState<string[]>([]);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const fetchSchema = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/forms/${formId}`);
      const data = await res.json();
      if (data.success) {
        setSchema(data.data);
        if (data.data.scenes.length > 0 && !selectedSceneId) {
          setSelectedSceneId(data.data.scenes[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, [formId]);

  const activeScene = schema?.scenes.find((s) => s.id === selectedSceneId);
  const activeQuestion = activeScene?.questions.find((q) => q.id === selectedQuestionId);

  // Scene Operations
  const handleAddScene = async (type: string = "QUESTION") => {
    try {
      const res = await fetch(`/api/forms/${formId}/scenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: `Scene ${(schema?.scenes.length || 0) + 1}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchSchema();
        setSelectedSceneId(data.data.id);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    if ((schema?.scenes.length || 0) <= 1) {
      alert("A form must have at least one scene.");
      return;
    }
    if (!confirm("Delete this scene and all its questions?")) return;

    try {
      const res = await fetch(`/api/scenes/${sceneId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchSchema();
        if (selectedSceneId === sceneId) {
          const remaining = schema?.scenes.filter((s) => s.id !== sceneId);
          setSelectedSceneId(remaining && remaining.length > 0 ? remaining[0].id : null);
        }
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateSceneTitle = async (sceneId: string, title: string, description?: string) => {
    try {
      await fetch(`/api/scenes/${sceneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      await fetchSchema();
    } catch (e: any) {
      console.error(e);
    }
  };

  // Question Operations
  const handleAddQuestion = async (type: QuestionType = "SHORT_TEXT") => {
    if (!selectedSceneId) return;
    try {
      const res = await fetch(`/api/scenes/${selectedSceneId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: selectedSceneId,
          type,
          label: "Untitled Question",
          required: false,
          options: type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE"
            ? [
                { label: "Option 1", value: "option_1" },
                { label: "Option 2", value: "option_2" },
              ]
            : undefined,
          evaluationConfig: schema?.metadata.type === "HIRING" ? { enabled: true, maxMarks: 10, weight: 10, method: "AUTOMATIC" } : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchSchema();
        setSelectedQuestionId(data.data.id);
        setActiveTab("question");
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateQuestion = async (questionId: string, updates: Partial<QuestionSchema>) => {
    try {
      const res = await fetch(`/api/questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        await fetchSchema();
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const res = await fetch(`/api/questions/${questionId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchSchema();
        if (selectedQuestionId === questionId) setSelectedQuestionId(null);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Publish Form
  const handlePublish = async () => {
    setPublishErrors([]);
    setPublishedUrl(null);
    try {
      setIsPublishing(true);
      const res = await fetch(`/api/forms/${formId}/publish`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setPublishedUrl(data.data.publicUrl);
        await fetchSchema();
      } else {
        setPublishErrors(data.error?.details || [data.error?.message || "Publish failed"]);
      }
    } catch (e: any) {
      setPublishErrors([e.message]);
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading || !schema) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading Form Builder...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900">{schema.metadata.title}</h1>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${schema.metadata.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                {schema.metadata.status}
              </span>
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-medium">
                {schema.metadata.type}
              </span>
            </div>
            <p className="text-xs text-gray-400">Version {schema.versionNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/forms/${formId}/preview`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 transition"
          >
            <Eye className="w-4 h-4" />
            Preview
          </Link>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Globe className="w-4 h-4" />
            {isPublishing ? "Publishing..." : "Publish Form"}
          </button>
        </div>
      </header>

      {/* Publish Errors Banner */}
      {publishErrors.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-xs text-red-700">
          <p className="font-bold mb-1">Publish Validation Failed:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {publishErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Published Success Banner */}
      {publishedUrl && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-xs text-green-800 flex items-center justify-between">
          <span>Form published successfully! Public URL: <a href={publishedUrl} target="_blank" className="underline font-bold">{publishedUrl}</a></span>
          <button onClick={() => setPublishedUrl(null)} className="text-xs text-green-700 font-bold">Dismiss</button>
        </div>
      )}

      {/* 3-Panel Main Builder Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Scene Navigation */}
        <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              Scenes ({schema.scenes.length})
            </h2>
            <button
              onClick={() => handleAddScene("QUESTION")}
              className="p-1 hover:bg-blue-50 text-blue-600 rounded text-xs font-semibold flex items-center gap-1 transition"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {schema.scenes.map((scene, idx) => {
              const isSelected = scene.id === selectedSceneId;
              return (
                <div
                  key={scene.id}
                  onClick={() => {
                    setSelectedSceneId(scene.id);
                    setSelectedQuestionId(null);
                  }}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition flex items-center justify-between ${
                    isSelected ? "border-blue-600 bg-blue-50/70" : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                      <span className="text-xs font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded uppercase">
                        {scene.type}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-1 truncate">
                      {scene.content.title || `Scene ${idx + 1}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {scene.questions.length} Question{scene.questions.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScene(scene.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER PANEL: Canvas & Active Scene Preview */}
        <main className="flex-1 bg-gray-50 overflow-y-auto p-8 flex justify-center">
          <div className="max-w-2xl w-full">
            {activeScene ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                {/* Scene Header Editable */}
                <div className="mb-6 border-b border-gray-100 pb-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                    Scene Type: {activeScene.type}
                  </span>
                  <input
                    type="text"
                    value={activeScene.content.title || ""}
                    onChange={(e) => handleUpdateSceneTitle(activeScene.id, e.target.value, activeScene.content.description)}
                    placeholder="Scene Title..."
                    className="text-2xl font-bold text-gray-900 w-full border-b border-transparent focus:border-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    value={activeScene.content.description || ""}
                    onChange={(e) => handleUpdateSceneTitle(activeScene.id, activeScene.content.title || "", e.target.value)}
                    placeholder="Scene Description..."
                    className="text-sm text-gray-500 w-full mt-1 border-b border-transparent focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Questions List */}
                <div className="space-y-4 mb-8">
                  {activeScene.questions.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                      No questions in this scene yet. Click below to add one.
                    </div>
                  ) : (
                    activeScene.questions.map((q, qIdx) => {
                      const isQSelected = q.id === selectedQuestionId;
                      return (
                        <div
                          key={q.id}
                          onClick={() => {
                            setSelectedQuestionId(q.id);
                            setActiveTab("question");
                          }}
                          className={`p-4 border rounded-lg cursor-pointer transition ${
                            isQSelected ? "border-blue-600 ring-2 ring-blue-100 bg-blue-50/30" : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-400">Q{qIdx + 1}.</span>
                              <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-800 rounded">
                                {q.type}
                              </span>
                              {q.required && <span className="text-xs font-bold text-red-500">Required</span>}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuestion(q.id);
                              }}
                              className="text-xs text-gray-400 hover:text-red-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-base font-semibold text-gray-900">{q.label}</p>
                          {q.description && <p className="text-xs text-gray-500 mt-0.5">{q.description}</p>}

                          {/* Render Options Preview */}
                          {q.options && q.options.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {q.options.map((opt) => (
                                <div key={opt.id} className="text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded border border-gray-200 w-max">
                                  • {opt.label}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Evaluation indicator */}
                          {q.evaluationConfig && q.evaluationConfig.enabled && (
                            <div className="mt-3 border-t border-gray-100 pt-2 flex items-center gap-3 text-xs text-purple-700 font-medium">
                              <span>Max Marks: {q.evaluationConfig.maxMarks}</span>
                              <span>•</span>
                              <span>Weight: {q.evaluationConfig.weight}%</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Question Button bar */}
                <div className="border-t border-gray-200 pt-6">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Add Question to Scene</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(QUESTION_TYPES).map((typeKey) => (
                      <button
                        key={typeKey}
                        onClick={() => handleAddQuestion(typeKey as QuestionType)}
                        className="py-2 px-3 border border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-xs font-semibold text-gray-700 hover:text-blue-700 rounded-lg text-left transition"
                      >
                        + {typeKey.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400">Select a scene from the left panel</div>
            )}
          </div>
        </main>

        {/* RIGHT PANEL: Properties / Question Config / Logic Rules */}
        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
          {/* Tabs Header */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("question")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition ${
                activeTab === "question" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Question Properties
            </button>
            <button
              onClick={() => setActiveTab("logic")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition ${
                activeTab === "logic" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Form Logic
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {activeTab === "question" && (
              <>
                {activeQuestion ? (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Question Label</label>
                      <textarea
                        rows={2}
                        value={activeQuestion.label}
                        onChange={(e) => handleUpdateQuestion(activeQuestion.id, { label: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description / Help Text</label>
                      <input
                        type="text"
                        value={activeQuestion.description || ""}
                        onChange={(e) => handleUpdateQuestion(activeQuestion.id, { description: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <input
                        type="checkbox"
                        id="chk_req"
                        checked={activeQuestion.required}
                        onChange={(e) => handleUpdateQuestion(activeQuestion.id, { required: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor="chk_req" className="text-sm font-medium text-gray-900 cursor-pointer">
                        Required Question
                      </label>
                    </div>

                    {/* Options Editor for Choice Questions */}
                    {(activeQuestion.type === "SINGLE_CHOICE" || activeQuestion.type === "MULTIPLE_CHOICE") && (
                      <div className="border-t border-gray-100 pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-700 uppercase">Options</label>
                          <button
                            onClick={() => {
                              const opts = activeQuestion.options || [];
                              const newOpts = [
                                ...opts,
                                {
                                  id: `opt_${Date.now()}`,
                                  questionId: activeQuestion.id,
                                  label: `Option ${opts.length + 1}`,
                                  value: `option_${opts.length + 1}`,
                                  position: opts.length,
                                },
                              ];
                              handleUpdateQuestion(activeQuestion.id, { options: newOpts });
                            }}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            + Add Option
                          </button>
                        </div>

                        {activeQuestion.options?.map((opt, oIdx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={opt.label}
                              onChange={(e) => {
                                const newOpts = activeQuestion.options!.map((o) =>
                                  o.id === opt.id ? { ...o, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") } : o
                                );
                                handleUpdateQuestion(activeQuestion.id, { options: newOpts });
                              }}
                              className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs outline-none"
                            />
                            <button
                              onClick={() => {
                                const newOpts = activeQuestion.options!.filter((o) => o.id !== opt.id);
                                handleUpdateQuestion(activeQuestion.id, { options: newOpts });
                              }}
                              className="text-gray-400 hover:text-red-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Hiring Evaluation Configuration Editor */}
                    <div className="border-t border-gray-200 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 uppercase">Hiring / Evaluation Config</label>
                      </div>

                      <div className="space-y-3 bg-purple-50 p-3 rounded-lg border border-purple-100">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="chk_eval"
                            checked={activeQuestion.evaluationConfig?.enabled || false}
                            onChange={(e) => {
                              const curr = activeQuestion.evaluationConfig || { maxMarks: 10, weight: 10, method: "AUTOMATIC" };
                              handleUpdateQuestion(activeQuestion.id, {
                                evaluationConfig: { ...curr, enabled: e.target.checked },
                              });
                            }}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <label htmlFor="chk_eval" className="text-xs font-semibold text-purple-900 cursor-pointer">
                            Enable Scoring for this Question
                          </label>
                        </div>

                        {activeQuestion.evaluationConfig?.enabled && (
                          <div className="space-y-3 pt-2">
                            <div>
                              <label className="block text-xs font-medium text-purple-800">Max Marks</label>
                              <input
                                type="number"
                                value={activeQuestion.evaluationConfig.maxMarks}
                                onChange={(e) => {
                                  handleUpdateQuestion(activeQuestion.id, {
                                    evaluationConfig: { ...activeQuestion.evaluationConfig!, maxMarks: Number(e.target.value) },
                                  });
                                }}
                                className="w-full border border-purple-200 rounded px-2 py-1 text-xs bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-purple-800">Scoring Weight (%)</label>
                              <input
                                type="number"
                                value={activeQuestion.evaluationConfig.weight}
                                onChange={(e) => {
                                  handleUpdateQuestion(activeQuestion.id, {
                                    evaluationConfig: { ...activeQuestion.evaluationConfig!, weight: Number(e.target.value) },
                                  });
                                }}
                                className="w-full border border-purple-200 rounded px-2 py-1 text-xs bg-white"
                              />
                            </div>

                            {(activeQuestion.type === "SINGLE_CHOICE" || activeQuestion.type === "YES_NO") && (
                              <div>
                                <label className="block text-xs font-medium text-purple-800">Correct Answer Value</label>
                                <input
                                  type="text"
                                  value={String(activeQuestion.evaluationConfig.correctAnswer || "")}
                                  onChange={(e) => {
                                    handleUpdateQuestion(activeQuestion.id, {
                                      evaluationConfig: { ...activeQuestion.evaluationConfig!, correctAnswer: e.target.value },
                                    });
                                  }}
                                  placeholder="e.g. Yes or option_1"
                                  className="w-full border border-purple-200 rounded px-2 py-1 text-xs bg-white"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    Select a question in the middle panel to view and edit its properties.
                  </div>
                )}
              </>
            )}

            {activeTab === "logic" && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-700 uppercase">Conditional Logic Rules</h3>
                <p className="text-xs text-gray-500">
                  Configure dynamic rules to show or hide scenes based on respondent answers.
                </p>

                {/* Logic Rule Adder */}
                <LogicRuleEditor formId={formId} schema={schema} onUpdate={fetchSchema} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function LogicRuleEditor({ formId, schema, onUpdate }: { formId: string; schema: ExperienceSchema; onUpdate: () => void }) {
  const allQuestions = schema.scenes.flatMap((s) => s.questions);
  const [sourceQId, setSourceQId] = useState(allQuestions[0]?.id || "");
  const [operator, setOperator] = useState<LogicOperator>("EQUALS");
  const [compValue, setCompValue] = useState("");
  const [action, setAction] = useState<LogicAction>("SHOW_SCENE");
  const [targetSceneId, setTargetSceneId] = useState(schema.scenes[0]?.id || "");

  const handleAddRule = async () => {
    if (!sourceQId || !targetSceneId) return;
    try {
      const res = await fetch(`/api/forms/${formId}/logic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceQuestionId: sourceQId,
          operator,
          comparisonValue: compValue,
          action,
          targetSceneId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCompValue("");
        onUpdate();
      } else {
        alert(data.error?.message);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/forms/${formId}/logic?ruleId=${ruleId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) onUpdate();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing Rules List */}
      <div className="space-y-2">
        {schema.logicRules.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No conditional logic rules configured yet.</p>
        ) : (
          schema.logicRules.map((rule) => {
            const sq = allQuestions.find((q) => q.id === rule.sourceQuestionId);
            const ts = schema.scenes.find((s) => s.id === rule.targetSceneId);
            return (
              <div key={rule.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-700">IF {sq?.label || "Question"}</span>
                  <button onClick={() => handleDeleteRule(rule.id)} className="text-gray-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-gray-600">
                  {rule.operator} "{rule.comparisonValue}"
                </p>
                <p className="font-semibold text-purple-700">
                  THEN {rule.action} → {ts?.content.title || "Target Scene"}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Add Rule Form */}
      <div className="p-3 border border-blue-200 bg-blue-50/50 rounded-lg space-y-3">
        <p className="text-xs font-bold text-blue-900 uppercase">+ Add New Logic Rule</p>

        <div>
          <label className="block text-xs font-medium text-gray-700">If Answer To Question:</label>
          <select
            value={sourceQId}
            onChange={(e) => setSourceQId(e.target.value)}
            className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white mt-1"
          >
            {allQuestions.map((q) => (
              <option key={q.id} value={q.id}>{q.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Operator:</label>
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value as LogicOperator)}
            className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white mt-1"
          >
            {Object.keys(LOGIC_OPERATORS).map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Value to Compare:</label>
          <input
            type="text"
            value={compValue}
            onChange={(e) => setCompValue(e.target.value)}
            placeholder="e.g. Yes or option_1"
            className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white mt-1"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Then Action:</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as LogicAction)}
            className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white mt-1"
          >
            <option value="SHOW_SCENE">SHOW_SCENE</option>
            <option value="HIDE_SCENE">HIDE_SCENE</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Target Scene:</label>
          <select
            value={targetSceneId}
            onChange={(e) => setTargetSceneId(e.target.value)}
            className="w-full border border-gray-300 rounded p-1.5 text-xs bg-white mt-1"
          >
            {schema.scenes.map((s, idx) => (
              <option key={s.id} value={s.id}>#{idx + 1} - {s.content.title || `Scene ${idx + 1}`}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleAddRule}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded transition"
        >
          Add Logic Rule
        </button>
      </div>
    </div>
  );
}
