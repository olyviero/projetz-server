// ---------------------------------------------------------------------------------------
// Game Data
// ---------------------------------------------------------------------------------------
const themes = [
    { id: 0, theme: 'Vacances' },
    { id: 1, theme: 'Nuit' },
    { id: 2, theme: 'École' },
    { id: 3, theme: 'Parents' },
    { id: 4, theme: 'Cinéma' },
    { id: 5, theme: 'Musique' },
    { id: 6, theme: 'Sucré' },
    { id: 7, theme: 'Magasin' },
    { id: 8, theme: 'Étoile' },
    { id: 9, theme: 'Bleu' },
    { id: 10, theme: 'Jaune' },
    { id: 11, theme: 'Voiture' },
    { id: 12, theme: 'Portable' },
    { id: 13, theme: 'Volcan' },
    { id: 14, theme: 'Coquin' },
    { id: 15, theme: 'Savane' },
    { id: 16, theme: 'Asie' },
    { id: 17, theme: 'Pingouin' },
    { id: 18, theme: 'Théâtre' },
    { id: 19, theme: 'Apéro' },
    { id: 20, theme: 'Montagne' },
    { id: 21, theme: 'Forêt' },
    { id: 22, theme: 'Océan' },
    { id: 23, theme: 'Désert' },
    { id: 24, theme: 'Futur' },
    { id: 25, theme: 'Technologie' },
    { id: 26, theme: 'Espace' },
    { id: 27, theme: 'Pirate' },
    { id: 28, theme: 'Fantôme' },
    { id: 29, theme: 'Sorcier' },
    { id: 30, theme: 'Jungle' },
    { id: 31, theme: 'Hiver' },
    { id: 32, theme: 'Plage' },
    { id: 33, theme: 'Galaxie' },
    { id: 34, theme: 'Animaux' },
    { id: 35, theme: 'Sport' },
    { id: 36, theme: 'Musée' },
    { id: 37, theme: 'Jardin' },
    { id: 38, theme: 'Cuisine' },
    { id: 39, theme: 'Mode' },
    { id: 40, theme: 'Art' },
]

let usedThemes = new Set()

// ---------------------------------------------------------------------------------------
// Game Initialize
// ---------------------------------------------------------------------------------------
const pickRandomTheme = () => {
    let availableThemes = themes.filter((theme) => !usedThemes.has(theme.id))
    if (availableThemes.length === 0) {
        return 'All themes have been used'
    }
    let randomIndex = Math.floor(Math.random() * availableThemes.length)
    let chosenTheme = availableThemes[randomIndex]
    usedThemes.add(chosenTheme.id)
    return chosenTheme.theme
}

// ---------------------------------------------------------------------------------------
// Game End
// ---------------------------------------------------------------------------------------
let playerResponses = {}

const addResponse = (uid, answers) => (playerResponses[uid] = { answers })

const calculatePointsForAll = (users, updateUserPoints, broadcastResults) => {
    const aggregatedResponses = Object.entries(playerResponses).reduce((acc, [uid, { answers }]) => {
        const uniqueAnswers = new Set(answers.filter((answer) => answer.trim() !== ''))
        uniqueAnswers.forEach((answer) => {
            if (!acc[answer]) {
                acc[answer] = new Set()
            }
            acc[answer].add(uid)
        })
        return acc
    }, {})

    let pointsPerAnswer = {}

    Object.entries(aggregatedResponses).forEach(([answer, uidsSet]) => {
        const uids = Array.from(uidsSet)
        const pointsToAdd = uids.length < 2 ? 0 : uids.length
        pointsPerAnswer[answer] = pointsToAdd

        uids.forEach((uid) => {
            updateUserPoints(uid, pointsToAdd, users)
        })
    })

    playerResponses = {}
    broadcastResults(users)
}

const handleGameEnd = (users, updateUserPoints, broadcastResults) => {
    if (Object.keys(playerResponses).length === Object.keys(users).length) {
        calculatePointsForAll(users, updateUserPoints, broadcastResults)
    }
}

module.exports = { pickRandomTheme, addResponse, handleGameEnd }
