"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 as LoaderIcon } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { Label } from "../ui/label";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const SignUpForm = () => {
    const router = useNavigate();


    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [phone, setPhone] = useState<string | undefined>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [countryCode, setCountryCode] = useState<string>("");

    useEffect(() => {
        fetch("https://ipinfo.io/json?token=2534ea0cc424d6")
            .then((response) => response.json())
            .then((data) => {
                if (data.country) {
                    setCountryCode(data.country);
                }
            })
            .catch((error) => console.error("Error fetching IP info:", error));
    }, []);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
    
        // Check if all fields are filled
        if (!name.trim() || !email.trim() || !phone || !password.trim()) {
            toast.error("Please fill in all fields.");
            return;
        }
    
        setIsLoading(true);
    
        const requestData = [{
            email: email.trim(),
            clientDeskId: 1,
            firstName: name.trim(),
            phone: phone.startsWith("+") ? phone : `+${phone}`
        }];
    
        try {
            const response = await fetch("https://hooks.zapier.com/hooks/catch/18951317/2gbtjo5/", {
                method: "POST",
                body: JSON.stringify(requestData)
            });
    
            const responseData = await response.json();
            console.log("Server response:", responseData);
    
            if (response.ok) {
                toast.success("Form submitted successfully, our agent will contact you soon!");
                await new Promise(resolve => setTimeout(resolve, 10000));
                router("/");
            } else {
                toast.error("Failed to submit the form.");
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-start gap-y-6 py-8 w-full px-0.5">
            <h2 className="text-2xl font-semibold">
                Create an account
            </h2>

            <form onSubmit={handleSignUp} className="w-full">
                <div className="space-y-2 w-full">
                    <Label htmlFor="name">
                        Name
                    </Label>
                    <Input
                        id="name"
                        type="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full focus-visible:border-foreground"
                    />
                </div>
                <div className="mt-4 space-y-2 w-full">
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
                    />
                </div>
                <div className="mt-4 space-y-2">
                    <Label htmlFor="phone">
                        Phone number
                    </Label>
                    <div className="relative w-full ">
                        <PhoneInput
                            international
                            // @ts-ignore
                            defaultCountry={countryCode}
                            value={phone}
                            onChange={setPhone}
                            placeholder="Enter your phone number"
                            className="w-full flex h-10 !bg-background rounded-md border border-input px-3 py-2 text-sm "
                            maxLength={15}
                        />
                    </div>
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
                <div className="mt-4 w-full">
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <LoaderIcon className="w-5 h-5 animate-spin" />
                        ) : "Continue"}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default SignUpForm;