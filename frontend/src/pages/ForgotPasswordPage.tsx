import React from "react";
import { Link } from "react-router-dom";
import ForgotPasswordForm from "@/components/auth/forgot-password-form";

const ForgotPasswordPage = () => (
    <div className="flex flex-col items-start max-w-sm mx-auto min-h-screen w-full px-4 md:px-0 md:pt-20 text-white pb-6">
        <div className="flex items-center w-full py-4 md:py-8 border-b border-border/80">
            <Link to="/#home" className="flex items-center gap-x-2">
                <img src="/logo.png" className="w-6 h-6" alt="CryptFinder Logo" />
                <h1 className="text-lg font-medium">CryptFinder</h1>
            </Link>
        </div>

        <div className="w-full flex-1">
            <ForgotPasswordForm />
        </div>
    </div>
);

export default ForgotPasswordPage;



