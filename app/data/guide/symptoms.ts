export interface SymptomGroup {
  id: string;
  title: string;
  keywords: string[];
  examples: string[];
  precautions: string[];
  seeSomeoneIf: string[];
}

export const SYMPTOM_GROUPS: SymptomGroup[] = [
  // 1. Fever, cold or flu-like illness
  {
    id: "fever_cold",
    title: "Fever, cold or flu-like illness",
    keywords: [
      "fever",
      "temperature",
      "high temperature",
      "chills",
      "shivering",
      "feeling hot",
      "body ache",
      "cold",
      "runny nose",
      "blocked nose",
      "sneezing",
      "flu",
      // REVIEW BY HINDI SPEAKER
      "bukhar",
      "sardi",
      "zukam",
    ],
    examples: [
      "I have a high fever and runny nose since yesterday",
      "chills shivering body ache and mild cold",
      "bukhar aur sardi ho gayi hai",
      "feeling hot with temperature and blocked nose",
      "sneezing continuously and feeling feverish",
      "have cold flu symptoms with sore muscles",
      "mild fever and nose is blocked",
      "zukam aur sar mein halka bukhar",
    ],
    precautions: [
      "Rest and avoid heavy activity.",
      "Drink plenty of fluids such as water, soups or oral rehydration drinks.",
      "Wear light clothing and keep the room comfortable.",
      "Check your temperature with a thermometer and note it.",
      "Cover your mouth and nose when you cough or sneeze, and wash your hands often.",
      "Stay away from other people while unwell and consider a mask around others.",
      "Do not share cups, utensils or towels.",
      "Do not start or change any medicine without advice from a doctor or pharmacist.",
    ],
    seeSomeoneIf: [
      "Fever lasts more than three days",
      "Very high fever",
      "Fever with stiff neck, severe headache, rash, confusion or trouble breathing",
      "Symptoms are getting worse",
      "The person is a baby, an older adult, pregnant, or has a long-term illness",
    ],
  },

  // 2. Cough or sore throat
  {
    id: "cough_throat",
    title: "Cough or sore throat",
    keywords: [
      "cough",
      "dry cough",
      "wet cough",
      "sore throat",
      "throat pain",
      "hoarse voice",
      // REVIEW BY HINDI SPEAKER
      "khansi",
      "gala dard",
      "gala kharab",
    ],
    examples: [
      "dry cough and scratchy throat",
      "gala kharab hai aur khansi aa rahi hai",
      "hoarse voice and painful swallowing in throat",
      "wet cough with tickle in my throat",
      "throat pain when drinking warm water",
      "coughing a lot especially at night",
      "irritating cough and throat feels swollen",
      "gale mein dard aur continuous khansi",
    ],
    precautions: [
      "Sip warm fluids through the day.",
      "Avoid smoke, dust and strong smells.",
      "Cover your mouth when you cough and wash your hands.",
      "Rest your voice if it is hoarse.",
      "Wear a mask in crowded places while coughing.",
      "Keep your head slightly raised when you sleep.",
    ],
    seeSomeoneIf: [
      "Cough lasts more than two to three weeks",
      "Coughing up blood",
      "Wheezing or breathlessness",
      "Chest pain",
      "Fever for more than three days",
      "Difficulty swallowing",
    ],
  },

  // 3. Headache
  {
    id: "headache",
    title: "Headache",
    keywords: [
      "headache",
      "head pain",
      "migraine",
      // REVIEW BY HINDI SPEAKER
      "sar dard",
      "sir dard",
    ],
    examples: [
      "bad headache on the right side of my head",
      "sar dard ho raha hai bahut der se",
      "throbbing head pain after looking at screen",
      "tension headache around forehead and temples",
      "mild migraine sensitivity to light",
      "head feels heavy and aching",
      "sir dard aur thakan",
      "dull ache across my forehead all day",
    ],
    precautions: [
      "Rest in a quiet, dim room.",
      "Drink water, since dehydration can trigger headaches.",
      "Eat regular meals and keep a regular sleep routine.",
      "Take breaks from screens.",
      "Note what seems to trigger your headaches, such as noise, light, missed meals or stress.",
      "Do not keep taking pain medicines without advice from a doctor or pharmacist.",
    ],
    seeSomeoneIf: [
      "Headaches are frequent, getting worse or wake you at night",
      "Headache after a head injury",
      "Headache with fever and stiff neck",
      "Headache with vision changes, weakness, confusion or trouble speaking (urgent)",
    ],
  },

  // 4. Stomach upset
  {
    id: "stomach_upset",
    title: "Stomach upset",
    keywords: [
      "diarrhoea",
      "diarrhea",
      "loose motions",
      "vomiting",
      "nausea",
      "stomach pain",
      "stomach ache",
      "abdominal pain",
      "gas",
      "acidity",
      "indigestion",
      // REVIEW BY HINDI SPEAKER
      "pet dard",
      "ulti",
      "dast",
    ],
    examples: [
      "loose motions and watery stool since morning",
      "pet dard aur ulti jaisa lag raha hai",
      "nausea vomiting and stomach cramps",
      "upset tummy indigestion and loose motions",
      "gas and acidity burning in stomach",
      "dast lag gaye hain aur pet kharab hai",
      "feeling nauseous and having stomach ache",
      "frequent trips to bathroom with watery motions",
    ],
    precautions: [
      "Take small sips of fluids often.",
      "Oral rehydration solution (ORS) is commonly used to replace lost fluids.",
      "Eat light, plain foods when you feel able.",
      "Wash your hands with soap after using the toilet and before eating.",
      "Drink boiled or safe water, and avoid street food and raw food until you recover.",
      "Rest.",
    ],
    seeSomeoneIf: [
      "Signs of dehydration such as a very dry mouth, passing little or no urine, or dizziness",
      "Blood in stool or vomit",
      "Severe or constant pain",
      "Symptoms last more than two days",
      "You cannot keep fluids down",
      "The person is a baby, an older adult or pregnant (sooner)",
    ],
  },

  // 5. Tiredness or body aches
  {
    id: "fatigue_body_ache",
    title: "Tiredness or body aches",
    keywords: [
      "tired",
      "tiredness",
      "fatigue",
      "weakness",
      "body ache",
      "muscle pain",
      "joint pain",
      // REVIEW BY HINDI SPEAKER
      "thakan",
      "kamzori",
      "badan dard",
    ],
    examples: [
      "feeling very tired and weak whole day",
      "badan dard aur bahut zyada thakan",
      "muscle aches and exhaustion without fever",
      "extreme fatigue and generalized weakness",
      "joint stiffness and body aching all over",
      "kamzori lag rahi hai aur thakawat",
      "low energy feeling drained and sore",
      "tiredness after simple daily activities",
    ],
    precautions: [
      "Rest and sleep at regular times.",
      "Drink enough water and eat balanced meals.",
      "Do gentle stretching or short walks instead of heavy exercise.",
      "Avoid skipping meals.",
      "Notice patterns, such as after work, after meals or after poor sleep.",
    ],
    seeSomeoneIf: [
      "It lasts more than one to two weeks",
      "It comes with unexplained weight loss, fever, swelling or severe weakness",
    ],
  },

  // 6. Minor cuts, sprains or burns
  {
    id: "minor_injury",
    title: "Minor cuts, sprains or burns",
    keywords: [
      "cut",
      "wound",
      "scrape",
      "graze",
      "sprain",
      "twisted ankle",
      "bruise",
      "burn",
      "scald",
      // REVIEW BY HINDI SPEAKER
      "chot",
      "kat gaya",
      "jal gaya",
    ],
    examples: [
      "small cut on my finger while chopping vegetables",
      "twisted my ankle while walking on stairs",
      "kat gaya hai ungli pe thoda khoon aaya",
      "mild burn on hand from hot tea cup",
      "bruise and swelling on knee after minor fall",
      "scraped my elbow on rough pavement",
      "chot lag gayi halki si jal gaya",
      "sprained my wrist lifting a light bag",
    ],
    precautions: [
      "Wash your hands first.",
      "For cuts: press gently with a clean cloth to stop bleeding, rinse with clean running water, cover with a clean dressing and keep it dry.",
      "For sprains: rest the area, apply a cold pack wrapped in cloth, use light compression and keep the limb raised.",
      "For small burns: cool under clean running water for about ten to twenty minutes.",
      "Do not put butter, toothpaste or oil on burns.",
      "Avoid touching wounds with dirty hands.",
    ],
    seeSomeoneIf: [
      "The cut is deep or wide",
      "Bleeding does not stop after ten minutes of firm pressure",
      "An animal bite",
      "A dirty wound when you are unsure about tetanus protection",
      "A burn larger than your palm or on the face, hands or genitals",
      "A swollen or deformed limb, or you cannot put weight on it",
    ],
  },

  // 7. Rash or itching
  {
    id: "skin_rash_itch",
    title: "Rash or itching",
    keywords: [
      "rash",
      "itching",
      "itchy skin",
      "hives",
      "red spots",
      "skin allergy",
      // REVIEW BY HINDI SPEAKER
      "kharish",
      "khujli",
      "daane",
    ],
    examples: [
      "red itchy spots on arms after using new soap",
      "khujli ho rahi hai aur daane nikal aaye",
      "skin rash with irritation on neck",
      "itchy hives on legs without swelling",
      "kharish aur red patches on skin",
      "dry itchy patches on hands",
      "mild allergic skin irritation",
      "red bumps on back that feel itchy",
    ],
    precautions: [
      "Avoid scratching.",
      "Keep skin clean and dry and wear loose cotton clothes.",
      "Avoid new soaps, detergents, cosmetics or foods that may have triggered it.",
      "Note when it started and what changed.",
      "Do not apply strong creams or home remedies without advice.",
    ],
    seeSomeoneIf: [
      "The rash spreads quickly",
      "Blisters or open sores",
      "Fever",
      "Pain",
      "Swelling of lips, face or tongue (urgent)",
    ],
  },

  // 8. Eye irritation
  {
    id: "eye_irritation",
    title: "Eye irritation",
    keywords: [
      "red eye",
      "eye pain",
      "itchy eyes",
      "watering eyes",
      "eye irritation",
      "dust in eye",
      // REVIEW BY HINDI SPEAKER
      "aankh lal",
      "aankh mein dard",
    ],
    examples: [
      "red eyes and watering after dust exposure",
      "aankh lal ho gayi hai aur chubhan hai",
      "scratchy feeling in eye like dust is inside",
      "both eyes are itchy and watery",
      "irritated red eyes after long screen time",
      "mild eye discomfort and tearing up",
      "aankhon mein jalan aur paani aa raha hai",
      "gritty feeling in eye when blinking",
    ],
    precautions: [
      "Do not rub your eyes.",
      "Wash your hands before touching your face.",
      "Rinse around the eyes with clean water.",
      "Do not share towels or eye makeup.",
      "Avoid contact lenses until symptoms settle.",
      "Rest your eyes from screens.",
    ],
    seeSomeoneIf: [
      "Eye pain",
      "Vision changes",
      "Sensitivity to light",
      "Thick discharge",
      "An eye injury",
      "A chemical splash (rinse with clean water continuously and get urgent help)",
    ],
  },

  // 9. Tooth or mouth problems
  {
    id: "tooth_mouth",
    title: "Tooth or mouth problems",
    keywords: [
      "toothache",
      "tooth pain",
      "gum pain",
      "mouth ulcer",
      "swollen gum",
      // REVIEW BY HINDI SPEAKER
      "daant dard",
      "chhale",
    ],
    examples: [
      "dull toothache on upper molar",
      "daant mein dard aur chhale in mouth",
      "mouth ulcer on inside of cheek",
      "swollen gum around back tooth",
      "mild tooth pain when chewing food",
      "sensitive tooth and gum irritation",
      "mouth sores that sting when eating",
      "daant dard aur masoode mein dard",
    ],
    precautions: [
      "Rinse your mouth with lukewarm salt water.",
      "Brush gently and clean between your teeth.",
      "Avoid very hot, cold or sugary foods.",
      "Keep your mouth clean after meals.",
    ],
    seeSomeoneIf: [
      "Pain lasts more than a day or two",
      "Swelling",
      "Fever",
      "Mouth ulcers last more than two weeks",
      "Swelling spreads to the face or neck, or trouble swallowing or breathing (urgent)",
    ],
  },

  // 10. Stress or poor sleep
  {
    id: "stress_sleep",
    title: "Stress or poor sleep",
    keywords: [
      "stress",
      "anxiety",
      "worried",
      "panic",
      "cannot sleep",
      "insomnia",
      "low mood",
      "feeling down",
      "tension",
      // REVIEW BY HINDI SPEAKER
      "neend nahi aati",
      "ghabrahat",
    ],
    examples: [
      "cannot sleep at night mind is racing",
      "neend nahi aati aur ghabrahat hoti hai",
      "feeling anxious worried and tense",
      "poor sleep waking up multiple times",
      "stress from work and feeling overwhelmed",
      "low mood and restlessness during day",
      "tension and trouble falling asleep",
      "anxiety and nervous feeling in chest",
    ],
    precautions: [
      "Keep a regular sleep schedule.",
      "Limit caffeine and screens before bed.",
      "Take short walks or do light physical activity.",
      "Try slow breathing: breathe in slowly, hold briefly, breathe out slowly.",
      "Talk to someone you trust.",
      "Take regular breaks and avoid alcohol.",
    ],
    seeSomeoneIf: [
      "Symptoms last more than two weeks",
      "They affect daily life or work",
      "Panic attacks occur",
      "Thoughts of harming oneself (urgent)",
    ],
  },

  // 11. Urinary discomfort
  {
    id: "urinary",
    title: "Urinary discomfort",
    keywords: [
      "burning urination",
      "painful urination",
      "frequent urination",
      "urine infection",
      // REVIEW BY HINDI SPEAKER
      "peshab mein jalan",
    ],
    examples: [
      "burning sensation during urination",
      "peshab mein jalan aur dard",
      "frequent urge to pass urine with slight discomfort",
      "pain when urinating and cloudy urine",
      "feeling like passing urine very often",
      "mild urinary discomfort without fever",
      "peshab baar baar aana aur jalan",
      "slight burning feeling when using bathroom",
    ],
    precautions: [
      "Drink enough water.",
      "Do not hold urine for long.",
      "Keep the genital area clean and dry.",
      "Wear breathable cotton underwear.",
    ],
    seeSomeoneIf: [
      "You should see a doctor soon, since these symptoms usually need a test",
      "Urgently if there is fever, back or side pain, blood in urine, or you are pregnant",
    ],
  },

  // 12. Period pain
  {
    id: "menstrual_pain",
    title: "Period pain",
    keywords: [
      "period pain",
      "menstrual cramps",
      "painful periods",
      "irregular periods",
      // REVIEW BY HINDI SPEAKER
      "periods mein dard",
    ],
    examples: [
      "cramps in lower abdomen during periods",
      "periods mein dard aur cramps",
      "menstrual pain and aching in lower back",
      "painful periods causing discomfort",
      "cramping before monthly cycle starts",
      "lower tummy ache during menstrual cycle",
      "period cramps making it hard to sit",
      "mahavari ke dauran pet mein dard",
    ],
    precautions: [
      "Rest.",
      "Apply a warm compress to the lower abdomen.",
      "Drink enough fluids.",
      "Do light activity or stretching.",
      "Keep a diary of your cycle and symptoms.",
    ],
    seeSomeoneIf: [
      "Very heavy bleeding, such as soaking a pad every hour for several hours",
      "Severe pain that stops daily activities",
      "Missed periods with pain",
      "Possible pregnancy with pain or bleeding (urgent)",
    ],
  },

  // 13. Allergy or sneezing
  {
    id: "allergy_sneezing",
    title: "Allergy or sneezing",
    keywords: [
      "allergy",
      "sneezing",
      "watery eyes",
      "dust allergy",
      "pollen",
      "hay fever",
      // REVIEW BY HINDI SPEAKER
      "allergy se chheenk",
    ],
    examples: [
      "sneezing repeatedly due to dust",
      "allergy se chheenk aur naak behna",
      "pollen allergy runny nose and sneezing",
      "hay fever seasonal sneezing fits",
      "watery eyes and multiple sneezes in morning",
      "dust allergy causing continuous sneezes",
      "chheenk aana aur naak mein khujli",
      "allergic sneezing when sweeping room",
    ],
    precautions: [
      "Avoid known triggers.",
      "Keep windows closed on dusty days.",
      "Wash bedding regularly.",
      "Wear a mask outdoors in dust.",
      "Wash your hands and face after being outside.",
    ],
    seeSomeoneIf: [
      "Wheezing or trouble breathing (urgent)",
      "Symptoms on most days of the week",
      "Swelling of the face, lips or tongue (urgent)",
    ],
  },

  // 14. Heat or dehydration
  {
    id: "heat_dehydration",
    title: "Heat or dehydration",
    keywords: [
      "heat",
      "sunstroke",
      "dehydration",
      "dizzy in the heat",
      "very thirsty",
      // REVIEW BY HINDI SPEAKER
      "loo lagna",
      "garmi",
    ],
    examples: [
      "feeling dizzy and thirsty after being in the sun",
      "garmi lag gayi aur dehydration ho gaya",
      "extreme thirst and feeling weak in heat",
      "sun exposure caused lightheadedness and dry mouth",
      "loo lagna aur sar ghoomna",
      "feeling exhausted from hot sunny afternoon",
      "sweating a lot and very dry throat in summer",
      "dizziness from hot weather outside",
    ],
    precautions: [
      "Move to a cool, shaded place.",
      "Sip water or oral rehydration drinks slowly.",
      "Loosen tight clothing.",
      "Rest and avoid exertion in the heat.",
      "Cool the skin with a damp cloth.",
    ],
    seeSomeoneIf: [
      "Confusion",
      "Fainting",
      "Very high body temperature, hot dry skin or no sweating (urgent)",
      "Repeated vomiting",
    ],
  },
];
