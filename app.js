let peer = null;
let draftManager = null;
let myPeerId = null;
let isHost = false;
let currentPick = null;
let waitingForOthers = false;

// Init
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('createRoom').addEventListener('click', createRoom);
    document.getElementById('joinRoom').addEventListener('click', joinRoom);
    document.getElementById('startDraft').addEventListener('click', startDraft);
    document.getElementById('exportDeck').addEventListener('click', exportDeck);
    document.getElementById('newDraft').addEventListener('click', () => location.reload());
});

document.addEventListener('DOMContentLoaded', () => {
    const collapsibleHeader = document.querySelector('.collapsible-header');
    const collapsibleContent = document.querySelector('.collapsible-content');
    const toggleIcon = document.querySelector('.toggle-icon');

    if (collapsibleHeader) {
        collapsibleHeader.addEventListener('click', () => {
            collapsibleContent.classList.toggle('collapsed');
            toggleIcon.classList.toggle('collapsed');
        });
    }
});

function createRoom() {
    peer = new Peer();
    
    peer.on('open', (id) => {
        myPeerId = id;
        isHost = true;
        draftManager = new DraftManager(id, true);
        
        document.getElementById('displayRoomId').textContent = id;
        document.getElementById('roomInfo').style.display = 'block';
        document.getElementById('createRoom').disabled = true;
        
        updatePlayerList();
        showStatus('Room created! Share the ID with other players.');
    });

    peer.on('connection', handleIncomingConnection);
    peer.on('error', (err) => showStatus('Error: ' + err, 'error'));
}

function joinRoom() {
    const roomId = document.getElementById('roomId').value.trim();
    if (!roomId) {
        showStatus('Inserisci un ID stanza valido', 'error');
        return;
    }

    peer = new Peer();
    
    peer.on('open', (id) => {
        myPeerId = id;
        isHost = false;
        draftManager = new DraftManager(id, false);
        
        const conn = peer.connect(roomId);
        setupConnection(conn, roomId);
        
        showStatus('Connessione in corso...');
    });

    peer.on('connection', handleIncomingConnection);
    peer.on('error', (err) => showStatus('Errore: ' + err, 'error'));
}

function handleIncomingConnection(conn) {
    setupConnection(conn, conn.peer);
}

function setupConnection(conn, peerId) {
    conn.on('open', () => {
        draftManager.addPlayer(peerId, conn);
        
        // Invia il tuo ID e richiedi la lista giocatori
        conn.send({
            type: 'join',
            playerId: myPeerId,
            players: draftManager.players
        });

        updatePlayerList();
        showStatus(`Connesso a ${peerId}`);
    });

    conn.on('data', (data) => handleMessage(data, conn));
    
    conn.on('close', () => {
        draftManager.removePlayer(peerId);
        updatePlayerList();
        showStatus(`${peerId} si è disconnesso`, 'warning');
    });
}

function handleMessage(data, conn) {
    switch(data.type) {
        case 'join':
            // Nuovo giocatore si unisce
            data.players.forEach(p => {
                if (!draftManager.players.includes(p) && p !== myPeerId) {
                    // Connetti agli altri peer
                    if (p !== data.playerId) {
                        const newConn = peer.connect(p);
                        setupConnection(newConn, p);
                    }
                }
            });
            draftManager.addPlayer(data.playerId, conn);
            updatePlayerList();
            broadcastPlayerList();
            break;

        case 'playerList':
            // Aggiorna lista giocatori
            data.players.forEach(p => {
                if (!draftManager.players.includes(p)) {
                    draftManager.addPlayer(p, null);
                }
            });
            updatePlayerList();
            break;

        case 'startDraft':
            // Host ha iniziato il draft
            draftManager.setState(data.state);
            showDraftScreen();
            renderCurrentPack();
            break;

        case 'pick':
            // Un giocatore ha fatto un pick
            handlePlayerPick(data.playerId, data.cardId);
            break;

        case 'advance':
            // Avanza al prossimo pick
            draftManager.setState(data.state);
            renderCurrentPack();
            break;
    }
}

function updatePlayerList() {
    const playerList = document.getElementById('playerList');
    const playerCount = document.getElementById('playerCount');
    
    playerList.innerHTML = '';
    draftManager.players.forEach((p, i) => {
        const li = document.createElement('li');
        li.textContent = `Player ${i + 1}${p === myPeerId ? ' (Tu)' : ''}${i === 0 ? ' (Host)' : ''}`;
        playerList.appendChild(li);
    });
    
    playerCount.textContent = draftManager.players.length;
    
    // Mostra bottone start se siamo in 4 e siamo host
    if (draftManager.canStartDraft()) {
        document.getElementById('startDraft').style.display = 'block';
    }
}

function broadcastPlayerList() {
    broadcast({
        type: 'playerList',
        players: draftManager.players
    });
}

function startDraft() {
    if (!draftManager.canStartDraft()) return;
    
    const state = draftManager.initializeDraft();
    
    // Invia stato iniziale a tutti
    broadcast({
        type: 'startDraft',
        state: state
    });
    
    showDraftScreen();
    renderCurrentPack();
}

