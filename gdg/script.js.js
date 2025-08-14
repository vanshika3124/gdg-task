document.addEventListener('DOMContentLoaded', () => {
    const playerCardEl = document.getElementById('player-card');
    const cpuCardEl = document.getElementById('cpu-card');
    const battleBtn = document.getElementById('battle-btn');
    const nextRoundBtn = document.getElementById('next-round-btn');
    const messageArea = document.getElementById('message-area');
    const playerScoreEl = document.getElementById('player-score');
    const cpuScoreEl = document.getElementById('cpu-score');
    const searchInput = document.getElementById('pokemon-search');
    const suggestionsBox = document.getElementById('suggestions-box');
    const winnerModal = document.getElementById('winner-modal');
    const modalWinnerText = document.getElementById('modal-winner-text');
    const newGameBtn = document.getElementById('new-game-btn');

    let playerPokemon, cpuPokemon;
    let pokemonList = [];
    let score = { player: 0, cpu: 0 };
    let roundState = { playerWins: 0, cpuWins: 0, round: 1 };
    let isBattleInProgress = false;

    const API_URL = 'https://pokeapi.co/api/v2/pokemon/';

    async function fetchPokemon(idOrName) {
        try {
            const response = await fetch(`${API_URL}${idOrName}`);
            if (!response.ok) throw new Error('Pokemon not found.');
            const data = await response.json();
            return {
                name: data.name,
                image: data.sprites.front_default || 'https://via.placeholder.com/150',
                stats: {
                    attack: data.stats.find(s => s.stat.name === 'attack').base_stat,
                    defense: data.stats.find(s => s.stat.name === 'defense').base_stat,
                    speed: data.stats.find(s => s.stat.name === 'speed').base_stat,
                }
            };
        } catch (error) {
            console.error("Error fetching Pokemon:", error);
            messageArea.textContent = 'Fetch error!';
            return null;
        }
    }

    async function fetchAllPokemonNames() {
        try {
            const response = await fetch(`${API_URL}?limit=1000`);
            const data = await response.json();
            pokemonList = data.results.map(p => p.name);
        } catch (error) {
            console.error("Could not pre-fetch Pokemon list:", error);
        }
    }

    function renderPokemon(pokemon, element, role) {
        element.innerHTML = `
        <div class="role-indicator">${role}</div>
        <div class="round-wins" id="${role.toLowerCase()}-round-wins"></div>
        <img src="${pokemon.image}" alt="${pokemon.name}">
        <h3>${pokemon.name}</h3>
        <div class="stats">
            <p class="attack"><strong>Attack:</strong> ${pokemon.stats.attack}</p>
            <p class="defense"><strong>Defense:</strong> ${pokemon.stats.defense}</p>
            <p class="speed"><strong>Speed:</strong> ${pokemon.stats.speed}</p>
        </div>
        `;
    }

    function updateScoreboard() {
        playerScoreEl.textContent = score.player;
        cpuScoreEl.textContent = score.cpu;
    }

    function updateRoundWinsUI() {
        const playerWinsEl = document.getElementById('player-round-wins');
        const cpuWinsEl = document.getElementById('cpu-round-wins');
        if (playerWinsEl) playerWinsEl.textContent = '🏆'.repeat(roundState.playerWins);
        if (cpuWinsEl) cpuWinsEl.textContent = '🏆'.repeat(roundState.cpuWins);
    }

    function showModal(winnerText) {
        modalWinnerText.textContent = winnerText;
        winnerModal.style.display = 'flex';
    }

    function hideModal() {
        winnerModal.style.display = 'none';
    }

    function saveScore() {
        localStorage.setItem('pokeBattleScore', JSON.stringify(score));
    }
    
    function loadScore() {
        const savedScore = localStorage.getItem('pokeBattleScore');
        if (savedScore) {
            score = JSON.parse(savedScore);
        }
        updateScoreboard();
    }

    async function startNewGame() {
        isBattleInProgress = true;
        hideModal();
        messageArea.textContent = 'GET READY!';
        battleBtn.style.display = 'block';
        nextRoundBtn.style.display = 'none';

        roundState = { playerWins: 0, cpuWins: 0, round: 1 };

        const playerPromise = playerPokemon ? Promise.resolve(playerPokemon) : fetchPokemon(Math.floor(Math.random() * 898) + 1);
        const cpuPromise = fetchPokemon(Math.floor(Math.random() * 898) + 1);

        const [p1, p2] = await Promise.all([playerPromise, cpuPromise]);

        playerPokemon = p1;
        cpuPokemon = p2;

        renderPokemon(playerPokemon, playerCardEl, 'PLAYER');
        renderPokemon(cpuPokemon, cpuCardEl, 'CPU');
        updateRoundWinsUI();

        messageArea.textContent = `ROUND ${roundState.round}!`;
        isBattleInProgress = false;
    }

    function battle() {
        if (isBattleInProgress || !playerPokemon || !cpuPokemon) return;
        isBattleInProgress = true;

        messageArea.textContent = 'BATTLING...';
        battleBtn.style.display = 'none';

        playerCardEl.classList.add('shake');
        cpuCardEl.classList.add('shake');

        setTimeout(() => {
            playerCardEl.classList.remove('shake');
            cpuCardEl.classList.remove('shake');

            let roundPlayerScore = 0;
            let roundCpuScore = 0;

            playerCardEl.querySelectorAll('.stats p').forEach(p => p.classList.remove('winner', 'loser'));
            cpuCardEl.querySelectorAll('.stats p').forEach(p => p.classList.remove('winner', 'loser'));

            ['attack', 'defense', 'speed'].forEach(stat => {
                const playerStatEl = playerCardEl.querySelector(`.stats .${stat}`);
                const cpuStatEl = cpuCardEl.querySelector(`.stats .${stat}`);

                if (playerPokemon.stats[stat] > cpuPokemon.stats[stat]) {
                    roundPlayerScore++;
                    playerStatEl.classList.add('winner');
                    cpuStatEl.classList.add('loser');
                } else if (cpuPokemon.stats[stat] > playerPokemon.stats[stat]) {
                    roundCpuScore++;
                    cpuStatEl.classList.add('winner');
                    playerStatEl.classList.add('loser');
                }
            });

            if (roundPlayerScore > roundCpuScore) {
                roundState.playerWins++;
                messageArea.textContent = 'PLAYER WINS ROUND!';
            } else if (roundCpuScore > roundPlayerScore) {
                roundState.cpuWins++;
                messageArea.textContent = 'CPU WINS ROUND!';
            } else {
                messageArea.textContent = 'ROUND DRAW!';
            }
            updateRoundWinsUI();

            if (roundState.playerWins >= 2 || roundState.cpuWins >= 2) {
                endMatch();
            } else {
                roundState.round++;
                nextRoundBtn.style.display = 'block';
            }

            isBattleInProgress = false;
        }, 1500);
    }

    function endMatch() {
        let winnerText = '';
        if (roundState.playerWins >= 2) {
            winnerText = 'PLAYER WINS THE MATCH!';
            score.player++;
        } else {
            winnerText = 'CPU WINS THE MATCH!';
            score.cpu++;
        }
        updateScoreboard();
        saveScore();

        setTimeout(() => showModal(winnerText), 1000);
    }

    async function nextRound() {
        if (isBattleInProgress) return;
        isBattleInProgress = true;
        battleBtn.style.display = 'block';
        nextRoundBtn.style.display = 'none';
        messageArea.textContent = 'GET READY!';

        // Only fetch a new CPU Pokemon
        const newCpuPokemon = await fetchPokemon(Math.floor(Math.random() * 898) + 1);
        cpuPokemon = newCpuPokemon;
        renderPokemon(cpuPokemon, cpuCardEl, 'CPU');
        
        // Reset player card visuals without changing the pokemon
        renderPokemon(playerPokemon, playerCardEl, 'PLAYER');
        updateRoundWinsUI();

        messageArea.textContent = `ROUND ${roundState.round}!`;
        isBattleInProgress = false;
    }

    function showSuggestions(filteredList) {
        if (filteredList.length === 0) {
            suggestionsBox.innerHTML = '';
            return;
        }
        const html = filteredList.map(p => `<div class="suggestion-item">${p}</div>`).join('');
        suggestionsBox.innerHTML = html;

        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', async () => {
                searchInput.value = item.textContent;
                suggestionsBox.innerHTML = '';
                const chosenPokemon = await fetchPokemon(searchInput.value);
                if (chosenPokemon) {
                    playerPokemon = chosenPokemon;
                    startNewGame();
                }
            });
        });
    }

    searchInput.addEventListener('input', () => {
        if (searchInput.value.length < 2) {
            suggestionsBox.innerHTML = '';
            return;
        }
        const filtered = pokemonList.filter(p => p.startsWith(searchInput.value.toLowerCase()));
        showSuggestions(filtered.slice(0, 10));
    });
    
    battleBtn.addEventListener('click', battle);

    nextRoundBtn.addEventListener('click', nextRound);

    newGameBtn.addEventListener('click', () => {
        playerPokemon = null; 
        searchInput.value = '';
        startNewGame();
    });

    function init() {
        loadScore();
        fetchAllPokemonNames();
        startNewGame();
    }

    init();
});