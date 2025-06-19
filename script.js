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
    const backToHomeButton = document.getElementById('back-to-home'); // Nouveau bouton

    const zoomInButton = document.getElementById('zoom-in');
    const zoomOutButton = document.getElementById('zoom-out');
    const resetZoomButton = document.getElementById('reset-zoom');

    // Variables de jeu
    let allCountriesData = []; // Stocke tous les pays chargés
    let currentCountry = null;
    let score = 0;
    let correctAttempts = 0;
    let incorrectAttempts = 0;
    let countriesToGuessForCurrentGame = [];
    let currentGamemode = "world"; // Pour savoir quel mode rejouer

    // Variables de zoom et panoramique (inchangées)
    let svgMap = null;
    let originalViewBox = null;
    let currentScale = 1;
    let currentPanX = 0;
    let currentPanY = 0;
    let isPanning = false;
    let startPanXGlobal, startPanYGlobal; // Renommé pour éviter conflit de portée
    const ZOOM_FACTOR = 1.2;

    // --- MAPPING DES PAYS AUX CONTINENTS ---
    // IMPORTANT : Vous devez compléter cette liste avec TOUS vos pays et leurs continents.
    // Utilisez les codes pays de votre mapping.csv
    const countryToContinentMap = {
        // Afrique (AF)
        "dz": "AF", "ao": "AF", "bj": "AF", "bw": "AF", "bf": "AF", "bi": "AF", 
        "cm": "AF", "cf": "AF", "td": "AF", "km": "AF", "cg": "AF", "cd": "AF", 
        "ci": "AF", "dj": "AF", "eg": "AF", "gq": "AF", "er": "AF", "et": "AF", 
        "ga": "AF", "gm": "AF", "gh": "AF", "gn": "AF", "gw": "AF", "ke": "AF", 
        "ls": "AF", "lr": "AF", "ly": "AF", "mg": "AF", "mw": "AF", "ml": "AF", 
        "mr": "AF", "mu": "AF", "ma": "AF", "mz": "AF", "na": "AF", "ne": "AF", 
        "ng": "AF", "rw": "AF", "st": "AF", "sn": "AF", "sc": "AF", "sl": "AF", 
        "so": "AF", "_somaliland": "AF", "za": "AF", "ss": "AF", "sd": "AF", 
        "sz": "AF", "tz": "AF", "tg": "AF", "tn": "AF", "ug": "AF", "eh": "AF", 
        "zm": "AF", "zw": "AF",
        // Asie (AS)
        "af": "AS", "am": "AS", "az": "AS", "bh": "AS", "bd": "AS", "bt": "AS", 
        "bn": "AS", "kh": "AS", "cn": "AS", "cy": "AS", "ge": "AS", "in": "AS", 
        "id": "AS", "ir": "AS", "iq": "AS", "il": "AS", "jp": "AS", "jo": "AS", 
        "kz": "AS", "kw": "AS", "kg": "AS", "la": "AS", "lb": "AS", "my": "AS", 
        "mv": "AS", "mn": "AS", "mm": "AS", "np": "AS", "kp": "AS", "om": "AS", 
        "pk": "AS", "ps": "AS", "ph": "AS", "qa": "AS", "sa": "AS", "sg": "AS", 
        "kr": "AS", "lk": "AS", "sy": "AS", "tw": "AS", "tj": "AS", "th": "AS", 
        "tl": "AS", "tr": "AS", "tm": "AS", "ae": "AS", "uz": "AS", "vn": "AS", "ye": "AS",
        // Europe (EU)
        "al": "EU", "ad": "EU", "at": "EU", "by": "EU", "be": "EU", "ba": "EU", 
        "bg": "EU", "hr": "EU", "cz": "EU", "dk": "EU", "ee": "EU", "fi": "EU", 
        "fr": "EU", "de": "EU", "gr": "EU", "hu": "EU", "is": "EU", "ie": "EU", 
        "it": "EU", "lv": "EU", "li": "EU", "lt": "EU", "lu": "EU", "mk": "EU", 
        "mt": "EU", "md": "EU", "mc": "EU", "me": "EU", "nl": "EU", "no": "EU", 
        "pl": "EU", "pt": "EU", "ro": "EU", "ru": "EU", "sm": "EU", "rs": "EU", 
        "sk": "EU", "si": "EU", "es": "EU", "se": "EU", "ch": "EU", "ua": "EU", 
        "gb": "EU", "va": "EU", // Vatican City, si vous l'ajoutez
        // Amérique du Nord (NA)
        "ag": "NA", "bs": "NA", "bb": "NA", "bz": "NA", "ca": "NA", "cr": "NA", 
        "cu": "NA", "dm": "NA", "do": "NA", "sv": "NA", "gd": "NA", "gt": "NA", 
        "ht": "NA", "hn": "NA", "jm": "NA", "mx": "NA", "ni": "NA", "pa": "NA", 
        "kn": "NA", "lc": "NA", "vc": "NA", "tt": "NA", "us": "NA", "gl": "NA", // Greenland
        "pr": "NA", // Puerto Rico
        // Amérique du Sud (SA)
        "ar": "SA", "bo": "SA", "br": "SA", "cl": "SA", "co": "SA", "ec": "SA", 
        "fk": "SA", "gy": "SA", "py": "SA", "pe": "SA", "sr": "SA", "uy": "SA", "ve": "SA",
        // Océanie (OC)
        "au": "OC", "fj": "OC", "ki": "OC", "mh": "OC", "fm": "OC", "nr": "OC", 
        "nz": "OC", "pw": "OC", "pg": "OC", "sb": "OC", "to": "OC", "tv": "OC", 
        "vu": "OC", "ws": "OC", "nc": "OC", // New Caledonia
        "tf": "OC", // Fr. S. Antarctic Lands - souvent classé avec Océanie ou Antarctique
        // Note: Certains territoires comme Falkland (fk), Greenland (gl), Puerto Rico (pr), New Caledonia (nc), Fr. S. Antarctic Lands (tf)
        // ont des affiliations continentales qui peuvent varier. J'ai fait des choix courants.
    };
    // --- FIN MAPPING CONTINENTS ---


    async function loadCountriesData() { // Renommée pour éviter confusion
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
                        continent: countryToContinentMap[countryCode] || "unknown" // Ajoute le continent
                    });
                } else {
                    console.warn(`Ligne mal formée ou incomplète ignorée dans mapping.csv (ligne ${i + 1}): "${rows[i]}"`);
                }
            }

            if (allCountriesData.length === 0) {
                console.warn("Aucun pays n'a été chargé depuis le CSV.");
                feedbackMessage.textContent = "Problème de chargement des données pays.";
            } else {
                console.log(`${allCountriesData.length} pays chargés avec succès.`);
                // Active les boutons de mode de jeu une fois les données chargées
                continentButtons.forEach(btn => btn.disabled = false);
            }
        } catch (error) {
            console.error("Erreur de chargement ou de parsing du CSV:", error);
            feedbackMessage.textContent = "Impossible de charger ou de parser les données des pays.";
            continentButtons.forEach(btn => btn.disabled = true); // Garde les boutons désactivés en cas d'erreur
        }
    }

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
            startPanXGlobal = event.clientX; // Utilise la variable globale renommée
            startPanYGlobal = event.clientY; // Utilise la variable globale renommée
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

    function applyZoom(factor, mouseX = null, mouseY = null) {
        const newScale = currentScale * factor;
        if (newScale < 0.2 || newScale > 20) return; // Limite le zoom pour éviter les problèmes

        if (mouseX === null) {
            const rect = mapContainer.getBoundingClientRect();
            mouseX = rect.width / 2;
            mouseY = rect.height / 2;
        }

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
        if (!originalViewBox) return; // S'assurer que originalViewBox est défini
        currentScale = 1;
        currentPanX = originalViewBox[0];
        currentPanY = originalViewBox[1];
        updateViewBox();
    }

    function startGame(mode) {
        currentGamemode = mode; // Sauvegarde le mode actuel
        modeSelection.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameArea.style.display = 'block';
        backToHomeButton.style.display = 'block'; // Affiche le bouton retour

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
            // Optionnel: retourner au menu principal après un délai
            setTimeout(showMainMenu, 3000);
            return;
        }
        
        shuffleArray(countriesToGuessForCurrentGame);
        
        nextCountry();
        resetMapZoomPan();
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

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
        backToHomeButton.style.display = 'none'; // Cache le bouton retour sur l'écran de fin
        finalScoreDisplay.textContent = score;
        const totalAttempts = correctAttempts + incorrectAttempts;
        const accuracy = totalAttempts > 0 ? ((correctAttempts / totalAttempts) * 100).toFixed(1) : 0;
        accuracyDisplay.textContent = accuracy;
    }

    function showMainMenu() {
        gameArea.style.display = 'none';
        gameOverScreen.style.display = 'none';
        modeSelection.style.display = 'block';
        backToHomeButton.style.display = 'none';
        feedbackMessage.textContent = ''; // Clear any leftover messages
    }


    // Event listeners
    continentButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (!e.target.disabled) {
                 startGame(e.target.dataset.mode);
            }
        });
    });
    
    restartGameButton.addEventListener('click', () => {
        // Redémarre le jeu avec le même mode que précédemment
        startGame(currentGamemode);
    });

    mainMenuFromGameOverButton.addEventListener('click', showMainMenu);
    backToHomeButton.addEventListener('click', showMainMenu);


    async function init() {
        await loadCountriesData(); // Renommé pour clarté
        await loadMap();
        // Les boutons sont activés dans loadCountriesData après chargement réussi
    }

    init();
});
