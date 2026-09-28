# VICEHAVEN: Story Bible

**Working title of the campaign:** *Ten and Two*
**Protagonist:** Jay Mercer, 27, the best wheelman Vicehaven ever had.
**Scope:** 31 main missions in 4 acts (about 5 h 20 min), 4 side-story chains of 4 missions each (about 2 h 15 min), plus repeatable activities. Total: 7.5 h or more.

This is the single source of truth for the four writers scripting the acts in parallel. It follows `docs/mission-format.md` exactly: every scene is outdoors, in a car, or in a `blackout`. No interiors, no swimming, no player boats, motorbikes or aircraft. If a scene seems to need a room, stage it at a doorway, in a car park, on a porch, in a car, or on a black screen.

**Writer split (suggested):** Writer 1: Act 1 plus the *Night Shift* chain. Writer 2: Act 2 plus *The Wedding Car*. Writer 3: Act 3 plus *The Silver Foxes*. Writer 4: Act 4 plus *Dead Air*. Everyone shares the taxi fares and texts. Read sections 1 to 10 before writing a single line.

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
