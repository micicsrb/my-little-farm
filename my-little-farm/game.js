// Game constants
const NUM_POTS = 9
const SEASON_START = 1
const SEASON_END = 180
const DAYS_PER_SECOND = 1 // One in-game day per real-time second
const THROTTLE_INTERVAL = 1500 // Throttle interval in milliseconds (500ms = twice per second)
const PLANT_TYPES = {
    CUCUMBER: {
        waterNeed: 0.072,
        foodNeed: 0.024,
        growthRate: 0.05,
        yieldWeight: 0.3,
        icon: "🥒",
        stages: ["🌱", "🌿", "🥒"],
        growthTime: 25,
        maxWater: 7,
        maxFood: 2
    }, TOMATO: {
        waterNeed: 0.06,
        foodNeed: 0.032,
        growthRate: 0.04,
        yieldWeight: 0.2,
        icon: "🍅",
        stages: ["🌱", "🌿", "🍅"],
        growthTime: 30,
        maxWater: 5,
        maxFood: 3
    }, PEPPER: {
        waterNeed: 0.048,
        foodNeed: 0.04,
        growthRate: 0.03,
        yieldWeight: 0.1,
        icon: "🌶️",
        stages: ["🌱", "🌿", "🌶️"],
        growthTime: 35,
        maxWater: 4,
        maxFood: 4
    }, PUMPKIN: {
        waterNeed: 0.066,
        foodNeed: 0.036,
        growthRate: 0.025,
        yieldWeight: 2,
        icon: "🎃",
        stages: ["🌱", "🌿", "🎃"],
        growthTime: 40,
        maxWater: 5,
        maxFood: 5
    }
}
const WEATHER_EVENTS = [{name: "Sunny", icon: "☀️", effect: {water: -0.05, food: 0.02}}, {
    name: "Rainy", icon: "🌧️", effect: {water: 0.05, food: -0.02}
}, {name: "Windy", icon: "💨", effect: {water: -0.03, food: -0.03}}]
const MONTHS = ["April", "May", "June", "July", "August", "September"]

// Initialize game state with previousState for each pot
let gameState = {
    score: 0,
    day: SEASON_START,
    pots: Array(NUM_POTS).fill(null).map(() => ({
        plant: null, soil: 0, water: 0, food: 0, previousState: {}
    })),
    selectedTool: null,
    selectedSeed: null,
    currentWeather: WEATHER_EVENTS[0],
    weatherDuration: 0,
    paused: true,
    lastUpdate: 0
}

// DOM Elements
const potElements = Array.from(document.querySelectorAll(".pot"))
const toolElements = Array.from(document.querySelectorAll(".tool"))
const seedElements = Array.from(document.querySelectorAll(".seed"))
const scoreElement = document.getElementById("score")
const timeElement = document.getElementById("time")
const weatherElement = document.getElementById("weather")
const instructionsModal = document.getElementById("instructions-modal")
const closeInstructionsButton = document.getElementById("close-instructions-modal")
const showInstructionsButton = document.getElementById("show-tutorial")
const restartButton = document.getElementById("restart")
const pauseButton = document.getElementById("pause")
const endGameModal = document.getElementById("end-game-modal")
const finalScoreElement = document.getElementById("final-score")
const harvestToolElement = document.getElementById("harvest")
const closeEndGameButton = document.getElementById("close-end-game-modal")
const clickSound = document.getElementById("click-sound")
const plantSound = document.getElementById("plant-sound")
const harvestSound = document.getElementById("harvest-sound")
const waterSound = document.getElementById("water-sound")
const deadSound = document.getElementById("dead-sound")
const ripeSound = document.getElementById("ripe-sound")
const foodSound = document.getElementById("food-sound")
const background1Music = document.getElementById("background1-music")
const background2Music = document.getElementById("background2-music")
const background3Music = document.getElementById("background3-music")

