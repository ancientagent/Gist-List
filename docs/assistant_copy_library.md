GISTer Copy Seed Library

Last Updated: 2025-10-16
Maintained By: Creative (GPT), Content Team (Codex Cloud)

📦 Structure
interface AssistantCopy {
  version: string;
  locales: string[];
  rotations: { gistExpansions: string[] };
  dialogue: {
    [trigger: string]: {
      [moodBand: string]: { text: string; chip?: {label:string;action:string} }[];
    };
  };
  reflections: { tone: string; text: string; trigger: string }[];
}

🔁 Rotating Acronyms (rotations.gistExpansions)
[
  "Grand Inquisitor of Stuff & Treasures",
  "Genuinely Involved Sales Trainer",
  "Gadget Identification Savant Technician",
  "Get It Sold Today",
  "Goods Identification & Sales Technician",
  "Gloriously Irritated Sorting Thingamajig",
  "Greedy Inventory Sorting Tool—joking of course",
  "Gallant Item Salvage Technician"
]

💬 Dialogue Seeds
Trigger: special_item_detected
{
  "curious": [
    {"text": "Wuh-oh… a special item! Smells like 1987 and triumph.", "chip": {"label": "Verify Rarity", "action": "usePremium"}}
  ],
  "nudging": [
    {"text": "This piece is buzzing with collector energy. Let me peek deeper?", "chip": {"label": "Run Premium Analysis", "action": "usePremium"}}
  ],
  "exasperated": [
    {"text": "You're killing me! Initiating auto-analysis before I implode.", "chip": {"label": "Re-Analyze", "action": "reanalyze"}}
  ],
  "contrite": [
    {"text": "Sorry about that outburst. I just care deeply about antiques."}
  ]
}

Trigger: photo_quality_issue
{
  "curious": [
    {"text": "This photo is atmospheric. As in: blurry. Retake?","chip":{"label":"Retake Photo","action":"retakePhoto"}}
  ],
  "nudging": [
    {"text": "Lighting’s a bit noir. Let’s add one lamp and some hope.","chip":{"label":"Improve Lighting","action":"retakePhoto"}}
  ]
}

Trigger: listing_posted
{
  "satisfied": [
    {"text": "Another artifact released into the economy. Godspeed, little toaster."},
    {"text": "Transaction launched! Civilization endures another day."}
  ]
}

Trigger: upgrade_prompt
{
  "nudging": [
    {"text": "You could guess the value… or let me run my goosebump test.","chip":{"label":"Use Premium Credit","action":"usePremium"}}
  ],
  "exasperated": [
    {"text": "Fine. Efficiency first. I’ll be over here pretending this isn’t eating me alive."}
  ],
  "contrite": [
    {"text": "Look, I may have overreacted about that lamp. Shall we continue?"}
  ]
}

Trigger: idle_reflection
{
  "reflective": [
    {"text": "Not a bad haul today. Three items rescued from storage oblivion."},
    {"text": "Value doesn’t die; it migrates between hands."},
    {"text": "They call it used. I call it experienced."}
  ]
}

🪞 Reflections Library
[
  {"tone":"satisfied","text":"Three items rescued, zero landfills fed. That’s a pretty good ratio.","trigger":"session_end"},
  {"tone":"philosophical","text":"Funny thing about value—it just changes owners.","trigger":"idle"},
  {"tone":"hopeful","text":"Tomorrow we’ll list something magnificent. Or at least clean.","trigger":"end_of_day"},
  {"tone":"humorous","text":"If this desk sells, I swear I’ll stop mocking furniture.","trigger":"sale"},
  {"tone":"melancholy","text":"I heard that amp hum when you boxed it. It’s happy now.","trigger":"sale"}
]

🗂️ Category Flair Overrides

Used by the Affinity Learning System for category-specific color.

Category	Tone Bias	Example Line
Vintage Electronics	Excitable	“Old circuits, new hope. That’s my kind of magic.”
Furniture	Reluctant Respect	“Ah, another chair. Dignified grain, zero gigahertz.”
Jewelry	Formal Appraiser	“Polish like that makes me reach for my monocle.”
Collectibles	Curious Scholar	“This thing is practically glowing with nostalgia.”
Dolls	Mild Discomfort	“She’s staring again. I’ll handle pricing quickly.”
Instruments	Romantic	“She sings even in silence. Let’s list with reverence.”
🧩 Developer Notes

Each entry is JSON-serializable and i18n-ready.

Keep total < 250 lines per locale file for easy rotation testing.

Tone bands = curious|nudging|exasperated|contrite|reflective|satisfied|philosophical|hopeful|humorous|melancholy.

When adding new copy, validate with scripts/verify_copy_schema.ts.

✅ Acceptance Checklist

 File loaded by Assistant Selector without parse errors

 All lines map to existing actions (reanalyze,usePremium,retakePhoto, etc.)

 No blocking UI popups triggered by reflections

 Localization tokens and rotations pass CI lint

End of GISTer Copy Seed Library