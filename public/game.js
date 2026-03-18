// 1. ตั้งค่าพื้นฐาน Phaser Engine
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth, // เต็มหน้าจอ
    height: window.innerHeight, // เต็มหน้าจอ
    render: { pixelArt: true },
    physics: {
        default: 'arcade', // ใช้ physics แบบง่าย
        arcade: { gravity: { y: 0 } }
    },
    fps: {
        target: 60,
        forceSetTimeOut: true // ช่วยให้ FPS นิ่งขึ้นในบาง Browser
    },
    render: {
        pixelArt: true,
        antialias: false
    },
    scene: { preload: preload, create: create, update: update }
};
const game = new Phaser.Game(config);
let socket;
let player;
let otherPlayers = {};


function preload() {
    // โหลด sprite sheet
    this.load.spritesheet('cats', 'assets/cat.png', {
        frameWidth: 31.5,
        frameHeight: 32
    });
}

function create() {

    // เชื่อม server
    socket = io();
    const self = this;

    // สร้าง Animations 4 ทิศ
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

    // idle
    this.anims.create({ key: 'idle', frames: [{ key: 'cats', frame: 4 }], frameRate: 20 });

    // 2. สร้างฉาก
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

    otherPlayers = {};

    // Socket Events multiplayer
    socket.on('current_players', (players) => {
        Object.keys(players).forEach((id) => {
            if (id !== socket.id && players[id].name !== 'Center') {
                addPlayerAvatar(self, players[id], false);
            }
        });
    });

    // มีคนเข้าใหม่ → เพิ่ม sprite
    socket.on('new_player', (playerInfo) => {
        if (playerInfo.id !== socket.id && playerInfo.name !== 'Center') {
            addPlayerAvatar(self, playerInfo, false);
        }
    });

    // อัปเดตตำแหน่งทุก frame (60 FPS)
    socket.on('player_updates', (players) => {
        Object.keys(players).forEach((id) => {
            let avatar = (id === socket.id) ? player : otherPlayers[id];
            if (avatar) {
                // แทนที่จะ setPosition ทันที ให้เก็บเป้าหมายไว้
                avatar.targetX = players[id].x;
                avatar.targetY = players[id].y;

                // อัปเดตความเร็วเพื่อใช้เลือก Animation
                avatar.vx = players[id].vx;
                avatar.vy = players[id].vy;
            }
        });
    });



    socket.on('player_disconnected', (id) => {
        if (otherPlayers[id]) {
            // ลบทั้งชื่อ และข้อความ Chat ด้วย (ถ้ามี)
            if (otherPlayers[id].label) otherPlayers[id].label.destroy();
            if (otherPlayers[id].chatText) otherPlayers[id].chatText.destroy();

            otherPlayers[id].destroy(); // ลบตัวละคร
            delete otherPlayers[id];    // ลบ ID ออกจากรายการ
            console.log(`Removed player: ${id}`);
        }
    });

    // แสดง chat bubble
    socket.on('new_chat', (data) => {
        let target = (data.id === socket.id) ? player : otherPlayers[data.id];
        if (target) showChatBubble(self, target, data.message);
    });
}

// ฟังก์ชัน สร้างตัวละคร
function addPlayerAvatar(scene, info, isLocal) {
    if (info.name === 'Center' || otherPlayers[info.id]) return;


    // เลือก avatar จาก sprite sheet
    const catType = (info.catType !== undefined) ? info.catType : 0;
    const catColumnIndex = catType % 4; // จะได้ 0, 1, 2, 3
    const catRowSet = Math.floor(catType / 4); // จะได้ 0 (แถวบน) หรือ 1 (แถวล่าง)

    const colOffset = catColumnIndex * 3; // คอลัมน์เริ่มต้น (0, 3, 6, 9)
    const rowOffset = catRowSet * 4;      // แถวเริ่มต้น (0 หรือ 4)

    // สูตรคำนวณ Base Frame: (แถว * ความกว้างภาพ 12 เฟรม) + คอลัมน์
    const baseFrame = (rowOffset * 12) + colOffset;

    console.log(`Player ${info.name} joined as Cat #${catType} at Frame ${baseFrame}`);

    // สร้าง sprite
    const avatar = scene.physics.add.sprite(info.x, info.y, 'cats', baseFrame);

    avatar.setScale(3);

    // สร้าง Key ที่ไม่ซ้ำกันสำหรับผู้เล่นคนนี้ (เช่น walk-down-socketID)
    const safeId = info.id.replace(/[^a-zA-Z0-9]/g, "");

    avatar.animKeys = {
        down: `dn-${safeId}`,
        left: `lt-${safeId}`,
        right: `rt-${safeId}`,
        up: `up-${safeId}`
    };

    const createAnim = (key, frames) => {
        if (!scene.anims.exists(key)) {
            scene.anims.create({
                key: key,
                frames: scene.anims.generateFrameNumbers('cats', { frames: frames }),
                frameRate: 10, repeat: -1
            });
        }
    };

    // สร้าง animation ของแต่ละ player
    // อ้างอิงจากลำดับแถวในไฟล์: ลง(แถว0), ซ้าย(แถว1), ขวา(แถว2), ขึ้น(แถว3)
    createAnim(avatar.animKeys.down, [baseFrame, baseFrame + 1, baseFrame + 2]);      // แถวที่ 1 ของแมวตัวนั้น
    createAnim(avatar.animKeys.left, [baseFrame + 12, baseFrame + 13, baseFrame + 14]);     // แถวที่ 2
    createAnim(avatar.animKeys.right, [baseFrame + 24, baseFrame + 25, baseFrame + 26]);     // แถวที่ 3
    createAnim(avatar.animKeys.up, [baseFrame + 36, baseFrame + 37, baseFrame + 38]);     // แถวที่ 4

    // label ชื่อ
    avatar.label = scene.add.text(info.x, info.y - 40, info.name).setOrigin(0.5);

    if (isLocal) { player = avatar; }
    else { otherPlayers[info.id] = avatar; }
}

// Chat Bubble
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

// update ทุก frame
function update() {
    const lerpFactor = 0.15; // ค่าความนุ่มนวล (0.1 - 0.2 กำลังดี)

    Object.values(otherPlayers).forEach(avatar => {
        if (avatar.targetX !== undefined) {
            // ค่อยๆ ขยับตัวละครไปยังตำแหน่งเป้าหมาย
            avatar.x = Phaser.Math.Linear(avatar.x, avatar.targetX, lerpFactor);
            avatar.y = Phaser.Math.Linear(avatar.y, avatar.targetY, lerpFactor);

            // ให้ชื่อและแชทวิ่งตาม
            avatar.label.setPosition(avatar.x, avatar.y - 60);
            if (avatar.chatText) avatar.chatText.setPosition(avatar.x, avatar.y - 90);

            // จัดการ Animation ตามความเร็วที่ได้รับมา
            updateAvatarAnimation(avatar);
        }
    });
}