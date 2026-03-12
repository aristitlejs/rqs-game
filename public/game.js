// public/game.js

// 1. ตั้งค่าพื้นฐาน Phaser
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 } }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);
let socket;
let player;
let otherPlayers = {};

function preload() {
    // โหลดไฟล์ที่จำเป็นที่นี่ (ถ้ามี)
}

function create() {
    socket = io();
    const self = this;

    socket.emit('join_game', { name: 'HOST-SCREEN' });

    // ตั้งค่ากล้องและพื้นหลังเบื้องต้น
    this.cameras.main.setBackgroundColor('#2d2d2d');

    // วาด Grid เพื่อให้รู้ว่าแมพขยับ
    let graphics = this.add.graphics();
    graphics.lineStyle(1, 0x555555, 0.5);
    for (let i = 0; i < 2000; i += 50) {
        graphics.moveTo(i, 0); graphics.lineTo(i, 2000);
        graphics.moveTo(0, i); graphics.lineTo(2000, i);
    }
    graphics.strokePath();

    // --- SOCKET LOGIC ---

    // 1. เมื่อได้รับข้อมูลผู้เล่นทั้งหมด
    socket.on('current_players', (players) => {
        Object.keys(players).forEach((id) => {
            if (id === socket.id) {
                addPlayerAvatar(self, players[id], true);
            } else {
                addPlayerAvatar(self, players[id], false);
            }
        });
    });

    // 2. เมื่อมีผู้เล่นคนอื่น Join
    socket.on('new_player', (playerInfo) => {
        addPlayerAvatar(self, playerInfo, false);
    });

    // 3. เมื่อมีการอัปเดตตำแหน่ง
    socket.on('player_updates', (players) => {
        Object.keys(players).forEach((id) => {
            let avatar = (id === socket.id) ? player : otherPlayers[id];
            if (avatar) {
                avatar.setPosition(players[id].x, players[id].y);
                if (avatar.label) {
                    avatar.label.setPosition(players[id].x, players[id].y - 40);
                }
            }
        });
    });

    // 4. เมื่อผู้เล่นออก
    socket.on('player_disconnected', (id) => {
        if (otherPlayers[id]) {
            if (otherPlayers[id].label) otherPlayers[id].label.destroy();
            otherPlayers[id].destroy();
            delete otherPlayers[id];
        }
    });
}

function update() {
    // ส่วนนี้ Phaser จะคอยรันตลอดเวลา
}

// ฟังก์ชันหลักในการวาดตัวละคร
function addPlayerAvatar(scene, info, isLocal) {
    const color = isLocal ? 0x00ff00 : 0xff0000;

    // สร้างสี่เหลี่ยม
    const avatar = scene.add.rectangle(info.x, info.y, 40, 40, color);
    scene.physics.add.existing(avatar);

    // สร้างชื่อ
    avatar.label = scene.add.text(info.x, info.y - 40, info.name, {
        fontSize: '16px',
        fill: '#ffffff',
        backgroundColor: '#000000aa'
    }).setOrigin(0.5);

    if (isLocal) {
        player = avatar;
        scene.cameras.main.startFollow(player, true, 0.1, 0.1);
    } else {
        otherPlayers[info.id] = avatar;
    }
}