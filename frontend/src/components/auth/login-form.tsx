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
        <div className="flex flex-col items-start gap-y-6 py-8 w-full px-0.5">
            <h2 className="text-2xl font-semibold">
                Sign in to your account
            </h2>

            <form onSubmit={handleLogin} className="w-full">
                <div className="space-y-2 w-full">
                    <Label htmlFor="email">
                        Email
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full focus-visible:border-foreground"
                        required
                    />
                </div>
                
                <div className="mt-4 space-y-2">
                    <Label htmlFor="password">
                        Password
                    </Label>
                    <div className="relative w-full">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full focus-visible:border-foreground"
                            required
                        />
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute top-1 right-1"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ?
                                <EyeOff className="w-4 h-4" /> :
                                <Eye className="w-4 h-4" />
                            }
                        </Button>
                    </div>
                </div>
                
                <div className="mt-6 w-full">
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <LoaderIcon className="w-5 h-5 animate-spin" />
                        ) : "Sign In"}
                    </Button>
                </div>
            </form>

            <div className="flex items-center justify-center w-full mt-4">
                <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button 
                        type="button"
                        onClick={() => router("/signup")} 
                        className="text-primary hover:underline"
                    >
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginForm;
