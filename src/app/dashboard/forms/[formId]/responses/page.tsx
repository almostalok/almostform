"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QuestionSchema } from "@/types/form-schema";
import { CANDIDATE_STATUSES, CandidateStatus } from "@/lib/constants";
import { ChevronLeft, Download, Search, Filter, ArrowUpDown, ChevronRight, FileSpreadsheet } from "lucide-react";

interface ResponseRow {
  id: string;
  sessionId: string;
  submittedAt: string | null;
  totalScore: number | null;
  normalizedScore: number | null;
  candidateStatus: CandidateStatus | null;
  answers: Record<string, any>;
}

export default function ResponsesSpreadsheetPage() {
  const params = useParams();
  const formId = params.formId as string;

  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("GENERAL");
  const [questions, setQuestions] = useState<QuestionSchema[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResponses, setTotalResponses] = useState(0);
  const [search, setSearch] = useState("");
  const [candidateStatus, setCandidateStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<"createdAt" | "normalizedScore">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: "10",
        sortBy,
        sortOrder,
      });
      if (search) queryParams.set("search", search);
      if (candidateStatus) queryParams.set("candidateStatus", candidateStatus);

      const res = await fetch(`/api/forms/${formId}/responses?${queryParams.toString()}`);
      const data = await res.json();

      if (data.success) {
        setFormTitle(data.data.formTitle);
        setFormType(data.data.formType);
        setQuestions(data.data.questions);
        setResponses(data.data.responses);
        setTotalPages(data.data.pagination.totalPages);
        setTotalResponses(data.data.pagination.totalResponses);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, [formId, page, candidateStatus, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchResponses();
  };

  const handleExportCsv = () => {
    window.location.href = `/api/forms/${formId}/responses/export`;
  };

  const isHiring = formType === "HIRING";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{formTitle || "Form Responses"}</h1>
                <span className="text-xs font-semibold px-2 py-0.5 bg-purple-100 text-purple-800 rounded uppercase">
                  {formType}
                </span>
              </div>
              <p className="text-xs text-gray-500">{totalResponses} Total Submission{totalResponses !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg font-semibold text-sm shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      {/* Filter & Search Bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search candidates or answers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button type="submit" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 rounded-lg">
              Search
            </button>
          </form>

          <div className="flex items-center gap-4">
            {/* Candidate Status Filter */}
            {isHiring && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-600">Status:</span>
                <select
                  value={candidateStatus}
                  onChange={(e) => {
                    setCandidateStatus(e.target.value);
                    setPage(1);
                  }}
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white outline-none"
                >
                  <option value="">All Candidates</option>
                  {Object.keys(CANDIDATE_STATUSES).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sorting controls */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-600">Sort By:</span>
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [b, o] = e.target.value.split(":");
                  setSortBy(b as any);
                  setSortOrder(o as any);
                  setPage(1);
                }}
                className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white outline-none"
              >
                <option value="createdAt:desc">Newest First</option>
                <option value="createdAt:asc">Oldest First</option>
                {isHiring && <option value="normalizedScore:desc">Highest Score</option>}
                {isHiring && <option value="normalizedScore:asc">Lowest Score</option>}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table Component */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full overflow-x-auto">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
            Loading responses...
          </div>
        ) : responses.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No responses found</h3>
            <p className="text-sm text-gray-500">Share your public form URL to collect submissions.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4 border-r border-gray-200 whitespace-nowrap">Submitted At</th>
                    {isHiring && <th className="py-3.5 px-4 border-r border-gray-200 whitespace-nowrap">Status</th>}
                    {isHiring && <th className="py-3.5 px-4 border-r border-gray-200 whitespace-nowrap text-right">Score</th>}

                    {/* Dynamic Question Columns */}
                    {questions.map((q) => (
                      <th key={q.id} className="py-3.5 px-4 border-r border-gray-200 max-w-xs truncate" title={q.label}>
                        {q.label}
                      </th>
                    ))}
                    <th className="py-3.5 px-4 whitespace-nowrap text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {responses.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/40 cursor-pointer transition"
                      onClick={() => window.location.href = `/dashboard/forms/${formId}/responses/${row.id}`}
                    >
                      {/* Submitted At */}
                      <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap text-xs text-gray-600 font-medium">
                        {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "N/A"}
                      </td>

                      {/* Candidate Status Badge */}
                      {isHiring && (
                        <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            row.candidateStatus === "SHORTLISTED"
                              ? "bg-green-100 text-green-800"
                              : row.candidateStatus === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : row.candidateStatus === "REVIEWING"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {row.candidateStatus || "NEW"}
                          </span>
                        </td>
                      )}

                      {/* Candidate Score */}
                      {isHiring && (
                        <td className="py-3 px-4 border-r border-gray-200 whitespace-nowrap text-right font-bold text-xs text-purple-800">
                          {row.normalizedScore !== null ? `${row.normalizedScore} / 100` : "N/A"}
                        </td>
                      )}

                      {/* Dynamic Question Cells */}
                      {questions.map((q) => {
                        const val = row.answers[q.id];
                        let displayVal = "-";
                        if (val !== undefined && val !== null && val !== "") {
                          if (typeof val === "object") {
                            if (Array.isArray(val)) displayVal = val.join(", ");
                            else if (val.originalName) displayVal = `📄 ${val.originalName}`;
                            else displayVal = JSON.stringify(val);
                          } else {
                            displayVal = String(val);
                          }
                        }
                        return (
                          <td key={q.id} className="py-3 px-4 border-r border-gray-200 max-w-xs truncate text-xs text-gray-800">
                            {displayVal}
                          </td>
                        );
                      })}

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/dashboard/forms/${formId}/responses/${row.id}`}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          View Candidate
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">
                Page {page} of {totalPages} ({totalResponses} total rows)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
