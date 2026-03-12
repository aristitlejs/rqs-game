socket.on("players", (players) => {

    const scene = game.scene.scenes[0]

    for (let id in avatars) {

        if (!players[id]) {

            avatars[id].circle.destroy()
            avatars[id].text.destroy()

            delete avatars[id]

        }

    }

    for (let id in players) {

        if (!avatars[id]) {

            const p = players[id]

            let circle = scene.add.circle(p.x, p.y, 20, 0x00ff00)

            let text = scene.add.text(p.x - 20, p.y - 40, p.name)

            avatars[id] = { circle, text }

        }

        avatars[id].circle.x = players[id].x
        avatars[id].circle.y = players[id].y

        avatars[id].text.x = players[id].x - 20
        avatars[id].text.y = players[id].y - 40

    }

})