import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { 
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Shield,
  Wallet,
  RefreshCw,
  X,
  User,
  FileText,
  Mail,
  Eye,
  FileDown,
  ClipboardList,
  Send,
  Image as ImageIcon,
  File,
  Plus,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Layers,
  Copy,
  Coins
} from 'lucide-react';
import MaxWidthWrapper from '../../components/helpers/max-width-wrapper';
import MagicBadge from '../../components/ui/magic-badge';
import AdminNavigation from '../../components/AdminNavigation';
import { apiFetch } from '../../utils/api';
import { WalletVerificationRequest } from '../../types/wallet-verification';
import WalletVerificationModal from '../../components/WalletVerificationModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

// Questionnaire types
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

// Additional verification submission type
interface AdditionalSubmission {
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

// Unified submission type
type UnifiedSubmission = 
  | { type: 'wallet'; data: WalletVerificationRequest }
  | { type: 'additional'; data: AdditionalSubmission };

const PAGE_SIZE_WALLET = 20;
const PAGE_SIZE_ADDITIONAL = 10;

const AdminVerifications: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  // Questionnaire builder state
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Questionnaire | null>(null);
  const [fields, setFields] = useState<QuestionnaireField[]>([]);
  const [builder, setBuilder] = useState({ title: '' });
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [currentField, setCurrentField] = useState<Partial<QuestionnaireField>>({
    type: 'text',
    required: false,
    options: []
  });
  const [newOption, setNewOption] = useState('');
  const [isSavingQuestionnaire, setIsSavingQuestionnaire] = useState(false);
  const [isQuestionnaireExpanded, setIsQuestionnaireExpanded] = useState(false);