let preview;
function showDraftScreen() {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('draftScreen').style.display = 'block';
    preview = document.getElementById('card-image-preview');

    document.addEventListener('mousemove', (e) => {
    if (preview.classList.contains('active')) {
        const offset = 20; // Offset from cursor
        const x = e.clientX + offset;
        const y = e.clientY + offset;
        
        // Adjust position if preview would go off-screen
        const previewRect = preview.getBoundingClientRect();
        const adjustedX = (x + previewRect.width > window.innerWidth) 
            ? e.clientX - previewRect.width - offset 
            : x;
        const adjustedY = (y + previewRect.height > window.innerHeight) 
            ? e.clientY - previewRect.height - offset 
            : y;
        
        preview.style.left = adjustedX + 'px';
        preview.style.top = adjustedY + 'px';
        }
    });
}

function attachImagePreviewListeners() {
    document.querySelectorAll('.card-image').forEach(img => {
        img.addEventListener('mouseenter', (e) => {
            preview.src = e.target.src;
            preview.classList.add('active');
        });
        
        img.addEventListener('mouseleave', () => {
            preview.classList.remove('active');
        });
    });
}

function renderCurrentPack() {
    const pack = draftManager.getCurrentPack(myPeerId);
    const packGrid = document.getElementById('currentPack');
    
    packGrid.innerHTML = '';
    
    if (waitingForOthers) {
        packGrid.innerHTML = '<p class="waiting">Waiting for other players...</p>';
        return;
    }
    
    pack.forEach(card => {
        const cardEl = createCardElement(card);
        cardEl.addEventListener('click', () => pickCard(card));
        packGrid.appendChild(cardEl);
    });
    
    // Aggiorna contatori
    document.getElementById('pickNumber').textContent = (draftManager.draftState.currentPick + 1) % draftManager.cardsPerPack;
    document.getElementById('packNumber').textContent = draftManager.draftState.currentPack + 1;
    document.getElementById('pickedCount').textContent = draftManager.draftState.picks[myPeerId]?.length || 0;
}

function createCardElement(card) {
    const div = document.createElement('div');
    div.className = `card ${card.rarity.id} ${card.domains[0].id}`;
    // ?auto=format&fit=fill&q=80&w=352
    div.innerHTML = `
        <img class="card-image" src="${card.cardImage.url}?auto=format&fit=fill&q=80&w=352" >
        <div class="card-name">${card.name}</div>
        <div class="card-type">${card.cardType.map(type => type.label).join(', ')}</div>
    `;
    const img = div.querySelector('.card-image');
    img.addEventListener('mouseenter', (e) => {
        preview.src = e.target.src;
        preview.classList.add('active');
    });
    
    img.addEventListener('mouseleave', () => {
        preview.classList.remove('active');
    });
    // <div class="card-rarity">${card.rarity.id}</div>
    // <div class="card-header">${card.id}</div>
 
    return div;
}

function pickCard(card) {
    if (waitingForOthers) return;
    
    currentPick = card.id;
    draftManager.pickCard(myPeerId, card.id);
    
    // Notifica il pick
    broadcast({
        type: 'pick',
        playerId: myPeerId,
        cardId: card.id
    });
    
    // Aggiungi alla collezione
    renderPickedCards();
    
    // Attendi gli altri
    waitingForOthers = true;
    renderCurrentPack();
    
    checkAllPlayersPicked();
}

function handlePlayerPick(playerId, cardId) {
    draftManager.pickCard(playerId, cardId);
    checkAllPlayersPicked();
}

function checkAllPlayersPicked() {
    const allPicked = draftManager.players.every(p => 
        draftManager.draftState.picks[p]?.length === 
        draftManager.draftState.picks[myPeerId]?.length
    );
    
    if (allPicked && isHost) {
        // Host avanza il draft
        const result = draftManager.advanceDraft();
        
        if (result.completed) {
            showResults();
        } else {
            const newState = draftManager.getState();
            broadcast({
                type: 'advance',
                state: newState
            });
            
            waitingForOthers = false;
            renderCurrentPack();
        }
    } else if (allPicked && !isHost) {
        waitingForOthers = false;
    }
}

function renderPickedCards() {
    const picks = draftManager.draftState.picks[myPeerId] || [];
    const container = document.getElementById('pickedCards');
    
    container.innerHTML = '';
    picks.forEach(card => {
        const cardEl = createCardElement(card);
        cardEl.classList.add('small');
        container.appendChild(cardEl);
    });
}

function showResults() {
    document.getElementById('draftScreen').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';
    
    renderPickedCards();
}

function exportDeck() {
    const picks = draftManager.draftState.picks[myPeerId];
    const deckList = picks.map(c => `${c.id} - ${c.name}`).join('\n');
    
    const blob = new Blob([deckList], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'riftbound-draft.txt';
    a.click();
}

function broadcast(message) {
    draftManager.connections.forEach((conn) => {
        if (conn.open) {
            conn.send(message);
        }
    });
}

function showStatus(message, type = 'info') {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = type;
}