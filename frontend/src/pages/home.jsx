import React, { useContext, useState } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import "../App.css";
import { Button, IconButton, TextField, Avatar, Chip } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import LogoutIcon from '@mui/icons-material/Logout';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {
    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");

    const { addToUserHistory, userData, handleLogout } = useContext(AuthContext);

    let handleJoinVideoCall = async () => {
        if (!meetingCode.trim()) return;
        await addToUserHistory(meetingCode.trim());
        navigate(`/${meetingCode.trim()}`);
    };

    return (
        <>
            <div className="navBar">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <h2>Connectify</h2>
                    {userData?.name && (
                        <Chip
                            avatar={<Avatar sx={{ bgcolor: "#6366f1 !important" }}>{userData.name.charAt(0).toUpperCase()}</Avatar>}
                            label={`Hello, ${userData.name}`}
                            variant="outlined"
                            sx={{ color: "inherit", borderColor: "rgba(255, 255, 255, 0.2)" }}
                        />
                    )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <IconButton
                        title="Meeting History"
                        onClick={() => {
                            navigate("/history");
                        }}
                    >
                        <RestoreIcon />
                    </IconButton>
                    <p style={{ margin: 0, cursor: "pointer" }} onClick={() => navigate("/history")}>History</p>

                    <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<LogoutIcon />}
                        onClick={handleLogout}
                        sx={{ ml: 1, textTransform: "none", borderRadius: "8px" }}
                    >
                        Logout
                    </Button>
                </div>
            </div>

            <div className="meetContainer">
                <div className="leftPanel">
                    <div>
                        <h2>Seamless Video Calls, Anytime & Anywhere</h2>
                        <p style={{ color: "#94a3b8", marginBottom: "20px" }}>
                            Enter a meeting code to join your team or friends in high quality video conferencing.
                        </p>

                        <div style={{ display: 'flex', gap: "10px" }}>
                            <TextField
                                value={meetingCode}
                                onChange={e => setMeetingCode(e.target.value)}
                                id="outlined-basic"
                                label="Meeting Code"
                                variant="outlined"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleJoinVideoCall();
                                }}
                            />
                            <Button
                                disabled={!meetingCode.trim()}
                                onClick={handleJoinVideoCall}
                                variant='contained'
                                sx={{ backgroundColor: "#6366f1", '&:hover': { backgroundColor: "#4f46e5" } }}
                            >
                                Join
                            </Button>
                        </div>
                    </div>
                </div>
                <div className='rightPanel'>
                    <img srcSet='/logo3.png' alt="Video Conference" />
                </div>
            </div>
        </>
    );
}

export default withAuth(HomeComponent);