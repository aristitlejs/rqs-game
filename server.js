const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let players = {};

io.on('connection', (socket) => {

    // เมื่อผู้เล่นใหม่ Join
    console.log('A user connected:', socket.id);
    socket.on('join_game', (data) => {

        // สร้างรายการสีที่เป็นเอกลักษณ์ หรือสุ่มขึ้นมา
        const randomColors = [
            0xff0000, // red
            0x00ff00, // green
            0x0000ff, // blue
            0xffff00, // yellow
            0xff00ff, // magenta
            0x00ffff, // cyan
            0xff8800, // orange
            0x8800ff, // purple
            0x0088ff, // sky blue
            0x00ff88, // mint
            0xff0088, // pink
            0x888888, // gray
            0xffffff, // white
            0x000000, // black
            0x8b4513, // brown
            0x2ecc71, // emerald
            0x3498db, // light blue
            0xe74c3c, // soft red
            0xf1c40f, // gold
            0x1abc9c  // turquoise
        ];
        const selectedColor = randomColors[Math.floor(Math.random() * randomColors.length)];

        if (data.name === 'Center') {
            console.log("Main Screen Connected (Not added to player list)");
            socket.emit('current_players', players); // ส่งแค่รายชื่อคนอื่นให้หน้าจอหลักดู
            return; // จบการทำงาน ไม่ต้องสร้าง Object ผู้เล่นให้ Center
        }

        players[socket.id] = {
            id: socket.id,
            name: data.name || 'Player',
            //x: Math.random() * 800 + 100,
            //y: Math.random() * 600 + 100,
            x: 500,
            y: 500,
            vx: 0,
            vy: 0,
            color: selectedColor // เก็บสีไว้ในข้อมูลผู้เล่น
        };

        // 1. ส่งข้อมูลผู้เล่นทั้งหมดที่มีอยู่ตอนนี้ให้ "คนที่เพิ่งเข้าใหม่"
        socket.emit('current_players', players);

        // 2. บอก "คนอื่นๆ" ในเกมว่ามีคนใหม่เข้า
        socket.broadcast.emit('new_player', players[socket.id]);

        // 3. อัปเดตจำนวนตัวเลข
        io.emit('update_count', Object.keys(players).length);
        console.log("Player joined:", players[socket.id].name);
    });

    socket.on('player_move', (movement) => {
        if (players[socket.id]) {
            players[socket.id].vx = movement.x;
            players[socket.id].vy = movement.y;
        }
    });

    socket.on('disconnect', () => {
        if (players[socket.id]) {
            console.log('Player left:', players[socket.id].name);
            delete players[socket.id]; // ลบข้อมูลออกจาก Object หลัก
            io.emit('player_disconnected', socket.id); // บอก Client ให้ลบ Sprite ทิ้ง
            io.emit('update_count', Object.keys(players).length);
        }
    });

    // ระบบ Chat
    socket.on('send_chat', (msg) => {
        // ส่งข้อความไปให้ทุกคน พร้อมกับ ID ของคนส่ง
        io.emit('new_chat', { id: socket.id, message: msg });
        console.log(`Chat from ${socket.id}: ${msg}`);
    });

});

// Loop สำหรับขยับตำแหน่ง (หัวใจสำคัญของการขยับ)
setInterval(() => {
    Object.values(players).forEach(p => {
        p.x += (p.vx * 7); // ความเร็ว
        p.y += (p.vy * 7);
    });
    io.emit('player_updates', players); // ส่งตำแหน่งใหม่ให้ทุกหน้าจอ
}, 1000 / 60);

 

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));