# VICEHAVEN: Story Bible

**Working title of the campaign:** *Ten and Two*
**Protagonist:** Jay Mercer, 27, the best wheelman Vicehaven ever had.
**Scope:** 31 main missions in 4 acts (about 5 h 20 min), 4 side-story chains of 4 missions each (about 2 h 15 min), plus repeatable activities. Total: 7.5 h or more.

This is the single source of truth for the four writers scripting the acts in parallel. It follows `docs/mission-format.md` exactly: every scene is outdoors, in a car, or in a `blackout`. No interiors, no swimming, no player boats, motorbikes or aircraft. If a scene seems to need a room, stage it at a doorway, in a car park, on a porch, in a car, or on a black screen.

**Writer split (suggested):** Writer 1: Act 1 plus the *Night Shift* chain. Writer 2: Act 2 plus *The Wedding Car*. Writer 3: Act 3 plus *The Silver Foxes*. Writer 4: Act 4 plus *Dead Air*. Everyone shares the taxi fares and texts. Read sections 1 to 8 before writing a single line, then your act in section 9.

---

## 1. Logline, themes, tone

### Logline
Three years after he drove away from the job that killed his girlfriend's little brother, Vicehaven's greatest getaway driver comes home to bury his grandmother. He finds her house seized, his mentor about to walk out of prison, and a developer buying the city block by block with money Jay once helped steal. To save the people he left behind, he has to plan the one job he has never been able to do: the one where nobody gets left in the lot.

### Themes
- **Leaving versus staying.** Jay's father drove off when Jay was six. Jay drove off at 24. The whole game asks whether he can stop being the man who leaves. The final choice ("Drive", "Give it to the city", "Finish it") is that question answered.
- **Guilt, and the stories we tell ourselves about it.** Jay believes he abandoned Tommy. Mae believes she let Tommy down by not answering his call. Dex knows he killed Tommy with one phone call. Only one of them is right.
- **Loyalty and found family.** The crew is the family Jay built after the one he was born into fell apart. It is tested by a betrayal from inside it, and the player decides what loyalty costs.
- **What a city does to people.** Voss is not a monster in a tower. He was a dock kid whose father died on the job, and he has decided the city should never be able to hurt him again. Horne is a Saltmarsh boy who became the wall. Dex is a good man squeezed until he snapped. The city squeezes everybody. What they do then is who they are.
- **Memory and ownership.** Voss is buying the places where people's memories live: Nana Lu's house, the Starlite booth, Tommy's mural, Lantern Alley. The story keeps returning to the same few places so the player feels them being threatened.

### Tone
Sun-bleached neon noir with warmth and wit. Days are white heat and pastel paint peeling in the salt air. Nights are pink neon on wet asphalt and sodium light over the container stacks. People are funny because they are tired, scared or in love, not because they are cartoons. The violence has weight: people who get shot stay shot. Jokes come from character: Dex's pride in his lift, Noor's spreadsheets, Augie's running commentary on Jay's braking, Birdie's brutal honesty, Ansel's poetry.

Reference points for feel (not content): late-night radio, a diner at 3 a.m., a long drive with someone you used to love.

### Style rules for the writers
- **Lines** are `[speakerId, text]`, under about 180 characters. Split long speeches. Stage directions go in parentheses at the start: `'(not looking at him) You're late.'`
- **Speaker ids:** `jay`, `dex`, `mae`, `augie`, `noor`, `ansel`, `calder`, `horne`, `voss`, `rourke`, `teo`, `rhea`, `birdie`, `lourdes`, plus `tommy` and `nana_lu` (memories only) and `caption`. Minor characters use the ids in section 4.
- **Swearing:** natural, occasional, character-specific. Roughly one or two swears per scene, more when things go wrong, none when a moment needs to be clean. Use shit, damn, hell, bastard, asshole, piss and, rarely, fuck. No slurs, ever. Per-character guide: Dex swears freely and cheerfully, and never in front of Birdie (he says "fudge" and hates it). Mae swears precisely, when angry. Augie almost never swears, so when he does it lands. Noor swears in lists. Ansel never swears. Horne swears casually and cruelly. Voss never swears. Calder swears at her car.
- **Humour** is how these people cope. Put at least one real laugh in every mission, including the sad ones (especially the sad ones), but never undercut the loss itself in m21.
- **Jay's voice** is spare. He says less than he means. He talks to cars. He deflects with dry jokes and goes quiet when it matters. The player should feel him wanting to say something and not saying it, until the moments he finally does (m16, m19, m22, m31).
- **Callbacks** are the backbone: "Ten and two, heart at twelve"; "It's an investment"; "Tick tock"; "You're weather"; the valet vest; bay 14; the carved initials at the Starlite; the yellow hoodie. Use them where this bible marks them, and not so often they wear out.
- **Phone calls** carry exposition while driving. Put banter in `say` on driving steps so no drive is silent.

---

## 2. Backstory and timeline

The present story runs from **late August to 12 October**, over about seven weeks at the end of hurricane season. No year is ever named.

| When | What happened |
|---|---|
| 21 years ago | Jay (6) is left with his grandmother, **Lucinda "Nana Lu" Mercer**, on Heron Street, Palm Crescent. His father, Cal Mercer, a long-haul trucker, drives away and never comes back. His mother, Rhonda, dies three years later. |
| ~45 years ago | A teenage dock kid called **Harlan Voss** steals tomatoes from Nana Lu's garden. She catches him and feeds him plum cake instead. He never forgets it. (Revealed in m28.) |
| 15 years ago | Nana Lu teaches Jay (12) to drive in the car park of the Magnolia Motor Lodge: "Hands at ten and two. Heart at twelve." He meets **Dex Calloway** (19) at Dex's father's garage. |
| 12 years ago | **Augie Vance's** wife **Celia** dies of cancer while Augie is in county lockup on a short sentence. He misses her funeral. His son **Teo** (12) never forgives him. |
| 10 years ago | Jay (17) steals Augie's car and brings it back with a full tank and the seat adjusted. Augie hires him on the spot. Augie's crews never fire a shot: that is his rule and his pride. |
| 9 years ago | Jay and **Mae Reyes** start going out. Her little brother **Tommy** (10 then) worships Jay. |
| 8 years ago | **Birdie Calloway** is born. Her mother leaves when Birdie is two. |
| 4 years ago | **Captain Wade Horne** catches Dex running stolen parts for the docks. He offers a choice: prison and Birdie in foster care, or become confidential informant **"LUGNUT."** Dex takes the deal. His first payment becomes the down payment on a hydraulic lift. |
| 3 years ago, 30 Sept, 02:10 | **The Tidewater job.** A Tidewater Security armoured van at the Pier 9 transfer yard in Saltmarsh. The crew: Augie (plan), Jay (wheel), Dex (prepped the cars and knew the date), and Tommy Reyes (19, lookout). **Jay brought Tommy in** over Augie's objection. Dex, terrified, tipped Horne, who promised arrests at the gate and no guns. Instead Horne's unit arrived early. Tommy, unarmed in a yellow hoodie with a phone in his hand, was shot by Horne in **bay 14** at 02:11:04. Horne planted a throwdown pistol. Jay heard the shots, saw Tommy go down, and on Augie's scream of "Drive!" drove at 02:11:20. |
| That night | The van was carrying **$2.4 million in off-book cash**: Voss's bribe for the council's Old Market "Phase Two" vote. It also held **the Tally**, Voss's green leather ledger of 14 years of bribes. Tidewater reported the loss as $310,000, because Voss could not admit the rest existed. Augie hid both bags in Celia's vault at St. Brigid's churchyard. |
| 2 days later | Jay leaves Vicehaven before Tommy's funeral. He refuses his cut (Dex keeps $40,000 for him in a toolbox). |
| 9 days later | Augie is arrested (Horne traced the car). He takes the whole fall and names nobody. Sentenced to five years, he serves three. |
| 3 years | Jay drives refrigerated produce trucks inland at the speed limit, living in motels. Augie writes him 37 letters. **Jay never opens one.** The first letter says Tommy was already dead before Jay touched the gear stick. |
| Present, Day 1 (a Saturday, late August) | Nana Lu dies of a stroke at 81. Jay comes home for the funeral. The game begins. |
| Present, 30 Sept, 02:10 | The Tally exchange at the Tidewater lot, three years to the minute (m21). Augie dies. |
| Present, 11 Oct | The Crown opening gala at Voss's Crestline estate. The finale (m28 to m31) runs overnight into the dawn of 12 October, the morning of the Phase Two council vote. |

---

## 3. Synopsis

### Act 1: Homecoming (m01 to m08)
Jay Mercer steps off an inland coach under the golden Beacon in Civic Plaza, three years after he left, and is late for his grandmother's funeral. He steals a car to get there (the city remembers how he drives before it remembers his face). In the churchyard of St. Brigid's he meets the people he walked away from: **Dex**, his oldest friend, a big warm mechanic squeezed into a funeral suit, with his daughter **Birdie**; **Lourdes Reyes**, Tommy's mother, who hugs him, which is worse than anything; and **Mae**, Tommy's sister and the woman Jay loved, who tells him not to be sad at her. Across the road a detective watches from her car.

Jay means to stay a week. Then Halberd Security men rough up Dex's garage for Voss Meridian's "Renewal" survey. Then he finds Nana Lu's pink bungalow padlocked by **Pelican Home Equity** ($62,000 on a reverse mortgage she never told him about) and her life's belongings in a repo yard. He takes them back at night, and remembers her teaching him to drive.

To save the house Jay does what he is good at. Dex puts him with a crew: **Noor Haddad**, a fired city traffic engineer who can make the lights go green but failed her driving test four times, and **Ansel Boateng**, a former heavyweight who gardens and doesn't hit people any more. Jay defends Tommy's memorial mural at Casa Palma alongside Augie's resentful son **Teo** and his Lantern Kings, and learns the Renewal belongs to **Harlan Voss** personally. Dex hands Jay his old Tidewater cut from a toolbox, and Jay chooses to keep it for the house or leave it in Lourdes's mailbox (**Flag 1**). At a street race Jay meets **Captain Wade Horne**, who taps his gold watch ("Tick tock, Mercer"), then **Detective Ines Calder**, who timed his escape and wants to talk about Tommy. Noor plants a backdoor in the city's traffic system and mentions a police informant code-named LUGNUT. The act ends with the crew robbing Pelican Home Equity's flagship to pay off Nana Lu's house. As Jay sits on her porch swing, Dex calls: **Augie Vance** is being paroled, and he asked for Jay.

### Act 2: Old Engines (m09 to m16)
Augie walks out of VPD Central with a paper bag and a joke ("You're late. Three years late"). He is warm, funny and heartbreakingly glad to see Jay, and he hides the hurt of 37 unanswered letters behind jokes about his bowels. Halberd tries to box them in on the way to breakfast. Augie tries to reconcile with Teo at Lantern Alley and they end up holding it together against a Halberd sweep. A captured Halberd man reveals that Halberd's director, **Kessler Rourke**, wants to know what Augie did with the rest of Tidewater.

At 1:30 a.m. Jay decoys Horne's watchers away from St. Brigid's while Augie opens his wife's vault. Inside: $2.4 million and the Tally. The crew proves the ledger is real by stealing Councilman **Delmar Pruitt's** briefcase from his pool party (Jay in a valet vest parking a poodle). Calder asks Jay to intercept the Tidewater evidence box before Horne has it burned. In it is dashcam audio: Tommy saying "I'm not armed" and a shot from Horne's unit. Calder offers a deal (**Flag 2**).

Augie teaches Jay to case a job, and Birdie innocently mentions that the policeman with the gold watch gave her a sticker. The crew steals a Halberd armoured van for a future job and the police are waiting, too early. Someone talked. Suspicion falls on Noor. At 2 a.m. Mae calls Jay to the Starlite Diner. In their old booth she confesses she didn't answer Tommy's last call. He confesses he was the one who brought Tommy in. She walks out. On the drive home they pull a stranger from a burning car together without a word, and on the kerb at dawn Jay asks her something (**Flag 5**, minor).

### Act 3: The Tally (m17 to m24)
Augie runs a canary trap on his own crew and it catches Teo, who had spitefully told Voss's lawyer that "the old man has something of yours." Teo didn't know the depot night, though, so the question stays open. Halberd grabs Teo and takes him to the half-built Crown tower. At the top of the steel frame Jay must choose between saving Teo and stopping Rourke escaping with the location of the money (**Flag 3**).

At sunrise on Oceanview Pier Augie finally tells Jay what the first letter said: Tommy was dead before Jay drove. Three years of guilt break in one scene. Augie lays out the endgame: trade the Tally back to Voss for five million dollars and Voss's word to leave Old Market alone, at the Tidewater lot at 02:10 on the anniversary. Rhea Kostas's Salts agree to watch the exchange from the cranes after Jay does a sniper job for her.

The exchange is an ambush. Horne and Rourke come instead of Voss. In bay 14, where Tommy died, Augie is shot. This time **Jay goes back** across the lot under fire and gets him into the car. Augie dies in the back seat before they reach the ambulance bay, with Mae's hands on his chest. Rourke takes the Tally.

Noor (or Calder, if Jay trusted her) traces LUGNUT's payments to Calloway Auto. Jay tails Dex to a rooftop meet with Horne and hears the truth: Dex gave up Tidewater, and he gave up the exchange because Horne threatened Birdie. Halberd arrives to erase Dex. Mid-fight Jay decides Dex's fate (**Flag 4**). They bury Augie beside Celia. Voss's arsonists burn Calloway Auto to the ground. Teo hands Jay his father's notebook. Its last page is a plan: when Voss gets scared he moves the book, and when he moves it, it's a Tidewater. Hit it on the move. "You drive. You plan. You're better than me at both now."

### Act 4: Tidewater (m25 to m31)
Jay plans a job for the first time. He buys Rhea's containers by wiping out Halberd's dock post with grenades from a shipwreck. He steals Horne's second phone from his own cruiser (and leaves the cruiser, lights spinning, under the Beacon). The phone confirms the convoy: on the night of the Crown gala Voss will move the Tally and $30 million in bribe and exit money from his Crestline estate to a freighter at the docks, with Horne leading the escort. On the night before the job the crew builds a bonfire on the beach. Noor says the word "family" and wants to die. Jay says goodbye to Tommy's mural and Nana Lu's porch, and Mae decides she is coming as the crew's medic.

The finale runs over one night. In **The Garden Party** Jay goes back to the valet stand and slips through Voss's gardens to tag the convoy. Voss finds him by the infinity pool and tells him about the plum cake, then lets him go, because Jay is "weather". In **Tidewater, Again** the crew hits the convoy on Southshore Boulevard: Noor splits it with the lights, Rhea drops containers, Ansel's tow truck blocks the rear, and Jay runs down the lead van with the book and the money inside. In **Salt and Iron** Halberd and Horne's loyalists besiege the docks. Ansel stands up, Rourke falls from a crane walkway, and in bay 14 Horne is arrested for Tommy's murder or runs and is left chained to the gate he shot Tommy beside. In **Last Light** Jay chases Voss through Harbor Point at dawn to the end of Oceanview Pier, where Augie's letter was read, and Voss offers him everything if he will just do what he always does and drive.

The final choice and the earlier flags decide the ending: **Taillights** (he leaves, and maybe not alone), **The Long Way Home** (he gives the Tally to the city and faces his own sentence, and comes home to the people waiting at the gate), or **Wheelman** (he kills Voss and becomes the thing the city makes of people, alone in the Starlite booth while his phone rings).

---

## 4. Characters

Looks use the format-doc shape (`skin`, `hair`, `top`, `bottom`, `shoes`, `build`, optional `hat`). Voices use `gender`, `pitch` (0.6 to 1.4) and `rate` (0.85 to 1.15). Every major character has a want (what they chase), a wound (what hurt them), a secret (what they hide, and when it comes out) and an arc (how they end up different).

### 4.1 Jay Mercer (`jay`), 27. The wheelman
- **Look:** `{ skin: 0xa86b4c, hair: 0x1b1512, top: 0x6b4a32, bottom: 0x2c3440, shoes: 0xe6e1d6, build: 'average' }`. A worn brown leather driving jacket over a grey tee, dark jeans, off-white sneakers scuffed on the right toe from the pedal.
- **Voice:** `{ gender: 'male', pitch: 0.95, rate: 1.0 }`
- **Bio:** Raised by Nana Lu on Heron Street after his father drove off and never came back. Stole Augie Vance's car at 17 and returned it with a full tank, and was the city's best getaway driver by 21. After Tidewater he vanished inland for three years, hauling lettuce at the speed limit.
- **Want:** On the surface, to save Nana Lu's house, settle his debts and leave again. Underneath, to be forgiven by Mae, by Augie and by himself.
- **Wound:** Tidewater. He brought Tommy in ("Augie's jobs are clean"), heard the shots, and drove. And, older than that, a father's taillights.
- **Secret:** (1) The 37 letters from Augie, unopened, rubber-banded in his duffel. Revealed to Augie in m09 and opened in m19. (2) He was the one who recruited Tommy. Mae thinks Tommy found Augie on his own. Revealed to Mae in m16.
- **Arc:** "A week" (Act 1), then "for Augie" (Act 2), then "because I drove away once" (Act 3), then "I'm here" (Act 4). He goes from the man who only knows how to leave to the man who plans, stays, and goes back across the lot. The ending decides whether he keeps that.
- **Habits:** Talks to cars ("Easy. I'm giving you back. Mostly."). Calls Nana's car "Lulu". Won't drive off until everyone's seatbelt is on, and the joke becomes heartbreaking after m21.
- **Sample lines:**
  - "I don't do plans. I do the part after the plan goes wrong."
  - "Three years hauling lettuce at the speed limit. You have no idea what that does to a man."
  - "Seatbelt. No, I'm not joking. Seatbelt."
  - "(quietly) I heard it. I heard it, and I put it in gear."
  - "Same job. Same driver. Different ending."

