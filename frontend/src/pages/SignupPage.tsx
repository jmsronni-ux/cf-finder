import React from "react";
import RegisterForm from "@/components/auth/register-form";
import {Link} from "react-router-dom";

const SignupPage = () => {
    return (
        <div className="flex flex-col items-start max-w-sm mx-auto min-h-screen w-full px-4 md:px-0 text-white pb-6">
            <div className="flex items-center w-full py-4 md:py-8 border-b border-border/80">
                <Link to="/#home" className="flex items-center gap-x-2">
                    <img src="/logo.png" className="w-6 h-6" alt="CryptoFinders Logo" />
                    <h1 className="text-lg font-medium">
                    CryptoFinders
                    </h1>
                </Link>
            </div>

            <div className="w-full flex-1">
                <RegisterForm />
            </div>

            <div className="flex flex-col items-start w-full mt-6 md:mt-auto">
                <p className="text-xs sm:text-sm text-muted-foreground text-center w-full leading-relaxed">
                    By signing up, you agree to our{" "}
                    <a href="/AML and KYC Policy.pdf" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-words">
                        Terms of Service
                    </a>
                    {" "}and{" "}
                    <a href="/Privacy Policy.pdf" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-words">
                        Privacy Policy
                    </a>
                </p>
            </div>
        </div>
    )
};

export default SignupPage

