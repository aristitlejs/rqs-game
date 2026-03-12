const socket = io()

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        create: create,
        update: update
    }
}

let game = new Phaser.Game(config)

let avatars = {}

function create() { }

function update() { }

socket.on("players", (players) => {

    for (let id in players) {

        if (!avatars[id]) {

            let p = players[id]

            let circle = game.scene.scenes[0].add.circle(p.x, p.y, 20, 0x00ff00)

            let text = game.scene.scenes[0].add.text(p.x - 20, p.y - 40, p.name)

            avatars[id] = { circle, text }
        }

        avatars[id].circle.x = players[id].x
        avatars[id].circle.y = players[id].y

        avatars[id].text.x = players[id].x - 20
        avatars[id].text.y = players[id].y - 40
    }

})