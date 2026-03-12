// ค้นหาและลบส่วนนี้ในฟังก์ชัน create()
let otherPlayers = {}; // เก็บ Sprite ของผู้เล่นคนอื่น
let player;            // ตัวละครของเรา

function create() {
    socket = io();
    const self = this;

    // เมื่อเริ่มเกม: รับข้อมูลผู้เล่นทั้งหมด
    socket.on('current_players', (players) => {
        Object.keys(players).forEach((id) => {
            if (id === socket.id) {
                createAvatar(self, players[id], true);
            } else {
                createAvatar(self, players[id], false);
            }
        });
    });

    // เมื่อมีคนใหม่เข้ามาทีหลัง
    socket.on('new_player', (playerInfo) => {
        createAvatar(self, playerInfo, false);
    });

    // อัปเดตตำแหน่งทุกเครื่อง (รวมถึงตัวเราด้วย)
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

    socket.on('player_disconnected', (id) => {
        if (otherPlayers[id]) {
            if (otherPlayers[id].label) otherPlayers[id].label.destroy();
            otherPlayers[id].destroy();
            delete otherPlayers[id];
        }
    });
}

// ฟังก์ชันเดียวสำหรับสร้าง Avatar เพื่อลดความซ้ำซ้อน
function createAvatar(scene, info, isLocal) {
    const color = isLocal ? 0x00ff00 : 0xff0000;
    const avatar = scene.add.rectangle(info.x, info.y, 40, 40, color);

    // ใส่ชื่อบนหัว
    avatar.label = scene.add.text(info.x, info.y - 40, info.name, {
        fontSize: '16px',
        fill: '#ffffff'
    }).setOrigin(0.5);

    if (isLocal) {
        player = avatar;
        scene.cameras.main.startFollow(player);
    } else {
        otherPlayers[info.id] = avatar;
    }
}

// ปรับปรุงฟังก์ชัน update() เพื่อให้ตำแหน่งสมูทขึ้น
function update() {
    // อัปเดตตำแหน่งชื่อ/แชท ให้ติดกับตัวละคร
    if (player) {
        if (player.label) player.label.setPosition(player.x, player.y - 45);
        if (player.chat) player.chat.setPosition(player.x, player.y - 70);
    }

    Object.values(otherPlayers).forEach(p => {
        if (p.label) p.label.setPosition(p.x, p.y - 45);
        if (p.chat) p.chat.setPosition(p.x, p.y - 70);
    });
}

// ในฟังก์ชัน addPlayer และ addOtherPlayers ให้เพิ่ม Label ชื่อไว้บนหัว
function addPlayer(scene, info) {
    player = scene.add.rectangle(info.x, info.y, 40, 40, 0x00ff00);
    scene.physics.add.existing(player);
    player.label = scene.add.text(info.x, info.y - 45, info.name, { fontSize: '14px' }).setOrigin(0.5);
    scene.cameras.main.startFollow(player, true, 0.1, 0.1);
}

function addOtherPlayers(scene, info) {
    const otherPlayer = scene.add.rectangle(info.x, info.y, 40, 40, 0xff0000);
    otherPlayer.label = scene.add.text(info.x, info.y - 45, info.name, { fontSize: '14px' }).setOrigin(0.5);
    otherPlayers[info.id] = otherPlayer;
}