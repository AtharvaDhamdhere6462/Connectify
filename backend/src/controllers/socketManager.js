import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};
let userNames = {};

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("SOMETHING CONNECTED:", socket.id);

        socket.on("join-call", (path, userDisplayName) => {
            let roomPath = path;
            let name = userDisplayName;

            if (typeof path === "object" && path !== null) {
                roomPath = path.path;
                name = path.username;
            }

            if (!name || name.trim() === "") {
                name = `User-${socket.id.substring(0, 5)}`;
            }

            userNames[socket.id] = name;

            if (connections[roomPath] === undefined) {
                connections[roomPath] = [];
            }
            if (!connections[roomPath].includes(socket.id)) {
                connections[roomPath].push(socket.id);
            }

            timeOnline[socket.id] = new Date();

            // Prepare list of users with id and name in this room
            const roomUsers = connections[roomPath].map(id => ({
                socketId: id,
                username: userNames[id] || `User-${id.substring(0, 5)}`
            }));

            for (let a = 0; a < connections[roomPath].length; a++) {
                io.to(connections[roomPath][a]).emit("user-joined", socket.id, connections[roomPath], roomUsers);
            }

            if (messages[roomPath] !== undefined) {
                for (let a = 0; a < messages[roomPath].length; ++a) {
                    io.to(socket.id).emit(
                        "chat-message",
                        messages[roomPath][a]['data'],
                        messages[roomPath][a]['sender'],
                        messages[roomPath][a]['socket-id-sender']
                    );
                }
            }
        });

        socket.on("update-user-name", (name) => {
            if (name && name.trim()) {
                userNames[socket.id] = name;
                for (const [roomKey, clientList] of Object.entries(connections)) {
                    if (clientList.includes(socket.id)) {
                        io.to(roomKey).emit("user-name-updated", {
                            socketId: socket.id,
                            username: name
                        });
                    }
                }
            }
        });

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        socket.on("chat-message", (data, sender) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = [];
                }

                messages[matchingRoom].push({
                    'sender': sender,
                    "data": data,
                    "socket-id-sender": socket.id
                });
                console.log("message", matchingRoom, ":", sender, data);

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id);
                });
            }
        });

        socket.on("disconnect", () => {
            var diffTime = Math.abs(timeOnline[socket.id] - new Date());
            delete userNames[socket.id];

            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        let key = k;

                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id);
                        }

                        var index = connections[key].indexOf(socket.id);
                        connections[key].splice(index, 1);

                        if (connections[key].length === 0) {
                            delete connections[key];
                        }
                    }
                }
            }
        });
    });

    return io;
};