### 4.2 Dex Calloway (`dex`), 34. The mechanic, Jay's oldest friend, the betrayer
- **Look:** `{ skin: 0x8d5a3b, hair: 0x1a1410, top: 0x2f4f6f, bottom: 0x3a3a3a, shoes: 0x222222, build: 'heavy' }`. Navy coveralls with the sleeves tied round his waist, a grease rag in his back pocket, reading glasses on a cord he's embarrassed by.
- **Voice:** `{ gender: 'male', pitch: 0.85, rate: 0.95 }`
- **Bio:** Runs Calloway Auto in Old Market, the garage his father lost to the bank and Dex bought back. A single dad to Birdie, the funniest man in any room, and the one who taught Jay to change oil at 12.
- **Want:** Keep Birdie safe. Keep the garage. Keep Jay from ever finding out.
- **Wound:** His father lost the family garage to a bank and drank himself to death in the car park across the street. Dex has been terrified of losing everything for 20 years.
- **Secret:** He is CI "LUGNUT". Four years ago Horne caught him running stolen parts and threatened prison and Birdie in foster care. Dex gave Horne the Tidewater date on the promise of arrests at the gate and no guns. In Act 3 Horne shows him a photo of Birdie's school, and Dex gives up the exchange as well. The brand-new lift was his first payment. Revealed in m22.
- **Seeds (writers must plant all of these):** the lift that doesn't match the peeling paint (m01, "It's an investment"); knowing Jay's motel room number (m03); jumpiness at patrol cars and texts from "H", who he says is "Hector, landlord" (m05); a VPD cruiser pulling out of his lot (m05); missing the Pelican job for "Birdie's recital", which doesn't exist (m08); Birdie's gold-watch sticker (m14); Augie telling Dex the depot date so he can cut a key (m14); steering suspicion onto Noor (m15); his canary spot not being hit (m17).
- **Arc:** From hiding, to confession ("He promised me. I believed a cop, like an idiot"), to whatever Jay decides: forgiveness earned under fire, exile with a last gift, or testimony and prison.
- **Sample lines:**
  - "It's not a lift, it's an investment. Say hi to the investment."
  - "You don't get to come back smelling like highway and tell me how to live."
  - "Fudge. Fudging... Birdie, go wait in the truck. FUDGE."
  - "(quietly) He said nobody would get hurt, Jay. He promised me. I believed a cop, like an idiot."
  - "I've been paying for that lift every day for four years. I can't even look at it."

### 4.3 Mae Reyes (`mae`), 28. Paramedic, Tommy's sister, Jay's ex
- **Look:** `{ skin: 0xc48a62, hair: 0x2a1a14, top: 0x2a3f6b, bottom: 0x1f2733, shoes: 0x111111, build: 'slim' }`. Navy Vicehaven Fire and Rescue uniform shirt, hair scraped back, a watch with a second hand, always.
- **Voice:** `{ gender: 'female', pitch: 1.1, rate: 1.05 }`
- **Bio:** Drives and works Medic 12 out of St. Agnes Mercy General on nights. She has pulled more of this city out of wrecks than anyone alive, and she still lives two floors above her mother at Casa Palma.
- **Want:** To stop scraping kids off the road. To know what really happened to Tommy. (Secretly, to be allowed to stop being angry.)
- **Wound:** Tommy's death. She identified him.
- **Secret:** Tommy called her at 1:48 a.m. that night, 22 minutes before he died. She didn't pick up because she'd had a fight with Jay. The voicemail is him laughing: "Mae, I'm doing something stupid. Call me back." She has never deleted it. Revealed in m16.
- **Arc:** From "Don't be sad at me", to working beside Jay without a word at a burning car (m16), to fighting to save Augie (m21), to choosing to be on the final job as the medic "because somebody has to be there when you do something stupid." Whether she gets in the car at the end depends on the player.
- **Sample lines:**
  - "You don't get to be sad at me, Jay. Be sad somewhere else."
  - "I scrape this city off the road every night. Don't make me scrape you."
  - "(laughing despite herself) You still sing to the car. God. You're still you."
  - "I was so angry at you because I couldn't be angry at him. He was dead. You were just gone."
  - "Ask me when it's over."

### 4.4 Augie Vance (`augie`), 58. The planner, Jay's mentor. The devastating loss
- **Look:** `{ skin: 0xb07a55, hair: 0xb8b4ac, top: 0xe8dcc0, bottom: 0x5a4a3a, shoes: 0x3b2a1e, build: 'tall' }`. A cream linen shirt a size too big after prison, brown slacks, good shoes kept in a bag for three years.
- **Voice:** `{ gender: 'male', pitch: 0.75, rate: 0.9 }`
- **Bio:** Planned heists for 30 years and never fired a shot. That's his rule and his vanity. He took in a 17-year-old car thief and made him the best wheelman in the city, then did three years for Tidewater without naming a soul.
- **Want:** One last clean job that puts things right: money for Lourdes, Old Market left alone, and a son who will pick up the phone.
- **Wound:** Celia died while he was locked up, and he missed her funeral. Teo was 12.
- **Secret:** (1) The Tidewater bags and the Tally are in Celia's vault (revealed in m11). (2) He saw Tommy die before Jay drove, and wrote it in the first letter (revealed in m19).
- **Arc:** Comes home funny and hurt, teaches Jay to plan instead of just drive, tries to become a father to his real son, tells Jay the truth that frees him, and dies in the back of Nana Lu's car in the one job he planned with a gun in it. His notebook makes Jay the planner.
- **Sample lines:**
  - "A plan is just a list of things that won't happen, in the order they won't happen."
  - "You brake like an insurance adjuster now. What did they do to you out there?"
  - "I didn't raise you. Your grandmother did. I just taught you how to park."
  - "Kid. Kid. Look at me. You did not leave him. There was nobody there to leave."
  - "(fading) Seatbelt... I know. I know. Don't be a pain in the ass."

### 4.5 Noor Haddad (`noor`), 26. The eyes
- **Look:** `{ skin: 0xc9a07a, hair: 0x14100e, top: 0x7a2f5a, bottom: 0x2a2a2a, shoes: 0xf0a030, build: 'slim' }`. A plum windbreaker with too many pockets, a black bob, orange sneakers, and a laptop she hugs like a teddy bear.
- **Voice:** `{ gender: 'female', pitch: 1.2, rate: 1.12 }`
- **Bio:** A traffic engineer at the city's Signal Office until she flagged the Voss-funded "SmartFlow" contract as fraud and was fired for it. She can make the right lights go green, and she failed her driving test four times ("The last examiner prayed").
- **Want:** To prove she was right. To reopen Haddad Pharmacy, her father Sami's shop on Tannery Row, which the Renewal took. Sami now stocks shelves at a Voss-owned superstore.
- **Wound:** She was the whistleblower nobody believed. She learned that being right is worth nothing if you're alone.
- **Secret:** She has recorded every Signal Office meeting for two years, including Voss's people ordering the fraud. On its own it's useless. With the Tally it's a noose. She reveals it in m24.
- **Arc:** From "I'm a contractor, not a friend" to being accused of being the rat (m15) and nearly walking, to the bonfire where she says the word "family" and asks everyone to forget it (m27). In m27 Jay teaches her to drive in the beach car park, the same way Nana Lu taught him.
- **Sample lines:**
  - "I can't make every light green. I can make the right ones green, which is better, and also a felony."
  - "Statistically you should be dead. I made a spreadsheet. It has tabs."
  - "Shit, shit, shitting shit. Sorry. Left at Laurel. LEFT."
  - "I'm not crying. Vicehaven's air quality index is a disgrace."
  - "(mortified) I said family. Nobody heard that. Ansel, you didn't hear that."

### 4.6 Ansel Boateng (`ansel`), 41. The muscle who doesn't hit
- **Look:** `{ skin: 0x4a2e22, hair: 0x111111, top: 0x3d6b3d, bottom: 0x4a4036, shoes: 0x2b2b2b, build: 'heavy' }`. A green work shirt with soil on the knees of his khakis, shaved head, a seed packet always in his breast pocket.
- **Voice:** `{ gender: 'male', pitch: 0.7, rate: 0.88 }`
- **Bio:** A former heavyweight contender who killed a man in the ring at 29 with a legal punch and never hit anyone in anger again. He did muscle work for Augie years ago by standing in doorways. Now he tends the community garden in Laurel Park and writes poems he reads only to plants.
- **Want:** To open a flower stall, "Boateng Blooms", on Tannery Row. To protect people without hurting them.
- **Wound:** Reggie Solano, the fighter who didn't get up.
- **Secret:** Every month he sends money to Reggie's daughter, Lina, now at college. She doesn't know who it's from. He mentions it at the bonfire in m27; in Ending B she comes to the stall.
- **Arc:** In m30, to protect Mae and Noor, he has to stand up and fight for real. He does, and it costs him, but the lesson is that some things are worth standing up for, not that violence is good.
- **Sample lines:**
  - "Most fights end when you stand up. I'm very good at standing up."
  - "Roses are just thorns that got lucky. Like us."
  - "(gently) Put it down, son. You don't want to learn what I already know."
  - "He's asleep now. He'll be fine. He'll be embarrassed."
  - "I'm afraid of exactly two things. Regret and small dogs."

### 4.7 Detective Ines Calder (`calder`), 46. VPD Robbery-Homicide
- **Look:** `{ skin: 0xe0b899, hair: 0x7a5a3a, top: 0x8a8a7a, bottom: 0x2e2e36, shoes: 0x3a2a20, build: 'average' }`. A grey blazer she's slept in, brown hair with a grey streak she refuses to dye, and a coffee cup that is always empty.
- **Voice:** `{ gender: 'female', pitch: 0.9, rate: 0.95 }`
- **Bio:** Worked the Tidewater case, and six years sober. Drives an unmarked car she swears at and parks where she can watch without being watched.
- **Want:** To close Tidewater honestly and retire with her soul intact.
- **Wound:** When her partner Ray Okonkwo questioned Horne's shootings, he was forced out. She said nothing, to keep her pension.
- **Secret:** She signed the Tidewater report that said Tommy was armed. She knew it was wrong. She confesses to Jay in m13, before she offers the deal.
- **Arc:** From compromised to brave. With Flag 2 (`trusted_calder`) she breaks the roadblock in m21, confirms LUGNUT in m22, and arrests Horne in bay 14 in m30. Without it she works alone, and in m30 she arrives only in time to read Horne his rights at the gate Jay chained him to.
- **Sample lines:**
  - "Two minutes forty. I timed you. That's not a compliment, that's evidence."
  - "I don't want you, Mercer. You're a traffic violation with a nice smile."
  - "Every cop in this city has a price or a pension. I'm finding out which one I am."
  - "The report says the kid had a gun. The kid had a yellow hoodie and a phone."
  - "(to her car) Start, you piece of shit. Please. I'm asking nicely."

### 4.8 Captain Wade Horne (`horne`), 52. VPD Southside commander, Voss's cop
- **Look:** `{ skin: 0xd9a88a, hair: 0xc8c0b0, top: 0x1c2a44, bottom: 0x1c2a44, shoes: 0x0e0e0e, build: 'heavy' }`. VPD navy, a silver crew cut, a gold watch he taps when he's winning. Off duty (m06) he wears a salmon golf shirt, and the watch.
- **Voice:** `{ gender: 'male', pitch: 0.8, rate: 0.92 }`
- **Bio:** Decorated, quoted in the papers, and loved by the Chamber of Commerce. A Saltmarsh boy who decided he was the only wall between the city and the flood.
- **Want:** Commissioner. Voss promised it after the Phase Two vote.
- **Wound:** A drunk dockworker father and a childhood of being nobody. Order is the only thing he trusts.
- **Secret:** He shot Tommy and planted the throwdown gun. He runs LUGNUT. His second phone is in his cruiser's glovebox.
- **Arc:** From untouchable to exposed. He ends arrested on the spot where he killed Tommy (with Calder), chained to the Tidewater gate for the morning news (without her), and in Ending C replaced by a younger captain who taps his own watch at Jay.
- **Sample lines:**
  - "(tapping his watch) Tick tock, Mercer. Welcome home."
  - "Son, I don't need a reason. I've got a badge. The badge is the reason."
  - "Everyone's an informant. Most people just haven't been asked nicely yet."
  - "Right about here, wasn't it? Bay fourteen. They repainted it. I asked them to."
  - "And nobody got hurt who mattered."

### 4.9 Harlan Voss (`voss`), 61. Founder of Voss Meridian. The antagonist
- **Look:** `{ skin: 0xf0cdb0, hair: 0xe8e4dc, top: 0xf5f5f0, bottom: 0xf5f5f0, shoes: 0x7a5230, build: 'tall' }`. A white suit in a sweating city, swept white hair and tan loafers, and he never seems to perspire.
- **Voice:** `{ gender: 'male', pitch: 0.9, rate: 0.88 }` (slow, velvet, never raised)
- **Bio:** A Saltmarsh dock kid whose father was crushed under a badly slung load. He became the man who owns the cranes. His Renewal will turn Old Market and Harbor Point into glass, and the Crown, his tower at Meridian Yard, will be the tallest thing on the coast.
- **Want:** To finish the city. Make it "a place worth photographing", and make it never able to hurt him again.
- **Wound:** His father, and being poor in a place that romanticises being poor.
- **Secret:** The Tally, 14 years of bribes in his own handwriting ("Computers remember. Paper can burn"). He never destroyed it because it is his leash on everyone he bought. And one sentiment: Nana Lu fed him plum cake when he was a thief of 16. He has bought every house on Heron Street except hers.
- **Arc:** Untouchable, then amused, then cornered. At the end of the pier he is not frightened, only disappointed that Jay won't take the deal.
- **Sample lines:**
  - "Every city is a machine for turning poor people's memories into rich people's views."
  - "I don't hate you, Mr. Mercer. You're weather. I build for weather."
  - "Nostalgia is a tax the poor pay on things they never owned."
  - "Lucinda Mercer fed me plum cake the day I stole her tomatoes. I've bought every house on Heron Street but hers. Sentiment. I allow myself one."
  - "Take the money and drive. It's what you do. You'll be magnificent in some other city."

### 4.10 Kessler Rourke (`rourke`), 45. Director of Halberd Security
- **Look:** `{ skin: 0xe8c4a8, hair: 0x3a2a1a, top: 0x3a3f45, bottom: 0x2a2e33, shoes: 0x111111, build: 'tall' }`. Charcoal tactical polo with a small teal halberd, a buzz cut and a wedding ring he takes off before work.
- **Voice:** `{ gender: 'male', pitch: 0.85, rate: 1.0 }`
- **Bio:** A former military contractor who sells Voss "certainty". Halberd patrols the Renewal Zones in place of police, and does whatever Horne can't be seen doing.
- **Want:** Money, and to be the one Voss can't do without.
- **Wound:** He'd say he has none. (He has a daughter who won't speak to him. Nobody learns this except from his phone, if Jay takes it in m18.)
- **Secret:** He is skimming from Voss's Renewal budget. The ledger of it is on the phone he loses in m18 if Jay chases him.
- **Arc:** The professional who kills Augie (m21) without malice, "billing by the hour", and dies on Crane Row's gantry walkway (m30).
- **Sample lines:**
  - "Nothing personal. I bill by the hour."
  - "You drive. I plan for drivers."
  - "Mr. Vance, put the book on the ground and step back to the line. Thank you."
  - "Everybody's loyal until the invoice."

### 4.11 Teo Vance (`teo`), 24. Leader of the Lantern Kings, Augie's son
- **Look:** `{ skin: 0xb07a55, hair: 0x1a1410, top: 0xb3202a, bottom: 0x1a1a1a, shoes: 0xd4a017, build: 'slim' }`. A red bomber jacket with a gold lantern on the back, gold sneakers, and paint on his knuckles. He painted Tommy's mural.
- **Voice:** `{ gender: 'male', pitch: 1.05, rate: 1.08 }`
- **Bio:** Grew up in Lantern Alley. His crew is half gang, half neighbourhood watch, and fully broke. He paints the walls the Renewal wants to knock down.
- **Want:** To keep Old Market alive, and to be his own man and not his father's son.
- **Wound:** His mother died while his father was locked up. His father preferred the car thief.
- **Secret:** He has been meeting Voss's lawyer to sell the Lantern Alley leases for $400,000. Out of spite he told them "the old man's out, and he's got something of yours." That put Voss onto Augie, and he will carry it forever. Exposed in m17.
- **Arc:** From "my father's favourite" to Jay's brother. With `saved_teo` he is holding Augie's hand when he dies and hands Jay the notebook gently. With `chased_rourke` he throws it at Jay, and they come back together only in the endings.
- **Sample lines:**
  - "Look who's back. My father's favourite."
  - "You were the son he wanted. I'm just the one he had."
  - "Old Market doesn't need saving. It needs rent control and a better class of cop."
  - "Don't make it weird. It's a shotgun, not a hug."
  - "(at the grave) He left you the plans. He left me the watch. I think that's the right way round."

