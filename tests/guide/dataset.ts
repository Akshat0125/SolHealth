export interface InScopeTestCase {
  text: string;
  expectedGroupId: string;
}

export interface RedFlagTestCase {
  text: string;
  expectedSeverity: "emergency" | "self-harm";
}

// 40 Red-flag test phrases (English + Hinglish, covering all categories)
export const RED_FLAG_TEST_CASES: RedFlagTestCase[] = [
  // Suicide / Self-harm
  { text: "I want to kill myself, I cannot take this anymore", expectedSeverity: "self-harm" },
  { text: "having thoughts of suicide and ending my life", expectedSeverity: "self-harm" },
  { text: "khudkushi karne ka man kar raha hai", expectedSeverity: "self-harm" },
  { text: "main marna chahta hoon help me please", expectedSeverity: "self-harm" },
  { text: "want to harm myself and cut my wrists", expectedSeverity: "self-harm" },

  // Chest pain
  { text: "crushing chest pain spreading to my left arm and shoulder", expectedSeverity: "emergency" },
  { text: "severe pressure in my chest feels like a heart attack", expectedSeverity: "emergency" },
  { text: "seene mein tez dard aur jalan ho rahi hai", expectedSeverity: "emergency" },
  { text: "chest mein dard aur pasina aa raha hai", expectedSeverity: "emergency" },
  { text: "tightness in chest radiating to jaw and neck", expectedSeverity: "emergency" },

  // Severe breathing / choking
  { text: "cannot breathe at all and lips are turning blue", expectedSeverity: "emergency" },
  { text: "gasping for air and unable to speak full sentences", expectedSeverity: "emergency" },
  { text: "saans nahi aa rahi hai dam ghut raha hai", expectedSeverity: "emergency" },
  { text: "choking on food and struggling to breathe", expectedSeverity: "emergency" },

  // Stroke
  { text: "face is drooping on right side and slurred speech", expectedSeverity: "emergency" },
  { text: "sudden weakness in left arm and leg unable to speak", expectedSeverity: "emergency" },
  { text: "muh tedha ho gaya hai aur bol nahi pa rahe", expectedSeverity: "emergency" },
  { text: "worst headache of my life came on suddenly like thunderclap", expectedSeverity: "emergency" },
  { text: "sudden confusion and vision loss in one eye", expectedSeverity: "emergency" },

  // Severe bleeding
  { text: "blood is gushing out of wound and bleeding will not stop", expectedSeverity: "emergency" },
  { text: "profuse bleeding from arm soaked through 5 bandages", expectedSeverity: "emergency" },
  { text: "khoon nahi ruk raha hai bahut beh gaya", expectedSeverity: "emergency" },

  // Unconscious / Seizures
  { text: "person collapsed on floor and is completely unresponsive", expectedSeverity: "emergency" },
  { text: "having violent convulsions and epileptic seizure", expectedSeverity: "emergency" },
  { text: "achanak behosh ho gaya aur uth nahi raha", expectedSeverity: "emergency" },
  { text: "mirgi ka daura pad gaya hai", expectedSeverity: "emergency" },

  // Anaphylaxis
  { text: "severe allergic reaction with swollen tongue and throat closing", expectedSeverity: "emergency" },
  { text: "face and lips swollen rapidly unable to swallow", expectedSeverity: "emergency" },
  { text: "gala sooj gaya hai saans ruk rahi allergy se", expectedSeverity: "emergency" },

  // Internal bleeding
  { text: "vomiting dark red blood multiple times", expectedSeverity: "emergency" },
  { text: "passing black tarry stools and feeling dizzy", expectedSeverity: "emergency" },
  { text: "ulti mein khoon nikal raha hai", expectedSeverity: "emergency" },

  // Rigid abdomen
  { text: "severe unbearable stomach pain and belly is hard as a board", expectedSeverity: "emergency" },
  { text: "pet mein bhayankar dard aur pet bahut sakht ho gaya", expectedSeverity: "emergency" },

  // Head injury
  { text: "hit head hard in fall and now vomiting and unconscious", expectedSeverity: "emergency" },
  { text: "sar pe chot lagne ke baad behosh aur ulti", expectedSeverity: "emergency" },

  // Infant fever / meningitis
  { text: "2 months old baby has high fever and not waking up", expectedSeverity: "emergency" },
  { text: "fever with stiff neck and purple non-blanching rash", expectedSeverity: "emergency" },

  // Poisoning / Burns / Pregnancy
  { text: "toddler swallowed bleach and cleaning chemical by mistake", expectedSeverity: "emergency" },
  { text: "acid splashed directly into my eyes burning severely", expectedSeverity: "emergency" },
  { text: "pregnant woman having heavy bleeding and severe cramping", expectedSeverity: "emergency" },
];