// Event Listeners
toolElements.forEach(tool => tool.addEventListener("click", () => {
    selectTool(tool.id)
    playSound(clickSound)
}))
seedElements.forEach(seed => seed.addEventListener("click", () => {
    selectSeed(seed.id)
    playSound(clickSound)
}))
potElements.forEach((pot, index) => pot.addEventListener("click", () => {
    interactWithPot(index)
}))
closeInstructionsButton.addEventListener("click", () => {
    instructionsModal.style.display = "none"
    playSound(clickSound)
})
showInstructionsButton.addEventListener("click", () => {
    instructionsModal.style.display = "flex"
    gameState.paused = true
    pauseButton.innerHTML = "<i class=\"fas fa-play\"></i>"
    playSound(clickSound)
})
harvestToolElement.addEventListener("click", () => {
    selectTool("harvest")
    playSound(clickSound)
})
closeEndGameButton.addEventListener("click", () => {
    endGameModal.style.display = "none"
    playSound(clickSound)
})
restartButton.addEventListener("click", () => {
    startGame()
    playSound(clickSound)
})
pauseButton.addEventListener("click", () => {
    togglePause()
    playSound(clickSound)
})

// Play sound function
function playSound(sound) {
    sound.currentTime = 0 // Rewind to the start
    sound.play()
}

// Play background music
function playBackgroundMusic() {
    const backgroundMusicOptions = [background1Music, background2Music, background3Music]

    // Stop all background music
    backgroundMusicOptions.forEach(music => {
        music.pause()
        music.currentTime = 0
    })

    const selectedMusic = backgroundMusicOptions[Math.floor(Math.random() * backgroundMusicOptions.length)]
    selectedMusic.volume = selectedMusic.id === "background2-music" ? 0.3 : 0.5 // Set volume to a comfortable level
    selectedMusic.play()
}

// Tool and Seed Selection
function selectTool(toolId) {
    gameState.selectedTool = toolId
    gameState.selectedSeed = null
    updateUISelection()
}

function selectSeed(seedId) {
    gameState.selectedSeed = seedId.toUpperCase()
    gameState.selectedTool = null
    updateUISelection()
}

function updateUISelection() {
    toolElements.forEach(tool => tool.classList.toggle("selected", tool.id === gameState.selectedTool))
    seedElements.forEach(seed => seed.classList.toggle("selected", seed.id.toUpperCase() === gameState.selectedSeed))
}

// Pot Interaction
function interactWithPot(potIndex) {
    if (gameState.paused) return

    const pot = gameState.pots[potIndex]
    const actions = {
        shovel: () => {
            if (pot.plant === null || pot.plant.growth >= 1 || pot.plant.dead) {
                pot.soil = 1
                pot.plant = null
                pot.water = 0
                pot.food = 0
                updatePotVisual(potIndex)
                playSound(plantSound)
            }
        }, wateringcan: () => {
            if (pot.plant && !pot.plant.dead) {
                pot.water = Math.min(pot.water + 0.5, 1)
                updatePotVisual(potIndex)
                playSound(waterSound)
            }
        }, plantfood: () => {
            if (pot.plant && !pot.plant.dead) {
                pot.food = Math.min(pot.food + 0.5, 1)
                updatePotVisual(potIndex)
                playSound(foodSound)
            }
        }, seed: () => {
            if (gameState.selectedSeed && pot.soil === 1 && !pot.plant) {
                pot.plant = {type: gameState.selectedSeed, growth: 0, dead: false}
                pot.water = 0.5
                pot.food = 0.5
                updatePotVisual(potIndex)
                playSound(plantSound)
            }
        }, harvest: () => {
            if (pot.plant && pot.plant.growth >= 1 && !pot.plant.dead) {
                gameState.score += PLANT_TYPES[pot.plant.type].yieldWeight
                pot.plant = null
                pot.soil = 0
                updatePotVisual(potIndex)
                playSound(harvestSound)
            }
        }
    }

    if (gameState.selectedTool) {
        actions[gameState.selectedTool]?.()
    } else if (gameState.selectedSeed) {
        actions.seed()
    }
}

