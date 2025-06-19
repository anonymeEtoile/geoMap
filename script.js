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

    const zoomInButton = document.getElementById('zoom-in');
    const zoomOutButton = document.getElementById('zoom-out');
    const resetZoomButton = document.getElementById('reset-zoom');

    // Variables de jeu
    let countries = []; // Liste de tous les pays chargés depuis le CSV
    let currentCountry = null; // Le pays à deviner actuellement
    let score = 0;
    let correctAttempts = 0;
    let incorrectAttempts = 0;
    let countriesToGuess = []; // Liste des pays restants pour le tour de jeu

    // Variables de zoom et panoramique
    let svgMap = null; // Référence à l'élément SVG de la carte
    let originalViewBox = null; // Le viewBox original de la carte SVG
    let currentScale = 1; // Le facteur de zoom actuel
    let currentPanX = 0; // Position X de la vue actuelle
    let currentPanY = 0; // Position Y de la vue actuelle
    let isPanning = false; // Indique si l'utilisateur est en train de déplacer la carte
    let startPanX, startPanY; // Coordonnées de départ pour le panoramique
    const ZOOM_FACTOR = 1.2; // Facteur d'augmentation/diminution du zoom

    /**
     * Charge les données des pays depuis le fichier mapping.csv.
     * Cette version est plus robuste pour gérer les lignes vides ou mal formées.
     */
    async function loadCountries() {
        try {
            const response = await fetch('mapping.csv');
            // Vérifie si la requête a réussi (statut HTTP 200 OK)
            if (!response.ok) {
                throw new Error(`Erreur HTTP! Statut: ${response.status}`);
            }
            const csvText = await response.text();
            const rows = csvText.split('\n'); // Sépare le texte en lignes

            countries = []; // Réinitialise le tableau des pays

            // Commence à partir de la deuxième ligne pour ignorer l'en-tête (index 0)
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim(); // Supprime les espaces blancs inutiles au début/fin de la ligne

                if (row === "") { // Ignore les lignes complètement vides
                    continue;
                }

                // Sépare la ligne par la virgule et nettoie chaque partie (trim et supprime les guillemets)
                const parts = row.split(',').map(part => part.trim().replace(/"/g, ''));

                // Vérifie que nous avons bien 2 parties (code et nom) et qu'elles ne sont pas vides
                if (parts.length === 2 && parts[0] && parts[1]) {
                    countries.push({
                        code: parts[0].toLowerCase(), // Convertit le code en minuscules
                        name: parts[1]
                    });
                } else {
                    // Affiche un avertissement pour les lignes qui ne correspondent pas au format attendu
                    console.warn(`Ligne mal formée ou incomplète ignorée dans mapping.csv (ligne ${i + 1}): "${rows[i]}"`);
                }
            }

            // Vérifie si des pays ont été chargés
            if (countries.length === 0) {
                console.warn("Aucun pays n'a été chargé depuis le CSV. Vérifiez le format du fichier mapping.csv.");
                feedbackMessage.textContent = "Problème de chargement des données pays. Vérifiez mapping.csv.";
            } else {
                console.log(`${countries.length} pays chargés avec succès.`);
            }

        } catch (error) {
            console.error("Erreur de chargement ou de parsing du CSV:", error);
            feedbackMessage.textContent = "Impossible de charger ou de parser les données des pays.";
        }
    }

    /**
     * Charge la carte SVG et la prépare pour l'interactivité.
     */
    async function loadMap() {
        try {
            const response = await fetch('map.svg');
            const svgText = await response.text();
            mapContainer.innerHTML = svgText; // Injecte le SVG dans le conteneur
            svgMap = mapContainer.querySelector('svg');
            svgMap.id = 'world-map-svg'; // Donne un ID pour le stylage CSS

            // Récupère et parse le viewBox original du SVG
            originalViewBox = svgMap.getAttribute('viewBox').split(' ').map(Number);
            currentPanX = originalViewBox[0];
            currentPanY = originalViewBox[1];

            // Attache les écouteurs d'événements à chaque chemin (pays) de la carte
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
            event.preventDefault(); // Empêche le défilement de la page
            const factor = event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR; // Détermine le facteur de zoom
            const rect = mapContainer.getBoundingClientRect();
            // Calcule la position de la souris par rapport au conteneur de la carte
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;
            applyZoom(factor, mouseX, mouseY);
        });

        mapContainer.addEventListener('mousedown', (event) => {
            isPanning = true;
            startPanX = event.clientX;
            startPanY = event.clientY;
            mapContainer.style.cursor = 'grabbing'; // Change le curseur pour indiquer le glisser
        });

        mapContainer.addEventListener('mousemove', (event) => {
            if (!isPanning) return;
            event.preventDefault();
            // Calcule le déplacement de la souris et l'ajuste à l'échelle actuelle du zoom
            const dx = (event.clientX - startPanX) / currentScale;
            const dy = (event.clientY - startPanY) / currentScale;
            
            // Met à jour les coordonnées du panoramique (le déplacement est inverse)
            currentPanX -= dx;
            currentPanY -= dy;
            
            updateViewBox(); // Applique les nouvelles coordonnées au SVG

            startPanX = event.clientX;
            startPanY = event.clientY;
        });

        mapContainer.addEventListener('mouseup', () => {
            isPanning = false;
            mapContainer.style.cursor = 'grab'; // Restaure le curseur
        });
        mapContainer.addEventListener('mouseleave', () => {
            isPanning = false;
            mapContainer.style.cursor = 'grab'; // Restaure le curseur si la souris quitte le conteneur
        });
    }

    /**
     * Applique un facteur de zoom à la carte.
     * @param {number} factor - Facteur de multiplication (ex: 1.2 pour zoom in, 1/1.2 pour zoom out).
     * @param {number} [mouseX=null] - Coordonnée X de la souris par rapport au conteneur de la carte.
     * @param {number} [mouseY=null] - Coordonnée Y de la souris par rapport au conteneur de la carte.
     */
    function applyZoom(factor, mouseX = null, mouseY = null) {
        const newScale = currentScale * factor;
        
        // Optionnel: Limiter les niveaux de zoom si nécessaire
        // if (newScale < 0.5 || newScale > 10) return;

        // Si les coordonnées de la souris ne sont pas fournies, zoomer vers le centre de la vue actuelle
        if (mouseX === null || mouseY === null) {
            const rect = mapContainer.getBoundingClientRect();
            mouseX = rect.width / 2;
            mouseY = rect.height / 2;
        }

        // Calculer le nouvel origine du viewBox pour zoomer vers le point de la souris
        currentPanX = currentPanX + mouseX / currentScale - mouseX / newScale;
        currentPanY = currentPanY + mouseY / currentScale - mouseY / newScale;
        
        currentScale = newScale;
        updateViewBox(); // Applique le nouveau viewBox
    }
    
    /**
     * Met à jour l'attribut viewBox de la carte SVG.
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
        currentScale = 1;
        currentPanX = originalViewBox[0];
        currentPanY = originalViewBox[1];
        updateViewBox();
    }

    /**
     * Démarre une nouvelle partie du jeu.
     * @param {string} mode - Le mode de jeu sélectionné (ex: "world").
     */
    function startGame(mode) {
        modeSelection.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameArea.style.display = 'block';

        score = 0;
        correctAttempts = 0;
        incorrectAttempts = 0;
        updateScoreboard();
        
        // TODO: Implémenter le filtrage par continent si les données sont disponibles.
        // Pour l'instant, le mode "world" utilise tous les pays.
        countriesToGuess = [...countries]; // Crée une copie superficielle du tableau
        shuffleArray(countriesToGuess); // Mélange les pays
        
        nextCountry(); // Passe au premier pays à deviner
        resetMapZoomPan(); // Réinitialise la vue de la carte au début de chaque partie
    }

    /**
     * Mélange un tableau en place (algorithme de Fisher-Yates).
     * @param {Array} array - Le tableau à mélanger.
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Affiche le prochain pays à deviner.
     */
    function nextCountry() {
        clearHighlights(); // Efface les mises en évidence précédentes
        if (countriesToGuess.length === 0) {
            endGame(); // Si plus de pays, la partie est terminée
            return;
        }
        currentCountry = countriesToGuess.pop(); // Prend le dernier pays du tableau mélangé
        countryNamePrompt.textContent = currentCountry.name;
        // Utilise flagcdn.com pour les drapeaux. Cas spécial pour Somaliland.
        const flagCode = currentCountry.code === '_somaliland' ? 'so' : currentCountry.code; // Utilise le drapeau de la Somalie pour Somaliland
        flagImage.src = `https://flagcdn.com/w160/${flagCode}.png`;
        flagImage.alt = `Drapeau de ${currentCountry.name}`;
        feedbackMessage.textContent = ''; // Efface le message de feedback
        feedbackMessage.className = ''; // Efface la classe de style du feedback
    }

    /**
     * Gère le clic sur un pays de la carte.
     * @param {MouseEvent} event - L'événement de clic.
     */
    function handleMapClick(event) {
        if (!currentCountry || !svgMap) return; // S'assure qu'un pays est à deviner et que la carte est chargée

        // Trouve l'élément path le plus proche (le pays cliqué)
        const clickedPath = event.target.closest('path');
        if (!clickedPath) return; // Si le clic n'était pas sur un pays

        const clickedCountryId = clickedPath.id.toLowerCase(); // Récupère l'ID du pays cliqué
        
        clearHighlights(); // Efface les mises en évidence précédentes

        if (clickedCountryId === currentCountry.code) {
            score += 10;
            correctAttempts++;
            feedbackMessage.textContent = "Correct ! 🎉";
            feedbackMessage.className = 'feedback-correct';
            clickedPath.classList.add('highlight-correct'); // Met en évidence le pays correct
        } else {
            score -= 5;
            if (score < 0) score = 0; // Le score ne peut pas être négatif
            incorrectAttempts++;
            // Trouve le nom du pays cliqué pour le message de feedback
            const clickedCountryObj = countries.find(c => c.code === clickedCountryId);
            const clickedName = clickedCountryObj ? clickedCountryObj.name : "une zone inconnue";
            feedbackMessage.textContent = `Oups ! C'était ${clickedName}. Le pays à trouver était ${currentCountry.name}.`;
            feedbackMessage.className = 'feedback-incorrect';
            clickedPath.classList.add('highlight-incorrect'); // Met en évidence le pays incorrect
            
            // Met en évidence le pays correct (celui qu'il fallait trouver)
            const correctPath = svgMap.querySelector(`path#${currentCountry.code}`);
            if (correctPath) {
                correctPath.classList.add('highlight-correct');
            }
        }
        updateScoreboard(); // Met à jour l'affichage du score
        // Attend un peu avant de passer au pays suivant pour que l'utilisateur voie le feedback
        setTimeout(nextCountry, 2500); 
    }
    
    /**
     * Efface toutes les mises en évidence de couleur sur la carte.
     */
    function clearHighlights() {
        if (!svgMap) return;
        svgMap.querySelectorAll('path.highlight-correct, path.highlight-incorrect').forEach(p => {
            p.classList.remove('highlight-correct', 'highlight-incorrect');
        });
    }

    /**
     * Met à jour l'affichage du score et des tentatives.
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
        finalScoreDisplay.textContent = score;
        const totalAttempts = correctAttempts + incorrectAttempts;
        const accuracy = totalAttempts > 0 ? ((correctAttempts / totalAttempts) * 100).toFixed(1) : 0;
        accuracyDisplay.textContent = accuracy;
    }

    // Écouteurs d'événements pour les boutons de sélection de mode
    continentButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (!e.target.disabled) {
                 startGame(e.target.dataset.mode);
            }
        });
    });
    
    // Écouteur d'événement pour le bouton "Rejouer"
    restartGameButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        modeSelection.style.display = 'block'; // Retourne à la sélection de mode
    });

    /**
     * Initialise l'application en chargeant les données des pays et la carte.
     */
    async function init() {
        await loadCountries(); // Attend le chargement des pays
        await loadMap(); // Attend le chargement de la carte
        // Active le bouton "Monde Entier" une fois que les données sont chargées et la carte prête
        const worldButton = document.querySelector('.continent-buttons button[data-mode="world"]');
        if (worldButton) worldButton.disabled = false;
    }

    init(); // Appelle la fonction d'initialisation au démarrage
});
