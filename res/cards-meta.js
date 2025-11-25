const excludeCardIds = [
    'ogn-271-298', // Token
    'ogn-272-298', // Token
    'ogn-273-298', // Token
    'ogn-007a-298',
    'ogn-007-298',
    'ogn-042-298',
    'ogn-042a-298',
    'ogn-089-298',
    'ogn-089a-298',
    'ogn-126-298',
    'ogn-126-298',
    'ogn-166-298',
    'ogn-166a-298',
    'ogn-214-298',
    'ogn-214a-298',
];

const RIFTBOUND_CARDS = cardsData.filter(c => !excludeCardIds.includes(c.id));


// Pool di carte per rarità (per generazione pacchetti)
const CARD_POOLS = {
    all: Object.values(RIFTBOUND_CARDS),
    common: Object.values(RIFTBOUND_CARDS).filter(c => c.rarity.id === 'common'),
    uncommon: Object.values(RIFTBOUND_CARDS).filter(c => c.rarity.id === 'uncommon'),
    rare: Object.values(RIFTBOUND_CARDS).filter(c => c.rarity.id === 'rare'),
    epic: Object.values(RIFTBOUND_CARDS).filter(c => c.rarity.id === 'epic'),
    showcase: Object.values(RIFTBOUND_CARDS).filter(c => c.rarity.id === 'showcase'),
    legends: Object.values(RIFTBOUND_CARDS).filter(c => c.cardType.some(type => type.id === 'legend'))
};

// Genera un pacchetto di cardsPerPack carte con distribuzione rarità
function generateBoosterPack(seed, packComposition) {

    const random = seededRandom(seed);
    const pack = [];

    // Random
    for (let i = 0; i < packComposition.random; i++) {
        pack.push(randomCard(CARD_POOLS.all, random));
    }

    // Commons
    for (let i = 0; i < packComposition.commons; i++) {
        pack.push(randomCard(CARD_POOLS.common, random));
    }

    // Uncommon
    for (let i = 0; i < packComposition.uncommons; i++) {
        pack.push(randomCard(CARD_POOLS.uncommon, random));
    }
    
    // Rares
    for (let i = 0; i < packComposition.rares; i++) {
        pack.push(randomCard(CARD_POOLS.rare, random));
    }
    
    // Epics
    for (let i = 0; i < packComposition.epics; i++) {
        pack.push(randomCard(CARD_POOLS.epic, random));
    }

    
    // Legends
    for (let i = 0; i < packComposition.legends; i++) {
        pack.push(randomCard(CARD_POOLS.legends, random));
    }

    return pack;
}

function randomCard(pool, random) {
    const index = Math.floor(random() * pool.length);
    return { ...pool[index] };
}

// Generatore random con seed per consistenza tra peer
function seededRandom(seed) {
    let state = seed;
    return function() {
        state = (state * 9301 + 49297) % 233280;
        return state / 233280;
    };
}