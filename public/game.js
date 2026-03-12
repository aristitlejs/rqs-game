// ค้นหาและลบส่วนนี้ในฟังก์ชัน create()
// const minimap = this.cameras.add(20, 20, 200, 200)... (ลบทิ้งทั้งหมด)

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