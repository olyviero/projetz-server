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
    { id: 41, theme: 'Ville' },
    { id: 42, theme: 'Amour' },
    { id: 43, theme: 'Histoire' },
    { id: 44, theme: 'Science' },
    { id: 45, theme: 'Littérature' },
    { id: 46, theme: 'Voyage' },
    { id: 47, theme: 'Aventure' },
    { id: 48, theme: 'Horreur' },
    { id: 49, theme: 'Mystère' },
    { id: 50, theme: 'Philosophie' },
    { id: 51, theme: 'Rivière' },
    { id: 52, theme: 'Montre' },
    { id: 53, theme: 'Robot' },
    { id: 54, theme: 'Fête' },
    { id: 55, theme: 'Musique' },
    { id: 56, theme: 'Nature' },
    { id: 57, theme: 'Bonheur' },
    { id: 58, theme: 'Tristesse' },
    { id: 59, theme: 'Solitude' },
    { id: 60, theme: 'Amitié' },
    { id: 61, theme: 'Magie' },
    { id: 62, theme: 'Dragon' },
    { id: 63, theme: 'Insecte' },
    { id: 64, theme: 'Fleur' },
    { id: 65, theme: 'Arbre' },
    { id: 66, theme: 'Nuage' },
    { id: 67, theme: 'Ciel' },
    { id: 68, theme: 'Été' },
    { id: 69, theme: 'Printemps' },
    { id: 70, theme: 'Automne' },
    { id: 71, theme: 'Neige' },
    { id: 72, theme: 'Glace' },
    { id: 73, theme: 'Feu' },
    { id: 74, theme: 'Terre' },
    { id: 75, theme: 'Métal' },
    { id: 76, theme: 'Vent' },
    { id: 77, theme: 'Pluie' },
    { id: 78, theme: 'Tempête' },
    { id: 79, theme: 'Chocolat' },
    { id: 80, theme: 'Café' },
    { id: 81, theme: 'Thé' },
    { id: 82, theme: 'Pizza' },
    { id: 83, theme: 'Gâteau' },
    { id: 84, theme: 'Bonbon' },
    { id: 85, theme: 'Épice' },
    { id: 86, theme: 'Fruit' },
    { id: 87, theme: 'Légume' },
    { id: 88, theme: 'Fromage' },
    { id: 89, theme: 'Pain' },
    { id: 90, theme: 'Vin' },
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

const calculatePointsForAll = (players, updatePlayerPoints, broadcastResults) => {
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
            updatePlayerPoints(uid, pointsToAdd, players)
        })
    })

    playerResponses = {}
    broadcastResults(players, pointsPerAnswer)
}

const handleGameEnd = (players, updatePlayerPoints, broadcastResults) => {
    if (Object.keys(playerResponses).length === Object.keys(players).length) {
        calculatePointsForAll(players, updatePlayerPoints, broadcastResults)
    }
}

module.exports = { pickRandomTheme, addResponse, handleGameEnd }
