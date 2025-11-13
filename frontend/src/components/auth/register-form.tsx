"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 as LoaderIcon } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { toast } from "sonner";
import { Label } from "../ui/label";
import { apiFetch } from "../../utils/api";

const RegisterForm = () => {
    const router = useNavigate();

    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [phone, setPhone] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
    
        // Check if all fields are filled
        if (!name.trim() || !email.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
            toast.error("Please fill in all fields.");
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            toast.error("Please enter a valid email address.");
            return;
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        // Check password length
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters long.");
            return;
        }
    
        setIsLoading(true);
        
        try {
            const response = await apiFetch('/registration-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success("Registration request submitted successfully! Please wait for admin approval.");
                // Clear form
                setName("");
                setEmail("");
                setPhone("");
                setPassword("");
                setConfirmPassword("");
                // Redirect to login page after a delay
                setTimeout(() => {
                    router("/login");
                }, 2000);
            } else {
                toast.error(data.message || "Registration failed. Please try again.");
            }
        } catch (error) {
            console.error("Registration error:", error);
            toast.error("An error occurred during registration. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-start gap-y-4 sm:gap-y-6 py-4 sm:py-8 w-full">
            <h2 className="text-xl sm:text-2xl font-semibold w-full">
                Create your account
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground -mt-2 sm:-mt-4 w-full">
                Your registration will be reviewed by an administrator.
            </p>

            <form onSubmit={handleRegister} className="w-full">
                <div className="space-y-2 w-full">
                    <Label htmlFor="name" className="text-sm">
                        Full Name
                    </Label>
                    <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full focus-visible:border-foreground h-11 sm:h-10"
                        required
                    />
                </div>

                <div className="mt-4 space-y-2 w-full">
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
                    <Label htmlFor="phone" className="text-sm">
                        Phone Number
                    </Label>
                    <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter your phone number"
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
                    <p className="text-xs text-muted-foreground">
                        Password must be at least 8 characters long
                    </p>
                </div>

                <div className="mt-4 space-y-2 w-full">
                    <Label htmlFor="confirmPassword" className="text-sm">
                        Confirm Password
                    </Label>
                    <div className="relative w-full">
                        <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                            className="w-full focus-visible:border-foreground h-11 sm:h-10 pr-12"
                            required
                        />
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute top-1/2 -translate-y-1/2 right-1 h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                            {showConfirmPassword ?
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
                        ) : "Create Account"}
                    </Button>
                </div>
            </form>

            <div className="flex items-center justify-center w-full mt-4 sm:mt-6">
                <p className="text-xs sm:text-sm text-muted-foreground text-center">
                    Already have an account?{" "}
                    <button 
                        type="button"
                        onClick={() => router("/login")} 
                        className="text-primary hover:underline font-medium touch-manipulation"
                    >
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    );
};

export default RegisterForm;

