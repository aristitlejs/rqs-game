const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/screen.html")
})

let players = {}

io.on("connection", (socket) => {

    socket.on("join", (data) => {

        players[socket.id] = {
            id: socket.id,
            name: data.name,
            x: Math.random() * 700,
            y: Math.random() * 500
        }

        io.emit("players", players)
    })

    socket.on("move", (data) => {

        const p = players[socket.id]

        if (!p) return

        p.x += data.dx
        p.y += data.dy

        // จำกัดขอบ map
        p.x = Math.max(0, Math.min(800, p.x))
        p.y = Math.max(0, Math.min(600, p.y))

        io.emit("players", players)
    })

    socket.on("players", (players) => {

        const scene = game.scene.scenes[0]

        for (let id in players) {

            if (!avatars[id]) {

                const p = players[id]

                let avatar = scene.add.rectangle(p.x, p.y, 40, 50, 0x4CAF50)

                let name = scene.add.text(
                    p.x,
                    p.y - 40,
                    p.name,
                    { font: "14px Arial", color: "#ffffff" }
                ).setOrigin(0.5)

                avatars[id] = { avatar, name }

            }

            avatars[id].avatar.x = players[id].x
            avatars[id].avatar.y = players[id].y

            avatars[id].name.x = players[id].x
            avatars[id].name.y = players[id].y - 40

        }

    })

    socket.on("disconnect", () => {

        delete players[socket.id]

        io.emit("players", players)

    })

})

const PORT = process.env.PORT || 3000
server.listen(PORT)