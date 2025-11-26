import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';

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

  const fetchSubmissions = useCallback(async (requestedPage = 1) => {
    if (!token || !user?.isAdmin) return;
    setIsLoadingSubmissions(true);
    setSelectedSubmission(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(requestedPage));
      params.set('limit', String(PAGE_SIZE));

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
  }, [token, user?.isAdmin]);

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Admin access required');
      navigate('/dashboard');
      return;
    }
  }, [user?.isAdmin, navigate]);

  useEffect(() => {
    if (!token || !user?.isAdmin) return;
    fetchQuestionnaires();
    setPage(1);
    fetchSubmissions(1);
  }, [token, user?.isAdmin, fetchSubmissions]);

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
        fetchSubmissions();
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

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-10">
      <section className="rounded-xl border border-border/60 p-6 bg-background/60">
        <h1 className="text-3xl font-semibold mb-4">Admin: Additional Verification</h1>
        <p className="text-sm text-muted-foreground">
          Configure questionnaires and review user submissions. Design polish will be added later.
        </p>
      </section>

      <section className="rounded-xl border border-border/60 p-6 bg-background/60 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Questionnaire Builder</h2>
          <p className="text-sm text-muted-foreground">Enter basic info and provide JSON for fields.</p>
        </div>
        <input
          className="w-full border border-border rounded-md bg-background px-3 py-2"
          placeholder="Title"
          value={builder.title}
          onChange={event => setBuilder(prev => ({ ...prev, title: event.target.value }))}
        />
        <textarea
          className="w-full border border-border rounded-md bg-background px-3 py-2 min-h-[80px]"
          placeholder="Description"
          value={builder.description}
          onChange={event => setBuilder(prev => ({ ...prev, description: event.target.value }))}
        />
        <select
          className="w-full border border-border rounded-md bg-background px-3 py-2"
          value={builder.status}
          onChange={event => setBuilder(prev => ({ ...prev, status: event.target.value }))}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <textarea
          className="w-full border border-border rounded-md bg-background px-3 py-2 min-h-[160px]"
          value={builder.fieldsJson}
          onChange={event => setBuilder(prev => ({ ...prev, fieldsJson: event.target.value }))}
        />
        <button
          className="px-4 py-2 rounded-md bg-purple-600 text-white disabled:opacity-60"
          onClick={handleSaveQuestionnaire}
          disabled={isSavingQuestionnaire}
        >
          {isSavingQuestionnaire ? 'Saving...' : 'Save Questionnaire'}
        </button>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Existing questionnaires: {questionnaires.length}</p>
          <ul className="list-disc list-inside">
            {questionnaires.map(q => (
              <li key={q._id}>
                {q.title} • {q.status} • {q.fields.length} fields
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 p-6 bg-background/60">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">User Submissions</h2>
            <p className="text-sm text-muted-foreground">Approve, reject, or review details.</p>
          </div>
          <button
            className="px-3 py-2 rounded-md border border-border text-sm"
            onClick={() => fetchSubmissions(page)}
            disabled={isLoadingSubmissions}
          >
            {isLoadingSubmissions ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="space-y-4">
            {submissions.map(submission => (
              <div
                key={submission._id}
                className="border border-border/60 rounded-md p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{submission.user?.name || 'User'}</p>
                    <p className="text-sm text-muted-foreground">{submission.user?.email}</p>
                  </div>
                  <span className="text-sm capitalize">{submission.status}</span>
                </div>
                {submission.documents.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {submission.documents.map(doc => (
                      <button
                        key={doc.fileId}
                        className="underline mr-2"
                        type="button"
                        onClick={() => handleDownload(doc.fileId, doc.filename)}
                      >
                        {doc.filename}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  {['pending', 'reviewed', 'approved', 'rejected'].map(status => (
                    <button
                      key={status}
                      className="px-2 py-1 border border-border rounded text-xs"
                      disabled={isUpdatingSubmission}
                      onClick={() => handleStatusUpdate(submission._id, status)}
                    >
                      {status}
                    </button>
                  ))}
                  <button
                    className="px-2 py-1 border border-border rounded text-xs"
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    View details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages} • {totalItems} submissions
            </span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 border border-border rounded disabled:opacity-50"
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
              </button>
              <button
                className="px-3 py-1 border border-border rounded disabled:opacity-50"
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
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedSubmission && (
        <section className="rounded-xl border border-border/60 p-6 bg-background/60">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Submission details</h3>
            <button className="text-sm underline" onClick={() => setSelectedSubmission(null)}>
              Close
            </button>
          </div>
          <pre className="bg-muted/40 border border-border rounded-md p-4 text-xs overflow-x-auto">
            {JSON.stringify(selectedSubmission, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
};

export default AdminAdditionalVerification;

