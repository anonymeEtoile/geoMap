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

    // Variables de jeu
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

    // --- MAPPING DES PAYS AUX CONTINENTS ---
    // IMPORTANT : VOUS DEVEZ COMPLÉTER CETTE LISTE AVEC TOUS VOS PAYS ET LEURS CONTINENTS.
    // Les codes sont ceux utilisés dans votre map.svg et mapping.csv.
    // J'ai fait un gros travail pour les remplir d'après votre CSV/SVG, mais VÉRIFIEZ ET AJUSTEZ SI NÉCESSAIRE !
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
        // Note: Certains territoires (comme tf, nc, gl) peuvent parfois être classés différemment.
        // Assurez-vous que les codes pays ici correspondent EXACTEMENT aux IDs dans map.svg et aux codes dans mapping.csv.
    };
    // --- FIN MAPPING CONTINENTS ---


    /**
     * Charge les données des pays depuis le fichier mapping.csv.
     * Inclut un traitement robuste des lignes et l'assignation des continents.
     */
    async function loadCountriesData() {
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

    /**
     * Charge la carte SVG et la prépare pour l'interactivité.
     */
    async function loadMap() {
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

    /**
     * Configure les écouteurs d'événements pour le zoom (molette) et le panoramique (glisser-déposer).
     */
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
            isPanning = false;
            mapContainer.style.cursor = 'grab'; 
        });
        mapContainer.addEventListener('mouseleave', () => {
            isPanning = false;
            mapContainer.style.cursor = 'grab'; 
        });
    }

    /**
     * Applique un facteur de zoom à la carte, en zoomant vers un point spécifique (souris) si fourni.
     * @param {number} factor - Facteur de multiplication (ex: 1.2 pour zoom in, 1/1.2 pour zoom out).
     * @param {number} [mouseX=null] - Coordonnée X de la souris par rapport au conteneur de la carte.
     * @param {number} [mouseY=null] - Coordonnée Y de la souris par rapport au conteneur de la carte.
     */
    function applyZoom(factor, mouseX = null, mouseY = null) {
        const newScale = currentScale * factor;
        if (newScale < 0.2 || newScale > 20) return; 

        if (mouseX === null || mouseY === null) {
            const rect = mapContainer.getBoundingClientRect();
            mouseX = rect.width / 2;
            mouseY = rect.height / 2;
        }

        currentPanX = currentPanX + mouseX / currentScale - mouseX / newScale;
        currentPanY = currentPanY + mouseY / currentScale - mouseY / newScale;
        
        currentScale = newScale;
        updateViewBox(); 
    }
    
    /**
     * Met à jour l'attribut viewBox de la carte SVG avec les valeurs de zoom et panoramique actuelles.
     */
    function updateViewBox() {
        if (!svgMap || !originalViewBox) return;
        const newWidth = originalViewBox[2] / currentScale;
        const newHeight = originalViewBox[3] / currentScale;
        svgMap.setAttribute('viewBox', `${currentPanX} ${currentPanY} ${newWidth} ${newHeight}`);
    }

    /**
     * Réinitialise le zoom et le panoramique de la carte à son état initial.
     */
    function resetMapZoomPan() {
        if (!originalViewBox) return; 
        currentScale = 1;
        currentPanX = originalViewBox[0];
        currentPanY = originalViewBox[1];
        updateViewBox();
    }

    /**
     * Démarre une nouvelle partie du jeu en fonction du mode sélectionné.
     * @param {string} mode - Le mode de jeu sélectionné (ex: "world", "AF", "EU").
     */
    function startGame(mode) {
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

    /**
     * Mélange un tableau en place (algorithme de Fisher-Yates).
     * @param {Array} array - Le tableau d'éléments à mélanger.
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Affiche le prochain pays à deviner et son drapeau.
     */
    function nextCountry() {
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

    /**
     * Gère le clic de l'utilisateur sur la carte pour deviner un pays.
     * @param {MouseEvent} event - L'objet événement de clic.
     */
    function handleMapClick(event) {
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
    
    /**
     * Efface toutes les mises en évidence de couleur des pays sur la carte.
     */
    function clearHighlights() {
        if (!svgMap) return;
        svgMap.querySelectorAll('path.highlight-correct, path.highlight-incorrect').forEach(p => {
            p.classList.remove('highlight-correct', 'highlight-incorrect');
        });
    }

    /**
     * Met à jour l'affichage du score et des compteurs de tentatives.
     */
    function updateScoreboard() {
        scoreDisplay.textContent = score;
        correctCountDisplay.textContent = correctAttempts;
        incorrectCountDisplay.textContent = incorrectAttempts;
    }

    /**
     * Termine la partie et affiche l'écran de fin de partie.
     */
    function endGame() {
        gameArea.style.display = 'none';
        gameOverScreen.style.display = 'block';
        backToHomeButton.style.display = 'none'; 
        finalScoreDisplay.textContent = score;
        const totalAttempts = correctAttempts + incorrectAttempts;
        const accuracy = totalAttempts > 0 ? ((correctAttempts / totalAttempts) * 100).toFixed(1) : 0;
        accuracyDisplay.textContent = accuracy;
    }

    /**
     * Cache les écrans de jeu/fin de partie et affiche la sélection de mode.
     */
    function showMainMenu() {
        gameArea.style.display = 'none';
        gameOverScreen.style.display = 'none';
        modeSelection.style.display = 'block'; 
        backToHomeButton.style.display = 'none'; 
        feedbackMessage.textContent = ''; 
        clearHighlights(); 
        resetMapZoomPan(); 
    }


    // --- Écouteurs d'événements ---
    
    // Écouteurs pour les boutons de sélection de mode (Monde, Afrique, etc.)
    continentButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (!e.target.disabled) { 
                 startGame(e.target.dataset.mode); 
            }
        });
    });
    
    // Écouteur pour le bouton "Rejouer" sur l'écran de fin de partie
    restartGameButton.addEventListener('click', () => {
        startGame(currentGamemode); 
    });

    // Écouteur pour le bouton "Menu Principal" sur l'écran de fin de partie
    mainMenuFromGameOverButton.addEventListener('click', showMainMenu);

    // Écouteur pour le bouton "Accueil" dans l'en-tête (visible pendant le jeu)
    backToHomeButton.addEventListener('click', showMainMenu);


    /**
     * Fonction d'initialisation principale qui charge toutes les ressources nécessaires.
     */
    async function init() {
        await loadCountriesData(); 
        await loadMap();
        // L'activation des boutons de sélection de mode se fait automatiquement dans loadCountriesData
        // une fois que les données sont chargées avec succès.
    }

    init(); 
});
