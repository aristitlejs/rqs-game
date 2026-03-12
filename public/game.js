const socket = io()

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,

    scene: {
        preload: preload,
        create: create
    }

}

let game = new Phaser.Game(config)

let avatars = {}

function preload() {

    this.load.image("grass", "https://labs.phaser.io/assets/tilemaps/tiles/grass.png")

}

function create() {

    const scene = this

    for (let x = 0; x < 800; x += 64) {

        for (let y = 0; y < 600; y += 64) {

            scene.add.image(x, y, "grass").setOrigin(0)

        }

    }

}