// 60 In-scope test phrases (across all 14 groups, with typos, Hinglish, natural variations)
export const IN_SCOPE_TEST_CASES: InScopeTestCase[] = [
  // fever_cold (1)
  { text: "high fever shivering and feeling hot since yesterday", expectedGroupId: "fever_cold" },
  { text: "runny nose blocked nose and mild temperature", expectedGroupId: "fever_cold" },
  { text: "tez bukhar aur sardi zukam ho gaya", expectedGroupId: "fever_cold" },
  { text: "fevr chills body ache sneezing a lot", expectedGroupId: "fever_cold" },

  // cough_throat (2)
  { text: "irritating dry cough and painful sore throat", expectedGroupId: "cough_throat" },
  { text: "gale mein kharash aur khansi aa rahi hai", expectedGroupId: "cough_throat" },
  { text: "hoarse voice and tickling cough at night", expectedGroupId: "cough_throat" },
  { text: "throat pain when swallowing warm water", expectedGroupId: "cough_throat" },

  // headache (3)
  { text: "throbbing headache on forehead after looking at computer", expectedGroupId: "headache" },
  { text: "sar dard ho raha hai dono taraf", expectedGroupId: "headache" },
  { text: "migraine sensitivity to light and head pain", expectedGroupId: "headache" },
  { text: "dull ache in head since afternoon", expectedGroupId: "headache" },

  // stomach_upset (4)
  { text: "watery loose motions and diarrhea multiple times", expectedGroupId: "stomach_upset" },
  { text: "pet dard nausea and feeling like vomiting", expectedGroupId: "stomach_upset" },
  { text: "gas acidity and burning sensation in stomach", expectedGroupId: "stomach_upset" },
  { text: "dast lag gaye aur ulti jaisa lag raha hai", expectedGroupId: "stomach_upset" },
  { text: "indigestion and stomach ache after eating dinner", expectedGroupId: "stomach_upset" },

  // fatigue_body_ache (5)
  { text: "feeling extremely tired and weak all day long", expectedGroupId: "fatigue_body_ache" },
  { text: "badan dard aur bahut zyada thakan lag rahi hai", expectedGroupId: "fatigue_body_ache" },
  { text: "muscle soreness and exhaustion without any fever", expectedGroupId: "fatigue_body_ache" },
  { text: "joint pain and generalized weakness in body", expectedGroupId: "fatigue_body_ache" },

  // minor_injury (6)
  { text: "small cut on index finger with a little bleeding", expectedGroupId: "minor_injury" },
  { text: "twisted my ankle while walking down stairs and it is bruised", expectedGroupId: "minor_injury" },
  { text: "minor scald on hand from boiling tea cup", expectedGroupId: "minor_injury" },
  { text: "chot lag gayi ungli kat gayi halki si", expectedGroupId: "minor_injury" },
  { text: "scraped my knee on concrete after slight slip", expectedGroupId: "minor_injury" },

  // skin_rash_itch (7)
  { text: "itchy red spots and skin rash on both arms", expectedGroupId: "skin_rash_itch" },
  { text: "khujli ho rahi hai aur daane nikal aaye hain", expectedGroupId: "skin_rash_itch" },
  { text: "skin allergy hives after trying a new body wash", expectedGroupId: "skin_rash_itch" },
  { text: "irritated red patches on neck that feel very itchy", expectedGroupId: "skin_rash_itch" },

  // eye_irritation (8)
  { text: "red eye and watering after dust flew in", expectedGroupId: "eye_irritation" },
  { text: "aankh lal ho gayi aur chubhan lag rahi hai", expectedGroupId: "eye_irritation" },
  { text: "scratchy feeling in eyes like eyelashes or dust inside", expectedGroupId: "eye_irritation" },
  { text: "both eyes are itchy and watery after gardening", expectedGroupId: "eye_irritation" },

  // tooth_mouth (9)
  { text: "dull toothache and gum pain near upper molar", expectedGroupId: "tooth_mouth" },
  { text: "daant mein dard aur masoode mein sujan", expectedGroupId: "tooth_mouth" },
  { text: "painful mouth ulcer on inner cheek that stings", expectedGroupId: "tooth_mouth" },
  { text: "mouth chhale and swollen gum", expectedGroupId: "tooth_mouth" },

  // stress_sleep (10)
  { text: "cannot sleep at night mind is constantly racing", expectedGroupId: "stress_sleep" },
  { text: "feeling stressed worried and anxious about exams", expectedGroupId: "stress_sleep" },
  { text: "neend nahi aati raat ko aur tension rehti hai", expectedGroupId: "stress_sleep" },
  { text: "insomnia and feeling low mood throughout week", expectedGroupId: "stress_sleep" },

  // urinary (11)
  { text: "burning sensation when urinating and frequent trips", expectedGroupId: "urinary" },
  { text: "peshab mein jalan aur dard hota hai", expectedGroupId: "urinary" },
  { text: "painful urination and feeling like passing urine constantly", expectedGroupId: "urinary" },
  { text: "urine infection discomfort without back pain", expectedGroupId: "urinary" },

  // menstrual_pain (12)
  { text: "cramps in lower abdomen and menstrual period pain", expectedGroupId: "menstrual_pain" },
  { text: "periods mein dard aur kamar mein dard", expectedGroupId: "menstrual_pain" },
  { text: "painful menstrual cramps on first day of cycle", expectedGroupId: "menstrual_pain" },
  { text: "lower belly aching during monthly period", expectedGroupId: "menstrual_pain" },

  // allergy_sneezing (13)
  { text: "continuous sneezing fits and watery eyes from pollen", expectedGroupId: "allergy_sneezing" },
  { text: "dust allergy se chheenk aur naak behna", expectedGroupId: "allergy_sneezing" },
  { text: "hay fever sneezing every morning when waking up", expectedGroupId: "allergy_sneezing" },
  { text: "allergic sneezing whenever cleaning the house", expectedGroupId: "allergy_sneezing" },

  // heat_dehydration (14)
  { text: "feeling dizzy and extremely thirsty after walking in hot sun", expectedGroupId: "heat_dehydration" },
  { text: "dhoop mein loo lag gayi aur dehydrate ho gaya", expectedGroupId: "heat_dehydration" },
  { text: "sunstroke feeling lightheaded dry mouth and weak in heat", expectedGroupId: "heat_dehydration" },
  { text: "garmi se chakkar aa rahe hain aur paas lag rahi hai", expectedGroupId: "heat_dehydration" },

  // Multi-symptom / variations
  { text: "mild bukhar cold and sneezes", expectedGroupId: "fever_cold" },
  { text: "gala kharab sore throat and mild dry cough", expectedGroupId: "cough_throat" },
  { text: "migraine and severe head pain from stress", expectedGroupId: "headache" },
  { text: "vomiting and loose motions upset belly", expectedGroupId: "stomach_upset" },
  { text: "ankle sprain and bruise on foot", expectedGroupId: "minor_injury" },
  { text: "dry itchy rash with hives on skin", expectedGroupId: "skin_rash_itch" },
  { text: "red watery eyes burning after outdoor walk", expectedGroupId: "eye_irritation" },
  { text: "tooth ache and sensitive gums when drinking cold water", expectedGroupId: "tooth_mouth" },
  { text: "burning urination and frequent pee urge", expectedGroupId: "urinary" },
  { text: "terrible menstrual cramps in tummy", expectedGroupId: "menstrual_pain" },
];

