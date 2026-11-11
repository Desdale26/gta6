# VICEHAVEN: DLC Bible — *Chasing the Firecrest*

**Title:** *Chasing the Firecrest*
**Tagline:** *Seven parts. Seven riddles. One lost racing car somewhere across the bay. And mind the road.*
**Protagonist:** Jay Mercer, the best getaway driver in Vicehaven, for once the grown-up in the car.
**Scope:** 30 main jobs in 4 acts (about 5 h 10 min: 308 estimated minutes), 4 side chains with 15 jobs (about 2 h 30 min: 148 minutes). Data id `dlc1`.
**Where:** mostly the twelve new districts (Sandpiper Beach, Vista Verde, Ironside, The Bowl, Sunreel Studios, Cinder Creek, Halcyon University, Coral Marina, and on Isla Paloma the Neon Strand, Old Paloma, Paloma Heights and Paloma Field), plus Vicehaven International and a guest turn by the old city's Harbor Point and boardwalk.

This is the single source of truth for everyone writing the DLC: the beat-sheet writers, the eight act writers, the two side-chain writers, the recap writer and the engine agent. It follows `docs/mission-format.md` plus the DLC extensions fixed in the master brief (`fly`, `land`, aircraft in `spawnCar`/`goto`/`deliver`/`getIn`, the `airport_terminal` and `airport_arrivals` interiors). If a scene seems to need a room that does not exist, stage it at a doorway, in a car, on a roof, in a hangar mouth or as a `blackout`.

**Stands alone.** The DLC unlocks after the main story's third job and must play the same before, during and after the main story, after any of its three endings. It never mentions anyone from the main story except Nana Lu, in memories (she is dead from the first minute of the main game, so this is true at every point). It never mentions Augie, Dex, Mae, Tidewater, Voss, the house debt, prison or anything Jay does after the main story's first act. Jay is simply in Vicehaven this summer, between things, and good at driving. If anyone asks what he does: "I drive." If they push: "Mostly away from things."

**Writer split (suggested):** Act writers 1a/1b (d01 to d04, d05 to d08), 2a/2b (d09 to d12, d13 to d16), 3a/3b (d17 to d20, d21 to d23), 4a/4b (d24 to d27, d28 to d30). Side writer 1: *Take Two* and *Dual Control*. Side writer 2: *Marks Out of Ten* and *Summer Series*. Read sections 1 to 8 before writing a line, then your jobs in sections 9 and 10.

---

## 1. Logline, themes, tone

### Logline
Fifty years ago Dess Marlow won the Southbay 500 in a car called the Firecrest, drove out of the Speedway with the cup on the passenger seat and was never seen again. This summer a tin box turns up in a Cinder Creek storage unit: the Firecrest's starter key and a riddle. Before she vanished, Dess took seven parts off her car and hid them round the bay, a treasure trail for her baby daughter to follow once she was old enough to drive. Nobody ever delivered the first clue. Now her granddaughter Pip has it, she is banned from driving, and she needs a driver. Jay Mercer, a twelve-year-old who solves riddles faster than any professor, a TV treasure hunter who always gets there first and takes the wrong thing, and the hotel king whose family fortune rests on the lie that his father won that race, all go chasing the same seven parts across every district of the bay, by road and by air.

### Themes
- **A road home somebody laid for you.** Dess built a trail so her daughter could find her one day. The first sign was never handed over. The whole DLC asks what it costs not to pass something on, and what it means to pick up a trail fifty years late. Toby, who failed to deliver it, gets to finish the job. June, who never got it, gets to decide what to do with it.
- **Who gets to tell the story.** The Castellanes have told the Southbay 500 their way for fifty years: on hotel signs ("Champions since day one"), in the record books, in a glossy film being shot at Sunreel. Dash Lockwood tells it on TV for whoever pays. Milo tells it on a blog with 41 readers. Truth wins here because somebody is willing to say it out loud, in front of a lot of people.
- **Cleverness is not age.** The smartest person in the story is twelve. The grown-ups have more money, faster cars and more degrees, and they keep needing Milo to tell them what a water tower looks like from a riddle's point of view.
- **Jay as the grown-up.** In the main game Jay is the one being looked after or looked at. Here he is the adult in the car: the driver for a banned teenager, the minder for a carsick professor, the one a twelve-year-old phones. He finds he is good at it, and doesn't say so.
- **Finishing the lap.** A race is not over until you cross the line. Dess never got her lap of honour. The finale gives it to her, in front of everybody.

### Tone
The main game's sun-bleached neon noir with warmth and wit, pitched a notch lighter and more adventurous: a summer treasure hunt across the bay. Days are white heat, pastel motels, salt on the windscreen and the smell of hot tyres at the Speedway. Nights are the neon of the Strand, the drive-in screen, and two lighthouses blinking at each other across black water. It is a hunt, not a heist. People are funny because of who they are: Pip's impatience, Quill's carsickness, June's clipboard, Hob's marks out of ten, Dash's unbreakable confidence, Chet's refusal to go over thirty. The stakes are real (the truth, a family, a car that matters to a lot of people), the danger is game-normal (chases, goons, police heat, things that explode), and nobody dies on screen. The one old death in the story (Rex Castellane, years ago, of old age) is told plainly.

Reference points for feel (not content): a Saturday-morning adventure serial, a family road trip that goes wrong in the best way, a radio commentator on a hot afternoon.

