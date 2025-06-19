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
    let isPanningMouse = false; // Vrai si le panoramique est actif via la souris
    let isPanningTouch = false; // Vrai si le panoramique est actif via 1 doigt tactile
    let startPanXGlobal, startPanYGlobal; // Coordonnées de départ pour le panoramique (souris ou tactile)
    const ZOOM_FACTOR = 1.2; 

    // Variables pour le pinch-to-zoom tactile et pour distinguer clic/glisser
    let initialPinchDistance = null; // Distance entre les doigts au début du pincement
    let lastTouchPoint = null; // Dernière position du doigt pour le panoramique
    let touchMovedSignificantly = false; // Vrai si le doigt a bougé assez pour être un drag/pinch et non un clic
    const DRAG_THRESHOLD = 5; // Distance en pixels pour considérer un mouvement comme un drag/pinch

    // --- MAPPING DES PAYS AUX CONTINENTS ---
    // IMPORTANT : ASSUREZ-VOUS QUE CETTE LISTE EST COMPLÈTE ET CORRESPOND À VOS DONNÉES !
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

    /**
     * Charge les données des pays depuis le fichier mapping.csv.
     * Cette version est plus robuste et gère l'assignation des continents.
     */
    async function loadCountriesData() {
        try {
            const response = await fetch('mapping.csv');
            if (!response.ok) {
                throw new Error(`Erreur HTTP! Statut: ${response.status}`);
            }
            const csvText = await response.text();
            const rows = csvText.split('\n'); // Divise le texte en lignes

            allCountriesData = []; // Réinitialise le tableau avant de le remplir

            // Itère sur les lignes, en sautant l'en-tête (première ligne, index 0)
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim(); // Supprime les espaces blancs inutiles

                if (row === "") { continue; } // Saute les lignes vides

                // Sépare la ligne par la virgule et nettoie chaque partie
                const parts = row.split(',').map(part => part.trim().replace(/"/g, ''));

                // Vérifie que nous avons bien 2 parties et qu'elles ne sont pas vides
                if (parts.length === 2 && parts[0] && parts[1]) {
                    const countryCode = parts[0].toLowerCase();
                    allCountriesData.push({
                        code: countryCode,
                        name: parts[1],
                        // Assigne le continent en utilisant le mapping, ou "unknown" si non trouvé
                        continent: countryToContinentMap[countryCode] || "unknown" 
                    });
                } else {
                    console.warn(`Ligne mal formée ou incomplète ignorée dans mapping.csv (ligne ${i + 1}): "${rows[i]}"`);
                }
            }

            if (allCountriesData.length === 0) {
                console.error("ERREUR: Aucun pays n'a été chargé depuis le CSV. Les boutons de mode de jeu ne seront pas activés.");
                feedbackMessage.textContent = "Problème de chargement des données pays. Vérifiez mapping.csv.";
                continentButtons.forEach(btn => btn.disabled = true); 
            } else {
                console.log(`${allCountriesData.length} pays chargés avec succès. Activation des boutons de mode.`);
                continentButtons.forEach(btn => btn.disabled = false);
            }

        } catch (error) {
            console.error("Erreur critique lors du chargement ou parsing du CSV:", error);
            feedbackMessage.textContent = "Impossible de charger les données des pays.";
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
            
            const viewBoxAttr = svgMap.getAttribute('viewBox');
            if (!viewBoxAttr) {
                console.error("L'attribut viewBox est manquant sur le SVG de la carte ! Définition d'un viewBox par défaut.");
                const width = parseFloat(svgMap.getAttribute('width')) || 784.077; // Utiliser les valeurs de votre SVG
                const height = parseFloat(svgMap.getAttribute('height')) || 458.627;
                svgMap.setAttribute('viewBox', `0 0 ${width} ${height}`);
                originalViewBox = [0, 0, width, height];
            } else {
                originalViewBox = viewBoxAttr.split(' ').map(Number);
            }
            
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
     * Calcule la distance euclidienne entre deux points de contact tactiles.
     */
    function getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Configure les écouteurs d'événements pour le zoom (molette, pinch) et le panoramique (souris, glisser tactile).
     */
    function setupZoomPan() {
        // Écouteurs pour les boutons de zoom
        zoomInButton.addEventListener('click', () => applyZoom(ZOOM_FACTOR));
        zoomOutButton.addEventListener('click', () => applyZoom(1 / ZOOM_FACTOR));
        resetZoomButton.addEventListener('click', resetMapZoomPan);

        // --- Gestion du zoom/pan pour la souris (Desktop) ---
        mapContainer.addEventListener('wheel', (event) => {
            event.preventDefault(); // Empêche le défilement de la page
            const factor = event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR; 
            const rect = mapContainer.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            applyZoom(factor, mouseX, mouseY);
        });

        mapContainer.addEventListener('mousedown', (event) => {
            if (event.button !== 0) return; // Seulement le clic gauche
            isPanningMouse = true;
            startPanXGlobal = event.clientX; 
            startPanYGlobal = event.clientY; 
            mapContainer.style.cursor = 'grabbing'; 
        });

        // Écouteurs sur `document` pour permettre le drag même si la souris sort du conteneur de la carte
        document.addEventListener('mousemove', (event) => { 
            if (!isPanningMouse) return; 
            const dx = (event.clientX - startPanXGlobal) / currentScale;
            const dy = (event.clientY - startPanYGlobal) / currentScale;
            currentPanX -= dx;
            currentPanY -= dy;
            updateViewBox();
            startPanXGlobal = event.clientX; 
            startPanYGlobal = event.clientY;
        });

        document.addEventListener('mouseup', (event) => { 
            if (isPanningMouse && event.button === 0) {
                isPanningMouse = false;
                mapContainer.style.cursor = 'grab'; 
            }
        });
        // Pas besoin de mouseleave sur mapContainer car mouseup est sur document

        // --- Gestion des événements tactiles (Mobile) ---
        mapContainer.addEventListener('touchstart', (event) => {
            // event.preventDefault() n'est PAS appelé ici pour permettre aux événements 'click' natifs
            // sur les pays de se déclencher si c'est juste un tap et non un drag/pinch.
            
            // Réinitialise le drapeau de mouvement pour chaque nouveau contact tactile
            touchMovedSignificantly = false; 

            if (event.touches.length === 1) { // Un doigt : potentiel panoramique
                isPanningTouch = true;
                lastTouchPoint = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            } else if (event.touches.length === 2) { // Deux doigts : potentiel pinch-to-zoom
                isPanningTouch = false; // Désactive le panoramique si deux doigts sont utilisés
                initialPinchDistance = getDistance(event.touches[0], event.touches[1]);
            }
        }, { passive: true }); // `passive: true` pour optimiser le défilement si preventDefault n'est pas appelé ici.

        mapContainer.addEventListener('touchmove', (event) => {
            event.preventDefault(); // IMPORTANT : Empêche le défilement/zoom natif du navigateur sur la carte
            
            // Détermine si un mouvement significatif a eu lieu
            if (event.touches.length === 1 && lastTouchPoint) {
                const currentX = event.touches[0].clientX;
                const currentY = event.touches[0].clientY;
                const dist = Math.sqrt(Math.pow(currentX - lastTouchPoint.x, 2) + Math.pow(currentY - lastTouchPoint.y, 2));
                if (dist > DRAG_THRESHOLD) {
                    touchMovedSignificantly = true;
                }
            } else if (event.touches.length === 2 && initialPinchDistance !== null) {
                touchMovedSignificantly = true; // Un pincement est toujours un mouvement significatif
            }

            if (event.touches.length === 1 && isPanningTouch && lastTouchPoint) { 
                const touch = event.touches[0];
                const dx = (touch.clientX - lastTouchPoint.x) / currentScale;
                const dy = (touch.clientY - lastTouchPoint.y) / currentScale;
                
                currentPanX -= dx;
                currentPanY -= dy;
                updateViewBox();

                lastTouchPoint = { x: touch.clientX, y: touch.clientY };

            } else if (event.touches.length === 2 && initialPinchDistance !== null) { 
                const currentPinchDistance = getDistance(event.touches[0], event.touches[1]);
                const scaleFactor = currentPinchDistance / initialPinchDistance;
                
                // Pour le zoom tactile, on zoome par rapport au centre visible du conteneur de la carte pour simplifier
                const rect = mapContainer.getBoundingClientRect();
                const pinchCenterX = rect.width / 2;
                const pinchCenterY = rect.height / 2;

                applyZoom(scaleFactor, pinchCenterX, pinchCenterY);
                initialPinchDistance = currentPinchDistance; // Met à jour la distance pour le prochain delta de mouvement
            }
        }, { passive: false }); // `passive: false` pour pouvoir appeler preventDefault()

        mapContainer.addEventListener('touchend', (event) => {
            // event.preventDefault() n'est PAS appelé ici pour ne pas bloquer le 'click' natif si c'était un tap
            
            // Réinitialise les variables de pinch-to-zoom
            if (event.touches.length < 2) {
                initialPinchDistance = null; 
            }
            // Réinitialise les variables de panoramique tactile
            if (event.touches.length < 1) {
                isPanningTouch = false;
                lastTouchPoint = null;
            }
            // `touchMovedSignificantly` est géré dans handleMapClick pour le distinguer du tap
        });
    }

    /**
     * Applique un facteur de zoom à la carte.
     * @param {number} factor - Facteur de multiplication (ex: 1.2 pour zoom in, 1/1.2 pour zoom out).
     * @param {number} [pointX=null] - Coordonnée X (relative au conteneur de la carte) vers laquelle zoomer.
     * @param {number} [pointY=null] - Coordonnée Y (relative au conteneur de la carte) vers laquelle zoomer.
     */
    function applyZoom(factor, pointX = null, pointY = null) {
        if (!originalViewBox) return; // Protection au cas où viewBox n'est pas encore défini
        const newScale = currentScale * factor;
        if (newScale < 0.2 || newScale > 20) return; // Limite le zoom pour éviter des échelles extrêmes

        // Si aucun point n'est fourni, zoomer vers le centre du conteneur de la carte
        if (pointX === null || pointY === null) {
            const rect = mapContainer.getBoundingClientRect();
            pointX = rect.width / 2;
            pointY = rect.height / 2;
        }

        // Calcule le nouvel origine du viewBox pour que le point (pointX, pointY) reste fixe après le zoom
        currentPanX = currentPanX + pointX / currentScale - pointX / newScale;
        currentPanY = currentPanY + pointY / currentScale - pointY / newScale;
        
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
        if (!originalViewBox) {
            console.warn("Tentative de réinitialiser le zoom avant que originalViewBox ne soit défini. Ignoré.");
            return; 
        }
        currentScale = 1;
        currentPanX = originalViewBox[0];
        currentPanY = originalViewBox[1];
        updateViewBox();
    }

    /**
     * Démarre une nouvelle partie du jeu en fonction du mode sélectionné.
     */
    function startGame(mode) {
        console.log(`Démarrage du jeu en mode: ${mode}`);
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
            // Filtre les pays par continent
            countriesToGuessForCurrentGame = allCountriesData.filter(country => country.continent === mode);
        }

        if (countriesToGuessForCurrentGame.length === 0) {
            feedbackMessage.textContent = `Aucun pays trouvé pour le mode ${mode}. Choisissez un autre mode.`;
            console.warn(`Aucun pays trouvé pour le continent: ${mode}. Vérifiez le mapping des continents ou les IDs SVG.`);
            setTimeout(showMainMenu, 3000);
            return;
        }
        
        shuffleArray(countriesToGuessForCurrentGame); // Mélange les pays
        nextCountry(); // Affiche le premier pays
        resetMapZoomPan(); // Réinitialise la vue de la carte
    }

    /**
     * Mélange un tableau en place (algorithme de Fisher-Yates).
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
     */
    function handleMapClick(event) {
        // Si c'est un événement tactile et qu'un mouvement significatif a été détecté,
        // on l'ignore car ce n'est pas un simple "tap" (clic).
        if (event.type.startsWith('touch') && touchMovedSignificantly) {
            // Réinitialiser le drapeau pour le prochain contact tactile
            touchMovedSignificantly = false; 
            return; 
        }

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
            p.classList.remove('highlight-correct', 'incorrect-highlight');
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
        
        // S'assurer que la carte est chargée avant de tenter de la manipuler
        if(svgMap && originalViewBox) { 
            clearHighlights(); 
            resetMapZoomPan(); 
        }
    }


    // --- Écouteurs d'événements des boutons ---
    
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
        console.log("Démarrage de l'initialisation...");
        await loadCountriesData(); // Charge les données des pays
        await loadMap(); // Charge la carte SVG
        console.log("Initialisation terminée. Prêt à jouer !");
    }

    init(); 
});
