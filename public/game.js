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
    scene: { preload: preload, create: create, update: update }
};
const game = new Phaser.Game(config);
let socket;
let player; // สำหรับหน้าจอหลัก ตัวนี้มักจะเป็น null เพราะเราไม่วาดตัวเอง
let otherPlayers = {};

function preload() {
    this.load.spritesheet('dude', 'https://labs.phaser.io/assets/sprites/dude.png', {
        frameWidth: 32,
        frameHeight: 48
    });
}
function create() {
    socket = io();
    const self = this;

    // 1. สร้าง Animations
    this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10, repeat: -1
    });
    this.anims.create({ key: 'idle', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });

    // 2. ตั้งค่าฉาก
    this.cameras.main.setBackgroundColor('#2d2d2d');
    let graphics = this.add.graphics();
    graphics.lineStyle(1, 0x555555, 0.5);
    for (let i = 0; i < 2000; i += 50) {
        graphics.moveTo(i, 0); graphics.lineTo(i, 2000);
        graphics.moveTo(0, i); graphics.lineTo(2000, i);
    }
    graphics.strokePath();

    // 3. บอกเซิร์ฟเวอร์ว่าหน้าจอหลักมาแล้ว
    socket.emit('join_game', { name: 'Center' });

    // --- SOCKET LOGIC (รวมเป็นชุดเดียว) ---

    socket.on('current_players', (players) => {
        Object.keys(players).forEach((id) => {
            if (id === socket.id || players[id].name === 'Center') {
                console.log("Found Host/Center, skipping...");
            } else {
                addPlayerAvatar(self, players[id], false);
            }
        });
    });

    socket.on('new_player', (playerInfo) => {
        if (playerInfo.id !== socket.id && playerInfo.name !== 'Center') {
            addPlayerAvatar(self, playerInfo, false);
        }
    });

    socket.on('player_updates', (players) => {
        Object.keys(players).forEach((id) => {
            let avatar = (id === socket.id) ? player : otherPlayers[id];
            if (avatar) {
                avatar.setPosition(players[id].x, players[id].y);

                // อัปเดตทิศทางและท่าทาง
                if (players[id].vx !== 0 || players[id].vy !== 0) {
                    avatar.play('walk', true);
                    avatar.flipX = (players[id].vx < 0);
                } else {
                    avatar.play('idle');
                }
            }
        });
    });

    socket.on('player_disconnected', (id) => {
        if (otherPlayers[id]) {
            if (otherPlayers[id].label) otherPlayers[id].label.destroy();
            if (otherPlayers[id].chatText) otherPlayers[id].chatText.destroy();
            otherPlayers[id].destroy();
            delete otherPlayers[id];
        }
    });

    socket.on('new_chat', (data) => {
        let target = (data.id === socket.id) ? player : otherPlayers[data.id];
        if (target) showChatBubble(self, target, data.message);
    });
}

function addPlayerAvatar(scene, info, isLocal) {
    const avatar = scene.physics.add.sprite(info.x, info.y, 'dude');

    // ตรวจสอบสี ถ้าไม่มีให้ใช้สีขาว
    const colorHex = info.color ? info.color.replace('0x', '') : 'ffffff';
    avatar.setTint(parseInt(colorHex, 16));

    avatar.label = scene.add.text(info.x, info.y - 40, info.name, {
        fontSize: '14px', fill: '#ffffff', backgroundColor: '#000000aa'
    }).setOrigin(0.5);

    if (isLocal) {
        player = avatar;
        scene.cameras.main.startFollow(player, true, 0.1, 0.1);
    } else {
        otherPlayers[info.id] = avatar;
    }
}
function showChatBubble(scene, avatar, message) {
    if (avatar.chatText) avatar.chatText.destroy();
    avatar.chatText = scene.add.text(avatar.x, avatar.y - 70, message, {
        fontSize: '18px', fill: '#ffffff', backgroundColor: '#000000bb',
        padding: { x: 8, y: 4 }, align: 'center'
    }).setOrigin(0.5);

    scene.time.delayedCall(4000, () => {
        if (avatar.chatText) avatar.chatText.destroy();
    });
}
function update() {
    // ให้ Label และ Chat วิ่งตามตัวละครทุกเฟรม
    Object.values(otherPlayers).forEach(p => {
        if (p.label) p.label.setPosition(p.x, p.y - 40);
        if (p.chatText) p.chatText.setPosition(p.x, p.y - 70);
    });
    if (player) {
        if (player.label) player.label.setPosition(player.x, player.y - 40);
        if (player.chatText) player.chatText.setPosition(player.x, player.y - 70);
    }
}