// Built-in true/false bank for calibration practice.
//
// CRITICAL: a wrong answer key trains ANTI-calibration. Every statement here is
// timeless and unambiguous — settled science, basic geography/math, fixed
// historical facts. Deliberately NO populations, contestable superlatives,
// current office-holders, or reclassified facts (e.g. Pluto). Verify any edit.

export interface CalibrationQuestion {
  id: string;
  statement: string;
  answer: boolean; // is the statement TRUE?
  topic: string;
  note?: string; // optional one-liner shown on reveal
}

export const QUESTIONS: CalibrationQuestion[] = [
  // Geography
  { id: "pacific-largest", statement: "The Pacific is the largest of Earth's oceans.", answer: true, topic: "geography" },
  { id: "everest-highest", statement: "Mount Everest is the highest mountain above sea level.", answer: true, topic: "geography" },
  { id: "australia-continent", statement: "Australia is both a country and a continent.", answer: true, topic: "geography" },
  { id: "russia-two-continents", statement: "Russia lies in both Europe and Asia.", answer: true, topic: "geography" },
  { id: "equator-brazil", statement: "The Equator passes through Brazil.", answer: true, topic: "geography" },
  { id: "nile-mediterranean", statement: "The Nile empties into the Mediterranean Sea.", answer: true, topic: "geography" },
  { id: "panama-canal", statement: "The Panama Canal connects the Atlantic and Pacific Oceans.", answer: true, topic: "geography" },
  { id: "dead-sea-below", statement: "The shore of the Dead Sea is below sea level.", answer: true, topic: "geography" },
  { id: "canberra-capital", statement: "The capital of Australia is Canberra, not Sydney.", answer: true, topic: "geography" },
  { id: "ottawa-capital", statement: "The capital of Canada is Toronto.", answer: false, topic: "geography", note: "It's Ottawa." },
  { id: "greenland-australia", statement: "Greenland is larger in land area than Australia.", answer: false, topic: "geography", note: "Australia (~7.7M km²) is far bigger; map projections exaggerate Greenland." },
  { id: "canada-mexico-border", statement: "Canada shares a land border with Mexico.", answer: false, topic: "geography" },
  { id: "kilimanjaro-samerica", statement: "Mount Kilimanjaro is in South America.", answer: false, topic: "geography", note: "It's in Tanzania, Africa." },
  { id: "iceland-equator", statement: "Iceland sits on the Equator.", answer: false, topic: "geography" },

  // Astronomy
  { id: "earth-orbits-sun", statement: "The Earth orbits the Sun.", answer: true, topic: "astronomy" },
  { id: "jupiter-largest", statement: "Jupiter is the largest planet in the solar system.", answer: true, topic: "astronomy" },
  { id: "mars-red", statement: "Mars is known as the Red Planet.", answer: true, topic: "astronomy" },
  { id: "sun-is-star", statement: "The Sun is a star.", answer: true, topic: "astronomy" },
  { id: "mercury-closest", statement: "Venus is the closest planet to the Sun.", answer: false, topic: "astronomy", note: "Mercury is closest." },
  { id: "moon-bigger-earth", statement: "The Moon is larger than the Earth.", answer: false, topic: "astronomy" },

  // Science
  { id: "water-h2o", statement: "Water is made of hydrogen and oxygen.", answer: true, topic: "science" },
  { id: "gold-au", statement: "The chemical symbol for gold is Au.", answer: true, topic: "science" },
  { id: "iron-fe", statement: "The chemical symbol for iron is Fe.", answer: true, topic: "science" },
  { id: "ice-floats", statement: "Ice is less dense than liquid water.", answer: true, topic: "science" },
  { id: "helium-lighter", statement: "Helium is lighter than air.", answer: true, topic: "science" },
  { id: "heart-four-chambers", statement: "The human heart has four chambers.", answer: true, topic: "science" },
  { id: "chromosomes-23", statement: "Humans typically have 23 pairs of chromosomes.", answer: true, topic: "science" },
  { id: "bats-mammals", statement: "Bats are mammals.", answer: true, topic: "science" },
  { id: "diamond-carbon", statement: "Diamond is made of carbon.", answer: true, topic: "science" },
  { id: "sound-faster-light", statement: "Sound travels faster than light.", answer: false, topic: "science" },
  { id: "spiders-insects", statement: "Spiders are insects.", answer: false, topic: "science", note: "They're arachnids (eight legs, two body segments)." },
  { id: "whales-fish", statement: "Whales are fish.", answer: false, topic: "science", note: "Whales are mammals." },
  { id: "sodium-so", statement: "The chemical symbol for sodium is So.", answer: false, topic: "science", note: "It's Na (from Latin 'natrium')." },

  // Math
  { id: "seventeen-prime", statement: "17 is a prime number.", answer: true, topic: "math" },
  { id: "zero-even", statement: "Zero is an even number.", answer: true, topic: "math" },
  { id: "sqrt-144", statement: "The square root of 144 is 12.", answer: true, topic: "math" },
  { id: "two-only-even-prime", statement: "2 is the only even prime number.", answer: true, topic: "math" },
  { id: "triangle-180", statement: "The interior angles of a flat triangle sum to 180 degrees.", answer: true, topic: "math" },
  { id: "pi-gt-3", statement: "Pi is greater than 3.", answer: true, topic: "math" },
  { id: "km-longer-mile", statement: "A kilometer is longer than a mile.", answer: false, topic: "math", note: "A mile is ~1.61 km." },
  { id: "seven-eight-54", statement: "7 multiplied by 8 equals 54.", answer: false, topic: "math", note: "It's 56." },
  { id: "one-is-prime", statement: "1 is a prime number.", answer: false, topic: "math", note: "By definition primes are > 1." },
  { id: "pentagon-six", statement: "A pentagon has six sides.", answer: false, topic: "math", note: "Five." },

  // History & culture
  { id: "ww2-1945", statement: "World War II ended in 1945.", answer: true, topic: "history" },
  { id: "moon-1969", statement: "The first crewed Moon landing was in 1969.", answer: true, topic: "history" },
  { id: "mona-lisa", statement: "Leonardo da Vinci painted the Mona Lisa.", answer: true, topic: "history" },
  { id: "shakespeare-hamlet", statement: "Shakespeare wrote Hamlet.", answer: true, topic: "history" },
  { id: "pyramids-before-colosseum", statement: "The Pyramids of Giza are older than the Roman Colosseum.", answer: true, topic: "history" },
  { id: "press-before-phone", statement: "The printing press was invented before the telephone.", answer: true, topic: "history" },

  // Balancing set — all clearly FALSE
  { id: "atlantic-largest", statement: "The Atlantic is the largest of Earth's oceans.", answer: false, topic: "geography", note: "The Pacific is the largest." },
  { id: "med-bigger-pacific", statement: "The Mediterranean Sea is larger than the Pacific Ocean.", answer: false, topic: "geography" },
  { id: "everest-africa", statement: "Mount Everest is located in Africa.", answer: false, topic: "geography", note: "It's in the Himalayas, on the Nepal–China border." },
  { id: "london-france", statement: "London is the capital of France.", answer: false, topic: "geography", note: "Paris is; London is the UK's capital." },
  { id: "us-capital-nyc", statement: "The capital of the United States is New York City.", answer: false, topic: "geography", note: "It's Washington, D.C." },
  { id: "sun-orbits-earth", statement: "The Sun orbits the Earth.", answer: false, topic: "astronomy", note: "The Earth orbits the Sun." },
  { id: "earth-largest-planet", statement: "Earth is the largest planet in the solar system.", answer: false, topic: "astronomy", note: "Jupiter is." },
  { id: "square-three-sides", statement: "A square has three sides.", answer: false, topic: "math", note: "Four." },
  { id: "twelve-prime", statement: "12 is a prime number.", answer: false, topic: "math", note: "12 = 2 × 6." },
  { id: "decade-100", statement: "A decade is one hundred years.", answer: false, topic: "math", note: "Ten years." },
  { id: "water-boils-50", statement: "At sea level, water boils at 50 degrees Celsius.", answer: false, topic: "science", note: "100 °C." },
  { id: "ten-months", statement: "There are ten months in a year.", answer: false, topic: "science", note: "Twelve." },
  { id: "penguins-fly", statement: "Penguins can fly.", answer: false, topic: "science" },
  { id: "sharks-mammals", statement: "Sharks are mammals.", answer: false, topic: "science", note: "Sharks are fish." },
  { id: "water-co2", statement: "The chemical formula for water is CO₂.", answer: false, topic: "science", note: "Water is H₂O; CO₂ is carbon dioxide." },
  { id: "breathe-out-oxygen", statement: "Humans breathe out mostly pure oxygen.", answer: false, topic: "science", note: "Exhaled air is mostly nitrogen and CO₂." },
];
