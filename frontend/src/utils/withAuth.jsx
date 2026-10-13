import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

const withAuth = (WrappedComponent) => {
    const AuthComponent = (props) => {
        const router = useNavigate();
        const { authLoading, isAuthenticated } = useContext(AuthContext);

        useEffect(() => {
            if (!authLoading && !isAuthenticated) {
                router("/auth");
            }
        }, [authLoading, isAuthenticated, router]);

        if (authLoading) {
            return (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100vh",
                        backgroundColor: "#0f172a"
                    }}
                >
                    <CircularProgress sx={{ color: "#6366f1" }} size={48} />
                </Box>
            );
        }

        if (!isAuthenticated) {
            return null;
        }

        return <WrappedComponent {...props} />;
    };

    return AuthComponent;
};

export default withAuth;