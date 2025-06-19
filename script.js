document.addEventListener('DOMContentLoaded', () => {
    const modeSelection = document.getElementById('mode-selection');
    const gameArea = document.getElementById('game-area');
    const gameOverScreen = document.getElementById('game-over-screen');
    const continentButtons = document.querySelectorAll('.continent-buttons button');
    
    const flagImage = document.getElementById('flag-image');
    const countryNamePrompt = document.getElementById('country-name-prompt');
    const scoreDisplay = document.getElementById('score');
    const correctCountDisplay = document.getElementById('correct-count');
    const incorrectCountDisplay = document.getElementById('incorrect-count');
    const feedbackMessage = document.getElementById('feedback-message');
    const mapContainer = document.getElementById('map-container');
    
    const finalScoreDisplay = document.getElementById('final-score');
    const accuracyDisplay = document.getElementById('accuracy');
    const restartGameButton = document.getElementById('restart-game');

    const zoomInButton = document.getElementById('zoom-in');
    const zoomOutButton = document.getElementById('zoom-out');
    const resetZoomButton = document.getElementById('reset-zoom');

    let countries = [];
    let currentCountry = null;
    let score = 0;
    let correctAttempts = 0;
    let incorrectAttempts = 0;
    let countriesToGuess = [];
    let svgMap = null;
    let originalViewBox = null;

    // Zoom and Pan variables
    let currentScale = 1;
    let currentPanX = 0;
    let currentPanY = 0;
    let isPanning = false;
    let startPanX, startPanY;
    const ZOOM_FACTOR = 1.2;

    async function loadCountries() {
        try {
            const response = await fetch('mapping.csv');
            const csvText = await response.text();
            const rows = csvText.split('\n').slice(1); // Skip header
            countries = rows.map(row => {
                const columns = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(s => s.replace(/"/g, ''));
                if (columns.length === 2 && columns[0] && columns[1]) {
                    return { code: columns[0].toLowerCase(), name: columns[1] };
                }
                return null;
            }).filter(country => country !== null);
        } catch (error) {
            console.error("Erreur de chargement du CSV:", error);
            feedbackMessage.textContent = "Impossible de charger les données des pays.";
        }
    }

    async function loadMap() {
        try {
            const response = await fetch('map.svg');
            const svgText = await response.text();
            mapContainer.innerHTML = svgText;
            svgMap = mapContainer.querySelector('svg');
            svgMap.id = 'world-map-svg'; // Assign ID for CSS targeting
            
            originalViewBox = svgMap.getAttribute('viewBox').split(' ').map(Number);
            currentPanX = originalViewBox[0];
            currentPanY = originalViewBox[1];

            const paths = svgMap.querySelectorAll('path');
            paths.forEach(path => {
                path.addEventListener('click', handleMapClick);
            });
            setupZoomPan();
        } catch (error) {
            console.error("Erreur de chargement du SVG:", error);
            feedbackMessage.textContent = "Impossible de charger la carte.";
        }
    }

    function setupZoomPan() {
        zoomInButton.addEventListener('click', () => applyZoom(ZOOM_FACTOR));
        zoomOutButton.addEventListener('click', () => applyZoom(1 / ZOOM_FACTOR));
        resetZoomButton.addEventListener('click', resetMapZoomPan);

        mapContainer.addEventListener('wheel', (event) => {
            event.preventDefault();
            const factor = event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
            const rect = mapContainer.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            applyZoom(factor, mouseX, mouseY);
        });

        mapContainer.addEventListener('mousedown', (event) => {
            isPanning = true;
            startPanX = event.clientX;
            startPanY = event.clientY;
            mapContainer.style.cursor = 'grabbing';
        });

        mapContainer.addEventListener('mousemove', (event) => {
            if (!isPanning) return;
            event.preventDefault();
            const dx = (event.clientX - startPanX) / currentScale;
            const dy = (event.clientY - startPanY) / currentScale;
            
            // Adjust currentPanX and currentPanY based on dx, dy
            // SVG's viewBox panning is inverse to mouse movement
            currentPanX -= dx;
            currentPanY -= dy;
            
            updateViewBox();

            startPanX = event.clientX;
            startPanY = event.clientY;
        });

        mapContainer.addEventListener('mouseup', () => {
            isPanning = false;
            mapContainer.style.cursor = 'grab';
        });
        mapContainer.addEventListener('mouseleave', () => {
            isPanning = false;
            mapContainer.style.cursor = 'grab';
        });
    }

    function applyZoom(factor, mouseX = null, mouseY = null) {
        const newScale = currentScale * factor;
        
        // Optional: Clamp zoom levels
        // if (newScale < 0.5 || newScale > 10) return;

        if (mouseX === null) mouseX = originalViewBox[2] / 2;
        if (mouseY === null) mouseY = originalViewBox[3] / 2;

        // Calculate new viewBox origin to zoom towards mouse
        currentPanX = mouseX / currentScale - (mouseX / newScale) + currentPanX;
        currentPanY = mouseY / currentScale - (mouseY / newScale) + currentPanY;
        
        currentScale = newScale;
        updateViewBox();
    }
    
    function updateViewBox() {
        if (!svgMap || !originalViewBox) return;
        const newWidth = originalViewBox[2] / currentScale;
        const newHeight = originalViewBox[3] / currentScale;
        svgMap.setAttribute('viewBox', `${currentPanX} ${currentPanY} ${newWidth} ${newHeight}`);
    }

    function resetMapZoomPan() {
        currentScale = 1;
        currentPanX = originalViewBox[0];
        currentPanY = originalViewBox[1];
        updateViewBox();
    }


    function startGame(mode) {
        modeSelection.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameArea.style.display = 'block';

        score = 0;
        correctAttempts = 0;
        incorrectAttempts = 0;
        updateScoreboard();
        
        // TODO: Implement continent filtering if data is available
        // For now, "world" mode uses all countries
        countriesToGuess = [...countries];
        shuffleArray(countriesToGuess);
        
        nextCountry();
        resetMapZoomPan(); // Reset map view at start of game
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function nextCountry() {
        clearHighlights();
        if (countriesToGuess.length === 0) {
            endGame();
            return;
        }
        currentCountry = countriesToGuess.pop();
        countryNamePrompt.textContent = currentCountry.name;
        // FlagCDN uses ISO 3166-1 alpha-2 codes. Special case for Somaliland.
        const flagCode = currentCountry.code === '_somaliland' ? 'so' : currentCountry.code; // Use Somalia's flag for Somaliland or find a custom one
        flagImage.src = `https://flagcdn.com/w160/${flagCode}.png`;
        flagImage.alt = `Drapeau de ${currentCountry.name}`;
        feedbackMessage.textContent = '';
        feedbackMessage.className = '';
    }

    function handleMapClick(event) {
        if (!currentCountry || !svgMap) return;

        const clickedPath = event.target.closest('path');
        if (!clickedPath) return;

        const clickedCountryId = clickedPath.id.toLowerCase();
        
        clearHighlights(); // Clear previous highlights

        if (clickedCountryId === currentCountry.code) {
            score += 10;
            correctAttempts++;
            feedbackMessage.textContent = "Correct ! 🎉";
            feedbackMessage.className = 'feedback-correct';
            clickedPath.classList.add('highlight-correct');
        } else {
            score -= 5;
            if (score < 0) score = 0;
            incorrectAttempts++;
            const clickedCountryObj = countries.find(c => c.code === clickedCountryId);
            const clickedName = clickedCountryObj ? clickedCountryObj.name : "une zone inconnue";
            feedbackMessage.textContent = `Oups ! C'était ${clickedName}. Le pays à trouver était ${currentCountry.name}.`;
            feedbackMessage.className = 'feedback-incorrect';
            clickedPath.classList.add('highlight-incorrect');
            
            // Highlight the correct country if user was wrong
            const correctPath = svgMap.querySelector(`path#${currentCountry.code}`);
            if (correctPath) {
                correctPath.classList.add('highlight-correct');
            }
        }
        updateScoreboard();
        setTimeout(nextCountry, 2500); // Wait a bit before next country
    }
    
    function clearHighlights() {
        if (!svgMap) return;
        svgMap.querySelectorAll('path.highlight-correct, path.highlight-incorrect').forEach(p => {
            p.classList.remove('highlight-correct', 'highlight-incorrect');
        });
    }

    function updateScoreboard() {
        scoreDisplay.textContent = score;
        correctCountDisplay.textContent = correctAttempts;
        incorrectCountDisplay.textContent = incorrectAttempts;
    }

    function endGame() {
        gameArea.style.display = 'none';
        gameOverScreen.style.display = 'block';
        finalScoreDisplay.textContent = score;
        const totalAttempts = correctAttempts + incorrectAttempts;
        const accuracy = totalAttempts > 0 ? ((correctAttempts / totalAttempts) * 100).toFixed(1) : 0;
        accuracyDisplay.textContent = accuracy;
    }

    continentButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (!e.target.disabled) {
                 startGame(e.target.dataset.mode);
            }
        });
    });
    
    restartGameButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        modeSelection.style.display = 'block';
    });

    async function init() {
        await loadCountries();
        await loadMap();
        // Enable world button once data is loaded
        const worldButton = document.querySelector('.continent-buttons button[data-mode="world"]');
        if (worldButton) worldButton.disabled = false;
    }

    init();
});