### 4.12 Rhea Kostas (`rhea`), 55. Boss of the Salts
- **Look:** `{ skin: 0xd8b090, hair: 0x8a8a8a, top: 0xc4561d, bottom: 0x1d2b4a, shoes: 0x3a2a1a, build: 'heavy' }`. Rust-orange overalls, a long grey braid, steel-toe boots, and her husband's watch cap in her pocket.
- **Voice:** `{ gender: 'female', pitch: 0.8, rate: 0.92 }`
- **Bio:** Runs Kostas Marine Salvage and, through it, the Saltmarsh Salts, dockers who smuggle because Voss's port sale will automate their jobs away. She fences, she lends, and she keeps her word exactly as far as she said it.
- **Want:** A port that belongs to the people who work it.
- **Wound:** Her husband Stavros died when a Voss-contracted crane failed. The company paid, and she still has the cheque, uncashed.
- **Secret:** She was going to fence the Tidewater cash for Augie three years ago, and she has sold information to Voss before ("Everyone in this port has sold something").
- **Arc:** From transactional rival to the woman who drops her own containers across Southshore Boulevard (m29) and says it was business.
- **Sample lines:**
  - "Sentiment is for people with dry feet."
  - "Everything in this port floats or sinks, Mercer. Pick."
  - "Augie's wheelman. You left him holding something heavy."
  - "(offering the rifle) Stavros's. He shot gulls. Badly."

### 4.13 Birdie Calloway (`birdie`), 8. Dex's daughter
- **Look:** `{ skin: 0x8d5a3b, hair: 0x1a1410, top: 0xf7c6c7, bottom: 0x3a6b8f, shoes: 0xffffff, build: 'slim' }`. Pink tee, denim overalls, white sneakers, two hair puffs. Always holding something she's not supposed to have (a spark plug, a VPD sticker, Augie's poker chips).
- **Voice:** `{ gender: 'female', pitch: 1.4, rate: 1.1 }`
- **Role:** She says the truest thing in every scene without knowing it, and she carries the seed that breaks the betrayal: "Daddy says the policeman with the gold watch is our friend. He gave me a sticker." (m14)
- **Sample lines:**
  - "Are you a criminal? Daddy says you were 'between opportunities.'"
  - "You drive like Daddy yells."
  - "Mr. Augie cheats at cards. I cheat better."

### 4.14 Lourdes Reyes (`lourdes`), 57. Tommy and Mae's mother
- **Look:** `{ skin: 0xc48a62, hair: 0x5a4a44, top: 0xe8a0a8, bottom: 0x4a4a5a, shoes: 0x6b4a3a, build: 'average' }`
- **Voice:** `{ gender: 'female', pitch: 1.0, rate: 0.9 }`
- **Role:** She feeds the Casa Palma courtyard cats and forgives Jay far too easily, which hurts him more than Mae's anger does. She is the moral gravity of the Reyes family. Flag 1 goes to her mailbox.
- **Sample lines:**
  - "Tommy chose. He always chose, that boy. Even the stupid things. Especially the stupid things."
  - "He liked you best. Don't tell Mae I said so. She knows."

### 4.15 Memories only (in `blackout` scenes)
- **Tommy Reyes (`tommy`), 19 at death.** `{ skin: 0xc48a62, hair: 0x1a1410, top: 0xf2c14e, bottom: 0x3a4a5a, shoes: 0xd9d9d9, build: 'slim' }`, voice `{ gender: 'male', pitch: 1.15, rate: 1.1 }`. The yellow hoodie is the game's most important piece of costume. He was funny, reckless, adored Jay and wanted money for his mother's knee operation. He appears in m13 (audio), m16 (voicemail) and the Ending B epilogue (one line, imagined). Voicemail line: "Mae, I'm doing something stupid. Call me back. (laughing) I love you, okay? Weirdo."
- **Nana Lu Mercer (`nana_lu`), 81 at death.** Voice `{ gender: 'female', pitch: 0.95, rate: 0.88 }`. A former school-bus driver who took no nonsense and baked plum cake. Line: "Hands at ten and two. Heart at twelve." "What's at twelve?" "Wherever you're going, baby. Keep your heart pointed at it."

### 4.16 Minor characters
| id | Name, age | Role | Notes |
|---|---|---|---|
| `ilunga` | Father Emmanuel Ilunga, 66 | Priest at St. Brigid's | Buried Nana Lu and buries Augie. Dry and kind: "I hear confessions Tuesdays. For you I'd open Monday." |
| `oyelaran` | Grace Oyelaran, 74 | Nana Lu's neighbour on Heron Street | Watched the repo men. Keeps Nana Lu's key under her own mat. |
| `pruitt` | Councilman Delmar Pruitt, 58 | Bribed councilman, Crestline | Sweats through linen. Has a bronze statue of his own dog. |
| `garza` | Luis "Lucky" Garza, 33 | Halberd field lieutenant | Captured in m10. His luck runs out on a regular basis. |
| `dot` | Dorothy "Dot" Pike, 70 | Night waitress at the Starlite | Remembers everyone's usual. Remembers Jay and Mae's. |
| `wick` | Wick Adeyemi, 15 | Lantern Kings runner | Stabbed in Night Shift 1, and a turf-war regular. |
| `sami` | Sami Haddad, 67 | Noor's father | Appears in m27 and Ending B, when the pharmacy reopens. |
| `gus` | Gus Ferreira, 61 | Mae's Medic 12 partner | Weeks from retirement, and a bad back. Night Shift chain. |
| `lefty` `walt` `duke` | Loretta "Lefty" Marchetti, 71; Walt Pomeroy, 78; Duke Fairweather, 75 | The Silver Foxes | A retired robbery crew. Chain 2. |
| `iggy` | Ignatius "Iggy" Pell, 76 | A retired wedding chauffeur | Chain 4. His car is called Constance. |
| `tasha` `marcus` | Tasha Pell, 27; Marcus Idowu, 29 | Iggy's granddaughter and her groom | Chain 4. |
| `solace` | Lorna "Solace" Achebe, 39 | Pirate DJ of "Radio Free Vicehaven" | Chain 3. Hijacks Harbor Heat after midnight. |
| `priya` | Priya Venkataraman, 31 | A council aide turned leaker | Chain 3. |
| `saff` | Saffron "Saff" Achterberg, 23 | Pulse 96.4's sponsored racer | Races and trash talk. |
| `blackwood` | Honor Blackwood, 50 | Blackwood Bail Bonds: "We Believe In You (Conditionally)" | Bounty giver. |
| `hollis` | Hollis Crane, 44 | Crestline valet captain | m12 and m28: "You again? You parked a poodle." |
| `fare` | (various) | Taxi passengers | Section 11. |

---

## 5. Factions

