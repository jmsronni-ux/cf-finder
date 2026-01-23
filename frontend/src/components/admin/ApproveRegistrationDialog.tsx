import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, ShieldCheck, Users } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface ApproveRegistrationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onApprove: (data: { isSubAdmin: boolean; managedBy: string | null }) => Promise<void>;
    requestName: string;
    requestEmail: string;
    initialIsSubAdmin?: boolean;
    initialManagedBy?: string | null;
}

const ApproveRegistrationDialog: React.FC<ApproveRegistrationDialogProps> = ({
    isOpen,
    onClose,
    onApprove,
    requestName,
    requestEmail,
    initialIsSubAdmin = false,
    initialManagedBy = null
}) => {
    const [isSubAdmin, setIsSubAdmin] = useState(initialIsSubAdmin);
    const [managedBy, setManagedBy] = useState<string | null>(initialManagedBy);
    const [subadmins, setSubadmins] = useState<any[]>([]);
    const [loadingSubadmins, setLoadingSubadmins] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { token, user } = useAuth();

    useEffect(() => {
        // If the current user is a sub-admin, default managedBy to themselves
        if (user && user.isSubAdmin && !user.isAdmin) {
            setManagedBy(user._id);
        }
    }, [user]);

    // Sync initial values when dialog opens
    useEffect(() => {
        if (isOpen) {
            setIsSubAdmin(initialIsSubAdmin);
            setManagedBy(initialManagedBy || (user?.isSubAdmin && !user?.isAdmin ? user?._id : null));
        }
    }, [isOpen, initialIsSubAdmin, initialManagedBy, user]);

    useEffect(() => {
        if (isOpen && token) {
            const fetchSubadmins = async () => {
                setLoadingSubadmins(true);
                try {
                    const res = await apiFetch('/user?role=subadmin', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.success) {
                        setSubadmins(data.data || []);
                    }
                } catch (err) {
                    console.error('Error fetching subadmins:', err);
                } finally {
                    setLoadingSubadmins(false);
                }
            };
            fetchSubadmins();
        }
    }, [isOpen, token]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await onApprove({ isSubAdmin, managedBy });
            onClose();
        } catch (error) {
            console.error('Error approving registration:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#0d0d0d] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-blue-500" />
                        Approve Registration
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Set roles and assignments for <strong>{requestName}</strong> ({requestEmail})
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-6">
                    {/* Only Main Admins can create other Sub-Admins */}
                    {user?.isAdmin && (
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="space-y-0.5">
                                <Label className="text-base font-semibold">Make Sub-Admin</Label>
                                <div className="text-xs text-gray-400">
                                    Grant limited administrative access to this user
                                </div>
                            </div>
                            <Switch
                                checked={isSubAdmin}
                                onCheckedChange={setIsSubAdmin}
                            />
                        </div>
                    )}

                    {!isSubAdmin && (
                        <div className="space-y-3">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Users className="w-4 h-4 text-purple-400" />
                                {user?.isAdmin ? 'Assign to Sub-Admin' : 'Managed By'}
                            </Label>

                            {user?.isAdmin ? (
                                <Select
                                    value={managedBy || "none"}
                                    onValueChange={(val) => setManagedBy(val === "none" ? null : val)}
                                >
                                    <SelectTrigger className="bg-white/5 border-white/10 h-11">
                                        <SelectValue placeholder="Select a sub-admin" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0f0f0f] border-white/10 text-white">
                                        <SelectItem value="none">Managed by Main Admin</SelectItem>
                                        {subadmins.map((sa) => (
                                            <SelectItem key={sa._id} value={sa._id}>
                                                {sa.name}
                                            </SelectItem>
                                        ))}
                                        {loadingSubadmins && (
                                            <div className="flex items-center justify-center p-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            </div>
                                        )}
                                        {!loadingSubadmins && subadmins.length === 0 && (
                                            <div className="text-xs p-2 text-gray-500 text-center">
                                                No sub-admins found
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-sm">
                                    <span className="text-gray-400">You will manage this user:</span>
                                    <div className="font-semibold text-purple-400 mt-1">{user?.name}</div>
                                </div>
                            )}

                            <p className="text-[10px] text-gray-500 italic">
                                {user?.isAdmin
                                    ? "Pinned users are only visible to their assigned sub-admin."
                                    : "This user will only be visible to you and Main Admins."}
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={submitting}
                        className="hover:bg-white/5 text-gray-400"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Approving...
                            </>
                        ) : (
                            'Approve & Create User'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ApproveRegistrationDialog;
