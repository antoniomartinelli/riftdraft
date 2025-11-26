class DraftManager {
    maxPlayers = 4;
    constructor(peerId, isHost) {
        this.peerId = peerId;
        this.isHost = isHost;
        this.players = [peerId];
        this.connections = new Map();
        
        this.packComposition = {
            random: parseInt(document.getElementById('numRandom').value, 10),
            commons: parseInt(document.getElementById('numCommons').value, 10),
            uncommons: parseInt(document.getElementById('numUncommons').value, 10),
            rares: parseInt(document.getElementById('numRares').value, 10),
            epics: parseInt(document.getElementById('numEpics').value, 10),
            legends: parseInt(document.getElementById('numLegends').value, 10)
        }

        this.cardsPerPack = Object.values(this.packComposition).reduce((a, b) => a + b, 0);

        this.draftState = {
            started: false,
            currentPick: 0,
            currentPack: 0,
            packs: {}, // { playerId: [pack1, pack2, pack3] }
            picks: {}, // { playerId: [cards] }
            packRotation: [] // ordine di rotazione
        };
    }

    addPlayer(playerId, connection) {
        if (!this.players.includes(playerId)) {
            this.players.push(playerId);
            this.connections.set(playerId, connection);
        }
    }

    removePlayer(playerId) {
        const index = this.players.indexOf(playerId);
        if (index > -1) {
            this.players.splice(index, 1);
            this.connections.delete(playerId);
        }
    }

    canStartDraft() {
        return this.players.length === this.maxPlayers && this.isHost;
    }

    // HOST: Genera tutti i pacchetti per il draft
    initializeDraft() {
        if (!this.isHost) return;

        const seed = Date.now();
        this.draftState.started = true;
        this.draftState.currentPick = 0;
        this.draftState.currentPack = 0;
        
        // Genera 3 pacchetti per ogni giocatore
        this.players.forEach((playerId, index) => {
            this.draftState.packs[playerId] = [
                generateBoosterPack(seed + index * 100, this.packComposition),
                generateBoosterPack(seed + index * 100 + 1, this.packComposition),
                generateBoosterPack(seed + index * 100 + 2, this.packComposition)
            ];
            this.draftState.picks[playerId] = [];
        });

        // Ordine di rotazione: ogni giocatore passa al successivo
        this.draftState.packRotation = [...this.players];

        return this.draftState;
    }

    // Ottieni il pacchetto corrente per un giocatore
    getCurrentPack(playerId) {
        const packIndex = this.draftState.currentPack;
        
        // Calculate rotation based on picks within the current pack
        const picksInCurrentPack = this.draftState.currentPick % this.cardsPerPack;
        
        // Determine rotation direction
        // Pack 1 (index 0): Left (positive rotation)
        // Pack 2 (index 1): Right (negative rotation)
        // Pack 3 (index 2): Left (positive rotation)
        let rotation = picksInCurrentPack;
        if (packIndex % 2 === 1) {
            rotation = -picksInCurrentPack;
        }
        
        // Calculate source player index
        const playerIndex = this.players.indexOf(playerId);
        let sourceIndex = (playerIndex - rotation) % this.players.length;
        
        // Handle negative modulo
        if (sourceIndex < 0) {
            sourceIndex += this.players.length;
        }
        
        const sourcePlayer = this.players[sourceIndex];
        
        if (!this.draftState.packs[sourcePlayer]) return [];
        
        const pack = this.draftState.packs[sourcePlayer][packIndex];
        return pack || [];
    }

    getCurrentRotation() {
        return this.draftState.currentPick % this.players.length;
    }

    // Player picks
    pickCard(playerId, cardId) {
        const pack = this.getCurrentPack(playerId);
        const cardIndex = pack.findIndex(c => c.id === cardId);
        
        if (cardIndex === -1) {
            console.error('Card not found in current pack');
            return false;
        }

        const card = pack[cardIndex];

        // Aggiungi la carta alle pick del giocatore
        if (!this.draftState.picks[playerId]) {
            this.draftState.picks[playerId] = [];
        }
        this.draftState.picks[playerId].push(card);

        // Rimuovi la carta dal pacchetto
        pack.splice(cardIndex, 1);

        return true;
    }

    // Tutti hanno pickato, avanza il draft
    advanceDraft() {
        this.draftState.currentPick++;
        
        // Controlla se il pacchetto corrente è finito
        if (this.draftState.currentPick % this.cardsPerPack === 0) {
            this.draftState.currentPack++;
            
            // Draft completato
            if (this.draftState.currentPack >= 3) {
                this.draftState.started = false;
                return { completed: true };
            }
        }

        return { completed: false };
    }

    // Serializza lo stato per sync
    getState() {
        return JSON.parse(JSON.stringify(this.draftState));
    }

    // Ricevi stato da host
    setState(state) {
        this.draftState = state;
    }
}