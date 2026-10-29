export const BOX_PRICE = { 1: 50, 11: 500 };
export const RARITIES = [
  {
    name: "Comum",
    key: "common",
    chance: 33.1,
    weight: 331000,
    color: "#b5bba9",
    accent: "#d9ddca",
    damage: 1,
    cooldown: 1.1,
    radius: 1,
    title: "Campestre",
  },
  {
    name: "Bom",
    key: "good",
    chance: 43.5,
    weight: 435000,
    color: "#87b78a",
    accent: "#c4dda4",
    damage: 2,
    cooldown: 0.96,
    radius: Math.SQRT2,
    title: "Verdejante",
  },
  {
    name: "Raro",
    key: "rare",
    chance: 18.4,
    weight: 184000,
    color: "#81b6d9",
    accent: "#b6dfed",
    damage: 3,
    cooldown: 0.82,
    radius: 2,
    title: "das Marés",
  },
  {
    name: "Épico",
    key: "epic",
    chance: 4.7982,
    weight: 47982,
    color: "#b295d3",
    accent: "#e1c4ed",
    damage: 5,
    cooldown: 0.69,
    radius: Math.sqrt(5),
    title: "do Crepúsculo",
  },
  {
    name: "Lendário",
    key: "legendary",
    chance: 0.2,
    weight: 2000,
    color: "#dfb660",
    accent: "#f6dda1",
    damage: 8,
    cooldown: 0.55,
    radius: Math.sqrt(8),
    title: "Solar",
  },
  {
    name: "Mítico",
    key: "mythic",
    chance: 0.0018,
    weight: 18,
    color: "#db8f91",
    accent: "#f3c9b8",
    damage: 12,
    cooldown: 0.43,
    radius: 3,
    title: "da Aurora",
  },
];
export const BOX_TOOLS = RARITIES.flatMap((rarity, r) =>
  [4, 3, 2, 1].map((grade, g) => {
    const radius = rarity.radius + g * 0.4,
      offsets = [];
    for (let y = -Math.ceil(radius); y <= Math.ceil(radius); y++)
      for (let x = -Math.ceil(radius); x <= Math.ceil(radius); x++)
        if (x * x + y * y <= radius * radius + 0.001) offsets.push([x, y]);
    const damage = rarity.damage * (g + 1);
    const cooldown =
      Math.round(rarity.cooldown * Math.pow(0.84, g) * 1000) / 1000;
    return {
      name: `Foice ${rarity.title}`,
      level: r * 4 + g,
      rarity: r,
      rarityName: rarity.name,
      grade,
      color: rarity.color,
      accent: rarity.accent,
      damage,
      cooldown,
      radius,
      area: offsets.length,
      offsets,
      power: damage / cooldown,
      description: `${rarity.name} · Grau ${grade}. ${grade === 1 ? "O auge desta raridade." : "Junte 5 iguais para fundir no próximo grau."}`,
    };
  }),
);
export function rollTool(random = Math.random) {
  const roll = Math.min(999999, Math.max(0, Math.floor(random() * 1000000)));
  let end = 0;
  for (let i = 0; i < RARITIES.length; i++) {
    end += RARITIES[i].weight;
    if (roll < end) return i * 4;
  }
  return 0;
}
