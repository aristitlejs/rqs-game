//express → สร้าง web server
//http → ครอบ express เพื่อใช้กับ socket
//socket.io → real - time communication

const express = require('express');
const app = express();
const http = require('http').createServer(app);
//const io = require('socket.io')(http);
const io = require('socket.io')(http, {
    pingInterval: 1000,
    pingTimeout: 5000,
    cookie: false
});

const path = require('path');

//Serve ไฟล์หน้าเว็บ
app.use(express.static(path.join(__dirname, 'public')));

//ตัวแปรผู้เล่น
let players = {};


// เมื่อเชื่อมต่อ
io.on('connection', (socket) => {

    // เมื่อผู้เล่นใหม่ Join
    console.log('A user connected:', socket.id);
    socket.on('join_game', (data) => {

        //สร้าง player ใหม่
        players[socket.id] = {
            id: socket.id,
            name: data.name || 'Cat',
            x: Math.random() * 500 + 200,
            y: Math.random() * 500 + 200,
            vx: 0,
            vy: 0,
            catType: Math.floor(Math.random() * 8) // สุ่มเลข avatar
        };

        // ส่งข้อมูลผู้เล่นทั้งหมดที่มีอยู่ตอนนี้ให้ "คนที่เพิ่งเข้าใหม่"
        socket.emit('current_players', players);

        // บอก "คนอื่นๆ" ในเกมว่ามีคนใหม่เข้า
        socket.broadcast.emit('new_player', players[socket.id]);

        // อัปเดตจำนวนผู้เล่น
        io.emit('update_count', Object.keys(players).length);
        console.log("Player joined:", players[socket.id].name);
    });

    // รับ input จาก client
    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].vx = data.vx;
            players[socket.id].vy = data.vy;

            // อัปเดตพิกัด (คูณด้วยความเร็วที่ต้องการ)
            const speed = 3;
            players[socket.id].x += data.vx * speed;
            players[socket.id].y += data.vy * speed;
        }
    });

    // เมื่อผู้เล่นออก
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

// Game Loop สำหรับขยับตำแหน่ง
setInterval(() => {
    Object.values(players).forEach(p => {
        p.x += (p.vx * 5); // ความเร็ว
        p.y += (p.vy * 5);
    });
    io.emit('player_updates', players); // ส่งตำแหน่งใหม่ให้ทุกหน้าจอ
}, 1000 / 60);

 
// Start Server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));