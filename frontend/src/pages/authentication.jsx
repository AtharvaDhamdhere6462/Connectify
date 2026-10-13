import React, { useState, useContext, useEffect } from 'react';
import {
    Box,
    Button,
    CssBaseline,
    TextField,
    Typography,
    Snackbar,
    Alert,
    InputAdornment,
    IconButton,
    CircularProgress,
    Card,
    CardContent,
    Tabs,
    Tab,
    Fade
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AuthContext } from '../contexts/AuthContext';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#6366f1',
            light: '#818cf8',
            dark: '#4f46e5',
        },
        background: {
            default: '#090d16',
            paper: '#111827',
        },
        text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
        },
    },
    typography: {
        fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    shape: {
        borderRadius: 12,
    },
});

export default function Authentication() {
    const navigate = useNavigate();
    const { handleRegister, handleLogin, isAuthenticated, authLoading } = useContext(AuthContext);

    // If already logged in, redirect straight to dashboard
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate('/home', { replace: true });
        }
    }, [authLoading, isAuthenticated, navigate]);

    // Form inputs state
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // UI state
    const [tabIndex, setTabIndex] = useState(0); // 0 = Sign In, 1 = Sign Up
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarText, setSnackbarText] = useState('');

    const handleTabChange = (event, newIndex) => {
        setTabIndex(newIndex);
        setErrorMessage('');
    };

    const validateForm = () => {
        if (tabIndex === 1 && (!name || name.trim().length < 2)) {
            setErrorMessage('Please enter your full name (at least 2 characters).');
            return false;
        }

        if (!username || username.trim().length < 3) {
            setErrorMessage('Username must be at least 3 characters long.');
            return false;
        }

        if (!password || password.length < 6) {
            setErrorMessage('Password must be at least 6 characters long.');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setErrorMessage('');

        if (!validateForm()) return;

        setSubmitting(true);

        try {
            if (tabIndex === 0) {
                // Sign In
                await handleLogin(username, password);
                // On successful login, handleLogin in AuthContext automatically navigates to /home
            } else {
                // Sign Up
                const successMsg = await handleRegister(name, username, password);
                setSnackbarText(successMsg || 'Account registered successfully!');
                setSnackbarOpen(true);
                // Successfully registered and logged in, redirect to dashboard
                setTimeout(() => {
                    navigate('/home');
                }, 400);
            }
        } catch (err) {
            const backendError =
                err.response?.data?.message ||
                err.message ||
                'An error occurred during authentication. Please try again.';
            setErrorMessage(backendError);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    background: 'radial-gradient(circle at 15% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%), radial-gradient(circle at 85% 80%, rgba(168, 85, 247, 0.15) 0%, transparent 40%), #090d16',
                    overflow: 'hidden',
                    p: 2,
                }}
            >
                {/* Back to landing / Join as guest header button */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: { xs: 16, sm: 24 },
                        left: { xs: 16, sm: 32 },
                        zIndex: 10,
                    }}
                >
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate('/')}
                        sx={{
                            color: '#94a3b8',
                            textTransform: 'none',
                            fontWeight: 500,
                            '&:hover': { color: '#f8fafc', backgroundColor: 'rgba(255, 255, 255, 0.05)' }
                        }}
                    >
                        Back to Home
                    </Button>
                </Box>

                <Fade in timeout={600}>
                    <Card
                        elevation={24}
                        sx={{
                            width: '100%',
                            maxWidth: 460,
                            borderRadius: '24px',
                            background: 'rgba(17, 24, 39, 0.85)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.12)',
                        }}
                    >
                        <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
                            {/* App Brand Header */}
                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <Box
                                    sx={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: '16px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 1.5,
                                        boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)',
                                    }}
                                >
                                    <VideoCameraFrontIcon sx={{ color: '#ffffff', fontSize: 28 }} />
                                </Box>
                                <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>
                                    Connectify
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                                    {tabIndex === 0 ? 'Welcome back! Sign in to join calls.' : 'Create your free account to get started.'}
                                </Typography>
                            </Box>

                            {/* Tabs Switcher */}
                            <Box
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                    borderRadius: '14px',
                                    p: 0.5,
                                    mb: 3,
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                }}
                            >
                                <Tabs
                                    value={tabIndex}
                                    onChange={handleTabChange}
                                    variant="fullWidth"
                                    TabIndicatorProps={{
                                        style: {
                                            backgroundColor: '#6366f1',
                                            height: '100%',
                                            borderRadius: '10px',
                                            zIndex: 0,
                                        }
                                    }}
                                    sx={{ minHeight: 40 }}
                                >
                                    <Tab
                                        label="Sign In"
                                        id="signin-tab"
                                        sx={{
                                            zIndex: 1,
                                            minHeight: 40,
                                            fontWeight: 600,
                                            textTransform: 'none',
                                            fontSize: '0.92rem',
                                            color: tabIndex === 0 ? '#ffffff' : '#94a3b8',
                                            '&.Mui-selected': { color: '#ffffff' }
                                        }}
                                    />
                                    <Tab
                                        label="Sign Up"
                                        id="signup-tab"
                                        sx={{
                                            zIndex: 1,
                                            minHeight: 40,
                                            fontWeight: 600,
                                            textTransform: 'none',
                                            fontSize: '0.92rem',
                                            color: tabIndex === 1 ? '#ffffff' : '#94a3b8',
                                            '&.Mui-selected': { color: '#ffffff' }
                                        }}
                                    />
                                </Tabs>
                            </Box>

                            {/* Error Alert */}
                            {errorMessage && (
                                <Fade in>
                                    <Alert
                                        severity="error"
                                        onClose={() => setErrorMessage('')}
                                        sx={{
                                            mb: 2.5,
                                            borderRadius: '12px',
                                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                            color: '#fca5a5',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            '& .MuiAlert-icon': { color: '#ef4444' }
                                        }}
                                    >
                                        {errorMessage}
                                    </Alert>
                                </Fade>
                            )}

                            {/* Form */}
                            <Box component="form" onSubmit={handleSubmit} noValidate>
                                {tabIndex === 1 && (
                                    <TextField
                                        margin="normal"
                                        required
                                        fullWidth
                                        id="auth-fullname"
                                        label="Full Name"
                                        name="name"
                                        autoComplete="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <BadgeOutlinedIcon sx={{ color: '#6366f1' }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            mb: 1.5,
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                                borderRadius: '12px',
                                            }
                                        }}
                                    />
                                )}

                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="auth-username"
                                    label="Username"
                                    name="username"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PersonOutlineIcon sx={{ color: '#6366f1' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        mb: 1.5,
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            borderRadius: '12px',
                                        }
                                    }}
                                />

                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    id="auth-password"
                                    autoComplete={tabIndex === 0 ? 'current-password' : 'new-password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    helperText={tabIndex === 1 ? 'Minimum 6 characters' : ''}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlinedIcon sx={{ color: '#6366f1' }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="toggle password visibility"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    edge="end"
                                                    size="small"
                                                    sx={{ color: '#94a3b8' }}
                                                >
                                                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        mb: 2,
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            borderRadius: '12px',
                                        }
                                    }}
                                />

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    disabled={submitting}
                                    id="auth-submit-btn"
                                    sx={{
                                        mt: 1,
                                        mb: 2,
                                        py: 1.4,
                                        borderRadius: '12px',
                                        fontWeight: 600,
                                        fontSize: '0.98rem',
                                        textTransform: 'none',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                                            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.6)',
                                        },
                                    }}
                                >
                                    {submitting ? (
                                        <CircularProgress size={24} sx={{ color: '#ffffff' }} />
                                    ) : tabIndex === 0 ? (
                                        'Sign In'
                                    ) : (
                                        'Create Account'
                                    )}
                                </Button>
                            </Box>

                            {/* Guest option */}
                            <Box sx={{ mt: 2, textAlign: 'center' }}>
                                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                                    Joining a call without an account?{' '}
                                    <Button
                                        onClick={() => navigate('/')}
                                        sx={{
                                            p: 0,
                                            minWidth: 'auto',
                                            color: '#818cf8',
                                            fontWeight: 600,
                                            textTransform: 'none',
                                            fontSize: 'inherit',
                                            verticalAlign: 'baseline',
                                            '&:hover': { textDecoration: 'underline', backgroundColor: 'transparent' }
                                        }}
                                    >
                                        Join as Guest
                                    </Button>
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Fade>

                {/* Feedback snackbar */}
                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={4000}
                    onClose={() => setSnackbarOpen(false)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        onClose={() => setSnackbarOpen(false)}
                        severity="success"
                        sx={{
                            width: '100%',
                            borderRadius: '12px',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            '& .MuiAlert-icon': { color: '#ffffff' }
                        }}
                    >
                        {snackbarText}
                    </Alert>
                </Snackbar>
            </Box>
        </ThemeProvider>
    );
}