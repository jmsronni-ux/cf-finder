"use client";

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 as LoaderIcon, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "@/utils/api";

const ResetPasswordForm = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [isValidToken, setIsValidToken] = useState(false);

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                toast.error("Invalid reset link. Please request a new password reset.");
                setIsVerifying(false);
                return;
            }

            try {
                const response = await apiFetch(`/password-recovery/verify-token/${token}`);
                const data = await response.json();

                if (response.ok && data.success) {
                    setIsValidToken(true);
                } else {
                    toast.error(data.message || "This reset link is invalid or has expired.");
                    setIsValidToken(false);
                }
            } catch (error) {
                console.error("Token verification error:", error);
                toast.error("Unable to verify reset link. Please try again.");
                setIsValidToken(false);
            } finally {
                setIsVerifying(false);
            }
        };

        verifyToken();
    }, [token]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!newPassword.trim() || !confirmPassword.trim()) {
            toast.error("Please fill in all fields.");
            return;
        }

        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await apiFetch("/password-recovery/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    newPassword
                }),
            });
            const data = await response.json();

            if (response.ok && data.success) {
                toast.success(data.message || "Password reset successfully! You can now login.");
                setTimeout(() => navigate("/login"), 2000);
            } else {
                toast.error(data.message || "Unable to reset password. Try again.");
            }
        } catch (error) {
            console.error("Reset password error:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isVerifying) {
        return (
            <div className="flex flex-col items-center justify-center gap-y-4 py-8 w-full">
                <LoaderIcon className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verifying reset link...</p>
            </div>
        );
    }

    if (!isValidToken) {
        return (
            <div className="flex flex-col items-start gap-y-4 sm:gap-y-6 py-4 sm:py-8 w-full">
                <h2 className="text-xl sm:text-2xl font-semibold w-full">
                    Invalid Reset Link
                </h2>
                <p className="text-sm text-muted-foreground">
                    This password reset link is invalid or has expired. Please request a new one.
                </p>
                <Button
                    onClick={() => navigate("/forgot-password")}
                    className="w-full h-11 sm:h-10 text-sm sm:text-base font-medium"
                >
                    Request New Reset Link
                </Button>
                <div className="flex items-center justify-center w-full mt-4">
                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="text-primary hover:underline text-sm font-medium"
                    >
                        Back to login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-start gap-y-4 sm:gap-y-6 py-4 sm:py-8 w-full">
            <h2 className="text-xl sm:text-2xl font-semibold w-full">
                Reset your password
            </h2>
            <p className="text-sm text-muted-foreground">
                Enter your new password below.
            </p>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div className="space-y-2 w-full">
                    <Label htmlFor="new-password" className="text-sm">New Password</Label>
                    <div className="relative w-full">
                        <Input
                            id="new-password"
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full focus-visible:border-foreground h-11 sm:h-10 pr-12"
                            required
                        />
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute top-1/2 -translate-y-1/2 right-1 h-9 w-9 sm:h-8 sm:w-8"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ?
                                <EyeOff className="w-5 h-5 sm:w-4 sm:h-4" /> :
                                <Eye className="w-5 h-5 sm:w-4 sm:h-4" />
                            }
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Must be at least 8 characters long
                    </p>
                </div>

                <div className="space-y-2 w-full">
                    <Label htmlFor="confirm-password" className="text-sm">Confirm New Password</Label>
                    <div className="relative w-full">
                        <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full focus-visible:border-foreground h-11 sm:h-10 pr-12"
                            required
                        />
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute top-1/2 -translate-y-1/2 right-1 h-9 w-9 sm:h-8 sm:w-8"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ?
                                <EyeOff className="w-5 h-5 sm:w-4 sm:h-4" /> :
                                <Eye className="w-5 h-5 sm:w-4 sm:h-4" />
                            }
                        </Button>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-11 sm:h-10 text-sm sm:text-base font-medium"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <LoaderIcon className="w-5 h-5 animate-spin" /> : "Reset Password"}
                </Button>
            </form>

            <div className="flex items-center justify-center w-full mt-4 sm:mt-6">
                <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-primary hover:underline text-sm font-medium"
                >
                    Back to login
                </button>
            </div>
        </div>
    );
};

export default ResetPasswordForm;
