"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExperienceSchema, QuestionSchema } from "@/types/form-schema";
import { CANDIDATE_STATUSES, CandidateStatus } from "@/lib/constants";
import { ChevronLeft, FileText, Download, CheckCircle2, MessageSquare, Send, Save, Star } from "lucide-react";

export default function IndividualResponsePage() {
  const params = useParams();
  const formId = params.formId as string;
  const responseId = params.responseId as string;

  const [response, setResponse] = useState<any>(null);
  const [schema, setSchema] = useState<ExperienceSchema | null>(null);
  const [scoreSummary, setScoreSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Evaluation editing state
  const [candidateStatus, setCandidateStatus] = useState<CandidateStatus>("NEW");
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [newNote, setNewNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/responses/${responseId}/evaluation`);
      const data = await res.json();
      if (data.success) {
        setResponse(data.data.response);
        setSchema(data.data.schema);
        setScoreSummary(data.data.scoreSummary);
        setCandidateStatus(data.data.response.candidateStatus || "NEW");

        const mScores: Record<string, number> = {};
        for (const a of data.data.response.answers) {
          if (a.manualScore !== null && a.manualScore !== undefined) {
            mScores[a.questionId] = a.manualScore;
          }
        }
        setManualScores(mScores);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [responseId]);

  const handleSaveEvaluation = async (overrideNote?: string) => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/responses/${responseId}/evaluation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateStatus,
          manualScores,
          note: overrideNote !== undefined ? overrideNote : newNote,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNewNote("");
        await fetchDetails();
      } else {
        alert(data.error?.message || "Failed to update evaluation");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !response || !schema) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading candidate response...</div>;
  }

  const allQuestions: QuestionSchema[] = schema.scenes.flatMap((s) => s.questions).sort((a, b) => a.position - b.position);
  const answersMap: Record<string, any> = {};
  for (const a of response.answers) {
    try {
      answersMap[a.questionId] = JSON.parse(a.valueJson);
    } catch {
      answersMap[a.questionId] = a.valueJson;
    }
  }

  const isHiring = schema.metadata.type === "HIRING";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/forms/${formId}/responses`}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition flex items-center gap-1 text-xs font-semibold"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to Responses
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Candidate Submission</h1>
              <p className="text-xs text-gray-500">Submitted {new Date(response.submittedAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSaveEvaluation()}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Evaluation"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Questions & Respondent Answers */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
              Submitted Answers
            </h2>

            <div className="space-y-6">
              {allQuestions.map((q, idx) => {
                const ansVal = answersMap[q.id];
                const qScoreObj = scoreSummary?.questionScores[q.id];
                const currentManualScore = manualScores[q.id] !== undefined ? manualScores[q.id] : "";

                return (
                  <div key={q.id} className="p-4 border border-gray-200 rounded-lg space-y-2 bg-gray-50/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-400">Q{idx + 1}.</span>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{q.label}</p>
                      </div>
                      {isHiring && q.evaluationConfig?.enabled && (
                        <span className="text-xs font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                          Max Marks: {q.evaluationConfig.maxMarks}
                        </span>
                      )}
                    </div>

                    {/* Answer Content */}
                    <div className="mt-2 bg-white p-3 border border-gray-200 rounded text-sm text-gray-900 font-medium">
                      {ansVal === undefined || ansVal === null || ansVal === "" ? (
                        <span className="text-gray-400 italic">No answer provided</span>
                      ) : typeof ansVal === "object" ? (
                        Array.isArray(ansVal) ? (
                          <span>{ansVal.join(", ")}</span>
                        ) : ansVal.url || ansVal.originalName ? (
                          <a
                            href={ansVal.url || `#`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:underline font-semibold text-xs"
                          >
                            <FileText className="w-4 h-4 text-blue-600" />
                            {ansVal.originalName || "View Uploaded Resume/File"}
                          </a>
                        ) : (
                          <pre className="text-xs">{JSON.stringify(ansVal, null, 2)}</pre>
                        )
                      ) : (
                        <span>{String(ansVal)}</span>
                      )}
                    </div>

                    {/* Hiring Manual Evaluation Score Row */}
                    {isHiring && q.evaluationConfig?.enabled && (
                      <div className="pt-2 flex items-center justify-between border-t border-gray-200 text-xs">
                        <div className="text-gray-600 font-medium">
                          Auto Score: <span className="font-bold text-purple-800">{qScoreObj?.autoScore ?? 0}</span> / {q.evaluationConfig.maxMarks}
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-gray-700">Manual Override:</label>
                          <input
                            type="number"
                            min={0}
                            max={q.evaluationConfig.maxMarks}
                            value={currentManualScore}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : Number(e.target.value);
                              setManualScores((prev) => ({ ...prev, [q.id]: val }));
                            }}
                            placeholder={String(qScoreObj?.autoScore ?? 0)}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-xs font-bold text-purple-900 text-right bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Candidate Score & Reviewer Notes Panel */}
        <div className="space-y-6">
          {/* Candidate Evaluation Summary Card */}
          {isHiring && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate Score & Status</h2>

              {/* Total Score Display */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                <span className="text-xs font-semibold text-purple-700 uppercase">Normalized Final Score</span>
                <div className="text-4xl font-extrabold text-purple-900 mt-1">
                  {scoreSummary?.normalizedScore !== undefined ? scoreSummary.normalizedScore : "N/A"}
                  <span className="text-lg font-normal text-purple-600"> / 100</span>
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  Obtained {scoreSummary?.totalScore || 0} out of {scoreSummary?.maxScore || 0} total marks
                </p>
              </div>

              {/* Candidate Status Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Candidate Status</label>
                <select
                  value={candidateStatus}
                  onChange={(e) => setCandidateStatus(e.target.value as CandidateStatus)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm font-semibold bg-white outline-none"
                >
                  {Object.keys(CANDIDATE_STATUSES).map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Reviewer Notes Timeline */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              Reviewer Notes ({response.reviewNotes.length})
            </h2>

            {/* Add Note Form */}
            <div className="space-y-2">
              <textarea
                rows={3}
                placeholder="Add evaluation feedback or interview note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (newNote.trim()) handleSaveEvaluation(newNote);
                }}
                disabled={!newNote.trim() || isSaving}
                className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                Post Note
              </button>
            </div>

            {/* Timeline List */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
              {response.reviewNotes.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No notes added yet.</p>
              ) : (
                response.reviewNotes.map((note: any) => (
                  <div key={note.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-gray-500 font-semibold">
                      <span>{note.author.name || note.author.email}</span>
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-800 leading-relaxed">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
