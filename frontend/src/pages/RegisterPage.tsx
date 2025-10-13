import React from "react";
import LoginForm from "@/components/auth/login-form";
import {Link} from "react-router-dom";

const RegisterPage = () => {
    return (
        <div className="flex flex-col items-start max-w-sm mx-auto h-dvh overflow-hidden pt-4 md:pt-20 text-white">
            <div className="flex items-center w-full py-8 border-b border-border/80">
                <Link to="/#home" className="flex items-center gap-x-2">
                    <img src="/logo.png" className="w-6 h-6" />
                    <h1 className="text-lg font-medium">
                    CryptFinder
                    </h1>
                </Link>
            </div>

            <LoginForm />

            <div className="flex flex-col items-start w-full mt-auto">
                <p className="text-sm text-muted-foreground">
                    By signing in, you agree to our{" "}
                    <a href="/AML and KYC Policy.pdf" target="_blank" rel="noopener noreferrer" className="text-primary">
                        Terms of Service{" "}
                    </a>
                    and{" "}
                    <a href="/Privacy Policy.pdf" target="_blank" rel="noopener noreferrer" className="text-primary">
                        Privacy Policy
                    </a>
                </p>
            </div>
        </div>
    )
};

export default RegisterPage
