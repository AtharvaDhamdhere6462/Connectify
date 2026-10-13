import axios from "axios";
import httpStatus from "http-status";
import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`
});

// Automatically inject Authorization header if token exists in localStorage
client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState(() => {
        try {
            const savedUser = localStorage.getItem("user");
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });

    const [authLoading, setAuthLoading] = useState(() => {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");
        // Only show full loading blocker if token exists but user profile has never been cached
        return Boolean(token && !savedUser);
    });
    const router = useNavigate();

    // Verify session on app load without wiping session on transient network errors
    useEffect(() => {
        const verifySession = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                setAuthLoading(false);
                return;
            }

            try {
                const response = await client.get("/profile");
                if (response.data && response.data.user) {
                    setUserData(response.data.user);
                    localStorage.setItem("user", JSON.stringify(response.data.user));
                }
            } catch (err) {
                // Only clear session if backend explicitly rejected the token with 401
                if (err.response && err.response.status === 401) {
                    console.warn("Session invalidated by server, clearing local session");
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    setUserData(null);
                } else {
                    console.warn("Profile verification non-fatal error, maintaining local session:", err.message);
                }
            } finally {
                setAuthLoading(false);
            }
        };

        verifySession();
    }, []);

    const handleRegister = async (name, username, password) => {
        try {
            const request = await client.post("/register", {
                name: name.trim(),
                username: username.trim().toLowerCase(),
                password: password
            });

            if (request.status === httpStatus.CREATED) {
                if (request.data.token) {
                    localStorage.setItem("token", request.data.token);
                    if (request.data.user) {
                        localStorage.setItem("user", JSON.stringify(request.data.user));
                        setUserData(request.data.user);
                    }
                }
                return request.data.message || "Registration successful!";
            }
        } catch (err) {
            throw err;
        }
    };

    const handleLogin = async (username, password) => {
        try {
            const request = await client.post("/login", {
                username: username.trim().toLowerCase(),
                password: password
            });

            if (request.status === httpStatus.OK) {
                localStorage.setItem("token", request.data.token);
                if (request.data.user) {
                    localStorage.setItem("user", JSON.stringify(request.data.user));
                    setUserData(request.data.user);
                }
                router("/home");
                return request.data;
            }
        } catch (err) {
            throw err;
        }
    };

    const handleLogout = async () => {
        try {
            await client.post("/logout");
        } catch (e) {
            // Non-blocking logout call
        }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUserData(null);
        router("/auth");
    };

    const getHistoryOfUser = async () => {
        try {
            const token = localStorage.getItem("token");
            const request = await client.get("/get_all_activity", {
                params: { token }
            });
            return request.data;
        } catch (err) {
            throw err;
        }
    };

    const addToUserHistory = async (meetingCode) => {
        try {
            const token = localStorage.getItem("token");
            const request = await client.post("/add_to_activity", {
                token,
                meeting_code: meetingCode
            });
            return request;
        } catch (e) {
            throw e;
        }
    };

    const isAuthenticated = Boolean(userData || localStorage.getItem("token"));

    const data = {
        userData,
        setUserData,
        authLoading,
        isAuthenticated,
        addToUserHistory,
        getHistoryOfUser,
        handleRegister,
        handleLogin,
        handleLogout
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};

