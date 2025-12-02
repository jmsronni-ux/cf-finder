"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 as LoaderIcon } from "lucide-react";
import { apiFetch } from "@/utils/api";

const ForgotPasswordForm = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!email.trim()) {
            toast.error("Please enter your email address.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await apiFetch("/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setIsComplete(true);
                toast.success(data.message || "Check your email for the new password.");
            } else {
                toast.error(data.message || "Unable to reset password. Try again later.");
            }
        } catch (error) {
            console.error("Forgot password error:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-start gap-y-4 sm:gap-y-6 py-4 sm:py-8 w-full">
            <h2 className="text-xl sm:text-2xl font-semibold w-full">
                Forgot your password?
            </h2>
            <p className="text-sm text-muted-foreground">
                Enter your account email. We&apos;ll send a temporary password you can use to sign in and change it from your profile.
            </p>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div className="space-y-2 w-full">
                    <Label htmlFor="forgot-password-email" className="text-sm">Email</Label>
                    <Input
                        id="forgot-password-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full focus-visible:border-foreground h-11 sm:h-10"
                        required
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full h-11 sm:h-10 text-sm sm:text-base font-medium"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <LoaderIcon className="w-5 h-5 animate-spin" /> : "Send Temporary Password"}
                </Button>
            </form>

            {isComplete && (
                <div className="mt-4 p-4 bg-muted/50 rounded-md w-full text-sm text-muted-foreground">
                    If the email is registered, a temporary password is on its way. Be sure to change it after signing in.
                </div>
            )}

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

export default ForgotPasswordForm;





