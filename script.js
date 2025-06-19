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
    const mainMenuFromGameOverButton = document.getElementById('main-menu-from-gameover'); // Nouveau bouton
    const backToHomeButton = document.getElementById('back-to-home'); // Nouveau bouton "Accueil"

    const zoomInButton = document.getElementById('zoom-in');
    const zoomOutButton = document.getElementById('zoom-out');
    const resetZoomButton = document.getElementById('reset-zoom');

    // Variables de jeu
    let allCountriesData = []; // Stocke tous les pays chargés depuis le CSV
    let currentCountry = null; // Le pays à deviner actuellement
    let score = 0;
    let correctAttempts = 0;
    let incorrectAttempts = 0;
    let countriesToGuessForCurrentGame = []; // Liste des pays restants pour le tour de jeu
    let currentGamemode = "world"; // Pour savoir quel mode rejouer

    // Variables de zoom et panoramique
    let svgMap = null; // Référence à l'élément SVG de la carte
    let originalViewBox = null; // Le viewBox original de la carte SVG
    let currentScale = 1; // Le facteur de zoom actuel
    let currentPanX = 0; // Position X de la vue actuelle
    let currentPanY = 0; // Position Y de la vue actuelle
    let isPanning = false; // Indique si l'utilisateur est en train de déplacer la carte
    let startPanXGlobal, startPanYGlobal; // Coordonnées de départ pour le panoramique
    const ZOOM_FACTOR = 1.2; // Facteur d'augmentation/diminution du zoom

    // --- MAPPING DES PAYS AUX CONTINENTS ---
    // IMPORTANT : VOUS DEVEZ COMPLÉTER CETTE LISTE AVEC TOUS VOS PAYS ET LEURS CONTINENTS.
    // Les codes sont ceux utilisés dans votre map.svg et mapping.csv.
    // J'ai fait un gros travail pour les remplir d'après votre CSV/SVG, mais vérifiez !
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
        "uz": "AS", "vn": "AS", "ye": "AS", "kh": "AS", // Cambodge
        // Europe (EU)
        "al": "EU", "at": "EU", "by": "EU", "be": "EU", "ba": "EU", "bg": "EU", "hr": "EU",
        "cz": "EU", "dk": "EU", "ee": "EU", "fi": "EU", "fr": "EU", "de": "EU", "gr": "EU",
        "hu": "EU", "ie": "EU", "is": "EU", "it": "EU", "lv": "EU", "lt": "EU", "lu": "EU",
        "md": "EU", "me": "EU", "mk": "EU", "nl": "EU", "no": "EU", "pl": "EU", "pt": "EU",
        "ro": "EU", "rs": "EU", "ru": "EU", "si": "EU", "sk": "EU", "es": "EU", "se": "EU",
        "ch": "EU", "ua": "EU", "gb": "EU", "mt": "EU", // Malte
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

            allCountriesData = []; // Réinitialise le tableau avant de le remplir

            // Itère sur les lignes, en sautant l'en-tête (première ligne)
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim(); // Supprime les espaces blancs au début/fin de la ligne

                if (row === "") { // Saute les lignes complètement vides
                    continue;
                }

                // Sépare la ligne par la virgule, nettoie les parties et supprime les guillemets
                const parts = row.split(',').map(part => part.trim().replace(/"/g, ''));

                // Vérifie que la ligne a le bon format (2 parties et non vides)
                if (parts.length === 2 && parts[0] && parts[1]) {
                    const countryCode = parts[0].toLowerCase();
                    allCountriesData.push({
                        code: countryCode,
                        name: parts[1],
                        // Assigne le continent en utilisant le mapping, ou "unknown" si non trouvé
                        continent: countryToContinentMap[countryCode] || "unknown" 
                    });
                } else {
                    // Avertit en cas de ligne mal formée
                    console.warn(`Ligne mal formée ou incomplète ignorée dans mapping.csv (ligne ${i + 1}): "${rows[i]}"`);
                }
            }

            if (allCountriesData.length === 0) {
                console.warn("Aucun pays n'a été chargé depuis le CSV. Vérifiez le format du fichier mapping.csv.");
                feedbackMessage.textContent = "Problème de chargement des données pays. Vérifiez mapping.csv.";
                continentButtons.forEach(btn => btn.disabled = true); // Désactive les boutons si pas de pays
            } else {
                console.log(`${allCountriesData.length} pays chargés avec succès.`);
                // Active tous les boutons de mode de jeu une fois les données chargées
                continentButtons.forEach(btn => btn.disabled = false);
            }

        } catch (error) {
            console.error("Erreur de chargement ou de parsing du CSV:", error);
            feedbackMessage.textContent = "Impossible de charger ou de parser les données des pays.";
            continentButtons.forEach(btn => btn.disabled = true); // Désactive les boutons en cas d'erreur de chargement
        }
    }

    /**
     * Charge la carte SVG et la prépare pour l'interactivité.
     */
    async function loadMap() {
        try {
            const response = await fetch('map.svg');
            const svgText = await response.text();
            mapContainer.innerHTML = svgText; // Injecte le contenu SVG dans le DOM
            svgMap = mapContainer.querySelector('svg');
            svgMap.id = 'world-map-svg'; // Attribue un ID pour le stylage CSS

            // Récupère et parse le viewBox initial du SVG pour les opérations de zoom/pan
            originalViewBox = svgMap.getAttribute('viewBox').split(' ').map(Number);
            currentPanX = originalViewBox[0];
            currentPanY = originalViewBox[1];

            // Attache un écouteur de clic à chaque chemin (représentant un pays) de la carte
            const paths = svgMap.querySelectorAll('path');
            paths.forEach(path => {
                path.addEventListener('click', handleMapClick);
            });
            setupZoomPan(); // Configure les fonctionnalités de zoom et panoramique
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
            event.preventDefault(); // Empêche le défilement de la page lors du zoom
            const factor = event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR; // Détermine le sens du zoom
            const rect = mapContainer.getBoundingClientRect();
            // Calcule la position de la souris relative au conteneur de la carte
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            applyZoom(factor, mouseX, mouseY);
        });

        mapContainer.addEventListener('mousedown', (event) => {
            isPanning = true;
            startPanXGlobal = event.clientX; // Enregistre la position X initiale de la souris
            startPanYGlobal = event.clientY; // Enregistre la position Y initiale de la souris
            mapContainer.style.cursor = 'grabbing'; // Change le curseur pour indiquer que la carte est attrapée
        });

        mapContainer.addEventListener('mousemove', (event) => {
            if (!isPanning) return; // Ne fait rien si le panoramique n'est pas actif
            event.preventDefault();
            // Calcule le déplacement de la souris et l'ajuste à l'échelle de zoom actuelle
            const dx = (event.clientX - startPanXGlobal) / currentScale;
            const dy = (event.clientY - startPanYGlobal) / currentScale;
            
            // Met à jour les coordonnées du panoramique (le déplacement est inverse pour le viewBox)
            currentPanX -= dx;
            currentPanY -= dy;
            
            updateViewBox(); // Applique les nouvelles coordonnées au SVG

            startPanXGlobal = event.clientX; // Met à jour la position de départ pour le prochain déplacement
            startPanYGlobal = event.clientY;
        });

        mapContainer.addEventListener('mouseup', () => {
            isPanning = false;
            mapContainer.style.cursor = 'grab'; // Restaure le curseur par défaut
        });
        mapContainer.addEventListener('mouseleave', () => {
            isPanning = false;
            mapContainer.style.cursor = 'grab'; // Restaure le curseur si la souris quitte la zone de la carte
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
        // Limite les niveaux de zoom pour éviter des échelles extrêmes
        if (newScale < 0.2 || newScale > 20) return; 

        // Si les coordonnées de la souris ne sont pas fournies, zoomer vers le centre de la vue actuelle de la carte
        if (mouseX === null || mouseY === null) {
            const rect = mapContainer.getBoundingClientRect();
            mouseX = rect.width / 2;
            mouseY = rect.height / 2;
        }

        // Calcule le nouvel origine du viewBox pour que le point sous la souris reste fixe après le zoom
        currentPanX = currentPanX + mouseX / currentScale - mouseX / newScale;
        currentPanY = currentPanY + mouseY / currentScale - mouseY / newScale;
        
        currentScale = newScale;
        updateViewBox(); // Applique le nouveau viewBox au SVG
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
        if (!originalViewBox) return; // S'assure que le viewBox original est défini
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
        currentGamemode = mode; // Sauvegarde le mode de jeu actuel pour "Rejouer"
        modeSelection.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameArea.style.display = 'block';
        backToHomeButton.style.display = 'block'; // Affiche le bouton "Accueil"

        score = 0;
        correctAttempts = 0;
        incorrectAttempts = 0;
        updateScoreboard();
        
        // Filtre les pays en fonction du mode de jeu
        if (mode === "world") {
            countriesToGuessForCurrentGame = [...allCountriesData]; // Tous les pays pour le mode "Monde"
        } else {
            // Filtre par continent
            countriesToGuessForCurrentGame = allCountriesData.filter(country => country.continent === mode);
        }

        // Vérifie s'il y a des pays pour le mode sélectionné
        if (countriesToGuessForCurrentGame.length === 0) {
            feedbackMessage.textContent = `Aucun pays trouvé pour le mode ${mode}. Choisissez un autre mode.`;
            console.warn(`Aucun pays trouvé pour le continent: ${mode}. Vérifiez le mapping et les IDs SVG.`);
            // Retourne au menu principal après un court délai si aucun pays n'est disponible
            setTimeout(showMainMenu, 3000);
            return;
        }
        
        shuffleArray(countriesToGuessForCurrentGame); // Mélange les pays pour le jeu
        
        nextCountry(); // Affiche le premier pays à deviner
        resetMapZoomPan(); // Réinitialise la vue de la carte
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
        clearHighlights(); // Efface les mises en évidence de couleur précédentes
        if (countriesToGuessForCurrentGame.length === 0) {
            endGame(); // Si tous les pays ont été devinés, la partie est terminée
            return;
        }
        currentCountry = countriesToGuessForCurrentGame.pop(); // Prend le prochain pays de la liste
        countryNamePrompt.textContent = currentCountry.name;
        // Gère le cas spécial de Somaliland pour le drapeau, sinon utilise le code pays standard
        const flagCode = currentCountry.code === '_somaliland' ? 'so' : currentCountry.code; 
        flagImage.src = `https://flagcdn.com/w160/${flagCode}.png`;
        flagImage.alt = `Drapeau de ${currentCountry.name}`;
        feedbackMessage.textContent = ''; // Efface le message de feedback précédent
        feedbackMessage.className = ''; // Supprime la classe de style du feedback
    }

    /**
     * Gère le clic de l'utilisateur sur la carte pour deviner un pays.
     * @param {MouseEvent} event - L'objet événement de clic.
     */
    function handleMapClick(event) {
        if (!currentCountry || !svgMap) return; // S'assure qu'un pays est à deviner et que la carte est prête

        // Trouve l'élément <path> parent le plus proche du point de clic
        const clickedPath = event.target.closest('path');
        if (!clickedPath) return; // Si le clic n'est pas sur un pays, ne fait rien

        const clickedCountryId = clickedPath.id.toLowerCase(); // Récupère l'ID du pays cliqué
        
        clearHighlights(); // Efface les mises en évidence précédentes

        if (clickedCountryId === currentCountry.code) {
            score += 10;
            correctAttempts++;
            feedbackMessage.textContent = "Correct ! 🎉";
            feedbackMessage.className = 'feedback-correct';
            clickedPath.classList.add('highlight-correct'); // Met en évidence le pays correctement deviné
        } else {
            score -= 5;
            if (score < 0) score = 0; // Le score ne descend pas en dessous de zéro
            incorrectAttempts++;
            // Trouve le nom du pays réellement cliqué pour le message de feedback
            const clickedCountryObj = allCountriesData.find(c => c.code === clickedCountryId);
            const clickedName = clickedCountryObj ? clickedCountryObj.name : "une zone inconnue";
            feedbackMessage.textContent = `Oups ! C'était ${clickedName}. Le pays à trouver était ${currentCountry.name}.`;
            feedbackMessage.className = 'feedback-incorrect';
            clickedPath.classList.add('highlight-incorrect'); // Met en évidence le pays incorrectement cliqué
            
            // Met également en évidence le pays correct (celui qu'il fallait trouver)
            const correctPath = svgMap.querySelector(`path#${currentCountry.code}`);
            if (correctPath) {
                correctPath.classList.add('highlight-correct');
            }
        }
        updateScoreboard(); // Met à jour l'affichage du score
        // Attend un peu avant de passer au pays suivant pour laisser à l'utilisateur le temps de voir le feedback
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
        backToHomeButton.style.display = 'none'; // Cache le bouton "Accueil" sur l'écran de fin
        finalScoreDisplay.textContent = score;
        const totalAttempts = correctAttempts + incorrectAttempts;
        // Calcule la précision, ou 0 si aucune tentative n'a été faite
        const accuracy = totalAttempts > 0 ? ((correctAttempts / totalAttempts) * 100).toFixed(1) : 0;
        accuracyDisplay.textContent = accuracy;
    }

    /**
     * Cache les écrans de jeu/fin de partie et affiche la sélection de mode.
     */
    function showMainMenu() {
        gameArea.style.display = 'none';
        gameOverScreen.style.display = 'none';
        modeSelection.style.display = 'block'; // Affiche l'écran de sélection de mode
        backToHomeButton.style.display = 'none'; // Cache le bouton "Accueil"
        feedbackMessage.textContent = ''; // Efface les messages de feedback restants
        clearHighlights(); // S'assure que la carte est propre
        resetMapZoomPan(); // Réinitialise la vue de la carte
    }


    // --- Écouteurs d'événements ---
    
    // Écouteurs pour les boutons de sélection de mode (Monde, Afrique, etc.)
    continentButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (!e.target.disabled) { // S'assure que le bouton n'est pas désactivé
                 startGame(e.target.dataset.mode); // Démarre le jeu avec le mode correspondant
            }
        });
    });
    
    // Écouteur pour le bouton "Rejouer" sur l'écran de fin de partie
    restartGameButton.addEventListener('click', () => {
        startGame(currentGamemode); // Redémarre le jeu avec le mode qui était en cours
    });

    // Écouteur pour le bouton "Menu Principal" sur l'écran de fin de partie
    mainMenuFromGameOverButton.addEventListener('click', showMainMenu);

    // Écouteur pour le bouton "Accueil" dans l'en-tête (visible pendant le jeu)
    backToHomeButton.addEventListener('click', showMainMenu);


    /**
     * Fonction d'initialisation principale qui charge toutes les ressources nécessaires.
     */
    async function init() {
        await loadCountriesData(); // Charge les données des pays depuis le CSV
        await loadMap(); // Charge la carte SVG
        // L'activation des boutons de sélection de mode se fait automatiquement dans loadCountriesData
        // une fois que les données sont chargées avec succès.
    }

    init(); // Appelle la fonction d'initialisation au démarrage de la page
});
