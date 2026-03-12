const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let players = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // เมื่อผู้เล่นใหม่ Join
    socket.on('join_game', (data) => {
        players[socket.id] = {
            id: socket.id,
            name: data.name,
            x: Math.random() * 800,
            y: Math.random() * 600,
            color: Math.floor(Math.random() * 16777215).toString(16)
        };
        socket.emit('current_players', players);
        socket.broadcast.emit('new_player', players[socket.id]);
    });

    // รับค่าจาก Joystick (Vector x, y)
    socket.on('player_move', (movement) => {
        if (players[socket.id]) {
            players[socket.id].vx = movement.x;
            players[socket.id].vy = movement.y;
        }
    });

    // ระบบ Chat
    socket.on('send_chat', (msg) => {
        io.emit('new_chat', { id: socket.id, message: msg });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('player_disconnected', socket.id);
    });
});

// Update Loop (60 FPS) สำหรับย้ายตำแหน่งบน Server (Simple Sync)
setInterval(() => {
    Object.values(players).forEach(player => {
        if (player.vx) player.x += player.vx * 5;
        if (player.vy) player.y += player.vy * 5;
    });
    io.emit('player_updates', players);
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));