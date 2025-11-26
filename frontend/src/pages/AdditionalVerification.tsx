import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';

interface QuestionnaireField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date';
  required?: boolean;
  options?: string[];
}

interface Questionnaire {
  _id: string;
  title: string;
  description?: string;
  fields: QuestionnaireField[];
}

interface DocumentMeta {
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface Submission {
  _id: string;
  status: string;
  createdAt: string;
  documents: DocumentMeta[];
}

const AdditionalVerification: React.FC = () => {
  const { token } = useAuth();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState({
    addressLine1: '',
    city: '',
    country: '',
    dateOfBirth: '',
  });
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    if (!token) return;
    fetchQuestionnaires();
    fetchSubmissions();
  }, [token]);

  const fetchQuestionnaires = async () => {
    try {
      const response = await apiFetch('/additional-verification/questionnaires/active', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const list = data.data || [];
        setQuestionnaires(list);
        if (list.length && !selectedQuestionnaireId) {
          setSelectedQuestionnaireId(list[0]._id);
        }
      } else {
        toast.error(data.message || 'Unable to load questionnaire');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load questionnaire');
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await apiFetch('/additional-verification/my', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubmissions(data.data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAnswerChange = (fieldKey: string, value: string) => {
    setAnswers(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!token) {
      toast.error('You must be logged in to upload files');
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiFetch('/additional-verification/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDocuments(prev => [...prev, data.data]);
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error(error);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      toast.error('You must be logged in');
      return;
    }

    if (!selectedQuestionnaireId) {
      toast.error('Select a questionnaire first');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        questionnaireId: selectedQuestionnaireId,
        profile,
        answers: Object.entries(answers).map(([fieldKey, value]) => ({ fieldKey, value })),
        documents,
      };

      const response = await apiFetch('/additional-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Submission sent for review');
        setDocuments([]);
        setAnswers({});
        fetchSubmissions();
      } else {
        const errorText = Array.isArray(data.errors) ? data.errors.join(', ') : data.message;
        toast.error(errorText || 'Failed to submit verification');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeQuestionnaire = questionnaires.find(q => q._id === selectedQuestionnaireId);

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      <section className="rounded-xl border border-border/60 p-6 bg-background/60">
        <h1 className="text-2xl font-semibold mb-2">Additional Verification</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Upload supporting documents and answer a short questionnaire so our compliance team can verify your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Questionnaire</label>
            <select
              className="w-full border border-border rounded-md bg-background px-3 py-2"
              value={selectedQuestionnaireId}
              onChange={event => setSelectedQuestionnaireId(event.target.value)}
            >
              <option value="">Select questionnaire</option>
              {questionnaires.map(questionnaire => (
                <option key={questionnaire._id} value={questionnaire._id}>
                  {questionnaire.title}
                </option>
              ))}
            </select>
            {activeQuestionnaire?.description && (
              <p className="text-xs text-muted-foreground">{activeQuestionnaire.description}</p>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Profile Information</h2>
            <input
              className="w-full border border-border rounded-md bg-background px-3 py-2"
              placeholder="Address line"
              value={profile.addressLine1}
              onChange={event => handleProfileChange('addressLine1', event.target.value)}
            />
            <input
              className="w-full border border-border rounded-md bg-background px-3 py-2"
              placeholder="City"
              value={profile.city}
              onChange={event => handleProfileChange('city', event.target.value)}
            />
            <input
              className="w-full border border-border rounded-md bg-background px-3 py-2"
              placeholder="Country"
              value={profile.country}
              onChange={event => handleProfileChange('country', event.target.value)}
            />
            <div className="flex flex-col">
              <label className="text-sm text-muted-foreground mb-1">Date of Birth</label>
              <input
                type="date"
                className="border border-border rounded-md bg-background px-3 py-2"
                value={profile.dateOfBirth}
                onChange={event => handleProfileChange('dateOfBirth', event.target.value)}
              />
            </div>
          </div>

          {activeQuestionnaire && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Questionnaire</h2>
              {activeQuestionnaire.fields.map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-sm font-medium">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="w-full border border-border rounded-md bg-background px-3 py-2 min-h-[100px]"
                      value={answers[field.key] || ''}
                      onChange={event => handleAnswerChange(field.key, event.target.value)}
                    />
                  ) : field.type === 'select' && field.options ? (
                    <select
                      className="w-full border border-border rounded-md bg-background px-3 py-2"
                      value={answers[field.key] || ''}
                      onChange={event => handleAnswerChange(field.key, event.target.value)}
                    >
                      <option value="">Select</option>
                      {field.options.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'date' ? 'date' : 'text'}
                      className="w-full border border-border rounded-md bg-background px-3 py-2"
                      value={answers[field.key] || ''}
                      onChange={event => handleAnswerChange(field.key, event.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Documents</h2>
            <p className="text-sm text-muted-foreground">
              Accepted formats: JPG, JPEG, PNG, GIF, WEBP, PDF • Max size 10&nbsp;MB per file
            </p>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.gif,.webp"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {documents.length > 0 && (
              <ul className="text-sm text-muted-foreground">
                {documents.map(doc => (
                  <li key={doc.fileId}>
                    {doc.filename} ({(doc.size / 1024).toFixed(1)} KB)
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-purple-600 text-white disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border/60 p-6 bg-background/60">
        <h2 className="text-lg font-semibold mb-4">Previous submissions</h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((submission) => (
              <div key={submission._id} className="rounded border border-border/40 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{submission.status}</span>
                  <span className="text-muted-foreground">
                    {new Date(submission.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {submission.documents.length > 0 && (
                  <ul className="mt-2 text-xs text-muted-foreground">
                    {submission.documents.map(doc => (
                      <li key={`${submission._id}-${doc.fileId}`}>{doc.filename}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdditionalVerification;

