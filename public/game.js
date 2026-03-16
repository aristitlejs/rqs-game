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

// โหลดไฟล์ที่จำเป็นที่นี่ (ถ้ามี)
function preload() {
    // โหลด Sprite Sheet (กว้าง 32px สูง 48px ต่อเฟรม)
    this.load.spritesheet('dude', 'https://labs.phaser.io/assets/sprites/dude.png', {
        frameWidth: 32,
        frameHeight: 48
    });
}

function create() {
    socket = io();
    const self = this;

    // สร้าง Animation สำหรับท่าเดิน
    this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'idle',
        frames: [{ key: 'dude', frame: 4 }],
        frameRate: 20
    });

    socket.emit('join_game', { name: 'Center' });

    socket.on('current_players', (players) => {
        Object.keys(players).forEach((id) => {
            addPlayerAvatar(self, players[id], (id === socket.id));
        });
    });

    socket.on('new_player', (playerInfo) => {
        addPlayerAvatar(self, playerInfo, false);
    });


    socket.on('player_updates', (players) => {
        Object.keys(players).forEach((id) => {
            let avatar = (id === socket.id) ? player : otherPlayers[id];
            if (avatar) {
                avatar.setPosition(players[id].x, players[id].y);
                avatar.label.setPosition(players[id].x, players[id].y - 40);

                // 2. ควบคุม Animation ตามการขยับ
                if (players[id].vx !== 0 || players[id].vy !== 0) {
                    avatar.play('walk', true);
                    // กลับด้านภาพถ้าเดินไปทางซ้าย
                    avatar.flipX = (players[id].vx < 0);
                } else {
                    avatar.play('idle');
                }
            }
        });
    });

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

    socket.on('new_chat', (data) => {
        // หาว่าใครเป็นคนส่ง (ตัวเราหรือคนอื่น)
        let target = (data.id === socket.id) ? player : otherPlayers[data.id];

        if (target) {
            showChatBubble(this, target, data.message);
        }
    });
}

function showChatBubble(scene, avatar, message) {
    // ถ้ามีข้อความเก่าอยู่ให้ลบทิ้งก่อน
    if (avatar.chatText) avatar.chatText.destroy();

    // สร้างตัวหนังสือเหนือหัว
    avatar.chatText = scene.add.text(avatar.x, avatar.y - 70, message, {
        fontSize: '18px',
        fill: '#ffffff',
        backgroundColor: '#000000bb',
        padding: { x: 8, y: 4 },
        align: 'center'
    }).setOrigin(0.5);

    // ลบข้อความทิ้งหลังจาก 4 วินาที
    scene.time.delayedCall(4000, () => {
        if (avatar.chatText) avatar.chatText.destroy();
    });
}

function update() {
    // ส่วนนี้ Phaser จะคอยรันตลอดเวลา

    // ให้ Label ชื่อวิ่งตาม
    if (player && player.label) player.label.setPosition(player.x, player.y - 40);
    // ให้ Chat Bubble วิ่งตาม (ถ้ามี)
    if (player && player.chatText) player.chatText.setPosition(player.x, player.y - 70);

    Object.values(otherPlayers).forEach(p => {
        if (p.label) p.label.setPosition(p.x, p.y - 40);
        if (p.chatText) p.chatText.setPosition(p.x, p.y - 70);
    });
}

// ฟังก์ชันหลักในการวาดตัวละคร
function addPlayerAvatar(scene, info, isLocal) {
    //const color = isLocal ? 0x00ff00 : 0xff0000;

    // สร้างสี่เหลี่ยม
    //const avatar = scene.add.rectangle(info.x, info.y, 40, 40, color);
    //scene.physics.add.existing(avatar);

    // สร้างสี่เหลี่ยม avatar
    const avatar = scene.physics.add.sprite(info.x, info.y, 'dude');

    //สุ่ม Skin
    const randomColor = info.color ? parseInt(info.color, 16) : Math.random() * 0xffffff;
    avatar.setTint(randomColor);
     
    // สร้างชื่อบนหัว
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