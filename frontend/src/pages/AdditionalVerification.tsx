import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { 
  FileText, Loader2, CheckCircle2, Upload, X, ArrowRight, ArrowLeft, 
  FileDown, Image as ImageIcon, File, Clock, CheckCircle, XCircle
} from 'lucide-react';
import MaxWidthWrapper from '../components/helpers/max-width-wrapper';
import MagicBadge from '../components/ui/magic-badge';

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
  reviewNote?: string;
}

const AdditionalVerification: React.FC = () => {
  const { token } = useAuth();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<Record<string, DocumentMeta[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const dateInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchQuestionnaire = useCallback(async () => {
    try {
      const response = await apiFetch('/additional-verification/questionnaires/active', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const list = data.data || [];
        // Get the first active questionnaire
        if (list.length > 0) {
          setQuestionnaire(list[0]);
        }
      } else {
        toast.error(data.message || 'Unable to load questionnaire');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load questionnaire');
    }
  }, [token]);

  const fetchSubmissions = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchQuestionnaire();
    fetchSubmissions();
  }, [token, fetchQuestionnaire, fetchSubmissions]);

  const getMaxStep = () => {
    if (!questionnaire || !questionnaire.fields.length) return 0;
    return Math.max(...questionnaire.fields.map(f => f.step || 1));
  };

  const getFieldsByStep = (step: number) => {
    if (!questionnaire) return [];
    return questionnaire.fields.filter(f => (f.step || 1) === step);
  };

  const getStepFields = (step: number) => {
    return getFieldsByStep(step);
  };

  const handleAnswerChange = (fieldKey: string, value: string) => {
    setAnswers(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleFileChange = async (fieldKey: string, event: React.ChangeEvent<HTMLInputElement>) => {
    if (!token) {
      toast.error('You must be logged in to upload files');
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const currentDocs = documents[fieldKey] || [];
    if (currentDocs.length >= 5) {
      toast.error('Maximum 5 files allowed for this question');
      return;
    }

    setIsUploading(prev => ({ ...prev, [fieldKey]: true }));
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
        setDocuments(prev => ({
          ...prev,
          [fieldKey]: [...(prev[fieldKey] || []), data.data]
        }));
        toast.success('File uploaded successfully');
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error(error);
      toast.error('Upload failed');
    } finally {
      setIsUploading(prev => ({ ...prev, [fieldKey]: false }));
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemoveDocument = (fieldKey: string, fileId: string) => {
    setDocuments(prev => ({
      ...prev,
      [fieldKey]: (prev[fieldKey] || []).filter(doc => doc.fileId !== fileId)
    }));
  };

  const validateStep = (step: number): boolean => {
    if (!questionnaire) return false;
    const stepFields = getStepFields(step);
    
    for (const field of stepFields) {
      if (field.required) {
        if (field.type === 'file') {
          const fieldDocs = documents[field.key] || [];
          if (fieldDocs.length === 0) {
            toast.error(`Please upload at least one file for: ${field.title}`);
            return false;
          }
        } else {
          if (!answers[field.key]?.trim()) {
            toast.error(`Please fill in: ${field.title}`);
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleNext = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!validateStep(currentStep)) return;
    const maxStep = getMaxStep();
    if (currentStep < maxStep) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Only submit if we're on the last step
    const maxStep = getMaxStep();
    if (currentStep < maxStep) {
      // If not on last step, just go to next step instead
      handleNext();
      return;
    }
    
    if (!token) {
      toast.error('You must be logged in');
      return;
    }

    if (!questionnaire) {
      toast.error('No questionnaire available');
      return;
    }

    // Validate all steps
    for (let step = 1; step <= maxStep; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Collect all documents from all file fields
      const allDocuments: DocumentMeta[] = [];
      Object.entries(documents).forEach(([fieldKey, docs]) => {
        allDocuments.push(...docs);
      });

      const payload = {
        questionnaireId: questionnaire._id,
        answers: Object.entries(answers).map(([fieldKey, value]) => ({ fieldKey, value })),
        documents: allDocuments,
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
        setDocuments({});
        setAnswers({});
        setCurrentStep(1);
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

  const renderField = (field: QuestionnaireField) => {
    const value = answers[field.key] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder || `Enter your answer`}
            value={value}
            onChange={e => handleAnswerChange(field.key, e.target.value)}
            className="bg-background/50 border-border min-h-[100px]"
            required={field.required}
          />
        );
      case 'select':
  return (
          <Select
            value={value}
            onValueChange={val => handleAnswerChange(field.key, val)}
            required={field.required}
          >
            <SelectTrigger className="bg-background/50 border-border">
              <SelectValue placeholder={field.placeholder || `Select ${field.title.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'date':
        return (
          <Input
            ref={el => {
              if (el) dateInputRefs.current[field.key] = el;
            }}
            type="date"
            value={value}
            onChange={e => handleAnswerChange(field.key, e.target.value)}
            onClick={(e) => {
              // Ensure the date picker opens on click
              e.stopPropagation();
              const input = dateInputRefs.current[field.key];
              if (input) {
                // Focus the input first
                input.focus();
                // Try to programmatically open the picker (modern browsers)
                if ('showPicker' in input && typeof input.showPicker === 'function') {
                  try {
                    input.showPicker();
                  } catch (err) {
                    // showPicker might fail in some cases (e.g., not user-initiated)
                    // That's okay, the native behavior will handle it
                  }
                }
              }
            }}
            onMouseDown={(e) => {
              // Prevent form handlers from interfering
              e.stopPropagation();
            }}
            className="bg-background/50 border-border cursor-pointer"
            required={field.required}
          />
        );
      case 'file':
        const fieldDocs = documents[field.key] || [];
        const isUploadingField = isUploading[field.key] || false;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <input
                ref={el => {
                  if (el) fileInputRefs.current[field.key] = el;
                }}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.gif,.webp"
                onChange={e => handleFileChange(field.key, e)}
                disabled={isUploadingField || fieldDocs.length >= 5}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                disabled={isUploadingField || fieldDocs.length >= 5}
                onClick={() => fileInputRefs.current[field.key]?.click()}
                className="flex items-center gap-2"
              >
                {isUploadingField ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload File
                  </>
                )}
              </Button>
              {fieldDocs.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {fieldDocs.length} file{fieldDocs.length !== 1 ? 's' : ''} uploaded
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Accepted formats: JPG, JPEG, PNG, GIF, WEBP, PDF • Max size 10MB per file • Max 5 files
            </p>
            {fieldDocs.length > 0 && (
              <div className="space-y-2">
                {fieldDocs.map(doc => (
                  <div
                    key={doc.fileId}
                    className="flex items-center justify-between p-3 bg-background/30 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      {doc.mimeType?.startsWith('image/') ? (
                        <ImageIcon className="w-5 h-5 text-purple-500" />
                      ) : (
                        <File className="w-5 h-5 text-purple-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{doc.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {(doc.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDocument(field.key, doc.fileId)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return (
          <Input
            type="text"
            placeholder={field.placeholder || `Answer`}
            value={value}
            onChange={e => handleAnswerChange(field.key, e.target.value)}
            className="bg-background/50 border-border"
            required={field.required}
          />
        );
    }
  };

  const latestSubmission = useMemo(() => {
    if (!submissions.length) return null;
    return [...submissions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [submissions]);

  useEffect(() => {
    if (!token) return;
    if (!latestSubmission || latestSubmission.status !== 'pending') return;

    const interval = setInterval(() => {
      fetchSubmissions();
    }, 15000);

    return () => clearInterval(interval);
  }, [token, latestSubmission, fetchSubmissions]);

  const maxStep = getMaxStep();
  const currentStepFields = getStepFields(currentStep);
  const verificationLevel = latestSubmission?.status === 'approved' ? 2 : 1;
  // Show form if no submission OR if submission was rejected (user can resubmit)
  const shouldShowForm = !latestSubmission || latestSubmission.status === 'rejected';
  // Show status card if there's a submission (for all statuses: approved, pending, or rejected)
  const shouldShowStatusCard = !!latestSubmission;

  const renderStatusCard = () => {
    if (!latestSubmission) return null;
    const submittedAt = new Date(latestSubmission.createdAt).toLocaleString();

    if (latestSubmission.status === 'approved') {
      return (
        <Card className="border border-green-500/40 rounded-xl bg-green-500/5">
          <CardContent className="p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-300">Additional verification</p>
                <h3 className="text-2xl font-bold text-foreground mt-2 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  Approved
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your documents have been approved. Your verification badge has been upgraded to Level 2.
                </p>
              </div>
              <Badge className="bg-green-500/20 text-green-300 border border-green-500/50 px-4 py-1">
                Verified Level 2
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Submitted on <span className="text-foreground">{submittedAt}</span>
            </div>
            <div className="text-sm text-foreground">
              You’re all set! Feel free to close this tab or return to your profile.
            </div>
          </CardContent>
        </Card>
      );
    }

    if (latestSubmission.status === 'rejected') {
      return (
        <Card className="border border-red-500/40 rounded-xl bg-red-500/5">
          <CardContent className="p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-300">Additional verification</p>
                <h3 className="text-2xl font-bold text-foreground mt-2 flex items-center gap-2">
                  <XCircle className="w-6 h-6 text-red-400" />
                  Rejected
                </h3>

                {latestSubmission.reviewNote && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Reason: {latestSubmission.reviewNote}
                  </p>
                )}
              </div>
              <Badge className="bg-red-500/20 text-red-300 border border-red-500/50 px-4 py-1">
                Verified Level 1
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Submitted on <span className="text-foreground">{submittedAt}</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border border-border rounded-xl bg-background/60">
        <CardContent className="p-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Additional verification</p>
              <h3 className="text-2xl font-bold text-foreground mt-2 flex items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                Under review
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                We’re reviewing your documents. This page will refresh automatically once a decision is made.
              </p>
            </div>
            <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 px-4 py-1">
              Verified Level {verificationLevel}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Submitted on <span className="text-foreground">{submittedAt}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            You cannot resubmit additional verification while this review is in progress.
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <div id="additional-verification" className="absolute -z-10 inset-0 bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full opacity-20" />
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
                <p className="text-muted-foreground mt-4">
                  Complete the questionnaire and upload supporting documents for account verification
                </p>
            </div>
          </div>

            {shouldShowStatusCard && (
              <div className="mb-6">
                {renderStatusCard()}
              </div>
            )}
            
            {shouldShowForm && (
              !questionnaire ? (
                <Card className="border border-border rounded-xl">
                  <CardContent className="p-10 text-center">
                    <p className="text-muted-foreground">No active questionnaire available at this time.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {questionnaire && (
                    <>
                      {/* Progress Steps */}
                      {maxStep > 1 && (
                        <Card className="border border-border rounded-xl mb-6">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-evenly gap-2 sm:gap-0">
                              {Array.from({ length: maxStep }, (_, i) => {
                                const step = i + 1;
                                const isActive = step === currentStep;
                                const isCompleted = step < currentStep;
                                return (
                                  <div key={step} className="flex items-center flex-1 min-w-0">
                                    <div className="flex flex-col items-center flex-1 min-w-0">
                                      <div
                                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-colors shrink-0 ${
                                          isCompleted
                                            ? 'bg-green-500/20 border-green-500 text-green-500'
                                            : isActive
                                            ? 'bg-purple-500/20 border-purple-500 text-purple-500'
                                            : 'bg-background/50 border-border text-muted-foreground'
                                        }`}
                                      >
                                        {isCompleted ? (
                                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                        ) : (
                                          <span className="font-medium text-sm sm:text-base">{step}</span>
                                        )}
                                      </div>
                                    </div>
                                    {step < maxStep && (
                                      <div
                                        className={`h-0.5 flex-1 min-w-[8px] sm:min-w-[16px] mx-1 sm:mx-2 transition-colors ${
                                          isCompleted ? 'bg-green-500' : 'bg-border'
                                        }`}
                    />
                  )}
                </div>
                                );
                              })}
            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Questionnaire Form */}
                      <form 
                        onSubmit={handleSubmit}
                        onKeyDown={(e) => {
                          // Prevent form submission on Enter unless we're on the last step
                          if (e.key === 'Enter' && currentStep < maxStep) {
                            e.preventDefault();
                            handleNext();
                          }
                        }}
                      >
                        <Card className="border border-border rounded-xl mb-6">
                          <CardHeader>
                            
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* Questionnaire Fields */}
                            <div className="space-y-4">
                              {currentStepFields.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                  No questions in this step.
                                </p>
                              ) : (
                                currentStepFields.map(field => (
                                  <div key={field.key} className="space-y-3">
                                    <div className="space-y-5">
                                      <Label className="text-lg font-semibold text-foreground">
                                        {field.title}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                      </Label>
                                      {field.description && (
                                        <p className="text-xs text-muted-foreground">
                                          {field.description}
                                        </p>
                                      )}
                                      {renderField(field)}
                                    </div>
                                  </div>
                                ))
            )}
          </div>

                            {/* Navigation Buttons */}
                            <div className="flex items-center justify-between pt-6 border-t border-border">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handlePrevious}
                                disabled={currentStep === 1}
                                className="flex items-center gap-2"
                              >
                                <ArrowLeft className="w-4 h-4" />
                                Previous
                              </Button>
                              {currentStep < maxStep ? (
                                <Button
                                  type="button"
                                  onClick={handleNext}
                                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                                >
                                  Next
                                  <ArrowRight className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
            type="submit"
            disabled={isSubmitting}
                                  className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                                >
                                  {isSubmitting ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Submitting...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4" />
                                      Submit for Review
                                    </>
                                  )}
                                </Button>
                )}
              </div>
                          </CardContent>
                        </Card>
                      </form>
                    </>
                  )}
                </>
              )
            )}
          </div>
        </MaxWidthWrapper>
    </div>
    </>
  );
};

export default AdditionalVerification;
