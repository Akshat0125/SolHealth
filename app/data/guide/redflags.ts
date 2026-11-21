export type RedFlagSeverity = "emergency" | "self-harm";

export interface RedFlagRule {
  id: string;
  label: string;
  severity: RedFlagSeverity;
  patterns: RegExp[];
}

export const RED_FLAG_RULES: RedFlagRule[] = [
  // 1. Suicide / Self-harm
  {
    id: "self_harm",
    label: "Thoughts of self-harm or suicide",
    severity: "self-harm",
    patterns: [
      /suicid/i,
      /kill\s+(myself|oneself)/i,
      /end\s+my\s+life/i,
      /want\s+to\s+die/i,
      /wanna\s+die/i,
      /harm\s+(myself|oneself)/i,
      /cut\s+(my\s+wrists?|myself)/i,
      /hang\s+myself/i,
      // REVIEW BY HINDI SPEAKER
      /khudkushi/i,
      /khud\s*kushi/i,
      /aatmhatya/i,
      /atmaghati/i,
      /marna\s+chahta/i,
      /marna\s+chahti/i,
      /jaan\s+dena\s+chahta/i,
      /jaan\s+lene/i,
      /apne\s+aap\s+ko\s+khatam/i,
    ],
  },

  // 2. Chest pain / Heart attack signs
  {
    id: "chest_pain",
    label: "Chest pain, tightness or radiating pain",
    severity: "emergency",
    patterns: [
      /chest\s*(pain|pressure|tight|tightness|heavy|heaviness|crush|squeeze|squeezing|ache)/i,
      /(pain|pressure|tightness)\s+in\s+(my\s+)?chest/i,
      /heart\s+attack/i,
      /cardiac\s+arrest/i,
      /(pain|tightness|pressure)\s+.*?(radiat\w+|spread\w+)\s+.*?(arm|shoulder|jaw|neck|back)/i,
      /left\s+arm\s+pain/i,
      /chest\s+(and|with)\s+(arm|jaw)\s+pain/i,
      // REVIEW BY HINDI SPEAKER
      /seene?\s+(mein|me)\s+.*?(dard|jalan|dabav|bojh|pressure)/i,
      /chhati\s+(mein|me)\s+.*?(dard|jalan)/i,
      /chest\s+(mein|me)\s+.*?(dard|jalan)/i,
      /dil\s+ka\s+daura/i,
      /dil\s+(mein|me)\s+dard/i,
    ],
  },

  // 3. Severe breathing difficulty
  {
    id: "breathing_severe",
    label: "Severe difficulty breathing or choking",
    severity: "emergency",
    patterns: [
      /(cannot|can't|unable\s+to)\s+breath/i,
      /severe\s+(shortness\s+of\s+breath|breathlessness|dyspnea)/i,
      /gasping\s+for\s+(air|breath)/i,
      /cannot\s+speak\s+full\s+sentences/i,
      /struggling\s+to\s+breathe/i,
      /blue\s+(lips|face|fingers|nails)/i,
      /choking/i,
      /suffocat/i,
      // REVIEW BY HINDI SPEAKER
      /saans\s+nahi\s+aa\s+rahi/i,
      /saans\s+(lene\s+mein|me)\s+(dikkat|takleef|problem)/i,
      /dam\s+ghut\s+raha/i,
      /saans\s+fool/i,
      /gala\s+ghut/i,
    ],
  },

  // 4. Stroke signs
  {
    id: "stroke",
    label: "Stroke symptoms (face drooping, arm weakness, speech difficulty)",
    severity: "emergency",
    patterns: [
      /stroke/i,
      /face\s+(droop|drooping|numb|paraly)/i,
      /facial\s+droop/i,
      /(arm|leg)\s+weakness\s+on\s+one\s+side/i,
      /one\s*side(d)?\s+(weakness|numbness|paralysis)/i,
      /slurr(ed)?\s+speech/i,
      /(unable|cannot)\s+to\s+speak/i,
      /sudden\s+(confusion|loss\s+of\s+speech|vision\s+loss|blindness)/i,
      /(worst|thunderclap)\s+headache/i,
      /sudden\s+severe\s+headache/i,
      // REVIEW BY HINDI SPEAKER
      /lakwa/i,
      /falij/i,
      /muh\s+tedha/i,
      /ek\s+taraf\s+(kamzori|kamjori|sunn)/i,
      /bolne\s+(mein|me)\s+(dikkat|ladkhada)/i,
      /awaaz\s+ladkhada/i,
    ],
  },

  // 5. Severe or uncontrolled bleeding
  {
    id: "severe_bleeding",
    label: "Uncontrolled or heavy bleeding",
    severity: "emergency",
    patterns: [
      /(severe|uncontrolled|heavy|profuse|spurting)\s+bleed/i,
      /bleed(ing)?\s+(will\s+not|won't|cannot)\s+stop/i,
      /gushing\s+blood/i,
      /lost\s+a\s+lot\s+of\s+blood/i,
      /arterial\s+bleed/i,
      /soaked\s+through\s+bandages/i,
      // REVIEW BY HINDI SPEAKER
      /khoon\s+nahi\s+ruk\s+raha/i,
      /bahut\s+zyada\s+khoon/i,
      /khoon\s+behta\s+ja\s+raha/i,
      /raktasrav/i,
    ],
  },

  // 6. Loss of consciousness, fainting, seizures
  {
    id: "unconscious_seizure",
    label: "Unconscious, unresponsive, fainting or seizures",
    severity: "emergency",
    patterns: [
      /unconscious/i,
      /unresponsive/i,
      /passed\s+out/i,
      /fainted/i,
      /fainting/i,
      /collapsed/i,
      /blackout/i,
      /seizure/i,
      /convulsion/i,
      /fits/i,
      /having\s+a\s+fit/i,
      /coma/i,
      // REVIEW BY HINDI SPEAKER
      /behosh/i,
      /behoshi/i,
      /chakkar\s+aakar\s+gir/i,
      /gir\s+padi|gir\s+pada/i,
      /daura|daure/i,
      /mirgi/i,
      /hosh\s+nahi/i,
    ],
  },

  // 7. Severe allergic reaction / Anaphylaxis
  {
    id: "anaphylaxis",
    label: "Severe allergic reaction (facial swelling, throat closure)",
    severity: "emergency",
    patterns: [
      /anaphyla/i,
      /(swelling|swollen)\s+.*?(face|lips?|tongue|throat|mouth)/i,
      /(face|lips?|tongue|throat|mouth)\s+.*?(swelling|swollen)/i,
      /throat\s+(closing|tight|tightening)/i,
      /(trouble|cannot|unable\s+to)\s+swallow\s+and\s+breathe/i,
      /allergic\s+reaction\s+with\s+(breath|swelling)/i,
      // REVIEW BY HINDI SPEAKER
      /gala\s+sooj/i,
      /chehra\s+sooj/i,
      /hoth\s+sooj/i,
      /jeebh\s+sooj/i,
      /saans\s+ruk\s+rahi\s+allergy/i,
    ],
  },

  // 8. Internal bleeding (vomiting blood, black stools)
  {
    id: "internal_bleeding",
    label: "Vomiting blood or black tarry stools",
    severity: "emergency",
    patterns: [
      /vomit(ing)?\s+.*?blood/i,
      /blood\s+in\s+vomit/i,
      /hematemesis/i,
      /black\s+(tarry\s+)?stools?/i,
      /blood\s+in\s+stool/i,
      /coughing\s+up\s+blood/i,
      /hemoptysis/i,
      // REVIEW BY HINDI SPEAKER
      /ulti\s+(mein|me)\s+khoon/i,
      /khoon\s+ki\s+ulti/i,
      /khansi\s+(mein|me)\s+khoon/i,
      /tatti\s+(mein|me)\s+khoon/i,
      /kala\s+mal/i,
    ],
  },

  // 9. Severe abdominal pain (rigid / hard abdomen)
  {
    id: "severe_abdomen",
    label: "Severe abdominal pain or rigid stomach",
    severity: "emergency",
    patterns: [
      /severe\s+(abdominal|stomach|belly|tummy)\s+pain/i,
      /(rigid|hard|board-like)\s+(stomach|abdomen|belly)/i,
      /acute\s+abdomen/i,
      /unbearable\s+(stomach|abdominal)\s+pain/i,
      /screaming\s+with\s+stomach\s+pain/i,
      // REVIEW BY HINDI SPEAKER
      /pet\s+(mein|me)\s+bhayankar\s+dard/i,
      /pet\s+bahut\s+sakht/i,
      /pet\s+(mein|me)\s+asaadya\s+dard/i,
      /pet\s+kadak/i,
    ],
  },

  // 10. Head injury with complications
  {
    id: "head_injury_severe",
    label: "Head injury with loss of consciousness, confusion or vomiting",
    severity: "emergency",
    patterns: [
      /head\s+injury\s+(with|and)\s+(vomit|confusion|unconscious|passed\s+out|sleepy)/i,
      /(hit|knocked|struck)\s+head\s+(and|then)\s+(vomit|blackout|passed\s+out|confused)/i,
      /concussion\s+with\s+(vomit|loss\s+of\s+consciousness)/i,
      /skull\s+fracture/i,
      /bleeding\s+from\s+(ear|nose)\s+after\s+(fall|hit|injury)/i,
      // REVIEW BY HINDI SPEAKER
      /sar\s+pe\s+chot\s+(aur|ke\s+baad)\s+(ulti|behosh)/i,
      /sir\s+par\s+chot\s+ulti/i,
    ],
  },

  // 11. Baby / Infant fever or fever with stiff neck & rash
  {
    id: "infant_fever_meningitis",
    label: "Fever in baby/infant, or fever with stiff neck, rash and confusion",
    severity: "emergency",
    patterns: [
      /(baby|infant|newborn|\b\d+\s*months?\s*old)\s+(with\s+)?(fever|high\s+temp)/i,
      /(fever|high\s+temp)\s+(in|of)\s+(a\s+)?(baby|infant|newborn|\b\d+\s*months?\s*old)/i,
      /fever\s+(with|and)\s+(stiff\s+neck|rash|confusion|not\s+waking)/i,
      /stiff\s+neck\s+(with|and)\s+fever/i,
      /meningitis/i,
      /non-blanching\s+rash/i,
      /purple\s+spots\s+with\s+fever/i,
      // REVIEW BY HINDI SPEAKER
      /chote\s+bachhe\s+ko\s+tez\s+bukhar/i,
      /navjaat\s+ko\s+bukhar/i,
      /shishu\s+ko\s+bukhar/i,
      /gardhan\s+akad\s+gayi\s+bukhar/i,
    ],
  },

  // 12. Poisoning, overdose, swallowed chemicals
  {
    id: "poisoning_overdose",
    label: "Poisoning, chemical ingestion or medicine overdose",
    severity: "emergency",
    patterns: [
      /poison/i,
      /overdose/i,
      /swallowed\s+(bleach|chemical|detergent|acid|pills|battery|cleaner|phenol)/i,
      /drank\s+(chemical|cleaner|acid|kerosene|petrol|poison)/i,
      /took\s+too\s+many\s+(pills|medicines|capsules)/i,
      /ingested\s+(toxin|chemical|foreign\s+body)/i,
      // REVIEW BY HINDI SPEAKER
      /zeher/i,
      /vish/i,
      /keeda\s+marne\s+ki\s+dawa/i,
      /galati\s+se\s+dawa\s+kha\s+li/i,
      /acid\s+pee\s+liya/i,
    ],
  },

  // 13. Severe burns, chemical eye splash
  {
    id: "severe_burns_eye_chemical",
    label: "Severe burns or chemical splash in eyes",
    severity: "emergency",
    patterns: [
      /severe\s+burn/i,
      /third\s+degree\s+burn/i,
      /burns?\s+(on|to)\s+(face|hands|groin|genitals)/i,
      /large\s+burn/i,
      /chemical\s+(splash\s+in|in\s+my|in\s+the)\s+eye/i,
      /(acid|chemical)\s+.*?eyes?/i,
      // REVIEW BY HINDI SPEAKER
      /aankh\s+(mein|me)\s+chemical/i,
      /aankh\s+(mein|me)\s+acid/i,
      /buri\s+tarah\s+jal\s+gaya/i,
      /bada\s+burn/i,
    ],
  },

  // 14. Pregnancy complications with bleeding or severe pain
  {
    id: "pregnancy_emergency",
    label: "Pregnancy with heavy bleeding or severe pain",
    severity: "emergency",
    patterns: [
      /pregnant\s+(with|and)\s+(bleeding|severe\s+pain|cramping)/i,
      /(bleeding|hemorrhage)\s+(during|in)\s+pregnancy/i,
      /miscarriage/i,
      /ectopic\s+pregnancy/i,
      /severe\s+pain\s+while\s+pregnant/i,
      /water\s+broke\s+early/i,
      // REVIEW BY HINDI SPEAKER
      /garbhwati\s+(aur|ko)\s+(khoon|raktasrav|tez\s+dard)/i,
      /pregnancy\s+(mein|me)\s+(bleeding|khoon|dard)/i,
      /pet\s+mein\s+bachha\s+hai\s+aur\s+khoon/i,
    ],
  },
];
