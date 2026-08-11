"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Eye, Edit3, FileText, CheckCircle2, Copy, Trash2, Globe, FileSpreadsheet } from "lucide-react";

interface FormItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  slug: string;
  updatedAt: string;
  _count: { responses: number };
}

export default function DashboardPage() {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("HIRING");
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/forms");
      const data = await res.json();
      if (data.success) {
        setForms(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsCreating(true);
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          type: newType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setNewTitle("");
        setNewDescription("");
        window.location.href = `/dashboard/forms/${data.data.id}/builder`;
      } else {
        alert(data.error?.message || "Failed to create form");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm("Are you sure you want to delete this form? All responses will be deleted.")) return;
    try {
      const res = await fetch(`/api/forms/${formId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchForms();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const copyPublicUrl = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    alert(`Public URL copied to clipboard: ${url}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header Bar */}
      <header className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Experience Forms</h1>
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">MVP</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Form
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Forms</h2>
            <p className="text-sm text-gray-500">Manage, edit, publish, and evaluate your experience forms.</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center text-gray-500 bg-white border border-gray-200 rounded-xl">
            Loading your forms...
          </div>
        )}

        {/* Empty State */}
        {!loading && forms.length === 0 && (
          <div className="p-12 text-center bg-white border border-gray-200 rounded-xl max-w-md mx-auto">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No forms yet</h3>
            <p className="text-sm text-gray-500 mb-6">Create your first interactive form or hiring application.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition"
            >
              Create Your First Form
            </button>
          </div>
        )}

        {/* Forms Grid */}
        {!loading && forms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((f) => (
              <div key={f.id} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      f.type === "HIRING" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {f.type}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      f.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {f.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{f.title}</h3>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">{f.description || "No description provided."}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500 font-medium border-t border-gray-100 pt-3 mb-4">
                    <span>{f._count.responses} Response{f._count.responses !== 1 ? "s" : ""}</span>
                    <span>•</span>
                    <span>Updated {new Date(f.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/forms/${f.id}/builder`}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                      title="Edit Form Builder"
                    >
                      <Edit3 className="w-4 h-4" />
                      Builder
                    </Link>

                    <Link
                      href={`/dashboard/forms/${f.id}/responses`}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                      title="View Responses & Candidates"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Responses
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    {f.status === "PUBLISHED" && (
                      <button
                        onClick={() => copyPublicUrl(f.slug)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="Copy Public URL"
                      >
                        <Globe className="w-4 h-4" />
                      </button>
                    )}

                    <Link
                      href={`/dashboard/forms/${f.id}/preview`}
                      className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                      title="Preview Form"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => handleDeleteForm(f.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Form"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Form</h3>
            <form onSubmit={handleCreateForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Form Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Frontend Engineer Application"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Form Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="HIRING">HIRING (With candidate scoring & evaluation)</option>
                  <option value="GENERAL">GENERAL</option>
                  <option value="SURVEY">SURVEY</option>
                  <option value="QUIZ">QUIZ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe the purpose of this form..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create Form"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
