const express = require('express')
const cors = require('cors')
// const middleware = require('./middleware')

const app = express()
const port = 8000

const http = require('http')
const { WebSocketServer } = require('ws')
const url = require('url')

const server = http.createServer(app)
const wsServer = new WebSocketServer({ server, host: '0.0.0.0' })

const unanimoGame = require('./games/unanimo')

app.use(cors())
// app.use(express.json())
// app.use(middleware.decodeToken)

const connections = {}
const users = {}

// ---------------------------------------------------------------------------------------
// Game State
// ---------------------------------------------------------------------------------------
const GameState = {
    WaitingForPlayers: 'WaitingForPlayers',
    CountdownToStart: 'CountdownToStart',
    GamePlaying: 'GamePlaying',
    RoundOver: 'RoundOver',
    GameOver: 'GameOver',
    PartyOver: 'PartyOver',
}

let gameState = GameState.WaitingForPlayers

const changeGameState = (newState) => {
    console.log('New Game State:' + newState)
    gameState = newState
    broadcast({ type: 'gameState', state: gameState })
}

// ---------------------------------------------------------------------------------------
// Initialize Game
// ---------------------------------------------------------------------------------------
const initializeGame = () => {
    const theme = unanimoGame.pickRandomTheme()
    broadcast({ type: 'gameSettings', gameSettings: { theme: theme } })
    startGameCountdown()
}

// ---------------------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------------------
const countdownMax = 1
const gameDurationMax = 10

let countdownTimer

const startGameCountdown = () => {
    let countdown = countdownMax
    changeGameState(GameState.CountdownToStart)
    broadcast({ type: 'countdown', countdown: countdown })

    countdownTimer = setInterval(() => {
        countdown -= 1
        if (countdown > 0) {
            broadcast({ type: 'countdown', countdown: countdown })
        } else {
            clearInterval(countdownTimer)
            startGameTimer()
        }
    }, 1000)
}

const startGameTimer = () => {
    changeGameState(GameState.GamePlaying)
    let gameDuration = gameDurationMax

    const gameTimer = setInterval(() => {
        if (gameDuration > 0) {
            broadcast({ type: 'countdown', countdown: gameDuration })
            gameDuration -= 1
        } else {
            clearInterval(gameTimer)
            broadcast({ type: 'gameEnded' })
            changeGameState(GameState.GameOver)
        }
    }, 1000)
}

// ---------------------------------------------------------------------------------------
// Update Player Points
// ---------------------------------------------------------------------------------------
const updateUserPoints = (uid, pointsToAdd, users) => {
    if (users[uid]) {
        users[uid].points += pointsToAdd
    }
}

// ---------------------------------------------------------------------------------------
// WS Messages
// ---------------------------------------------------------------------------------------
function handleMessage(message) {
    const { type, uid, content } = message
    const user = users[message.uid]

    switch (type) {
        case 'updatePlayer':
            user.username = content.username
            user.photoURL = content.photoURL
            broadcast({ type: 'updateUsers', users: users })
            break

        case 'togglePlayerReady':
            user.ready = !user.ready
            broadcast({ type: 'updateUsers', users: users })
            break

        case 'startGame':
            initializeGame()
            break

        case 'submitAnswers':
            if (content.game === 'unanimo') {
                unanimoGame.addResponse(uid, content.answers)
                unanimoGame.handleGameEnd(users, updateUserPoints, broadcastResults)
            }
            break

        default:
            console.log(`Unhandled message type: ${type}`)
    }
}

function handleClose(uid) {
    console.log(`Connection closed for UID: ${uid}`)
    delete users[uid]
    delete connections[uid]
    broadcast({ type: 'updateUsers', users: users })
}

// ---------------------------------------------------------------------------------------
// Broadcast
// ---------------------------------------------------------------------------------------
const broadcast = (data) => {
    const message = JSON.stringify(data)
    Object.values(connections).forEach((connection) => {
        connection.send(message)
    })
}
const broadcastToOne = (uid, data) => {
    const message = JSON.stringify(data)
    const userConnection = connections[uid]
    if (userConnection) {
        userConnection.send(message)
    } else {
        console.log(`Connection for UID ${uid} not found or not open.`)
    }
}
// Fonction pour diffuser les résultats à tous les utilisateurs
const broadcastResults = (users) => {
    broadcast({ type: 'updateUsers', users: users })
    Object.entries(users).forEach(([uid, user]) => {
        broadcastToOne(uid, { type: 'updateUserPoints', points: user.points })
    })
}
// ---------------------------------------------------------------------------------------
// WS on connection
// ---------------------------------------------------------------------------------------
wsServer.on('connection', (ws, request) => {
    console.log('server: user connected')

    ws.on('message', (message) => {
        const data = JSON.parse(message)

        // New Player (special case since we create a new user[uid] in users{})
        if (data.type === 'newPlayer') {
            const uid = data.uid
            if (!connections[uid]) {
                connections[uid] = ws
                users[uid] = {
                    username: data.content.username,
                    ready: false,
                    points: 0,
                    photoURL: data.content.photoURL,
                    role: data.content.role,
                }
                broadcast({ type: 'updateUsers', users: users })
                broadcast({
                    type: 'gameTimersMax',
                    timersMax: { countdownMax: countdownMax, gameDurationMax: gameDurationMax },
                })
            }
        }
        // Any other message
        else {
            handleMessage(data)
        }
    })

    ws.on('close', () => {
        const uid = Object.keys(connections).find((key) => connections[key] === ws)
        if (uid) {
            handleClose(uid)
        }
    })
})

server.listen(port, () => {
    console.log(`WebSocket server is running on port ${port}`)
})
