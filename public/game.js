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
    this.load.spritesheet('cats', 'assets/cat.png', {
        frameWidth: 32,
        frameHeight: 32
    });
}
function create() {
    socket = io();
    const self = this;

    // 1. สร้าง Animations
    // ทิศลง (แถวที่ 1: เฟรม 0, 1, 2)
    this.anims.create({
        key: 'walk-down',
        frames: this.anims.generateFrameNumbers('cats', { start: 0, end: 2 }),
        frameRate: 10, repeat: -1
    });

    // ทิศซ้าย (แถวที่ 2: เฟรม 12, 13, 14) *สมมติว่าภาพกว้าง 12 เฟรม
    this.anims.create({
        key: 'walk-left',
        frames: this.anims.generateFrameNumbers('cats', { start: 12, end: 14 }),
        frameRate: 10, repeat: -1
    });

    // ทิศขวา (แถวที่ 3: เฟรม 24, 25, 26)
    this.anims.create({
        key: 'walk-right',
        frames: this.anims.generateFrameNumbers('cats', { start: 24, end: 26 }),
        frameRate: 10, repeat: -1
    });

    // ทิศขึ้น (แถวที่ 4: เฟรม 36, 37, 38)
    this.anims.create({
        key: 'walk-up',
        frames: this.anims.generateFrameNumbers('cats', { start: 36, end: 38 }),
        frameRate: 10, repeat: -1
    });



    this.anims.create({ key: 'idle', frames: [{ key: 'cats', frame: 4 }], frameRate: 20 });

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

    //socket.on('player_updates', (players) => {
    //    Object.keys(players).forEach((id) => {
    //        let avatar = (id === socket.id) ? player : otherPlayers[id];
    //        if (avatar) {
    //            avatar.setPosition(players[id].x, players[id].y);

    //            // อัปเดต Animation ตามทิศทาง (vx, vy)
    //            if (players[id].vx > 0) avatar.play('walk-right', true);
    //            else if (players[id].vx < 0) avatar.play('walk-left', true);
    //            else if (players[id].vy > 0) avatar.play('walk-down', true);
    //            else if (players[id].vy < 0) avatar.play('walk-up', true);
    //            else avatar.stop();
    //        }
    //    });
    //});

    // ใน socket.on('player_updates')

    socket.on('player_updates', (players) => {
        Object.keys(players).forEach((id) => {
            let avatar = (id === socket.id) ? player : otherPlayers[id];
            if (avatar && avatar.animKeys) {
                avatar.setPosition(players[id].x, players[id].y);

                const vx = players[id].vx;
                const vy = players[id].vy;

                // ตรวจสอบทิศทางลำดับความสำคัญ (Priority)
                if (vx < 0) {
                    avatar.play('walk-left', true);
                } else if (vx > 0) {
                    avatar.play('walk-right', true);
                } else if (vy < 0) {
                    avatar.play('walk-up', true);
                } else if (vy > 0) {
                    avatar.play('walk-down', true);
                } else {
                    // ถ้าไม่ขยับ ให้หยุดที่เฟรมแรกของทิศนั้นๆ หรือหยุดเล่น Animation
                    avatar.anims.stop();
                }

                // อย่าลืมอัปเดตตำแหน่ง Label และ Chat
                if (avatar.label) avatar.label.setPosition(avatar.x, avatar.y - 40);
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
    const col = (info.catType % 4) * 3; // คอลัมน์เริ่ม (0, 3, 6, 9)
    const row = Math.floor(info.catType / 4) * 4; // แถวเริ่ม (0 หรือ 4)
    const baseFrame = (row * 12) + col;

    const avatar = scene.physics.add.sprite(info.x, info.y, 'cats', baseFrame);

    const id = info.id.replace(/[^a-zA-Z0-9]/g, ""); // ลบอักขระพิเศษออก

    const animKeys = {
        down: `walk-down-${id}`,
        left: `walk-left-${id}`,
        right: `walk-right-${id}`,
        up: `walk-up-${id}`
    };

    scene.anims.create({
        key: animKeys.down,
        frames: scene.anims.generateFrameNumbers('cats', {
            frames: [baseFrame, baseFrame + 1, baseFrame + 2]
        }),
        frameRate: 10, repeat: -1
    });

    scene.anims.create({
        key: animKeys.left,
        frames: scene.anims.generateFrameNumbers('cats', {
            frames: [baseFrame + 12, baseFrame + 13, baseFrame + 14]
        }),
        frameRate: 10, repeat: -1
    });

    scene.anims.create({
        key: animKeys.right,
        frames: scene.anims.generateFrameNumbers('cats', {
            frames: [baseFrame + 24, baseFrame + 25, baseFrame + 26]
        }),
        frameRate: 10, repeat: -1
    });

    scene.anims.create({
        key: animKeys.up,
        frames: scene.anims.generateFrameNumbers('cats', {
            frames: [baseFrame + 36, baseFrame + 37, baseFrame + 38]
        }),
        frameRate: 10, repeat: -1
    });

    avatar.animKeys = animKeys;

    // ชื่อ
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