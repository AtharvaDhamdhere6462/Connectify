import React, { useContext, useEffect } from 'react';
import "../App.css";
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function LandingPage() {
    const router = useNavigate();
    const { isAuthenticated, authLoading, userData, handleLogout } = useContext(AuthContext);

    // If already logged in, automatically proceed to dashboard
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router("/home", { replace: true });
        }
    }, [authLoading, isAuthenticated, router]);

    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <img src="logo.png" alt="Connectify" style={{ width: "10%" }} />
                </div>
                <div className='navlist'>
                    <p onClick={() => {
                        router("/aljk23");
                    }}>Join as Guest</p>
                    {isAuthenticated ? (
                        <>
                            <p onClick={() => router("/home")}>Dashboard</p>
                            <div onClick={handleLogout} role='button'>
                                <p>Logout</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <p onClick={() => {
                                router("/auth");
                            }}>Register</p>
                            <div onClick={() => {
                                router("/auth");
                            }} role='button'>
                                <p>Login</p>
                            </div>
                        </>
                    )}
                </div>
            </nav>

            <div className="landingMainContainer">
                <div>
                    <h1><span style={{ color: "#FF9839" }}>Connect</span> with your loved Ones</h1>
                    <p>Cover a distance by Apna Video Call</p>
                    <div role='button'>
                        <Link to={isAuthenticated ? "/home" : "/auth"}>
                            {isAuthenticated ? "Go to Dashboard" : "Get Started"}
                        </Link>
                    </div>
                </div>
                <div>
                    <img src="/mobile.png" alt="Connectify Mobile" />
                </div>
            </div>
        </div>
    );
}
