"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { ContentPillarRow } from "@/lib/types/database";

const PRESET_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
];

export default function PillarsPage() {
  const supabase = createClient();
  const [pillars, setPillars] = useState<ContentPillarRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ContentPillarRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    loadPillars();
  }, []);

  async function loadPillars() {
    const { data } = await supabase
      .from("content_pillars")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setPillars(data as ContentPillarRow[]);
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setColor(PRESET_COLORS[0]);
    setShowForm(true);
  }

  function openEdit(pillar: ContentPillarRow) {
    setEditing(pillar);
    setName(pillar.name);
    setDescription(pillar.description || "");
    setColor(pillar.color);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (editing) {
      await supabase
        .from("content_pillars")
        .update({ name, description: description || null, color })
        .eq("id", editing.id);
    } else {
      await supabase.from("content_pillars").insert({
        name,
        description: description || null,
        color,
        sort_order: pillars.length,
        user_id: user.id,
      });
    }

    setShowForm(false);
    loadPillars();
  }

  async function handleDelete(id: string) {
    await supabase.from("content_pillars").delete().eq("id", id);
    loadPillars();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Content Pillars</h2>
          <p className="text-stone text-sm mt-1">
            Define your content categories to track performance by theme
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-sidebar-active text-paper rounded-lg text-sm font-medium hover:bg-sidebar-active/90 transition-colors"
        >
          <Plus size={16} />
          Add Pillar
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card-bg border border-card-border rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editing ? "Edit Pillar" : "New Content Pillar"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Product Reviews, Behind the Scenes"
                  className="w-full px-3 py-2 border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sidebar-active"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What kind of content falls under this pillar?"
                  rows={2}
                  className="w-full px-3 py-2 border border-card-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sidebar-active resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        color === c
                          ? "ring-2 ring-offset-2 ring-sidebar-active scale-110"
                          : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sidebar-active text-paper rounded-lg text-sm font-medium hover:bg-sidebar-active/90 transition-colors"
                >
                  {editing ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-card-border rounded-lg text-sm font-medium hover:bg-blush/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pillar list */}
      {pillars.length === 0 ? (
        <div className="bg-card-bg border border-card-border rounded-xl p-12 text-center">
          <p className="text-stone mb-2">No content pillars yet</p>
          <p className="text-sm text-stone">
            Create your first content pillar to start categorizing your videos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pillars.map((pillar) => (
            <div
              key={pillar.id}
              className="bg-card-bg border border-card-border rounded-xl p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: pillar.color }}
                  />
                  <h3 className="font-semibold">{pillar.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(pillar)}
                    className="p-1.5 rounded-lg hover:bg-blush/20 transition-colors"
                  >
                    <Pencil size={14} className="text-stone" />
                  </button>
                  <button
                    onClick={() => handleDelete(pillar.id)}
                    className="p-1.5 rounded-lg hover:bg-blush/30 transition-colors"
                  >
                    <Trash2 size={14} className="text-stone hover:text-primary" />
                  </button>
                </div>
              </div>
              {pillar.description && (
                <p className="text-sm text-stone mt-2 ml-7">
                  {pillar.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
