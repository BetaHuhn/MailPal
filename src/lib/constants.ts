export const SWATCHES = [
    { hue: 0,   hex: '#D86464' },
    { hue: 30,  hex: '#D89E64' },
    { hue: 60,  hex: '#D8D864' },
    { hue: 90,  hex: '#9ED864' },
    { hue: 120, hex: '#64D864' },
    { hue: 150, hex: '#64D89E' },
    { hue: 180, hex: '#64D8D8' },
    { hue: 210, hex: '#649ED8' },
    { hue: 240, hex: '#6464D8' },
    { hue: 270, hex: '#9E64D8' },
    { hue: 300, hex: '#D864D8' },
    { hue: 330, hex: '#D8649E' },
];

export const randomSwatchColor = () => {
    const randomIndex = Math.floor(Math.random() * SWATCHES.length);
    return SWATCHES[randomIndex].hex;
}