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

    socket.on("disconnect", () => {

        delete players[socket.id]

        io.emit("players", players)

    })

})

const PORT = process.env.PORT || 3000
server.listen(PORT)