### Style rules for the writers
- **Lines** are `[speakerId, text]`, under about 180 characters. Split long speeches. Stage directions in parentheses at the start: `'(not looking up from the clipboard) Minor fault.'`
- **Speaker ids:** `jay`, `pip`, `milo`, `prof_quill`, `june`, `toby`, `odie` (Dess before she is revealed, d17 and d22 to d23's reveal), `dess` (after), `dash`, `leo`, `ottoline`, `hob`, `chet`, `monty`, `nana_lu` (memories only), `caption`, plus the minor ids in section 4.15 (all of them, with looks and voices, are in `dlc.js`). Never use main-story speakers (the main cast's `cop` included: the DLC's police speaker is `officer`).
- **Language (binding):** mild only. Allowed: damn, hell, crap, "what the hell", "bloody" rarely, a very rare "shit" or "ass" (at most a handful in the whole DLC, never from or near Milo). Never the f-word, never a slur, never anything sexual. No drugs, as a business or a joke. No gambling, casinos or betting (arcades, claw machines, funfairs and raffles are fine; the claw machine is rigged, which is the joke). Drinking: none on screen beyond "a lemonade" and Hob's coffee. Per-character guide: Pip says "crap" when she stalls and "hell" when she's thrilled. Jay says "damn" quietly, about once a job, often to a car. June never swears; she says "Minor fault" instead, which is worse. Quill says "Great Scott" and "blast". Hob says "bloody" and "crikey" in the same breath. Toby says "hell's bells". Dash never swears on camera and swears (mildly) the second the camera is off. Ottoline never swears; she is polite the way a closing door is polite. Milo never swears; he corrects other people's grammar instead.
- **Violence:** Guest Services goons, police heat, shoot-outs, crashes and explosions are the game's normal. Nobody named is killed. Goons are "down", "out", "taken away". When the finale gets Ottoline arrested, say so plainly. No blood words beyond "hurt".
- **Humour:** at least one real laugh in every job, from character, not from cruelty. Running gags are listed below; use them where this bible marks them and not so often they wear out.
- **Milo is never in the line of fire.** He is on the phone, on a video call from his grandad's study, on a bench at the edge of a scene, or in the back seat of a car that is not being shot at. When things get dangerous, someone sends him home and he complains about it.
- **Jay's voice:** spare and dry. He says less than he means. He talks to cars ("Easy. You're fifty years old, I'm not going to rush you."). He is a getaway driver (everybody knows it, nobody makes a speech about it). He warms to Milo and Pip slowly and never says so; the player sees it in what he does: he waits outside the school, he hands Milo the wheel to hold, he gives Pip the last lap of the side chain. He gets one real speech, in d30, to June or Dess (by flag), and it is four lines long.
- **Phone calls** carry exposition while driving. Every drive has banter in `say`. Milo phones a lot; he always opens with a fact ("Did you know the Halcyon clock is eleven seconds slow? That's important. Probably.").
- **Riddles:** see "How riddles work" below. They are the heart of the DLC. The player must always have the chance to solve one before a character says the answer.

### How riddles work (binding for every writer)
1. **Every riddle is a rhyme in Dess's voice**, four to six short lines, for a seventeen-year-old in the 1970s but solvable by a twelve-year-old now, about **one physical object in one real place you can see in the game**. It always ends with the line **"And mind the road."** (Dess's sign-off; she said it every time June's aunt drove off with the baby.) The one riddle not in Dess's voice is Ending C's new trail, which Milo writes (section 8).
2. **Show it first, solve it later.** The riddle is shown in full as soon as it is found (a `blackout` with the lines as `caption`, or read out by Pip or Toby), then the job **ends or a drive begins before anyone says the answer**. The answer comes from Milo at the start of the next job or at least one full drive later (`phone: 'milo'`). This gives a parent and child time to shout it at the screen.
3. **Clue chain.** Each part carries the next riddle (engraved, folded inside, scratched on the back). The table below is the canonical text: use it word for word.
4. **Fair play.** Every riddle's answer is a place the player has already seen on the map or will pass on the drive (writers: put the answer on screen with a `camera` shot on the way, without comment, before Milo says it). The one exception is R4: June's house is not visited before d09, so the mower is planted by line instead (Pip in d01: "slower than my mum's lawnmower... Does forty... Nobody's allowed in the shed").
5. **Milo explains how** in one or two lines ("Tin man is what you call a water tower if you're a poet or a seven-year-old. I'm a bit of both."). Then he posts on his blog, and the subscriber count gag fires.
6. **Characters get it wrong first.** Quill always has a scholarly wrong answer ("Clearly the rhyme refers to the sunken paddle steamer *Tin Mistress*, 1904."). Dash always goes to the most literal wrong place and takes the wrong thing.

### The riddle chain (canonical text)
| # | Found in | Where it's found | The riddle | Answer |
|---|---|---|---|---|
| R1 | the tin box (d01) | lot 17, Cinder Creek Storage | "I turned her left, I turned her right, / now I turn the water tight. / Climb the tin man, silver-grey, / and turn me home the other way. / And mind the road." | The steering wheel is the valve wheel on top of the **Cinder Creek water tower** |
| R2 | inside the horn button of the steering wheel (d02) | Cinder Creek water tower | "My bird flies where the cowboys play, / who never die at end of day. / She's on a roof, she points the wind, / she's never caught and never pinned. / And mind the road." | The Firecrest's bonnet bird is the weathervane on the sheriff's office of the **Sunreel western set** (cowboys who never die = actors). Milo gets it in d03 from the newsreel. |
| R3 | engraved under the bonnet bird's base (d04) | Sunreel western set | "I kept her laps and kept her pace; / now I keep the scholars' place. / Twelve on top and six below, / look behind the face I show. / And mind the road." | The rally clock is inside the face of the **Halcyon clock tower** |
| R4 | on the back plate of the rally clock (d05) | Halcyon clock tower | "My heart is home where my baby sleeps, / out in the shed where the spider creeps. / I roar on Sundays, up and down, / the fastest thing in all the town. / And mind the road." | The carburettor is in the lawnmower at **June's house in Vista Verde**, the house June grew up in. Pip gets it before Milo (d08), and goes quiet. |
| R5 | rolled up in the carburettor's float bowl (d09) | June's garage | "My name was painted, then painted out, / where only winners stand and shout. / Be first across, then look below / the board where all the winners go. / And mind the road." | The honours board in the **Speedway winners' enclosure**. You have to win to stand there (d10). |
| R6 | scratched on the wall under the honours board (d10) | Southbay Speedway | "Two eyes that never shut all day / watch the swimmers splash and play. / One on each of two tall chairs, / they're bright as mine, and they're a pair. / And mind the road." | The Firecrest's two headlamps are the lamps on two **Sandpiper lifeguard towers** |
| R7 | nothing riddled: a shop name stamped inside one headlamp, plus a three-number combination (d11) | Sandpiper Beach | (not a riddle) "BRASK & MARLOW SPEED SHOP, THE PROMENADE. 7 - 17 - 50." | The old speed shop is now the **Kwik Pik on the promenade**; its floor safe has never been opened (d12) |
| R8 | in an envelope in the floor safe (d12) | Sandpiper Kwik Pik | "I'm in a box where nobody wins, / beside a wheel that turns and spins. / Many have tried with a coin and a claw; / the wheel goes round, and goes nowhere at all. / And mind the road." | The gear stick is the prize in the **Golden Grabber claw machine at Wonder Wharf**, beside the big wheel |
| R9 | inside the gear knob (d19) | Hob's hangar, Paloma Field | "Ring me once when the boats come in, / I'll ring back with a spark within. / I hang above the market square / and swing for every wedding there. / And mind the road." | The ignition coil is inside the clapper of the **Old Paloma church bell**, above Paloma Plaza |
| R10 | wrapped round the coil (d21) | Old Paloma bell tower | "When two lights say goodnight at ten, / fly the line between them then. / Where the light comes from, I'll be, / the last part is the part that's me. / And mind the road." | The car (and Dess) are at the **Paloma fort lighthouse**, the far end of the beam from the Coral Marina light. The ten o'clock goodnight is an old keepers' custom, a century older than either keeper, which Dess knew as a girl; that is how she could write it fifty years ago |

### Running gags and callbacks
- **"And mind the road."** Every riddle ends with it. Pip starts saying it when anyone leaves. June says it to Jay in d25 without knowing why it stops him. Dess says it to June in the finale, and June finally knows where she heard it as a baby. Last line of the DLC (every ending).
- **The scoreboard.** Milo's blog, *The Firecrest Files*, keeps a running score at the top: "TEAM FIRECREST 1 · LOCKWOOD'S LOST LEGENDS 0 (+1 rusty tap)". Dash's wrong finds pile up: a rusty tap (d02), a cowboy's spur (d04), the Halcyon clock's minute hand (d05), a garden gnome (d09), a lifeguard's whistle (d11, `dlc_blog_on` only: with blog off Dash is not on the beach), a teddy bear from the claw machine (d19). Subscribers: 41 (d02), 60 (d03), 41 again when his gran unsubscribes by accident (d06), then with `dlc_blog_on` it climbs (900 at d11, 12,000 at d16, 80,000 at d21, 100,000-plus at d26, 200,000 at d29, 400,000 at d30); with `dlc_blog_off` Milo keeps the board on paper on his wall and reads it down the phone. Milo reads the score out about every second job. Dash reads it too, and is wounded.
- **Hob's marks out of ten.** Every landing in a plane or helicopter, Hob (or Hob on the radio) gives a mark: "We walked away. Four." "That was a landing in the legal sense. Six." He never gives a ten until dsf4 (or d30 if `dsf4` is not done: "Nine. Don't let it go to your head.").
- **June's clipboard.** "Minor fault." "Minor fault." "That was a fountain." She marks Jay's driving even in a pursuit. "Serious fault" is reserved for the moment she means it (d09, when Jay mounts the kerb to save her: she crosses it out).
- **Monty never gets Jay's name right.** "Jim Mercy!" "Jake Murphy!" "Joe Mercury!" "Jay... Mercator? Jay Somebody!" Finally, in d30, he gets it right, once, and the crowd chants it. (Keep the wrong names gentle and silly.)
- **Guest Services comment cards.** Ottoline leaves a printed card at every scene she wrecks: "How would you rate your experience of being followed today? 1 to 5." Jay keeps them in the glovebox; there are nine by d28 (d01, d03, d04, d07, d11, d13, d14, d20 from Dash's hatband, and the one on the empty powder-store floor in d28). At the end of d28 Ottoline hands him a tenth, blank ("You choose one"); he keeps it in his shirt pocket and fills it in during the finale (with `dlc_dash_in` Dash reads it on air): "One star. Staff were very attentive." Side jobs never hand Jay a card.
- **Quill gets carsick.** In every car. "I wrote three books proving that car was at the bottom of the bay, and I may yet join it." He is fine in aircraft, which makes no sense to anyone.
- **Chet won't go over thirty.** "Never over thirty, kid. I made that promise to my insurers and my mother, in that order." He starred in *Oversteer 2: Understeer*. There was no *Oversteer 1*. "Loved the first one," people say. He thanks them.
- **Dash's catchphrase:** "Legend... FOUND!" said over whatever wrong thing he's holding. Once, in d30 with `dlc_dash_in`, he says it about the right thing, and can't believe it.
- **The two lighthouses.** Every night at ten the Coral Marina light and the Paloma fort light flash each other three times: the keepers' goodnight, an old custom kept by whoever holds the two lights. Toby: "Every night at ten the fort light says goodnight. I say it back. Manners." (d08, d22). Planted in d07 (seen, unexplained), solved in d22; in Ending C (`dlc_june_wait`) Dess explains it to June: "The other keeper. Saying goodnight."
- **Three taps.** Dess tapped the steering wheel three times before every race (seen in the newsreel, d03). Odie taps the café counter three times in d17. The player can spot it. In d30, before the last lap, Dess taps the wheel three times.
- **Junebug.** Painted under the driver's door of the Firecrest, seen in the newsreel (d03, nobody can read it), revealed in d27 when the dust sheet comes off. June's nickname from Aunt Win; June never knew who gave it to her.
- **Nana Lu's bedtime story.** Jay's grandmother told him the Firecrest story when he was small (d01 blackout). He remembers her ending: "And she drove into the night, and nobody ever saw her again." "Where did she go?" "Somewhere she could see the sea, I expect." Paid off in d22 when he sees the fort light.

---

## 2. Backstory and timeline

All times are relative to "this summer", when the DLC is set. Never give a calendar year.

| When | What happened |
|---|---|
| 52 years ago | **Odessa "Dess" Marlow** (then 27), a mechanic's daughter from the Sandpiper end of town, and **Toby Brask** (then 29), the best engineer at the old Southbay Speedway, open the **Brask & Marlow Speed Shop** on the Sandpiper promenade. They build a car out of a wrecked Dunmore Ironclad and everything they own: the **Firecrest**, flame orange, a little gold bird on the bonnet, a rally clock on the dash, *Junebug* painted small under the driver's door. |
| 51 years ago | Dess has a baby, **June**. (June's father is not part of the story; "he was a sailor and he sailed" is all anybody says.) Dess's sister **Win** lives in a little house in Vista Verde with a shed and a lawn, and minds the baby on race days. Every time Win drives off with the baby, Dess calls after her "And mind the road." |
| 50 years ago, race day | **The Southbay 500.** Dess beats **Rex Castellane** (then 30), son of the man who owns the Speedway and half the hotels on Isla Paloma, by a car's length. The Speedway engraver cuts *O. MARLOW* into the **Mariner Cup** on the spot. Dess drives out of the Speedway with the cup on the passenger seat, still in her helmet, heading for Win's house. |
| 50 years ago, that night | Rex's men (two drivers paid by his father) run the Firecrest off Seawall Drive at the coast end. Dess isn't hurt. She understands that the Castellanes will never let a mechanic's daughter keep that cup, and that they will come after anyone near her, including the baby. The stewards, who work for the Castellanes, "disqualify" her the next morning for leaving the circuit with the trophy and hand the race to Rex. The cup in the Castellane trophy room is a copy made that week. |
| 50 years ago, that week | Dess hides. She has seven days before the Castellanes' private detective, **Gorse**, starts asking questions. She takes **seven parts** off the Firecrest so it can never be driven away by anyone else, and hides them round the bay in seven places that mean something to her, each part carrying a rhyme that leads to the next. She ships the car itself on the night ferry to Isla Paloma and walls it into the old **powder store under the Paloma fort**, cup in the boot. She writes the first rhyme, puts it in a tin box with the starter key and gives it to Toby: "On June's seventeenth birthday. Not before. Promise me." Then she lets the world think she drove into the bay. Gorse follows her trail, writes down *where* she went that week, never works out *what* she did there, and closes the file: "Subject believed drowned." |
| 50 to 34 years ago | June grows up with Aunt Win in Vista Verde, told her mother died in an accident. Dess, under the name **Odie Wren**, gets the job of keeper of the Paloma fort light, from which, on a clear night, she can see the Coral Marina light across the bay. |
| 34 years ago | June's seventeenth birthday. Toby drives to Win's house with the tin box. A Castellane car is parked across the road (it was a hotel delivery van; he didn't know that). Toby panics, drives away, and every year after it is harder to go back. He puts the box in a storage unit at Cinder Creek: **lot 17**. |
| 33 years ago | Toby becomes keeper of the **Coral Marina light**. At ten that first night the fort light across the bay flashes three times, as the two lights have done every night for a hundred years (the keepers' goodnight). He flashes back, out of politeness. They have done it every night since. Toby thinks it's a fellow keeper keeping up an old custom. Dess knows exactly who it is. |
| 32 to 20 years ago | June becomes a driving instructor (Marlow School of Motoring, one dual-control Pipit), marries briefly, has **Pip**. She hates racing cars the way you hate the thing that took your mother. Aunt Win dies twenty years ago; June keeps the house, the shed and Win's ancient, frighteningly fast lawnmower. |
| 10 years ago | Rex Castellane dies, old, in his bed. His son **Leo** inherits forty hotels, the Speedway and the Neon Strand. Clearing his father's desk he finds the Gorse file and reads, in his father's handwriting on the last page, how the race was really won. He locks it in his study and puts "Castellane: Champions Since Day One" on every hotel. |
| 3 years ago | Professor **Ambrose Quill** publishes the third of his books proving the Firecrest is at the bottom of the bay. They sell 340 copies between them. |
| This spring | Leo, planning the **50th anniversary Southbay 500**, commissions a film of his father's "victory", *Champions Since Day One*, shot at Sunreel Studios and starring **Chet Valiant**, and bankrolls **Dash Lockwood**'s TV show to do a "Lost Legends" special on the Firecrest that will "lay the drowned-driver legend to rest". He hires **Ottoline Graves**, his Head of Guest Services, to keep an eye on anything to do with the Marlows. |
| This summer, week 1 | Toby, 81, forgets to pay the rent on lot 17. Cinder Creek Storage auctions it. **Pip Marlow**, 19, Speedway junior champion, currently banned from public roads for six months (92 in a 40 on Seawall Drive at three in the morning, "to see if I could"), sees *BRASK* stencilled on the unit's door in the auction list, knows the name from her mother's one photo of her grandmother, and buys it for $310. Dash's researcher and a Guest Services man bid against her. She needs a driver by the afternoon. She texts the number a Speedway mechanic gave her: Jay. **The DLC begins (d01).** |
| Weeks 1 to 2 | Act 1: three parts, the professor and his grandson, the film, the leak, Toby. |
| Weeks 2 to 3 | Act 2: June, the Speedway, the beach, the shop safe, the crusher, the airport. |
| Weeks 3 to 4 | Act 3: the island, flying, the claw machine, the estate, the bell, the beam, Odie. |
| Week 4, three days | Act 4: the rebuild, the bridge, the fort, the night before, and the 50th anniversary Southbay 500. |

## 3. Synopsis

### Act 1: Lot 17 (d01 to d08)
Pip Marlow buys a dead man's storage unit (he isn't dead; he forgot to pay) and finds a tin box: the Firecrest's starter key and a rhyme. Ottoline Graves's polite men in teal blazers want it, so Pip hires the driver everyone at the Speedway talks about. Jay gets her and the box out of Cinder Creek, and the name Firecrest takes him back to Nana Lu's bedtime story. Pip takes the rhyme to Professor Quill at Halcyon, the world's leading expert on why the car is at the bottom of the bay, and his twelve-year-old grandson Milo solves it in four seconds: the steering wheel is the valve wheel on the Cinder Creek water tower. Jay beats TV treasure hunter Dash Lockwood there (Dash takes a rusty tap). The professor screens the old race newsreel at the Starview drive-in; Guest Services come for the reel and Jay holds them off among the parked cars. The newsreel shows the bonnet bird, which Milo matches to the weathervane on Sunreel's western set, so Jay gets himself hired as stunt double to faded action star Chet Valiant on Castellane's propaganda film, and takes the bird between takes. The bird points to the Halcyon clock tower, where Jay climbs past campus security at night for the rally clock while Dash takes the minute hand. Dash always seems to know where to go: Jay runs down his TV van and finds Milo's blog printed out on the dashboard. The rally clock is engraved "for O.M. by T. Brask", which leads to old Toby, keeper of the Coral Marina light; Jay fights Guest Services off his breakwater and meets Leo Castellane, who smiles a lot and offers a lot of money. That night Toby confesses: Dess gave him the tin box for her baby's seventeenth birthday, and he never delivered it. The next rhyme points, Pip realises, to her own mother's garden shed. Jay decides whether Milo keeps blogging (`dlc_blog_on` or `dlc_blog_off`).

### Act 2: Hiding in Plain Sight (d09 to d16)
The carburettor is in Aunt Win's old lawnmower, which June Marlow, driving instructor, has been mowing her lawn with for twenty years ("That mower does forty"). June catches them and, when Guest Services arrive, the only car is her dual-control learner Pipit: Jay escapes through the Verde Mall car park with June on the other brake marking his faults. The next rhyme is under the honours board in the Speedway winners' enclosure, and the only way in is to win: Jay drives the Celebrity Heritage Race in Chet's helmet ("it's for the movie") while Monty Sprake gets his name wrong over the PA. Under the board, Dess's name, painted out. The headlamps are the lamps on two Sandpiper lifeguard towers, inside a beach Castellane has fenced off; Jay jumps the skate park ramp over the fence. A stamp inside a headlamp sends him to the old Brask & Marlow Speed Shop, now a Kwik Pik, where he has to hold up the shop to get the clerk to open a floor safe nobody has opened in fifty years, and leaves the money ("You're not taking the money?"). While he does, Guest Services raid lot 17 and take everything to the Ironside scrapyard to be crushed. Jay gets the parts off the crusher belt with seconds to spare, all but two (the rally clock and the carburettor), which Dash grabs "for safekeeping" on Castellane's orders. Chet arrives with the film's replica Firecrest, and Jay drives it as a decoy through the rail yard and round the power station while Pip slips out with the rest; on the way Chet asks whether the film is true (`dlc_chet_told` or `dlc_chet_kept`). Dash is flying the two parts to Castellane on the island in Castellane's chartered airliner. Jay goes through the airport terminal, down the jet bridge, onto the plane, takes the flight deck, and lands a 180-seat airliner on Paloma Field's little runway. A man in a flying-club jumper walks out with a clipboard: "Four out of ten. You bent my windsock."

### Act 3: Isla Paloma (d17 to d23)
Hob Finnegan of the Paloma Flying Club runs real doughnuts past Castellane's bakery monopoly to the old folk of Old Paloma, and Jay's first island job is a van full of them, through Guest Services checkpoints on the Neon Strand. At the plaza café an old woman who keeps the fort light buys a dozen and taps the counter three times. Hob teaches Jay to fly, because the bridge is watched and everything on the island is easier from the air; from a Skylark over Wonder Wharf Jay sees Guest Services loading the Golden Grabber claw machine onto a truck. He tails it down the Strand and takes the whole machine. Nobody has won its prize in fifty years because it is rigged; Milo says unplug it. Inside the gear knob, a rhyme about a bell that only rings for the plaza festival in two days. Meanwhile Quill learns of the Gorse file: Jay flies Hob's helicopter over Leo's party, bails out onto the observatory dome, and takes the file from the estate. In the garden he finds Dash, handcuffed to his own camera crane by Ottoline for losing the parts, and decides whether to cut him in (`dlc_dash_in` or `dlc_dash_left`). The file proves the race was stolen and ends at the Paloma fort. At the festival Jay rings the bell, takes the ignition coil from its clapper, and fights his way off the plaza roofs. The last rhyme: fly the line between two lights at ten. Jay takes Toby up in the Skylark and flies the beam from the Coral Marina light across the bay to the fort. The keeper, Odie Wren, opens the door. Toby knows her before she speaks. Odie is Dess. Ottoline's people arrive for the Gorse file and Dess's logbook, and Jay wrecks their car before it reaches the Castellane estate. Dess agrees: they finish it.

### Act 4: The Last Lap (d24 to d30)
Toby needs his tools, the film's period tyres and the parts from lot 17; Jay collects them across the mainland while Leo makes his last offer by phone. June asks Jay for "one lesson, so I know who's driving my daughter about", and in the middle of her test route Jay has to decide whether to tell her that her mother is alive (`dlc_june_told` or `dlc_june_wait`). Castellane closes the Paloma Bridge "for a private event", so Jay takes an airport fire engine through the roadblock. At the fort Toby knocks through the wall, the dust sheet comes off, and the Firecrest is rebuilt one part at a time while Jay holds off Guest Services; it starts on the first turn of the key. That night Ottoline steals it on a transporter heading for the Ironside crusher, with a comment card on the empty floor, and Jay runs the transporter down over the causeway. On race morning Castellane's roadblocks close every route to the Speedway; Jay blows them open (with `dlc_blog_on`, Milo's readers are already sitting on two of them). Then the last lap: the Firecrest from the fort up the Neon Strand, over the bridge, through Harbor Point, down the coast road and in through the Speedway's tunnel into the middle of the 50th anniversary Southbay 500, Guest Services behind, whoever the player's choices brought out in front, Monty on the PA finally getting Jay's name right. On the finish line, with the real cup and 40,000 people watching, Jay helps decide what happens to the Firecrest: *Hers*, *Everybody's* or *Gone Again*.

---

## 4. Characters

Looks use the format-doc shape (`skin`, `hair`, `top`, `bottom`, `shoes`, `build`, optional `hat: true`). Voices use `gender`, `pitch` (0.6 to 1.4) and `rate` (0.85 to 1.15). Every major character has a want, a secret (and when it comes out), an arc, and a speech guide with sample lines. Ids must not clash with the main cast (which already uses `barnaby`, `baptiste`, `nico`, `ruth`, `hattie`, `dot`, `lister`, `racer`, `fare` and more): use exactly the ids below.

### 4.0 Jay Mercer (`jay`). The driver
Already defined by the main game; do not redefine him. In the DLC he is the same man (spare, dry, talks to cars, "I drive"), with one difference: here he is the grown-up. He drives a banned teenager, babysits a carsick professor and takes phone calls from a twelve-year-old, and the player should feel him liking it more than he lets on. He has never flown anything (Hob's lessons are new to him) and never been inside a Speedway as a driver ("Races have rules. I'm more of a... no rules sort of driver."). His hook is Nana Lu's bedtime story (d01): he knew about the Firecrest before anyone else in the car.
- **Sample lines (DLC):**
  - "I don't do treasure hunts. I do the part after somebody finds the treasure and somebody else wants it."
  - "(to the Firecrest's steering wheel) Fifty years on a water tower. Let's get you home."
  - "Milo. Slower. I'm driving, and you're twelve, and both of those are your fault."
  - "Seatbelt, Professor. It won't help with the sick, but it'll help with everything else."
  - "(to June, d30) She didn't leave you. She left you a road. Somebody just forgot to hand you the map."

### 4.1 Pip Marlow (`pip`), 19. The hirer
- **Look:** `{ skin: 0xc68a5e, hair: 0xd8471f, top: 0xf2f2ee, bottom: 0x1d2e52, shoes: 0xd8262e, build: 'slim', hat: true }`. White race-team polo with too many tiny sponsor patches (a wart clinic, a prawn shack), navy cargo trousers, red trainers, a red cap over red-orange hair in a short plait.
- **Voice:** `{ gender: 'female', pitch: 1.18, rate: 1.12 }`
- **Bio:** Southbay Speedway junior champion, mechanic's hands, a temper and no patience at all. Currently banned from public roads for six months, which is why she needs Jay.
- **Want:** To find the Firecrest and prove her grandmother was the real winner, so that June will stop hating racing and maybe stop hating Pip's racing.
- **Secret:** She has not told her mother any of this. Her mum thinks she's doing a summer job at the Speedway shop (out in d09 when June catches them in the shed). Smaller secret: she wrote to Dash Lockwood's show two years ago with the "drowned driver" story and he never replied (comes out in d06; Dash doesn't remember).
- **Arc:** From "I don't need anyone, I need a driver" to letting other people (June, Jay, Toby, even Dash) be part of it. In Act 4 she gives up the driver's seat of the last lap to whoever the player's choices put there, and is glad.
- **Habits:** Calls Jay "Driver" until d08, then "Jay". Fiddles with the starter key on its little gold bird keyring until d17, when she clips it to Jay's belt ("Driver holds the key"); Jay carries it until he hands it to Dess in d27. Rates other people's cornering.
- **How she talks:** fast, blunt, half-finished sentences, speedway slang. Says "crap" when she stalls and "hell yes" when thrilled. Never cruel; impatient.
- **Sample lines:**
  - "I'm banned, not dead. Drive. No, not like that. Like that. Yes. Thank you."
  - "Ninety-two in a forty. It was three in the morning. The road was empty. I was making a point."
  - "Gran won that race by a car's length. Then they painted her out. I want her painted back in."
  - "(to June) I didn't tell you because you'd have said no and then you'd have been right."
  - "And mind the road. (beat) I don't know why I keep saying that."

### 4.2 Milo Quill (`milo`), 12. The riddle-solver
- **Look:** `{ skin: 0x8d5a3b, hair: 0x1a1410, top: 0xf2c500, bottom: 0x3a3d42, shoes: 0x2a55d8, build: 'slim' }`. Yellow T-shirt with a hand-drawn Firecrest on it (he sketches the car in d02, draws it on the shirt in d03 and wears it from d04 on), grey shorts, blue trainers, glasses on a cord like his grandad's.
- **Voice:** `{ gender: 'male', pitch: 1.38, rate: 1.12 }`
- **Bio:** Professor Quill's grandson, staying at Halcyon for the summer while his parents work abroad. Reads everything, forgets nothing, and runs *The Firecrest Files*, a blog with 41 subscribers, one of whom is his gran.
- **Want:** To solve the whole thing before the grown-ups. To be taken seriously. (Underneath: to have a summer that isn't just his grandad's study.)
- **Secret:** His blog is the leak. He posts every riddle the day it's found, with photos, and Dash reads it. He doesn't hide it; he simply never imagines anybody important reads his blog. Revealed d06; he is mortified ("Four people read it. FOUR. One of them is Gran.").
- **Arc:** From the kid on the end of the phone to the person the grown-ups phone first. With `dlc_blog_on` his readers save the finale; with `dlc_blog_off` he learns to keep a secret and is the only person outside the car who knows the plan. Either way he writes the last riddle of the DLC (Ending C) or the plaque (Ending B).
- **Never in danger:** he is on the phone, on a video call, or watching from the grandstand. When a scene turns, someone sends him home and he objects.
- **How he talks:** precise, quick, a fact first, a joke second; corrects grammar ("fewer, not less"); says "Probably." after big claims; calls Jay "Mr Mercer" until Jay tells him not to (d05), then "Jay" with obvious pride.
- **Sample lines:**
  - "Did you know the Halcyon clock is eleven seconds slow? That's important. Probably."
  - "Tin man. Silver, tall, holds water. It's a water tower. Grandad, it's a water tower. You wrote a chapter on tin."
  - "Score update: Team Firecrest three, Lockwood's Lost Legends nil, plus one rusty tap and a cowboy's spur."
  - "I'm not crying. My glasses are steaming up. It's humid. It's a humid riddle."
  - "Fewer goons, Jay. Fewer. You can count goons."

### 4.3 Professor Ambrose Quill (`prof_quill`), 63. The historian
- **Look:** `{ skin: 0xe0b48f, hair: 0xd8d4cc, top: 0xb59a70, bottom: 0x5c4a32, shoes: 0x3a2a1a, build: 'tall' }`. Tan corduroy jacket with elbow patches, brown trousers, brown brogues, white hair like a dandelion clock, half-moon glasses.
- **Voice:** `{ gender: 'male', pitch: 0.82, rate: 0.92 }`
- **Bio:** Professor of Local History at Halcyon University and author of three books proving the Firecrest is at the bottom of the bay (*The Drowned Driver*, *Deeper Still* and *Definitely Drowned: A Reply to My Critics*). He gets carsick in every car ever made.
- **Want:** To be right. Then, as it becomes clear he isn't, to be part of it anyway.
- **Secret:** He has always half-hoped he was wrong. He keeps the only print of the Southbay 500 newsreel in his office (out in d03) and has watched it two hundred times.
- **Arc:** From "Definitely drowned" to standing on the Speedway infield in d30 holding the cup for the photograph, announcing a fourth book, *I Was Wrong: A History*.
- **How he talks:** long sentences, footnotes out loud, "Great Scott", "blast", "my dear fellow". Carsick lines are short and urgent. He is fine in aircraft ("Planes don't corner, you see. Cars corner.").
- **Sample lines:**
  - "Clearly the rhyme refers to the paddle steamer *Tin Mistress*, sunk 1904. (beat) Or a water tower. Yes. Fine."
  - "Mr Mercer, I must ask you to take the next bend as though it were a sacred trust. (beat) Blast. Pull over."
  - "Three books, Milo. Three books proving she drowned. I shall have to write a fourth, and it will be very short."
  - "History is not what happened. History is what somebody bothered to write down. Let's bother."

### 4.4 June Marlow (`june`), 51. The daughter
- **Look:** `{ skin: 0xc68a5e, hair: 0x6b4a32, top: 0x78b8e8, bottom: 0xcbbd9c, shoes: 0xefefea, build: 'average' }`. Pale-blue blouse with a "MARLOW SCHOOL OF MOTORING" badge, beige slacks, sensible white shoes, a clipboard, a pencil behind her ear. Pip's face, thirty years on and much more tired.
- **Voice:** `{ gender: 'female', pitch: 1.02, rate: 0.94 }`
- **Bio:** Vista Verde's driving instructor for thirty years: one dual-control Pipit, a 94% first-time pass rate and a garden shed nobody else may touch. Raised by her Aunt Win, told her mother died in a racing accident. She has never forgiven a racing car.
- **Want:** To keep Pip safe and off the track. Underneath: to know what happened to her mother.
- **Secret:** She has kept her mother's racing helmet in the shed for forty years and tells everyone it's a motorcycle helmet she found. (Out in d25.)
- **Arc:** From "Minor fault" to riding the Firecrest's last lap (`dlc_june_told`) or meeting her mother on the infield (`dlc_june_wait`), and in Ending A giving her seventy-nine-year-old mother a driving lesson.
- **How she talks:** calm, clipped instructor voice even in a gunfight. "Mirror, signal, manoeuvre." Marks everything: "Minor fault." Never swears. When something really matters, she stops using the instructor voice, and that's how you know.
- **Sample lines:**
  - "Minor fault. Minor fault. (beat) That was a fountain. Serious fault. (crosses it out) No. Minor."
  - "I don't care if they're shooting, Mr Mercer, you indicate."
  - "That mower does forty. On the flat. I've never asked why."
  - "(quietly, no clipboard) Somebody used to say that to me. 'Mind the road.' I don't know who."
  - "Hands at ten and two, Mum. No, ten and two. Oh, for heaven's sake."

### 4.5 Toby Brask (`toby`), 81. The engineer who never delivered
- **Look:** `{ skin: 0xd9a37c, hair: 0xeeeeea, top: 0x1d2e52, bottom: 0x3a3d42, shoes: 0x111111, build: 'slim', hat: true }`. Navy keeper's pullover with elbow holes, grey work trousers, black boots, a navy knitted hat, white stubble, a spanner in every pocket.
- **Voice:** `{ gender: 'male', pitch: 0.78, rate: 0.88 }`
- **Bio:** Built the Firecrest with Dess Marlow fifty years ago and has kept the Coral Marina lighthouse for thirty-three. He talks to engines and lighthouses, and not much to people.
- **Want:** To be forgiven. To see the car run once more.
- **Secret:** (1) Dess gave him the tin box for June's seventeenth birthday and he never delivered it, out of fear and then out of shame (confessed d08). (2) He was in love with Dess and never said (never said aloud; the player sees it in d22).
- **Arc:** From hiding in his lighthouse to finishing the job he was given: he rebuilds the Firecrest (d27) and, in every ending, hands June the tin box properly, thirty-four years late.
- **How he talks:** short sentences, engine metaphors, "hell's bells", a long silence before anything important. Calls Jay "son" and Pip "trouble".
- **Sample lines:**
  - "She's not a car. She's a promise with four wheels. Hell's bells, I'm getting soft."
  - "(long pause) I drove to the house. There was a car outside. I drove away. Thirty-four years I've been driving away."
  - "Every night at ten the fort light says goodnight. I say it back. Manners."
  - "Carburettor's fine. Mowed a lawn for fifty years. Best-maintained carb on the island."

### 4.6 Dess Marlow (`dess`; `odie` before the reveal), 79. The lost driver
- **Look:** `{ skin: 0xc68a5e, hair: 0xe8e4dc, top: 0xd8471f, bottom: 0x2b2f35, shoes: 0x3a2a1a, build: 'slim' }`. A faded flame-orange cardigan over a keeper's shirt, dark trousers, brown boots, white hair cropped short, a racing driver's watch on a man's strap. The same look under both ids.
- **Voice:** `{ gender: 'female', pitch: 0.96, rate: 1.0 }`
- **Bio:** Won the Southbay 500 fifty years ago and drove into legend. As "Odie Wren" she has kept the Paloma fort light for nearly fifty years, close enough to see her old engineer's light, too far to be found.
- **Want:** To know June is happy without ever making her unhappy. To finish her lap, though she would never say so.
- **Secret:** She is alive (seeded d17: three taps on the counter, the keyring look; revealed d22/d23). She saw June twice, from a distance, at her wedding and at Pip's first race, and left both times.
- **Arc:** From "Some things are better as stories" (d23) to driving, or riding, her lap of honour in front of 40,000 people, and saying "And mind the road" to her daughter's face.
- **Speaker id rule:** use `odie` (name "Odie Wren") in d17 and in d22 until Toby says her name in d23; switch to `dess` (name "Dess Marlow") from that line on. Never use `dess` before d23.
- **How she talks:** dry, quick, completely unsentimental until she isn't; old racing slang ("flat out", "a good line"); answers questions with questions. Pip's bluntness came from somewhere.
- **Sample lines:**
  - "(as Odie, d17) Twelve doughnuts. The jam ones. Don't look at me like that, young man, I'm not a ghost."
  - "Hello, Toby. You took your time."
  - "I didn't hide a car. I hid a road. Seven stops and a door at the end. It was for her."
  - "Fifty years I've been dead. It's very restful. I don't recommend coming back."
  - "(tapping the wheel three times) Right. Let's see if I've still got it."

### 4.7 Dash Lockwood (`dash`), 44. The rival
- **Look:** `{ skin: 0xe8c39e, hair: 0xd29a1c, top: 0x6b4a32, bottom: 0xcbbd9c, shoes: 0x6b4a32, build: 'average', hat: true }`. A khaki explorer's shirt with too many pockets under a brown leather jacket, beige chinos, brown boots, a wide-brimmed hat, golden TV hair and a perfect tan.
- **Voice:** `{ gender: 'male', pitch: 1.0, rate: 1.08 }`
- **Bio:** Host of *Lockwood's Lost Legends* ("Legend... FOUND!"), the bay's favourite TV treasure hunter, who has found eleven legends in eight series, all of them the wrong thing. Castellane is paying for this special, and Dash would like series nine.
- **Want:** A real find, just once. Ratings. To be liked.
- **Secret:** He has never found anything real and knows it (admits it to Jay, d20). His researcher reads Milo's blog; Dash doesn't read anything.
- **Arc:** From rival to (with `dlc_dash_in`) a terrible but brave helicopter cover pilot and the man who broadcasts the truth live, finally saying "Legend... FOUND!" about the right thing; or (with `dlc_dash_left`) a man who wriggles free and tells Castellane's version on air until it collapses round him.
- **How he talks:** two voices. On camera: booming, alliterative, "Viewers, VICEHAVEN!" Off camera: anxious, normal, mildly sweary ("crap, crap, crap"). He's never nasty; he takes things because nobody has ever told him not to.
- **Sample lines:**
  - "(to camera, holding a rusty tap) The steering wheel of the Firecrest. Legend... FOUND! (off camera) Is that a tap? Crap."
  - "It's a public blog, mate. If you didn't want me reading it you should've made it boring. It's very good, by the way."
  - "Eight series. Eleven legends. Not one of them real. Do you know what that does to a man's hat?"
  - "I'll fly cover. I've had a lesson. Well. I've watched a lesson."

### 4.8 Leo Castellane (`leo`), 58. The hotel king
- **Look:** `{ skin: 0xd9a37c, hair: 0x3a3d42, top: 0xeeeae2, bottom: 0xeeeae2, shoes: 0x6b4a32, build: 'tall' }`. Cream linen suit, open collar, no tie, tan loafers, silver at the temples, a gold Castellane "C" pin. Smiles with his whole face except the eyes.
- **Voice:** `{ gender: 'male', pitch: 0.88, rate: 0.96 }`
- **Bio:** Owns the Neon Strand, the Southbay Speedway, forty hotels and most of Isla Paloma, under a slogan that says his family have been "Champions Since Day One". He is charming, generous, and cannot afford for the slogan to be a lie.
- **Want:** The Firecrest and the cup gone for good before the 50th anniversary race. Underneath: for his father's lie to stop being his.
- **Secret:** He has known for ten years that the race was stolen; it's in his father's handwriting on the last page of the Gorse file (out in d20).
- **Arc:** From smiling offers (d07: $50,000; d24: $250,000) to cornered; at the finish line he either takes his own name down (Ending B), watches it go to June's driveway (A), or watches an empty fort on the news (C). He is never a cartoon: he loved his father.
- **How he talks:** warm, unhurried, first names, the language of hospitality ("Let me take care of that for you"). Never swears, never raises his voice. When he finally does, it's one word.
- **Sample lines:**
  - "Jay. May I call you Jay? Everybody here calls me Leo. The staff call me Mr Castellane, but I'm working on it."
  - "Fifty thousand dollars to bring me whatever you find. Not to stop. Just to bring it to me first. That's not a bribe, that's a finder's fee."
  - "My father won that race. It says so on forty hotels."
  - "(d30, quietly) He told me it was a good story. He said nobody gets hurt by a good story."

### 4.9 Ottoline Graves (`ottoline`), 47. Head of Guest Services
- **Look:** `{ skin: 0xf0d5be, hair: 0x111111, top: 0x13b5b1, bottom: 0x13b5b1, shoes: 0x0e0e10, build: 'tall' }`. Teal Castellane blazer and skirt-suit, black heels, black hair in a sharp bob, a radio earpiece, a stack of printed comment cards.
- **Voice:** `{ gender: 'female', pitch: 0.92, rate: 0.9 }`
- **Bio:** Runs Castellane Guest Services: the polite people in teal blazers who make problems leave the island. She has never once raised her voice.
- **Want:** To make the problem go away and be thanked for it.
- **Secret:** She doesn't care about the Castellane legend at all; she cares about winning, and the Firecrest has become a personal matter (out in d28, when she steals it herself instead of letting Leo give in).
- **Arc:** The dangerous one. From comment cards to crushers. She gets away from the Ironside gate in d28 and is arrested in the Speedway tunnel in d30, in every branch, holding a comment card she never got to hand over.
- **How she talks:** customer-service English with steel inside. "I'm afraid", "at this time", "we'd love your feedback". She calls violence "assistance" and threats "reminders".
- **Sample lines:**
  - "Good afternoon. I'm afraid that box belongs to Castellane Hospitality. Would you like assistance returning it?"
  - "(handing over a card) How would you rate your experience of being followed today? One to five."
  - "Mr Castellane is very generous. I'm the part of Mr Castellane that isn't."
  - "We'd love your feedback. (beat) We'll be in touch either way."

### 4.10 Hob Finnegan (`hob`), 67. The flying-club man
- **Look:** `{ skin: 0xe0b48f, hair: 0xb8bcc0, top: 0x2a6a3a, bottom: 0x6b6545, shoes: 0x3a2a1a, build: 'heavy', hat: true }`. Green Paloma Flying Club jumper with a darned elbow, olive trousers, brown boots, a flat cap, headphones round his neck, a clipboard he marks landings on.
- **Voice:** `{ gender: 'male', pitch: 0.86, rate: 1.04 }`
- **Bio:** Chief (and only) instructor of the Paloma Flying Club on the last bit of Isla Paloma Leo Castellane doesn't own. He smuggles doughnuts past the Castellane bakery monopoly in a Skylark, every Tuesday, to the old folk of Old Paloma.
- **Want:** To keep the airfield. To keep the doughnuts flying. To give somebody a ten, one day, before he retires.
- **Secret:** He knows Odie Wren is someone famous; he has delivered her jam doughnuts for twenty years and once saw a race programme on her wall. He never asked. (Says so in d23: "None of my business. Doughnuts are my business.")
- **Arc:** From furious (Jay landed an airliner on his runway) to Jay's teacher and fiercest supporter. With *Marks Out of Ten* done, he finally gives Jay a ten.
- **How he talks:** cheerful, loud over engines, "crikey", "bloody", "right then". Gives marks for everything. Thinks of planes as cars with "one more way to crash".
- **Sample lines:**
  - "Four out of ten. We walked away. You bent my windsock. Who taught you to fly?" Jay: "You, in about a minute."
  - "A plane is a car with one more way to crash. Respect the extra way."
  - "Castellane's got the croissants. I've got the doughnuts. That's the war, son. That's the whole war."
  - "That was a landing in the legal sense. Six."

### 4.11 Chet Valiant (`chet`), 58. The film star
- **Look:** `{ skin: 0xe8c39e, hair: 0x1a1410, top: 0xa8101c, bottom: 0x111214, shoes: 0xf2f2ee, build: 'heavy' }`. Red racing jacket from the film's wardrobe (he refuses to take it off), black jeans, white loafers, a dyed-black quiff, enormous sunglasses.
- **Voice:** `{ gender: 'male', pitch: 0.8, rate: 0.95 }`
- **Bio:** Star of *Oversteer 2: Understeer* (there was no *Oversteer 1*; "it's a long story"), now playing Rex Castellane in *Champions Since Day One* and living in a trailer in Cinder Creek between takes. Will not, under any circumstances, drive over thirty.
- **Want:** One more good part. To be in something true.
- **Secret:** He has never driven anything faster than thirty in his life. Every car scene of his career, all four racing drivers, was a stunt double (admits it in d10). He has never sat in a race car with the engine running.
- **Arc:** From "Loved the first one" to (with `dlc_chet_told`) standing in the commentary box telling 40,000 people the true story of the Southbay 500, the best performance of his life; or (with `dlc_chet_kept`) finding out live and walking off his own film.
- **How he talks:** grand, warm, theatrical, quoting his own films, calling everyone "kid". Utterly kind. Panics above thirty.
- **Sample lines:**
  - "Never over thirty, kid. I made that promise to my insurers and my mother, in that order."
  - "It's for the movie! (beat, quieter) It is for the movie, right?"
  - "Loved the first one? Thank you. Thank you. There wasn't one. But thank you."
  - "I've played four racing drivers, two pilots and a submarine. Kid, I've never been over thirty in any of them."

### 4.12 Monty Sprake (`monty`), 55. The voice of the Speedway
- **Look:** `{ skin: 0xd9a37c, hair: 0x8f8a73, top: 0xf2c500, bottom: 0x2b2f35, shoes: 0x111111, build: 'heavy' }`. Yellow commentator's blazer, dark trousers, a headset with a foam microphone, moustache.
- **Voice:** `{ gender: 'male', pitch: 0.92, rate: 1.14 }`
- **Bio:** Thirty years the voice of the Southbay Speedway, and of every police chase on the coast road on local radio. Knows every driver, every lap record and nobody's name.
- **Want:** One great race to call before he retires.
- **Secret:** He was eight, sitting on his dad's shoulders, when Dess crossed the line. He has always known who won. Says so on air in d30.
- **Arc:** From getting Jay's name wrong to getting it right, once, on the last lap; then calling the finish for Dess, fifty years late.
- **How he talks:** commentary at full speed, alliteration, wrong names ("Jim Mercy!"), heartfelt when it counts. Used on the PA (`say` lines during races) and on the radio.
- **Sample lines:**
  - "And it's Chet Valiant in the number seven! Chet Valiant has... grown? Chet Valiant has changed shape!"
  - "Into turn four it's Jim Mercy! Jake Murphy! Whoever he is, he's flying!"
  - "I was eight. I was on my dad's shoulders. I saw her cross that line. (beat) Ladies and gentlemen, the winner of the Southbay 500: Dess Marlow."

### 4.13 Memories only (in `blackout` scenes)
- **Nana Lu** (`nana_lu`, the main game's character, already defined): Jay's grandmother, telling the Firecrest bedtime story to Jay at six (d01) and, in Jay's memory, in d22 and the endings. Only ever as a memory. Her lines: "And she drove into the night, and nobody ever saw her again." / "Somewhere she could see the sea, I expect." / "Some stories aren't finished, Jay. They're just waiting for a driver."
- **Young Dess and young Toby** appear only in the newsreel (`caption` lines describing the footage) and the Gorse file (read aloud). Don't give them speaker ids.

### 4.14 Main-story cameos
None in person. The main cast's lives change too much across the main story's branches and endings for any call or text to be true at every point. Exception: Nana Lu in memories (above), and Jay may mention "Nana" and "Lulu" (her car) freely; he never mentions where Lulu is or anyone else from the main story.

### 4.15 Minor characters
Give each the look and voice in `dlc.js`; use these ids.
- **Fenella Moss** (`fenella`), 42: director of *Champions Since Day One*. Megaphone, sun visor, three phones. Hates the script, loves a good stunt. "It's for the movie" is her line before it's anyone's. Lends Jay the replica (d14) and the tyres (d24).
- **Kit Ambrose** (`kit`, she), 31: Dash's camera operator and researcher, the one who actually reads Milo's blog. Deadpan. "We're rolling. We're always rolling."
- **Clem Ruddock** (`clem`), 70: Cinder Creek Storage manager and auctioneer, fastest mouth in the west (d01).
- **Gorse** (no speaker; a name on a file): the Castellanes' private detective fifty years ago.
- **Officer Plum** (`plum`), 59: Halcyon campus security, torch, bicycle, takes his job very seriously (d05).
- **Benny Akande** (`benny`), 24: the Sandpiper Kwik Pik clerk who has to open a floor safe nobody has opened in fifty years for a man who doesn't want the money (d12).
- **Gully** (`gully`), 22: Sandpiper lifeguard with a whistle and a grudge (d11, dsf1).
- **Captain Daventry** (`daventry`), 50: Castellane's charter pilot, a Guest Services man in a pilot's hat (d15 to d16).
- **Lorna Pike** (`lorna`), 66: the Wonder Wharf arcade attendant who has watched people fail at the Golden Grabber for forty years (d19).
- **Ines Duarte** (`ines`), 70: runs the café on Paloma Plaza; Hob's best doughnut customer (d17, d21).
- **Teddy Castellane** (`teddy`), 21: Leo's nephew and the Castellane Racing works driver; Pip's rival in *Summer Series*. Talented, spoilt, not a villain.
- **Rosa Lindqvist** (`rosa`), 16: June's most nervous pupil (*Dual Control*).
- **Guest Services staff** (`gs_staff`): generic teal-blazered goons. "Good afternoon." Then they shoot.
- **Speedway marshal** (`marshal`), **studio guard** (`studio_guard`), **drive-in kid** (`popcorn_kid`) as needed: one-line parts.
- **Police officer** (`officer`): the DLC's own uniformed officer for spoken lines (d28 "Are you lads a band?", d30 "Are you in the band?"). Never the main cast's `cop`.
- **Valet** (`valet`): the Castellane Palace valet, one line (d19, optional).
- **Mechanic** (`mechanic`): a Castellane Racing mechanic in the lock-up (dsr3), "Your uncle's orders, Mr Teddy."
- **Vicehaven Tower** (`tower`): the air traffic controller, voice only (dsf4).
- **Dougie Penn** (`dougie`), 11: Vista Verde School's pelican mascot, in costume, in character (dsl2).
- No lines, so no ids: the car thief (dsl1), Vince the stuntman (dst2), Father Anselmo, Mr Okafor, the security screener and the librarian (captions only), Gary the pyrotechnics man (shouted at, never seen).

---

## 5. Factions

| id | Name | Colours | What they are |
|---|---|---|---|
| `guest_services` | Castellane Guest Services | teal `0x13b5b1`, white `0xf2f2ee` | Leo Castellane's private security, run by Ottoline Graves: teal blazers, white shirts, earpieces, polite greetings, pistols and SMGs, later shotguns. Teal-and-white Sovereigns and Terns, a Bulwark for the heavy work. Hostile. They say "Good afternoon" before they shoot and leave comment cards after. They work on the island, at Castellane properties on the mainland (Speedway, beach club, yacht club) and wherever Ottoline sends them. |
| `lockwood_tv` | *Lockwood's Lost Legends* | purple `0x3b1558`, gold `0xd29a1c` | Dash's TV crew: Kit on camera, a sound man, a runner, a purple Porter van with a satellite dish, later a hired helicopter. Never hostile; in the way, always filming. |
| `castellane_racing` | Castellane Racing | gold `0xd29a1c`, black `0x0e0e10` | The Speedway's works team: Teddy Castellane and three drivers in gold-and-black Zephyrs. Rivals in races, not fighters (until they ram). |
| `flying_club` | Paloma Flying Club | green `0x2a6a3a`, cream `0xefefea` | Hob and four retired members who mostly drink tea. Friendly. They wave flags, tow banners and, in the finale, hold up handwritten signs. |
| `firecrest_fans` | Readers of *The Firecrest Files* | flame `0xe0481c`, yellow `0xf2c500` | Only with `dlc_blog_on`, from d29: Milo's readers in home-made Firecrest T-shirts, sitting on roadblocks and lining the route. Friendly crowd, never fighting. |

The police (`vpd`) work as in the main game: heat from crimes seen, the helicopter at 4 and up. Guest Services are not police and the police don't like them (a joke in d28 and d30).

## 6. Places

### 6.1 Built-in landmarks (registered by the architect; use these ids directly, never redefine them)
| id | District | What's there for the story |
|---|---|---|
| `cinder_storage` | cindercreek | Cinder Creek Storage: rows of roll-up units, the auction yard (d01) |
| `starview_drivein` | cindercreek | the Starview drive-in: big screen, projection booth, rows of parked cars (d03) |
| `cinder_truckstop` | cindercreek | truck stop and diner on the edge of town (d01 escape, d24) |
| `halcyon_library` | halcyon | the university library; Quill's department next door (d02) |
| `halcyon_clocktower` | halcyon | the clock tower, the rally clock behind its face (d05) |
| `halcyon_quad` | halcyon | the lawns where Dash's van parks (d06, dsr2) |
| `sunreel_gate` | sunreel | the studio gate, barrier and guard hut (d04, d14, d24) |
| `sunreel_backlot` | sunreel | sound stages and the backlot roads (d04, dst1) |
| `sunreel_western_set` | sunreel | the western street set; the sheriff's office weathervane (d04) |
| `coral_marina` | coralmarina | jetties and moored yachts (d06 end, d08) |
| `marina_lighthouse` | coralmarina | Toby's lighthouse on the breakwater (d07, d08, d22, d24) |
| `yacht_club` | coralmarina | the yacht club terrace, Leo's yacht *Day One* (d07) |
| `verde_mall` | vistaverde | the mall and its huge car park (d09, dsl3) |
| `vista_verde_school` | vistaverde | the school and its gates (dsl2) |
| `southbay_speedway` | thebowl | the oval, the grandstands, the pits (d10, d30, dsr1, dsr4) |
| `mariner_stadium` | thebowl | the stadium and its car parks (dst4) |
| `expo_hall` | thebowl | exhibition hall: "Castellane: 50 Years of Champions" exhibition (d29) |
| `sandpiper_beach` | sandpiper | the beach, the lifeguard towers (d11, dsf1) |
| `sandpiper_promenade` | sandpiper | the promenade, the Kwik Pik (d12) |
| `skate_park` | sandpiper | the skate park and its ramps (d11) |
| `ironside_scrapyard` | ironside | the crusher, car stacks (d13, d28) |
| `ironside_power` | ironside | the power station chimneys (d14, dsf2) |
| `ironside_railyard` | ironside | freight wagons, the rail yard (d14) |
| `wonder_wharf` | neonstrand | the funfair, big wheel, arcade row (d18, d19) |
| `neon_strand` | neonstrand | the resort strip (d17, d23, d30, dsr3) |
| `paloma_convention` | neonstrand | convention centre and its loading dock (d19) |
| `paloma_plaza` | oldpaloma | the plaza, church, bell tower, café (d17, d21) |
| `paloma_harbour` | oldpaloma | fishing harbour (d21 escape) |
| `paloma_fort` | oldpaloma | the old stone fort, the lighthouse, the powder store (d22, d23, d27, d30) |
| `paloma_gardens` | palomaheights | botanical gardens (d23 chase) |
| `paloma_observatory` | palomaheights | the observatory dome Jay parachutes onto (d20, dsf3) |
| `paloma_estate` | palomaheights | Leo's estate, the biggest house on the island (d20) |
| `paloma_field` | palomafield | the airfield (d16, d17, d18, d20, d22) |
| `airport_terminal` | airport | departures hall interior (d15) |
| `airport_arrivals` | airport | arrivals interior (d15 alternative staging) |
| `vicehaven_international` | airport | the airport as a whole (ring targets, d26, dsf4) |
| `harbor_point`, `the_boardwalk` | harborpoint | old city guest spots (d26 start, d29, d30) |

### 6.2 Story places (defined in `dlc.js`; `district + kind + desc`)
| id | district | kind | desc |
|---|---|---|---|
| `lot_17` | cindercreek | garage | Cinder Creek Storage, lot 17: a dented roll-up door stencilled BRASK, a bare bulb, a folding table; the hunt's HQ |
| `cinder_water_tower` | cindercreek | overlook | the old silver water tower over the trailer park: a ladder, a catwalk, a brass valve wheel on top |
| `chet_trailer` | cindercreek | parking | Chet Valiant's silver trailer in the trailer park, a gold star on the door, a deckchair, a cardboard cut-out of himself |
| `drivein_rows` | cindercreek | parking | the back rows of the Starview drive-in, speakers on posts, cars for cover |
| `quill_study` | halcyon | storefront | the steps of the History building, Professor Quill's open study window above, piles of books on the sill |
| `quill_house` | halcyon | apartment_front | the Quills' faculty house at the edge of campus; Milo's bedroom window with a hand-drawn Firecrest poster |
| `campus_strip` | halcyon | street | the student strip of cafés and bookshops beside the campus |
| `halcyon_field` | halcyon | park | the university sports field and running track |
| `sunreel_city_set` | sunreel | street | the fake big-city street set: shopfronts with nothing behind them, a fake bank, a fake subway entrance |
| `sunreel_prop_yard` | sunreel | warehouse | the prop yard: fibreglass statues, crates, the replica Firecrest under a sheet, a tank on a low-loader |
| `stage_nine` | sunreel | warehouse | Sound Stage 9, its big doors open; the film's base camp and catering truck |
| `toby_breakwater` | coralmarina | pier | the breakwater out to the Coral Marina light, Toby's old pickup parked at its root |
| `day_one_jetty` | coralmarina | dock | the yacht-club jetty where Leo's white yacht *Day One* ties up |
| `marina_condos` | coralmarina | apartment_front | the luxury condos on the marina front; their car park |
| `june_house` | vistaverde | garage | June's bungalow: a perfect lawn, a learner Pipit on the drive, Aunt Win's shed at the side with the mower in it |
| `verde_culdesac` | vistaverde | street | a quiet cul-de-sac of identical houses, sprinklers, a basketball hoop |
| `verde_ballfield` | vistaverde | park | the ball field behind the school |
| `speedway_pits` | thebowl | garage | the Speedway pit garages, Pip's borrowed bay, tyres stacked |
| `winners_enclosure` | thebowl | storefront | the winners' enclosure beside the start-finish line, the old painted honours board on its back wall |
| `speedway_tunnel` | thebowl | street | the vehicle tunnel under the main stand into the infield |
| `bowl_car_park` | thebowl | parking | the vast stadium and Speedway car park |
| `lifeguard_tower_7` | sandpiper | beach | lifeguard tower 7, white and red, a big lamp on its rail |
| `lifeguard_tower_8` | sandpiper | beach | lifeguard tower 8, its twin further along, the other lamp |
| `beach_club_fence` | sandpiper | beach | the Castellane Beach Club's new fence across the sand, teal flags, a private party |
| `promenade_kwikpik` | sandpiper | storefront | the Kwik Pik on the promenade; above its sign, ghost letters BRASK & MARLOW SPEED SHOP; an old floor safe behind the counter |
| `coast_road` | sandpiper | street | the coast road along the back of the beach |
| `causeway_south` | sandpiper | street | the Sandpiper end of the Southbay Causeway |
| `crusher_belt` | ironside | warehouse | the scrapyard crusher, its conveyor, a crane with a magnet |
| `scrapyard_gate` | ironside | street | the scrapyard's access road and gate |
| `ironside_pipes` | ironside | construction | the refinery pipe racks beside the power station, a service road under them |
| `charter_stand` | airport | parking | the remote stand west of the gates where the Castellane charter Albatross waits with its stairs down |
| `airport_fire_station` | airport | garage | the airport fire station east of the hangars, crash tenders inside |
| `strand_checkpoint` | neonstrand | street | a Guest Services "Welcome Check" on the Neon Strand: teal cones, a gazebo, smiling men |
| `castellane_palace` | neonstrand | storefront | the Castellane Palace hotel, CHAMPIONS SINCE DAY ONE in gold neon, a doorman, a fountain |
| `golden_grabber` | neonstrand | storefront | arcade row at Wonder Wharf beside the big wheel: the Golden Grabber claw machine, a gear stick under its glass dome |
| `convention_dock` | neonstrand | warehouse | the loading dock behind the Paloma Convention Centre |
| `bridge_island_end` | neonstrand | street | the island end of the Paloma Bridge, where Guest Services put their roadblock |
| `bridge_mainland` | harborpoint | street | Anchor Street, the mainland approach to the Paloma Bridge |
| `harbor_roadblock` | harborpoint | street | a Guest Services roadblock on Seawall Drive, trucks across the road |
| `plaza_cafe` | oldpaloma | diner | Ines's café on Paloma Plaza: three tables outside, doughnuts under a glass cover, a counter Odie taps |
| `bell_tower` | oldpaloma | church | the church on Paloma Plaza and its bell tower, the bell visible in the arch |
| `plaza_roofs` | oldpaloma | rooftop | the flat roofs round the plaza, washing lines, festival bunting |
| `old_lanes` | oldpaloma | alley | the narrow lanes of Old Paloma, steps and arches |
| `fort_light` | oldpaloma | overlook | the fort lighthouse and Odie Wren's blue door |
| `powder_store` | oldpaloma | warehouse | the powder store in the fort's wall, bricked up fifty years ago; after d27 an open arch with the Firecrest inside |
| `estate_garden` | palomaheights | mansion | Leo's back lawn: party lights, a swimming pool, a string quartet, Dash's camera crane |
| `estate_gate` | palomaheights | street | the estate's gates and the road down the hill |
| `paloma_clinic` | palomaheights | hospital_front | the private clinic with a rooftop helipad (dsf3) |
| `hob_hangar` | palomafield | garage | the Paloma Flying Club hangar: doughnut boxes, a kettle, Hob's Skylark and the club's Sparrow |
| `field_apron` | palomafield | parking | the apron at the end of the runway where aircraft are parked |

### 6.2b Places added by the beat sheets (editor; all are in `dlc.js`)
Climbable spots (`water_tower_top`, `sheriff_roof`, `clocktower_ledge`, `clinic_helipad`) and exact track or set points (the `speedway_*` and `stadium_*` ids, `beach_club_sand`, the `crusher_belt_*` ids, the `mall_*` ids) need the district builder to register a precise spot with `places.extra`; a kind-based resolve is only the fallback.

| id | district | kind | desc | used in |
|---|---|---|---|---|
| `water_tower_top` | cindercreek | rooftop | the catwalk round the top of the Cinder Creek water tower; the old brass valve wheel | d02 |
| `projection_booth` | cindercreek | storefront | the Starview's projection booth and snack bar in the middle of the rows | d03 |
| `truckstop_lockup` | cindercreek | garage | lock-ups behind the Cinder Creek truck stop; a gold Zephyr on stands in one | dsr3 |
| `city_set_ramp` | sunreel | street | a ramp on the fake city street aimed at a sugar-glass shopfront (MILLER'S FINE HATS) | d04 |
| `sheriff_roof` | sunreel | rooftop | the sheriff's office roof on the western set; the weathervane (a plastic chicken after d04) | d04 |
| `subway_ramp` | sunreel | street | a ramp over the fake subway entrance on the city set | dst1 |
| `fake_bank` | sunreel | bank | the fake bank's breakaway window on the city set | dst1 |
| `camera_mark` | sunreel | street | a chalked T on the backlot road by the camera crane and Chet's deckchair | dst1 |
| `clocktower_scaffold` | halcyon | construction | the clock repairers' scaffold at the foot of the clock tower | d05 |
| `clocktower_ledge` | halcyon | rooftop | the top of the scaffold behind the clock face; a hatch into the works | d05 |
| `win_shed` | vistaverde | garage | Aunt Win's shed beside June's bungalow; the mower; the key under the gnome | d09 |
| `mall_cone_slalom` | vistaverde | parking | a corner of the Verde Mall car park with a line of cones | dsl3 |
| `mall_reverse_corner` | vistaverde | parking | a kerbed corner by a trolley shelter | dsl3 |
| `mall_trolley_lane` | vistaverde | parking | a lane between parked cars where a trolley rolls out | dsl3 |
| `mall_trolley_stop` | vistaverde | parking | the stop point just short of the trolley | dsl3 |
| `mall_parallel_bay` | vistaverde | parking | a kerbside gap between two parked cars | dsl3 |
| `speedway_grid` | thebowl | street | the start-finish straight and the grid boxes | d10, d30, endings, dsr1, dsr4 |
| `speedway_turn1` | thebowl | street | turn one of the oval | d10, d30, dsr1, dsr4 |
| `speedway_back_straight` | thebowl | street | the back straight | d10, d30, dsr1, dsr4 |
| `speedway_turn3` | thebowl | street | turn three, onto the run to the line | d10, d30, dsr1, dsr4 |
| `commentary_box` | thebowl | storefront | the commentary box high in the main stand | d30 |
| `speedway_back_gate` | thebowl | street | the service gate onto the back road to the coast road | Ending C |
| `stadium_bus_ramp` | thebowl | parking | six buses between two ramps in the stadium car park (resolves to the landing side) | dst4 |
| `stadium_gate` | thebowl | street | the stadium's marathon gate | dst4 |
| `stadium_apron_north` | thebowl | street | the service road round the north side of the stadium | dst4 |
| `stadium_apron_south` | thebowl | street | the service road round the south side, past the players' entrance | dst4 |
| `beach_club_sand` | sandpiper | beach | the sand inside the Beach Club fence where a car off the skate-park ramp lands | d11 |
| `crusher_belt_foot` | ironside | warehouse | the low end of the crusher conveyor | d13 |
| `crusher_belt_top` | ironside | warehouse | the top of the conveyor at the jaws, a catwalk beside it | d13 |
| `power_chimney_gap` | ironside | overlook | the gap between the power station's two tallest chimneys | dsf2 |
| `terminal_security` | airport | storefront | the security arches in the departures hall (inside `airport_terminal`) | d15 |
| `terminal_concourse` | airport | storefront | the airside concourse past security | d15 |
| `terminal_gate` | airport | storefront | the gate door onto the apron | d15 |
| `estate_study` | palomaheights | mansion | Leo's study: an open French window on the east terrace, a green lamp | d20 |
| `clinic_helipad` | palomaheights | rooftop | the H on the private clinic's roof | dsf3 |
| `observatory_lawn` | palomaheights | park | the flat lawn beside the observatory dome | dsf3 |
| `paloma_fort_gate` | oldpaloma | street | the fort's landward gate and the cobbled ramp up from the lanes | d27, d28, d30 |

The airport's own registered places (`airport_apron`, `airport_gate`, `airport_hangars`, `airport_helipad`, from `js/airfield.js`) and the old city's `grand_avenue`, `harbor_point` and `the_boardwalk` are used by id directly.

### 6.3 Recurring mission vehicles (existing types only)
| mission id | type | colour | What it is |
|---|---|---|---|
| `firecrest` | `ironclad` | `0xe0481c` (flame orange) | **The Firecrest.** A fifty-year-old Dunmore Ironclad race car in flame orange; *Junebug* under the driver's door (in lines, not geometry). Spawned only from d27 (in `powder_store`), then d28 (on the transporter, see below) and d30. Always `protect`ed / `wrecked:firecrest` fails the job. |
| `replica` | `ironclad` | `0xe0481c` | The film's fibreglass-bodied replica Firecrest from Sunreel's prop yard (d14, dst4). Same type and colour: that's the point. |
| `pip_car` | `drifter` | `0xf1f0ea` | Pip's white race-shop hack, a Drifter with tiny sponsor stickers. Jay drives it whenever no other car is named (d02 to d12). |
| `toby_pickup` | `mesa` | `0x1f3a26` | Toby's fifty-year-old green pickup with a toolbox in the bed (d08, d24). |
| `learner` | `pipit` | `0x78b8e8` | June's pale-blue dual-control learner Pipit, MARLOW SCHOOL OF MOTORING on the doors (d09, d25, Dual Control). |
| `dash_van` | `porter` | `0x3b1558` | Dash's purple TV van with a satellite dish (d02, d06, d11). |
| `gs_car` | `sovereign` | `0x13b5b1` | Guest Services saloon, teal. Several, numbered `gs_car1`, `gs_car2`... |
| `gs_suv` | `tern` | `0x13b5b1` | Guest Services SUV, teal. |
| `gs_truck` | `bulwark` | `0xdcdad2` | Guest Services heavy truck: roadblocks (d26, d29) and the raid (d13). |
| `transporter` | `hauler` | `0x13b5b1` | The truck Ottoline uses to move the claw machine (d19) and steal the Firecrest (d28). |
| `charter` | `albatross` | `0x1fa3a3` | The Castellane charter airliner (d15, d16). |
| `hob_skylark` | `skylark` | `0xf2c500` | Hob's yellow Skylark (d18, d22, *Marks Out of Ten*). |
| `club_sparrow` | `sparrow` | `0xf2f2ee` | The flying club's white Sparrow, "the island air ambulance on Tuesdays" (d20, dsf3). |
| `dash_heli` | `sparrow` | `0x3b1558` | Dash's hired purple TV helicopter (d30 with `dlc_dash_in`). |
| `crash_tender` | `firetruck` | `0xc8202a` | The airport crash tender Jay takes in d26 (and dst3). |
| `war_tank` | `bastion` | default | The war film's "prop" tank from Sunreel, borrowed from Fort Breakwater for *Sergeant Sandcastle* ("It's a prop." It is not). Used once, in d29, delivered to Harbor Point on a low-loader. |
| `doughnut_van` | `porter` | `0xefefea` | Hob's cream van, PALOMA FLYING CLUB on the side (d17). |
| `castellane_racer` | `zephyr` | `0xd29a1c` | Castellane Racing works cars (d10, *Summer Series*). |
| `heritage_car` | `vireo` | `0xf2c500` | The celebrity Heritage Race car Jay drives in Chet's helmet, number 7 (d10). |
| `trey` | `drifter` | `0xf1f0ea` | Trey, the film's stunt car scheduled to explode, a big X of tape on the roof (*Take Two*). |
| `villain_car` | `ironclad` | `0x0e0e10` | The film's black villain car, driven by a stuntman (dst2). |
| `school_van` | `porter` | `0xf2c61f` | Vista Verde School's yellow van (dsl2). |
| `castellane_transporter` | `hauler` | `0xd29a1c` | Castellane Racing's gold transporter (dsr3). |
| `stunt_car` | `drifter` | `0xd29a1c` | The film's gold "Rex car" Jay drives for the takes (d04). |
| `fake_bus` | `hauler` (or the game's bus) | `0xefe6d0` | A parked prop bus on the city set (d04). |
| `film_lowloader` | `hauler` | `0xefe6d0` | The film unit's low-loader, SUNREEL STUDIOS on the doors; Chet drives it at thirty (d14, d24 told, d29). |
| `party_car` | `sovereign` | `0xf2f2ee` | A party guest's pearl-white saloon at the valet line (d20). |
| `keeper_car` | `vireo` | `0x1f3a26` | Dess's bottle-green car, "kept quick", a lighthouse-authority crest on the door (d28). |
| `pip_spare` | `drifter` | `0xf1f0ea` | Pip's spare Drifter, the *Summer Series* reward; a guard car in d30 with `dsr4_southbay_classic`. |
| `neighbour_car` | `vireo` | `0xcbbd9c` | A neighbour's car in the cul-de-sac (dsl1). |
| `privateer1`..`privateer5` | `drifter`, `vireo`, `ironclad`, `pipit`, `zephyr` | `0x2a55d8`, `0x2a6a3a`, `0x6b4a32`, `0xefefea`, `0xc8202a` | Race rivals (dsr1, dsr2, dsr4). |
| `teddy_road` | `zephyr` | `0xd29a1c` | Teddy's gold road car (dsr3). |
| `skylark_two` | `skylark` | `0xf2c500` | The club's second Skylark, Jay's on Tuesdays (dsf4 reward only). |

---

## 7. Flags and payoffs

Four remembered choices plus the final one. All set with `choice` and read with `if`. Completed job ids count as flags (side-chain finales colour the finale and endings). Every `if` must have both branches written; neither branch is "the bad one", they are different.

### Flag 1: The blog (d08). `dlc_blog_on` or `dlc_blog_off`
At lot 17, after Toby's confession, Milo (on a video call, red-eyed) asks whether he should stop posting.
- **"Keep posting. Let them chase us."** sets `dlc_blog_on`. Jay: "If they're reading you, they're not thinking for themselves." Milo posts with a new rule: he waits a day.
- **"Go dark, Milo. Paper only."** sets `dlc_blog_off`. Milo takes the blog down and draws the scoreboard on a sheet of card on his bedroom wall.

**Payoffs:**
- **d09:** on: Guest Services turn up because Milo's post mentioned "a shed" ("I didn't say WHICH shed!"). off: they turn up because they tailed Toby's slow pickup ("Your engineer drives very carefully, Mr Mercer"). Same gameplay.
- **d11:** on: Dash and Kit are on the beach first, filming the wrong tower; they are in the way (spawn `lockwood_tv` idle at `lifeguard_tower_8`) and Dash takes Gully's whistle. off: no Dash, but two extra Guest Services patrol the fence (spawned `guard`).
- **d13:** on: Milo's photo of the table showed the unit number. off: Ottoline simply bought Cinder Creek Storage ("Your rent has gone up").
- **d19:** on: a reader texts the truck's route; the tail's `max` distance is 140. off: Hob spots it from the air by radio; `max` 110.
- **d23:** on: Milo's post "The two lights!" leads Guest Services to the fort (three cars). off: they followed the Skylark from the estate (two cars and Ottoline's).
- **d29:** on: Milo's readers are already sitting in the road at two of the four roadblocks (`firecrest_fans` crowd; Jay destroys two). off: Jay destroys all four.
- **d30:** on: thousands line the coast road with home-made signs; two Guest Services pursuit cars are blocked off (fewer chasers). Milo's subscriber count hits 400,000 on screen. off: Milo reads his paper scoreboard down the phone; full pursuit.
- **Endings:** on: Milo's last post is the news story everybody shares. off: Milo writes it all down instead, and in every ending he's starting a book called *The Firecrest Files*.

### Flag 2: Chet (d14). `dlc_chet_told` or `dlc_chet_kept`
In the cab of the transporter that brought the replica, Chet asks: "This film. It isn't true, is it?"
- **"No. She won. They stole it."** sets `dlc_chet_told`. Chet is quiet for a long time, then: "I've been playing the bad guy and nobody told me."
- **"It's just a film, Chet. Stay out of it."** sets `dlc_chet_kept`. Chet: "Right. Right. Just a film." He doesn't believe it.

**Payoffs:**
- **Take Two side chain:** lines change (told: Chet starts rewriting his scenes in the margins; kept: he keeps asking Fenella questions she won't answer).
- **d24:** told: Chet brings the film's period tyres "for the real one" in his trailer, and drives them over himself at 30. kept: Fenella hands them over at the prop yard; Chet is in his trailer "not taking calls".
- **d29:** told: Chet rides in the tank. "Top speed twenty-eight. Finally, a vehicle that respects me." kept: Fenella delivers the tank and leaves; Chet phones mid-job, confused, to ask what the tank's for.
- **d30:** told: Chet is in the Speedway commentary box beside Monty, and as the Firecrest comes out of the tunnel he tells 40,000 people the true story, the best performance of his life. kept: Chet is on the podium in his Rex Castellane costume for the film's live publicity, hears the truth live over the PA, takes off Rex's red jacket and walks across the infield to shake Dess's hand.
- **Endings:** told: the film is reshot as *Mind the Road*, Chet playing Toby. kept: the film is shelved; Chet in his trailer, at peace, watching the news.

### Flag 3: Dash (d20). `dlc_dash_in` or `dlc_dash_left`
In Leo's garden Jay finds Dash handcuffed to his own camera crane by Ottoline for losing the parts.
- **"Uncuff him. He's coming with us."** sets `dlc_dash_in`. Dash: "I'll be useful. I'm very useful. Ask anyone. Don't ask Kit."
- **"Leave him. He'll be fine. Probably."** sets `dlc_dash_left`. Dash: "Probably? PROBABLY?"

**Payoffs:**
- **d20 escape:** in: Dash rides in the back narrating the escape to his phone camera ("Viewers... I'm being rescued."). left: Dash yells after them; one extra Guest Services car joins the chase because he's yelling.
- **d21:** in: Dash and Kit film loudly in the plaza, drawing one group of rooftop gunmen down to them (one fewer `kill` group). left: full rooftop fight.
- **d23:** in: Kit films Ottoline's men on the fort steps; the footage is evidence later. left: none.
- **d27:** in: Dash's crew set up their floodlights on the fort wall and blind the last wave (it's smaller). left: full waves; Dash, freed, is on Castellane's channel calling the fort "a hoax".
- **d30:** in: Dash flies his hired purple TV helicopter overhead (badly; Hob on the radio marks every wobble), broadcasting live; police are waiting at the Speedway tunnel because they watched it, and Guest Services' pursuit ends there. He says "Legend... FOUND!" about the right thing and can't believe it. left: Dash is in the grandstand presenting Castellane's version live; Guest Services follow the Firecrest into the infield and Jay must wreck two of them before the last lap; when the Firecrest comes out of the tunnel Dash turns his camera round, and keeps filming.
- **Endings:** in: Dash's special airs; it's the first true episode in eight series, and it's a hit. left: Dash's show is cancelled; he's seen in Ending C, hat in hand, following Milo's new trail.

### Flag 4: June (d25). `dlc_june_told` or `dlc_june_wait`
At the end of June's test route, parked outside her own house, June asks Jay why he keeps looking at her like that. Jay knows Dess is alive. June doesn't.
- **"Tell her now."** sets `dlc_june_told`. Jay tells her, plainly. June marks nothing for a long time. Then: "Is she well?" "She's rude." "...Good."
- **"Let Dess tell her."** sets `dlc_june_wait`. Jay: "Nothing. You remind me of someone." June: "Minor fault."

**Payoffs:**
- **d26:** told: June insists on coming and rides in the fire engine ("I'm a qualified instructor. I've driven worse.") and marks the roadblock ram "Minor fault." wait: Jay and Toby alone; June texts "Drive safely. I mean it."
- **d27:** told: June meets Dess at the fort. Nobody can speak; June finally says "You're very late," and Dess says "I know." June brings the racing helmet from her shed. wait: Dess asks about June; Jay: "She's well. She marks everything." Dess laughs until she cries.
- **d30:** told: June rides the last lap in the passenger seat with Dess in the back holding the cup ("Your mother's in the back, June." "Mirror, signal."), and at the line the two of them get out together. wait: Dess rides the last lap with Jay; at the line June comes down from the grandstand onto the track, and Dess says "And mind the road" to her face, and June knows the voice.
- **Endings:** see section 8.

### Final choice (d30). `dlc_end_hers`, `dlc_end_everybody` or `dlc_end_gone`
On the start-finish line, the cup in Dess's hands, Leo coming down from his box, 40,000 people watching, Dess says: "You drove it here. You say where it goes." (She means it; she'd have chosen any of them.)
- **"It's June's."** sets `dlc_end_hers`: Ending A.
- **"It belongs to everyone who was here."** sets `dlc_end_everybody`: Ending B.
- **"Hide it again. Lay a new trail."** sets `dlc_end_gone`: Ending C.

### Side-chain flags (completion ids)
- `dst4_the_big_jump` (*Take Two*): Fenella's crew film the finale; the endings' last caption is "a film by Fenella Moss".
- `dsf4_check_ride` (*Marks Out of Ten*): Hob has given Jay a ten, so in d30 he tows a banner reading SHE WON over the Speedway in the Skylark and in the endings says "Ten. Again." Without it he gives Jay a nine in d30 instead.
- `dsr4_southbay_classic` (*Summer Series*): Pip has her licence back and Teddy Castellane's respect; in d30 Pip and Teddy drive alongside the Firecrest as a guard (two allied cars, `follow`). Without it, Pip rides in the Firecrest's back seat.
- `dsl3_test_day` (*Dual Control*): Jay has passed June's test; in Ending A June uses his test sheet to mark her mother ("He got a 94. You can get a 94.").

### 7.1 Who knows what, and when
| Truth | Who knows at the start | Jay learns | Others learn |
|---|---|---|---|
| The tin box and the trail exist | Toby | d01 | Pip d01; Quill and Milo d02; Dash from the blog d02 on; Leo and Ottoline from d01 (they bid at the auction because Leo's file says "T. Brask"). |
| Dess hid seven parts with rhymes | Dess, Toby (he doesn't know where) | d02 (Milo works it out from R1 and R2) | Everyone in the hunt d02; Leo from Dash. |
| Dash reads Milo's blog | Kit, Dash | d06 | Milo d06 (mortified). |
| Toby never delivered the box | Toby | d08 | Pip d08, Milo d08 (video call); June: with `dlc_june_told` Jay hints in d25 ("Somebody was meant to bring you a box"), June meets Toby in d26 ("You're the man with the box") and Pip has told her by d27; with `dlc_june_wait`, d30. Toby hands her the box in d30 either way. |
| The Castellanes stole the race | Leo (the file), Dess, Toby, Monty (saw it as a boy) | d10 (Dess's name painted out), d20 (the file, in Rex's hand) | Pip d10; Chet d14 if told, d30 if kept; Dash d20; the public d30. |
| June's lawnmower has a racing carburettor | nobody (June just knows it does forty) | d08 (R4) | June d09. |
| Chet has never driven over thirty, or a race car | Chet | d10 | Fenella always knew. |
| Odie Wren is Dess Marlow | Dess. Hob half-suspects | d23 (seeded d17) | Toby d23 (first look), Pip and Milo d23, June d25 (told) or d30 (wait), Leo d27 (Ottoline's report), the public d30. |
| The car is walled in the fort powder store | Dess | d23 | everyone in the hunt d23; Ottoline d27. |
| The real cup (O. MARLOW) is in the Firecrest's boot | Dess, Toby (guessed), Leo (from the file) | d27 | public d30. |
| Leo has known for ten years | Leo | d20 (the file's last page, in Rex's hand, with Leo's own note "Dad, why?") | public d30, from Leo himself on the line. |
| June keeps Dess's helmet in the shed | June | d25 (in the learner's boot) | Dess d27 in both branches (told: June gives it to her; wait: Jay tells her, "She kept it"). |

---

## 8. Endings

The final choice in d30, on the Speedway start-finish line, picks the ending. Flags pick the variant scenes. Each ending plays as the epilogue steps of d30 (5 to 7 minutes), then the DLC credits roll (engine) over the radio. In every ending: Leo Castellane says the true result over the PA himself (he takes the microphone from Monty: "The winner of the Southbay 500, fifty years ago today, was Odessa Marlow. My father knew. I knew. I'm sorry."), Ottoline is already in the back of a police car with an unused comment card, Toby hands June the tin box properly ("Happy birthday. I'm thirty-four years late."), and the last line is someone saying "And mind the road."

### Ending A: "Hers" (choice: **"It's June's."**)
The Firecrest goes home to Vista Verde, to the drive beside Aunt Win's shed. Epilogue: a Sunday, weeks later (`camera: june_house`). June gives her mother a driving lesson in the Firecrest round the cul-de-sac; Dess is a terrible modern driver ("What's this for?" "That's an indicator, Mum."). Pip, still banned from the roads for another three months, mows the lawn with the mower and its new, very ordinary carburettor. Toby is under the bonnet. Jay is invited to lunch and stays.
- **June:** told: June and Dess have had weeks; they argue about the radio like they've done it forever. wait: it's their first week; they're careful with each other, and June marks "Minor fault" with a smile.
- **Variant:** with `dsl3_test_day`, June uses Jay's old test sheet: "He got a 94. You can get a 94." With `dlc_chet_told`, a film crew is filming at the end of the road ("*Mind the Road*, scene 41, take 1").
- **Last line:** June, as Jay drives off: "And mind the road." Jay, to his car: "You heard her."

### Ending B: "Everybody's" (choice: **"It belongs to everyone who was here."**)
The Firecrest stays at the Speedway, in a glass room by the start-finish line, with the real cup. The Castellane name comes off the main stand; the honours board is repainted with O. MARLOW in gold. Epilogue: the opening of the Marlow Stand. Monty cuts the ribbon. Quill unveils a plaque written by Milo ("She won. She hid it. We found it. Mind the road."). Kids press their noses to the glass.
- **Leo:** he unbolts the CHAMPIONS SINCE DAY ONE sign from the Castellane Palace himself and hands Jay a screwdriver: "You'll want to keep one."
- **Dash:** in: his special plays on the big screen and he cries on camera. left: he's in the crowd, not filming, for once.
- **Variant:** with `dsr4_southbay_classic`, Pip and Teddy lead the parade lap together. With `dsf4_check_ride`, Hob's banner flies over: TEN.
- **Last line:** Dess to a small girl at the glass: "Hands at ten and two, and mind the road."

### Ending C: "Gone Again" (choice: **"Hide it again. Lay a new trail."**)
That night the Firecrest disappears from the Speedway. Everybody knows who won now; the car doesn't have to prove anything to anybody. Epilogue (night, `camera: paloma_fort` then a blackout): Dess and Jay drive it somewhere nobody is told (the player drives it out of the Speedway's back gate to `coast_road` as a short last drive, then a blackout). Dess takes seven new parts off it. Milo writes the first riddle of the new trail by torchlight and reads it to the player (a new rhyme for whoever's twelve next; it is *not* solved). Toby puts it in a tin box, and this time he delivers it himself: to the Halcyon library, "For whoever asks."
- **Dash:** in: he's already filming the new trail's opening ("Series nine!"). left: he's seen following Milo's clue the wrong way.
- **June:** told: June and Dess hide the last part together, laughing. wait: June comes to the fort for the first time, and the two of them watch the lights say goodnight.
- **Last line:** the new riddle's last line, read by Milo: "...And mind the road."

---

## 9. Main jobs

30 jobs, about 308 estimated minutes. Every entry lists `giver`, `start` (a place id), `time` (the clock hour set on start), `estMinutes` and the **core mechanic**. No two consecutive jobs share a core mechanic. `requires` defaults to the previous DLC job; `d01` waits for the engine's `unlockAfter`. The beat-sheet writers turn each summary into beats; the summary fixes the plot, the place, the mechanic and every flag, and nobody changes those.

Weapons handed out (Jay may already have more from the main game; these make the DLC playable from a save just past m03): SMG (d03), shotgun (d13), rifle (d21), grenades (d27). The parachute is automatic on bailing out high up.

Speakers available per act: Act 1 `jay pip milo prof_quill dash kit chet fenella ottoline leo toby clem plum gs_staff studio_guard popcorn_kid nana_lu caption`. Act 2 adds `june monty benny gully daventry teddy marshal hob` (Hob first speaks on the apron at the end of d16). Act 3 adds `odie dess ines lorna valet`. Act 4 everyone, plus `officer` (d28, d30). Side chains add `rosa dougie tower mechanic`.

### ACT 1: LOT 17 (d01 to d08, 80 min)

#### d01_lot_17: Lot 17
`giver: pip` · `start: cinder_storage` · `time: 15.5` · `estMinutes: 10` · Core: **escape from pursuers** (drive away from Guest Services cars, lose them and the heat)
A text from an unknown number ("Driver wanted. One afternoon. Cash. Cinder Creek Storage. Bring a car with a big boot.") brings Jay to the storage auction just as Clem Ruddock bangs the gavel and Pip Marlow buys lot 17 for $310, outbidding Dash's researcher Kit and a smiling man in a teal blazer. Pip rolls up the BRASK door, opens a tin box (a starter key on a little gold Firecrest keyring, a folded rhyme), and Ottoline Graves walks in to "offer assistance returning it". Pip throws Jay the keys of her Drifter (`pip_car`); Guest Services Sovereigns chase them through the self-storage rows, past the truck stop and round the trailer park; Jay loses them and two stars of heat, and they come back the long way to lot 17, which Pip rents on the spot as HQ. Blackout: Nana Lu at Jay's bedside telling the Firecrest story when he was six ("Somewhere she could see the sea, I expect"); then Pip reads **R1** aloud, and the job ends on the rhyme, unsolved. Reward $1,500.

#### d02_the_tin_man: The Tin Man
`giver: pip` · `start: lot_17` · `time: 10` · `estMinutes: 10` · Core: **race the clock, then climb and collect**
Jay drives Pip to `quill_study` at Halcyon, where Professor Quill explains at length that the car is at the bottom of the bay and the rhyme refers to a sunken paddle steamer, and his grandson Milo (12, yellow T-shirt) solves R1 in four seconds: the tin man is the Cinder Creek water tower. Milo posts it on *The Firecrest Files* (41 subscribers); within a minute Dash's purple van is seen leaving the campus, so it's a `timer: 180` drive back to `cinder_water_tower` with the professor carsick in the back. Dash gets there first, climbs, and proudly unscrews a new red valve wheel ("Legend... FOUND!", a rusty tap); Jay climbs the ladder and catwalk on foot to the old brass wheel at the top (`collect`), which unscrews to reveal a horn button with **R2** folded inside. Milo opens the scoreboard: "Team Firecrest 1, Lockwood's Lost Legends 0, plus one rusty tap." Reward $1,000.

#### d03_double_feature: Double Feature
`giver: prof_quill` · `start: quill_study` · `time: 20.5` · `estMinutes: 10` · Core: **hold-out** (`survive` among parked cars)
Quill admits he owns the only print of the Southbay 500 newsreel and has hired the Starview drive-in for a private showing; Jay drives him, Pip and Milo there (Milo in the back, delighted). The newsreel plays as `caption` lines on a blackout (Dess taps the wheel three times; the little gold bird on the bonnet; Rex Castellane scowling; a young engineer labelled "T. Brask"; a word under the driver's door nobody can read), and Milo matches the bird to **R2**: the weathervane on the sheriff's office of the Sunreel western set ("Cowboys who never die are actors!"). Guest Services pull into the back rows to seize the reel; Milo and Quill are sent to hide behind the projection booth (`protect: prof_quill`) and Jay holds out in `drivein_rows` for two minutes of waves (`survive: 120`) until the projectionist's sprinklers and a police siren send them off. Pip has the answer and the next stop. Reward $2,000, SMG.

#### d04_stunt_double: Stunt Double
`giver: pip` · `start: sunreel_gate` · `time: 9` · `estMinutes: 11` · Core: **stunt course** (a timed run through checkpoints with ramps, "it's for the movie")
The western set is inside Castellane's closed shoot, so Pip has answered a call-sheet ad: *Stunt driver wanted, doubling Mr Chet Valiant*. Fenella Moss hires Jay on sight; Chet ("Never over thirty, kid") lends him the red jacket. Jay drives two takes through `sunreel_city_set` (race-style checkpoints solo, a ramp through a fake shopfront, a near miss with a fake bus), then on the lunch break climbs the sheriff's office on the western set on foot to take the bonnet bird off the weathervane (`collect`), swapping it for a plastic chicken from catering; Dash, filming a "making of", grabs a cowboy's spur off the set instead. Ottoline drops by the set, friendly, and hands Jay a comment card ("How would you rate your first day?"); engraved under the bird's base is **R3**. Reward $3,000 (the stunt fee).

#### d05_clockwork: Clockwork
`giver: milo` · `start: quill_house` · `time: 23` · `estMinutes: 10` · Core: **quiet job on foot** (sneak; fail if campus security or the police are alerted, `failIf: ['heat:1']`)
Milo (on the phone from his bedroom, supposed to be asleep) has solved R3 ("Twelve on top and six below: a clock face") and tells Jay to stop calling him Mr Mercer's assistant. Night at the Halcyon clock tower: Officer Plum patrols the quad by bicycle with a torch; Jay crouches through hedges and up the outside of the tower (ledges and the scaffold left by the clock repairers) to the clock face, and finds the Firecrest's rally clock fitted behind it, keeping the university's time eleven seconds slow (`collect`). Dash's crew blunders in below with lights and Dash unscrews the clock's minute hand on camera, drawing Plum away so Jay can climb down. The back plate is engraved "For O.M. from T. Brask" and carries **R4**; Milo reads the scoreboard down the phone and is sent to bed. Reward $1,500.

#### d06_breaking_news: Breaking News
`giver: pip` · `start: lot_17` · `time: 8.5` · `estMinutes: 9` · Core: **chase** (`chase: 'dash_van', mode: 'catch'`)
Dash is on breakfast TV with the minute hand and a promise: "We know where the next piece is." Pip is furious; Jay drives to `halcyon_quad`, where Dash's purple van is parked outside the student cafés, and it bolts. The chase runs from Halcyon up through the campus strip and out to Coral Marina, where Jay boxes the van in on the marina front (`marina_condos`); inside, on the dashboard, are printouts of every page of *The Firecrest Files*, riddles and photos and all. Dash is cheerful and unashamed ("It's a public blog, mate. It's very good."), lets slip that Castellane is paying for the special, and doesn't remember Pip's letter; Milo, phoned, is mortified ("Four people read it. FOUR. One of them is Gran."). Pip, reading the rally clock again, says the name aloud: "T. Brask." Reward $1,500.

#### d07_champions_since_day_one: Champions Since Day One
`giver: pip` · `start: coral_marina` · `time: 17` · `estMinutes: 10` · Core: **shoot-out on foot** (`kill` groups on the breakwater)
The marina's harbourmaster says Toby Brask keeps the lighthouse on the breakwater. Jay and Pip walk out along `toby_breakwater` to find Guest Services already there, "helping Mr Brask pack up his old photographs" while Toby has barricaded himself in the lighthouse doorway with a flare gun. Jay fights them back along the breakwater (two groups, cover behind bollards and lobster pots), then Leo Castellane steps off his yacht *Day One* at `day_one_jetty`, all apology and charm, and offers Jay $50,000 to bring him whatever they find ("not a bribe, a finder's fee"); Jay says he'll think about it, and doesn't. Toby won't talk to anybody and shuts his door; at ten the fort light across the bay blinks three times and the marina light blinks back (`camera: marina_lighthouse`). Reward $2,000.

#### d08_thirty_four_years: Thirty-Four Years
`giver: toby` · `start: marina_lighthouse` · `time: 22.5` · `estMinutes: 10` · Core: **careful delivery, then a choice** (`deliver: 'toby_pickup', to: 'lot_17', maxDamage: 0.3`)
Toby knocks on Pip's car window at half past ten, after the lights have said goodnight: he'll show them his blueprints of the Firecrest, the only copy, but his pickup's headlights are out and his eyes are worse, so Jay drives `toby_pickup` from the breakwater to Cinder Creek with the drawings loose in the bed, while two Guest Services cars shadow them, nudge and bump (they want the drawings, intact) and Jay keeps the damage under a third. In the car Toby confesses (lines, then a blackout memory of a parked car outside Win's house thirty-four years ago): Dess gave him the tin box for June's seventeenth birthday and he never delivered it. At lot 17 Pip reads **R4** again and goes very quiet: the shed with the spider, the fastest mower in town, is her mother's (she gets it before Milo, who arrives on a video call a beat later and agrees). Milo asks whether he should stop posting: **choice** `dlc_blog_on` / `dlc_blog_off` (section 7). Reward $2,500.

### ACT 2: HIDING IN PLAIN SIGHT (d09 to d16, 78 min)

#### d09_minor_fault: Minor Fault
`giver: pip` · `start: june_house` · `time: 13` · `estMinutes: 10` · Core: **escape in a slow car** (pursued, in the dual-control `learner`)
Pip and Jay creep into Aunt Win's shed at `june_house` while June is out on a lesson, and find the lawnmower; Pip unbolts a gleaming racing carburettor from it ("That's why it does forty"), and June comes home early, clipboard in hand. Before the argument is over, Guest Services arrive (blog on: Milo's post said "a shed"; blog off: they tailed Toby), and the only car on the drive is June's pale-blue dual-control Pipit: Jay drives, June in the passenger seat on her own brake pedal marking his faults ("Minor fault. Minor fault. That was a fountain."), Pip in the back with the carburettor. The escape runs through `verde_culdesac` sprinklers and the `verde_mall` car park until the Sovereigns are lost (`loseHeat` plus a `goto` back to `june_house` with no pursuers within 100 m); June crosses out the one "Serious fault", the kerb Jay mounted to keep her side out of a ram. In the kitchen doorway June learns everything she'll allow herself to hear ("Mum died. In a racing car. That's the end of the story."), and Pip finds **R5** rolled in the float bowl; Dash takes the garden gnome. Reward $1,500.

#### d10_heritage_run: The Heritage Run
`giver: chet` · `start: southbay_speedway` · `time: 14` · `estMinutes: 11` · Core: **Speedway race** (`race`, 3 laps of the oval against 5 rivals)
Milo solves R5: the honours board is in the Speedway winners' enclosure and you only stand there if you win. Fenella's film needs footage of the Celebrity Heritage Race and Chet is entered, so Chet, in the pits, confesses to Jay that he has never driven a race car, or anything over thirty, in his life ("I've played four racing drivers, two pilots and a submarine"), and Jay races in Chet's helmet and red jacket in the yellow number 7 Vireo (`heritage_car`), against Teddy Castellane in a gold works Zephyr, Dash (driving terribly), and three celebrities. Monty Sprake calls it on the PA ("Chet Valiant has... grown?"), getting the name of the driver wrong all race. Win (a loss fails the job), stand in `winners_enclosure` for the photo, and while Chet takes the bows Pip finds, under the Castellane-painted honours board, O. MARLOW painted over and **R6** scratched into the wall beneath it. Reward $3,500.

#### d11_two_eyes: Two Eyes on the Water
`giver: milo` · `start: skate_park` · `time: 11` · `estMinutes: 10` · Core: **stunt jump, then collect on foot**
R6's two eyes on two tall chairs are the lamps on lifeguard towers 7 and 8, but Castellane's Beach Club has fenced off that stretch of Sandpiper Beach for a private party, with Guest Services on the gate. Jay takes `pip_car` up the skate park's big ramp and over `beach_club_fence` onto the sand (a stunt jump; retry until it clears), then on foot climbs both towers and unclips the two headlamps (`collect: ['lifeguard_tower_7','lifeguard_tower_8']`) while Gully the lifeguard chases him with a whistle. Blog on: Dash and Kit are filming the wrong tower and get in the way, and Dash takes Gully's whistle. Blog off: two extra Guest Services patrol the fence. Out again through the party (a teal-and-white buffet, a lot of sand in it), and inside one headlamp is stamped **R7**: BRASK & MARLOW SPEED SHOP, THE PROMENADE, and the numbers 7 - 17 - 50. Reward $1,500.

#### d12_floor_safe: Not the Money
`giver: pip` · `start: sandpiper_promenade` · `time: 19` · `estMinutes: 8` · Core: **shop hold-up** (aim at the clerk, make him open the floor safe)
The speed shop's ghost letters are still above the Kwik Pik on the promenade (`promenade_kwikpik`), and the old floor safe behind the counter has never been opened: the clerk, Benny Akande, says nobody knows the combination and the owner says it's "structural". Jay tries asking nicely, then buying a lot of crisps, then holds up the shop with the engine's hold-up mechanic so Benny will open the safe with 7 - 17 - 50, leaving the till alone ("You're not taking the money?" "Just the envelope." "...Can I have a photo?"). The CCTV sends two stars after him; Jay loses them along the coast road (`loseHeat`) with Pip reading the envelope aloud: **R8**, plus a photo of baby June asleep on the Firecrest's passenger seat. As they lose the last patrol car, Toby phones from Cinder Creek: there's a teal truck outside lot 17 and the door is up. Reward $800 and a bag of crisps.

#### d13_the_crusher: The Crusher
`giver: toby` · `start: lot_17` · `time: 19.5` · `estMinutes: 10` · Core: **timed rescue under fire** (`timer` to the scrapyard, `kill` groups, then `collect` off the conveyor against a second timer)
Lot 17 has been emptied (blog on: Milo's photo showed the unit number; blog off: Ottoline bought Cinder Creek Storage), and Toby, who watched from behind the storage office, saw the boxes go on a teal truck heading south: "Castellane crushes what he can't buy. Ironside." A `timer: 200` drive south to `ironside_scrapyard`, a fight through Guest Services and the scrap crew among the car stacks, and then the crusher's conveyor (`crusher_belt`) is already moving: Jay grabs the boxes off the belt (`collect`, three spots, `timer: 60`) before they reach the jaws. He saves the steering wheel, the bonnet bird and the headlamps; the rally clock and the carburettor are gone, because Kit and Dash took them "for safekeeping, on Mr Castellane's instructions" and drove off in the purple van. Guest Services seal the scrapyard gate behind Jay. Reward $2,500, shotgun.

#### d14_decoy: The Decoy
`giver: chet` · `start: scrapyard_gate` · `time: 20.5` · `estMinutes: 10` · Core: **decoy run under pursuit** (`deliver: 'replica'` round a route with `maxDamage: 0.6`, Guest Services cars attacking, then a choice)
Pip has a plan and Chet has a transporter: Fenella's prop yard has lent the film's replica Firecrest, same colour, same shape, and Chet has driven it here himself, at thirty, all the way from Sunreel. Jay drives the replica out of the scrapyard yard where every Guest Services car can see it, and leads them on a long loop through `ironside_railyard` (between freight wagons, over the crossings) and round `ironside_power` under `ironside_pipes`, keeping the replica in one piece, while Pip slips out the other gate with the real parts in `pip_car`. The replica ends parked on the low-loader with a deflated Guest Services convoy around it; Ottoline, arriving, taps its fibreglass bonnet and smiles ("Very good."). In the transporter cab Chet asks whether the film is true: **choice** `dlc_chet_told` / `dlc_chet_kept`. Milo phones: Dash has posted "Wheels up to Isla Paloma with two incredible finds!" from the airport. Reward $2,000.

#### d15_departures: Departures
`giver: milo` · `start: airport_terminal` · `time: 11` · `estMinutes: 10` · Core: **airport terminal on foot, then walking onto and taking an airliner**
Castellane's charter to Paloma Field leaves in fifteen minutes from the remote stand (`charter_stand`). Jay goes into the departures hall on foot (Milo, on the phone, reminds him that guns set off the security arches; carrying one turns the hall into the havoc version with the alert and the airport police), through security, along the concourse, past Kit (who points the wrong way, on purpose or not), and out through the gate to the stairs of the teal Albatross (`charter`). On board, Dash is in seat 1A with a metal case on his knees ("Are you on this flight?"), and Captain Daventry, a Guest Services man in a pilot's hat, comes out of the flight deck with a pistol; Jay takes the flight deck the engine's way (the steal), the crew and Daventry go down the slide, and Dash locks himself in the toilet with the case. Ends with the engines spooling up and the airport police at the stairs. Reward $2,000.

#### d16_four_out_of_ten: Four Out of Ten
`giver: pip` · `start: chain` (`resumeAt: charter_stand`) · `time: 11.2` · `estMinutes: 9` · Core: **flying an airliner** (`fly` rings, then `land`)
Pip talks Jay through it by phone from a flight-simulator video she's watching at double speed; Milo corrects her. Jay takes the Albatross off the runway (heat 3, a police helicopter for a while), out over Coral Marina (`fly: 'marina_lighthouse', height: 160`), along the Paloma Bridge (`fly` ring over `bridge_island_end`) and lines up on Paloma Field's short runway ("That's not a runway, that's a driveway"), landing it (`land: 'paloma_field', radius: 60`) with Dash shouting from the toilet. A man in a green flying-club jumper walks out of the hangar with a clipboard: Hob Finnegan. "Four out of ten. You bent my windsock." Dash comes out with the case, hands it over without a fight ("Honestly, it's a relief"), and Hob drives him into town "for a doughnut, he looks like he needs one"; the rally clock and carburettor are back. Reward $3,000.

---

### ACT 3: ISLA PALOMA (d17 to d23, 71 min)

From here until d26 the Paloma Bridge is watched by Guest Services ("Welcome Checks") and the parts live in Hob's hangar (`hob_hangar`). Jay can still drive over the bridge in free roam; in jobs, the island is reached by air or by Hob's van.

#### d17_contraband: Contraband
`giver: hob` · `start: hob_hangar` · `time: 7.5` · `estMinutes: 9` · Core: **timed delivery** (`deliver: 'doughnut_van', to: 'plaza_cafe', maxDamage: 0.35, timeLimit: 240`)
Hob, over a kettle in the hangar mouth, explains the island: Castellane owns every bakery on it, and only Castellane Croissants may be sold, so every Tuesday Hob flies in real doughnuts for the old folk of Old Paloma. In exchange for hiding the parts, Jay drives Hob's cream van of doughnuts from Paloma Field down the Neon Strand to Ines's café on Paloma Plaza, through a Guest Services "Welcome Check" at `strand_checkpoint` (Hob, riding along, hides the boxes under a tarpaulin marked AVIATION PARTS and talks the guards into a confused croissant debate) and past Wonder Wharf's big wheel (`camera: wonder_wharf`, no comment: the fair-play shot for R8). Doughnuts squash if the van is knocked about ("That's a jam casualty, son"). At the café an old woman in a flame-orange cardigan, the fort's lighthouse keeper Odie Wren (speaker `odie`), buys twelve jam ones, taps the counter three times, looks at the gold keyring on Jay's belt (Pip clipped it there that morning: "Driver holds the key") and says "Pretty bird," and goes. Milo, on the phone, solves R8: the wheel that goes nowhere is the big wheel, and the box where nobody wins is the Golden Grabber beside it. Reward $1,200 and a doughnut.

#### d18_ground_school: Ground School
`giver: hob` · `start: field_apron` · `time: 9.5` · `estMinutes: 10` · Core: **flying lesson** (Skylark: taxi, take off, `fly` rings, `land`)
Hob says the island is easier from the air and the bridge is watched, so Jay is having a lesson whether he likes it or not ("A plane is a car with one more way to crash. Respect the extra way."). In Hob's yellow Skylark (`hob_skylark`), Hob in the right seat: take off from `paloma_field`, rings over `paloma_observatory`, `paloma_fort` (the lighthouse, a blue door: a fair-play shot for later) and `wonder_wharf`, where Jay sees (a `camera` shot from the air) Guest Services lowering the Golden Grabber onto a teal transporter, and Hob says "Your claw machine's going for a drive." Then a circuit and `land: 'paloma_field'`; Hob marks it: "Seven. Don't tell anyone, they'll think I've gone soft." Pip watches from the apron with Milo on a video call, both cheering. Unlocks the *Marks Out of Ten* side chain. Reward $1,500.

#### d19_golden_grabber: The Golden Grabber
`giver: milo` · `start: wonder_wharf` · `time: 20.5` · `estMinutes: 10` · Core: **tail, then take the truck** (`follow: 'transporter'`, then `getIn: 'transporter'` and lose the pursuers)
At arcade row, Lorna Pike, the attendant for forty years, says nobody has ever won the gear stick under the Golden Grabber's dome and Mr Castellane has bought the machine "for his private collection"; it's leaving tonight. Jay tails the teal `transporter` with the machine strapped on the back from `wonder_wharf` along the Neon Strand under the neon (`follow`, min 15; max 140 with `dlc_blog_on`, a reader's text gives the route; max 110 with `dlc_blog_off`, Hob radios from the air) to the loading dock behind the Paloma Convention Centre (`convention_dock`), where the crew go for coffee. Jay takes the truck, machine and all, and loses two Guest Services Sovereigns on the way back to `hob_hangar`. In the hangar (a blackout montage) Jay tries the claw fourteen times; Milo says "Unplug it"; the rigged claw lets go, the gear stick drops, and inside its knob is **R9**. Lockwood score: Dash's crew got a teddy bear out of the prize chute at the wharf. Reward $2,000.

#### d20_the_gorse_file: The Gorse File
`giver: prof_quill` · `start: hob_hangar` · `time: 22` · `estMinutes: 12` · Core: **helicopter, parachute and a sneak** (`fly` in `club_sparrow`, bail out, `goto` on foot through guards, a choice, then a getaway)
Quill has crossed on the ferry (seasick; fine in the helicopter, which makes no sense to anyone) with news from the Halcyon archive: an invoice from a detective called Gorse to Rex Castellane, for "the Marlow file". The file is in Leo's study, and tonight is Leo's summer party. Jay flies the club's white Sparrow (`club_sparrow`) from Paloma Field over Paloma Heights (`fly: 'paloma_observatory', height: 150`), bails out, and parachutes onto the observatory dome (`goto: 'paloma_observatory'` on foot); from there he sneaks through the botanical gardens to the estate lawn (`estate_garden`) past Guest Services (seen: they attack, the job goes on), reaches the open study window, and reads the file (a blackout: Gorse's notes of where Dess went that week, "subject believed drowned", Rex's handwritten last page about "the boys on Seawall Drive", and a note in Leo's handwriting: "Dad, why?"). In the garden, Dash is handcuffed to his own camera crane by Ottoline for losing the parts: **choice** `dlc_dash_in` / `dlc_dash_left`. Jay takes a party guest's car and gets away down the hill from `estate_gate` to `hob_hangar` with Guest Services behind (one more car with `dlc_dash_left`, because Dash is yelling). Reward $3,000.

#### d21_ring_twice: Ring Twice
`giver: milo` · `start: paloma_plaza` · `time: 11.5` · `estMinutes: 10` · Core: **rooftop shoot-out** (`kill` groups on `plaza_roofs`)
R9's bell only swings for a wedding or a festival, and today is Old Paloma's harbour festival: bunting, a brass band, Ines's café doing a roaring trade. At noon, when the fishing boats come into `paloma_harbour` (`camera` shot), Jay climbs the bell tower (`goto: 'bell_tower'` on foot), rings the bell once, hears the clunk, and finds the ignition coil taped inside the hollow clapper (`collect`), wrapped in **R10**. Guest Services gunmen stand up on the roofs round the plaza; the crowd scatters and Jay fights across `plaza_roofs` (three groups; two with `dlc_dash_in`, because Dash and Kit, filming loudly in the square, draw one group down). Then down through `old_lanes` to `paloma_harbour`, where Hob's van waits with the engine running. Ines's verdict on the day: "Best festival in years." Reward $2,500, rifle.

#### d22_two_lights: Two Lights
`giver: toby` · `start: field_apron` · `time: 21.5` · `estMinutes: 10` · Core: **night flight** (Skylark, a chain of `fly` rings along the beam, then `land`)
Toby has come across to read R10 and turns grey: "Two lights that say goodnight at ten." Jay takes him up in Hob's Skylark at dusk, out across the bay to the mainland to circle the Coral Marina light (`fly: 'marina_lighthouse', height: 100`); at ten (`setTime: 22`) the fort light blinks three times, Toby's automatic timer blinks back, and Jay flies the line between them, ring after ring (`fly: 'day_one_jetty'` then `fly: 'neon_strand'` then `fly: 'paloma_fort', height: 80`, low over the dark water), while Toby talks about Dess for the first time. Jay's blackout memory: Nana Lu, "Somewhere she could see the sea, I expect." `land: 'paloma_field'` (Hob on the radio: "Night landing. Eight. Don't let it go to your head."), a short drive to `fort_light`, and Odie Wren opens her blue door. The job ends on her face and Toby's. Reward $1,500.

#### d23_odie_wren: Odie Wren
`giver: toby` · `start: chain` (`resumeAt: fort_light`) · `time: 22.3` · `estMinutes: 10` · Core: **chase** (`chase: 'gs_car1', mode: 'wreck'`, fail if it reaches `estate_gate`)
Toby says "Hello, Dess," and from that line on the speaker is `dess`; she says "You took your time," and shows them the bricked-up arch of the powder store (`powder_store`): the car is behind it, and she won't open it ("Some things are better as stories. This one's a good one. Leave it.") She shows them her logbook (lap times, and the stewards' original signed result sheet). Guest Services arrive (blog on: three cars, after Milo's "The two lights!" post; blog off: two cars and Ottoline's, after following the Skylark from the estate) and a teal Sovereign snatches the logbook and the Gorse file from Pip's hands and bolts. Jay chases it out of the fort, through `old_lanes`, up the hill past `paloma_gardens`, and wrecks it before it reaches the estate gate; the papers are scorched but whole (with `dlc_dash_in`, Kit has filmed the whole snatch from the fort steps). Back at the door, Hob admits he always half-knew ("Doughnuts are my business"), and Dess looks at Pip, who has her face: "All right. Let's finish it." Reward $3,000.

### ACT 4: THE LAST LAP (d24 to d30, 79 min)

#### d24_spare_parts: Spare Parts
`giver: toby` · `start: marina_lighthouse` · `time: 10` · `estMinutes: 10` · Core: **collect across the mainland** (`collect` at three places in any order, then `goto: 'lot_17'`)
Toby needs his toolkit, his engine hoist and four period tyres to put the Firecrest back on the road, and they're in three districts: the toolkit at `marina_lighthouse`, the hoist hidden in the back of `lot_17` ("They took the boxes, not the furniture"), and the tyres at Sunreel (`sunreel_prop_yard`). Jay drives `toby_pickup` round all three, with a Guest Services pair waiting at the prop yard (a short fight). With `dlc_chet_told`, Chet brings the tyres out himself in his trailer, "for the real one", and insists on driving the last bit at thirty; with `dlc_chet_kept`, Fenella hands them over and Chet is "not taking calls". On the drive Leo phones with a last offer ($250,000) and the news that the Paloma Bridge closes tomorrow "for a private event"; Jay hangs up mid-sentence, which Pip calls "the most beautiful thing I've ever heard". Reward $2,000.

#### d25_junebug: Junebug
`giver: june` · `start: june_house` · `time: 15` · `estMinutes: 10` · Core: **careful test drive, then a choice** (`goto` chain in `learner` with `failIf: ['heat:1']` and damage limits, park in a bay at `verde_mall`)
June wants "one lesson, so I know who's been driving my daughter about." Jay drives June's test route in the dual-control Pipit: `verde_culdesac` (a three-point turn), past `vista_verde_school` at walking pace (a lollipop lady, a lot of children, one runaway football), and into a marked bay in the `verde_mall` car park (`goto` with `stop: true`, radius 3), with June marking everything and a Guest Services Tern watching from across the road but never making a move. In the boot is a racing helmet June calls "a motorcycle helmet I found"; it's Dess's. Back outside her house, June asks why he keeps looking at her like that: **choice** `dlc_june_told` / `dlc_june_wait`. As Jay leaves, June says "And mind the road," and doesn't know why it stops him. Reward: a pass certificate (94%) and $1,000.

#### d26_blue_lights: Blue Lights
`giver: toby` · `start: airport_fire_station` · `time: 6.5` · `estMinutes: 10` · Core: **the fire engine** (take a crash tender, drive it across the city, ram a roadblock, hose Guest Services)
At dawn the bridge is shut by two Guest Services Bulwarks and a line of teal Terns at the island end (`bridge_island_end`), and Toby and his tools must get to the fort. "Nothing gets through those but a fire engine." Jay walks into the airport fire station and takes a crash tender (`crash_tender`, siren on L; two stars), drives it south down Grand Avenue North and through Harbor Point to Anchor Street with Toby's toolbox lashed on the back, across the Paloma Bridge, rams through the roadblock (`destroy` the two `gs_truck`s or `goto` through them with the tender) and uses the water cannon on the Guest Services men behind it. With `dlc_june_told`, June rides in the cab ("I'm a qualified instructor. I've driven worse.") and marks the ram "Minor fault"; with `dlc_june_wait`, June texts "Drive safely. I mean it." Lose the heat on the island and park the tender in the fort's courtyard (`paloma_fort`). Reward $2,500.

#### d27_the_powder_store: The Powder Store
`giver: dess` · `start: paloma_fort` · `time: 9` · `estMinutes: 11` · Core: **hold-out** (`survive: 150` at the fort walls, `protect: 'toby'`)
With `dlc_june_told`, June meets her mother on the fort steps first: neither can speak until June says "You're very late" and Dess says "I know"; June gives her the helmet. With `dlc_june_wait`, Dess asks about June and Jay says "She's well. She marks everything," and Dess laughs until she cries. Toby knocks through the bricked arch with a "controlled" charge (Dess finds a crate of fifty-year-old flares and some grenades in the powder store; "Probably fine"), the dust sheet comes off (`spawnCar: 'firecrest', type: 'ironclad', at: 'powder_store', color: 0xe0481c`), and there she is, *Junebug* under the driver's door, the real Mariner Cup in the boot with O. MARLOW on it. Ottoline's people attack the fort while Toby rebuilds the car (a blackout montage, one line per part, in the order they were found), and Jay holds the walls for 150 seconds (with `dlc_dash_in`, Dash's crew turn their floodlights on the last wave and it's smaller; with `dlc_dash_left`, Dash is on Castellane's channel calling the fort "a hoax"). Dess taps the wheel three times and the Firecrest starts on the first turn of the key. Reward $4,000, grenades.

#### d28_comment_card: Comment Card
`giver: pip` · `start: paloma_fort` · `time: 4.5` · `estMinutes: 10` · Core: **chase** (`chase: 'transporter', mode: 'catch'`; fail if it reaches `scrapyard_gate`), then a short careful drive back
Pip wakes Jay before dawn: the powder store is empty, and on the floor lies a comment card ("How would you rate your stay?"). Ottoline herself has put the Firecrest on a transporter and is taking it over the Southbay Causeway to the Ironside crusher before the race. Jay takes any car from the fort and chases the transporter across the island, down the causeway (`causeway_south`) and along the coast road towards Ironside, and boxes it in before the scrapyard gate; the Firecrest has to come off the back unwrecked (`failIf: ['wrecked:firecrest']`). Ottoline steps down from the cab, hands Jay another card, and is driven away by a Guest Services Sovereign before the police arrive, who ask the remaining teal blazers whether they're a band. Jay drives the Firecrest back over the causeway to `powder_store` with Dess beside him, for the first time ("Third gear sticks. Always did."). Reward $2,500.

#### d29_road_closed: Road Closed
`giver: pip` · `start: bridge_mainland` · `time: 10` · `estMinutes: 10` · Core: **the tank** (`getIn: 'war_tank'`, `destroy` Guest Services roadblock trucks)
Race day: Castellane has closed every road to the Speedway "for the anniversary" with Guest Services Bulwark roadblocks at four points on the finale's route: `bridge_mainland`, `harbor_roadblock` (Seawall Drive), `coast_road` and `bowl_car_park`. Fenella pulls up at Anchor Street with a low-loader and the war film's tank under a tarp ("It's a prop." It is not; it's on loan from Fort Breakwater for *Sergeant Sandcastle*, and she wants it back by six). Jay drives the Bastion down the route destroying the roadblock trucks (`destroy`), with police heat rising to three because, as Monty says on the radio, "there is a tank on Seawall Drive"; with `dlc_blog_on`, Milo's readers in home-made Firecrest T-shirts are already sitting in the road at `harbor_roadblock` and `coast_road` and the Guest Services there have given up, so Jay destroys two; with `dlc_blog_off`, all four. With `dlc_chet_told`, Chet rides in the tank: "Top speed twenty-eight. Finally, a vehicle that respects me." The tank goes back on the low-loader at the Speedway car park and Jay loses the heat on foot. Reward $3,000.

#### d30_the_last_lap: The Last Lap
`giver: dess` · `start: paloma_fort` · `time: 15` · `estMinutes: 18` · Core: **the finale run** (`deliver: 'firecrest'` along the route under Guest Services pursuit, then a one-lap `race` at the Speedway, then the final `choice` and the ending)
The Firecrest leaves the fort with Dess and the cup (and June with `dlc_june_told`; Pip in the back unless `dsr4_southbay_classic`, when Pip and Teddy drive alongside as a guard), up the Neon Strand past the Castellane Palace, over the Paloma Bridge, through Harbor Point and down the coast road to the Speedway (`speedway_tunnel`), with Guest Services pursuing and the cup in the boot (`failIf: ['wrecked:firecrest']`, `maxDamage: 0.75`). The flags shape the run: blog on, crowds with signs line the coast road and block two chasers (Milo's count hits 400,000); dash in, Dash's purple helicopter wobbles overhead broadcasting live and the police are waiting for Guest Services at the tunnel (dash left, two chasers follow into the infield and must be wrecked); `dsf4_check_ride`, Hob's Skylark tows SHE WON over the stands. Out of the tunnel into the middle of the 50th anniversary Southbay 500, the field slows and lets her in, and Jay drives the last lap (`race`, 1 lap; the field gives way) while Monty finally gets his name right and the crowd chants it; chet told, Chet tells 40,000 people the story from the commentary box; chet kept, Chet takes off Rex's jacket on the podium. On the line, Leo takes the microphone and says the true result, Ottoline is arrested in the tunnel, Toby gives June the tin box ("Happy birthday. I'm thirty-four years late."), June and Dess meet (wait) or get out together (told), and Dess says "You drove it here. You say where it goes": **final choice** `dlc_end_hers` / `dlc_end_everybody` / `dlc_end_gone`, then the ending's epilogue (section 8). Reward $25,000 and the gold Firecrest keyring.

---

## 10. Side chains

Four chains, 15 jobs, about 148 minutes. Side jobs `requires` the previous job in their chain; the chain opens at `unlockAfter`. Each chain's last job is the completion flag read by the finale and endings (section 7). Side jobs must never contradict the main plot: they happen "between" main jobs, Dess is never mentioned in them before d23, and nothing in them changes what the main jobs need.

### Take Two (`dside_stunts`): Chet and Fenella's film. Giver `chet`, unlockAfter `d04_stunt_double`
Running gag: **Trey**, the stunt car scheduled to explode in every scene, that Jay keeps bringing back in one piece. Fenella: "Trey was supposed to die in act two." Jay: "Trey had other plans."

#### dst1_second_unit: Second Unit
`giver: fenella` · `start: sunreel_backlot` · `time: 10` · `estMinutes: 9` · Core: **stunt course** (checkpoints with ramps and breakaway props on the backlot and city set, `timer`)
Fenella's second unit needs Jay for the chase sequence the first unit "couldn't get" (Chet drove at thirty). Jay drives Trey (a white Drifter with a big X of tape on the roof) through the city set: up the ramp over the fake subway entrance, through a breakaway fake bank window, round the western set's street at full lock, and back to the camera mark in time. Chet watches from a deckchair: "Loved the first one." Trey survives; Fenella is livid and delighted. Reward $1,500.

#### dst2_night_shoot: Night Shoot
`giver: fenella` · `start: neon_strand` · `time: 22.5` · `estMinutes: 10` · Core: **chase** (`chase: 'villain_car', mode: 'wreck'`)
The film's night chase down the Neon Strand under real neon: Jay chases the "villain car" (a black Ironclad driven by a stuntman who will jump clear) from Wonder Wharf down the Strand and has to wreck it on the mark by the Castellane Palace fountain. Two real Guest Services cars think it's a real chase and join in, and Jay has to shake them before the director's "Cut!" With `dlc_chet_told` (once set), Chet has rewritten his line in the margin and says it to Jay between takes ("He didn't win, kid. Says so right here, in my pen."). Reward $2,000.

#### dst3_rain_machine: The Rain Machine
`giver: fenella` · `start: airport_fire_station` · `time: 13` · `estMinutes: 10` · Core: **fire-engine delivery** (`deliver: 'crash_tender', to: 'sandpiper_beach', timeLimit: 300`, then a `wait` while it "rains")
The rain machine broke and the light on Sandpiper Beach goes in five minutes. Fenella's solution: "borrow" an airport crash tender. Jay takes one from the fire station, drives it across the city with the siren going and two stars behind (lose them before the beach or the police stop the shoot), and parks it at the water's edge to rain on Chet and a lot of extras in raincoats while Gully the lifeguard blows his whistle at everyone. Fenella: "It's for the movie." Gully: "It's a fire engine." Reward $2,000.

#### dst4_the_big_jump: The Big Jump
`giver: chet` · `start: mariner_stadium` · `time: 19.5` · `estMinutes: 11` · Core: **stunt jump plus a timed run** (checkpoints, ramp, `timer`)
The film's big half-time stunt at Mariner Stadium: Trey over a line of six buses in the stadium car park, through the gate, round the stadium apron and across the line before the sun goes. Chet asks to ride along "for research" and, for the first time in his life, goes over thirty (he screams the whole way, then asks to go again). Fenella promises to film "whatever you're really doing" one day (paid off in d30). After the wrap, parked and empty, Trey quietly explodes by itself. Reward $3,000; completion flag `dst4_the_big_jump`.

### Marks Out of Ten (`dside_flying`): Hob's flying school. Giver `hob`, unlockAfter `d18_ground_school`
Every landing gets a mark, out loud, from Hob. The marks never reach ten until the last job.

#### dsf1_banner_day: Banner Day
`giver: hob` · `start: field_apron` · `time: 11` · `estMinutes: 9` · Core: **low-level flying** (Skylark, `fly` rings at height 40 to 60, then `land`)
Hob's new sponsor (the Sandpiper Prawn Shack: "NOW WITH FEWER BONES") wants a banner towed along the beach. Jay flies the Skylark from Paloma Field across the bay and down Sandpiper Beach low (`fly` rings over `sandpiper_beach`, `lifeguard_tower_7`, `skate_park`, `sandpiper_promenade`), with Gully on the radio from his tower complaining about the noise, and back to land at Paloma Field. Hob: "Five. The banner was upside down. That's not your fault. That's not not your fault." Reward $1,500.

#### dsf2_chimney_pots: Chimney Pots
`giver: hob` · `start: field_apron` · `time: 15` · `estMinutes: 10` · Core: **air race against the clock** (Skylark, a `timer` and a chain of `fly` rings)
Hob's club record round the Ironside chimneys has stood for twenty years. Jay flies to Ironside and threads the course (`fly` rings between `ironside_power`'s chimneys, over `ironside_railyard` and low along `ironside_pipes`), inside Hob's record time, then lands back at Paloma Field. Hob, who set the record: "Eight. I'm not upset. I'm a grown man." Reward $2,000.

#### dsf3_doughnut_drop: Doughnut Drop
`giver: hob` · `start: hob_hangar` · `time: 8` · `estMinutes: 10` · Core: **helicopter deliveries** (Sparrow, three `land` steps)
Tuesday, and the Skylark is in for its check, so the doughnuts go by helicopter. Jay flies the club Sparrow to three helipads and lawns: the private clinic's helipad (`paloma_clinic`; the night nurses), the observatory lawn (`paloma_observatory`; the astronomers, who've been up all night), and across the bay to the Halcyon sports field (`halcyon_field`), where Quill and Milo are waiting and Milo gets the first jam doughnut he's ever been delivered by air. Hob marks each landing over the radio. Reward $2,000.

#### dsf4_check_ride: Check Ride
`giver: hob` · `start: field_apron` · `time: 17` · `estMinutes: 11` · Core: **cross-country flight with a landing at the big airport** (Skylark, `fly` rings, `land: 'vicehaven_international'`, take off again, `land: 'paloma_field'`)
Hob's check ride: from Paloma Field to Vicehaven International, landing on the real runway between airliners (the tower is not amused), a stop to taxi off and on again, then back over the Halcyon clock tower and the Coral Marina light and a landing at Paloma Field in a crosswind. Hob climbs out, looks at the windsock, and gives his first ten in forty years. He hands Jay the spare keys to the club's second Skylark ("It's yours on Tuesdays"). Reward $3,000 and a Skylark at Paloma Field; completion flag `dsf4_check_ride`.

### Summer Series (`dside_speedway`): Pip's racing team. Giver `pip`, unlockAfter `d10_heritage_run`
Pip's racing licence was suspended by the Castellane-run stewards alongside her road ban ("conduct unbecoming"), so Jay drives for Marlow Racing to keep the team's points while she runs the radio. Monty calls every race with a new wrong name for Jay.

#### dsr1_oval_sprint: Oval Sprint
`giver: pip` · `start: speedway_pits` · `time: 16` · `estMinutes: 9` · Core: **Speedway race** (`race`, 5 laps of the oval, 5 rivals)
Round one of the Summer Series: a five-lap sprint against Teddy Castellane's gold works Zephyrs and three privateers, in Pip's white Drifter with its embarrassing sponsors (a wart clinic, a prawn shack). Pip on the radio, Monty on the PA ("And it's... Jim Mercy for Marlow Racing!"). Win to keep the team alive. Reward $2,000.

#### dsr2_campus_sprint: Campus Sprint
`giver: pip` · `start: halcyon_quad` · `time: 21.5` · `estMinutes: 10` · Core: **street race** (`race`, 2 laps round the Halcyon campus)
The series' street round, on the closed roads round the campus at night: the quad, the student strip, round the clock tower twice. Teddy cuts a corner across the lawn and Officer Plum, on his bicycle, gives chase to the wrong car. Milo watches from the library steps with a homemade flag. Win the race. Reward $2,000.

#### dsr3_dirty_air: Dirty Air
`giver: pip` · `start: speedway_pits` · `time: 13` · `estMinutes: 10` · Core: **tail** (`follow: 'castellane_transporter'`, then escape)
Teddy's car is suddenly two seconds a lap faster and Pip smells cheating. Jay tails the Castellane Racing transporter from the Speedway north through the city to a lock-up behind the Cinder Creek truck stop (`cinder_truckstop`), where Castellane mechanics are fitting a banned engine. Teddy turns up too, and it's clear he didn't know; when Guest Services arrive to "tidy up", Jay gets Teddy and Pip out of there (escape to `speedway_pits`). Teddy, ashamed: "I thought I was just good." Reward $2,000.

#### dsr4_southbay_classic: The Southbay Classic
`giver: pip` · `start: speedway_pits` · `time: 18` · `estMinutes: 11` · Core: **Speedway race** (`race`, 10 laps of the oval, 7 rivals)
The series finale. Teddy has told the stewards about the banned engine, and the stewards (embarrassed) give Pip her racing licence back on the grid. She still lets Jay drive the final: "You got us here. Finish it." Ten laps against the whole field, Teddy fair this time. At the line Pip and Teddy shake hands, and Monty almost gets Jay's name right ("Jay... Mer... Murphy!"). Reward $4,000 and Pip's spare Drifter; completion flag `dsr4_southbay_classic`.

### Dual Control (`dside_lessons`): June's driving school. Giver `june`, unlockAfter `d09_minor_fault`
June has decided Jay "needs supervision" and is going to provide it. Every job has June's clipboard and a mark.

#### dsl1_three_point_turn: Three-Point Turn
`giver: june` · `start: june_house` · `time: 10` · `estMinutes: 9` · Core: **chase** (`chase: 'learner', mode: 'catch'`)
Mid-lesson, while June's most nervous pupil, Rosa Lindqvist (16), practises a three-point turn, a car thief jumps into the learner Pipit at the kerb and drives off with June's clipboard on the seat. Jay chases the pale-blue Pipit through Vista Verde's cul-de-sacs and the mall car park, June on the phone giving the thief marks ("He hasn't indicated once"), and boxes it in. Rosa, watching: "At least I've never done THAT." Reward $1,200.

#### dsl2_school_run: School Run
`giver: june` · `start: vista_verde_school` · `time: 14.5` · `estMinutes: 9` · Core: **careful timed delivery** (`deliver: 'school_van', to: 'mariner_stadium', maxDamage: 0.2, timeLimit: 240`)
The school bus has broken down on the day of the schools' final at Mariner Stadium, so June volunteers Jay to drive the team's van: their kit, the mascot (a boy in a pelican costume who won't stop flapping) and a cake shaped like the cup, from Vista Verde School across to The Bowl. Too fast and the cake goes; too slow and they forfeit. June rides along marking everything. Reward $1,500.

#### dsl3_test_day: Test Day
`giver: june` · `start: verde_mall` · `time: 11` · `estMinutes: 10` · Core: **precision course** (cone checkpoints, a parallel-park `goto` with `stop: true` and a tiny radius, `maxDamage: 0.05`, `failIf: ['heat:1']`)
"The Marlow Test": June won't let anyone drive her daughter about who hasn't passed it. In the learner Pipit in the Verde Mall car park, Jay drives June's cone course (a slalom, a reverse round a corner, an emergency stop when a shopping trolley rolls out) and parallel-parks between two cars without touching either. Rosa takes her real test in the next bay at the same time and passes too. June: "Ninety-four per cent. Nobody gets a hundred. I didn't." Reward $2,000 and a certificate; completion flag `dsl3_test_day`.

---

## Appendix A. District coverage
Every district hosts at least two jobs.

| District | Main jobs | Side jobs |
|---|---|---|
| sandpiper | d11, d12, d29, d30 | dst3, dsf1 |
| vistaverde | d09, d25 | dsl1, dsl2, dsl3 |
| ironside | d13, d14, d28 | dsf2 |
| thebowl | d10, d29, d30 | dst4, dsr1, dsr3, dsr4, dsl2 |
| sunreel | d04, d24 | dst1 |
| cindercreek | d01, d02, d03, d08, d13, d24 | dsr3 |
| halcyon | d02, d05, d06 | dsr2, dsf3 |
| coralmarina | d06, d07, d08, d22, d24 | dsf4 |
| neonstrand | d17, d19, d26, d30 | dst2 |
| oldpaloma | d17, d21, d22, d23, d27, d28, d30 | |
| palomaheights | d20, d23 | dsf3 |
| palomafield | d16, d17, d18, d20, d22 | dsf1, dsf2, dsf3, dsf4 |
| airport | d15, d16, d26 | dst3, dsf4 |
| old city (guest) | d26, d29, d30 (Harbor Point, the boardwalk) | |

## Appendix B. Ambient texts
`D.texts.push({ after, from, message })`. Keep the voices.

| after | from | message |
|---|---|---|
| `d01_lot_17` | pip | "Lot 17 is ours. $40 a month. Don't tell my mum. Don't tell anyone. And mind the... no idea why I keep wanting to say that." |
| `d02_the_tin_man` | milo | "TEAM FIRECREST 1 · LOCKWOOD'S LOST LEGENDS 0 (+1 rusty tap). Subscribers: 41. Gran says well done." |
| `d03_double_feature` | prof_quill | "I have now watched the newsreel 201 times. She taps the wheel three times before the start. I don't know why I mention it. I simply do. A.Q." |
| `d04_stunt_double` | chet | "Kid. Fenella says you hit that ramp at seventy. SEVENTY. I had to lie down in my trailer. Loved the first take." |
| `d06_breaking_news` | dash | "No hard feelings re: van. Your boxing-in was a 9/10, would be boxed in again. Dash. (Kit says I shouldn't text you. Sent anyway.)" |
| `d07_champions_since_day_one` | ottoline | "Thank you for visiting Coral Marina. How would you rate your experience today? Reply 1 to 5. Castellane Guest Services." |
| `d09_minor_fault` | june | "Mr Mercer. Your mirror checks were acceptable. Your fountain was not. J. Marlow" |
| `d10_heritage_run` | monty | "Cracking drive today, Jim! Or Jake. Or Chet? Who WAS that? Monty" |
| `d16_four_out_of_ten` | hob | "Windsock repaired. Invoice: $40 and one apology. Doughnuts Tuesday. Hob, Paloma Flying Club" |
| `d19_golden_grabber` | milo | "Update: Lockwood's Lost Legends now holds one (1) teddy bear. I'm counting it. Fairness matters." |
| `d23_odie_wren` | dess | "This is Odie. Or Dess. Haven't decided. Toby gave me your number. Don't text back. (Text back.)" |
| `d27_the_powder_store` | toby | "First turn of the key. Fifty years, and she started first time. Hell's bells, son." |
| `d28_comment_card` | ottoline | "We notice you haven't completed our survey. We'll be in touch either way." |
| `d30_the_last_lap` | milo | "GG. That means good game. Grandad asked. Then he asked what a game was. Then he wrote it down." (The FINAL SCORE text is a `text` step inside d30, with the whistle only under `dlc_blog_on`.) |
| `d08_thirty_four_years` | toby | "Drawings are under your table. Don't spill tea on them. Sorry about the box. That's not enough. I know. T.B." |
| `d17_contraband` | pip | "Hob's given me a job. I'm sorting jam from custard. I'm a Speedway champion." |
| `d24_spare_parts` | leo | "I don't believe we finished our call. My door is always open. Leo." |

---

## 11. For the scripters

The beat sheets in `docs/dlc/` (`beats-act1.md` … `beats-act4.md`, `beats-side.md`) turn every job in sections 9 and 10 into ordered steps; they were edited into one story with this bible, and where a beat sheet and an older line of this bible ever disagree, the beat sheet's **DECISIONS** and the editor's notes in it win. `js/data/dlc.js` already holds every character who speaks (with look and voice) and every story place the beats use (section 6.2 and 6.2b): do not redefine them in your file; if you truly need a new place or speaker, add it to `dlc.js` with a valid district and kind and say so in your report.

### 11.1 The file split
Every file starts with the header's IIFE pattern (`const D = (S.dlc = S.dlc || {...})`) and only pushes to `D.missions`, `D.side` and `D.texts`. Each file also pushes the ambient texts (Appendix B) whose `after` is one of its own jobs.

| File | Writer | Job ids, in order |
|---|---|---|
| `js/data/dlc-act1a.js` | Act 1a | `d01_lot_17`, `d02_the_tin_man`, `d03_double_feature`, `d04_stunt_double` |
| `js/data/dlc-act1b.js` | Act 1b | `d05_clockwork`, `d06_breaking_news`, `d07_champions_since_day_one`, `d08_thirty_four_years` |
| `js/data/dlc-act2a.js` | Act 2a | `d09_minor_fault`, `d10_heritage_run`, `d11_two_eyes`, `d12_floor_safe` |
| `js/data/dlc-act2b.js` | Act 2b | `d13_the_crusher`, `d14_decoy`, `d15_departures`, `d16_four_out_of_ten` |
| `js/data/dlc-act3a.js` | Act 3a | `d17_contraband`, `d18_ground_school`, `d19_golden_grabber`, `d20_the_gorse_file` |
| `js/data/dlc-act3b.js` | Act 3b | `d21_ring_twice`, `d22_two_lights`, `d23_odie_wren` |
| `js/data/dlc-act4a.js` | Act 4a | `d24_spare_parts`, `d25_junebug`, `d26_blue_lights`, `d27_the_powder_store` |
| `js/data/dlc-act4b.js` | Act 4b | `d28_comment_card`, `d29_road_closed`, `d30_the_last_lap` (with the three endings as the final `choice`'s `then` lists) |
| `js/data/dlc-side-stunts.js` | Side 1 | `dside_stunts` *Take Two* (giver `chet`, `unlockAfter: 'd04_stunt_double'`): `dst1_second_unit`, `dst2_night_shoot`, `dst3_rain_machine`, `dst4_the_big_jump` |
| `js/data/dlc-side-lessons.js` | Side 1 | `dside_lessons` *Dual Control* (giver `june`, `unlockAfter: 'd09_minor_fault'`): `dsl1_three_point_turn`, `dsl2_school_run`, `dsl3_test_day` |
| `js/data/dlc-side-flying.js` | Side 2 | `dside_flying` *Marks Out of Ten* (giver `hob`, `unlockAfter: 'd18_ground_school'`): `dsf1_banner_day`, `dsf2_chimney_pots`, `dsf3_doughnut_drop`, `dsf4_check_ride` |
| `js/data/dlc-side-speedway.js` | Side 2 | `dside_speedway` *Summer Series* (giver `pip`, `unlockAfter: 'd10_heritage_run'`): `dsr1_oval_sprint`, `dsr2_campus_sprint`, `dsr3_dirty_air`, `dsr4_southbay_classic` |

30 main jobs, 308 estimated minutes (Act 1 80, Act 2 78, Act 3 71, Act 4 79); 15 side jobs, 148 minutes. Use the `estMinutes` in the beat sheets' headers.

### 11.2 The checklist (every scripter, every job)
**Flags and where they branch.** Only these are set by choices; completed job ids count as flags. Every `if` has both branches written, and neither is the "bad" one.
- `dlc_blog_on` / `dlc_blog_off` (d08): d09 why Guest Services come; d10, d11, d16, d19, d21, d24, d26, d27, d28, d29, d30 Milo's subscriber line or paper wall; d11 Dash on the beach (and the whistle) or two extra guards; d13 the photo or the bought storage yard; d19 tail `max` 140 or 110 and who gives the route; d23 three cars or two and Ottoline; d29 fans on two roadblocks or four trucks; d30 crowds block two chasers or full pursuit; endings: the shared news story or the longhand book. Side: dsf3, dsr2 (one line each).
- `dlc_chet_told` / `dlc_chet_kept` (d14): *Take Two* lines (with an `else` for "not chosen yet", nesting `if: 'dlc_chet_kept'`); d24 Chet brings the tyres or Fenella does; d29 Chet in the tank or on the phone; d30 the commentary box or the jacket on the podium; endings: *Mind the Road* or the shelved film.
- `dlc_dash_in` / `dlc_dash_left` (d20): d20 escape (Dash narrates, or one extra car); d21 two or three rooftop groups; d23 Kit films the snatch or not; d27 floodlights or "a hoax" on TV; d30 helicopter and police at the tunnel, or two chasers in the infield and the grandstand turn; endings per section 8.
- `dlc_june_told` / `dlc_june_wait` (d25): d26 June in the cab or her text; d27 the fort steps or "She marks everything"; d28 June stays at the lighthouse or Toby alone; d30 June in the passenger seat and Jay's speech to Dess in the tunnel, or June from the grandstand and Jay's speech to June on the line; endings. Side: one line in dsl3.
- Final choice (d30): `dlc_end_hers` / `dlc_end_everybody` / `dlc_end_gone`.
- Completion flags read late: `dst4_the_big_jump` (Fenella's crew, last caption "a film by Fenella Moss"), `dsf4_check_ride` (SHE WON banner, "Ten. Again." or a nine in d30), `dsr4_southbay_classic` (Pip and Teddy as guard cars, parade lap), `dsl3_test_day` (d25 line, Ending A's test sheet), `d25_junebug` (dsl3's 94 line), `d23_odie_wren` (side jobs may mention Dess only inside it).

**Callbacks and tallies (keep the numbers exact).**
- Pip calls Jay "Driver" until her first "Jay" at the end of d08. Milo says "Mr Mercer" until d05 ("Jay. Just Jay."). Dess says "young man" until "Jay, is it?" at the end of d23. June says "Mr Mercer" until once, in d30.
- Comment cards: d01, d03, d04, d07, d11, d13, d14, d20 (Dash's hatband), d28 (the floor) = nine in the glovebox; the blank tenth from Ottoline at the end of d28 lives in Jay's shirt pocket and is filled in in d30. Side jobs never give one.
- Scoreboard parts: 1 wheel (d02), 2 bird (d04), 3 clock (d05), 4 carburettor (d09), 5 headlamps as a pair (d11), "custody" for the clock and carburettor d13 to d16, 6 gear stick (d19), 7 coil (d21), "seven plus one driver" (d23). Lockwood: tap, spur, minute hand (counted from d06), gnome, whistle (blog on only), teddy.
- Subscribers (blog on): 41 (d02), 60 (d03), 41 (d06, Gran), 900 (d11), 12,000 (d16), "twelve thousand and a bit" (d19), 80,000 (d21), 81,000 (d24), 100,000-plus (d26), 200,000 (d29), 400,000 (d30). With blog off, the paper wall instead, every time.
- Hob's marks: 4 (d16), 7 (d18), "No mark" (d20), 8 (d22), 9 in d30 only without `dsf4_check_ride`. Side: 5, 8, 6, 7, a disputed five and a half, then the first 10 in dsf4.
- Monty's names: never right until d30's one "JAY MERCER!". Use Jim Mercy, Jake Murphy, Joe Mercury, Jem Mersey, Jack Mackerel, Jay... Mercator, "Jay... Mer... Murphy!" (dsr4). Never "Merkin".
- The Halcyon clock is eleven seconds slow until d05; then it is stopped at 11:14 for good (minute hand gone from d06).
- The starter key on its little gold bird keyring: Pip's from d01, clipped to Jay's belt in d17 ("Driver holds the key"), handed to Dess in d27, back in the tin box for June in d30; Dess gives Jay the gold bird.
- Toby's lines are each said once: "She's not a car. She's a promise with four wheels" (d08); "I drove to the house. There was a car outside. I drove away. Thirty-four years I've been driving away." (d08; in d23 he says a shorter version to Dess); "Every night at ten the fort light says goodnight. I say it back. Manners." (d08, echoed by him in d22 as the answer to R10). June's "I don't care if they're shooting, Mr Mercer, you indicate" is d09's; "Ninety-four per cent. Nobody gets a hundred. I didn't." is said once, in d25 or dsl3, whichever is first.
- Pip's first race was at twelve: June watched the first lap through the fence (d09), Dess watched and left before the end (d23).
- Weapons handed out mid-job: SMG (d03), shotgun (d13), rifle (d21), grenades (d27, weapon id `grenade`).

**Running gags, in their places.** "And mind the road" (every riddle; Pip says it as people leave from d07; June in d25 only; Dess only in d30 and Ending B; the last line of every ending). Quill carsick in every car, fine in every aircraft. Chet never drives over thirty (he rides over it in dst4). Dash's "Legend... FOUND!" over the wrong thing, once over the right one (d30, dash in). June's "Minor fault" (her one "Serious fault" is d09, crossed out). Hob's marks. Milo opens every call with "Did you know...", ends big claims with "Probably.", corrects "less" to "fewer". Kit: "We're rolling. We're always rolling." Ottoline's cards and "We'll be in touch either way." Three taps (newsreel d03, café counter d17, the bricks and door frame d23, the wheel d27 and d30). Third gear sticks and is never fixed. Trey never explodes on cue (side). The plastic chicken on the sheriff's roof (from d04).

**How each character talks (one line each; section 4 has the detail).** Jay: spare, dry, talks to vehicles, "damn" about once a job, one four-line speech in d30. Pip: fast, blunt, half-sentences, "crap" when she stalls, "hell yes" when thrilled, rates cornering out of ten. Milo: a fact first, a joke second, "Probably.", never swears, never in danger. Quill: long sentences, footnotes aloud, "Great Scott", "blast", a scholarly wrong answer first. June: instructor voice, marks everything, never swears; drops the voice only when it matters. Toby: short, engine metaphors, long silences, "hell's bells", "son", "trouble". Dess/Odie: dry, quick, racing slang, questions for answers; `odie` until Toby's "Hello, Dess." in d23. Dash: booming on camera, anxious and mildly sweary ("crap") off it, never nasty. Leo: warm, unhurried, hospitality language, never swears, raises his voice once ("OTTOLINE."). Ottoline: customer-service steel ("I'm afraid", "assistance", "we'd love your feedback"), never swears. Hob: loud, cheerful, "crikey", "bloody" (rarely), "right then", marks out of ten. Chet: grand, kind, quotes his own films, "kid", "Loved the first one" / "There wasn't one". Monty: full-speed commentary, wrong names, heartfelt once. Fenella: "It's for the movie." Kit: deadpan. Gully: whistle and grievance. Teddy: spoilt, fair, not a villain.

**The riddle rules.** Quote R1 to R10 word for word from section 1's table (R3 reads "Twelve on top and six below"). Show each riddle in full (a `blackout` of captions or read aloud) and end the job or start a drive before anyone answers it; the answer comes from Milo at least one drive later, after a `camera` shot of the answer without comment (R4 is planted by line; R7 is not a riddle and is read on the spot). Quill or Dash gets it wrong first. Milo explains how in one or two lines, then the scoreboard. No riddles in side jobs. Ending C's new riddle (Milo's) is never solved on screen.

**Content.** Mild language only (see section 1); at most a handful of "shit"/"ass" in the whole DLC and none in Acts 1 to 4 as written; no f-word, no slurs, nothing sexual, no drugs (not even as a joke or a stage direction), no gambling (the claw machine is an arcade game and rigged, which is the joke). Nobody named dies; goons are "down" or "taken away". Original names only: brands in the DLC are the game's own (Kwik Pik, Sovereign, Tern, Bulwark, Pipit, Drifter, Vireo, Zephyr, Ironclad, Skylark, Sparrow, Albatross, Bastion). No main-story speakers except `nana_lu` in memories; no main-story events.