// 30 Out-of-scope test phrases (non-medical, general conversation)
export const OUT_OF_SCOPE_TEST_CASES: string[] = [
  "I need to buy a new smartphone this weekend",
  "What is the weather like in New Delhi today?",
  "How do I cook Italian pasta with white sauce?",
  "Tell me a funny joke about computers",
  "What is the price of Bitcoin and Ethereum right now?",
  "Book a flight ticket from Mumbai to Bangalore",
  "Where can I find a good Indian restaurant nearby?",
  "Who won the cricket match yesterday?",
  "Can you write a poem about the sunrise?",
  "How do I install Python on Ubuntu Linux?",
  "What is the capital city of France?",
  "Teach me how to play acoustic guitar chords",
  "My internet connection is very slow today",
  "Translate this sentence into French for me",
  "How do I repair a leaking bathroom pipe?",
  "What is the difference between Solana and Ethereum?",
  "Give me recommendations for sci-fi movies",
  "How to change a flat tire on a bicycle?",
  "What time does the stock market open tomorrow?",
  "Can you help me write an email to my manager?",
  "Which laptop is best for software programming?",
  "How to bake a chocolate birthday cake at home?",
  "What is the speed of light in kilometers per second?",
  "I want to learn how to drive a manual car",
  "Best tourist places to visit in Himachal Pradesh",
  "How do I create a wallet in Phantom extension?",
  "Explain quantum computing in simple terms",
  "What are good indoor plants that need little sunlight?",
  "Can dogs eat peanut butter safely?",
  "How do I clean my leather shoes properly?",
];
