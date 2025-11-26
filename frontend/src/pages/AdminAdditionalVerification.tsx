import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileText, User, Mail, CheckCircle, XCircle, Eye, RefreshCw, Loader2, X, FileDown, ClipboardList, Send, Image as ImageIcon, File, Search } from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';
import AdminNavigation from '../components/AdminNavigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';

interface QuestionnaireField {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

interface Questionnaire {
  _id: string;
  title: string;
  status: string;
  fields: QuestionnaireField[];
}

const PAGE_SIZE = 10;

interface Submission {
  _id: string;
  status: string;
  user?: { name: string; email: string };
  documents: { fileId: string; filename: string }[];
}

const AdminAdditionalVerification: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [builder, setBuilder] = useState({
    title: '',
    description: '',
    status: 'draft',
    fieldsJson: JSON.stringify([
      { key: 'fullName', label: 'Full Name', type: 'text', required: true },
    ], null, 2),
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

  // Check if user is admin
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

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!token || !user?.isAdmin) return;
    fetchQuestionnaires();
  }, [token, user?.isAdmin]);

  // Fetch submissions when search changes or component mounts
  useEffect(() => {
    if (!token || !user?.isAdmin) return;
    setPage(1);
    fetchSubmissions(1);
  }, [token, user?.isAdmin, debouncedSearch, fetchSubmissions]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewFile?.url) {
        window.URL.revokeObjectURL(previewFile.url);
      }
    };
  }, [previewFile]);

  const fetchQuestionnaires = async () => {
    if (!token) return;
    try {
      const response = await apiFetch('/additional-verification/admin/questionnaires', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setQuestionnaires(data.data || []);
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to load questionnaires');
    }
  };

  const handleSaveQuestionnaire = async () => {
    if (!token) return;

    let parsedFields: QuestionnaireField[] = [];
    try {
      parsedFields = JSON.parse(builder.fieldsJson);
    } catch (error) {
      toast.error('Fields must be valid JSON');
      return;
    }

    setIsSavingQuestionnaire(true);
    try {
      const response = await apiFetch('/additional-verification/admin/questionnaires', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: builder.title,
          description: builder.description,
          status: builder.status,
          fields: parsedFields,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Questionnaire saved');
        setBuilder(prev => ({ ...prev, title: '', description: '' }));
        fetchQuestionnaires();
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
      
      // Determine file type from extension
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

            {/* Admin Navigation */}
            <AdminNavigation />

            <MagicBadge title="Questionnaire Builder" className="mb-6"/>

            {/* Questionnaire Builder Section */}
            <Card className="border border-border rounded-xl mb-10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Create New Questionnaire
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Title</label>
                  <Input
                    placeholder="Questionnaire Title"
                    value={builder.title}
                    onChange={event => setBuilder(prev => ({ ...prev, title: event.target.value }))}
                    className="bg-background/50 border-border"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Description</label>
                  <Textarea
                    placeholder="Questionnaire Description"
                    value={builder.description}
                    onChange={event => setBuilder(prev => ({ ...prev, description: event.target.value }))}
                    className="bg-background/50 border-border min-h-[80px]"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Status</label>
                  <Select
                    value={builder.status}
                    onValueChange={value => setBuilder(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-background/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Fields JSON</label>
                  <Textarea
                    placeholder="Enter fields as JSON array"
                    value={builder.fieldsJson}
                    onChange={event => setBuilder(prev => ({ ...prev, fieldsJson: event.target.value }))}
                    className="bg-background/50 border-border min-h-[160px] font-mono text-xs"
                  />
                </div>
                <Button
                  onClick={handleSaveQuestionnaire}
                  disabled={isSavingQuestionnaire}
                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                >
                  {isSavingQuestionnaire ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Save Questionnaire
                    </>
                  )}
                </Button>
                {questionnaires.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Existing questionnaires: {questionnaires.length}</p>
                    <div className="space-y-2">
                      {questionnaires.map(q => (
                        <div key={q._id} className="flex items-center justify-between p-2 bg-background/30 rounded-md border border-border/50">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{q.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {q.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{q.fields.length} fields</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <MagicBadge title="User Submissions" className="mb-6"/>

            {/* Search Bar */}
            <div className="group w-full border border-border rounded-xl p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
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
                            {/* Submission Header */}
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

                            {/* Documents */}
                            {submission.documents.length > 0 && (
                              <div className="pt-3 border-t border-border">
                                <p className="text-xs text-gray-400 mb-2">Documents:</p>
                                <div className="flex flex-wrap gap-2">
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

                            {/* Actions */}
                            <div className="pt-3 border-t border-border">
                              <div className="flex flex-wrap gap-2">
                                {['pending', 'reviewed', 'approved', 'rejected'].map(status => (
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
                                  onClick={() => setSelectedSubmission(submission)}
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

            {/* Submission Details Modal */}
            {selectedSubmission && (
              <Card className="border border-border rounded-xl mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Submission Details
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedSubmission(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted/40 border border-border rounded-md p-4 text-xs overflow-x-auto">
                    {JSON.stringify(selectedSubmission, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        </MaxWidthWrapper>
      </div>

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

