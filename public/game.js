const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    physics: { default: 'arcade' },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);
let socket;
let otherPlayers = {};
let player;
let cursors;

function preload() {
    // โหลด Assets (ถ้ามี Sprite animation ให้โหลดที่นี่)
    this.load.image('tiles', 'https://labs.phaser.io/assets/tilemaps/tiles/tmw_desert_spacing.png');
}

function create() {
    socket = io();
    const self = this;

    // 1. ตั้งค่า World และ Camera
    const worldSize = 3000;
    this.cameras.main.setBounds(0, 0, worldSize, worldSize);
    this.physics.world.setBounds(0, 0, worldSize, worldSize);

    // วาด Grid พื้นหลังแทน Map จริงเพื่อให้เห็นการเคลื่อนที่
    let graphics = this.add.graphics();
    graphics.lineStyle(2, 0x444444, 1);
    for (let i = 0; i < worldSize; i += 100) {
        graphics.moveTo(i, 0); graphics.lineTo(i, worldSize);
        graphics.moveTo(0, i); graphics.lineTo(worldSize, i);
    }
    graphics.strokePath();

    // 2. รับข้อมูลผู้เล่น
    socket.on('current_players', (players) => {
        Object.keys(players).forEach((id) => {
            if (id === socket.id) {
                addPlayer(self, players[id]);
            } else {
                addOtherPlayers(self, players[id]);
            }
        });
    });

    socket.on('new_player', (playerInfo) => {
        addOtherPlayers(self, playerInfo);
    });

    socket.on('player_updates', (players) => {
        Object.keys(players).forEach((id) => {
            if (id === socket.id) {
                if (player) {
                    player.setPosition(players[id].x, players[id].y);
                }
            } else if (otherPlayers[id]) {
                otherPlayers[id].setPosition(players[id].x, players[id].y);
            }
        });
    });

    // 3. ระบบ Chat Bubble
    socket.on('new_chat', (data) => {
        const target = (data.id === socket.id) ? player : otherPlayers[data.id];
        if (target) showChat(self, target, data.message);
    });

    // 4. Minimap
    const minimap = this.cameras.add(20, 20, 200, 200).setZoom(0.1).setName('mini');
    minimap.setBackgroundColor(0x000000);
    minimap.scrollX = worldSize / 2;
    minimap.scrollY = worldSize / 2;

    socket.on('player_disconnected', (id) => {
        if (otherPlayers[id]) {
            otherPlayers[id].destroy();
            delete otherPlayers[id];
        }
    });
}

function addPlayer(scene, info) {
    player = scene.add.rectangle(info.x, info.y, 50, 50, 0x00ff00);
    scene.physics.add.existing(player);
    scene.cameras.main.startFollow(player, true, 0.1, 0.1);
}

function addOtherPlayers(scene, info) {
    const otherPlayer = scene.add.rectangle(info.x, info.y, 50, 50, 0xff0000);
    otherPlayer.id = info.id;
    otherPlayers[info.id] = otherPlayer;
}

function showChat(scene, target, message) {
    if (target.chat) target.chat.destroy();

    target.chat = scene.add.text(target.x, target.y - 60, message, {
        fontSize: '18px', fill: '#ffffff', backgroundColor: '#000000bb', padding: 5
    }).setOrigin(0.5);

    scene.time.delayedCall(3000, () => { if (target.chat) target.chat.destroy(); });
}

function update() {
    // อัปเดตตำแหน่ง Chat ให้ตามตัวละคร
    if (player && player.chat) player.chat.setPosition(player.x, player.y - 60);
    Object.values(otherPlayers).forEach(p => {
        if (p.chat) p.chat.setPosition(p.x, p.y - 60);
    });
}