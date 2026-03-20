const ADJECTIVES = [
	'swift', 'bright', 'calm', 'bold', 'keen', 'cool', 'warm', 'deep',
	'fair', 'free', 'glad', 'good', 'holy', 'kind', 'lean', 'lush',
	'mild', 'neat', 'nice', 'pure', 'rare', 'rich', 'safe', 'soft',
	'sure', 'tall', 'true', 'vast', 'wild', 'wise'
];

const NOUNS = [
	'atlas', 'bloom', 'brook', 'cedar', 'cloud', 'coral', 'crane',
	'creek', 'crest', 'dusk', 'ember', 'field', 'flint', 'forge',
	'frost', 'grove', 'haven', 'hearth', 'heron', 'inlet', 'jasper',
	'larch', 'maple', 'marsh', 'meadow', 'mist', 'moon', 'oak',
	'petal', 'pine', 'pond', 'quill', 'rain', 'reed', 'ridge',
	'river', 'robin', 'sage', 'shore', 'slate', 'stone', 'storm',
	'tide', 'vale', 'vine', 'wave', 'wheat', 'willow', 'wren'
];

export function generateSlug(): string {
	const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
	const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
	const num = Math.floor(Math.random() * 900) + 100;
	return `${adj}-${noun}-${num}`;
}
