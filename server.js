const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

let players = {}
let choices = {}

io.on("connection", (socket) => {

    if (Object.keys(players).length >= 2) {
        socket.emit("full")
        return
    }

    players[socket.id] = true
    socket.emit("player", Object.keys(players).length)

    socket.on("choice", (choice) => {
        choices[socket.id] = choice

        if (Object.keys(choices).length === 2) {
            const ids = Object.keys(choices)

            const p1 = choices[ids[0]]
            const p2 = choices[ids[1]]

            let result = ""

            if (p1 === p2) result = "draw"
            else if (
                (p1 === "rock" && p2 === "scissors") ||
                (p1 === "paper" && p2 === "rock") ||
                (p1 === "scissors" && p2 === "paper")
            ) result = "p1"
            else result = "p2"

            io.emit("result", { p1, p2, result })
            choices = {}
        }
    })

    socket.on("disconnect", () => {
        delete players[socket.id]
        choices = {}
    })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log("Server running"))