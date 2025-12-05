import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { 
  FileText, User, Mail, CheckCircle, XCircle, Eye, RefreshCw, Loader2, X, FileDown, 
  ClipboardList, Send, Image as ImageIcon, File, Search, Plus, Trash2, Edit2, 
  ChevronUp, ChevronDown, Layers
} from 'lucide-react';
import MaxWidthWrapper from '../../components/helpers/max-width-wrapper';
import MagicBadge from '../../components/ui/magic-badge';
import AdminNavigation from '../../components/AdminNavigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

interface QuestionnaireField {
  key: string;
  title: string;
  description?: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  step?: number;
}

interface Questionnaire {
  _id: string;
  title: string;
  description?: string;
  status: string;
  fields: QuestionnaireField[];
}

const PAGE_SIZE = 10;

interface Submission {
  _id: string;
  status: string;
  user?: { name: string; email: string };
  documents: { fileId: string; filename: string; mimeType?: string; size?: number }[];
  answers?: Array<{ fieldKey: string; value: any }>;
  profile?: any;
  questionnaire?: Questionnaire;
  createdAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

const AdminAdditionalVerification: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Questionnaire | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [currentField, setCurrentField] = useState<Partial<QuestionnaireField>>({
    type: 'text',
    required: false,
    options: []
  });

  // Helper function to generate key from title
  const generateKeyFromTitle = (title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .split(' ')
      .map((word, index) => {
        if (index === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('')
      .replace(/^[0-9]/, 'q$&'); // If starts with number, prefix with 'q'
  };

  // Helper function to recalculate step numbers based on order
  const recalculateSteps = (fieldsList: QuestionnaireField[]): QuestionnaireField[] => {
    return fieldsList.map((field, index) => ({
      ...field,
      step: index + 1
    }));
  };
  const [newOption, setNewOption] = useState('');
  const [builder, setBuilder] = useState({
    title: '',
  });
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isSavingQuestionnaire, setIsSavingQuestionnaire] = useState(false);
  const [isUpdatingSubmission, setIsUpdatingSubmission] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ fileId: string; filename: string; url: string; type: string } | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fields, setFields] = useState<QuestionnaireField[]>([]);
  const [isQuestionnaireExpanded, setIsQuestionnaireExpanded] = useState(false);