// Update Visuals
function updatePotVisual(potIndex) {
    const pot = gameState.pots[potIndex]
    const potElement = potElements[potIndex]

    // Check if the current state is different from the previous state
    const currentState = JSON.stringify({
        plant: pot.plant, soil: pot.soil, water: pot.water, food: pot.food
    })

    if (currentState === pot.previousState) {
        return // No changes, so do not update visuals
    }

    // Update the previous state
    pot.previousState = currentState

    // Clear the pot element
    potElement.innerHTML = ""

    if (pot.plant) {
        const plantType = PLANT_TYPES[pot.plant.type]
        const growthStage = Math.min(Math.floor(pot.plant.growth * 3), 2)
        const plantIcon = pot.plant.dead ? "💀" : plantType.stages[growthStage]

        const plantIconWrapper = document.createElement("div")
        plantIconWrapper.className = "plant-icon-wrapper"

        const plantIconElement = document.createElement("span")
        plantIconElement.className = "emoji plant-icon"
        plantIconElement.textContent = plantIcon

        // Check if the current icon is different from the new icon
        const currentIconElement = potElement.querySelector(".plant-icon")
        if (!currentIconElement || currentIconElement.textContent !== plantIcon) {
            // Add pulse effect if plant is ready for harvest
            if (pot.plant.growth >= 1 && !pot.plant.dead) {
                plantIconWrapper.classList.add("pulse")
                playSound(ripeSound)
            }

            plantIconWrapper.appendChild(plantIconElement)
            potElement.appendChild(plantIconWrapper)
        }

        // Only add resource container if the plant is not ready for harvest
        if (pot.plant.growth < 1 && !pot.plant.dead) {
            const resourceContainer = document.createElement("div")
            resourceContainer.className = "resource-container"
            potElement.appendChild(resourceContainer)

            const waterLevel = document.createElement("div")
            waterLevel.className = "level-indicator water-level"
            waterLevel.innerHTML = getResourceEmoji(pot.water, plantType.maxWater, "💧")
            resourceContainer.appendChild(waterLevel)

            const foodLevel = document.createElement("div")
            foodLevel.className = "level-indicator food-level"
            foodLevel.innerHTML = getResourceEmoji(pot.food, plantType.maxFood, "🍃")
            resourceContainer.appendChild(foodLevel)
        }
    } else if (pot.soil) {
        potElement.innerHTML = "<span class=\"emoji\">🕳</span>"
    }
}

function getResourceEmoji(level, max, emoji) {
    const fullResources = Math.ceil(level * max)
    return emoji.repeat(fullResources)
}

// Weather System
function updateWeather(deltaTime) {
    gameState.weatherDuration -= deltaTime
    if (gameState.weatherDuration <= 0) {
        gameState.currentWeather = WEATHER_EVENTS[Math.floor(Math.random() * WEATHER_EVENTS.length)]
        gameState.weatherDuration = Math.random() * 20000 + 10000 // 10-30 seconds
        weatherElement.textContent = `${gameState.currentWeather.name} ${gameState.currentWeather.icon}`
    }
}

// Main game loop
let lastTimestamp = 0
let lastUpdateTimestamp = 0

function gameLoop(timestamp) {
    if (gameState.paused) {
        requestAnimationFrame(gameLoop)
        return
    }

    const deltaTime = timestamp - lastTimestamp
    lastTimestamp = timestamp

    updatePlants(deltaTime)
    updateWeather(deltaTime)
    updateDay(deltaTime)
    updateUI()

    // Throttle pot visual updates
    if (timestamp - lastUpdateTimestamp >= THROTTLE_INTERVAL) {
        gameState.pots.forEach((_, index) => updatePotVisual(index))
        lastUpdateTimestamp = timestamp
    }

    if (gameState.day <= SEASON_END) {
        requestAnimationFrame(gameLoop)
    } else {
        endGame()
    }
}

function updatePlants(deltaTime) {
    const secondsPassed = deltaTime / 1000
    gameState.pots.forEach((pot) => {
        if (pot.plant && !pot.plant.dead) {
            const plantType = PLANT_TYPES[pot.plant.type]

            // Skip resource depletion and death check if the plant is ready for harvest
            if (pot.plant.growth >= 1) {
                return
            }

            // Apply weather effects and decrease resources
            pot.water = Math.max(0, Math.min(1, pot.water + gameState.currentWeather.effect.water * secondsPassed - plantType.waterNeed * secondsPassed))
            pot.food = Math.max(0, Math.min(1, pot.food + gameState.currentWeather.effect.food * secondsPassed - plantType.foodNeed * secondsPassed))

            // Check if plant is alive and growing
            if (pot.water > 0 && pot.food > 0) {
                pot.plant.growth += plantType.growthRate * secondsPassed
            } else {
                pot.plant.dead = true
                playSound(deadSound)
                updatePotVisual(gameState.pots.indexOf(pot))
            }
        }
    })
}

