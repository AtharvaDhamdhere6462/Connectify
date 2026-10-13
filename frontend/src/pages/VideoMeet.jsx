import React, { useEffect, useRef, useState } from 'react';
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import styles from "../styles/videoComponent.module.css";
import server from '../environment';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
};

export default function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState(true);
    let [audio, setAudio] = useState(true);
    let [screen, setScreen] = useState(false);

    let [showModal, setModal] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState(false);

    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);

    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState(() => {
        try {
            const saved = localStorage.getItem("user");
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.name || parsed.username || "";
            }
        } catch {}
        return "";
    });

    const videoRef = useRef([]);
    let [videos, setVideos] = useState([]);
    let [participantsMap, setParticipantsMap] = useState({});

    useEffect(() => {
        getPermissions();

        return () => {
            // Clean up when leaving component
            if (window.localStream) {
                try {
                    window.localStream.getTracks().forEach(track => track.stop());
                } catch (e) {}
            }
            if (socketRef.current) {
                try {
                    socketRef.current.disconnect();
                } catch (e) {}
            }
            for (let id in connections) {
                try {
                    connections[id].close();
                } catch (e) {}
                delete connections[id];
            }
        };
    }, []);

    const getPermissions = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setVideoAvailable(true);
            setAudioAvailable(true);
            setVideo(true);
            setAudio(true);
            window.localStream = stream;
            if (localVideoref.current) {
                localVideoref.current.srcObject = stream;
            }
        } catch (error) {
            console.log("Audio+Video together failed, trying fallback:", error);
            let fallbackStream = new MediaStream();
            let hasVideo = false;
            let hasAudio = false;

            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                setVideoAvailable(true);
                setVideo(true);
                hasVideo = true;
                videoStream.getVideoTracks().forEach(track => fallbackStream.addTrack(track));
            } catch (vErr) {
                console.log("Video permission denied/unavailable:", vErr);
                setVideoAvailable(false);
                setVideo(false);
            }

            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setAudioAvailable(true);
                setAudio(true);
                hasAudio = true;
                audioStream.getAudioTracks().forEach(track => fallbackStream.addTrack(track));
            } catch (aErr) {
                console.log("Audio permission denied/unavailable:", aErr);
                setAudioAvailable(false);
                setAudio(false);
            }

            if (hasVideo || hasAudio) {
                window.localStream = fallbackStream;
                if (localVideoref.current) {
                    localVideoref.current.srcObject = fallbackStream;
                }
            }
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            setScreenAvailable(true);
        } else {
            setScreenAvailable(false);
        }
    };

    let getDislayMedia = () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(getDislayMediaSuccess)
                .catch((e) => {
                    console.log("Display media error:", e);
                    setScreen(false);
                });
        }
    };

    let getDislayMediaSuccess = (stream) => {
        const screenVideoTrack = stream.getVideoTracks()[0];

        // Replace track on all existing peer connections
        for (let id in connections) {
            const pc = connections[id];
            if (pc && pc.getSenders) {
                const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (videoSender && screenVideoTrack) {
                    videoSender.replaceTrack(screenVideoTrack);
                }
            }
        }

        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }

        screenVideoTrack.onended = () => {
            setScreen(false);
            // Revert back to camera track
            if (window.localStream) {
                const camVideoTrack = window.localStream.getVideoTracks()[0];
                for (let id in connections) {
                    const pc = connections[id];
                    if (pc && pc.getSenders) {
                        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                        if (videoSender && camVideoTrack) {
                            videoSender.replaceTrack(camVideoTrack);
                        }
                    }
                }
                if (localVideoref.current) {
                    localVideoref.current.srcObject = window.localStream;
                }
            }
        };
    };

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message);

        if (fromId !== socketIdRef.current && connections[fromId]) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }));
                            }).catch(e => console.log(e));
                        }).catch(e => console.log(e));
                    }
                }).catch(e => console.log(e));
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
            }
        }
    };

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            socketIdRef.current = socketRef.current.id;
            socketRef.current.emit('join-call', window.location.href, username || "Guest");

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-name-updated', ({ socketId, username: peerName }) => {
                setParticipantsMap(prev => ({
                    ...prev,
                    [socketId]: peerName
                }));
            });

            socketRef.current.on('user-left', (id) => {
                setVideos((prevVideos) => {
                    const filtered = prevVideos.filter((v) => v.socketId !== id);
                    videoRef.current = filtered;
                    return filtered;
                });
                setParticipantsMap(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                if (connections[id]) {
                    try {
                        connections[id].close();
                    } catch (e) {}
                    delete connections[id];
                }
            });

            socketRef.current.on('user-joined', (id, clients, roomUsers) => {
                if (roomUsers && Array.isArray(roomUsers)) {
                    setParticipantsMap(prev => {
                        const next = { ...prev };
                        roomUsers.forEach(u => {
                            if (u.socketId) next[u.socketId] = u.username;
                        });
                        return next;
                    });
                }
                clients.forEach((socketListId) => {
                    if (connections[socketListId]) return;

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }));
                        }
                    };

                    connections[socketListId].onaddstream = (event) => {
                        setVideos(prevVideos => {
                            let videoExists = prevVideos.find(v => v.socketId === socketListId);
                            if (videoExists) {
                                const updated = prevVideos.map(v =>
                                    v.socketId === socketListId ? { ...v, stream: event.stream } : v
                                );
                                videoRef.current = updated;
                                return updated;
                            } else {
                                const newVideo = {
                                    socketId: socketListId,
                                    stream: event.stream,
                                    autoplay: true,
                                    playsinline: true
                                };
                                const updated = [...prevVideos, newVideo];
                                videoRef.current = updated;
                                return updated;
                            }
                        });
                    };

                    if (window.localStream) {
                        connections[socketListId].addStream(window.localStream);
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                        window.localStream = blackSilence();
                        connections[socketListId].addStream(window.localStream);
                    }
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;

                        try {
                            connections[id2].createOffer().then((description) => {
                                connections[id2].setLocalDescription(description)
                                    .then(() => {
                                        socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }));
                                    })
                                    .catch(e => console.log(e));
                            });
                        } catch (e) {
                            console.log(e);
                        }
                    }
                }
            });
        });
    };

    let silence = () => {
        let ctx = new AudioContext();
        let oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    };

    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height });
        canvas.getContext('2d').fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    };

    let handleVideo = async () => {
        const nextVideoState = !video;
        setVideo(nextVideoState);

        if (window.localStream) {
            const videoTracks = window.localStream.getVideoTracks();
            if (videoTracks.length > 0) {
                videoTracks.forEach(track => {
                    track.enabled = nextVideoState;
                });
            } else if (nextVideoState) {
                try {
                    const freshStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    const freshTrack = freshStream.getVideoTracks()[0];
                    if (freshTrack) {
                        window.localStream.addTrack(freshTrack);
                        if (localVideoref.current) {
                            localVideoref.current.srcObject = window.localStream;
                        }
                        for (let id in connections) {
                            const pc = connections[id];
                            if (pc && pc.getSenders) {
                                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                                if (sender) {
                                    sender.replaceTrack(freshTrack);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error("Could not obtain camera stream:", e);
                    setVideo(false);
                }
            }
        }
    };

    let handleAudio = async () => {
        const nextAudioState = !audio;
        setAudio(nextAudioState);

        if (window.localStream) {
            const audioTracks = window.localStream.getAudioTracks();
            if (audioTracks.length > 0) {
                audioTracks.forEach(track => {
                    track.enabled = nextAudioState;
                });
            } else if (nextAudioState) {
                try {
                    const freshStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const freshTrack = freshStream.getAudioTracks()[0];
                    if (freshTrack) {
                        window.localStream.addTrack(freshTrack);
                    }
                } catch (e) {
                    console.error("Could not obtain audio stream:", e);
                    setAudio(false);
                }
            }
        }
    };

    let handleScreen = () => {
        if (!screen) {
            setScreen(true);
            getDislayMedia();
        } else {
            setScreen(false);
            if (window.localStream) {
                const camVideoTrack = window.localStream.getVideoTracks()[0];
                for (let id in connections) {
                    const pc = connections[id];
                    if (pc && pc.getSenders) {
                        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                        if (videoSender && camVideoTrack) {
                            videoSender.replaceTrack(camVideoTrack);
                        }
                    }
                }
                if (localVideoref.current) {
                    localVideoref.current.srcObject = window.localStream;
                }
            }
        }
    };

    let handleEndCall = () => {
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
            if (localVideoref.current && localVideoref.current.srcObject) {
                localVideoref.current.srcObject.getTracks().forEach(track => track.stop());
            }
        } catch (e) {}

        if (localStorage.getItem("token")) {
            window.location.href = "/home";
        } else {
            window.location.href = "/";
        }
    };

    let handleMessage = (e) => {
        setMessage(e.target.value);
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prev) => prev + 1);
        }
    };

    let sendMessage = () => {
        if (!message || message.trim() === "") return;
        if (socketRef.current) {
            socketRef.current.emit('chat-message', message, username || "Anonymous");
        }
        setMessage("");
    };

    let connect = () => {
        setAskForUsername(false);
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    };

    return (
        <div>
            {askForUsername === true ? (
                <div className={styles.lobbyContainer}>
                    <div className={styles.lobbyCard}>
                        <h2 className={styles.lobbyTitle}>Join Video Call</h2>

                        <div className={styles.lobbyPreviewContainer}>
                            <video
                                className={styles.lobbyVideo}
                                ref={el => {
                                    localVideoref.current = el;
                                    if (el && window.localStream && el.srcObject !== window.localStream) {
                                        el.srcObject = window.localStream;
                                    }
                                }}
                                autoPlay
                                muted
                                playsInline
                            />
                        </div>

                        <div className={styles.lobbyForm}>
                            <TextField
                                id="username-input"
                                label="Your Name"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                variant="outlined"
                                fullWidth
                                sx={{
                                    input: { color: 'white' },
                                    label: { color: '#94a3b8' },
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                        '&:hover fieldset': { borderColor: '#818cf8' },
                                        '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                                    }
                                }}
                            />
                            <Button
                                variant="contained"
                                onClick={connect}
                                size="large"
                                sx={{
                                    backgroundColor: '#6366f1',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    '&:hover': { backgroundColor: '#4f46e5' }
                                }}
                            >
                                Enter Meeting Room
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
                    {/* Chat Drawer */}
                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <div className={styles.chatTitleHeader}>
                                    <h2>In-Call Chat</h2>
                                    <IconButton size="small" onClick={() => setModal(false)} style={{ color: '#94a3b8' }}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </div>

                                <div className={styles.chattingDisplay}>
                                    {messages.length !== 0 ? (
                                        messages.map((item, index) => (
                                            <div className={styles.chatMessageBubble} key={index}>
                                                <p className={styles.chatMessageSender}>{item.sender}</p>
                                                <p className={styles.chatMessageText}>{item.data}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ color: '#64748b', textAlign: 'center', marginTop: '30px' }}>
                                            No messages yet. Send a message to participants!
                                        </p>
                                    )}
                                </div>

                                <div className={styles.chattingArea}>
                                    <TextField
                                        value={message}
                                        onChange={handleMessage}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                sendMessage();
                                            }
                                        }}
                                        placeholder="Type a message..."
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        sx={{
                                            input: { color: 'white' },
                                            '& .MuiOutlinedInput-root': {
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                                '&:hover fieldset': { borderColor: '#818cf8' },
                                                '&.Mui-focused fieldset': { borderColor: '#6366f1' },
                                            }
                                        }}
                                    />
                                    <IconButton
                                        onClick={sendMessage}
                                        sx={{
                                            backgroundColor: '#6366f1',
                                            color: 'white',
                                            '&:hover': { backgroundColor: '#4f46e5' }
                                        }}
                                    >
                                        <SendIcon fontSize="small" />
                                    </IconButton>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Conference Remote Videos Grid */}
                    <div className={styles.conferenceView}>
                        {videos.length === 0 ? (
                            <div className={styles.noOtherUsersMessage}>
                                Waiting for other participants to join...
                            </div>
                        ) : (
                            videos.map((v) => {
                                const peerName = participantsMap[v.socketId] || `Participant`;
                                const peerId = v.socketId ? v.socketId.substring(0, 6) : "";

                                return (
                                    <div key={v.socketId} className={styles.participantCard}>
                                        <video
                                            data-socket={v.socketId}
                                            ref={ref => {
                                                if (ref && v.stream && ref.srcObject !== v.stream) {
                                                    ref.srcObject = v.stream;
                                                }
                                            }}
                                            autoPlay
                                            playsInline
                                            className={styles.participantVideo}
                                        />
                                        <div className={styles.participantBadge}>
                                            <span className={styles.participantName}>{peerName}</span>
                                            {peerId && (
                                                <span className={styles.participantId}>ID: {peerId}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Local User Preview Picture-in-Picture */}
                    <div className={styles.meetUserVideoContainer}>
                        <video
                            className={styles.meetUserVideo}
                            ref={el => {
                                localVideoref.current = el;
                                if (el && window.localStream && el.srcObject !== window.localStream) {
                                    el.srcObject = window.localStream;
                                }
                            }}
                            autoPlay
                            muted
                            playsInline
                            style={{ display: video ? "block" : "none" }}
                        />
                        {!video && (
                            <div className={styles.meetUserVideoOff}>
                                <div className={styles.avatarPlaceholder}>
                                    {username ? username.charAt(0).toUpperCase() : "U"}
                                </div>
                                <span className={styles.videoOffLabel}>
                                    <VideocamOffIcon fontSize="inherit" /> Camera Off
                                </span>
                            </div>
                        )}
                        <div className={styles.userNameBadge}>
                            <span className={styles.participantName}>
                                {username || "You"} (You)
                            </span>
                            {socketIdRef.current && (
                                <span className={styles.participantId}>
                                    ID: {socketIdRef.current.substring(0, 6)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Bottom Floating Control Bar */}
                    <div className={styles.buttonContainers}>
                        <IconButton
                            onClick={handleVideo}
                            style={{
                                color: "white",
                                backgroundColor: video ? "rgba(255, 255, 255, 0.15)" : "#e11d48",
                                padding: "10px"
                            }}
                            title={video ? "Turn camera off" : "Turn camera on"}
                        >
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>

                        <IconButton
                            onClick={handleEndCall}
                            style={{
                                color: "white",
                                backgroundColor: "#ef4444",
                                padding: "10px"
                            }}
                            title="End call"
                        >
                            <CallEndIcon />
                        </IconButton>

                        <IconButton
                            onClick={handleAudio}
                            style={{
                                color: "white",
                                backgroundColor: audio ? "rgba(255, 255, 255, 0.15)" : "#e11d48",
                                padding: "10px"
                            }}
                            title={audio ? "Mute microphone" : "Unmute microphone"}
                        >
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable && (
                            <IconButton
                                onClick={handleScreen}
                                style={{
                                    color: "white",
                                    backgroundColor: screen ? "#3b82f6" : "rgba(255, 255, 255, 0.15)",
                                    padding: "10px"
                                }}
                                title={screen ? "Stop sharing screen" : "Share screen"}
                            >
                                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>
                        )}

                        <Badge badgeContent={newMessages} max={99} color="primary">
                            <IconButton
                                onClick={() => {
                                    setModal(!showModal);
                                    setNewMessages(0);
                                }}
                                style={{
                                    color: "white",
                                    backgroundColor: showModal ? "#6366f1" : "rgba(255, 255, 255, 0.15)",
                                    padding: "10px"
                                }}
                                title="Chat"
                            >
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>
                </div>
            )}
        </div>
    );
}
