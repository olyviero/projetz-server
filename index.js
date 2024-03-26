const express = require('express')
const cors = require('cors')
// const middleware = require('./middleware')

// const app = express()
const port = 8000

const http = require('http')
const { WebSocketServer } = require('ws')
const url = require('url')

// const server = http.createServer(app)
const server = http.createServer()
const wsServer = new WebSocketServer({ server, host: '0.0.0.0' })

const unanimoGame = require('./games/unanimo')

// app.use(cors())
// app.use(express.json())
// app.use(middleware.decodeToken)

const connections = {}
const players = {}

// ---------------------------------------------------------------------------------------
// Game Settings
// ---------------------------------------------------------------------------------------
let gamesSettings = {
    unanimo: {
        isActive: false,
        gameDurationMax: 3,
        nbInputFields: 5,
        theme: '',
    },
    enigma: {
        isActive: false,
        title: '',
        nbAttemps: 2,
    },
}

// ---------------------------------------------------------------------------------------
// Active Games
// ---------------------------------------------------------------------------------------
let activeGames = {
    unanimo: false,
    enigma: false,
}

let enigmaAnswers = {}

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
const initializeGame = async () => {
    gamesSettings.unanimo.theme = await unanimoGame.pickRandomTheme()
    broadcastSettings()
    startGameCountdown()
}

// ---------------------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------------------
let countdownTimer
let gameTimer

const startGameCountdown = () => {
    let countdown = 1
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
    clearInterval(gameTimer)

    changeGameState(GameState.GamePlaying)
    let gameDuration = gamesSettings.unanimo.gameDurationMax

    gameTimer = setInterval(() => {
        if (gameDuration > 0) {
            broadcast({ type: 'countdown', countdown: gameDuration })
            gameDuration -= 1
        } else {
            clearInterval(gameTimer)
            broadcast({ type: 'gameState', state: 'RoundOver' })
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
            broadcastUsers()
            break

        case 'restorePlayerPoints':
            players[uid].points = content.points
            broadcastUsers()
            break

        case 'resetScores':
            Object.keys(players).forEach((uid) => (players[uid].points = 0))
            broadcastUsers()
            broadcast({ type: 'resetScores' })
            break

        case 'togglePlayerReady':
            player.ready = !player.ready
            broadcastUsers()
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

        case 'updateSettings':
            gamesSettings = content.settings
            broadcastSettings()
            break

        case 'updateActiveGames':
            activeGames = content.activeGames
            broadcastActiveGames()
            break

        case 'newEnigmaAnswer':
            enigmaAnswers[uid] = content.answer
            broadcastToAdmin({ type: 'updateEnigmaAnswers', answers: enigmaAnswers })
            break

        case 'endEnigma':
            console.log('endEnigma')
            scoreUpdates = content.enigmaScores
            console.log(content.enigmaScores)
            Object.keys(scoreUpdates).forEach((uid) => {
                if (players[uid]) {
                    players[uid].points += scoreUpdates[uid]
                }
            })
            console.log({ players })
            broadcastUsers()
            broadcast({ type: 'endEnigma' })
            break

        default:
            console.log(`Unhandled message type: ${type}`)
    }
}

function handleClose(uid) {
    console.log(`Connection closed for UID: ${uid}`)
    delete players[uid]
    delete connections[uid]
    broadcastUsers()
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
const broadcastToAdmin = (data) => {
    const message = JSON.stringify(data)
    Object.entries(players).forEach(([uid, player]) => {
        if (player.role === 'gameMaster') {
            const playerAdmin = connections[uid]
            playerAdmin.send(message)
        }
    })
}

const broadcastUsers = () => {
    broadcast({
        type: 'updatePlayers',
        players: players,
    })
}
const broadcastSettings = () => {
    broadcast({
        type: 'updateGamesSettings',
        gamesSettings: gamesSettings,
    })
}
const broadcastActiveGames = () => {
    broadcast({
        type: 'updateActiveGames',
        activeGames: activeGames,
    })
}
// Broadcast Results
const broadcastResults = (players, pointsPerAnswer) => {
    broadcastUsers()
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
        console.dir(data, { depth: null })

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
                broadcastUsers()

                broadcastToOne(uid, { type: 'updateActiveGames', activeGames: activeGames })
                broadcastToOne(uid, { type: 'updateGamesSettings', gamesSettings: gamesSettings })

                if (players[uid].role === 'gameMaster') {
                    broadcastToOne(uid, { type: 'updateEnigmaAnswers', answers: enigmaAnswers })
                }
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
