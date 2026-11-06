export const HERO_INTERVAL_MS = 3000;

export const heroModels = [
  { name: "Vază ceramică antică cu model floral", path: "/models/antique-ceramic-vase/antique_ceramic_vase_01_2k.gltf", orientation: [-0.08, -0.35, 0.02] },
  { name: "Elefant sculptat în lemn", path: "/models/carved-wooden-elephant/carved_wooden_elephant_2k.gltf", orientation: [-0.1, -0.55, 0.04] },
  { name: "Perne decorative țesute", path: "/models/throw-pillows/throw_pillows_01_2k.gltf", orientation: [-0.18, -0.42, 0.06] },
  { name: "Vază din alamă gravată", path: "/models/brass-vase-03/brass_vase_03_2k.gltf", orientation: [-0.06, -0.38, 0.02] },
  { name: "Cupe ornamentale din alamă", path: "/models/brass-goblets/brass_goblets_2k.gltf", orientation: [-0.14, -0.5, 0.04] },
  { name: "Sculptură decorativă de balenă din bronz", path: "/models/bronze-whale/bronze_whale_statue_2k.gltf", orientation: [0.08, -0.55, 0.02] },
  { name: "Vază ornamentală din alamă cu patină", path: "/models/brass-vase-04/brass_vase_04_2k.gltf", orientation: [-0.06, -0.4, 0.02] },
] as const;

export type HeroModel = (typeof heroModels)[number];

export function shuffledHeroModels(previousPath?: string): HeroModel[] {
  const deck = [...heroModels];
  for (let index = deck.length - 1; index > 0; index--) {
    const random = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[random]] = [deck[random], deck[index]];
  }
  if (deck[0].path === previousPath) [deck[0], deck[1]] = [deck[1], deck[0]];
  return deck;
}
