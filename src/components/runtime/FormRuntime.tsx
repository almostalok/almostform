"use client";

import React, { useState, useMemo } from "react";
import { ExperienceSchema, QuestionSchema, SceneSchema } from "@/types/form-schema";
import { evaluateLogic } from "@/lib/logic/evaluator";
import { CheckCircle2, ChevronRight, ChevronLeft, Upload, FileText, AlertCircle } from "lucide-react";

interface FormRuntimeProps {
  schema: ExperienceSchema;
  isPreview?: boolean;
  onFinishPreview?: () => void;
}

export function FormRuntime({ schema, isPreview = false, onFinishPreview }: FormRuntimeProps) {
  const [answersMap, setAnswersMap] = useState<Record<string, any>>({});
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(0);
  const [errorsMap, setErrorsMap] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [sessionId] = useState<string>(() => `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

  // Calculate visible scenes based on conditional logic rules
  const { visibleScenes, activeScene } = useMemo(() => {
    const { hiddenSceneIds } = evaluateLogic(schema, answersMap);
    const visible = schema.scenes
      .filter((s) => !hiddenSceneIds.has(s.id))
      .sort((a, b) => a.position - b.position);

    const safeIndex = Math.min(currentSceneIndex, Math.max(0, visible.length - 1));
    return { visibleScenes: visible, activeScene: visible[safeIndex] };
  }, [schema, answersMap, currentSceneIndex]);

  // Update answer helper
  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswersMap((prev) => ({ ...prev, [questionId]: value }));
    setErrorsMap((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  // Validate questions in the current active scene
  const validateCurrentScene = (): boolean => {
    if (!activeScene || !activeScene.questions) return true;

    const newErrors: Record<string, string> = {};
    let isValid = true;

    for (const q of activeScene.questions) {
      const val = answersMap[q.id];

      if (q.required && (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0))) {
        newErrors[q.id] = "This question is required.";
        isValid = false;
        continue;
      }

      if (val !== undefined && val !== null && val !== "") {
        if (q.type === "EMAIL") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(val))) {
            newErrors[q.id] = "Please enter a valid email address.";
            isValid = false;
          }
        }
        if (q.type === "URL") {
          try {
            new URL(String(val));
          } catch {
            newErrors[q.id] = "Please enter a valid URL (e.g. https://github.com/username).";
            isValid = false;
          }
        }
        if (q.type === "NUMBER") {
          const num = Number(val);
          if (isNaN(num)) {
            newErrors[q.id] = "Please enter a valid number.";
            isValid = false;
          } else if (q.validation?.min !== undefined && num < q.validation.min) {
            newErrors[q.id] = `Value must be at least ${q.validation.min}.`;
            isValid = false;
          } else if (q.validation?.max !== undefined && num > q.validation.max) {
            newErrors[q.id] = `Value must be no more than ${q.validation.max}.`;
            isValid = false;
          }
        }
      }
    }

    setErrorsMap(newErrors);
    return isValid;
  };

  const handleNext = async () => {
    if (!validateCurrentScene()) return;

    if (currentSceneIndex < visibleScenes.length - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFileUpload = async (questionId: string, file: File) => {
    try {
      setUploadingQuestionId(questionId);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        handleAnswerChange(questionId, data.data);
      } else {
        setErrorsMap((prev) => ({ ...prev, [questionId]: data.error?.message || "File upload failed" }));
      }
    } catch (e: any) {
      setErrorsMap((prev) => ({ ...prev, [questionId]: e.message || "File upload failed" }));
    } finally {
      setUploadingQuestionId(null);
    }
  };

  const handleSubmit = async () => {
    if (isPreview) {
      setIsSubmitted(true);
      if (onFinishPreview) onFinishPreview();
      return;
    }

    try {
      setIsSubmitting(true);
      const answersPayload = Object.keys(answersMap).map((qId) => ({
        questionId: qId,
        value: answersMap[qId],
      }));

      const res = await fetch(`/api/public/forms/${schema.metadata.slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          answers: answersPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSubmitted(true);
        setSubmissionId(data.data.responseId);
      } else {
        alert(data.error?.message || "Submission failed. Please check your answers.");
      }
    } catch (e: any) {
      alert("Error submitting form: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    const endingScene = schema.scenes.find((s) => s.type === "ENDING");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {endingScene?.content.title || "Thank You!"}
          </h2>
          <p className="text-gray-600 mb-6">
            {endingScene?.content.description || "Your submission has been received successfully."}
          </p>
          {isPreview && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-3 rounded mb-4">
              <strong>Preview Mode Simulation:</strong> No database response was recorded.
            </div>
          )}
          {submissionId && (
            <p className="text-xs text-gray-400">Submission ID: {submissionId}</p>
          )}
        </div>
      </div>
    );
  }

  if (!activeScene) {
    return (
      <div className="p-8 text-center text-gray-500">
        No visible scene to display.
      </div>
    );
  }

  const isLastScene = currentSceneIndex === visibleScenes.length - 1;
  const progressPercent = Math.round(((currentSceneIndex + 1) / visibleScenes.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      {/* Top Header & Progress bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {schema.metadata.title}
            </span>
            {isPreview && (
              <span className="ml-3 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                Preview Mode
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-gray-600">
            Step {currentSceneIndex + 1} of {visibleScenes.length}
          </span>
        </div>
        <div className="max-w-3xl mx-auto w-full bg-gray-200 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-blue-600 h-1.5 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main Scene Content */}
      <main className="max-w-3xl mx-auto w-full flex-1 px-6 py-10">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          {/* Scene Title & Description */}
          {(activeScene.content.title || activeScene.content.description) && (
            <div className="mb-8 border-b border-gray-100 pb-6">
              {activeScene.content.title && (
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {activeScene.content.title}
                </h1>
              )}
              {activeScene.content.description && (
                <p className="text-gray-600 text-base leading-relaxed">
                  {activeScene.content.description}
                </p>
              )}
            </div>
          )}

          {/* Render Questions in Scene */}
          {activeScene.questions && activeScene.questions.length > 0 && (
            <div className="space-y-8">
              {activeScene.questions.map((q, idx) => (
                <div key={q.id} className="space-y-2">
                  <label className="block text-base font-semibold text-gray-900">
                    {q.label}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {q.description && (
                    <p className="text-xs text-gray-500">{q.description}</p>
                  )}

                  {/* Render Question Input based on Type */}
                  <div className="mt-2">
                    {/* SHORT_TEXT */}
                    {q.type === "SHORT_TEXT" && (
                      <input
                        type="text"
                        value={answersMap[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Type your response..."
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      />
                    )}

                    {/* LONG_TEXT */}
                    {q.type === "LONG_TEXT" && (
                      <textarea
                        rows={4}
                        value={answersMap[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Type your detailed answer..."
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      />
                    )}

                    {/* EMAIL */}
                    {q.type === "EMAIL" && (
                      <input
                        type="email"
                        value={answersMap[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="name@example.com"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      />
                    )}

                    {/* URL */}
                    {q.type === "URL" && (
                      <input
                        type="url"
                        value={answersMap[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="https://github.com/your-username"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      />
                    )}

                    {/* NUMBER */}
                    {q.type === "NUMBER" && (
                      <input
                        type="number"
                        value={answersMap[q.id] !== undefined ? answersMap[q.id] : ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Enter a number..."
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      />
                    )}

                    {/* YES_NO */}
                    {q.type === "YES_NO" && (
                      <div className="flex gap-4">
                        {["Yes", "No"].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleAnswerChange(q.id, opt)}
                            className={`flex-1 py-3 px-4 rounded-lg border text-sm font-semibold transition ${
                              answersMap[q.id] === opt
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* SINGLE_CHOICE */}
                    {q.type === "SINGLE_CHOICE" && q.options && (
                      <div className="space-y-2">
                        {q.options.map((opt) => (
                          <label
                            key={opt.id}
                            className={`flex items-center p-3.5 border rounded-lg cursor-pointer transition ${
                              answersMap[q.id] === opt.value
                                ? "border-blue-600 bg-blue-50/50"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              value={opt.value}
                              checked={answersMap[q.id] === opt.value}
                              onChange={() => handleAnswerChange(q.id, opt.value)}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-900">
                              {opt.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* MULTIPLE_CHOICE */}
                    {q.type === "MULTIPLE_CHOICE" && q.options && (
                      <div className="space-y-2">
                        {q.options.map((opt) => {
                          const currentArr = Array.isArray(answersMap[q.id]) ? answersMap[q.id] : [];
                          const isChecked = currentArr.includes(opt.value);
                          return (
                            <label
                              key={opt.id}
                              className={`flex items-center p-3.5 border rounded-lg cursor-pointer transition ${
                                isChecked ? "border-blue-600 bg-blue-50/50" : "border-gray-200 hover:border-gray-300 bg-white"
                              }`}
                            >
                              <input
                                type="checkbox"
                                value={opt.value}
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleAnswerChange(q.id, [...currentArr, opt.value]);
                                  } else {
                                    handleAnswerChange(
                                      q.id,
                                      currentArr.filter((v: string) => v !== opt.value)
                                    );
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="ml-3 text-sm font-medium text-gray-900">
                                {opt.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* RATING */}
                    {q.type === "RATING" && (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleAnswerChange(q.id, star)}
                            className={`w-12 h-12 rounded-lg border font-bold text-base transition ${
                              answersMap[q.id] === star
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {star}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* FILE */}
                    {q.type === "FILE" && (
                      <div className="space-y-3">
                        {answersMap[q.id] ? (
                          <div className="flex items-center justify-between p-3.5 border border-green-200 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-green-600" />
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {answersMap[q.id].originalName || "Uploaded File"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {Math.round((answersMap[q.id].size || 0) / 1024)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAnswerChange(q.id, null)}
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-gray-50 transition">
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm font-semibold text-gray-700">
                              {uploadingQuestionId === q.id ? "Uploading file..." : "Click to upload resume / file"}
                            </span>
                            <span className="text-xs text-gray-400 mt-1">PDF, DOCX, PNG (Max 10MB)</span>
                            <input
                              type="file"
                              className="hidden"
                              disabled={uploadingQuestionId === q.id}
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFileUpload(q.id, e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Field Error Message */}
                  {errorsMap[q.id] && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium pt-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errorsMap[q.id]}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Fixed Navigation Controls */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4 sticky bottom-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentSceneIndex === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
              currentSceneIndex === 0
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Submitting...</span>
            ) : isLastScene ? (
              <span>Submit Form</span>
            ) : (
              <>
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
