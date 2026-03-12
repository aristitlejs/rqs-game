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
            x: Math.random() * 600,
            y: Math.random() * 400
        }

        io.emit("players", players)
    })

    socket.on("move", (data) => {
        if (players[socket.id]) {

            players[socket.id].x += data.dx
            players[socket.id].y += data.dy

            io.emit("players", players)
        }
    })

    socket.on("disconnect", () => {
        delete players[socket.id]
        io.emit("players", players)
    })

})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log("server running"))