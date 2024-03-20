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
const players = {}

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
const gameDurationMax = 5

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
            broadcast({ type: 'endRound' })
            changeGameState(GameState.RoundOver)
        }
    }, 1000)
}

// ---------------------------------------------------------------------------------------
// Update Player Points
// ---------------------------------------------------------------------------------------
const updatePlayerPoints = (uid, pointsToAdd, players) => {
    if (players[uid]) {
        players[uid].points += pointsToAdd
    }
}

// ---------------------------------------------------------------------------------------
// WS Messages
// ---------------------------------------------------------------------------------------
function handleMessage(message) {
    const { type, uid, content } = message
    const player = players[message.uid]

    switch (type) {
        case 'updatePlayer':
            player.username = content.username
            player.photoURL = content.photoURL
            broadcast({ type: 'updatePlayers', players: players })
            break

        case 'togglePlayerReady':
            player.ready = !player.ready
            broadcast({ type: 'updatePlayers', players: players })
            break

        case 'startGame':
            initializeGame()
            break

        case 'submitAnswers':
            if (content.game === 'unanimo') {
                unanimoGame.addResponse(uid, content.answers)
                unanimoGame.handleGameEnd(players, updatePlayerPoints, broadcastResults)
            }
            break

        default:
            console.log(`Unhandled message type: ${type}`)
    }
}

function handleClose(uid) {
    console.log(`Connection closed for UID: ${uid}`)
    delete players[uid]
    delete connections[uid]
    broadcast({ type: 'updatePlayers', players: players })
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
    const playerConnection = connections[uid]
    if (playerConnection) {
        playerConnection.send(message)
    } else {
        console.log(`Connection for UID ${uid} not found or not open.`)
    }
}
// Fonction pour diffuser les résultats à tous les utilisateurs
const broadcastResults = (players, pointsPerAnswer) => {
    console.log({ pointsPerAnswer })
    broadcast({ type: 'updatePlayers', players: players })
    broadcast({ type: 'unanimoPointsPerAnswers', pointsPerAnswer: pointsPerAnswer })
    Object.entries(players).forEach(([uid, player]) => {
        broadcastToOne(uid, { type: 'updatePlayerPoints', points: player.points })
    })
}
// ---------------------------------------------------------------------------------------
// WS on connection
// ---------------------------------------------------------------------------------------
wsServer.on('connection', (ws, request) => {
    console.log('server: player connected')

    ws.on('message', (message) => {
        const data = JSON.parse(message)

        // New Player (special case since we create a new player[uid] in players{})
        if (data.type === 'newPlayer') {
            const uid = data.uid
            if (!connections[uid]) {
                connections[uid] = ws
                players[uid] = {
                    username: data.content.username,
                    ready: false,
                    points: 0,
                    photoURL: data.content.photoURL,
                    role: data.content.role,
                }
                broadcast({ type: 'updatePlayers', players: players })
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