  const fetchSubmissions = useCallback(async (requestedPage = 1) => {
    if (!token || !user?.isAdmin) return;
    setIsLoadingSubmissions(true);
    setSelectedSubmission(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(requestedPage));
      params.set('limit', String(PAGE_SIZE));

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const response = await apiFetch(`/additional-verification/admin/submissions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubmissions(data.data || []);
        const pagination = data.pagination || {};
        setTotalItems(pagination.totalItems ?? (data.data?.length || 0));
        setTotalPages(pagination.totalPages ?? 1);
        setPage(pagination.page ?? requestedPage);
      } else {
        toast.error(data.message || 'Unable to load submissions');
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to load submissions');
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [token, user?.isAdmin, debouncedSearch]);

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Admin access required');
      navigate('/dashboard');
      return;
    }
  }, [user?.isAdmin, navigate]);

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen text-foreground flex items-center justify-center">
        <Card className="border-red-500/50 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You don't have permission to access this page. Admin privileges required.</p>
            <Button onClick={() => navigate('/profile')} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!token || !user?.isAdmin) return;
    fetchCurrentQuestionnaire();
  }, [token, user?.isAdmin]);

  useEffect(() => {
    if (!token || !user?.isAdmin) return;
    setPage(1);
    fetchSubmissions(1);
  }, [token, user?.isAdmin, debouncedSearch, fetchSubmissions]);

  useEffect(() => {
    return () => {
      if (previewFile?.url) {
        window.URL.revokeObjectURL(previewFile.url);
      }
    };
  }, [previewFile]);

  const fetchCurrentQuestionnaire = async () => {
    if (!token) return;
    try {
      const response = await apiFetch('/additional-verification/admin/questionnaires', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const questionnaires = data.data || [];
        // Get the active questionnaire, or the first one if none is active
        const active = questionnaires.find((q: Questionnaire) => q.status === 'active') || questionnaires[0];
        if (active) {
          setCurrentQuestionnaire(active);
          setBuilder({
            title: active.title
          });
          const recalculatedFields = recalculateSteps(active.fields);
          setFields(recalculatedFields);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to load questionnaire');
    }
  };

  const handleAddField = () => {
    setEditingFieldIndex(null);
    setCurrentField({
      title: '',
      description: '',
      type: 'text',
      required: false,
      placeholder: '',
      options: []
    });
    setNewOption('');
    setShowQuestionDialog(true);
  };

  const handleEditField = (index: number) => {
    setEditingFieldIndex(index);
    const fieldToEdit = fields[index];
    // Ensure options array is properly initialized for select fields
    setCurrentField({
      ...fieldToEdit,
      title: fieldToEdit.title || '',
      description: fieldToEdit.description || '',
      options: fieldToEdit.type === 'select' ? (fieldToEdit.options || []) : undefined
    });
    setNewOption('');
    setShowQuestionDialog(true);
  };

  const handleDeleteField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    // Recalculate steps after deletion
    const recalculatedFields = recalculateSteps(newFields);
    setFields(recalculatedFields);
    toast.success('Question removed');
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;
    
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[direction === 'up' ? index - 1 : index + 1];
    newFields[direction === 'up' ? index - 1 : index + 1] = temp;
    // Recalculate steps after moving
    const recalculatedFields = recalculateSteps(newFields);
    setFields(recalculatedFields);
  };

  const handleSaveField = () => {
    if (!currentField.title) {
      toast.error('Question title is required');
      return;
    }

    if (currentField.type === 'select' && (!currentField.options || currentField.options.length === 0)) {
      toast.error('Select questions must have at least one option');
      return;
    }

    // Auto-generate key from title
    const generatedKey = editingFieldIndex !== null && fields[editingFieldIndex]?.key
      ? fields[editingFieldIndex].key // Keep existing key when editing
      : generateKeyFromTitle(currentField.title);

    // Check for duplicate keys
    const existingKeys = fields.map(f => f.key);
    let finalKey = generatedKey;
    if (editingFieldIndex === null && existingKeys.includes(finalKey)) {
      // If adding new field and key exists, append number
      let counter = 1;
      while (existingKeys.includes(finalKey)) {
        finalKey = `${generatedKey}${counter}`;
        counter++;
      }
    }

    const fieldToSave: QuestionnaireField = {
      key: finalKey,
      title: currentField.title.trim(),
      description: currentField.description?.trim() || undefined,
      type: currentField.type || 'text',
      required: currentField.required || false,
      placeholder: currentField.placeholder || '',
      options: currentField.type === 'select' 
        ? (Array.isArray(currentField.options) ? currentField.options.filter(opt => opt && opt.trim()) : [])
        : undefined,
      step: editingFieldIndex !== null ? fields[editingFieldIndex].step || 1 : fields.length + 1
    };

    if (editingFieldIndex !== null) {
      const newFields = [...fields];
      newFields[editingFieldIndex] = fieldToSave;
      setFields(newFields);
      toast.success('Question updated');
    } else {
      const newFields = [...fields, fieldToSave];
      // Recalculate steps for all fields
      const recalculatedFields = recalculateSteps(newFields);
      setFields(recalculatedFields);
      toast.success('Question added');
    }

    setShowQuestionDialog(false);
    setCurrentField({ type: 'text', required: false, options: [] });
    setEditingFieldIndex(null);
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    const trimmedOption = newOption.trim();
    setCurrentField(prev => {
      const existingOptions = prev.options || [];
      // Prevent duplicate options
      if (existingOptions.includes(trimmedOption)) {
        toast.error('This option already exists');
        return prev;
      }
      return {
        ...prev,
        options: [...existingOptions, trimmedOption]
      };
    });
    setNewOption('');
  };

  const handleRemoveOption = (index: number) => {
    setCurrentField(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSaveQuestionnaire = async () => {
    if (!token) return;
    if (!builder.title.trim()) {
      toast.error('Questionnaire title is required');
      return;
    }
    if (fields.length === 0) {
      toast.error('Add at least one question');
      return;
    }

    setIsSavingQuestionnaire(true);
    try {
      // If we have an existing questionnaire, update it; otherwise create new
      const url = currentQuestionnaire
        ? `/additional-verification/admin/questionnaires/${currentQuestionnaire._id}`
        : '/additional-verification/admin/questionnaires';
      const method = currentQuestionnaire ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: builder.title,
          status: 'active',
          fields: fields,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Questionnaire saved successfully');
        fetchCurrentQuestionnaire();
      } else {
        toast.error(data.message || 'Failed to save questionnaire');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save questionnaire');
    } finally {
      setIsSavingQuestionnaire(false);
    }
  };



  const handleStatusUpdate = async (submissionId: string, status: string) => {
    if (!token) return;
    setIsUpdatingSubmission(true);
    try {
      const response = await apiFetch(`/additional-verification/admin/submissions/${submissionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Submission updated');
        fetchSubmissions(page);
      } else {
        toast.error(data.message || 'Unable to update submission');
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to update submission');
    } finally {
      setIsUpdatingSubmission(false);
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    if (!token) return;
    try {
      const response = await apiFetch(`/additional-verification/admin/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        toast.error('Failed to download file');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error('Failed to download file');
    }
  };

  const handlePreview = async (fileId: string, filename: string) => {
    if (!token) return;
    setLoadingPreviewId(fileId);
    try {
      const response = await apiFetch(`/additional-verification/admin/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        toast.error('Failed to load file preview');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const extension = filename.split('.').pop()?.toLowerCase() || '';
      const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      const pdfTypes = ['pdf'];
      
      let fileType = 'other';
      if (imageTypes.includes(extension)) {
        fileType = 'image';
      } else if (pdfTypes.includes(extension)) {
        fileType = 'pdf';
      }
      
      setPreviewFile({ fileId, filename, url, type: fileType });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load file preview');
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const closePreview = () => {
    if (previewFile?.url) {
      window.URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
  };

  const getMaxStep = () => {
    return fields.length > 0 ? Math.max(...fields.map(f => f.step || 1)) : 0;
  };

  const getFieldsByStep = (step: number) => {
    return fields.filter(f => (f.step || 1) === step);
  };

  return (
    <>
      <div id="admin-additional-verification" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide">
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Additional <br/> <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                    Verification
                  </span>
                </h1>
                <p className="text-muted-foreground mt-4">Configure questionnaires and review user submissions</p>
              </div>
            </div>

            <AdminNavigation />

            <MagicBadge title="Questionnaire Builder" className="mb-6"/>

            {/* Questionnaire Builder Section */}
            <Card className="border border-border rounded-xl mb-10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" />
                    {currentQuestionnaire ? 'Edit Questionnaire' : 'Create Questionnaire'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsQuestionnaireExpanded(!isQuestionnaireExpanded)}
                    className="h-8 w-8"
                  >
                    {isQuestionnaireExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              {isQuestionnaireExpanded && (
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div>
                  <Label className="text-sm text-muted-foreground mb-1 block">Title *</Label>
                  <Input
                    placeholder="Questionnaire Title"
                    value={builder.title}
                    onChange={event => setBuilder(prev => ({ ...prev, title: event.target.value }))}
                    className="bg-background/50 border-border"
                  />
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Questions ({fields.length})</Label>
                <Button
                      onClick={handleAddField}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                </div>

                  {fields.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg p-8 text-center">
                      <p className="text-muted-foreground">No questions yet. Click "Add Question" to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Array.from({ length: getMaxStep() }, (_, stepIndex) => {
                        const step = stepIndex + 1;
                        const stepFields = getFieldsByStep(step);
                        if (stepFields.length === 0) return null;
                        
                        return (
                          <Card key={step} className="border border-border/50">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                Step {step}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {stepFields.map((field, index) => {
                                const globalIndex = fields.findIndex(f => f === field);
                                return (
                                  <div
                                    key={globalIndex}
                                    className="flex items-start gap-3 p-3 bg-background/30 rounded-lg border border-border/50"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm">{field.title}</span>
                                        {field.required && (
                                          <Badge variant="outline" className="text-xs">Required</Badge>
                                        )}
                                        <Badge variant="outline" className="text-xs capitalize">{field.type}</Badge>
                </div>
                                      {field.description && (
                                        <p className="text-xs text-muted-foreground mb-1">{field.description}</p>
                                      )}
                                      <p className="text-xs text-muted-foreground">
                                        Key: <code className="bg-muted px-1 rounded">{field.key}</code>
                                        {field.type === 'select' && field.options && (
                                          <span className="ml-2">
                                            • {field.options.length} option{field.options.length !== 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </p>
                </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleMoveField(globalIndex, 'up')}
                                        disabled={globalIndex === 0}
                                      >
                                        <ChevronUp className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleMoveField(globalIndex, 'down')}
                                        disabled={globalIndex === fields.length - 1}
                                      >
                                        <ChevronDown className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleEditField(globalIndex)}
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-600"
                                        onClick={() => handleDeleteField(globalIndex)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleSaveQuestionnaire}
                    disabled={isSavingQuestionnaire || !builder.title.trim() || fields.length === 0}
                    className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 ml-auto"
                >
                  {isSavingQuestionnaire ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                        {currentQuestionnaire ? 'Update Questionnaire' : 'Create Questionnaire'}
                    </>
                  )}
                </Button>
                          </div>
              </CardContent>
              )}
            </Card>


            <MagicBadge title="User Submissions" className="mb-6"/>

            {/* Search Bar */}
            <div className="group w-full border border-border rounded-xl p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by user name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {debouncedSearch && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-muted-foreground">
                      Searching for: <span className="text-foreground font-semibold">"{debouncedSearch}"</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Submissions Section */}
            <Card className="border border-border rounded-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Submissions
                    {totalItems > 0 && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        ({totalItems} {totalItems === 1 ? 'submission' : 'submissions'})
                      </span>
                    )}
                  </CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => fetchSubmissions(page)}
                    disabled={isLoadingSubmissions}
                    className="flex items-center gap-2"
                  >
                    {isLoadingSubmissions ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingSubmissions && submissions.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="w-full border border-border rounded-xl p-10 text-center">
                    {debouncedSearch ? (
                      <>
                        <p className="text-muted-foreground mb-2">No submissions match your search</p>
                        <p className="text-sm text-muted-foreground">Try a different search term</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchQuery('')}
                          className="mt-4"
                        >
                          Clear Search
                        </Button>
                      </>
                    ) : (
                      <p className="text-muted-foreground">No submissions yet.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map(submission => (
                      <Card key={submission._id} className="border border-border rounded-xl hover:border-purple-500/50 transition-colors">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center">
                                  <User className="w-6 h-6" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold">{submission.user?.name || 'User'}</h3>
                                  <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Mail size={14} />
                                    {submission.user?.email || 'No email'}
                                  </div>
                                </div>
                              </div>
                              <Badge 
                                className={
                                  submission.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' :
                                  submission.status === 'approved' ? 'bg-green-500/20 text-green-500 border border-green-500/50' :
                                  submission.status === 'rejected' ? 'bg-red-500/20 text-red-500 border border-red-500/50' :
                                  'bg-blue-500/20 text-blue-500 border border-blue-500/50'
                                }
                              >
                                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                              </Badge>
                            </div>

                            {submission.documents.length > 0 && (
                              <div className="pt-3 border-t border-border">
                                <p className="text-xs text-gray-400 mb-2">Documents:</p>
                                <div className="flex flex-wrap gap-2 flex-col">
                                  {submission.documents.map(doc => (
                                    <div key={doc.fileId} className="flex items-center gap-1">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePreview(doc.fileId, doc.filename)}
                                        disabled={loadingPreviewId === doc.fileId}
                                        className="flex items-center gap-2"
                                      >
                                        {loadingPreviewId === doc.fileId ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Eye className="w-3 h-3" />
                                        )}
                                        Preview
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownload(doc.fileId, doc.filename)}
                                        className="flex items-center gap-2"
                                      >
                                        <FileDown className="w-3 h-3" />
                                        Download
                                      </Button>
                                      <span className="text-xs text-muted-foreground px-2 py-1">{doc.filename}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="pt-3 border-t border-border">
                              <div className="flex flex-wrap gap-2">
                                {['pending', 'approved', 'rejected'].map(status => (
                                  <Button
                                    key={status}
                                    variant="outline"
                                    size="sm"
                                    disabled={isUpdatingSubmission || submission.status === status}
                                    onClick={() => handleStatusUpdate(submission._id, status)}
                                    className={
                                      status === 'approved' ? 'hover:bg-green-600/20 hover:border-green-500' :
                                      status === 'rejected' ? 'hover:bg-red-600/20 hover:border-red-500' :
                                      ''
                                    }
                                  >
                                    {status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                                    {status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </Button>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    // Fetch full submission details
                                    try {
                                      const response = await apiFetch(`/additional-verification/admin/submissions/${submission._id}`, {
                                        headers: { Authorization: `Bearer ${token}` },
                                      });
                                      const data = await response.json();
                                      if (response.ok && data.success) {
                                        setSelectedSubmission(data.data);
                                      } else {
                                        toast.error('Failed to load submission details');
                                      }
                                    } catch (error) {
                                      console.error(error);
                                      toast.error('Failed to load submission details');
                                    }
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="w-3 h-3" />
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-6 border-t border-border text-sm">
                    <span className="text-muted-foreground">
                      Page {page} of {totalPages} • {totalItems} submissions
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (page > 1) {
                            const prevPage = page - 1;
                            setPage(prevPage);
                            fetchSubmissions(prevPage);
                          }
                        }}
                        disabled={page === 1 || isLoadingSubmissions}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (page < totalPages) {
                            const nextPage = page + 1;
                            setPage(nextPage);
                            fetchSubmissions(nextPage);
                          }
                        }}
                        disabled={page === totalPages || isLoadingSubmissions}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submission Details Dialog */}
            <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Submission Details
                  </DialogTitle>
                  <DialogDescription>
                    View user information, questionnaire answers, and documents
                  </DialogDescription>
                </DialogHeader>
                {selectedSubmission && (
                  <div className="space-y-6 mt-4">
                  {/* User Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">User Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Name</Label>
                        <p className="text-sm font-medium">{selectedSubmission.user?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Email</Label>
                        <p className="text-sm font-medium">{selectedSubmission.user?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Status</Label>
                        <Badge 
                          className={
                            selectedSubmission.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' :
                            selectedSubmission.status === 'approved' ? 'bg-green-500/20 text-green-500 border border-green-500/50' :
                            selectedSubmission.status === 'rejected' ? 'bg-red-500/20 text-red-500 border border-red-500/50' :
                            'bg-blue-500/20 text-blue-500 border border-blue-500/50'
                          }
                        >
                          {selectedSubmission.status.charAt(0).toUpperCase() + selectedSubmission.status.slice(1)}
                        </Badge>
                      </div>
                      {selectedSubmission.createdAt && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Submitted</Label>
                          <p className="text-sm font-medium">
                            {new Date(selectedSubmission.createdAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Questionnaire Answers */}
                  {selectedSubmission.questionnaire && selectedSubmission.answers && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <h3 className="text-lg font-semibold">Questionnaire Answers</h3>
                      <div className="space-y-4">
                        {selectedSubmission.questionnaire.fields.map((field) => {
                          const answer = selectedSubmission.answers?.find(a => a.fieldKey === field.key);
                          return (
                            <div key={field.key} className="p-4 bg-background/30 rounded-lg border border-border/50">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Label className="text-sm font-medium">{field.title}</Label>
                                    {field.required && (
                                      <Badge variant="outline" className="text-xs">Required</Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs capitalize">{field.type}</Badge>
                                  </div>
                                  {field.description && (
                                    <p className="text-sm text-muted-foreground mb-2">{field.description}</p>
                                  )}
                                  {answer ? (
                                    <div className="mt-2">
                                      {field.type === 'textarea' ? (
                                        <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/40 p-3 rounded border border-border">
                                          {String(answer.value || 'N/A')}
                                        </p>
                                      ) : (
                                        <p className="text-sm text-foreground font-medium">
                                          {String(answer.value || 'N/A')}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">No answer provided</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {selectedSubmission.documents && selectedSubmission.documents.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <h3 className="text-lg font-semibold">Documents</h3>
                      <div className="space-y-2">
                        {selectedSubmission.documents.map(doc => (
                          <div
                            key={doc.fileId}
                            className="flex items-center justify-between p-3 bg-background/30 rounded-lg border border-border/50"
                          >
                            <div className="flex items-center gap-3">
                              {doc.mimeType?.startsWith('image/') ? (
                                <ImageIcon className="w-5 h-5 text-purple-500" />
                              ) : (
                                <File className="w-5 h-5 text-purple-500" />
                              )}
                              <div>
                                <p className="text-sm font-medium">{doc.filename}</p>
                                {doc.size && (
                                  <p className="text-xs text-muted-foreground">
                                    {(doc.size / 1024).toFixed(1)} KB
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                    <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreview(doc.fileId, doc.filename)}
                                disabled={loadingPreviewId === doc.fileId}
                                className="flex items-center gap-2"
                              >
                                {loadingPreviewId === doc.fileId ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                                Preview
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(doc.fileId, doc.filename)}
                                className="flex items-center gap-2"
                              >
                                <FileDown className="w-3 h-3" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Note */}
                  {selectedSubmission.reviewNote && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <Label className="text-sm font-semibold">Review Note</Label>
                      <p className="text-sm text-foreground bg-muted/40 p-3 rounded border border-border">
                        {selectedSubmission.reviewNote}
                      </p>
                    </div>
                  )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </MaxWidthWrapper>
      </div>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFieldIndex !== null ? 'Edit Question' : 'Add Question'}
            </DialogTitle>
            <DialogDescription>
              Configure your question with type and options. Key and step number will be generated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Question Title *</Label>
              <Input
                placeholder="e.g., What is your full name?"
                value={currentField.title || ''}
                onChange={e => setCurrentField(prev => ({ ...prev, title: e.target.value }))}
                className="bg-background/50 border-border"
              />
              <p className="text-xs text-muted-foreground mt-1">The main question text displayed to users</p>
            </div>
            <div>
              <Label>Question Description (Optional)</Label>
              <Textarea
                placeholder="e.g., Please provide your full legal name as it appears on your identification documents."
                value={currentField.description || ''}
                onChange={e => setCurrentField(prev => ({ ...prev, description: e.target.value }))}
                className="bg-background/50 border-border min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground mt-1">Smaller paragraph text displayed below the title</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Question Type *</Label>
                <Select
                  value={currentField.type || 'text'}
                  onValueChange={value => {
                    setCurrentField(prev => {
                      // Only reset options if changing FROM select TO something else
                      // If changing TO select, preserve existing options or initialize empty array
                      if (value === 'select') {
                        return {
                          ...prev,
                          type: value as any,
                          options: prev.options || []
                        };
                      } else {
                        return {
                          ...prev,
                          type: value as any,
                          options: undefined
                        };
                      }
                    });
                  }}
                >
                  <SelectTrigger className="bg-background/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Input</SelectItem>
                    <SelectItem value="textarea">Text Area</SelectItem>
                    <SelectItem value="select">Multiple Choice</SelectItem>
                    <SelectItem value="date">Date Picker</SelectItem>
                    <SelectItem value="file">File Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="required"
                    checked={currentField.required || false}
                    onChange={e => setCurrentField(prev => ({ ...prev, required: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="required" className="cursor-pointer">Required</Label>
                </div>
              </div>
            </div>
            {currentField.type !== 'select' && currentField.type !== 'date' && currentField.type !== 'file' && (
              <div>
                <Label>Placeholder</Label>
                <Input
                  placeholder="Optional placeholder text"
                  value={currentField.placeholder || ''}
                  onChange={e => setCurrentField(prev => ({ ...prev, placeholder: e.target.value }))}
                  className="bg-background/50 border-border"
                />
              </div>
            )}
            {currentField.type === 'select' && (
              <div>
                <Label>Answer Options *</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter an option"
                      value={newOption}
                      onChange={e => setNewOption(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleAddOption()}
                      className="bg-background/50 border-border"
                    />
                    <Button
                      type="button"
                      onClick={handleAddOption}
                      disabled={!newOption.trim()}
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {currentField.options && currentField.options.length > 0 && (
                    <div className="space-y-1">
                      {currentField.options.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-background/30 rounded border border-border"
                        >
                          <span className="text-sm">{option}</span>
                          <Button
                            type="button"
                      variant="ghost"
                      size="icon"
                            className="h-6 w-6 text-red-500"
                            onClick={() => handleRemoveOption(index)}
                    >
                            <X className="w-3 h-3" />
                    </Button>
                  </div>
                      ))}
                    </div>
                  )}
                  {(!currentField.options || currentField.options.length === 0) && (
                    <p className="text-xs text-muted-foreground">Add at least one option</p>
            )}
          </div>
      </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setShowQuestionDialog(false);
                  setCurrentField({ type: 'text', required: false, options: [] });
                  setEditingFieldIndex(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveField}
                disabled={!currentField.title || (currentField.type === 'select' && (!currentField.options || currentField.options.length === 0))}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {editingFieldIndex !== null ? 'Update Question' : 'Add Question'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewFile?.type === 'image' && <ImageIcon className="w-5 h-5" />}
              {previewFile?.type === 'pdf' && <File className="w-5 h-5" />}
              {previewFile?.type === 'other' && <FileText className="w-5 h-5" />}
              {previewFile?.filename}
            </DialogTitle>
            <DialogDescription>
              File preview - Click download to save the file
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {previewFile && (
              <>
                {previewFile.type === 'image' && (
                  <div className="flex items-center justify-center bg-muted/20 rounded-lg p-4">
                    <img
                      src={previewFile.url}
                      alt={previewFile.filename}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg"
                      onError={() => toast.error('Failed to load image')}
                    />
                  </div>
                )}
                {previewFile.type === 'pdf' && (
                  <div className="flex items-center justify-center bg-muted/20 rounded-lg p-4 min-h-[500px]">
                    <iframe
                      src={previewFile.url}
                      className="w-full h-[70vh] rounded-lg border border-border"
                      title={previewFile.filename}
                    />
                  </div>
                )}
                {previewFile.type === 'other' && (
                  <div className="flex flex-col items-center justify-center bg-muted/20 rounded-lg p-8 min-h-[300px]">
                    <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Preview not available for this file type
                    </p>
                    <Button
                      onClick={() => previewFile && handleDownload(previewFile.fileId, previewFile.filename)}
                      className="flex items-center gap-2"
                    >
                      <FileDown className="w-4 h-4" />
                      Download File
                    </Button>
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => previewFile && handleDownload(previewFile.fileId, previewFile.filename)}
                    className="flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={closePreview}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminAdditionalVerification;