  // Unified submissions state
  const [walletRequests, setWalletRequests] = useState<WalletVerificationRequest[]>([]);
  const [additionalSubmissions, setAdditionalSubmissions] = useState<AdditionalSubmission[]>([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isLoadingAdditional, setIsLoadingAdditional] = useState(true);
  const [isFetchingMoreWallet, setIsFetchingMoreWallet] = useState(false);
  
  // Filter & Search state
  const [typeFilter, setTypeFilter] = useState<'all' | 'wallet' | 'additional'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Pagination state
  const [walletPage, setWalletPage] = useState(1);
  const [walletHasMore, setWalletHasMore] = useState(true);
  const [walletTotalCount, setWalletTotalCount] = useState(0);
  const [additionalPage, setAdditionalPage] = useState(1);
  const [additionalTotalPages, setAdditionalTotalPages] = useState(1);
  const [additionalTotalItems, setAdditionalTotalItems] = useState(0);
  
  // Modal state
  const [selectedWalletRequest, setSelectedWalletRequest] = useState<WalletVerificationRequest | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<AdditionalSubmission | null>(null);
  const [statusUpdateDialog, setStatusUpdateDialog] = useState<{ submissionId: string; status: string } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isUpdatingSubmission, setIsUpdatingSubmission] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ fileId: string; filename: string; url: string; type: string } | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  
  // Wallet card state
  const [cardBlockchainData, setCardBlockchainData] = useState<Record<string, WalletVerificationRequest['blockchainData']>>({});
  const [loadingBlockchain, setLoadingBlockchain] = useState<Set<string>>(new Set());
  const [walletRejectDialog, setWalletRejectDialog] = useState<{ requestId: string } | null>(null);
  const [walletRejectionReason, setWalletRejectionReason] = useState('');
  const [isApprovingWallet, setIsApprovingWallet] = useState(false);
  const [isRejectingWallet, setIsRejectingWallet] = useState(false);
  
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Admin check
  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('Access Denied: Admin privileges required.');
      navigate('/profile');
    }
  }, [user, navigate]);

  // Helper functions for questionnaire builder
  const generateKeyFromTitle = (title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((word, index) => {
        if (index === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('')
      .replace(/^[0-9]/, 'q$&');
  };

  const recalculateSteps = (fieldsList: QuestionnaireField[]): QuestionnaireField[] => {
    return fieldsList.map((field, index) => ({
      ...field,
      step: index + 1
    }));
  };

  // Fetch wallet verifications
  const fetchWalletRequests = useCallback(async (requestedPage = 1, append = false) => {
    if (!token || !user?.isAdmin) return;

    if (append) {
      setIsFetchingMoreWallet(true);
    } else {
      setIsLoadingWallet(true);
      setWalletHasMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('page', String(requestedPage));
      params.set('limit', String(PAGE_SIZE_WALLET));

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const response = await apiFetch(`/wallet-verification?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const payload = data.data || {};
        const incomingRequests: WalletVerificationRequest[] = payload.requests || data.requests || [];
        const pagination = payload.pagination || data.pagination;

        setWalletRequests(prev => append ? [...prev, ...incomingRequests] : incomingRequests);

        setWalletTotalCount(prevTotal => {
          if (pagination && typeof pagination.totalItems === 'number') {
            return pagination.totalItems;
          }
          if (pagination && typeof pagination.total === 'number') {
            return pagination.total;
          }
          return append ? prevTotal : incomingRequests.length;
        });

        const totalPages = pagination?.totalPages ?? pagination?.pages;
        const hasMoreResults = totalPages
          ? requestedPage < Math.max(totalPages, 1)
          : incomingRequests.length === PAGE_SIZE_WALLET;

        setWalletHasMore(hasMoreResults);
        setWalletPage(requestedPage);
      } else {
        toast.error(data.message || 'Failed to fetch verification requests');
      }
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      toast.error('An error occurred while fetching verification requests');
    } finally {
      if (append) {
        setIsFetchingMoreWallet(false);
      } else {
        setIsLoadingWallet(false);
      }
    }
  }, [PAGE_SIZE_WALLET, token, statusFilter, debouncedSearch, user?.isAdmin]);

  // Fetch additional verifications
  const fetchAdditionalSubmissions = useCallback(async (requestedPage = 1) => {
    if (!token || !user?.isAdmin) return;
    setIsLoadingAdditional(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(requestedPage));
      params.set('limit', String(PAGE_SIZE_ADDITIONAL));

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const response = await apiFetch(`/additional-verification/admin/submissions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAdditionalSubmissions(data.data || []);
        const pagination = data.pagination || {};
        setAdditionalTotalItems(pagination.totalItems ?? (data.data?.length || 0));
        setAdditionalTotalPages(pagination.totalPages ?? 1);
        setAdditionalPage(pagination.page ?? requestedPage);
      } else {
        toast.error(data.message || 'Unable to load submissions');
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to load submissions');
    } finally {
      setIsLoadingAdditional(false);
    }
  }, [token, user?.isAdmin, statusFilter, debouncedSearch]);

  // Fetch current questionnaire
  const fetchCurrentQuestionnaire = async () => {
    if (!token) return;
    try {
      const response = await apiFetch('/additional-verification/admin/questionnaires', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const questionnaires = data.data || [];
        const active = questionnaires.find((q: Questionnaire) => q.status === 'active') || questionnaires[0];
        if (active) {
          setCurrentQuestionnaire(active);
          setBuilder({ title: active.title });
          const recalculatedFields = recalculateSteps(active.fields);
          setFields(recalculatedFields);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to load questionnaire');
    }
  };

  // Load data when filters change
  useEffect(() => {
    if (!user?.isAdmin) return;
    setWalletRequests([]);
    setAdditionalSubmissions([]);
    setWalletPage(1);
    setAdditionalPage(1);
    setWalletHasMore(true);
    setWalletTotalCount(0);
    setAdditionalTotalItems(0);
    
    if (typeFilter === 'all' || typeFilter === 'wallet') {
      fetchWalletRequests(1, false);
    } else {
      setIsLoadingWallet(false);
    }
    
    if (typeFilter === 'all' || typeFilter === 'additional') {
      fetchAdditionalSubmissions(1);
    } else {
      setIsLoadingAdditional(false);
    }
  }, [user?.isAdmin, typeFilter, statusFilter, debouncedSearch, fetchWalletRequests, fetchAdditionalSubmissions]);

  // Load questionnaire on mount
  useEffect(() => {
    if (!token || !user?.isAdmin) return;
    fetchCurrentQuestionnaire();
  }, [token, user?.isAdmin]);

  // Infinite scroll for wallet requests
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || isLoadingWallet || !walletHasMore || typeFilter === 'additional') return;

    const observer = new IntersectionObserver((entries) => {
      const firstEntry = entries[0];
      if (firstEntry?.isIntersecting && !isFetchingMoreWallet && (typeFilter === 'all' || typeFilter === 'wallet')) {
        fetchWalletRequests(walletPage + 1, true);
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [walletHasMore, isLoadingWallet, isFetchingMoreWallet, fetchWalletRequests, walletPage, typeFilter]);

  // Questionnaire builder handlers
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

    const generatedKey = editingFieldIndex !== null && fields[editingFieldIndex]?.key
      ? fields[editingFieldIndex].key
      : generateKeyFromTitle(currentField.title);

    const existingKeys = fields.map(f => f.key);
    let finalKey = generatedKey;
    if (editingFieldIndex === null && existingKeys.includes(finalKey)) {
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

  // Submission handlers
  const handleWalletRequestClick = async (request: WalletVerificationRequest) => {
    setSelectedWalletRequest(request);
    setShowWalletModal(true);
  };

  const handleWalletModalClose = () => {
    setShowWalletModal(false);
    setSelectedWalletRequest(null);
    if (typeFilter === 'all' || typeFilter === 'wallet') {
      fetchWalletRequests(1, false);
    }
    if (typeFilter === 'all' || typeFilter === 'additional') {
      fetchAdditionalSubmissions(1);
    }
  };

  // Wallet card handlers
  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const fetchCardBlockchainData = async (request: WalletVerificationRequest) => {
    if (!token) return;
    
    setLoadingBlockchain(prev => new Set(prev).add(request._id));
    try {
      const response = await apiFetch(`/wallet-verification/${request._id}/fetch-blockchain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCardBlockchainData(prev => ({
          ...prev,
          [request._id]: data.data
        }));
        // Also update the request in the list
        setWalletRequests(prev => prev.map(req => 
          req._id === request._id 
            ? { ...req, blockchainData: data.data }
            : req
        ));
        toast.success('Blockchain data fetched successfully');
      } else {
        toast.error(data.message || 'Failed to fetch blockchain data');
      }
    } catch (error) {
      console.error('Error fetching blockchain data:', error);
      toast.error('An error occurred while fetching blockchain data');
    } finally {
      setLoadingBlockchain(prev => {
        const newSet = new Set(prev);
        newSet.delete(request._id);
        return newSet;
      });
    }
  };

  const handleApproveWallet = async (request: WalletVerificationRequest) => {
    if (!token) return;
    setIsApprovingWallet(true);
    try {
      const response = await apiFetch(`/wallet-verification/${request._id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Wallet verification approved successfully');
        // Refresh the list
        if (typeFilter === 'all' || typeFilter === 'wallet') {
          fetchWalletRequests(1, false);
        }
      } else {
        toast.error(data.message || 'Failed to approve verification');
      }
    } catch (error) {
      console.error('Error approving verification:', error);
      toast.error('An error occurred while approving verification');
    } finally {
      setIsApprovingWallet(false);
    }
  };

  const handleRejectWalletClick = (request: WalletVerificationRequest) => {
    setWalletRejectDialog({ requestId: request._id });
    setWalletRejectionReason('');
  };

  const handleRejectWallet = async (requestId: string) => {
    if (!token) return;
    if (!walletRejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsRejectingWallet(true);
    try {
      const response = await apiFetch(`/wallet-verification/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          rejectionReason: walletRejectionReason.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Wallet verification rejected');
        setWalletRejectDialog(null);
        setWalletRejectionReason('');
        // Refresh the list
        if (typeFilter === 'all' || typeFilter === 'wallet') {
          fetchWalletRequests(1, false);
        }
      } else {
        toast.error(data.message || 'Failed to reject verification');
      }
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast.error('An error occurred while rejecting verification');
    } finally {
      setIsRejectingWallet(false);
    }
  };

  const handleStatusUpdateClick = (submissionId: string, status: string) => {
    if (status === 'rejected') {
      setStatusUpdateDialog({ submissionId, status });
      setReviewNote('');
    } else {
      handleStatusUpdate(submissionId, status);
    }
  };

  const handleStatusUpdate = async (submissionId: string, status: string, note?: string) => {
    if (!token) return;
    setIsUpdatingSubmission(true);
    try {
      const body: { status: string; reviewNote?: string } = { status };
      if (status === 'rejected' && note) {
        body.reviewNote = note;
      }
      
      const response = await apiFetch(`/additional-verification/admin/submissions/${submissionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Submission updated');
        setStatusUpdateDialog(null);
        setReviewNote('');
        fetchAdditionalSubmissions(additionalPage);
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

  // Combine submissions
  const getUnifiedSubmissions = (): UnifiedSubmission[] => {
    const submissions: UnifiedSubmission[] = [];
    
    if (typeFilter === 'all' || typeFilter === 'wallet') {
      walletRequests.forEach(req => {
        submissions.push({ type: 'wallet', data: req });
      });
    }
    
    if (typeFilter === 'all' || typeFilter === 'additional') {
      additionalSubmissions.forEach(sub => {
        submissions.push({ type: 'additional', data: sub });
      });
    }
    
    // Sort by creation date (newest first)
    return submissions.sort((a, b) => {
      const dateA = a.type === 'wallet' ? new Date(a.data.createdAt).getTime() : new Date(a.data.createdAt || 0).getTime();
      const dateB = b.type === 'wallet' ? new Date(b.data.createdAt).getTime() : new Date(b.data.createdAt || 0).getTime();
      return dateB - dateA;
    });
  };

  const unifiedSubmissions = getUnifiedSubmissions();
  const totalResults = (typeFilter === 'all' || typeFilter === 'wallet' ? walletTotalCount : 0) + 
                       (typeFilter === 'all' || typeFilter === 'additional' ? additionalTotalItems : 0);
  const isLoading = (typeFilter === 'all' || typeFilter === 'wallet' ? isLoadingWallet : false) || 
                    (typeFilter === 'all' || typeFilter === 'additional' ? isLoadingAdditional : false);
  const isInitialLoading = isLoading && unifiedSubmissions.length === 0;

  // Helper functions for rendering
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'approved':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'rejected':
        return <XCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'approved':
        return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'rejected':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'wallet':
        return 'border-l-blue-500';
      case 'additional':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const getTypeBarColor = (type: string) => {
    switch (type) {
      case 'wallet':
        return 'bg-blue-500/15 border-blue-500/20 text-blue-500';
      case 'additional':
        return 'bg-green-500/15 border-green-500/20 text-green-500';
      default:
        return 'bg-gray-500/15 border-gray-500/20 text-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'wallet':
        return <Wallet className="w-6 h-6 text-blue-500" />;
      case 'additional':
        return <FileText className="w-6 h-6 text-green-500" />;
      default:
        return <Shield className="w-6 h-6" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const badges = {
      wallet: { text: 'Wallet', color: 'bg-blue-500/20 text-blue-500 border-blue-500/50' },
      additional: { text: 'Additional', color: 'bg-green-500/20 text-green-500 border-green-500/50' }
    };
    return badges[type as keyof typeof badges] || badges.wallet;
  };

  const getWalletTypeColor = (type: string) => {
    switch (type) {
      case 'btc':
        return 'text-orange-500';
      case 'eth':
        return 'text-blue-500';
      case 'tron':
        return 'text-red-500';
      case 'usdtErc20':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getMaxStep = () => {
    return fields.length > 0 ? Math.max(...fields.map(f => f.step || 1)) : 0;
  };

  const getFieldsByStep = (step: number) => {
    return fields.filter(f => (f.step || 1) === step);
  };

  // Cleanup preview file URL
  useEffect(() => {
    return () => {
      if (previewFile?.url) {
        window.URL.revokeObjectURL(previewFile.url);
      }
    };
  }, [previewFile]);

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

  return (
    <>
      <div className="min-h-screen text-foreground overflow-x-hidden scrollbar-hide relative">
        <div id="admin-verifications" className="absolute -z-10 top-0 left-0 right-0 h-[100vh] bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20 pointer-events-none" />
        <MaxWidthWrapper>
          <div className="pt-20 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium font-heading text-foreground">
                  Verification <br/> <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">Requests</span>
                </h1>
                <p className="text-muted-foreground mt-4">Review and manage wallet verifications and additional verification submissions</p>
              </div>
            </div>

            {/* Admin Navigation */}
            <AdminNavigation />

            {/* Questionnaire Builder Section */}
            <MagicBadge title="Questionnaire Builder" className="mb-6"/>
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
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1 block">Title *</Label>
                    <Input
                      placeholder="Questionnaire Title"
                      value={builder.title}
                      onChange={event => setBuilder(prev => ({ ...prev, title: event.target.value }))}
                      className="bg-background/50 border-border"
                    />
                  </div>

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

            <MagicBadge title="Filter & Search" className="mb-6" />

            {/* Status Filter Tabs */}
            <div className="flex gap-2 border-b border-border pb-2 mb-6">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${statusFilter === 'all'
                  ? 'bg-blue-500/20 text-blue-500 border-b-2 border-blue-500'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${statusFilter === 'pending'
                  ? 'bg-yellow-500/20 text-yellow-500 border-b-2 border-yellow-500'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${statusFilter === 'approved'
                  ? 'bg-green-500/20 text-green-500 border-b-2 border-green-500'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-4 py-2 rounded-t-lg transition-colors ${statusFilter === 'rejected'
                  ? 'bg-red-500/20 text-red-500 border-b-2 border-red-500'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Rejected
              </button>
            </div>

            {/* Search Bar */}
            <div className="group w-full border border-border rounded-xl p-6 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, email, or request ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50 border-border text-foreground placeholder:text-muted-foreground"
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
              <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-muted-foreground">
                    Total Results: <span className="text-foreground font-semibold">{totalResults}</span>
                  </span>
                </div>
                {unifiedSubmissions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-muted-foreground">
                      Loaded: <span className="text-foreground font-semibold">{unifiedSubmissions.length}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter & Search Section */}
            <div className="flex items-center gap-4 mt-10 mb-6 justify-between">
              <MagicBadge title="Verification Requests" />
              <Select value={typeFilter} onValueChange={(value: 'all' | 'wallet' | 'additional') => setTypeFilter(value)}>
                <SelectTrigger className="w-[220px] bg-background/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="wallet">Wallet Verifications</SelectItem>
                  <SelectItem value="additional">Additional Verifications</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Combined Submissions List */}
            {isInitialLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : unifiedSubmissions.length === 0 ? (
              <div className="w-full border border-border rounded-xl p-10 text-center">
                {searchQuery ? (
                  <>
                    <p className="text-muted-foreground mb-2">No requests match your search</p>
                    <p className="text-sm text-muted-foreground">Try a different search term</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No verification requests found</p>
                )}
              </div>
            ) : (
              <div className="grid gap-6">
                {unifiedSubmissions.map((submission) => {
                  if (submission.type === 'wallet') {
                    const request = submission.data;
                    const userId = request.userId as any;
                    const blockchainData = cardBlockchainData[request._id] || request.blockchainData;
                    const isLoadingBlockchainData = loadingBlockchain.has(request._id);
                    
                    const typeBadge = getTypeBadge('wallet');
                    const typeColor = getTypeColor('wallet');
                    const typeIcon = getTypeIcon('wallet');

                    return (
                      <Card key={`wallet-${request._id}`} className={`${typeColor} border border-border rounded-xl transition-colors overflow-hidden`}>
                        <div className="flex items-stretch">
                          {/* Type Bar */}
                          <div className={`flex flex-col items-center justify-center w-[100px] self-stretch ${getTypeBarColor('wallet')} border rounded-l-2xl p-3 gap-2`}>
                            {typeIcon}
                            <span className="text-xs font-medium text-center leading-tight">{typeBadge.text}</span>
                          </div>
                          
                          <CardContent className="p-6 flex-1">
                            <div className="flex items-start justify-between gap-4">
                              {/* Left: Request Details */}
                              <div className="flex-1 space-y-3">
                                {/* Header with Status Badge */}
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="text-lg font-bold">{userId?.name || 'Unknown User'}</h3>
                                      <Badge className={`${getStatusColor(request.status)} flex items-center gap-1`}>
                                        {getStatusIcon(request.status)}
                                        <span className="capitalize">{request.status}</span>
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                      <Mail size={14} />
                                      {userId?.email || 'No email'}
                                    </div>
                                  </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border">
                                  <div className="flex items-center gap-2">
                                    <Wallet className={`w-4 h-4 ${getWalletTypeColor(request.walletType)}`} />
                                    <div>
                                      <p className="text-xs text-gray-400">Wallet Type</p>
                                      <p className={`font-bold ${getWalletTypeColor(request.walletType)}`}>{request.walletType.toUpperCase()}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    <div>
                                      <p className="text-xs text-gray-400">Requested</p>
                                      <p className="font-bold text-sm">{new Date(request.createdAt).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  {blockchainData && (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <Coins className="w-4 h-4 text-green-500" />
                                        <div>
                                          <p className="text-xs text-gray-400">Balance</p>
                                          <p className="font-bold text-green-400">{blockchainData.balance.toFixed(6)}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4 text-purple-500" />
                                        <div>
                                          <p className="text-xs text-gray-400">Transactions</p>
                                          <p className="font-bold">{blockchainData.transactionCount}</p>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Wallet Address */}
                                <div className="flex flex-row items-center justify-between bg-background/50 border border-border rounded-lg p-3">
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground mb-1">Wallet Address:</p>
                                    <p className="text-sm font-mono text-foreground break-all">
                                      {request.walletAddress}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyAddress(request.walletAddress);
                                      }}
                                      className="p-1.5 hover:bg-background/50 rounded transition-colors"
                                      title="Copy wallet address"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                    </button>
                                  </div>
                                </div>

                                {/* Blockchain Data Section */}
                                {blockchainData && (
                                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-3">
                                      <RefreshCw className="w-4 h-4 text-purple-400" />
                                      <p className="text-sm font-medium text-purple-400">Blockchain Information</p>
                                    </div>
                                    {blockchainData.lastFetched && (
                                      <p className="text-xs text-gray-400 mb-2">
                                        Last updated: {new Date(blockchainData.lastFetched).toLocaleString()}
                                      </p>
                                    )}
                                    {blockchainData.latestTransactions && blockchainData.latestTransactions.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-purple-500/20">
                                        <p className="text-xs text-muted-foreground mb-2">Latest Transactions ({blockchainData.latestTransactions.length})</p>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                          {blockchainData.latestTransactions.slice(0, 3).map((tx, idx) => (
                                            <div key={idx} className="text-xs bg-background/30 p-2 rounded flex items-center justify-between">
                                              <div className="flex-1 min-w-0">
                                                <code className="text-xs font-mono break-all">
                                                  {tx.hash.substring(0, 12)}...{tx.hash.substring(tx.hash.length - 8)}
                                                </code>
                                                <div className="flex items-center gap-2 mt-1">
                                                  <Badge
                                                    variant="outline"
                                                    className={`text-xs ${
                                                      tx.type === 'in'
                                                        ? 'bg-green-500/10 text-green-500 border-green-500/30'
                                                        : 'bg-red-500/10 text-red-500 border-red-500/30'
                                                    }`}
                                                  >
                                                    {tx.type === 'in' ? 'In' : 'Out'}
                                                  </Badge>
                                                  <span className="text-muted-foreground">{tx.amount.toFixed(8)}</span>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Rejection Reason */}
                                {request.status === 'rejected' && request.rejectionReason && (
                                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                    <p className="text-sm text-red-400"><strong>Rejection Reason:</strong> {request.rejectionReason}</p>
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons - Right Side */}
                              <div className="flex flex-col gap-3 w-[250px] flex-shrink-0">
                                <div className="flex flex-col gap-2">
                                  <label className="text-xs text-muted-foreground">Blockchain Data</label>
                                  <Button
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fetchCardBlockchainData(request);
                                    }}
                                    disabled={isLoadingBlockchainData}
                                    className="flex items-center justify-center gap-2"
                                  >
                                    {isLoadingBlockchainData ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Fetching...
                                      </>
                                    ) : (
                                      <>
                                        <RefreshCw className="w-4 h-4" />
                                        Fetch Blockchain Data
                                      </>
                                    )}
                                  </Button>
                                </div>
                                {request.status === 'pending' && (
                                  <div className="flex flex-col gap-2">
                                    <label className="text-xs text-muted-foreground">Actions</label>
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleApproveWallet(request);
                                        }}
                                        disabled={isApprovingWallet || isRejectingWallet}
                                        className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2 border border-green-600 flex-1"
                                      >
                                        {isApprovingWallet ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        Approve
                                      </Button>
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRejectWalletClick(request);
                                        }}
                                        disabled={isApprovingWallet || isRejectingWallet}
                                        className="bg-red-600/50 hover:bg-red-700 text-white flex items-center gap-2 border border-red-600 flex-1"
                                      >
                                        {isRejectingWallet ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <XCircle className="w-4 h-4" />
                                        )}
                                        Reject
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    );
                  } else {
                    const sub = submission.data;
                    const typeBadge = getTypeBadge('additional');
                    const typeColor = getTypeColor('additional');
                    const typeIcon = getTypeIcon('additional');

                    return (
                      <Card key={`additional-${sub._id}`} className={`${typeColor} border border-border rounded-xl transition-colors overflow-hidden`}>
                        <div className="flex items-stretch">
                          {/* Type Bar */}
                          <div className={`flex flex-col items-center justify-center w-[100px] self-stretch ${getTypeBarColor('additional')} border rounded-l-2xl p-3 gap-2`}>
                            {typeIcon}
                            <span className="text-xs font-medium text-center leading-tight">{typeBadge.text}</span>
                          </div>
                          
                          <CardContent className="p-6 flex-1">
                            <div className="flex items-start justify-between gap-4">
                              {/* Left: Request Details */}
                              <div className="flex-1 space-y-3">
                                {/* Header with Status Badge */}
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="text-lg font-bold">{sub.user?.name || 'User'}</h3>
                                      <Badge className={`${getStatusColor(sub.status)} flex items-center gap-1`}>
                                        {getStatusIcon(sub.status)}
                                        <span className="capitalize">{sub.status}</span>
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                      <Mail size={14} />
                                      {sub.user?.email || 'No email'}
                                    </div>
                                  </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 border-t border-border">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-purple-500" />
                                    <div>
                                      <p className="text-xs text-gray-400">Documents</p>
                                      <p className="font-bold">{sub.documents.length}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    <div>
                                      <p className="text-xs text-gray-400">Submitted</p>
                                      <p className="font-bold text-sm">{sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                  </div>
                                  {sub.reviewedAt && (
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                                      <div>
                                        <p className="text-xs text-gray-400">Reviewed</p>
                                        <p className="font-bold text-sm">{new Date(sub.reviewedAt).toLocaleDateString()}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Documents Section */}
                                {sub.documents.length > 0 && (
                                  <div className="bg-background/50 border border-border rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-3">
                                      <FileText className="w-4 h-4 text-purple-400" />
                                      <p className="text-xs text-muted-foreground font-medium">Documents ({sub.documents.length}):</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                      {sub.documents.slice(0, 3).map(doc => (
                                        <div key={doc.fileId} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {doc.mimeType?.startsWith('image/') ? (
                                              <ImageIcon className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                            ) : (
                                              <File className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                            )}
                                            <span className="text-xs text-gray-300 truncate">{doc.filename}</span>
                                            {doc.size && (
                                              <span className="text-xs text-gray-500 flex-shrink-0">
                                                ({(doc.size / 1024).toFixed(1)} KB)
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handlePreview(doc.fileId, doc.filename)}
                                              disabled={loadingPreviewId === doc.fileId}
                                              className="h-7 px-2"
                                            >
                                              {loadingPreviewId === doc.fileId ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                              ) : (
                                                <Eye className="w-3 h-3" />
                                              )}
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleDownload(doc.fileId, doc.filename)}
                                              className="h-7 px-2"
                                            >
                                              <FileDown className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                      {sub.documents.length > 3 && (
                                        <p className="text-xs text-muted-foreground text-center pt-1">
                                          +{sub.documents.length - 3} more document{sub.documents.length - 3 !== 1 ? 's' : ''}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Review Note */}
                                {sub.reviewNote && (
                                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                    <p className="text-sm text-red-400"><strong>Review Note:</strong> {sub.reviewNote}</p>
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons - Right Side */}
                              <div className="flex flex-col gap-3 w-[250px] flex-shrink-0">
                                <div className="flex flex-col gap-2">
                                  <label className="text-xs text-muted-foreground">View Details</label>
                                  <Button
                                    variant="outline"
                                    onClick={async () => {
                                      try {
                                        const response = await apiFetch(`/additional-verification/admin/submissions/${sub._id}`, {
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
                                    className="flex items-center justify-center gap-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Full Details
                                  </Button>
                                </div>
                                {sub.status === 'pending' && (
                                  <div className="flex flex-col gap-2">
                                    <label className="text-xs text-muted-foreground">Actions</label>
                                    <div className="flex gap-2">
                                      <Button
                                        onClick={() => handleStatusUpdateClick(sub._id, 'approved')}
                                        disabled={isUpdatingSubmission}
                                        className="bg-green-600/50 hover:bg-green-700 text-white flex items-center gap-2 border border-green-600 flex-1"
                                      >
                                        {isUpdatingSubmission && statusUpdateDialog?.submissionId === sub._id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        Approve
                                      </Button>
                                      <Button
                                        onClick={() => handleStatusUpdateClick(sub._id, 'rejected')}
                                        disabled={isUpdatingSubmission}
                                        className="bg-red-600/50 hover:bg-red-700 text-white flex items-center gap-2 border border-red-600 flex-1"
                                      >
                                        {isUpdatingSubmission && statusUpdateDialog?.submissionId === sub._id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <XCircle className="w-4 h-4" />
                                        )}
                                        Reject
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    );
                  }
                })}
                {typeFilter === 'all' || typeFilter === 'wallet' ? <div ref={loadMoreRef} /> : null}
                {isFetchingMoreWallet && (typeFilter === 'all' || typeFilter === 'wallet') && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  </div>
                )}
                {typeFilter === 'additional' && additionalTotalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-6 border-t border-border text-sm">
                    <span className="text-muted-foreground">
                      Page {additionalPage} of {additionalTotalPages} • {additionalTotalItems} submissions
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (additionalPage > 1) {
                            const prevPage = additionalPage - 1;
                            setAdditionalPage(prevPage);
                            fetchAdditionalSubmissions(prevPage);
                          }
                        }}
                        disabled={additionalPage === 1 || isLoadingAdditional}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (additionalPage < additionalTotalPages) {
                            const nextPage = additionalPage + 1;
                            setAdditionalPage(nextPage);
                            fetchAdditionalSubmissions(nextPage);
                          }
                        }}
                        disabled={additionalPage === additionalTotalPages || isLoadingAdditional}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </MaxWidthWrapper>
      </div>

      {/* Wallet Verification Modal */}
      {showWalletModal && selectedWalletRequest && (
        <WalletVerificationModal
          isOpen={showWalletModal}
          onClose={handleWalletModalClose}
          request={selectedWalletRequest}
          token={token || ''}
        />
      )}

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
                    {getStatusBadge(selectedSubmission.status)}
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

      {/* Status Update Dialog */}
      <Dialog open={!!statusUpdateDialog} onOpenChange={(open) => !open && setStatusUpdateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusUpdateDialog?.status === 'rejected' ? 'Reject Submission' : 'Update Status'}
            </DialogTitle>
            <DialogDescription>
              {statusUpdateDialog?.status === 'rejected' 
                ? 'Please provide a reason for rejection. This will be sent to the user via email.'
                : 'Update the submission status'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {statusUpdateDialog?.status === 'rejected' && (
              <div>
                <Label htmlFor="reviewNote">Review Note (Optional but Recommended)</Label>
                <Textarea
                  id="reviewNote"
                  placeholder="Enter the reason for rejection..."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="bg-background/50 border-border min-h-[100px] mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This note will be included in the rejection email sent to the user.
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusUpdateDialog(null);
                  setReviewNote('');
                }}
                disabled={isUpdatingSubmission}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (statusUpdateDialog) {
                    handleStatusUpdate(
                      statusUpdateDialog.submissionId,
                      statusUpdateDialog.status,
                      reviewNote.trim() || undefined
                    );
                  }
                }}
                disabled={isUpdatingSubmission}
                className={
                  statusUpdateDialog?.status === 'rejected'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : statusUpdateDialog?.status === 'approved'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : ''
                }
              >
                {isUpdatingSubmission ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  `Confirm ${statusUpdateDialog?.status === 'rejected' ? 'Rejection' : statusUpdateDialog?.status === 'approved' ? 'Approval' : 'Update'}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wallet Rejection Dialog */}
      <Dialog open={!!walletRejectDialog} onOpenChange={(open) => !open && setWalletRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Wallet Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be sent to the user via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="walletRejectionReason">Rejection Reason *</Label>
              <Textarea
                id="walletRejectionReason"
                placeholder="Enter the reason for rejection..."
                value={walletRejectionReason}
                onChange={(e) => setWalletRejectionReason(e.target.value)}
                className="bg-background/50 border-border min-h-[100px] mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This note will be included in the rejection email sent to the user.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setWalletRejectDialog(null);
                  setWalletRejectionReason('');
                }}
                disabled={isRejectingWallet}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (walletRejectDialog) {
                    handleRejectWallet(walletRejectDialog.requestId);
                  }
                }}
                disabled={isRejectingWallet || !walletRejectionReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isRejectingWallet ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Confirm Rejection'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
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
          <div className="mt-4 flex-1 overflow-hidden flex flex-col">
            {previewFile && (
              <>
                {previewFile.type === 'image' && (
                  <div className="flex items-center justify-center bg-muted/20 rounded-lg p-4 flex-1 overflow-hidden">
                    <img
                      src={previewFile.url}
                      alt={previewFile.filename}
                      className="max-w-full max-h-full object-contain rounded-lg"
                      onError={() => toast.error('Failed to load image')}
                    />
                  </div>
                )}
                {previewFile.type === 'pdf' && (
                  <div className="flex items-center justify-center bg-muted/20 rounded-lg p-4 flex-1 overflow-hidden">
                    <iframe
                      src={previewFile.url}
                      className="w-full h-full rounded-lg border border-border"
                      title={previewFile.filename}
                    />
                  </div>
                )}
                {previewFile.type === 'other' && (
                  <div className="flex flex-col items-center justify-center bg-muted/20 rounded-lg p-8 flex-1">
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
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border flex-shrink-0">
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

export default AdminVerifications;