| id | Name | Colours | Turf | What they want |
|---|---|---|---|---|
| `halberd` | **Halberd Security** | charcoal `0x3a3f45`, white `0xe8e8e8`, teal `0x1fa3a3` | Downtown, the Renewal Zones, the Halberd docks depot | Voss's private army, led by Kessler Rourke. They want the police contract for the whole city. On the street they're "community liaisons" in polos. On the job they're ex-military with rifles. They escalate across the game: fists (m01), pistols (m04), SMGs (m07), rifles and snipers (m21 onward), armoured `bulwark`s (Act 4). |
| `kings` | **The Lantern Kings** | red `0xb3202a`, gold `0xd4a017` | Lantern Alley and Tannery Row, Old Market | Teo Vance's crew of about 40, aged 15 to 30. Half gang, half neighbourhood watch. They sell knock-offs and tag walls, and they're the only people who stand between Old Market and the bulldozers. Drive `lowrider`s and `beater`s. Hostile in turf wars only. Allies in the story. |
| `salts` | **The Saltmarsh Salts** | navy `0x1d2b4a`, rust orange `0xc4561d` | Saltmarsh Docks: Crane Row, Kostas Salvage | Rhea Kostas's dockers turned smugglers. They want the port to stay a place where people work, not an automated terminal Voss sells to a shipping fund. Neutral and transactional, and allies from m20. Drive `mesa`s and `hauler`s. |
| `vpd` | **Vicehaven Police Department** | navy `0x1c2a44`, white `0xf2f2f2`, gold badge `0xc9a227` | Everywhere. Central Precinct on Lantern Street | Most officers are just cops. **Southside Division** under Captain Horne is Voss's, and its units respond suspiciously fast wherever the crew is. Detective Calder works out of Central's Robbery-Homicide. Police cars: `interceptor`, `unmarked` (Calder's is dark green `0x2f4a3a`), `bulwark` at heat 5. |

Voss Meridian itself is a company, not a gang. Its visible face is billboards ("THE CROWN: RISE WITH US"), survey crews in hard hats, and Pelican Home Equity, its lending arm.

---

## 6. Places

The built-in places are used heavily: `civic_plaza` (the Beacon; coach stop in m01, courthouse steps, Horne's cruiser in m26), `meridian_yard` (the half-built Crown tower, m18), `founders_park` (the wedding gazebo), `vicehaven_tower` (Voss Meridian HQ forecourt), `oceanview_pier` (m19 and m31), `the_boardwalk`, `grand_avenue`, `meridian_boulevard`.

New places (32). Keep these ids exactly.

| id | district | kind | Description |
|---|---|---|---|
| `dex_garage` | oldmarket | garage | Calloway Auto: roll-up doors, a brand-new hydraulic lift that doesn't match the peeling paint, and a tired neon sign reading CALLOWAY AUTO with the second L dead. |
| `st_brigid_church` | oldmarket | church | St. Brigid of the Market: a cracked bell tower, leaning headstones under bougainvillea, and the Vance family vault guarded by a stone angel with no nose. |
| `lantern_alley` | oldmarket | alley | The Lantern Kings' alley: strings of red paper lanterns over dumpsters, a mural of a crowned lantern, and a noodle cart that never closes. |
| `tannery_row` | oldmarket | storefront | Tannery Row market: striped awnings, fish on ice, knock-off sneakers, and a Voss Renewal notice stapled to every post. |
| `haddad_pharmacy` | oldmarket | storefront | The boarded-up Haddad Pharmacy, its green cross still hanging, with RENEWAL: COMING SOON pasted over the door. |
| `anchor_rooftops` | oldmarket | rooftop | Flat tar roofs over Anchor Street: water tanks, pigeon coops, satellite dishes, and gaps just narrow enough to jump. |
| `market_scrapyard` | oldmarket | warehouse | Big Otto's scrapyard: cars crushed and stacked four high, a magnet crane, and a guard dog called Duchess who is mostly retired. |
| `nana_lu_house` | palmcrescent | apartment_front | Nana Lu's pink bungalow on Heron Street: feral bougainvillea, a porch swing that squeaks on the left, and a Pelican notice taped to the door. |
| `casa_palma` | palmcrescent | apartment_front | The Casa Palma apartments: a courtyard with a dry fountain, laundry on every balcony, and a three-storey mural of Tommy Reyes in his yellow hoodie. |
| `magnolia_motel` | palmcrescent | motel | The Magnolia Motor Lodge: $49 a night, a pool full of leaves, a sign that only says VACAN. Jay's in room 12. Nana Lu taught him to drive in this car park. |
| `laurel_park` | palmcrescent | park | Laurel Park: a cracked basketball court, Ansel's community garden in raised beds, and a bench with a plaque for someone nobody remembers. |
| `mercy_general` | palmcrescent | hospital_front | St. Agnes Mercy General: the ambulance bay where Medic 12 parks, a smokers' bench, and a vending machine that eats coins. |
| `pelican_repo_yard` | palmcrescent | parking | Pelican Home Equity's repo lot: chain-link, razor wire, floodlights, a guard hut, and whole lives stacked under tarps. |
| `heron_corner` | palmcrescent | corner | Heron and Coral: a corner store with a flickering lotto sign where every street race in the city has started since forever. |
| `pelican_bank` | downtown | bank | Pelican Home Equity's flagship on Grand Avenue: a gold pelican logo, marble steps, and a banner reading YOUR HOME, OUR FUTURE. |
| `vpd_central` | downtown | police_station_front | VPD Central Precinct on Lantern Street: brutalist concrete, a crooked flagpole, a row of cruisers, and one bench for the families who wait. |
| `grand_parkade` | downtown | parking | The Grand Parkade: seven levels of spiral ramps and bad lighting. The roof is where people meet when they don't want to be seen. |
| `signal_office` | downtown | rooftop | The city's traffic-signal relay on an office rooftop: humming cabinets, antennas, and a Halberd guard who hates the night shift. |
| `goldline_exchange` | downtown | storefront | Goldline Bullion and Pawn: gold lettering, a doorman in a waistcoat, and an evening cash drop at 21:15 sharp. |
| `last_resort_bar` | harborpoint | bar | The Last Resort: the pink-neon patio bar of the faded Hotel Paloma, where the crew plans jobs under a neon flamingo that buzzes like a wasp. |
| `starlite_diner` | harborpoint | diner | The Starlite Diner: chrome, a sputtering star on the roof, open 24 hours, and a window booth where Jay and Mae carved J+M. |
| `seawall_overlook` | harborpoint | overlook | The seawall bend at the end of Pelican Avenue, where the skyline reflects in the bay like a circuit board. Calder's favourite place not to be seen. |
| `harbor_beach` | harborpoint | beach | The strip of sand under the seawall: driftwood, bonfire rings, kids with speakers, and the pier lights out on the water. |
| `bayview_gardens` | harborpoint | apartment_front | Bayview Gardens retirement residences: a pastel courtyard, shuffleboard, and a Pelican "Golden Years Equity" banner. Home of the Silver Foxes. |
| `tidewater_lot` | saltmarsh_docks | parking | The Tidewater Security transfer yard at Pier 9: floodlights, a chain-link gate, a guard booth, and bay 14, where the paint is newer than the rest. |
| `kostas_salvage` | saltmarsh_docks | warehouse | Kostas Marine Salvage: a rust-orange warehouse full of ship parts with its doors rolled open. Rhea runs the Salts from a pallet desk. The crew's base in Act 4. |
| `crane_row` | saltmarsh_docks | dock | Crane Row: container stacks in five colours, gantry cranes on rails, and walkways forty metres up. |
| `halberd_depot` | saltmarsh_docks | warehouse | Halberd's docks depot: grey hangars, a motor pool of armoured vans, a teal halberd logo, and cameras everywhere. |
| `drydock_slip` | saltmarsh_docks | construction | The old shipyard slip: a half-built hull on blocks, scaffolding, and welders' sparks falling like slow rain. |
| `voss_estate` | crestline_estates | mansion | Belvedere, Voss's estate: white columns, an infinity pool over the whole city, topiary lions, and a motor court. |
| `pruitt_house` | crestline_estates | mansion | Councilman Pruitt's Spanish-revival villa: Sunday pool parties, a valet stand, and a bronze statue of his own dog. |
| `crestline_overlook` | crestline_estates | overlook | The lookout on Crestline Drive where the estates end and the city lies below, bright as spilled change. |
| `horne_house` | crestline_estates | mansion | Captain Horne's too-nice house at the edge of Crestline: a flagpole, a boat on a trailer he never takes out, and a cruiser in the drive. |

### 6.1 Recurring mission vehicles
| Mission id | Type | Colour | What it is |
|---|---|---|---|
| `lulu` | `lowrider` if it reads as a classic coupe, otherwise `ironclad` (car team to confirm) | deep teal `0x1f6f6a` | Nana Lu's long, low two-door, 30 years old and immaculate. Jay's car for the whole game. It must survive to the endings. |
| `dex_tow` | `mesa` | mustard `0xc9a227` | Dex's tow pickup, with CALLOWAY AUTO on the doors. |
| `medic12` | `medic` | white with red stripe | Mae's ambulance. |
| `calder_car` | `unmarked` | dark green `0x2f4a3a` | Calder's car, which she swears at. |
| `horne_cruiser` | `interceptor` | VPD livery | Horne's own cruiser. Stolen in m26. |
| `voss_car` | `sovereign` | pearl white `0xf5f5f0` | Voss's car. Chased in m31. |
| `halberd_suv` | `ironclad` | charcoal `0x3a3f45` | Halberd patrols. |
| `halberd_van` | `bulwark` | charcoal with teal stripe | Halberd armoured cash vans (and the convoy). |
| `teo_ride` | `lowrider` | candy red `0xb3202a` | Teo's car. |
| `constance` | `halcyon` | cream `0xefe6d0` | Iggy's wedding car (Chain 4). |
| `foxes_car` | `beater` | faded mint `0x9fc9b0` | The Silver Foxes' 40-year-old getaway car (Chain 2). |
| `solace_van` | `porter` | purple `0x5a2f7a`, faded ice-cream-van decals | Solace's transmitter van (Chain 3). |

---

## 7. Flags and payoffs

There are four main flags plus one minor one. All are set with `choice` and read with `if`. Side chains set completion flags that colour the endings.

### Flag 1: The Tidewater cut (m05). `kept_cut` or `gave_cut`
Dex hands Jay $40,000, his three-year-old cut, kept in a toolbox.
- **"Keep it. Nana's house."** sets `kept_cut` and pays out $40,000 at once.
- **"It's not mine. It's Tommy's."** sets `gave_cut`. Jay walks to Casa Palma at night and leaves it in Lourdes's mailbox wrapped in a Calloway Auto rag.

**Payoffs:**
- **m08:** the Pelican heist still happens, but the dialogue changes. With `kept_cut` Jay needs $22k more and is "robbing the rest"; with `gave_cut` he needs all $62k and the crew teases him for giving away money he then has to steal.
- **m16:** with `gave_cut`, Mae says, "Mama found forty thousand dollars in her mailbox wrapped in a Calloway Auto rag. You're a terrible criminal, Jay." She is warmer, and `mae_stay` becomes an easy yes later. With `kept_cut` nothing is said yet.
- **m23:** with `kept_cut`, at Augie's funeral Mae learns what paid for Nana Lu's house: "You bought your grandmother's house with my brother's blood money." With `gave_cut` she holds Jay's hand at the grave.
- **m27:** with `gave_cut`, Lourdes gives Jay Tommy's yellow hoodie ("He'd want it driven somewhere nice"). With `kept_cut` Jay offers Lourdes the house deed and she refuses it: "Keep it. Pay it back to somebody else."
- **Endings:** Ending A puts Mae in the passenger seat only with `mae_stay` and `gave_cut`, or `mae_stay` and `nightshift_done`. In Ending B with `kept_cut`, Jay signs Nana Lu's house over to the Casa Palma tenants' fund.

### Flag 2: Calder's deal (m13). `trusted_calder` or `refused_calder`
After hearing the dashcam audio, Calder offers: "Give me what Augie has on Voss and I'll get you Horne."
- **"Deal. For Tommy."** sets `trusted_calder`. Jay gives her photos of three Tally pages.
- **"No cops. Not even you."** sets `refused_calder`. Jay keeps the audio himself.

**Payoffs:**
- **m21:** trusted: Calder's unmarked car and two honest units break Horne's roadblock on Southshore, so heat caps at 2 and the drive to the hospital is fast and desperate. Refused: heat 5 with roadblocks and the helicopter. Augie dies either way, but the refused route is harder and Jay can't stop at red lights.
- **m22:** trusted: Calder calls with the LUGNUT payment trail from her CI file. Refused: Noor finds it by cross-referencing bank dates, which is slower and breaks her heart ("Jay, I'm so sorry").
- **m26:** trusted: the stolen phone goes to Calder at the VPD Central back gate ("Legally, you're a raccoon who found a phone"). Refused: it goes to Noor at the Last Resort.
- **m30:** trusted: Calder arrests Horne in bay 14. Refused: Horne runs, Jay wrecks his cruiser and chains him to the Tidewater gate with his own cuffs, and Calder arrives in time to read him his rights.
- **Ending B:** trusted: the Tally goes to Calder, and there are arrests, a trial, and Jay's plea deal (14 months). Refused: the Tally is read live on air, by Solace on Harbor Heat 103.7 if `solace_done`, otherwise handed to the *Vicehaven Ledger*. Voss escapes on the launch but is indicted in his absence. Jay still hands himself in; his sentence is longer (22 months) and the gate scene has fewer people.

### Flag 3: Teo or the phone (m18). `saved_teo` or `chased_rourke`
At the top of the Crown's steel frame, Halberd is loading Teo into a van while Rourke drives off with the phone holding the money's location and Halberd's access codes.
- **"Get Teo."** sets `saved_teo`. Rourke escapes and Halberd now knows the money is at Kostas Salvage.
- **"Stop Rourke."** sets `chased_rourke`. Jay wrecks Rourke's car and takes the phone (codes, skimming ledger). Augie saves Teo himself and cracks two ribs.

**Payoffs:**
- **m19:** chased: Augie winces on the pier walk ("My ribs have filed a complaint").
- **m20:** saved: Halberd raids Kostas Salvage during the sniper job, so there's an extra defend stage and Rhea's price rises ("You led them to my door"). Chased: no raid.
- **m21:** saved: Teo is at the exchange and holds his father's hand in the back seat. Augie's last words are to him. Chased: Teo isn't there, and Augie's last words are to Jay: "Tell Teo I kept every one of his drawings."
- **m23:** saved: Teo gives Jay the notebook gently. Chased: he throws it at him.
- **m29:** saved: the Lantern Kings stage a diversion that pulls half of Halberd across town. Chased: Noor uses Rourke's codes to kill the second van's engine. Both make the hit possible in different ways.
- **Endings:** Teo runs the Old Market tenants' union (B), takes over the Kings with Jay's money (A), or becomes Jay's lieutenant (C, with `saved_teo`) or walks away from him (C, with `chased_rourke`).

### Flag 4: Dex's fate (m22). `dex_forgiven`, `dex_banished` or `dex_to_calder`
On the parkade roof, mid-fight, after Dex's confession.
- **"Get in the car, Dex."** sets `dex_forgiven`.
- **"Take Birdie and get out of Vicehaven. Tonight."** sets `dex_banished`.
- **"You're going to tell Calder everything. On the record."** sets `dex_to_calder`. With `refused_calder`, Calder says: "You didn't trust me last week." Jay: "I don't trust me this week."

**Payoffs:**
- **m23:** forgiven: Dex stands apart at Augie's funeral and only Birdie talks to him; Ansel is hurt defending Birdie at the garage fire. Banished: Dex is gone, and Ansel is hurt defending neighbours' kids. To Calder: Dex is in protective custody and Birdie is with Mae at the funeral.
- **m26:** forgiven: Dex rides along ("Of all the cars in this city"). Banished: Dex texts from the road: "Glovebox, not the console. I owe you more than that. Don't answer." To Calder: Calder mentions that Dex's statement named the glovebox.
- **m29 and m30:** forgiven: Dex drives the second car and rams the Halberd barricade in m30, with `protect: 'dex'`. Keeping him alive is the gameplay act of forgiveness. Banished: Dex turns up uninvited in the tow truck at the worst moment of m30, does the same ram, drives off without a word, and a text follows: "We're square. We're never square." To Calder: nobody rams, and the crew has to blow the barricade with grenades (harder).
- **Endings:** see section 8.

### Flag 5 (minor): Mae (m16). `mae_stay` or `mae_space`
- **"When this is over, come with me."** sets `mae_stay`.
- **"I'll give you space. For real this time."** sets `mae_space`.

Either way Mae answers: "Ask me when it's over." **Payoffs:** in m27 she brings it up at the Starlite; in Ending A, the passenger seat; in Ending B, whether she is at the gate holding his jacket or sends a text that just says "Home?"

### Side-chain flags
`nightshift_done` (Mae's final line in the endings changes; she's a passenger in A even with `kept_cut`), `foxes_done` (Lefty's cream-and-mint car appears in the B epilogue, and a text announces Walt's death in Act 4), `solace_done` (the Tally broadcast in Ending B without Calder; Solace denounces Jay in C), `iggy_done` (Iggy drives Constance to the prison gate in Ending B).

### 7.1 Who knows what, and when
| Truth | Who knows at the start | Jay learns | Others learn |
|---|---|---|---|
| Horne shot an unarmed Tommy and planted the gun | Horne. Calder suspects | m13 (dashcam audio) | Mae m16 (from Jay). The crew m17. |
| The Tidewater van held $2.4M and the Tally | Voss, Horne, Rourke, Augie (cash only; he doesn't understand the book) | m11 | The crew m12. Calder m13 if trusted. |
| The bags are in Celia's vault | Augie | m11 | Voss learns the money moved to Kostas via Dex (m15) and Rourke (m18, if saved_teo). |
| Dex is LUGNUT | Dex, Horne | Code name heard m07. Birdie's sticker m14. Confirmed m22. | Crew m22 to m23. Birdie never, explicitly. |
| Tommy was already dead when Jay drove | Augie (letter #1) | m19 | Mae m27 (Jay tells her). |
| Jay recruited Tommy | Jay, Augie | n/a | Mae m16. |
| Mae ignored Tommy's call | Mae | m16 | Lourdes never. |
| Teo told Voss's lawyer about "something of yours" | Teo | m17 | Augie m17. |
| Nana Lu fed teenage Voss plum cake | Voss | m28 (seeded by plum cake in the m27 blackout) | n/a |
| The convoy route and the ship | Voss, Rourke, Horne | m26 (Horne's phone) | Crew m26. |

---

## 8. Endings

The final choice in m31, at the end of Oceanview Pier at sunrise, picks the ending. Flags pick the variant scenes. Each ending plays as the epilogue steps of m31 (5 to 7 minutes), then credits over the radio.

### Ending A: "Taillights" (choice: **"Drive."**)
Jay takes the money (the Tally goes in the glovebox with Augie's letters, as insurance) and lets Voss's launch take him. He splits the cash with the crew by phone as he drives: Noor ("Buy the pharmacy. Buy the one next door too"), Ansel, Rhea, Teo. At sunrise he drives Lulu north up Cypress Parkway past the city-limits sign. The Crown opens. The Phase Two vote passes. On the radio Del Starr plays the song Augie picked in m19.
- **Mae:** with `mae_stay` and (`gave_cut` or `nightshift_done`), she's in the passenger seat with her feet on the dash. "Ask me," she says. "It's over." "Then drive." Otherwise Jay is alone, and a text arrives: "Drive safe. I mean it this time."
- **Dex:** forgiven: Dex and Birdie wave from the ashes of the garage. Birdie's sign reads CALLOWAY AUTO (UNDER NEW INVESTMENT). Banished: a postcard from somewhere cold. To Calder: Jay's share pays Birdie's school fees while Dex serves 18 months.
- **Last caption:** "The best wheelman Vicehaven ever had. Last seen northbound."
- **Theme:** getting out is real, and it costs a city.

### Ending B: "The Long Way Home" (choice: **"Give it to the city."**)
Jay takes the Tally from Voss's hands (Voss lets go; he has never been refused before). With `trusted_calder`, Calder walks down the pier with two uniforms and Voss is arrested at the rail as his launch turns back. Jay hands her the book and his own confession for Tidewater, then holds out his wrists. "I drove. Write that down." With `refused_calder`, Jay calls Solace (or the *Ledger*), who reads the Tally live at 06:00 on Harbor Heat. Voss escapes on the launch, but the whole city hears it, and Jay hands himself in at VPD Central.
- **Epilogue** (blackout captions, then a scene at `vpd_central`, mirroring m09): "Fourteen months later" (22 with refused). Jay walks out of the processing gate with a paper bag. Waiting in Lulu: Teo (with Augie's watch), Noor, Ansel, and Mae, holding his jacket if `mae_stay`, or arriving late in Medic 12 if `mae_space`. Birdie comes with Dex (to Calder: Dex walked out of the same gate a month earlier), with Mae (banished), or with Dex (forgiven). With `iggy_done`, Iggy pulls up in Constance: "Your carriage."
- **Last drive:** Jay drives everyone to Heron Street past the new things: Boateng Blooms on Tannery Row, Haddad Pharmacy open again, Tommy's mural repainted by Teo with Augie added beside him, the Crown's crane still and rusting. At Nana Lu's house the porch swing squeaks on the left. Imagined line from Tommy, in blackout: "Took you long enough."
- **Theme:** staying costs something, and it's worth it.

### Ending C: "Wheelman" (choice: **"Finish it."**)
Jay shoots Voss at the rail (slowmo, then silence). He takes the money and the Tally. Every councilman in the book now answers to him.
- **Epilogue:** a new Halberd CEO shakes his hand at the Crown forecourt. Rhea nods: business. With `saved_teo`, Teo stands behind Jay as his lieutenant, hollow-eyed. With `chased_rourke`, Teo walks away: "You're him now. Congratulations." Noor quits by text: "I did this for a pharmacy, not a new Voss." Ansel leaves a single rose on Lulu's windscreen. Dex: forgiven: "I've been what you are now, Jay. It doesn't get lighter." Banished: nothing. To Calder: his testimony names Jay as well.
- **Final scene:** 3 a.m. at the Starlite, the window booth, J+M under his thumb. Dot refills a cup nobody ordered. His phone buzzes: Mae. He looks at it and doesn't answer. Hard cut to black. Then a new VPD captain in Southside's parking lot, tapping a new gold watch at Lulu as it passes.
- **Theme:** what the city does to people.

---

## 9. Main missions

31 missions, 323 estimated minutes. Every entry lists `giver`, `start`, `time` (clock hour set on start), `estMinutes`, and the mission's **shape** (the gameplay mix). Adjacent missions never share a shape. Weapon unlocks, in order: bat (m02), pistol (m03), SMG (m07), shotgun (m10), revolver (m13, Calder's spare), rifle (m17), sniper (m20), molotov (m23), grenade (m25). Knives drop from Halberd from m04.

`requires` defaults to the previous mission. Side chains unlock as noted.

### ACT 1: HOMECOMING (m01 to m08, 82 min)

#### m01_homecoming: Homecoming
`giver: dex` · `start: civic_plaza` · `time: 15.5` · `estMinutes: 11` · Shape: race the clock, cutscene, brawl, wreck chase
**Summary:** Jay comes home late for his grandmother's funeral and is back in a fight within the hour.
**Beats:**
1. `camera: civic_plaza` on the Beacon; caption: "Vicehaven. Three years later." Jay steps off the coach with a duffel.
2. Phone, Dex: "Tell me you're not still at the coach stop. Father Ilunga's doing the long version for you."
3. `getIn: 'any'`, `timer: 150`, `goto: st_brigid_church` stop. Jay talks to the stolen car: "Easy. I'm giving you back. Mostly."
4. Scene at the churchyard: Dex in a too-tight suit, Birdie, Father Ilunga, Lourdes (who hugs him), Mae ("Be sad somewhere else"). `camera` on Calder's green car across the road.
5. Jay drives `dex_tow` to `dex_garage` with Dex and Birdie (join). Birdie interrogates him ("Are you a criminal?").
6. At the garage three Halberd "liaisons" are photographing the lot for the Renewal survey and shoving Dex's apprentice. Brawl, fists only (`kill: 'group:liaisons'`).
7. One grabs Dex's cash box and runs for a `halberd_suv`. `chase` mode wreck through Old Market. Heat 1 when a patrol sees the wreck. `loseHeat`.
8. Scene: Dex pulls the cover off `lulu`. "She left her to you. Also a parking ticket." Jay notices the lift ("It's an investment"). Jay: "A week. I'm staying a week."
**Purpose:** Jay is the best driver in the first two minutes. It shows the people he left, puts guilt and warmth side by side, and plants the lift.
**Cast:** jay, dex, birdie, mae, lourdes, ilunga, calder (cameo). **Reward:** $500, `lulu`.

#### m02_what_she_left: What She Left
`giver: oyelaran` · `start: nana_lu_house` · `time: 21.5` · `estMinutes: 9` · Shape: stealth on foot, collect, memory, escape
**Summary:** Jay takes his grandmother's life back from a repo yard.
**Beats:**
1. Scene at the bungalow: the Pelican padlock, and the notice: $62,000, 30 days. Grace Oyelaran: "They came Tuesday with a truck. Took her chair. Her photos. Like she was a debt."
2. Drive to `pelican_repo_yard`. On foot, crouch in. Three Pelican guards patrol (halberd faction, pistols). Being spotted turns them hostile but doesn't fail the mission.
3. Pick up Nana Lu's softball bat from a pile of her things (bat unlocked).
4. `collect: [three spots in the yard]`: the photo tin, the recipe box (with the plum cake recipe, a callback for m27 and m28), and her old licence plate LULU 1.
5. Blackout, 15 years ago in the Magnolia car park: Nana Lu teaches 12-year-old Jay: "Hands at ten and two. Heart at twelve."
6. The alarm trips on the way out. Fight or run to Lulu. Heat 2, `loseHeat`.
7. Scene on the porch swing (it squeaks on the left). Text from Dex: "Heard about the house. I know a crew that needs a driver. Don't say no yet."
**Purpose:** gives the house stakes and introduces the game's central line.
**Cast:** jay, oyelaran, nana_lu (memory). **Reward:** bat, $200.

#### m03_ten_and_two: Ten and Two
`giver: dex` · `start: last_resort_bar` · `time: 20.5` · `estMinutes: 11` · Shape: getaway heist, car switch, careful delivery
**Summary:** Jay's first job back, with a crew he's never met.
**Beats:**
1. Scene on the patio: Dex introduces Noor ("71 per cent chance of not dying tonight." Jay: "Highest I've ever had") and Ansel, sorting seed packets. The target is Goldline Exchange's 21:15 cash drop. Seed: Dex says, "You're in room 12 at the Magnolia, right?" Jay never told him. (Dex: "Birdie's cousin cleans there.")
2. Drive a plain grey `tern` to `goldline_exchange`; stop. `wait: 30` while a patrol car idles alongside. Don't move.
3. Noor and Ansel come running. Heat 3. Noor: "Next three lights are yours."
4. `goto: grand_parkade` and switch to a spawned `pipit` (`getIn`). `loseHeat`.
5. `deliver` the pipit to `dex_garage`, `maxDamage: 0.5`. Ansel: "You drove like the car owed you money."
6. Scene: the split. Ansel hands Jay a pistol. "I don't carry." "Then carry it for me."
**Purpose:** Jay in his element, a crew forming, and humour.
**Cast:** jay, dex, noor, ansel. **Reward:** $6,000, pistol.

#### m04_casa_palma: Casa Palma
`giver: lourdes` · `start: casa_palma` · `time: 11` · `estMinutes: 10` · Shape: brawl into shootout, then tail
**Summary:** Voss's "beautification" crew comes to paint over Tommy's mural.
**Beats:**
1. Scene in the courtyard: Lourdes, the cats, the three-storey mural of Tommy in yellow. "He liked you best. Don't tell Mae."
2. A Halberd paint van (`porter`) arrives with four painters. Brawl (bat).
3. A `halberd_suv` brings armed guards. Shootout in the courtyard (`kill: 'group:guards'`). Mid-fight, Teo and four Lantern Kings arrive and fight beside Jay. Teo: "Look who's back. My father's favourite."
4. The paint van flees. Teo: "Follow it. I want to know who sends the paint." `follow` the van to the `vicehaven_tower` loading bay (min 15, max 120).
5. Phone, Teo: "Voss. Of course it's Voss." (Voss's name is established, and the Renewal is personal.)
6. Scene back at Casa Palma: Mae, off shift, is treating a King's cut hand. "A week back and you're in a gang war?" "It's a mural war." She almost smiles.
**Purpose:** introduces Teo and Voss, and gives Tommy's memory a face.
**Cast:** jay, lourdes, teo, mae, wick. **Reward:** $1,500. Unlocks **Night Shift**.

#### m05_the_toolbox: The Toolbox
`giver: dex` · `start: dex_garage` · `time: 19` · `estMinutes: 9` · Shape: timed delivery, meet, moral choice
**Summary:** Dex gives Jay the money he never took, and Jay decides whose it is.
**Beats:**
1. Scene: Dex opens a red toolbox with $40,000 under the socket wrenches. "Your Tidewater cut. Augie made me swear."
2. "Earn something clean-ish first." A hot fuchsia `vireo` has to reach Rhea by nine. `deliver` to `kostas_salvage`, `timeLimit: 180`, `maxDamage: 0.3`. Dex rides along. Seeds: Dex flinches when a patrol passes, and his phone buzzes "H" ("Hector. Landlord").
3. Scene at Kostas Salvage, introducing Rhea: "Augie's wheelman. You left him holding something heavy." She says Augie's parole hearing is in two weeks, "and people are asking what he did with Tidewater."
4. Drive back. `camera`: a VPD `interceptor` pulling out of Dex's lot. Dex: "Parking appeal. They do house calls now."
5. **Choice (Flag 1):** "Keep it. Nana's house." (`kept_cut`) or "It's not mine. It's Tommy's." (`gave_cut`: `goto: casa_palma` on foot, `wait: 3`, a light comes on in Lourdes's window, and Jay walks away).
**Purpose:** the first moral weight, a first look at Rhea, and two seeds.
**Cast:** jay, dex, rhea. **Reward:** $2,000 (plus $40,000 if `kept_cut`).

#### m06_tick_tock: Tick Tock
`giver: noor` · `start: heron_corner` · `time: 23` · `estMinutes: 10` · Shape: street race, police escape at heat 4, meet
**Summary:** An $8,000 race purse, and the two cops who will shape the rest of Jay's life.
**Beats:**
1. Scene at the race meet: Pulse 96.4 is on, with Saff and the Dubois twins. A man in a salmon golf shirt is taking bets. Horne taps his gold watch at Jay: "Tick tock, Mercer. Welcome home." Noor whispers who he is.
2. `race`: `heron_corner`, `laurel_park`, `casa_palma`, `nana_lu_house`, `magnolia_motel`, back to `heron_corner`. Rivals: Saff (`zephyr`) and the Dubois twins (two `drifter`s).
3. At the finish Southside raids the meet (Horne called in his own race to show he can). Heat 4 and the helicopter's first appearance. `loseHeat`.
4. Scene at `seawall_overlook`, where Jay stops: Calder on the hood of her car. "Two minutes forty. I timed you." She worked Tidewater. "The report says the kid had a gun. You were there. Did he?" Jay says nothing. She gives him her card.
**Purpose:** establishes both cops, plants the watch, and delivers a thrill.
**Cast:** jay, noor, horne, calder, saff. **Reward:** $8,000. Unlocks **Street Races** and **Silver Foxes**.

#### m07_signal_fire: Signal Fire
`giver: noor` · `start: grand_parkade` · `time: 1` · `estMinutes: 10` · Shape: rooftop parkour, stealth, survive, drive-by
**Summary:** Jay gives Noor a backdoor into the city's traffic lights.
**Beats:**
1. Scene on the parkade roof: Noor's backstory (the SmartFlow fraud, getting fired, four failed driving tests). She can't climb or drive.
2. On foot across four Downtown rooftops to `signal_office` (climb, vault, jump).
3. Crouch past two Halberd guards. `goto` the cabinet, then `wait: 20` for the upload.
4. Phone, Noor, during the upload: "I've been in VPD dispatch too. There's an informant list. Code names. One called LUGNUT gets paid monthly. Since before Tidewater." Jay: "Every other guy in Old Market's a mechanic." Noor: "That's what I said."
5. Found out. `survive: 45` against waves of Halberd. Take an SMG from a guard.
6. Down to the street and into any car. A `halberd_suv` gives chase; `destroy` it with a drive-by.
7. Phone: "Say something nice to the lights." `camera` on Grand Avenue as every light turns green in a wave.
**Purpose:** Noor's worth and wit, and the LUGNUT seed.
**Cast:** jay, noor. **Reward:** SMG, $3,000.

#### m08_your_home_our_future: Your Home, Our Future
`giver: ansel` · `start: last_resort_bar` · `time: 14` · `estMinutes: 12` · Shape: prep collect, bank getaway with helicopter, car swap
**Summary:** The crew robs the lender that took Nana Lu's house.
**Beats:**
1. Scene: Jay plans a job for the first time, badly. Noor fixes it. Ansel: "Robbing the people who robbed your grandmother. That's almost gardening." Dex begs off for "Birdie's recital" (a seed: there isn't one).
2. `collect`: flamingo party masks at `tannery_row`, a clean `halcyon` at `magnolia_motel`, and fake plates at `dex_garage`.
3. Drive Noor and Ansel to `pelican_bank`, `setTime: 16.5`, `wait: 40` while a Halberd patrol circles.
4. Getaway at heat 4. Noor's green wave down Meridian Boulevard. `slowmo: 2` as they pass Medic 12 at a junction and Mae's eyes meet Jay's through the windscreen.
5. Lose the helicopter under `grand_parkade`, swap to Lulu, `loseHeat`.
6. Scene at `nana_lu_house`: Jay pays it off and the padlock comes off. On the porch swing: "A week," to nobody.
7. Phone, Dex: "Augie's parole came through. Thursday. He asked for you. Specifically you." Text, Mae: "Saw you on Grand. You still drive like an asshole."
**Purpose:** end of Act 1. The house is saved, which should be the end of Jay's reasons to stay. Then Augie.
**Cast:** jay, noor, ansel, dex (phone), mae (cameo). **Reward:** $45,000, armour 50. Nana Lu's house becomes a safehouse.

### ACT 2: OLD ENGINES (m09 to m16, 80 min)

#### m09_the_gate: The Gate
`giver: augie` · `start: vpd_central` · `time: 8` · `estMinutes: 10` · Shape: reunion, escort under attack, drive-by
**Summary:** Augie comes out of prison, and Jay has to face the man he never visited.
**Beats:**
1. Scene at the processing gate: Augie walks out with a paper bag. "You're late." "It's eight-oh-two." "Three years late, kid." Horne is on the steps with a coffee. "Keep your nose clean, Mr. Vance. Your boy's nose too."
2. Augie joins and Jay drives Lulu. "You brake like an insurance adjuster now." "Lettuce."
3. Two `halberd_suv`s try to box them in on Grand Avenue. Augie: "I'm on parole, I don't touch that. You touch that." `destroy` one with a drive-by and lose the other.
4. `goto: starlite_diner`. Scene in the lot with pancakes on the bonnet (Dot brings them out). The letters: Jay admits he never opened one. Augie: "Good. Half were about my bowels." Beat. "The first one mattered, though. Read the first one, someday." (Seed for m19.)
5. `goto: st_brigid_church`. `camera` on Augie alone at the no-nose angel: "Hello, sweetheart. Kept it safe for you." Jay waits at the gate. It plays as grief. It's also the hiding place.
6. Text, Teo: "Heard the old man's out. Tell him not to come by."
**Purpose:** the mentor's return, the hurt under the jokes, and the most important seed in the game.
**Cast:** jay, augie, horne, dot. **Reward:** $2,000. Unlocks **The Wedding Car**.

#### m10_sons: Sons
`giver: augie` · `start: lantern_alley` · `time: 20` · `estMinutes: 10` · Shape: defend the alley, catch chase, interrogation
**Summary:** Augie tries to talk to his son, and Halberd picks the worst possible moment.
**Beats:**
1. Scene under the lanterns. Teo: "You were the son he wanted. I'm just the one he had." Augie: "I was a bad father and a very good thief. Both were full-time jobs."
2. A Halberd sweep hits the alley to clear it for surveyors. `survive: 90` beside the Kings. Waves: pistols, then SMGs, then an SUV. Augie crouches behind the noodle cart handing out commentary and ammo.
3. Teo throws Jay a shotgun: "Don't make it weird." (Shotgun unlocked.)
4. Halberd lieutenant Garza bolts in a car. `chase` mode catch through Old Market; box him in.
5. Scene: Teo wants to beat him and Jay is the calm one (Augie notices). Garza: the alley is Phase Two, and "Mr. Rourke wants to know what your father did with the rest of Tidewater." Augie goes grey.
6. Teo to Jay, after: "He never held a gun. He held that job over all of us instead."
**Purpose:** a father and son wound, the first mention of Rourke, and Voss hunting the money.
**Cast:** jay, augie, teo, garza, wick. **Reward:** shotgun, $3,000.

#### m11_celias_garden: Celia's Garden
`giver: augie` · `start: st_brigid_church` · `time: 1.5` · `estMinutes: 9` · Shape: decoy chase, sneak back on foot, the dig, careful delivery
**Summary:** At 1:30 a.m. Jay learns where the Tidewater money has been all along.
**Beats:**
1. Scene at the churchyard gate. Augie: "I put two point four million dollars in my wife's grave. She'd have laughed. Then she'd have hit me."
2. Two `unmarked` cars of Horne's watchers sit on the church. Jay takes a car, provokes them (heat 2), leads them across Old Market and loses them (`loseHeat`).
3. Back on foot through `lantern_alley` to the churchyard wall (climb).
4. Blackout: the dig. The angel. Two canvas bags, and a green leather ledger. Augie: "I thought it was a bookkeeper's book. Then I read it." The Tally: Pruitt, the Port Authority, "W.H., Southside, monthly," and "Council, Phase Two, 2.4, by Tidewater, 30/9."
5. `collect` the two bags to Lulu.
6. `deliver` Lulu to `kostas_salvage`, `maxDamage: 0.3`. Rhea stores it for a fee.
7. Scene: "We sell it back to him, or we burn him down with it." "Or?" "Or both. I'm old. I contain multitudes."
**Purpose:** the MacGuffin, and the scale of Voss's corruption.
**Cast:** jay, augie, rhea. **Reward:** $5,000 ("expenses").

#### m12_the_councilmans_pool: The Councilman's Pool
`giver: noor` · `start: pruitt_house` · `time: 13` · `estMinutes: 10` · Shape: valet deliveries, theft, pursuit, blackmail scene
**Summary:** To prove the Tally is real, Jay has to park a poodle.
**Beats:**
1. Scene at the valet stand: Jay in a red vest. Noor on the phone: "Valet energy. Stop looking like a getaway driver. Smile like you're bad at maths." Hollis the valet captain distrusts him on sight.
2. Three valet runs: `deliver` each guest's car to the lower lot (`maxDamage: 0.1`, `timeLimit: 60`). One has a poodle in it.
3. Pruitt arrives in a cream `sovereign` and leaves his briefcase in the car, as he always does. Jay "parks" it (`getIn: pruitt_car`) and keeps going.
4. Halberd party security chases (two SUVs, heat 2). Lose them.
5. `goto: crestline_overlook`, stop. Scene: Pruitt arrives by cab (Noor texted him: "Your car has something to tell you"). His account numbers match the Tally. He's terrified. "You don't know what Harlan does to people who become inconvenient." Jay: "I'm already inconvenient. It's my whole thing."
6. Text, Augie: "Well done. I'm told you parked a poodle."
**Purpose:** comedy, proof, and a map of who is bought.
**Cast:** jay, noor, pruitt, hollis, augie (text). **Reward:** $6,000. Unlocks **Dead Air**.

#### m13_pension: Pension
`giver: calder` · `start: seawall_overlook` · `time: 22` · `estMinutes: 11` · Shape: tail, ambush, escape, revelation, choice
**Summary:** Jay hears Tommy's last words.
**Beats:**
1. Scene: Calder knows Augie's out and Jay's with him. Horne has ordered the Tidewater evidence box "purged". Tonight it goes from `vpd_central` to Halberd's incinerator. "I can't touch it. You can." She confesses she signed the report that called Tommy armed. She gives Jay her spare revolver: "It's registered to a dead man. Long story. Don't lose it."
2. `follow` the grey `porter` evidence van from `vpd_central` to `halberd_depot` (min 15, max 110), with a Halberd escort.
3. Hit it at the depot gate while it waits. `kill: 'group:escort'` (SMGs). `collect` the box.
4. Heat 3, `loseHeat`.
5. Back at the seawall, Calder plays the dashcam audio. Blackout, as sound captions: sirens, running feet. Tommy: "I'm not... I'm not armed, I'm not..." A shot. Horne: "Drop it! Drop it!" to nobody. A metallic clink. Calder: "Unit 1-Adam-9. Horne's car. The kid had a yellow hoodie and a phone."
6. **Choice (Flag 2):** "Deal. For Tommy." (`trusted_calder`) or "No cops. Not even you." (`refused_calder`).
**Purpose:** the midpoint revelation. Tommy's killer has a name, and the cop becomes a person.
**Cast:** jay, calder, tommy (audio), horne (audio). **Reward:** revolver, $2,500, armour 50.

#### m14_dry_run: Dry Run
`giver: augie` · `start: dex_garage` · `time: 10` · `estMinutes: 9` · Shape: light scene, stakeout clocking, time trial
**Summary:** Augie teaches Jay to plan. Birdie tells him something he doesn't want to hear.
**Beats:**
1. Scene: Augie is babysitting Birdie and losing to her at poker. Birdie, holding up a VPD junior-deputy sticker: "Daddy says the policeman with the gold watch is our friend. He gave me a sticker." Jay freezes for half a second. Augie, losing, doesn't notice. (Seed.)
2. The plan: steal a Halberd armoured van to use later as a Trojan horse. First, learn the route. Drive Augie to three vantage points (`civic_plaza`, `pelican_bank`, the `halberd_depot` fence). At each, stop and `wait: 8` as the `halberd_van` passes, while Augie narrates: "Watch how he brakes. Watch where he doesn't look."
3. A time trial of the escape route (`race` with no rivals, checkpoints from `halberd_depot` to `kostas_salvage` by the back roads).
4. Scene at the depot fence at dusk. Augie: "You drive so well you think driving is a plan." Then he phones Dex for a copied key and tells him the night: Tuesday. `camera` on Dex listening at the garage.
**Purpose:** mentorship and warmth, and the two most important seeds, in plain sight.
**Cast:** jay, augie, birdie, dex. **Reward:** $1,000.

#### m15_armour: Armour
`giver: augie` · `start: kostas_salvage` · `time: 3` · `estMinutes: 11` · Shape: stealth infiltration, heavy-vehicle escape, delivery
**Summary:** The perfect plan, and the police are already there.
**Beats:**
1. Scene: Augie, Noor, Ansel, Jay. Dex's key. Rhea's price (10 per cent).
2. On foot into the `halberd_depot` motor pool. Crouch past cameras and guards. Ansel puts a guard to sleep ("He'll be fine. He'll be embarrassed").
3. `getIn: halberd_van` (a `bulwark`).
4. As the gate rises, sirens. Southside units arrive early. Heat 4 at once. Augie, very quietly: "Who knew?"
5. Escape in the slow, heavy van through roadblocks, with Noor opening lights. Ansel throws a bin at a pursuing cruiser (he doesn't shoot).
6. `loseHeat`, then `deliver` to `kostas_salvage`, `maxDamage: 0.6`.
7. Scene: everyone looks at Noor, who wrote the route. "Don't. Don't do that." Dex, arriving, low to Jay: "How well do we know her, really?" Augie: "Enough."
**Purpose:** paranoia, a red herring, and the crew cracking.
**Cast:** jay, augie, noor, ansel, dex, rhea. **Reward:** $4,000, armour 100.

#### m16_the_starlite: The Starlite
`giver: mae` · `start: magnolia_motel` · `time: 2` · `estMinutes: 10` · Shape: quiet diner scene, confession, rescue on a timer, choice
**Summary:** 2 a.m., the old booth, and everything neither of them said.
**Beats:**
1. Phone, Mae: "I'm at the Starlite. Don't make it weird."
2. Drive to `starlite_diner`. Scene at the counter window: Dot. "The usual? You two haven't been in since..." Silence. Mae laughs for the first time.
3. Blackout, in the booth with J+M under her thumb. Jay tells her about the tape: Tommy was unarmed, and Horne fired. Mae's silence. Then her confession: the 1:48 call, and the voicemail she never deleted (Tommy: "Mae, I'm doing something stupid. Call me back"). Then his: "Augie said no. I said he's ready. I told him Augie's jobs were clean." Mae walks out.
4. With `gave_cut`, before she goes: "Mama found forty grand in her mailbox in a Calloway Auto rag. You're a terrible criminal."
5. On foot after her. She drives off. Jay follows in Lulu (`goto: casa_palma`). On Meridian Boulevard a drunk driver ahead flips and catches fire. `timer: 30`, `goto` the burning car on foot and pull him out. Mae's car stops and she works on him while Jay holds the light. `slowmo: 2` as the car explodes behind them.
6. Scene on the kerb as dawn comes. Mae: "I was so angry at you because I couldn't be angry at him."
7. **Choice (Flag 5):** "When this is over, come with me." (`mae_stay`) or "I'll give you space. For real this time." (`mae_space`). Mae: "Ask me when it's over."
**Purpose:** end of Act 2. The emotional core: shared guilt, and the love story reopened.
**Cast:** jay, mae, dot, tommy (voicemail). **Reward:** none. Text later from Mae: "Thank you for holding the light."

### ACT 3: THE TALLY (m17 to m24, 84 min)

#### m17_canary: Canary
`giver: augie` · `start: last_resort_bar` · `time: 19` · `estMinutes: 10` · Shape: stakeout tour, rooftop rifle cover, wreck chase, confrontation
**Summary:** Augie sets a trap for his own family, and it catches his son.
**Beats:**
1. Scene: Augie's canary trap. Each person gets a different fake meet: Noor the `grand_parkade` roof, Ansel `laurel_park`, Dex `crane_row`, Teo (who has been asking to be let in) `lantern_alley`. "I hate this. You only do this to family." Augie gives Jay Celia's father's hunting rifle (rifle unlocked).
2. Watch each spot: `goto` and `wait: 10`. The parkade, the park and Crane Row are quiet. Augie, relieved about Dex: "Told you." (The seed: Horne told Dex to sit tight.)
3. Lantern Alley: Halberd scouts arrive, looking for "the old man." From `anchor_rooftops`, rifle them down (`kill: 'group:scouts'`) before they corner Wick.
4. One flees; `chase` to wreck. On his phone: texts from "T.V."
5. Scene under the lanterns: Teo admits he's been meeting Voss's lawyer to sell the leases, and that he told them "the old man's out and he's got something of yours." He knew nothing about Horne or the depot. Augie: "I'd have done the same to me."
6. In the car, Augie: "So it's Teo." Jay: "Teo didn't know the depot night." Neither says the next name.
**Purpose:** a fair red herring that is partly true, and a crack in Augie's heart.
**Cast:** jay, augie, teo, wick, noor, ansel. **Reward:** rifle, $3,000.

#### m18_the_crown: The Crown
`giver: augie` (phone) · `start: meridian_yard` · `time: 22` · `estMinutes: 11` · Shape: construction assault, climb, choice, wreck chase or rescue
**Summary:** Halberd has taken Teo up the Crown, and Jay can only stop one of two things.
**Beats:**
1. Phone, Augie, frantic: Halberd took Teo from the alley. Voss is done with him. They're at the Crown.
2. `goto: meridian_yard`. Augie waits in Lulu: "I'm 58. I'm moral support."
3. Through the containers on foot, by stealth or by force (`kill: 'group:yard'`), then up the scaffolding to the half-built steel frame (climbing).
4. At the top, Teo is being loaded into a `halberd_van` below while Rourke's car pulls away with the phone holding the money's location (Kostas Salvage) and Halberd's access codes. Rourke, over the radio: "You drive. I plan for drivers."
5. **Choice (Flag 3):** "Get Teo." (`saved_teo`: down the frame, `kill` the van crew, free Teo; Rourke escapes) or "Stop Rourke." (`chased_rourke`: `chase` Rourke's `ironclad` to wreck and take the phone. Rourke limps off. Augie gets Teo himself and cracks two ribs).
6. Scene per branch. Saved: Teo, shaking: "You came back for me." Jay: "Seatbelt." Chased: Teo, bleeding, to Jay: "You chose the phone, brother."
**Purpose:** a real dilemma with gains on both sides, and Jay as a brother or a planner.
**Cast:** jay, augie, teo, rourke (voice, distant). **Reward:** $5,000.

#### m19_the_first_letter: The First Letter
`giver: augie` · `start: oceanview_pier` · `time: 5.5` · `estMinutes: 9` · Shape: a slow walk, the memory, a scenic drive
**Summary:** Sunrise on the pier. Augie tells Jay what the first letter said.
**Beats:**
1. Scene at the pier arch: Augie with two fishing rods and a thermos. "Walk with me." (With `chased_rourke`: "My ribs have filed a complaint.")
2. On foot down the whole pier. `say` lines as they walk: Nana Lu's plum cake, Celia's terrible singing, why Augie never used guns ("Guns are what you bring when you've stopped planning").
3. At the end, `camera` on the sunrise. Augie: "You never opened them." "No."
4. Blackout: Jay opens letter #1. Augie's voice: "Jay. I saw him go down. I saw his eyes before you'd even put it in gear. He was gone. You didn't leave Tommy. There was nobody there to leave. You drove me out of there and you saved my life, and I'm sorry that's all I've got to give you. Come see me. A."
5. Scene: Jay breaks, in few words. Augie: "Three years you carried that. I'd have carried it for you, if you'd opened the damn envelope." (His only swear to Jay in the game.)
6. The plan: trade the Tally for $5M and Voss's word to leave Old Market alone, at the Tidewater lot at 02:10 on the 30th. "Worst place in the world." "That's why he'll feel safe."
7. Scenic drive with VHR 88.1 on (Augie chooses the songs): `seawall_overlook`, `crestline_overlook`, then `st_brigid_church`. At the church gate: "If anything happens, look after Teo. He'll hate it. Do it anyway."
**Purpose:** catharsis. The quiet before the loss, so the player loves Augie most right before he dies.
**Cast:** jay, augie. **Reward:** none.

#### m20_overwatch: Overwatch
`giver: rhea` · `start: kostas_salvage` · `time: 23` · `estMinutes: 10` · Shape: crane climb, sniper cover, wreck chase (plus defence if `saved_teo`)
**Summary:** Rhea will hold the cranes for the exchange if Jay holds them for her tonight.
**Beats:**
1. Scene: Halberd survey teams are photographing Salts dockers for the port sale. Rhea gives Jay a sniper rifle: "Stavros's. He shot gulls. Badly."
2. Climb a gantry crane at `crane_row` (ladders and walkways).
3. Snipe the Halberd spotters (`kill: 'group:spotters'`) while the dockers unload.
4. A Halberd truck runs with the photos. `chase` to wreck, or `destroy` it from the crane.
5. With `saved_teo`: Halberd hits `kostas_salvage`, looking for the money Rourke now knows about. `survive: 75` with Rhea and the Salts. Rhea: "You led them to my door. Price just went up."
6. Scene at dawn: "My cranes, my eyes. Neutral ground." Rhea: "Everything in this port floats or sinks, Mercer. Pick."
**Purpose:** the sniper unlock, and Rhea becoming an ally.
**Cast:** jay, rhea. **Reward:** sniper, $6,000.

#### m21_two_ten: Two Ten
`giver: augie` · `start: last_resort_bar` · `time: 1` · `estMinutes: 13` · Shape: the exchange, ambush shootout, going back across the lot, a desperate drive
**Summary:** Three years to the minute. This time Jay goes back. It isn't enough.
**Beats:**
1. Scene on the patio: Augie's pre-job speech, funny and loving ("If this goes sideways, you drive. That's the job." Jay: "Not this time."). Dex is there, sweating, and says he'll wait at the garage with a second car.
2. Drive to `tidewater_lot` with Augie and Ansel (and Teo if `saved_teo`). Noor on a crane with a radio.
3. Scene in bay 14: Rourke and Horne come, not Voss. Horne: "Right about here, wasn't it? They repainted it. I asked them to." Augie hands over the Tally. Horne taps his watch.
4. `slowmo: 2`: a Halberd sniper shoots Augie.
5. Shootout. `kill: 'group:ambush'` and `survive: 60` with waves (Halberd rifles and Southside uniforms). `music: 'action'`.
6. Augie is down in the middle of the lot. `goto` him on foot, under fire. Jay: "Not this time." He gets him into Lulu.
7. With `trusted_calder`: Calder's car and two honest units break Horne's roadblock (heat 2). With `refused_calder`: heat 5, roadblocks and the helicopter.
8. `goto: mercy_general`, `timer: 150`. In the back seat Augie fades: jokes, then "Seatbelt... I know, I know. Don't be a pain in the ass." With `saved_teo`, to Teo: "I was a bad father." Teo: "You were fine, Pop. You were fine." With `chased_rourke`, to Jay: "Tell Teo I kept every one of his drawings."
9. Scene in the ambulance bay: Mae runs out with a stretcher and works on him, then stops. "Jay. He's gone." `music: 'sad'`. Jay sits on the kerb. Long `wait: 4`. `fade: 'out'`.
**Purpose:** the devastating loss, and a mirror of Tidewater in which Jay does the brave thing and still loses. Rourke takes the Tally.
**Cast:** jay, augie, ansel, noor (radio), teo (if saved), horne, rourke, calder (if trusted), mae. **Reward:** none. `setFlag: 'augie_dead'`.

#### m22_lugnut: Lugnut
`giver: noor` (or `calder` if trusted) · `start: magnolia_motel` · `time: 23` · `estMinutes: 11` · Shape: tail, overheard meet, confession, rooftop fight, choice
**Summary:** Jay finds out who LUGNUT is.
**Beats:**
1. Phone. With `trusted_calder`: "CI LUGNUT's payments go through a parts account. Calloway Auto Supply." With `refused_calder`: Noor: "I matched LUGNUT's payment dates... Jay, I'm so sorry."
2. Jay drives to the garage as `dex_tow` pulls out. `follow` it to `grand_parkade` (min 15, max 100).
3. Up the ramps on foot, crouching behind pillars. The scene plays from cover: Horne hands Dex an envelope. Dex: "You said nobody would get hurt! You said that three years ago!" Horne: "And nobody got hurt who mattered." Horne leaves.
4. Scene: Jay steps out. Dex's confession. The parts, the threat (prison, Birdie in foster care), the promise of "arrests at the gate", the photo of Birdie's school, the lift ("I've been paying for that lift every day for four years"). Jay says almost nothing.
5. Halberd SUVs come up the ramp to erase Horne's informant. `kill: 'group:cleaners'`, with Dex beside Jay (he takes a pistol off a body).
6. **Choice (Flag 4)** after the first wave: "Get in the car, Dex." (`dex_forgiven`), "Take Birdie and get out of Vicehaven. Tonight." (`dex_banished`) or "You're going to tell Calder everything. On the record." (`dex_to_calder`).
7. Down the spiral with heat 3, `loseHeat`. Branch ends: forgiven, Dex rides to Kostas Salvage in silence. Banished, drop Dex at the garage, and `camera` on the tow truck driving north with Birdie asleep. To Calder, `goto: vpd_central`, where Calder meets them.
**Purpose:** the betrayal, fairly seeded, sympathetic and unforgivable, and Jay's hardest choice.
**Cast:** jay, dex, horne, noor or calder. **Reward:** none.

#### m23_ashes: Ashes
`giver: teo` · `start: st_brigid_church` · `time: 17` · `estMinutes: 10` · Shape: funeral, race to the fire, fight among the flames
**Summary:** They bury Augie, and Voss burns what's left.
**Beats:**
1. Scene: Augie's funeral beside Celia, mirroring m01. Father Ilunga, Teo, Mae, Noor, Ansel, Rhea, Lourdes. Dex stands apart if `dex_forgiven`, and only Birdie talks to him. Southside cruisers park across the road "to keep the peace."
2. Teo speaks. With `saved_teo` he gives Jay the notebook: "He left you the plans. He left me the watch. I think that's the right way round." With `chased_rourke` he throws it at Jay's chest: "Take it. You were always his favourite plan."
3. With `kept_cut`, Mae after the service: "You bought your grandmother's house with my brother's blood money." With `gave_cut`, she holds his hand at the grave.
4. Phone, Ansel: "The garage is burning. Halberd. Come now." `goto: dex_garage`, `timer: 120`.
5. Halberd arsonists with molotovs. `kill: 'group:arsonists'` (molotov unlocked). Ansel, bloodied, has been protecting Birdie (forgiven) or the neighbours' kids (other branches). `survive: 45`.
6. `camera`: the CALLOWAY AUTO sign falls. Scene: the crew watching it burn. Ansel: "Roses are just thorns that got lucky." Jay: "I'm done running. I'm going to take everything he has."
**Purpose:** grief, then rage, and the loss of the found family's home. It sets up Jay's resolve.
**Cast:** jay, teo, mae, noor, ansel, rhea, lourdes, ilunga, birdie, dex (branch). **Reward:** molotov. The crew moves its base to `kostas_salvage`.

#### m24_the_notebook: The Notebook
`giver: jay` · `start: kostas_salvage` · `time: 20` · `estMinutes: 10` · Shape: planning scene, three-car theft tour, lose pursuit
**Summary:** Jay becomes the planner.
**Beats:**
1. Blackout: Augie's notebook, read in his voice. "Rule 1: plans fail. Rule 2: people don't have to." The last page: "If I'm gone. Voss will move the book. He moves it when he's scared. When he moves it, it's a Tidewater: armoured, Halberd, three vehicles, Crestline to the port. Hit it on the move. You drive. You plan. You're better than me at both now."
2. Scene at Kostas Salvage: Jay lays out the job for the first time. Each person says why they're in: Noor (the pharmacy, and her secret recordings of the SmartFlow meetings: "With the Tally, it's a noose"), Ansel ("Standing up"), Rhea (the port), and Teo in person or by text. The gala is on the 11th.
3. Timed theft tour (Noor on the lights): `deliver` a tow `hauler` from `market_scrapyard`, a grey `porter` from the `halberd_depot` lot, and a black `vireo` from `pruitt_house`'s drive, each to `kostas_salvage` (`timeLimit` and `maxDamage` each).
4. The vireo trips Pruitt's Halberd alarm: heat 2 and two SUVs. `loseHeat`.
5. Scene: the plan laid out on Lulu's bonnet. "Same job. Same driver. Different ending."
**Purpose:** end of Act 3, from grief to purpose, and Jay's arc as a planner.
**Cast:** jay, noor, ansel, rhea, teo, augie (voice). **Reward:** $10,000.

### ACT 4: TIDEWATER (m25 to m31, 77 min)

#### m25_iron: Iron
`giver: rhea` · `start: kostas_salvage` · `time: 15` · `estMinutes: 10` · Shape: demolition assault, defend the warehouse
**Summary:** Rhea's containers have a price: Halberd's checkpoint at the port gate.
**Beats:**
1. Scene: Rhea will drop three containers across Southshore Boulevard on the night if Halberd's dock post is gone. She opens a crate of grenades: "From a shipwreck. Mostly dry."
2. Drive to the post at `crane_row`. `destroy` three `halberd_suv`s with grenades (grenade unlocked).
3. `kill: 'group:post'` (Halberd rifles).
4. The counter-attack reaches `kostas_salvage`. `survive: 90` with the Salts.
5. Scene on the dock at sunset. Rhea: "Sentiment is for people with dry feet." Jay: "Your feet look pretty dry." "They're wet on the inside, Mercer." She shows him Stavros's uncashed cheque.
**Purpose:** firepower for the finale, and Rhea's wound.
**Cast:** jay, rhea. **Reward:** grenades, $8,000, armour 100.

#### m26_gold_watch: Gold Watch
`giver: calder` (if trusted, else `noor`) · `start: horne_house` · `time: 2` · `estMinutes: 10` · Shape: garden stealth, getaway in a police car, humiliation, handoff
**Summary:** Jay steals the police captain's phone, and then the police captain's car.
**Beats:**
1. Phone. With `trusted_calder`: Calder needs Horne's second phone for a warrant. "Legally you're a raccoon who found a phone." With `refused_calder`: Noor needs it to see the convoy plan.
2. On foot through Horne's garden (motion lights, a patrolling Southside officer, the boat on its trailer as cover).
3. `goto` the cruiser and `collect` the phone from the glovebox. With `dex_forgiven`, Dex is crouched beside him: "Of all the cars in this city." With `dex_banished`, a text from Dex: "Glovebox, not the console. I owe you more than that. Don't answer."
4. Horne comes out in a bathrobe with a shotgun: "MERCER!" Jay takes `horne_cruiser` and runs. Southside chases its own captain's car (heat 3).
5. `loseHeat`, then `goto: civic_plaza` and park the cruiser under the Beacon with the lights spinning (`camera`).
6. On foot to the handoff: Calder at `vpd_central`'s back gate, or Noor at `last_resort_bar`.
7. Scene: the phone has the convoy plan. The gala is on the 11th. Three Halberd `bulwark`s leave Belvedere at 23:00, with Horne leading the escort, down Crestline, Palm Crescent and Southshore to the freighter *Marguerite* at Crane Row, which sails at dawn. Voss rides separately in his white `sovereign`.
**Purpose:** comic payback, intelligence, and branch payoffs.
**Cast:** jay, horne, calder or noor, dex (branch). **Reward:** $5,000.

#### m27_the_night_before: The Night Before
`giver: ansel` · `start: harbor_beach` · `time: 20` · `estMinutes: 9` · Shape: bonfire scene, a joyride race, goodbye visits
**Summary:** The night before the job. The warmest mission in the game.
**Beats:**
1. Scene at the bonfire: Rhea's terrible ouzo, Ansel's poem ("for the garden, and the people in it"), and his secret about Lina Solano. Teo (if `saved_teo`) toasts with Augie's watch held up to the fire. Birdie (if `dex_forgiven`) asleep on Ansel's coat. Noor: "...because you're my family, okay?" Then, mortified: "Nobody heard that."
2. Jay teaches Noor to drive in the beach car park: blackout captions and dialogue with Noor at the wheel. "Hands at ten and two. Heart at twelve." "What's at twelve?" "Wherever you're going."
3. `race` along the boardwalk road against Teo's `lowrider` (or Ansel in the `hauler`), purely for fun. The loser buys the ouzo.
4. Visits: `casa_palma` (with `gave_cut`, Lourdes gives Jay Tommy's yellow hoodie: "He'd want it driven somewhere nice"; with `kept_cut`, Jay offers her the deed and she refuses it: "Pay it back to somebody else"), then `nana_lu_house` (blackout: Nana Lu and plum cake: "I fed a skinny thief once. Never saw him again. Hope he grew up nice"), then `starlite_diner`.
5. Scene at the Starlite: Mae. With `mae_stay`: "You asked me something. I'm still thinking." With `mae_space`: "You actually gave me space. Who are you?" Either way: "I'm coming tomorrow. Someone has to be there when you do something stupid. That was always my job." Jay tells her what the first letter said. She cries in the booth, and so does he, a little.
6. `setTime: 1`, `camera: crestline_overlook`: Jay asleep in Lulu with Belvedere's lights below.
**Purpose:** found family made explicit before the finale. Every thread gets touched once.
**Cast:** everyone. **Reward:** none.

#### m28_the_garden_party: The Garden Party (Finale I)
`giver: jay` · `start: crestline_overlook` · `time: 20` · `estMinutes: 11` · Shape: valet infiltration, garden stealth, face-to-face with Voss, escape
**Summary:** Jay walks into Voss's party to tag the convoy, and Voss comes to say hello.
**Beats:**
1. `camera: voss_estate` lit up. Caption: "October 11. The Crown Opening Gala."
2. Scene at the valet stand: the red vest again. Hollis: "You again? You parked a poodle." `deliver` one guest's car up to the motor court (`maxDamage: 0.1`) to get inside the grounds.
3. Garden stealth: crouch past the topiary lions and Halberd patrols. `goto` each of the three parked `bulwark`s and plant Noor's trackers (three `wait: 4` stops).
4. Scene by the infinity pool: Voss, alone, with a glass. He knows exactly who Jay is. The plum cake: "Lucinda Mercer fed me the day I stole her tomatoes. I've bought every house on Heron Street except hers." "Why not hers?" "Sentiment. It's expensive. I allow myself one." Then: "You're weather, Mr. Mercer. I build for weather. Enjoy the canapés." He signals Rourke with two fingers.
5. On foot out through the gardens as Halberd closes in (`kill` optional, or stay unseen). Vault the wall and get into Lulu on Crestline Drive. Heat 2, lose it.
6. Phone, Noor: "They're rolling. Early. Jay, they're rolling NOW." `music: 'tension'`. `chain` into m29.
**Purpose:** the antagonist at his most human and most frightening, and the callback that pays off m12.
**Cast:** jay, voss, hollis, rourke (cameo), noor (phone). **Reward:** none.

#### m29_tidewater_again: Tidewater, Again (Finale II)
`giver: jay` · `start: chain` · `time: 22.5` · `estMinutes: 13` · Shape: long tail, the hit, street shootout, catch chase, heat-5 run
**Summary:** Same job, same driver, different ending.
**Beats:**
1. `follow` the convoy (three `bulwark`s and Horne's cruiser) down from Crestline through Palm Crescent (min 20, max 140). The crew talks on the radio.
2. Noor splits the convoy at Meridian Boulevard with the lights. The lead van, carrying the Tally and the cash, peels off alone.
3. Southshore Boulevard: `camera` as Rhea's cranes drop three containers across the road. Ansel's tow `hauler`, with Mae riding along, blocks the rear. With `saved_teo`, phone from Teo: "We just set a Halberd truck on fire. Metaphorically. Also literally." With `chased_rourke`, Noor uses Rourke's codes to kill the second van's engine. With `dex_forgiven`, Dex drives the second car and `protect: 'dex'` starts.
4. Shootout on Southshore with the stranded van crews (`kill: 'group:convoy'`).
5. The lead van smashes through a gap. `chase` mode catch through Harbor Point and back to Saltmarsh, then box it in.
6. Jay drives the lead van (the cash and the Tally in the back). Horne's Southside arrives in force: heat 5, `bulwark` roadblocks, the helicopter. `deliver` the van to `kostas_salvage`, `maxDamage: 0.7`.
7. Noor counts: "That's thirty million dollars and one very ugly book."
**Purpose:** the heist the whole game has promised. Every ally pays off.
**Cast:** jay, noor, ansel, mae, rhea, teo or dex (branch), horne. **Reward:** none yet.

#### m30_salt_and_iron: Salt and Iron (Finale III)
`giver: jay` · `start: chain` · `time: 3.5` · `estMinutes: 12` · Shape: siege, a ram run, boss fight on the cranes, confrontation in bay 14
**Summary:** Halberd and Southside come for the money, and Jay finishes it with Horne where it began.
**Beats:**
1. Scene: Kostas Salvage is surrounded. Rourke on a loudhailer: "Nothing personal. I bill by the hour."
2. `survive: 120`. Rhea and the Salts hold the doors. Mae treats the wounded behind a crane counterweight. Jay has the rifle and grenades.
3. The Halberd barricade at the yard gate has to go. With `dex_forgiven`, Dex rams it in the tow truck and `protect: 'dex'` asks the player to cover him to the end. With `dex_banished`, Dex arrives uninvited, rams it and leaves, followed by a text: "We're square. We're never square." With `dex_to_calder`, `destroy` the barricade trucks with grenades under fire.
4. Push out to `crane_row` (`kill: 'group:lieutenants'`). Ansel's moment: Halberd corners Mae and Noor, and Ansel stands up and fights for real ("Most fights end when you stand up"). He's hurt and he lives.
5. Climb to the gantry walkway. `kill: ['rourke']`, and he falls. `slowmo: 1.5`.
6. Horne runs to `tidewater_lot`. On foot into bay 14. Scene: "You gonna shoot a police captain, Mercer?" With `trusted_calder`, Calder's voice from behind him: "Wade Horne, you're under arrest for the murder of Tomás Reyes." He reaches, and she says "Please." Cuffs. With `refused_calder`, Horne runs to his cruiser; `chase` to wreck; Jay cuffs him to the Tidewater gate with his own cuffs and his phone taped to his chest. Calder arrives in time to read him his rights.
7. Phone, Noor: "Voss is running. White car. East. There's a launch waiting at the end of the pier."
**Purpose:** justice for Tommy on the exact spot, the loyalty flags paid off in blood, and Ansel's arc.
**Cast:** jay, rhea, mae, noor, ansel, rourke, horne, calder, dex (branch). **Reward:** $0. The money is carried into m31.

#### m31_last_light: Last Light (Finale IV and endings)
`giver: jay` · `start: chain` · `time: 5.6` · `estMinutes: 12` · Shape: dawn chase, a run down the pier, the final choice, epilogue
**Summary:** Sunrise at the end of the pier, where the letter was read, and the last choice.
**Beats:**
1. `chase` Voss's white `sovereign` from Saltmarsh through Harbor Point at dawn (mode catch). Two `halberd_suv`s guard him and must be wrecked first.
2. Voss crashes at the pier arch. Jay runs the pier on foot. Voss walks ahead of him, unhurried, carrying the Tally.
3. Scene at the end, in sunrise light (`camera`, then cast). Voss: "Take the money and drive. It's what you do. You were magnificent tonight. You'll be magnificent in some other city." The launch is two minutes out.
4. **Final choice:** "Drive." (Ending A, *Taillights*), "Give it to the city." (Ending B, *The Long Way Home*) or "Finish it." (Ending C, *Wheelman*).
5. Epilogue per section 8, built from `if` branches on the flags: blackouts, `setTime`, `teleport`, scenes and one last drive (north on Cypress Parkway, home to Heron Street, or to the Starlite booth).
6. Credits over the radio: Del Starr (A), Solace or Sable (B), and silence then Benji Blue, badly timed, for C.
**Purpose:** the thesis of the game, chosen by the player.
**Cast:** jay, voss, plus the ending cast. **Reward:** A, $4,000,000 (Jay's share). B, $0 and the city. C, $30,000,000.

---

## 10. Side-story chains

Four chains, 16 missions, about 135 minutes. Each has its own arc and a completion flag that colours the endings. Missions use the same fields as the main story.

### Chain 1: Night Shift (`side_nightshift`)
`giver: mae` · `unlockAfter: m04_casa_palma` · 4 missions, 34 min
**Arc:** Jay rides nights with Mae and learns that saving people is driving too. It rebuilds their trust on neutral ground and gives her world, and her list of names, weight. Sets `nightshift_done`.

- **ns1_medic_12: Medic 12** (`start: mercy_general`, `time: 23`, 8 min). Mae's partner Gus has put his back out. She needs a driver "for one call, and don't you dare enjoy it." Drive `medic12` to `lantern_alley` for Wick, who has been stabbed. `deliver` him to `mercy_general` (`timeLimit: 120`, `maxDamage: 0.2`: every bump hurts him). Wick tries to slip away from the bay before the police come, and Jay talks him back on foot. Beat: Mae watches Jay be gentle. Reward: $1,000.
- **ns2_pileup: Pileup** (`start: mercy_general`, `time: 1`, 8 min). Six cars pile up on Meridian Boulevard. `collect` four trapped drivers (on-foot `goto`s on a `timer: 90`) before the burning cars explode. One is a Halberd guard. Jay hesitates. Mae: "We don't pick." Beat: the moral of the chain. Reward: $1,500, armour.
- **ns3_the_list: The List** (`start: heron_corner`, `time: 3`, 9 min). A street racer hits Mr. Baptiste, the street sweeper everyone knew, and flees. Mae works on him and Jay `chase`s the racer (catch). **Choice:** "Beat him." or "Hold him for the cops." (the local flag `ns_mercy` only changes Mae's next line). Mr. Baptiste dies (a blackout of the siren stopping). At dawn on the ambulance bumper Mae shows Jay her notebook of names, every patient she lost. Tommy's is the first. Beat: grief that isn't Jay's, shared. Reward: none.
- **ns4_gus_last_shift: Gus's Last Shift** (`start: grand_avenue`, `time: 16`, 9 min). A woman in labour is stuck in the Crown parade traffic on Grand Avenue. Gus (back brace) coaches and Jay drives `medic12` through the parade route (`deliver`, `maxDamage: 0.3`, `timeLimit: 150`). Blackout: the baby is born in the back. "We're not calling him Jay." They call him Gus. Gus gives Jay his Medic 12 patch. Beat: joy and a new life. Reward: $2,000. Sets `nightshift_done`.

### Chain 2: The Silver Foxes (`side_foxes`)
`giver: lefty` · `unlockAfter: m06_tick_tock` · 4 missions, 34 min
**Arc:** Three robbers in their seventies (the press called them "the Silver Foxes" in 1979) want one last job: to rob Pelican's "Golden Years Equity" scheme, which fleeced their retirement home. It's the comedy chain, and quietly a chain about memory, because Walt's is going. Sets `foxes_done`.

- **sf1_old_hands: Old Hands** (`start: bayview_gardens`, `time: 10`, 8 min). Lefty, Walt and Duke need a wheelman who "doesn't drive like a hearse." Drive them in `foxes_car` to case Pelican's collections courier: `follow` the courier (min 15, max 100) while they argue about 1979. Walt calls Jay "Frankie", their old driver. A mall security guard recognises them and they flee at 20 km/h. Reward: $500.
- **sf2_the_walker_job: The Walker Job** (`start: tannery_row`, `time: 14`, 8 min). They rob the Pelican collections office on Tannery Row. They cannot run. `collect` all three from three doorways (reverse up alleys) while Halberd guards shoot, then heat 2, `loseHeat`. Lefty, reloading: "I still got it." Duke: "You still got sciatica." Reward: $3,000.
- **sf3_walt: Walt** (`start: bayview_gardens`, `time: 22`, 8 min). Walt has wandered off to meet his wife Ruthie at the Starlite, and it's 1981 in his head. Search his memories: `goto` `the_boardwalk`, then `starlite_diner` (Dot remembers Ruthie), then `oceanview_pier`, where he stands at the rail. Jay plays Frankie and drives him home the long way at his request. Blackout: Walt's memory of Ruthie's laugh. Beat: tenderness, and Jay thinking about Nana Lu. Reward: none.
- **sf4_returns: Returns** (`start: bayview_gardens`, `time: 12`, 10 min). Give the money back to the residents: `collect` five envelope drops across Harbor Point and Palm Crescent while Pelican's Halberd collectors hunt the car. Then `survive: 75` in the Bayview courtyard with Lefty on a shotgun. Walt has a last lucid moment: "Thanks, Jay. It is Jay, isn't it?" Lefty gives him the keys to `foxes_car`. Reward: $2,000 and `foxes_car`. Sets `foxes_done`. A text in Act 4 reports Walt's death.

### Chain 3: Dead Air (`side_deadair`)
`giver: solace` · `unlockAfter: m12_the_councilmans_pool` · 4 missions, 33 min
**Arc:** Lorna "Solace" Achebe runs Radio Free Vicehaven, hijacking Harbor Heat 103.7 after midnight (Sable knows and pretends not to) to read anonymous tips about the Renewal. Halberd is hunting her transmitter. The chain is about the city having a voice. Sets `solace_done`, which pays off in Ending B without Calder.

- **da1_frequency: Frequency** (`start: harbor_beach`, `time: 0.5`, 8 min). Halberd is triangulating her signal. `deliver` `solace_van` (fragile valves: `maxDamage: 0.15`, `timeLimit: 180`) to `drydock_slip`. Solace broadcasts the whole drive and narrates Jay's driving live: "He's taking the corner... he's taking it beautifully, Vicehaven." Reward: $1,000.
- **da2_call_in: Call-In** (`start: civic_plaza`, `time: 23`, 9 min). A council aide, Priya, wants to leak the Phase Two vote whip list. Pick her up and `protect: 'priya'` through a Halberd pursuit, then drop her at the van. She's terrified and funny ("I have a cat. Who feeds the cat if I die? Write that down"). Reward: $2,000.
- **da3_jammer: Jammer** (`start: last_resort_bar`, `time: 1`, 8 min). Halberd has put three jammer `porter`s round Harbor Point. `destroy` them (molotov or SMG), then `chase` to wreck the fourth, which is running with Solace's location. Reward: $2,500.
- **da4_signal_boost: Signal Boost** (`start: anchor_rooftops`, `time: 0`, 8 min). Solace's big live show from the rooftops: Priya's list, read on air. `survive: 90` on the roof against Halberd climbing the fire escapes (rifle). Solace: "Every city has a voice. Ours just needed a getaway driver." Reward: $3,000. Sets `solace_done`.

### Chain 4: The Wedding Car (`side_wedding`)
`giver: iggy` · `unlockAfter: m09_the_gate` · 4 missions, 32 min
**Arc:** Iggy Pell has chauffeured more than 3,000 weddings in Constance, a cream car named after his late wife. He borrowed against her to pay for his wife's hospice, and a Pelican title lender repossessed her. His granddaughter Tasha marries in three weeks. The chain is about love that lasts and handing on a legacy. Sets `iggy_done`.

- **wc1_constance: Constance** (`start: market_scrapyard`, `time: 21`, 8 min). Constance sits under the magnet crane, due to be crushed at 22:00. On foot, crouch past the yard guards and Duchess the retired guard dog, then `getIn: constance` on `timer: 120` and `deliver` her to `laurel_park` (`maxDamage: 0.2`). Iggy strokes the bonnet: "Hello, my darling." Reward: $1,000.
- **wc2_cold_feet: Cold Feet** (`start: founders_park`, `time: 18`, 8 min). The groom, Marcus, bolts from the rehearsal at the gazebo. `chase` him (catch) and talk him down at `crestline_overlook`. Jay is the wrong man for this: "I left the love of my life at a diner and moved to a lettuce farm." It works anyway. Reward: $1,500.
- **wc3_something_borrowed: Something Borrowed** (`start: the_boardwalk`, `time: 13`, 7 min). Pickpockets on the boardwalk lift Iggy's wife's wedding ring, the "something borrowed". An on-foot chase across Harbor Point rooftops and stalls (`goto` chain), then `kill` (fists) the three-person team. Reward: $1,000.
- **wc4_the_last_wedding: The Last Wedding** (`start: casa_palma`, `time: 16.5`, 9 min). Iggy is too frail to drive. "You drive. I'll supervise." `deliver` Constance with Tasha from Palm Crescent to the `founders_park` gazebo through Crown-motorcade gridlock (`maxDamage: 0.1`, `timeLimit: 240`). Scene: Iggy dances with the bride. He gives Jay the keys: "Drive the ones who can't." Reward: `constance` as a garage car. Sets `iggy_done`.

---

## 11. Activities

### 11.1 Taxi fares
Unlocked after m03. Jay takes any `cab`. Each fare is a pickup, a drop-off and 2 to 4 lines (`fare` is the passenger). Fares marked with a mission only appear after it.

1. **The cake.** `fare`: "It's a peace offering. For my ex-wife's wedding." `jay`: "Is it poisoned?" `fare`: "(long pause) It's lemon."
2. **The tourist.** `fare`: "So where's all the vice? Brochure promised vice." `jay`: "You're sitting in it. Meter's running."
3. **Off shift.** A Halberd guard, still in his polo. `fare`: "Take the long way. I want ten minutes of not being a guy who shoves grandmas for a living." `jay`: "Long way it is."
4. **The booth (after m13).** `fare`: "I was on the Pier 9 booth, the night of Tidewater. They said the kid had a gun." `fare`: "He had a phone. I never told anyone. Now I'm telling a cab driver. That's how brave I am." `jay`: "(quietly) It's a start."
5. **The psychic.** `fare`: "You're going to lose someone you love." `jay`: "Everyone does." `fare`: "Yes, but I usually charge for it. Consider this a tip."
6. **The breakup.** `fare`: "Can you drive slower? I need two more minutes to dump him." `fare2`: "I can hear you." `fare`: "Great. Saves time."
7. **The runaway.** A 12-year-old with a hamster in a shoebox. `fare`: "Bus station. I'm leaving forever." `jay`: "Station's closed. Your mum's open, though. Where does she live?"
8. **The divorce.** `fare`: "Faster. I want to be single before lunch." `jay`: "Any faster and you'll be a widow."
9. **The double shift.** A nurse falls asleep mid-sentence. Jay drives twice round the block before he wakes her. `fare`: "Did I snore?" `jay`: "Like a diesel. It was nice."
10. **The fan.** `fare`: "You ever hear of Jay Mercer? Best wheelman this city ever had. You kinda look like him." `jay`: "He'd never drive a cab." `fare`: "Ha. No. Never."
11. **The architect.** `fare`: "I designed the Crown. Never been up it. I'm scared of heights." `fare`: "Don't tell anyone." `jay`: "Who would I tell?"
12. **The preacher.** `fare`: "The Lord drives a sedan, son. Modest. Reliable." `jay`: "Good mileage?" `fare`: "Eternal."
13. **The flamingo.** A bachelor in a flamingo costume. `fare`: "I'm getting married tomorrow. Is that too fast? Is this car too fast?" `jay`: "The car's fine. Drink some water."
14. **Coins.** A Lantern Kings kid pays in quarters. `fare`: "My grandma's. She makes me come Sundays." `jay`: "(counting coins) Keep it. Tell her the driver says hi."
15. **The recital (after m08).** `fare`: "I'm going to be late for my daughter's recital!" `jay`: "(beat) There are real recitals?" `fare`: "What?"
16. **The parrot.** `fare`: "Don't mind Captain." `parrot`: "Asshole! Asshole!" `fare`: "He's not talking about you. Usually."
17. **The port.** `fare`: "Twenty-two years on the cranes. They replaced me with a joystick in Rotterdam." `jay`: "That's a long reach." `fare`: "Tell me about it."
18. **Crabs.** A chef with a crate that moves. `fare`: "They're for tonight. Please don't brake hard. They've been through enough."
19. **The old house (after m23).** `fare`: "Could you just drive past Anchor and Tannery? Forty years we lived there." `fare`: "(looking out) That's a fence now. Okay. You can go."
20. **The film student.** `fare`: "Could you say something noir? Like, 'This city eats its young'?" `jay`: "This city eats its young." `fare`: "Wow. Chills. Again, but sadder?"
21. **The retired cop.** `fare`: "Knew Wade Horne when he was a rookie. Good kid. Carried groceries for old ladies." `fare`: "I don't know when he stopped. Maybe nobody does."
22. **The deal.** A man on his phone. `fare`: "Buy Old Market. All of it. It's just buildings." Jay brakes hard at a green light. `jay`: "Sorry. Thought I saw a cat."
23. **The Beacon.** `fare`: "Is the obelisk real gold?" `jay`: "Paint." `fare`: "Like everything here?" `jay`: "Not everything."
24. **Prom.** `fare`: "Drive like you're not my dad." `fare2`: "Drive like you ARE his dad. Mine's watching the GPS."
25. **Last fare (after m21).** An old woman at St. Brigid's. `fare`: "I light a candle for my husband every Thursday. Who's yours for?" `jay`: "(a long beat) A guy who taught me to park."

### 11.2 Street races
Unlocked after m06. Organiser: Saff Achterberg's Pulse 96.4 crew. Purse from $1,500 to $8,000. Winning all six sets `king_of_the_road` (a Del Starr shout-out on the radio and a gold `drifter`).

| # | Race | Checkpoints | Rivals (char, car) | Trash talk |
|---|---|---|---|---|
| 1 | **Heron Sprint** | `heron_corner`, `laurel_park`, `casa_palma`, `nana_lu_house`, `heron_corner` | Saff (`zephyr`), Jules and Jolie Dubois (`drifter` ×2) | Saff: "My sponsor says I'm not allowed to lose to lettuce trucks." Jolie: "We share a brain. It's fast." |
| 2 | **Grand Slam** | `civic_plaza`, `vicehaven_tower`, `grand_parkade`, `pelican_bank`, `civic_plaza` | Marlon "Tollbooth" Pike (`vireo`), Priscilla Wen (`halcyon`) | Tollbooth: "Everybody pays the Tollbooth." Priscilla: "I race on my lunch break. You have forty-five minutes of my life." |
| 3 | **Boardwalk Burn** | `the_boardwalk`, `starlite_diner`, `seawall_overlook`, `harbor_beach`, `oceanview_pier` arch | "Neon" Nico Ferrante (`drifter`), Grandma Ruth Abernathy (`sovereign`) | Nico: "Sideways is the only way." Ruth, 68: "I've buried two husbands and a Pomeranian, dear. I'm not scared of you." |
| 4 | **Container Maze** | `crane_row`, `halberd_depot`, `drydock_slip`, `tidewater_lot`, `kostas_salvage` | "Big Kostya" Lemaire (`hauler`), Deb "Forklift" Mahone (`mesa`) | Kostya: "I don't go around things." Deb: "Rhea says let you win. I don't work for Rhea on Tuesdays." |
| 5 | **Crestline Hillclimb** | `crestline_overlook`, `pruitt_house`, `voss_estate`, `horne_house`, `crestline_overlook` | Preston Vale III (`vireo`), Barnaby, his chauffeur (`sovereign`) | Preston: "Daddy bought this road." Barnaby: "(dry) Sir, Daddy leases it." |
| 6 | **The Long Way Round** | `heron_corner`, `tannery_row`, `lantern_alley`, `civic_plaza`, `the_boardwalk`, `tidewater_lot`, `heron_corner` | Saff, Tollbooth, Ruth, Kostya | Saff: "This one's for the whole city, Mercer." Ruth: "I'll send flowers." |

### 11.3 Bounties
Unlocked after m10. Giver: Honor Blackwood, Blackwood Bail Bonds ("We Believe In You (Conditionally)"). Alive pays double.

1. **Darnell "Dimples" Price**, 31. Insurance fraud by staged crashes. Bail $15k. He drives a `pipit` and throws himself at bonnets. Found at `the_boardwalk`. Plays as a chase in which he keeps trying to get hit by your car. Twist: he's genuinely very good at falling.
2. **Veronika Stahl, "the Crestline Cat"**, 36. Mansion burglaries. Bail $40k. On foot across the Crestline roofs and garden walls (`pruitt_house`). Twist: she only robs people in the Tally, and she asks Jay which ones he's missed.
3. **The Buckley Brothers**, 29 and 33. Produce-truck hijackings. Bail $20k each. A `hauler` at `crane_row`. Twist: Jay knows the drivers they robbed, and the brothers were robbed first by the same haulage firm.
4. **"Pastor" Declan Moody**, 50. A fake-charity scam run from the steps of St. Brigid's. Bail $12k. He flees on foot through the churchyard. Father Ilunga: "Please don't shoot in my garden. Chase him politely."
5. **Leon "The Magician" Castillo**, 44. Escapee, eleven times. Bail $25k. Found at `harbor_beach`. Twist: he escapes from the back of Jay's car at a red light. Recapture him at `seawall_overlook`.
6. **Tavish Groom**, 38. A former Halberd guard wanted for beating a Casa Palma tenant. Bail $30k. Protected by Halberd friends at `halberd_depot` (a gunfight). Lourdes knows the tenant.
7. **Mona "Bumper" Kessel**, 27. Street-race thief and hit-and-run. Bail $18k. A `drifter` from `heron_corner`. After Night Shift 3 Jay takes this one personally.
8. **Otis Wembley**, 62. Pelican's former loan officer, wanted for embezzlement after he stole from Pelican itself. Bail $50k. Found hiding at `bayview_gardens`, where the Silver Foxes are sheltering him ("He's one of ours now"). Choose to take him in or let the Foxes keep him (no pay, but Lefty sends pie).

### 11.4 Dex's list
Unlocked after m05. Deliver each car to `dex_garage` (to `kostas_salvage` after m23). After m22, Birdie texts the list (forgiven or banished) or Rhea takes it over (to Calder). The reasons are in Dex's voice.

1. **Candy-red `ironclad`**, Garza's, at `halberd_depot`. "He keyed Mrs. Oyelaran's car at the church. Karma has a tow hitch."
2. **Cream `sovereign`**, Pruitt's, at `pruitt_house`. "Parks in the disabled bay at St. Brigid's every Sunday. God sees. So do I."
3. **Silver `zephyr`**, Saff's sponsor car, at `heron_corner`. "It's a rolling billboard for energy drinks. We're doing her a favour."
4. **White `medic`**, decommissioned, at `mercy_general`. "Not a real ambulance any more. I want the lights. Don't ask what for. (It's Birdie's birthday.)"
5. **Black `vireo`** at `vicehaven_tower`. "Voss's head of PR. Posts about 'community' every hour. Let's see how much she loves community when she's on the bus."
6. **Mint `beater`** at `bayview_gardens`. "An old man called me. It's his, it's stolen, and he wants it back from his grandson."
7. **Gold `lowrider`**, Kings, at `lantern_alley`. "Teo owes me for a gearbox. Teo knows. Tell Teo I said hi."
8. **Grey `porter`** survey van at `tannery_row`. "It's full of Renewal notices. Bring it back empty. Use your imagination. Use a bin."
9. **Pearl `interceptor`** in a VPD charity livery at `civic_plaza`. "(nervous laugh) Don't. Actually, don't. Cross that one out." (It can't be delivered. It's a seed.)
10. **Rust `mesa`**, Kostya's, at `crane_row`. "He bet me I couldn't steal it. I can't. You can."

### 11.5 Turf wars
Unlocked after m10. Hold a spot for `survive: 120` against waves. Winning changes the street: fewer Halberd patrols, different ambient pedestrians, new radio mentions.

1. **Lantern Alley** (Kings vs Halberd). Win: the lanterns stay lit, and Kings give Jay armour on request.
2. **Tannery Row** (Kings vs Halberd survey crews). Win: the Renewal notices come down and stalls reopen. Noor's father sells tea from one.
3. **Heron Corner** (Kings vs Salts, over the race purse). Win: the races are safer, and Saff lowers entry fees.
4. **Crane Row** (Salts vs Halberd). Win: the dockers' union banners go back up. Rhea discounts her fencing fee.
5. **The Boardwalk** (Kings vs Halberd "Renewal Patrol"). Win: buskers return and the fairground lights come on at night.

---

## 12. Ambient text messages

In the format's `{ after, from, message }` shape. They arrive a minute or two into free roam after the listed mission.

| after | from | message |
|---|---|---|
| m01_homecoming | birdie | "Daddy let me use his phone. Are you really staying a week? A week is 7 days. I checked." |
| m02_what_she_left | oyelaran | "Her key is under MY mat now. Come for supper. Don't argue." |
| m03_ten_and_two | noor | "Post-job analysis: you ran two reds I didn't give you. Unacceptable. Also incredible." |
| m04_casa_palma | teo | "Mural's fine. Don't make a thing of it." |
| m05_the_toolbox | dex | "Rhea likes you. Rhea doesn't like anyone. Should I be worried?" |
| m06_tick_tock | calder | "Card's got my cell on the back. I don't sleep. Call whenever." |
| m07_signal_fire | noor | "I made the light outside my apartment green for 40 minutes to see if anyone would notice. Nobody noticed. Power is lonely." |
| m08_your_home_our_future | ansel | "Planted a lemon tree in your grandmother's yard. She had a spot for one. I could tell." |
| m09_the_gate | augie | "Learning to text. This is very small. Where are the vowels kept" |
| m10_sons | augie | "He threw you the shotgun. That means something. Don't tell him I said so." |
| m11_celias_garden | rhea | "Your laundry is dry and secure. Storage fee is 4%. Sentiment fee is 0%." |
| m12_the_councilmans_pool | hollis | "The poodle's owner wants to tip you. I said you'd left the company. Please leave the company." |
| m13_pension | calder | "Don't go to the depot road for a week. Don't ask why. (It's because I asked you to go there.)" |
| m14_dry_run | birdie | "Mr Augie owes me 340 poker chips. Tell him interest is a thing." |
| m15_armour | noor | "I didn't. I want you to know that before you decide what you think." |
| m16_the_starlite | mae | "Thank you for holding the light." |
| m17_canary | teo | "I'm sorry. I don't know who else to say it to." |
| m19_the_first_letter | augie | "Good morning, kid. Best sunrise in three years." |
| m21_two_ten | lourdes | "Mae told me. I'm making food. You'll come and you'll eat. That's all." |
| m22_lugnut | birdie | "Daddy is sad and won't say why. Is it because of the policeman?" |
| m23_ashes | ilunga | "He asked me to tell you, if it ever came to this, that he was proud. I'm telling you." |
| m24_the_notebook | noor | "Found a page in Augie's notebook you missed. It says 'Jay: 11/10. Would steal my car again.'" |
| m25_iron | lefty | "(if foxes_done) Walt passed in his sleep. He thought it was 1981 and Ruthie was making coffee. Good way to go." |
| m26_gold_watch | calder | "Horne's cruiser was on the morning news. Under the Beacon. Lights on. I have never been happier at work." |
| m27_the_night_before | mae | "Get some sleep. Ten and two." |

---

## 13. Radio

Three stations. DJ links, adverts and news bulletins rotate between tracks. After story beats, a station can run a topical line (marked with the mission it follows). All brands are invented.

### VHR 88.1 Sunset Drive (synthwave). DJ: Delphine "Del" Starr
In her fifties, velvet-voiced, and living in a permanent 1986 of the mind. She calls listeners "night drivers" and talks about the moon like an ex. She's warm and wistful, and secretly the best-informed person in the city. She played at Nana Lu's wedding anniversary once.
1. "This is Del Starr on Sunset Drive, for the night drivers. Windows down, heart up, and whatever you're running from, it's slower than you."
2. "The moon's out over Harbor Point tonight. Hi, moon. Don't call me."
3. "Advert: Kleen Karma Car Wash. Wash the car, wash the soul. Soul wash is extra. Offer void in Crestline."
4. "A request from someone in Old Market, for 'the man who parked the poodle'. I don't know what that means, but it's beautiful."
5. "(after m06) Word is there was a race on Heron last night and the police came second. Congratulations to the police."
6. "Advert: the Starlite Diner, open since before you were born and open after you're gone. Pie is not a metaphor."
7. "You know what they never put on postcards? The street at 4 a.m. when it's just you and the lights. That's the real city. Stay with me."
8. "Advert: Voss Meridian presents The Crown. Rise with us. (sighs) Well. Some of us will rise. Here's a song about falling."
9. "(after m21) This next one's for Augustine Vance, who used to call in every Tuesday and request the same song. Rest easy, Augie."
10. "Advert: Bayside Mattress Kingdom. Sleep like you've got nothing to hide."
11. "It's 3 a.m., night drivers. If you're thinking about calling someone, call them. Trust Del."
12. "(Ending A) To whoever's heading north this morning: the road's clear, the sky's pink, and the city will miss you. Drive safe, baby."

### Pulse 96.4 (house and electro). DJ: Benji Blue
He's 29 and permanently hyped. Everything is sponsored and everything is "a whole vibe". He's obsessed with wellness and says "manifest" too often. He's funny because he is sincere. He sponsors Saff's racing.
1. "PULSE NINE-SIX-FOUR, Benji Blue, and if your heart rate isn't at 140 you're basically asleep, babe!"
2. "Advert: Glo-Gum. Chew it and your mouth GLOWS. Glo-Gum is not responsible for anything your mouth does next."
3. "Shout-out to Saff Achterberg, undefeated on Heron Corner. Well, defeated once. We don't talk about it. We manifest past it."
4. "Hydrate, Vicehaven! It's 34 degrees and your body is 60 per cent regret!"
5. "Advert: Halberd Home Protection. Because the police can't be everywhere. And we can. Legally, mostly."
6. "I just got a text that says 'turn it down'. Babe, I AM the volume."
7. "(after m08) Pelican Home Equity got robbed by people in flamingo masks and honestly? Iconic. Don't do crime. But iconic."
8. "Advert: Pelican Payday Advance. Money today, feelings tomorrow!"
9. "Deep breath. In through the nose, out through the bass. That's a technique. I invented it just now."
10. "Advert: Captain Crabby's Crab Shack on the boardwalk. Claws out, prices down, napkins mandatory."
11. "(after m26) Somebody parked a police cruiser under the Beacon with the lights on and left it there? That's art. That's an installation."
12. "(Ending C, badly timed) Good morning Vicehaven, new day, new you, new boss in town, apparently! Anyway, here's a banger."

### Harbor Heat 103.7 (dark hip-hop beats). DJ: Marcus "Sable" Thorne
He's 40, low and dry, raised in Saltmarsh. He's political without preaching and calls Voss "the man in the white suit". After midnight he "can't find the off switch" when Solace hijacks the frequency.
1. "Harbor Heat. It's Sable. The city's quiet tonight. Quiet's usually the part before the noise."
2. "Advert: Tidewater Security. Trusted for thirty years. (pause) Mostly trusted. Here's a record."
3. "Man in the white suit wants to put a glass tower where my grandmother bought fish. Progress, they say. Progress for who?"
4. "Advert: the Vicehaven Lottery. The Big Tide. Somebody's got to win. It's statistically not you."
5. "If you're a Salt working the night shift on Crane Row, this is for you. Somebody's got to move the world."
6. "(after m13) Cops say they lost an evidence box last night. Cops lose a lot of things. Evidence. Reputations. Kids."
7. "Advert: VossMart. Everything you need, everywhere you used to shop."
8. "Heads up, Old Market: Halberd trucks on Tannery tonight. Look after each other. Nobody else is going to."
9. "(after m21) Lot of sirens down at Pier 9 last night. Lot of silence this morning. I know which one I believe."
10. "Solace is on after midnight. I don't know how she keeps getting into my transmitter. (deadpan) I'm furious."
11. "Advert: Mercado Fresh, a family business since before families were a business."
12. "(Ending B) This morning a book got read out loud to the whole city. Some people are going to have a hard day. Good. Here's a song for everybody else."

### Radio Free Vicehaven (Solace, pirate, on 103.7 after midnight during and after Chain 3)
Sample lines: "This is Solace, and this frequency is stolen, like everything else in this town." "Tonight's tip comes from a council aide with a cat." "(Ending B, without Calder) Good morning, Vicehaven. I have a book here. Page one."

---

*End of bible. Keep the place ids, character ids, flag names and mission ids exactly as written here. Anything a writer invents that other acts depend on (a new minor character, a new callback) must be reported back to the lead writer so it can be added here, not left in one script.*
