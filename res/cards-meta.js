const excludeCardIds = [
    'ogn-271-298',
    'ogn-272-298',
    'ogn-273-298',
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
    common: Object.values(RIFTBOUND_CARDS).filter(c => c.rarity.id === 'common'),
    uncommon: Object.values(RIFTBOUND_CARDS).filter(c => c.rarity.id === 'uncommon'),
    rare: Object.values(RIFTBOUND_CARDS).filter(c => c.rarity.id === 'rare'),
    epic: Object.values(RIFTBOUND_CARDS).filter(c => c.rarity.id === 'epic'),
    showcase: Object.values(RIFTBOUND_CARDS).filter(c => c.rarity.id === 'showcase'),
    legends: Object.values(RIFTBOUND_CARDS).filter(c => c.cardType.id === 'legend')
};

// Genera un pacchetto da 15 carte con distribuzione rarità
function generateBoosterPack(seed) {
    const random = seededRandom(seed);
    const pack = [];
    
    // 10 comuni
    for (let i = 0; i < 10; i++) {
        pack.push(randomCard(CARD_POOLS.common, random));
    }
    
    // 3 non-comuni
    for (let i = 0; i < 3; i++) {
        pack.push(randomCard(CARD_POOLS.uncommon, random));
    }
    
    // 1 rara
    pack.push(randomCard(CARD_POOLS.rare, random));
    
    // 1 rare or epic
    const bonus = random();
    if (bonus < 0.75) {
        pack.push(randomCard(CARD_POOLS.rare, random));
    } else {
        pack.push(randomCard(CARD_POOLS.epic, random));
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