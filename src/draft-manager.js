class DraftManager {
    maxPlayers = 1;
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
        const pickNumber = this.draftState.currentPick % this.cardsPerPack;
        const rotations = Math.floor(this.draftState.currentPick / this.cardsPerPack) * 
                         this.draftState.packRotation.length + 
                         this.getCurrentRotation();
        
        // Calcola da quale giocatore proviene il pacchetto
        const playerIndex = this.players.indexOf(playerId);
        const sourceIndex = (playerIndex - rotations) % this.players.length;
        const sourcePlayer = this.players[sourceIndex < 0 ? sourceIndex + this.players.length : sourceIndex];
        
        const pack = this.draftState.packs[sourcePlayer][packIndex];
        return pack ? pack.slice(pickNumber) : [];
    }

    getCurrentRotation() {
        return Math.floor(this.draftState.currentPick / this.players.length) % this.players.length;
    }

    // Player picks
    pickCard(playerId, cardId) {
        const pack = this.getCurrentPack(playerId);
        const card = pack.find(c => c.id === cardId);
        
        if (!card) {
            console.error('Card not found in current pack');
            return false;
        }

        // Aggiungi la carta alle pick del giocatore
        if (!this.draftState.picks[playerId]) {
            this.draftState.picks[playerId] = [];
        }
        this.draftState.picks[playerId].push(card);

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