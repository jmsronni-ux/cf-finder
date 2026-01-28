import React, { useState, useEffect } from 'react';
import { Plus, Copy, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTemplateOperations } from '@/hooks/useTemplateOperations';

interface AdminTemplateControlsProps {
  editingTemplate: string;
  availableTemplates: string[];
  onTemplateChange: (template: string) => void;
  onTemplatesUpdate: (templates: string[]) => void;
  nodes: any[];
  edges: any[];
  onSaveComplete: () => void;
}

const AdminTemplateControls: React.FC<AdminTemplateControlsProps> = ({
  editingTemplate,
  availableTemplates,
  onTemplateChange,
  onTemplatesUpdate,
  nodes,
  edges,
  onSaveComplete
}) => {
  const { saveAllLevels, cloneTemplate, fetchTemplates, templates: fetchedTemplates } = useTemplateOperations();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Update parent when fetched templates change
  useEffect(() => {
    if (fetchedTemplates.length > 0) {
      onTemplatesUpdate(fetchedTemplates);
    }
  }, [fetchedTemplates, onTemplatesUpdate]);

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const success = await saveAllLevels(editingTemplate, nodes, edges);
      if (success) {
        onSaveComplete();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClone = async () => {
    const newName = prompt(`Clone template "${editingTemplate}" to new name:`);
    if (!newName || !newName.trim()) return;

    const trimmedName = newName.trim();

    // Check if template name already exists
    if (availableTemplates.includes(trimmedName)) {
      toast.error('A template with this name already exists');
      return;
    }

    setIsSaving(true);
    try {
      const success = await cloneTemplate(editingTemplate, trimmedName);
      if (success) {
        // Refresh templates list from backend (this will trigger useEffect to update parent)
        await fetchTemplates();

        // Switch to the new template
        onTemplateChange(trimmedName);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    const name = prompt('Enter new template name:');
    if (!name || !name.trim()) return;

    const trimmedName = name.trim();

    // Check if template name already exists
    if (availableTemplates.includes(trimmedName)) {
      toast.error('A template with this name already exists');
      return;
    }

    setIsSaving(true);
    try {
      // Persist the template by saving current canvas state to it
      // This ensures it won't disappear on page refresh
      const success = await saveAllLevels(trimmedName, nodes, edges);
      if (success) {
        // Refresh templates list from backend (this will trigger useEffect to update parent)
        await fetchTemplates();

        // Switch to the new template
        onTemplateChange(trimmedName);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="absolute top-4 right-[20rem] z-[20] flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 p-2 rounded-xl shadow-2xl">
      {/* Editor Mode Badge */}
      <div className="flex items-center gap-2 px-3 py-1 border-r border-white/10">
        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Editor Mode</span>
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      </div>

      {/* Template Selector */}
      <select
        value={editingTemplate}
        onChange={(e) => onTemplateChange(e.target.value)}
        className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer hover:text-purple-400 transition-colors mr-1"
      >
        {availableTemplates.map(t => (
          <option key={t} value={t} className="bg-neutral-900">
            Template {t}
          </option>
        ))}
        {!availableTemplates.includes('A') && (
          <option value="A" className="bg-neutral-900">Template A</option>
        )}
      </select>

      {/* Create Button */}
      <button
        onClick={handleCreate}
        disabled={isSaving}
        className="p-1 hover:bg-white/10 rounded transition-colors text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Create new template"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-white/10" />

      {/* Clone Button */}
      <button
        onClick={handleClone}
        disabled={isSaving}
        className="flex items-center gap-1 px-3 py-1 hover:bg-white/10 rounded transition-colors text-blue-400 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        title="Clone template"
      >
        <Copy className="w-3.5 h-3.5" />
        Clone
      </button>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-t from-green-800 to-green-700 hover:from-green-700 hover:to-green-600 transition-all duration-200 border border-green-600 hover:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm"
        title="Save all levels to database"
      >
        {isSaving ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save
          </>
        )}
      </button>
    </div>
  );
};

export default AdminTemplateControls;
