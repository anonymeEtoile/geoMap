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
                // Ignore empty lines
                if (row.trim() === "") {
                    return null;
                }

                // Use the regex to match columns, handling quoted fields
                const columnsMatch = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);

                // Check if columnsMatch is not null and has at least 2 elements before processing
                if (columnsMatch && columnsMatch.length >= 2) {
                    const columns = columnsMatch.map(s => s.replace(/"/g, '')); // Remove quotes from matched strings
                    if (columns[0] && columns[1]) { // Ensure both code and name are present
                        return { code: columns[0].toLowerCase(), name: columns[1] };
                    }
                }
                return null; // Return null for malformed or completely empty rows
            }).filter(country => country !== null); // Filter out all null entries (empty or malformed rows)

            if (countries.length === 0) {
                console.warn("Aucun pays n'a été chargé depuis le CSV. Vérifiez le format du fichier mapping.csv.");
                feedbackMessage.textContent = "Problème de chargement des données pays. Vérifiez mapping.csv.";
            }

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
            
            // Set initial viewBox based on the SVG's own viewBox attribute
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
            // Calculate movement relative to container, then scale by current zoom level
            const dx = (event.clientX - startPanX) / currentScale;
            const dy = (event.clientY - startPanY) / currentScale;
            
            // Adjust currentPanX and currentPanY based on dx, dy
            // SVG's viewBox panning is inverse to mouse movement when directly manipulating viewBox coords
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
        
        // Optional: Clamp zoom levels to prevent extreme zoom
        // if (newScale < 0.5 || newScale > 10) return;

        // If no mouse coordinates provided, zoom towards the center of the current map view
        if (mouseX === null || mouseY === null) {
            const rect = mapContainer.getBoundingClientRect();
            mouseX = rect.width / 2;
            mouseY = rect.height / 2;
        }

        // Convert mouse coordinates relative to the map container into SVG coordinate system
        // This calculates the new top-left corner of the viewBox to keep the mouse point fixed
        currentPanX = currentPanX + mouseX / currentScale - mouseX / newScale;
        currentPanY = currentPanY + mouseY / currentScale - mouseY / newScale;
        
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
        countriesToGuess = [...countries]; // Create a shallow copy
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
        currentCountry = countriesToGuess.pop(); // Get next country from the shuffled list
        countryNamePrompt.textContent = currentCountry.name;
        // FlagCDN uses ISO 3166-1 alpha-2 codes. Special case for Somaliland.
        // If flagcdn.com doesn't have a flag, consider a fallback or a custom asset.
        const flagCode = currentCountry.code === '_somaliland' ? 'so' : currentCountry.code; // Use Somalia's flag for Somaliland for now
        flagImage.src = `https://flagcdn.com/w160/${flagCode}.png`;
        flagImage.alt = `Drapeau de ${currentCountry.name}`;
        feedbackMessage.textContent = '';
        feedbackMessage.className = '';
    }

    function handleMapClick(event) {
        if (!currentCountry || !svgMap) return;

        // Ensure we clicked on a path element or one of its descendants
        const clickedPath = event.target.closest('path');
        if (!clickedPath) return; // If clicked on empty SVG space or non-country element

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
            if (score < 0) score = 0; // Prevent negative scores
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
        // Wait a bit before loading the next country to allow user to see feedback
        setTimeout(nextCountry, 2500); 
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

    // Event listeners for mode selection buttons
    continentButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (!e.target.disabled) {
                 startGame(e.target.dataset.mode);
            }
        });
    });
    
    // Event listener for restart game button
    restartGameButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        modeSelection.style.display = 'block'; // Go back to mode selection
    });

    // Initialize the application
    async function init() {
        await loadCountries();
        await loadMap();
        // Enable world button once data is loaded and map is ready
        const worldButton = document.querySelector('.continent-buttons button[data-mode="world"]');
        if (worldButton) worldButton.disabled = false;
    }

    init();
});