function updateDay(deltaTime) {
    gameState.day += (deltaTime / 1000) * DAYS_PER_SECOND
}

function updateUI() {
    scoreElement.textContent = gameState.score.toFixed(2)
    const {month, day} = getDate(gameState.day)
    timeElement.textContent = `${month} ${day}`
    timeElement.classList.toggle("season-ending", month === "September")
}

function getDate(day) {
    const monthIndex = Math.floor((day - 1) / 30)
    const dayOfMonth = Math.floor(day - monthIndex * 30)
    return {month: MONTHS[monthIndex], day: dayOfMonth}
}

function endGame() {
    gameState.paused = true
    finalScoreElement.textContent = gameState.score.toFixed(2)
    endGameModal.style.display = "flex"
}

// Start the game
function startGame() {
    // Clear existing clouds
    document.querySelectorAll(".cloud").forEach(cloud => cloud.remove())

    gameState = {
        score: 0,
        day: SEASON_START,
        pots: Array(NUM_POTS).fill(null).map(() => ({plant: null, soil: 0, water: 0, food: 0})),
        selectedTool: null,
        selectedSeed: null,
        currentWeather: WEATHER_EVENTS[0],
        weatherDuration: 0,
        paused: true,
        lastUpdate: 0
    }

    potElements.forEach((_, index) => updatePotVisual(index))
    updateUI()
    updateUISelection()
    endGameModal.style.display = "none"
    restartButton.disabled = false
    pauseButton.disabled = false
    pauseButton.innerHTML = "<i class=\"fas fa-play\"></i>"

    addClouds()
    instructionsModal.style.display = "flex"

    closeInstructionsButton.onclick = function () {
        instructionsModal.style.display = "none"
        if (gameState.paused) startCountdown()
    }
}

// Pause functionality
function togglePause() {
    gameState.paused = !gameState.paused
    pauseButton.innerHTML = gameState.paused ? "<i class=\"fas fa-play\"></i>" : "<i class=\"fas fa-pause\"></i>"
    if (!gameState.paused) {
        lastTimestamp = performance.now()
        requestAnimationFrame(gameLoop)
    }
}

// Add cute clouds
function addClouds() {
    const gameContainer = document.getElementById("game-container")
    for (let i = 0; i < 6; i++) {
        const cloud = document.createElement("div")
        cloud.className = "cloud"
        cloud.textContent = "☁️"
        cloud.style.left = `${Math.random() * 100}%`
        cloud.style.top = `${Math.random() * 30}%`
        cloud.style.fontSize = `${Math.random() * 80 + 30}px`
        gameContainer.appendChild(cloud)
    }
}

// Countdown function
function startCountdown() {
    const countdownOverlay = document.createElement("div")
    countdownOverlay.id = "countdown-overlay"
    countdownOverlay.classList.add("fade-in")
    document.body.appendChild(countdownOverlay)

    const countdownElement = document.createElement("div")
    countdownElement.id = "countdown"
    countdownOverlay.appendChild(countdownElement)

    let count = 3
    const countdownInterval = setInterval(() => {
        if (count > 0) {
            countdownElement.textContent = count.toString()
            count--
        } else if (count === 0) {
            playBackgroundMusic()
            countdownElement.textContent = "GROW!"
            count--
        } else {
            clearInterval(countdownInterval)
            countdownOverlay.classList.remove("fade-in")
            countdownOverlay.classList.add("fade-out")
            countdownOverlay.addEventListener("animationend", () => {
                document.body.removeChild(countdownOverlay)
            })
            pauseButton.innerHTML = "<i class=\"fas fa-pause\"></i>"
            gameState.paused = false
            lastTimestamp = performance.now()
            requestAnimationFrame(gameLoop)
        }
    }, 1000)
}

// Initialize the game
function initGame() {
    updateUI()
    startGame() // Start the game automatically
}

// Call initGame when the window loads
window.addEventListener("load", initGame)

// Ensure pot clicks are registered even when clicking on child elements
potElements.forEach((pot, index) => {
    pot.addEventListener("click", (event) => {
        event.stopPropagation()
        interactWithPot(index)
    })
})