"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 as LoaderIcon } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { toast } from "sonner";
import { Label } from "../ui/label";
import { useAuth } from "../../contexts/AuthContext";

const LoginForm = () => {
    const router = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if all fields are filled
        if (!email.trim() || !password.trim()) {
            toast.error("Please fill in all fields.");
            return;
        }

        setIsLoading(true);

        try {
            const success = await login(email.trim(), password);
            if (success) {
                router("/profile");
            }
        } catch (error) {
            console.error("Login error:", error);
            toast.error("An error occurred during login. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-start gap-y-4 sm:gap-y-6 py-4 sm:py-8 w-full">
            <h2 className="text-xl sm:text-2xl font-semibold w-full">
                Sign in to your account
            </h2>

            <form onSubmit={handleLogin} className="w-full">
                <div className="space-y-2 w-full">
                    <Label htmlFor="email" className="text-sm">
                        Email
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full focus-visible:border-foreground h-11 sm:h-10"
                        required
                    />
                </div>

                <div className="mt-4 space-y-2 w-full">
                    <Label htmlFor="password" className="text-sm">
                        Password
                    </Label>
                    <div className="relative w-full">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full focus-visible:border-foreground h-11 sm:h-10 pr-12"
                            required
                        />
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute top-1/2 -translate-y-1/2 right-1 h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ?
                                <EyeOff className="w-5 h-5 sm:w-4 sm:h-4" /> :
                                <Eye className="w-5 h-5 sm:w-4 sm:h-4" />
                            }
                        </Button>
                    </div>
                </div>

                <div className="mt-6 w-full">
                    <Button
                        type="submit"
                        className="w-full h-11 sm:h-10 text-sm sm:text-base font-medium"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <LoaderIcon className="w-5 h-5 animate-spin" />
                        ) : "Sign In"}
                    </Button>
                </div>
            </form>

            <div className="flex items-center justify-center w-full mt-4">
                <button
                    type="button"
                    onClick={() => router("/forgot-password")}
                    className="text-primary hover:underline text-sm font-medium touch-manipulation"
                >
                    Forgot password?
                </button>
            </div>

            <div className="flex items-center justify-center w-full mt-4 sm:mt-6">
                <p className="text-xs sm:text-sm text-muted-foreground text-center">
                    Don't have an account?{" "}
                    <button
                        type="button"
                        onClick={() => router("/register")}
                        className="text-primary hover:underline font-medium touch-manipulation"
                    >
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginForm;
