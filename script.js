document.addEventListener('DOMContentLoaded', () => {
    // Éléments du DOM
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
    const mainMenuFromGameOverButton = document.getElementById('main-menu-from-gameover'); 
    const backToHomeButton = document.getElementById('back-to-home'); 

    const zoomInButton = document.getElementById('zoom-in');
    const zoomOutButton = document.getElementById('zoom-out');
    const resetZoomButton = document.getElementById('reset-zoom');

    // Variables de jeu (inchangées)
    let allCountriesData = []; 
    let currentCountry = null; 
    let score = 0;
    let correctAttempts = 0;
    let incorrectAttempts = 0;
    let countriesToGuessForCurrentGame = []; 
    let currentGamemode = "world"; 

    // Variables de zoom et panoramique
    let svgMap = null; 
    let originalViewBox = null; 
    let currentScale = 1; 
    let currentPanX = 0; 
    let currentPanY = 0; 
    let isPanning = false; 
    let startPanXGlobal, startPanYGlobal; 
    const ZOOM_FACTOR = 1.2; 

    // Variables pour le pinch-to-zoom tactile
    let initialPinchDistance = null;
    let lastTouch = null; // Pour le drag à un doigt

    // --- MAPPING DES PAYS AUX CONTINENTS (Identique à la version précédente) ---
    // (Assurez-vous qu'il est bien rempli)
    const countryToContinentMap = {
        // Afrique (AF)
        "_somaliland": "AF", "ao": "AF", "dz": "AF", "bi": "AF", "bj": "AF", "bw": "AF", "bf": "AF",
        "cm": "AF", "cf": "AF", "td": "AF", "cg": "AF", "cd": "AF", "ci": "AF", "dj": "AF",
        "eg": "AF", "er": "AF", "et": "AF", "ga": "AF", "gm": "AF", "gh": "AF", "gn": "AF",
        "gq": "AF", "gw": "AF", "ke": "AF", "ls": "AF", "lr": "AF", "ly": "AF", "mg": "AF",
        "mw": "AF", "ml": "AF", "mr": "AF", "mz": "AF", "na": "AF", "ne": "AF", "ng": "AF",
        "rw": "AF", "st": "AF", "sn": "AF", "sl": "AF", "so": "AF", "za": "AF", "ss": "AF",
        "sd": "AF", "sz": "AF", "tz": "AF", "tg": "AF", "tn": "AF", "ug": "AF", "eh": "AF",
        "zm": "AF", "zw": "AF",
        // Asie (AS)
        "ae": "AS", "af": "AS", "am": "AS", "az": "AS", "bd": "AS", "bn": "AS", "bt": "AS",
        "cn": "AS", "cy": "AS", "ge": "AS", "in": "AS", "id": "AS", "ir": "AS", "iq": "AS",
        "il": "AS", "jp": "AS", "jo": "AS", "kz": "AS", "kp": "AS", "kr": "AS", "kw": "AS",
        "kg": "AS", "la": "AS", "lb": "AS", "lk": "AS", "my": "AS", "mn": "AS", "mm": "AS",
        "np": "AS", "om": "AS", "pk": "AS", "ps": "AS", "ph": "AS", "qa": "AS", "sg": "AS",
        "sy": "AS", "tj": "AS", "th": "AS", "tl": "AS", "tm": "AS", "tr": "AS", "tw": "AS",
        "uz": "AS", "vn": "AS", "ye": "AS", "kh": "AS", 
        // Europe (EU)
        "al": "EU", "at": "EU", "by": "EU", "be": "EU", "ba": "EU", "bg": "EU", "hr": "EU",
        "cz": "EU", "dk": "EU", "ee": "EU", "fi": "EU", "fr": "EU", "de": "EU", "gr": "EU",
        "hu": "EU", "ie": "EU", "is": "EU", "it": "EU", "lv": "EU", "lt": "EU", "lu": "EU",
        "md": "EU", "me": "EU", "mk": "EU", "nl": "EU", "no": "EU", "pl": "EU", "pt": "EU",
        "ro": "EU", "rs": "EU", "ru": "EU", "si": "EU", "sk": "EU", "es": "EU", "se": "EU",
        "ch": "EU", "ua": "EU", "gb": "EU", "mt": "EU", 
        // Amérique du Nord (NA)
        "bs": "NA", "bz": "NA", "ca": "NA", "cr": "NA", "cu": "NA", "do": "NA", "sv": "NA",
        "gl": "NA", "gt": "NA", "hn": "NA", "ht": "NA", "jm": "NA", "mx": "NA", "ni": "NA",
        "pa": "NA", "pr": "NA", "tt": "NA", "us": "NA", "dm": "NA", "lc": "NA", "vc": "NA",
        // Amérique du Sud (SA)
        "ar": "SA", "bo": "SA", "br": "SA", "cl": "SA", "co": "SA", "ec": "SA", "fk": "SA",
        "gy": "SA", "py": "SA", "pe": "SA", "sr": "SA", "uy": "SA", "ve": "SA",
        // Océanie (OC)
        "au": "OC", "fj": "OC", "nz": "OC", "nc": "OC", "pg": "OC", "sb": "OC", "tf": "OC", "vu": "OC",
    };
    // --- FIN MAPPING CONTINENTS ---

    async function loadCountriesData() {
        // ... (code inchangé par rapport à la version précédente) ...
        try {
            const response = await fetch('mapping.csv');
            if (!response.ok) {
                throw new Error(`Erreur HTTP! Statut: ${response.status}`);
            }
            const csvText = await response.text();
            const rows = csvText.split('\n');

            allCountriesData = []; 

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim(); 
                if (row === "") { 
                    continue;
                }
                const parts = row.split(',').map(part => part.trim().replace(/"/g, ''));
                if (parts.length === 2 && parts[0] && parts[1]) {
                    const countryCode = parts[0].toLowerCase();
                    allCountriesData.push({
                        code: countryCode,
                        name: parts[1],
                        continent: countryToContinentMap[countryCode] || "unknown" 
                    });
                } else {
                    console.warn(`Ligne mal formée ou incomplète ignorée dans mapping.csv (ligne ${i + 1}): "${rows[i]}"`);
                }
            }

            if (allCountriesData.length === 0) {
                console.warn("Aucun pays n'a été chargé depuis le CSV. Vérifiez le format du fichier mapping.csv.");
                feedbackMessage.textContent = "Problème de chargement des données pays. Vérifiez mapping.csv.";
                continentButtons.forEach(btn => btn.disabled = true); 
            } else {
                console.log(`${allCountriesData.length} pays chargés avec succès.`);
                continentButtons.forEach(btn => btn.disabled = false);
            }

        } catch (error) {
            console.error("Erreur de chargement ou de parsing du CSV:", error);
            feedbackMessage.textContent = "Impossible de charger ou de parser les données des pays.";
            continentButtons.forEach(btn => btn.disabled = true); 
        }
    }

    async function loadMap() {
        // ... (code inchangé) ...
        try {
            const response = await fetch('map.svg');
            const svgText = await response.text();
            mapContainer.innerHTML = svgText; 
            svgMap = mapContainer.querySelector('svg');
            svgMap.id = 'world-map-svg'; 
            
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

    function getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getMidpoint(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2,
        };
    }

    function setupZoomPan() {
        // Boutons de zoom
        zoomInButton.addEventListener('click', () => applyZoom(ZOOM_FACTOR));
        zoomOutButton.addEventListener('click', () => applyZoom(1 / ZOOM_FACTOR));
        resetZoomButton.addEventListener('click', resetMapZoomPan);

        // Zoom à la molette (pour desktop)
        mapContainer.addEventListener('wheel', (event) => {
            event.preventDefault(); 
            const factor = event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR; 
            const rect = mapContainer.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            applyZoom(factor, mouseX, mouseY);
        });

        // Panoramique à la souris (pour desktop)
        mapContainer.addEventListener('mousedown', (event) => {
            if (event.button !== 0) return; // Seulement clic gauche
            isPanning = true;
            startPanXGlobal = event.clientX; 
            startPanYGlobal = event.clientY; 
            mapContainer.style.cursor = 'grabbing'; 
        });

        mapContainer.addEventListener('mousemove', (event) => {
            if (!isPanning) return; 
            event.preventDefault();
            const dx = (event.clientX - startPanXGlobal) / currentScale;
            const dy = (event.clientY - startPanYGlobal) / currentScale;
            
            currentPanX -= dx;
            currentPanY -= dy;
            
            updateViewBox();

            startPanXGlobal = event.clientX; 
            startPanYGlobal = event.clientY;
        });

        mapContainer.addEventListener('mouseup', () => {
            if (isPanning) {
                isPanning = false;
                mapContainer.style.cursor = 'grab'; 
            }
        });
        mapContainer.addEventListener('mouseleave', () => {
             if (isPanning) {
                isPanning = false;
                mapContainer.style.cursor = 'grab'; 
            }
        });


        // --- Gestion des événements tactiles ---
        mapContainer.addEventListener('touchstart', (event) => {
            event.preventDefault(); // Important pour éviter le scroll natif etc.
            if (event.touches.length === 1) { // Panoramique à un doigt
                isPanning = true;
                lastTouch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
                mapContainer.style.cursor = 'grabbing'; // Même si pas de curseur sur mobile, bonne pratique
            } else if (event.touches.length === 2) { // Pinch to zoom
                isPanning = false; // Arrête le pan si on passe à 2 doigts
                initialPinchDistance = getDistance(event.touches[0], event.touches[1]);
            }
        }, { passive: false }); // passive: false est important pour pouvoir appeler preventDefault()

        mapContainer.addEventListener('touchmove', (event) => {
            event.preventDefault();
            if (event.touches.length === 1 && isPanning && lastTouch) { // Panoramique à un doigt
                const touch = event.touches[0];
                const dx = (touch.clientX - lastTouch.x) / currentScale;
                const dy = (touch.clientY - lastTouch.y) / currentScale;
                
                currentPanX -= dx;
                currentPanY -= dy;
                updateViewBox();

                lastTouch = { x: touch.clientX, y: touch.clientY };

            } else if (event.touches.length === 2 && initialPinchDistance !== null) { // Pinch to zoom
                const currentPinchDistance = getDistance(event.touches[0], event.touches[1]);
                const scaleFactor = currentPinchDistance / initialPinchDistance;
                
                const midpoint = getMidpoint(event.touches[0], event.touches[1]);
                const rect = mapContainer.getBoundingClientRect();
                const pinchCenterX = midpoint.x - rect.left;
                const pinchCenterY = midpoint.y - rect.top;

                applyZoom(scaleFactor, pinchCenterX, pinchCenterY);
                
                initialPinchDistance = currentPinchDistance; // Met à jour pour le prochain mouvement
            }
        }, { passive: false });

        mapContainer.addEventListener('touchend', (event) => {
            // event.preventDefault(); // Peut parfois causer des problèmes avec les clics si trop agressif
            if (event.touches.length < 2) {
                initialPinchDistance = null; // Reset pinch distance
            }
            if (event.touches.length < 1) {
                isPanning = false;
                lastTouch = null;
                mapContainer.style.cursor = 'grab';
            }
        });
    }


    function applyZoom(factor, pointX = null, pointY = null) {
        // ... (code inchangé) ...
        const newScale = currentScale * factor;
        if (newScale < 0.2 || newScale > 20) return; 

        if (pointX === null || pointY === null) {
            const rect = mapContainer.getBoundingClientRect();
            pointX = rect.width / 2;
            pointY = rect.height / 2;
        }

        currentPanX = currentPanX + pointX / currentScale - pointX / newScale;
        currentPanY = currentPanY + pointY / currentScale - pointY / newScale;
        
        currentScale = newScale;
        updateViewBox(); 
    }
    
    function updateViewBox() {
        // ... (code inchangé) ...
        if (!svgMap || !originalViewBox) return;
        const newWidth = originalViewBox[2] / currentScale;
        const newHeight = originalViewBox[3] / currentScale;
        svgMap.setAttribute('viewBox', `${currentPanX} ${currentPanY} ${newWidth} ${newHeight}`);
    }

    function resetMapZoomPan() {
        // ... (code inchangé) ...
        if (!originalViewBox) return; 
        currentScale = 1;
        currentPanX = originalViewBox[0];
        currentPanY = originalViewBox[1];
        updateViewBox();
    }

    function startGame(mode) {
        // ... (code inchangé) ...
        currentGamemode = mode; 
        modeSelection.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameArea.style.display = 'block';
        backToHomeButton.style.display = 'block'; 

        score = 0;
        correctAttempts = 0;
        incorrectAttempts = 0;
        updateScoreboard();
        
        if (mode === "world") {
            countriesToGuessForCurrentGame = [...allCountriesData]; 
        } else {
            countriesToGuessForCurrentGame = allCountriesData.filter(country => country.continent === mode);
        }

        if (countriesToGuessForCurrentGame.length === 0) {
            feedbackMessage.textContent = `Aucun pays trouvé pour le mode ${mode}. Choisissez un autre mode.`;
            console.warn(`Aucun pays trouvé pour le continent: ${mode}. Vérifiez le mapping et les IDs SVG.`);
            setTimeout(showMainMenu, 3000);
            return;
        }
        
        shuffleArray(countriesToGuessForCurrentGame);
        
        nextCountry(); 
        resetMapZoomPan(); 
    }

    function shuffleArray(array) {
        // ... (code inchangé) ...
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function nextCountry() {
        // ... (code inchangé) ...
        clearHighlights(); 
        if (countriesToGuessForCurrentGame.length === 0) {
            endGame(); 
            return;
        }
        currentCountry = countriesToGuessForCurrentGame.pop(); 
        countryNamePrompt.textContent = currentCountry.name;
        const flagCode = currentCountry.code === '_somaliland' ? 'so' : currentCountry.code; 
        flagImage.src = `https://flagcdn.com/w160/${flagCode}.png`;
        flagImage.alt = `Drapeau de ${currentCountry.name}`;
        feedbackMessage.textContent = ''; 
        feedbackMessage.className = ''; 
    }

    function handleMapClick(event) {
        // ... (code inchangé) ...
        // Important: S'assurer que le drag/pinch ne déclenche pas un clic de pays
        // On pourrait ajouter une vérification ici si on a bougé ou zoomé beaucoup
        // Mais pour l'instant, on garde simple.
        if (!currentCountry || !svgMap) return; 

        const clickedPath = event.target.closest('path');
        if (!clickedPath) return; 

        const clickedCountryId = clickedPath.id.toLowerCase();
        
        clearHighlights(); 

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
            const clickedCountryObj = allCountriesData.find(c => c.code === clickedCountryId);
            const clickedName = clickedCountryObj ? clickedCountryObj.name : "une zone inconnue";
            feedbackMessage.textContent = `Oups ! C'était ${clickedName}. Le pays à trouver était ${currentCountry.name}.`;
            feedbackMessage.className = 'feedback-incorrect';
            clickedPath.classList.add('highlight-incorrect'); 
            
            const correctPath = svgMap.querySelector(`path#${currentCountry.code}`);
            if (correctPath) {
                correctPath.classList.add('highlight-correct');
            }
        }
        updateScoreboard(); 
        setTimeout(nextCountry, 2500); 
    }
    
    function clearHighlights() {
        // ... (code inchangé) ...
        if (!svgMap) return;
        svgMap.querySelectorAll('path.highlight-correct, path.highlight-incorrect').forEach(p => {
            p.classList.remove('highlight-correct', 'highlight-incorrect');
        });
    }

    function updateScoreboard() {
        // ... (code inchangé) ...
        scoreDisplay.textContent = score;
        correctCountDisplay.textContent = correctAttempts;
        incorrectCountDisplay.textContent = incorrectAttempts;
    }

    function endGame() {
        // ... (code inchangé) ...
        gameArea.style.display = 'none';
        gameOverScreen.style.display = 'block';
        backToHomeButton.style.display = 'none'; 
        finalScoreDisplay.textContent = score;
        const totalAttempts = correctAttempts + incorrectAttempts;
        const accuracy = totalAttempts > 0 ? ((correctAttempts / totalAttempts) * 100).toFixed(1) : 0;
        accuracyDisplay.textContent = accuracy;
    }

    function showMainMenu() {
        // ... (code inchangé) ...
        gameArea.style.display = 'none';
        gameOverScreen.style.display = 'none';
        modeSelection.style.display = 'block'; 
        backToHomeButton.style.display = 'none'; 
        feedbackMessage.textContent = ''; 
        clearHighlights(); 
        resetMapZoomPan(); 
    }


    // --- Écouteurs d'événements --- (inchangés)
    continentButtons.forEach(button => { /* ... */ });
    restartGameButton.addEventListener('click', () => { /* ... */ });
    mainMenuFromGameOverButton.addEventListener('click', showMainMenu);
    backToHomeButton.addEventListener('click', showMainMenu);

    async function init() {
        // ... (code inchangé) ...
        await loadCountriesData(); 
        await loadMap();
    }

    init(); 
});
