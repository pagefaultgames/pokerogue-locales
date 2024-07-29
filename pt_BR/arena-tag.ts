import { SimpleTranslationEntries } from "#app/interfaces/locales";

export const arenaTag: SimpleTranslationEntries = {
  "yourTeam": "your team",
  "opposingTeam": "the opposing team",
  "arenaOnRemove": "{{moveName}}'s effect wore off.",
  "arenaOnRemovePlayer": "{{moveName}}'s effect wore off\non your side.",
  "arenaOnRemoveEnemy": "{{moveName}}'s effect wore off\non the foe's side.",
  "mistOnAdd": "{{pokemonNameWithAffix}}'s team became\nshrouded in mist!",
  "mistApply": "The mist prevented\nthe lowering of stats!",
  "reflectOnAdd": "Reflect reduced the damage of physical moves.",
  "reflectOnAddPlayer": "Reflect reduced the damage of physical moves on your side.",
  "reflectOnAddEnemy": "Reflect reduced the damage of physical moves on the foe's side.",
  "lightScreenOnAdd": "Light Screen reduced the damage of special moves.",
  "lightScreenOnAddPlayer": "Light Screen reduced the damage of special moves on your side.",
  "lightScreenOnAddEnemy": "Light Screen reduced the damage of special moves on the foe's side.",
  "auroraVeilOnAdd": "Aurora Veil reduced the damage of moves.",
  "auroraVeilOnAddPlayer": "Aurora Veil reduced the damage of moves on your side.",
  "auroraVeilOnAddEnemy": "Aurora Veil reduced the damage of moves on the foe's side.",
  "conditionalProtectOnAdd": "{{moveName}} protected team!",
  "conditionalProtectOnAddPlayer": "{{moveName}} protected your team!",
  "conditionalProtectOnAddEnemy": "{{moveName}} protected the\nopposing team!",
  "conditionalProtectApply": "{{moveName}} protected {{pokemonNameWithAffix}}!",
  "matBlockOnAdd": "{{pokemonNameWithAffix}} intends to flip up a mat\nand block incoming attacks!",
  "wishTagOnAdd": "{{pokemonNameWithAffix}}'s wish\ncame true!",
  "mudSportOnAdd": "Electricity's power was weakened!",
  "mudSportOnRemove": "The effects of Mud Sport\nhave faded.",
  "waterSportOnAdd": "Fire's power was weakened!",
  "waterSportOnRemove": "The effects of Water Sport\nhave faded.",
  "spikesOnAdd": "{{moveName}} were scattered\nall around {{opponentDesc}}'s feet!",
  "spikesActivateTrap": "{{pokemonNameWithAffix}} is hurt\nby the spikes!",
  "toxicSpikesOnAdd": "{{moveName}} were scattered\nall around {{opponentDesc}}'s feet!",
  "toxicSpikesActivateTrapPoison": "{{pokemonNameWithAffix}} absorbed the {{moveName}}!",
  "stealthRockOnAdd": "Pointed stones float in the air\naround {{opponentDesc}}!",
  "stealthRockActivateTrap": "Pointed stones dug into\n{{pokemonNameWithAffix}}!",
  "stickyWebOnAdd": "A {{moveName}} has been laid out on the ground around the opposing team!",
  "stickyWebActivateTrap": "The opposing {{pokemonName}} was caught in a sticky web!",
  "trickRoomOnAdd": "{{pokemonNameWithAffix}} twisted\nthe dimensions!",
  "trickRoomOnRemove": "The twisted dimensions\nreturned to normal!",
  "gravityOnAdd": "Gravity intensified!",
  "gravityOnRemove": "Gravity returned to normal!",
  "tailwindOnAdd": "The Tailwind blew from behind team!",
  "tailwindOnAddPlayer": "The Tailwind blew from behind\nyour team!",
  "tailwindOnAddEnemy": "The Tailwind blew from behind\nthe opposing team!",
  "tailwindOnRemove": "Team's Tailwind petered out!",
  "tailwindOnRemovePlayer": "Your team's Tailwind petered out!",
  "tailwindOnRemoveEnemy": "The opposing team's Tailwind petered out!",
  "happyHourOnAdd": "Everyone is caught up in the happy atmosphere!",
  "happyHourOnRemove": "The atmosphere returned to normal.",
} as const;