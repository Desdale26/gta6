# Chasing the Firecrest: beat sheets, the four side chains

Beat sheets for the two side-chain writers (side writer 1: *Take Two* `dside_stunts` and *Dual Control* `dside_lessons`; side writer 2: *Marks Out of Ten* `dside_flying` and *Summer Series* `dside_speedway`). The plot, places, mechanics and completion flags come from `docs/DLC_BIBLE.md` section 10 (and the flag payoffs in section 7) and are not changed here; this file turns each outline into ordered steps with the engine step type, the places, who is present, what the player does and the lines that must land. Lines marked **(keep)** are fixed; everything else is a guide the scripter writes in full. Same conventions as `beats-act1.md` to `beats-act4.md`.

Conventions used below:
- Step types are the engine's (`scene`, `blackout`, `phone`, `text`, `goto`, `spawnCar`, `getIn`, `spawn`, `join`, `leave`, `kill`, `survive`, `protect`, `chase`, `follow`, `race`, `deliver`, `collect`, `destroy`, `heat`, `loseHeat`, `choice`, `if`, `setFlag`, `music`, `slowmo`, `setTime`, `fade`, `teleport`, `camera`, `timer`, `wait`, `reward`, and the DLC's `fly` and `land`).
- Place ids are from `dlc.js` (story places), the built-in landmarks (bible 6.1), the airport's registered places (`airport_apron`, `airport_gate`, `airport_hangars`, `airport_helipad`) or the Speedway places first asked for in `beats-act2.md` (`speedway_grid`, `speedway_turn1`, `speedway_back_straight`, `speedway_turn3`). Places in none of those are marked **[NEW]** and listed in "NEW PLACES NEEDED" at the end.
- Vehicles use the bible's mission ids and types (6.3): `trey` white `drifter` 0xf1f0ea (big X of tape on the roof); `villain_car` black `ironclad` 0x0e0e10; `crash_tender` `firetruck` 0xc8202a; `hob_skylark` yellow `skylark` 0xf2c500; `club_sparrow` white `sparrow` 0xf2f2ee; `pip_car` white `drifter` 0xf1f0ea; `castellane_racer` gold `zephyr` 0xd29a1c; `castellane_transporter` gold `hauler` 0xd29a1c; `learner` pale-blue `pipit` 0x78b8e8; `school_van` yellow `porter` 0xf2c61f; `gs_car1..n` teal `sovereign` 0x13b5b1. New ids (existing types): `neighbour_car` (dsl1), `privateer1..5` (race rivals), `teddy_road` (dsr3), `skylark_two` (dsf4 reward only).
- Guest Services drivers are spawned as the act files do it, with a `driver()`-style helper: `{ id, char: 'gs_staff', faction: 'guest_services', at, behavior: 'drive', car, to: <target car id> }`, hostile unless noted.
- "Banter" = the `say` lines on a drive, flight or race step; the topic is given, the scripter writes 6 to 12 lines.
- **Side jobs float.** Each chain opens at its `unlockAfter` and can be played any time after, so a side job may run before or after any later main job. Rules that follow from it (bible section 10): no side job mentions Dess (alive, Odie-as-Dess, the fort, the car's whereabouts) unless inside `if: 'd23_odie_wren'`; anything that depends on a main-job flag that may not be set yet is written as an `if` whose `else` also covers "not chosen yet". Pre-d23, Pip may talk about "Gran" only as the legend everyone knows (won, painted out, "drowned").
- **Tallies the side chains do not touch:** comment cards in the glovebox (main jobs only, nine by d28; side jobs never hand Jay a card, though a Guest Services man may try), Milo's subscriber count and the scoreboard (side jobs never give numbers; with the blog he may say he's "posting this", nothing more), Monty's right name (only d30; in side races he gets it wrong, closest in dsr4), Hob's marks (side marks in this file: dsf1 5; dsf2 8; dsf3 6, 7 and a disputed 5; dsf4 **10**, the first; the main jobs give 4 (d16), 7 (d18), 8 (d22), and d30 gives 9 if dsf4 is not done). June's "Serious fault" belongs to d09; side jobs use "Minor fault" only.
- **No riddles in the side chains.** The ten riddles are main-plot only. Side jobs may echo "And mind the road" lightly (Pip says it when someone leaves; June does not say it before d25).
- Jay says "damn" about once a job, often to a car. Quill is carsick in cars, fine in aircraft. Chet never drives over thirty (he may ride over it: dst4).

---
# TAKE TWO (`dside_stunts`)

`D.side.push({ id: 'dside_stunts', title: 'Take Two', giver: 'chet', unlockAfter: 'd04_stunt_double', missions: [...] })`. Chet and Fenella's film, *Champions Since Day One*. Map marker: Chet's initial at the first job's start. **Running gag: Trey**, the white stunt Drifter with a big X of tape on its roof, scheduled to explode in every scene, that Jay keeps bringing back in one piece. Gary is the pyrotechnics man with the button (never seen, only shouted at). **Reads:** `dlc_chet_told` / `dlc_chet_kept` (set in d14; may not be set yet: the `else` branch covers both "kept" and "not yet", with a nested `if: 'dlc_chet_kept'` where the kept line differs). Speakers: `jay fenella chet gully gs_staff caption`.

## dst1_second_unit: Second Unit

- **id** `dst1_second_unit` · **title** Second Unit · **giver** `fenella` · **start** `sunreel_backlot` · **requires** none (chain opens after `d04_stunt_double`) · **time** 10 · **estMinutes** 9
- **reward** `{ money: 1500 }` · **failIf** `['wrecked:trey']`
- **summary** "The first unit couldn't get the chase. The first unit had Chet driving it at thirty."
- **Core:** stunt course (solo checkpoints with ramps and breakaway props, against a `timer`). **Cast:** jay, fenella, chet (deckchair).

1. `spawnCar` `trey` at `sunreel_backlot`, color 0xf1f0ea. `music: 'off'`.
2. `camera: 'sunreel_backlot'`, 4 s, caption "Sunreel Studios. Second unit. 10 a.m." Then `camera: 'sunreel_city_set'`, 3 s.
3. `scene` at `sunreel_backlot`, cast fenella, chet, jay. Fenella with three phones and a megaphone she uses at conversational distance. The first unit's chase rushes: "I've seen faster funerals. Nice funerals. Lovely flowers. Not a chase." Chet, from a deckchair under a parasol with his name on it: "It was a respectful pace." Fenella introduces Trey. **(keep)** Fenella: "That's Trey. Trey explodes at the end of the sequence. Not today, not by you. By Gary, with a button. Bring him back in one piece so Gary can do it properly." Jay, to the car: "Hello, Trey." Fenella: "Don't name it. The crew named it. Now they're sad every time."
4. `if: 'dlc_chet_told'` then: Chet shows Jay his script, every one of his lines has "no" written next to it in pen: "Fenella says that's not acting. I say it's a choice." `else`: nested `if: 'dlc_chet_kept'` then: Chet: "Fenella, in this scene, does Rex know he's... (catches Jay's eye) Never mind. Just a film." `else` (not yet): Chet rehearses "Champions since day one!" three ways, each worse. Fenella: "The second one. No. None of them."
5. Fenella explains the run (objective preview): up the ramp over the fake subway entrance, through the bank window ("sugar glass, it's meant to break, that's the only thing on this lot that does what it's meant to"), round the western street at full lock, back to the camera mark before the light moves. Chet: "Kid. If you go over thirty, I can't watch. I'll listen."
6. `getIn: 'trey'`, objective "Get in Trey". `music: 'action'`, `checkpoint: true`.
7. `timer: 150`, then `race: { checkpoints: ['subway_ramp' [NEW], 'fake_bank' [NEW], 'sunreel_western_set', 'camera_mark' [NEW]], rivals: [], laps: 1 }`, objective "Do the chase in one take". Megaphone `say` (Fenella, over a loudspeaker on the crane): "Ramp! Ramp! Lovely!" / "Window! Glass! Glorious!" / at the western set: "Full lock round the saloon. Mind the chicken." Jay: "(quietly) What chicken?" Chet (on the set radio): "Somebody swapped the sheriff's weathervane for a plastic chicken. Nobody's owned up. It's the talk of catering." Jay says nothing (he did it in d04; the player knows). This is the laugh.
8. `goto: 'camera_mark'`, vehicle `trey`, `stop: true`, radius 5, objective "Stop on the mark" (the race's last checkpoint gets him there; this makes him stop).
9. `music: 'hope'`. `scene` at `camera_mark`, cast fenella, chet, jay. Fenella, livid and delighted at once: "That was perfect. That was the best chase this lot has seen in twenty years. And he's still in one piece." Over her shoulder: "GARY. Stand down. Trey lives." **(keep)** Fenella: "Trey was supposed to die in act two." **(keep)** Jay: "Trey had other plans."
10. Chet, getting out of the deckchair with effort: **(keep)** "Loved the first one." Jay: "There's only been one." Chet: "And I loved it." Fenella books Jay for "the night shoot. On the island. Bring a jacket, the neon's cold." (sets up dst2).

**Scripter notes:**
- *Earlier flags:* `dlc_chet_told`/`dlc_chet_kept`/neither (step 4). If `d14_decoy` is done, Fenella adds: "You drove my replica round a power station. I saw the scratches. I'm not angry. I'm taking notes."
- *Retry:* failing the timer restarts at step 6 (`checkpoint`). Fenella on a restart: "Again. From the top. Trey, you're doing great."
- *Banter before the run* (walking to Trey): Chet on his career ("Oversteer 2: Understeer. There was no Oversteer 1. It's a long story. The short version is: lawyers."), Jay: "Loved the first one." Chet: "(delighted) Thank you."
- *Music:* off → action (run) → hope (scene).

## dst2_night_shoot: Night Shoot

- **id** `dst2_night_shoot` · **title** Night Shoot · **giver** `fenella` · **start** `neon_strand` · **requires** `dst1_second_unit` · **time** 22.5 · **estMinutes** 10
- **reward** `{ money: 2000 }` · **failIf** `['wrecked:trey']`
- **summary** "A film chase down the Neon Strand. Two teal cars didn't get the call sheet."
- **Core:** chase (`chase: 'villain_car', mode: 'wreck'`), then shake real pursuers. **Cast:** jay, fenella, chet (in Rex's red jacket and a period wig), gs_staff.

1. `spawnCar` `trey` at `wonder_wharf`; `spawnCar` `villain_car` at `wonder_wharf`, color 0x0e0e10. `music: 'off'`. `setTime` is the job's `time`.
2. `camera: 'neon_strand'`, 4 s, caption "Isla Paloma. The Neon Strand. 10:30 p.m. A closed set, mostly." `camera: 'castellane_palace'`, 3 s (CHAMPIONS SINCE DAY ONE in gold neon; it is Castellane's film and Castellane's street, which is why they have the permit).
3. `scene` at `wonder_wharf`, cast fenella, chet, jay. The plan: the black villain car, driven by a stuntman, Vince, who "has been thrown out of better cars than this", runs from the Wharf down the Strand; Jay in Trey chases and wrecks it on the mark by the Palace fountain; Vince bails before the hit. Fenella: "Cameras all the way down the Strand. Wreck it anywhere south of the big wheel and I'll cut it so it's the fountain. That's what editing is: lying, but with rhythm."
4. `if: 'dlc_chet_told'` then: **(keep)** Chet, tapping the margin of his script: "He didn't win, kid. Says so right here, in my pen." Fenella, not looking up: "Chet, that's my good script." `else`: nested `if: 'dlc_chet_kept'` then: Chet: "Fenella. Was Rex a good man?" Fenella: "He's a good part." Chet: "That's not what I asked." `else`: Chet admires himself in the wig in Trey's wing mirror: "Every racing driver I've played had this hair. I think it's the same wig."
5. `spawn` `{ id: 'vince', faction: 'civilian' (non-hostile, generic stuntman look), at: 'wonder_wharf', behavior: 'drive', car: 'villain_car', to: 'castellane_palace' }`. `getIn: 'trey'`. `music: 'action'`, `checkpoint: true`.
6. `chase: 'villain_car', mode: 'wreck'`, objective "Chase the villain car down the Strand and wreck it (it's for the movie)". Fenella `say` on the set radio: "Lovely. Closer. Closer! Make it look like you mean it." / "Vince says hello. Vince says not so close." Halfway (scripter: split as a `say` cue or put the spawns before the chase): `spawnCar` `gs_car1`, `gs_car2` at `strand_checkpoint`; Guest Services drivers `behavior: 'drive'`, `to: 'trey'`, hostile, pistols. gs_staff on a loudhailer: "Good evening! This is a private street! Please stop chasing that car!" Fenella: "Who are the teal people? They're not on my call sheet. Nobody teal is on my call sheet."
7. When the villain car is wrecked: `slowmo: 2`, caption "(Vince rolls clear, stands up, bows to nobody.)"
8. `heat: 2` (the Guest Services men are shooting on the Strand; the police come for everybody). `loseHeat: true`, objective "Shake the teal cars and the police before Fenella says cut". Banter (Fenella and Chet on the radio): Fenella is thrilled ("Real sirens! I couldn't afford real sirens!"), Chet is horrified ("Kid, they've got real guns. In my films the guns were bananas painted black."). If the Sovereigns are still near when heat is lost, they give up (scripter: their drivers' `to` is `trey`; when heat drops, `leave` / `vanish` them or let them be lost; see DECISIONS).
9. `goto: 'wonder_wharf'`, vehicle `trey`, `stop: true`, objective "Back to base camp". On the way, a gs_staff (lines only, on the loudhailer as a Sovereign peels off): "We'd love your feedback on tonight's—" Jay: "I've got a glovebox full."
10. `music: 'hope'`. `scene` at `wonder_wharf`, cast fenella, chet, jay. Fenella: **"CUT!"** (She says it now, long after the action.) "Trey was supposed to die in this scene too." Jay: "He's stubborn." Chet hands Jay a paper cup of tea from catering "for the nerves. Mine. You hold it, I'm shaking." End on the big wheel turning behind them.

**Scripter notes:**
- *Earlier flags:* Chet's lines (step 4). If `d17_contraband` is done, the Strand has a Guest Services Welcome Check (`strand_checkpoint`) the Sovereigns come from; otherwise they come from the Palace forecourt (same place id, no line about it).
- *Retry:* `checkpoint` at step 5; a failed chase restarts with Vince "back in the car, having a sandwich".
- *Laugh:* the Guest Services loudhailer politely asking a film chase to stop, and Chet's banana guns. *Banter on the drive back:* Jay and Fenella on why she makes films for Castellane ("He pays. Everybody pays somebody. The trick is to make something good while they're not looking.").

## dst3_rain_machine: The Rain Machine

- **id** `dst3_rain_machine` · **title** The Rain Machine · **giver** `fenella` · **start** `airport_fire_station` · **requires** `dst2_night_shoot` · **time** 13 · **estMinutes** 10
- **reward** `{ money: 2000 }` · **failIf** `['wrecked:crash_tender']`
- **summary** "The rain machine broke. The light goes in five minutes. Fenella has had an idea."
- **Core:** fire-engine delivery (`deliver: 'crash_tender', to: 'sandpiper_beach'` against a clock, then a `wait` while it "rains"). **Cast:** jay, fenella (phone, then on the beach), chet (phone, then in a raincoat), gully, extras.

1. `spawnCar` `crash_tender` at `airport_fire_station`, color 0xc8202a. `music: 'off'`.
2. `phone: 'fenella'` (Jay is at the fire station because she asked him to meet her "near something red and big"). Fenella: the rain machine has died, the light on Sandpiper Beach goes in five minutes, and the scene is "Rex in the storm, the night before the race, a biblical storm". **(keep)** Fenella: "Borrow one. Nobody's on fire at the airport today, I checked." Jay: "You checked." Fenella: "I asked a man in a hat." Jay, looking at the tender: "(to it) You're very big."
3. `getIn: 'crash_tender'`, objective "Borrow a crash tender". `heat: 2`, `music: 'action'`, `checkpoint: true`. Caption or radio line (scripter: a `say` with `caption`): "(Airport radio) Tender Two is... leaving? Tender Two, who's driving Tender Two?"
4. `loseHeat: true`, objective "Lose the police before the beach, or they'll stop the shoot (siren on L)". Banter: `phone: 'chet'` during it: "Kid, is that you on the news in a fire engine? Are you going over thirty in it?" Jay: "Sixty." Chet: "(a long breath) I need to sit down. (beat) I am sitting down. I need to sit down more."
5. `deliver: 'crash_tender', to: 'sandpiper_beach', timeLimit: 240`, objective "Get the rain to Sandpiper Beach before the light goes". (The fiction's "five minutes" is the whole job; the timer starts once the heat is lost; see DECISIONS.) Banter (Fenella on the phone): what the scene is; she reads the script's stage direction "A storm the like of which Southbay had never seen", then: "We have a hose. We have a very big hose." On the coast road a `camera` is not needed.
6. `spawn` on the beach: gully at `sandpiper_beach` (idle), chet (idle), fenella (idle), 6 to 8 generic extras in raincoats (idle, `count`), and `spawnCar` `trey` parked on the sand at `sandpiper_beach` (it has a pyro rig on its roof: "lightning strikes Trey" is the end of the scene).
7. `scene` at `sandpiper_beach`, cast fenella, chet, gully, jay. Gully blowing his whistle at the fire engine. **(keep)** Fenella: "It's for the movie." **(keep)** Gully: "It's a fire engine." Fenella: "It's a cloud." Gully: "No vehicles on the beach. No rain on the beach." Fenella: "Rain's natural." Gully: "Not out of a lorry it's not."
8. `wait: 20`, objective "Make it rain on Chet (hold the water cannon on the actors)". `say` over the wait: Fenella on the megaphone: "More rain! Biblical! I said biblical, not drizzle!"; Chet, drenched, delivering Rex's storm speech to a line of wet extras ("Tomorrow we race, and tomorrow we... (spits out water) ...win, apparently"); Gully whistling at the rain. Then caption: "(Lightning cue. Gary presses the button. The pyro on Trey's roof is soaked through. It fizzles. Trey does not explode.)"
9. `music: 'hope'`. `scene` at `sandpiper_beach`, cast fenella, chet, jay, gully. Fenella, quietly: "Trey was supposed to die in this scene." Jay: "It's raining." Fenella: "You did that." Gully confiscates nothing, but writes the fire engine a ticket and tucks it under the wiper.
10. `if: 'dlc_chet_told'` then: Chet, wringing out Rex's jacket: "In my version Rex stands in the rain and admits it. Fenella cut the page. I've got it in my pocket. (beat) It's wet now." `else`: Chet: "Kid. Take the fire engine back before somebody needs it. I couldn't live with myself. I could, but it'd be a smaller life."
11. Fenella: "Leave it there. Somebody will collect it. Somebody always does." (Jay walks off; the tender stays. Small plant for d26, where Jay takes a tender again: no line in d26 depends on this.)

**Scripter notes:**
- *Earlier flags:* `dlc_chet_told` (step 10). If `d26_blue_lights` is done, Jay, getting in: "(to the tender) We've met." (He took one in d26.)
- *Retry:* `checkpoint` at step 3; a fail by time puts Fenella on the phone: "The light's gone. Tomorrow. Same fire engine."
- *Banter while losing the police:* Chet, then Fenella fighting over the phone line ("Give me the phone, Chet." "He's MY stunt double." "He's the film's stunt double." "I'm the film!").

## dst4_the_big_jump: The Big Jump

- **id** `dst4_the_big_jump` · **title** The Big Jump · **giver** `chet` · **start** `mariner_stadium` · **requires** `dst3_rain_machine` · **time** 19.5 · **estMinutes** 11
- **reward** `{ money: 3000 }` · **failIf** `['wrecked:trey', 'dead:chet']` · completion flag: the job id `dst4_the_big_jump` (bible 7: in d30 Fenella's crew film the finale; the endings' last caption is "a film by Fenella Moss")
- **summary** "Six buses, one Drifter, forty thousand free extras, and Chet Valiant in the passenger seat."
- **Core:** stunt jump plus a timed run. **Cast:** jay, chet (rides along), fenella.

1. `spawnCar` `trey` at `bowl_car_park`. `music: 'off'`.
2. `camera: 'mariner_stadium'`, 4 s, caption "Mariner Stadium. Half-time. The sun has eleven minutes left in it." `camera: 'stadium_bus_ramp'` [NEW], 3 s: six buses in a row in the car park, a ramp at one end, a landing ramp at the other.
3. `scene` at `mariner_stadium`, cast fenella, chet, jay. Fenella: half-time at the Mariners, "forty thousand people already here, and they're free extras"; the stunt: Trey over the buses, through the marathon gate, round the stadium apron and across the line before the sun goes. Chet, holding a helmet he has clearly bought himself: "I'm coming with you. For research." Fenella: "Your insurers will kill me." Chet: "My mother will kill you first. Then my insurers. In that order. It's in the contract."
4. `if: 'dlc_chet_told'` then: Chet: "I've rewritten the last scene. Rex loses. Fenella hasn't read it yet." Fenella: "I've read it. (beat) It's better." `else`: nested `if: 'dlc_chet_kept'` then: Chet: "Fenella, why does Rex never look at the trophy? In any scene? I'm asking for Rex." Fenella: "Get in the car, Chet." `else`: Chet: "Thirty-one years in pictures, kid. Four racing drivers, two pilots and a submarine. Never been over thirty in any of them. Not even the submarine."
5. `join: ['chet']`. `getIn: 'trey'`, objective "Get in Trey (Chet's coming)". `music: 'action'`, `checkpoint: true`.
6. `goto: 'stadium_bus_ramp'`, vehicle `trey`, radius 12, objective "Jump the buses". `say`: Chet, as the speedo passes thirty for the first time in his life: "THIRTY-ONE. Thirty-one. I'm fine. I'm fine. THIRTY-FIVE." (retry: if Trey doesn't clear and lands short, the checkpoint is the landing ramp's far side, so the player must clear it to pass.)
7. `slowmo: 2`, `say`: Chet, in the air over the buses: "I CAN SEE MY WHOLE CAREER!" Jay: "Seatbelt."
8. `timer: 90`, then `race: { checkpoints: ['stadium_gate' [NEW], 'stadium_apron_north' [NEW], 'stadium_apron_south' [NEW], 'bowl_car_park'], rivals: [], laps: 1 }`, objective "Through the gate and round the stadium before the sun goes". Banter: Chet screams the whole way, in sentences ("This is what they FEEL like? ALL OF THEM?"), Fenella on the radio ("Keep screaming, Chet, it's gold"), the crowd noise as they pass the stand.
9. `goto: 'bowl_car_park'`, `stop: true`, radius 8, objective "Stop on Fenella's mark". `leave: ['chet']`.
10. `music: 'triumph'`. `scene` at `bowl_car_park`, cast chet, fenella, jay. Chet gets out, shaking, holds the roof, and says one word: **(keep)** "Again." Fenella: "That's five scenes Trey was meant to die in." Jay: "He's got a good agent." Fenella, to Jay, quietly, putting the megaphone down: **(keep)** "Whatever it is you're really doing round here, Mercer. One day I'm filming that." (paid off in d30).
11. `camera: 'bowl_car_park'`, 4 s, on Trey parked alone. Caption: "(Parked, empty, and in no danger at all, Trey quietly explodes.)" (See DECISIONS for how.) Chet, watching the smoke: **(keep)** "...Loved the first one." `music: 'off'`.

**Scripter notes:**
- *Earlier flags:* Chet's lines (step 4). If `d30_the_last_lap` is already done, Fenella's step 10 line becomes: "I filmed it, you know. The real thing. From the commentary box. It's the best thing I've ever shot." (She keeps the promise in d30 either way.)
- *Retry:* `checkpoint` at step 5; missing the jump: Chet: "Again? (pause) AGAIN. Yes. Again."
- *Laugh:* Chet's screaming, sentence after sentence, then "Again."; Trey exploding by itself, safe, at the end. This is the chain's finale: `music: 'triumph'` lands on "Again", `music: 'off'` on the explosion.

---
# MARKS OUT OF TEN (`dside_flying`)

`D.side.push({ id: 'dside_flying', title: 'Marks Out of Ten', giver: 'hob', unlockAfter: 'd18_ground_school', missions: [...] })`. Hob's flying school. Every landing gets a mark, out loud, from Hob (in the right seat or on the radio, which is the `phone` step: Hob calls it "the radio"). The marks never reach ten until dsf4. Jay is alone in the aircraft in dsf1 to dsf3 (Hob on the radio from the hangar with a kettle and a stopwatch); Hob rides in dsf4. **Reads:** `d23_odie_wren` (one optional line in dsf3), `dlc_blog_on` / `dlc_blog_off` (dsf3, always set by now). Speakers: `jay hob gully milo prof_quill toby tower` (`tower`, "Vicehaven Tower", is a new minor speaker: see DECISIONS) `caption`.

## dsf1_banner_day: Banner Day

- **id** `dsf1_banner_day` · **title** Banner Day · **giver** `hob` · **start** `field_apron` · **requires** none (chain opens after `d18_ground_school`) · **time** 11 · **estMinutes** 9
- **reward** `{ money: 1500 }` · **failIf** `['wrecked:hob_skylark']`
- **summary** "The Sandpiper Prawn Shack has paid for a banner. In prawns."
- **Core:** low-level flying (Skylark, `fly` rings at 40 to 60 m along the beach, then `land`). **Cast:** jay, hob (scene, then radio), gully (radio).

1. `spawnCar` `hob_skylark` at `field_apron`, color 0xf2c500. `music: 'off'`.
2. `scene` at `field_apron`, cast hob, jay. Hob with a rolled banner and a coil of tow rope, the hangar kettle steaming behind him. The club's new sponsor is the Sandpiper Prawn Shack. Jay: "What's the banner say?" **(keep)** Hob: "NOW WITH FEWER BONES." Jay: "Fewer than what?" Hob: "Didn't ask. They paid in prawns. Freezer's full." The brief: low and slow along Sandpiper Beach so the sunbathers can read it. Hob: "Low means low. Not low like 'into the sea'. The sea's the one bit of the bay I can't get my deposit back on."
3. `getIn: 'hob_skylark'`, objective "Get in the Skylark (the banner's hooked on)". `music: 'hope'`.
4. `fly: 'causeway_south', height: 90, radius: 60`, objective "Cross the bay to Sandpiper Beach". Banter, `phone: 'hob'`: the radio etiquette ("Say 'over' when you're done talking. Over." "Over." "You don't have to say it after 'over'. Over."); the prawns; Hob's opinion of banners ("A banner is a sail you're not allowed to use. Respect the banner.").
5. `fly: 'sandpiper_beach', height: 50, radius: 50`, objective "Down the beach, low". `say`: sunbathers waving (caption: "(Below, a whole beach looks up and reads it.)").
6. `fly: 'lifeguard_tower_7', height: 45, radius: 45`. `phone: 'gully'` cuts in on the beach channel: **(keep)** Gully: "Sandpiper Tower Seven to the yellow plane. You're too low. You're too loud. And you're upside down." Jay: "I'm not upside down." Gully: "Your banner is. It says SENOB REWEF HTIW WON." Hob, on the radio: "That's not your fault." This is the laugh, landed again at the end.
7. `fly: 'skate_park', height: 50, radius: 45`. `say`: the skaters cheer the banner; Gully blows his whistle at the plane, audible over the radio ("You can't whistle at a plane." "I can whistle at anything on my beach.").
8. `fly: 'sandpiper_promenade', height: 55, radius: 45`, objective "Along the promenade, then home". Caption: "(The Prawn Shack's owner, on the promenade, salutes it with a prawn.)"
9. `land: 'paloma_field', radius: 40`, objective "Back across the bay and land at Paloma Field". Banter on the way home: Hob on the club ("Four members. All retired. They mostly drink tea and argue about clouds."); Jay asks whether anyone ever gets a ten. Hob: "Once. Back in... no. Never. I was thinking of a dream I had."
10. `scene` at `field_apron`, cast hob, jay. Hob with the clipboard, looking at the banner now in a heap on the apron. **(keep)** Hob: "Five. The banner was upside down. That's not your fault. (beat) That's not not your fault."
11. `text` from `gully`: "Your banner said HTIW WON all morning. Kids think it's a code. My supervisor took my whistle. Thanks for nothing. Gully (Tower 7)".

**Scripter notes:**
- *Earlier flags:* none needed. If `dsr1_oval_sprint` is done, Jay: "The prawn shack sponsors Pip's car too." Hob: "They sponsor everything. They've got more prawns than sense."
- *Retry:* a crash fails the job (`wrecked:hob_skylark`); missing a ring keeps it active (the engine's `fly` waits), so the player circles back. Hob: "Go round again. The sea's not going anywhere."
- *Banter themes:* radio etiquette ("over"), banners, the prawns. Gully's two calls carry the laugh; Hob's mark repeats it.

## dsf2_chimney_pots: Chimney Pots

- **id** `dsf2_chimney_pots` · **title** Chimney Pots · **giver** `hob` · **start** `field_apron` · **requires** `dsf1_banner_day` · **time** 15 · **estMinutes** 10
- **reward** `{ money: 2000 }` · **failIf** `['wrecked:hob_skylark']`
- **summary** "Hob's record round the Ironside chimneys has stood for twenty years. Hob would like it to stand for twenty more."
- **Core:** air race against the clock (Skylark, a chain of `fly` rings with a `timer` on each sector). **Cast:** jay, hob (scene, then radio with a stopwatch).

1. `spawnCar` `hob_skylark` at `field_apron`. `music: 'off'`.
2. `scene` at `hob_hangar`, cast hob, jay. On the hangar wall a photo of a much younger Hob beside the Skylark, and a hand-painted board: CHIMNEY POTS RECORD, H. FINNEGAN. Hob explains the course: in over the scrapyard, through the gap between the power station's two big chimneys, low over the rail yard, and along under-ish the refinery pipe racks "at a height I'll call brave". Hob: "When I set it there were two chimneys. They built a third one in my way. I took it personally. I wrote to the council." Jay: "What did they say?" Hob: "They said it's a power station, Mr Finnegan."
3. Hob, not quite casually: "You don't have to beat it. Nobody has to beat anything. It's just a board." (He has polished the board.)
4. `getIn: 'hob_skylark'`. `fly: 'ironside_scrapyard', height: 80, radius: 60`, objective "Fly to Ironside. The clock starts at the scrapyard". Banter (long flight across the bay and the city, `phone: 'hob'`): how Hob learned to fly (crop-spraying, "mostly on the crops"); why Castellane wants the airfield ("He wants a helipad for his hotels. I want a field for my aeroplanes. Only one of us has forty hotels."); Jay admits planes are growing on him ("It's a car with one more way to crash." "Now you're listening.").
5. `music: 'action'`, `checkpoint: true`. Sector 1: `timer: 35`, `fly: 'power_chimney_gap' [NEW], height: 70, radius: 25`, objective "Between the chimneys". Hob reads splits off his stopwatch on the radio: "Sector one. Up on me. Don't get excited."
6. Sector 2: `timer: 30`, `fly: 'ironside_railyard', height: 35, radius: 35`, objective "Low over the rail yard". `say`: a freight driver waves (caption). Hob: "Level. Level. That's two-tenths down on me. (beat) Up. Two-tenths UP. Oh, for crying out loud."
7. Sector 3: `timer: 30`, `fly: 'ironside_pipes', height: 25, radius: 30`, objective "Along the pipe racks, low". `slowmo: 2` on passing the rack (caption: "(Close enough to read the pipe labels.)").
8. Hob on the radio, after a long silence: "...Three minutes four. That's a record. That's the record." Jay: "Sorry." Hob: "Don't be sorry. Be on the ground. Bring my aeroplane home." `music: 'hope'`.
9. `land: 'paloma_field', radius: 40`, objective "Home to Paloma Field". Banter on the way home: Hob, trying to be gracious and not managing it for long ("It's a good time. It's a very good time. Was there a tailwind? There was probably a tailwind.").
10. `scene` at `hob_hangar`, cast hob, jay. Hob with a paintbrush, painting out his own name on the board and painting in J. MERCER, slowly. **(keep)** Hob: "Eight. I'm not upset. I'm a grown man." (He paints the R very hard.) Jay: "You can keep the board up with your name too." Hob: "I'll put mine underneath. Second place. Where I can see it every day and grow as a person."

**Scripter notes:**
- *Earlier flags:* none. If `d16_four_out_of_ten` is still the only mark Jay knows (always true here), Hob: "From four to this. A man could get dizzy. I'm dizzy."
- *Retry:* failing any sector timer restarts at step 5 (`checkpoint`). Hob, every restart, slightly too pleased: "Shame. Again."
- *Laugh:* Hob's grace collapsing ("Was there a tailwind?") and him painting the R very hard.

## dsf3_doughnut_drop: Doughnut Drop

- **id** `dsf3_doughnut_drop` · **title** Doughnut Drop · **giver** `hob` · **start** `hob_hangar` · **requires** `dsf2_chimney_pots` · **time** 8 · **estMinutes** 10
- **reward** `{ money: 2000 }` · **failIf** `['wrecked:club_sparrow']`
- **summary** "Tuesday. The Skylark's in for its check. The doughnuts are going by helicopter."
- **Core:** helicopter deliveries (Sparrow, three `land` steps). **Cast:** jay, hob (scene, then radio), milo and prof_quill (at Halcyon, on the ground at the end; Milo is never near anything dangerous here: it's a doughnut).

1. `spawnCar` `club_sparrow` at `field_apron`, color 0xf2f2ee. `music: 'off'`.
2. `scene` at `hob_hangar`, cast hob, jay. Doughnut boxes stacked to Hob's chin, the Skylark with its cowling off. Hob: "Tuesday. The doughnuts go out on Tuesday. The war doesn't stop because a magneto's tired." Three drops: the night nurses at the private clinic, the astronomers at the observatory ("up all night looking at things that aren't there any more; they need jam"), and "a special order across the bay, Halcyon sports field, a Professor Quill, twelve, with a note that says 'one for the boy, he's never had a doughnut delivered by air, please make it memorable'."
3. `if: 'd23_odie_wren'` then: Hob: "And a dozen jam for the fort. She says the helicopter's vulgar. She'll eat them." `else`: Hob: "And twelve jam for the lighthouse lady. I'll do those myself. She doesn't like strangers." (No more than that pre-d23.)
4. `getIn: 'club_sparrow'`, objective "Get in the club's Sparrow". `music: 'hope'`.
5. `land: 'clinic_helipad' [NEW], radius: 15`, objective "Drop 1: the clinic's rooftop helipad". Banter `phone: 'hob'`: the island bakery war ("Castellane's got the croissants. I've got the doughnuts. That's the war, son. That's the whole war." if not already heard in d17, else a new line: "Croissants are just doughnuts that gave up."). On landing, caption: "(Two nurses in scrubs take the box like it's a transplant.)" **(keep)** Hob: "That was a landing in the legal sense. Six."
6. `land: 'observatory_lawn' [NEW], radius: 25`, objective "Drop 2: the observatory lawn". `say`: an astronomer on the radio (lines given to Hob relaying: "They say you scared a comet. They're joking. They don't joke. They might not be joking."). On landing: Hob: "Seven. Don't tell anyone, they'll think I've gone soft." (callback to d18; if the scripter wants to avoid the repeat, "Seven. Tidy. Suspiciously tidy.").
7. `land: 'halcyon_field', radius: 30`, objective "Drop 3: across the bay to the Halcyon sports field". Banter on the long hop: `phone: 'milo'`, Milo on the field with his grandad, opening with a fact: "Did you know a Sparrow can carry four hundred doughnuts? I worked it out. Probably." Then: "I can see you. You're a dot. Now you're a bigger dot. Grandad's waving his whole jacket."
8. `spawn` milo and prof_quill at `halcyon_field` (idle, at the edge, well away from the landing circle). On landing, Milo grades it before Hob can: "Nine!" Hob, on the radio: "He's not qualified. Five." Milo: "I'm a very strict nine." Hob: "Five and a half. Final offer." (the disputed mark; this is the laugh).
9. `scene` at `halcyon_field`, cast milo, prof_quill, jay. Milo gets the first jam doughnut ever delivered to him by air; holds it up like a trophy. Quill, beaming at the helicopter: "My dear fellow, may I? Helicopters don't corner." Jay: "They do a bit." Quill: "Not the way cars corner. Cars corner with malice."
10. `if: 'dlc_blog_on'` then: Milo: "I'm posting this. Not the location. Just the doughnut. (beat) Mostly the doughnut." `else`: Milo: "I'm drawing it on the card on my wall. A doughnut with a helicopter. It's the best thing on the wall." Jay: "Better than the scoreboard?" Milo: "...Different."
11. Jay, getting back in: "Hob wants his helicopter back." Milo: "Jay? (beat) Thanks." Jay, to the Sparrow, lifting off: "Don't tell anyone." End `music: 'off'`. (The job ends on the field; the Sparrow is Jay's to fly back or leave: no step needed.)

**Scripter notes:**
- *Earlier flags:* `d23_odie_wren` (step 3), `dlc_blog_on`/`dlc_blog_off` (step 10).
- *Retry:* a crash fails it; a missed landing (bounced out of the radius) just waits for a clean one. Hob on bounces: "Doughnuts don't like bouncing. Neither do nurses."
- *Laugh:* the disputed mark at Halcyon (Milo's "very strict nine"). *Callback:* Quill fine in aircraft ("Planes don't corner").

## dsf4_check_ride: Check Ride

- **id** `dsf4_check_ride` · **title** Check Ride · **giver** `hob` · **start** `field_apron` · **requires** `dsf3_doughnut_drop` · **time** 17 · **estMinutes** 11
- **reward** `{ money: 3000 }` plus the second club Skylark at Paloma Field (see DECISIONS) · **failIf** `['wrecked:hob_skylark', 'dead:hob']` · completion flag: the job id `dsf4_check_ride` (bible 7: in d30 Hob tows SHE WON over the Speedway; in the endings "Ten. Again.")
- **summary** "Hob's check ride: a landing at the big airport, between the airliners, and home in a crosswind."
- **Core:** cross-country flight with a landing at Vicehaven International. **Cast:** jay, hob (right seat), tower (radio), milo (phone), toby (phone).

1. `spawnCar` `hob_skylark` at `field_apron`. `music: 'off'`.
2. `scene` at `field_apron`, cast hob, jay. Hob in a tie (the club tie, green, with a small embroidered doughnut). "Check ride. I sit there, I say nothing, I write things down. You do everything." The route: out over the bridge to the big airport, a full-stop landing on the real runway, taxi off and on, then home past the Halcyon clock tower and the Coral Marina light, and a landing here, "in whatever the wind feels like". Hob: "Forty years I've been instructing. I've never given a ten." Jay: "Why not?" Hob: "Nobody's earned one. Also I'm mean. Both."
3. `join: ['hob']`. `getIn: 'hob_skylark'`, objective "Get in. Hob's in the right seat". `music: 'hope'`.
4. `fly: 'bridge_island_end', height: 110, radius: 60`, objective "Out along the Paloma Bridge". Hob, true to his word, says nothing; then: "I'm saying nothing. Note how much nothing I'm saying."
5. `fly: 'bridge_mainland', height: 120, radius: 60`. `fly: 'grand_avenue', height: 150, radius: 70`, objective "North up Grand Avenue to the airport". Banter: Hob's forty years (what makes a ten: "A ten is when I forget I'm in an aeroplane. I've never forgotten. I've come close. Once a man landed so softly I thought we'd stopped for tea."); Jay on Nana Lu's car-park lessons ("Ten and two." Hob: "Sensible woman. Planes are the same. Ten and two on the yoke and keep your heart out of it.").
6. `phone: 'tower'`: Hob takes the radio: "Vicehaven Tower, Skylark from Paloma, full-stop landing, please, and if you've got a moment, a cup of tea." **(keep)** Tower: "Skylark, there's an Albatross four miles behind you. Please hurry. Please, please hurry."
7. `land: 'vicehaven_international', radius: 60`, objective "Land on the big runway (there's an airliner behind you)". `say` on rollout: Tower: "Skylark, vacate the runway, any exit, any exit at all."
8. `goto: 'airport_apron'`, vehicle `hob_skylark`, `stop: true`, radius 20, objective "Taxi off onto the apron". Caption: "(A two-hundred-seat Albatross lands behind them. Its passengers press their faces to the windows to look at the little yellow plane.)" Hob writes something. Jay: "What did you write?" Hob: "'Taxi.' It's a thing you did. I wrote it down."
9. `fly: 'halcyon_clocktower', height: 90, radius: 50`, objective "Take off again and head for the Halcyon clock tower". Tower: "Skylark, cleared to... you're already going. Fine. Goodbye. Lovely plane." `phone: 'milo'` as they pass: "I can see you from the quad! The clock's still stopped at fourteen minutes past eleven, so technically you're very early." Milo, to Hob: "Is he going to get a ten?" Hob: "No comment. Over."
10. `fly: 'marina_lighthouse', height: 80, radius: 50`, objective "Over the Coral Marina light". `phone: 'toby'`: "Son. You're on my light. Waggle your wings if you're all right." Jay waggles (lines only). Toby: "Hell's bells. He waggled." Hob: "I didn't teach him that." Toby: "I did. Just now."
11. `music: 'tension'`. `land: 'paloma_field', radius: 30`, objective "Home to Paloma Field. There's a crosswind". `say` on approach: Hob, quietly, for the first time saying anything useful: "Crosswind from the left. Don't fight it. Dance with it. Lean in. Wing down. Now straighten. (beat) Now."
12. `music: 'triumph'`. `leave: ['hob']`. `scene` at `field_apron`, cast hob, jay. Hob climbs out. He looks at the windsock for a long time. He looks at the clipboard. He takes the pencil from behind his ear. **(keep)** Hob: "Ten." (beat) Jay: "Say that again." Hob: "No. Once. Forty years." He tears the sheet off and gives it to Jay. Then a set of keys on a doughnut keyring: "Second club Skylark. It's yours on Tuesdays." Jay: "What about the other days?" Hob: "Other days it's mine. Tuesdays it's yours. Doughnuts are Tuesdays. You see where this is going."
13. `if: 'd23_odie_wren'` then: Hob, last line, looking across the island: "Somebody up at the fort was watching through a telescope. She says nine. I've told her she's not qualified either." `else`: Hob: "Now go away before I cry on the clipboard. It's the only one I've got."

**Scripter notes:**
- *Earlier flags:* `d23_odie_wren` (step 13). If `d16_four_out_of_ten` (always done), Hob at step 2: "You landed an airliner on my runway. Today we find out if that was a fluke." Jay: "It was a fluke." Hob: "I know. That's why we're doing this."
- *Retry:* `checkpoint` at step 3 and again before step 11 (the crosswind landing is the one players will retry).
- *Laugh:* the tower begging ("Please, please hurry"), Hob writing "Taxi", Toby's waggle. The moment that lands is the ten: give it silence (`wait: 2` before it), then `music: 'triumph'`.

---
# SUMMER SERIES (`dside_speedway`)

`D.side.push({ id: 'dside_speedway', title: 'Summer Series', giver: 'pip', unlockAfter: 'd10_heritage_run', missions: [...] })`. Pip's racing team, Marlow Racing: one white Drifter (`pip_car`) with embarrassing tiny sponsor stickers (a wart clinic, a prawn shack), a folding chair for a pit wall, and a radio. Pip's racing licence was suspended by the Castellane-run stewards alongside her road ban ("conduct unbecoming": she called the chief steward a lamppost), so Jay drives to keep the team's points while she runs the radio. Monty calls every race with a new wrong name for Jay (gentle and silly; never right: the right name is d30's). Teddy Castellane is the rival: talented, spoilt, not a villain, and in this chain he finds out he's been cheating without knowing. **Reads:** `d23_odie_wren` (one optional line in dsr4), `dlc_blog_on` / `dlc_blog_off` (dsr2). Speakers: `jay pip teddy monty milo plum marshal gs_staff caption`.

**Race layout for the oval** (shared with d10 and d30; places first asked for in `beats-act2.md`): `checkpoints: ['speedway_turn1', 'speedway_back_straight', 'speedway_turn3', 'speedway_grid']`, cars spawned on `speedway_grid`. Rivals: `{ char: 'teddy', car: 'zephyr' }` (gold 0xd29a1c) plus works and privateer cars as listed.

## dsr1_oval_sprint: Oval Sprint

- **id** `dsr1_oval_sprint` · **title** Oval Sprint · **giver** `pip` · **start** `speedway_pits` · **requires** none (chain opens after `d10_heritage_run`) · **time** 16 · **estMinutes** 9
- **reward** `{ money: 2000 }` · **failIf** `['wrecked:pip_car']` (losing the race fails it, as the engine's `race` does)
- **summary** "Round one of the Summer Series. Marlow Racing has one car, one driver who isn't allowed to drive, and one who is."
- **Core:** Speedway race (5 laps, 5 rivals). **Cast:** jay, pip (pits, then radio), teddy, monty (PA).

1. `spawnCar` `pip_car` at `speedway_grid`, color 0xf1f0ea. `music: 'off'`.
2. `camera: 'southbay_speedway'`, 4 s, caption "Southbay Speedway. The Summer Series, round one."
3. `scene` at `speedway_pits`, cast pip, teddy, jay. Pip with a clipboard she borrowed off nobody, explaining the suspension: "Conduct unbecoming. I called the chief steward a lamppost." Jay: "Is he a lamppost?" Pip: "He's tall, he's grey and he does nothing all night. You tell me." Teddy strolls past in gold-and-black overalls, looking at the Drifter's stickers: "Nice stickers. Is the wart clinic your title sponsor?" **(keep-ish)** Pip: "They're the only sponsor who paid in money." Teddy: "Who's this? Your chauffeur?" Jay: "I drive." Teddy: "So do I." Jay: "We'll see."
4. Pip, quieter, when Teddy has gone: if the team scores nothing in round one it loses its pit garage to "a Castellane hospitality tent". "I'm not losing Gran's track to a tent with a buffet in it." (Pre-d23 "Gran's track" is the legend; fine.)
5. `spawnCar` `castellane_racer` ×2 at `speedway_grid` (Teddy's and a works team-mate's), `privateer1..3` (`drifter` blue, `vireo` green, a battered `ironclad` brown) at `speedway_grid`. `getIn: 'pip_car'`, objective "Get in the Drifter. Grid slot six". `music: 'action'`, `checkpoint: true`.
6. `race: { checkpoints: [oval], rivals: [teddy zephyr, works zephyr, three privateers], laps: 5 }`, objective "Win the sprint: five laps". `say` during the race, alternating Pip on the radio and Monty on the PA: **(keep)** Monty: "And it's... Jim Mercy for Marlow Racing!" Pip: "Jim? Who's Jim?" Jay: "Leave it." Pip rates his lines ("Turn one, lovely. Turn three, a seven. You lifted. Don't lift. Lifting is for furniture."); Monty: "Teddy Castellane in the gold, and Jim Mercy in the... is that a prawn on the bonnet?"; last lap Pip, losing her cool: "GO GO GO GO. Sorry. Go."
7. `music: 'triumph'`. `scene` at `speedway_pits`, cast pip, teddy, monty, jay. Pip: "That's a seven. That's an eight. (beat) Fine. Nine." Teddy, pulling off his helmet, sour but fair: "Where did you find him?" Pip: "Text message." Monty comes down from the box with a headset round his neck to shake Jay's hand: "Jim! Great drive, Jim." Jay: "Jay." Monty: "That's what I said." Pip: "We keep the garage. (beat) Next round's on the campus. At night. On the streets." Jay: "That sounds illegal." Pip: "It's sanctioned. I think. It's got a banner."

**Scripter notes:**
- *Earlier flags:* none needed. If `dsf1_banner_day` is done, Monty: "Marlow Racing, sponsored by the Sandpiper Prawn Shack, NOW WITH FEWER BONES, I'm told to say that."
- *Retry:* a lost race fails it; restart at step 5 (`checkpoint`). Pip on a restart: "That was practice. That was a practice race. Nobody saw. Everybody saw."
- *Banter themes on the grid walk:* Pip's suspension (the lamppost), Teddy ("He's not bad. He's just never been told no. I've been told no my whole life. I'm great at it.").

## dsr2_campus_sprint: Campus Sprint

- **id** `dsr2_campus_sprint` · **title** Campus Sprint · **giver** `pip` · **start** `halcyon_quad` · **requires** `dsr1_oval_sprint` · **time** 21.5 · **estMinutes** 10
- **reward** `{ money: 2000 }` · **failIf** `['wrecked:pip_car']`
- **summary** "The Summer Series street round, on closed roads round Halcyon at night. Officer Plum was not consulted."
- **Core:** street race (2 laps round the campus). **Cast:** jay, pip (radio from a folding chair), teddy, milo (on the library steps with a homemade flag), plum (on his bicycle), monty (PA from a borrowed ice-cream van).

1. `spawnCar` `pip_car` at `halcyon_quad`. `spawnCar` `castellane_racer` ×2 and `privateer1..3` at `halcyon_quad`. `music: 'off'`.
2. `camera: 'halcyon_clocktower'`, 4 s, caption "Halcyon University. The Summer Series street round. 9:30 p.m." Then `camera: 'halcyon_library'`, 3 s: Milo on the library steps with a big home-made MARLOW RACING flag.
3. `spawn` milo at `halcyon_library` (idle; on the steps, behind the barrier, nowhere near the racing line) and plum at `halcyon_quad` (`char: 'plum'`, non-hostile, `behavior: 'patrol'`, no faction heat: see DECISIONS).
4. `scene` at `halcyon_quad`, cast pip, milo, jay. The official race banner over the start reads HALCYON STREET SPRINT'S. Milo has corrected it with gaffer tape. Milo: "Did you know there are four hundred and twelve misplaced apostrophes on this campus? Now there are four hundred and eleven." Milo's own flag says MARLOW RACING, spelled right, "unlike some people's banners". Pip: "Is that glitter?" Milo: "It's not glitter. It's ambition."
5. `if: 'dlc_blog_on'` then: Milo: "I'm live-posting the race. Not the Firecrest stuff. Just the race. People like a race." `else`: Milo: "I'm keeping lap times on a card. On paper. Like a professional. Or a Victorian."
6. Officer Plum rides up on his bicycle, torch on although it's lit: "Nobody told me there was a race on my quad." Pip: "There was a letter." Plum: "I don't read letters. I read faces. (to Jay) I've seen your face." Jay: "I've got one of those faces." Plum: "You've got a face I've seen at night, near a clock." (d05 callback: Plum is suspicious, can't place him.)
7. `getIn: 'pip_car'`. `music: 'action'`, `checkpoint: true`.
8. `race: { checkpoints: ['campus_strip', 'halcyon_library', 'halcyon_clocktower', 'quill_study', 'halcyon_quad'], rivals: [teddy zephyr, works zephyr, three privateers], laps: 2 }`, objective "Win the street sprint: two laps, round the clock tower twice". `say`: Monty from the ice-cream van PA (the van plays its jingle every time he keys the mic): "And it's Jem Mersey for Marlow Racing! (jingle) I don't know how to turn that off." Pip on the radio: "The strip's bumpy, the library corner's tight, don't hit the boy." Jay: "I wasn't going to hit the boy." Milo, over Pip's radio (she holds it up for him): "Hello! I'm the boy!" Lap 2: Teddy cuts a corner across the quad lawn; Plum gives chase on his bicycle, to the wrong car: Monty: "Officer Plum of campus security has joined the race! He's in... he's in last place, but he's gaining on a privateer who did nothing wrong!"
9. `music: 'triumph'`. `scene` at `halcyon_quad`, cast pip, milo, plum, teddy, jay. Plum, out of breath, to all of them: "Which one of you was on my lawn?" Everybody points at Teddy. Teddy: "It was a racing line." Plum: "It was a lawn." He writes Teddy a ticket for "conduct unbecoming a lawn". Milo, to Jay: "Did you know you went round the clock tower faster than the clock does? (beat) It's stopped. Since you. Still counts." Pip, as Milo goes in: "And mind the road." Milo: "I'm walking." Pip: "Mind it anyway. I don't know why I say that."

**Scripter notes:**
- *Earlier flags:* `dlc_blog_on`/`dlc_blog_off` (step 5). If `d05_clockwork` is done (always: the chain opens after d10), Plum's step 6 suspicion is the callback.
- *Retry:* restart at step 7 (`checkpoint`).
- *Laugh:* the ice-cream van jingle; Plum chasing the innocent privateer; everybody pointing at Teddy. Milo's apostrophe count is the warm one.

## dsr3_dirty_air: Dirty Air

- **id** `dsr3_dirty_air` · **title** Dirty Air · **giver** `pip` · **start** `speedway_pits` · **requires** `dsr2_campus_sprint` · **time** 13 · **estMinutes** 10
- **reward** `{ money: 2000 }` · **failIf** `['wrecked:pip_car', 'dead:pip', 'dead:teddy']`
- **summary** "Teddy Castellane is two seconds a lap faster all of a sudden. Nobody finds two seconds."
- **Core:** tail (`follow: 'castellane_transporter'`), then escape. **Cast:** jay, pip (rides along), teddy, castellane mechanics (generic), gs_staff.

1. `spawnCar` `pip_car` at `speedway_pits`; `spawnCar` `castellane_transporter` at `speedway_pits`, color 0xd29a1c; `spawn` a driver `{ id: 'trans_driver', faction: 'castellane_racing', hostile: false, at: 'speedway_pits', behavior: 'drive', car: 'castellane_transporter', to: 'truckstop_lockup' [NEW] }`. `music: 'off'`.
2. `scene` at `speedway_pits`, cast pip, jay. Pip with a stopwatch and a face like thunder. Teddy's practice laps: two seconds faster than last week. **(keep)** Pip: "Nobody finds two seconds. You find a tenth. You find a tenth down the back of a sofa. Two seconds is a different engine." The gold transporter is pulling out with Teddy's car on it, "for a service", on a Tuesday. Pip: "Nobody services on a Tuesday."
3. `join: ['pip']`. `getIn: 'pip_car'`. Pip, as they pull out: "Peel the prawn sticker off. No. Leave it. Nobody looks at a prawn."
4. `music: 'tension'`. `follow: 'castellane_transporter', to: 'truckstop_lockup', min: 15, max: 120`, objective "Tail the Castellane transporter. Not too close". It's a long tail, north out of The Bowl, through the city and out west to Cinder Creek. Banter (the whole drive): Pip and Teddy's history: karting at eight ("He cried when he lost. I cried more when I won. I don't know why. I was eight."); why she races ("Because it's the only time nobody's telling me what to do. It's just me and the next corner."); Jay on tails ("The trick is to be boring." Pip: "I've never been boring in my life." Jay: "I know. Sit lower.").
5. `goto: 'truckstop_lockup'`, on foot, `stop: true`, radius 6, objective "Get a look inside the lock-up". `spawn` 3 castellane mechanics at `truckstop_lockup` (`faction: 'castellane_racing'`, idle, non-hostile).
6. `scene` at `truckstop_lockup`, cast pip, jay. Through the half-open door: Teddy's Zephyr on stands, and an engine going in with a turbo "the size of a dustbin". Pip, whispering: "That's banned. That's banned in three countries and a theme park." She takes photos. A gold road car pulls up: `spawnCar` `teddy_road` (`zephyr`, gold) at `truckstop_lockup`; `spawn` teddy (idle). Teddy walks in, sees the engine, stops: "That's not my engine. Where's my engine?" Mechanic (lines as `caption` or a generic voice): "Your uncle's orders, Mr Teddy. Don't worry about it." Teddy, white: **(keep)** "I thought I was just good."
7. A Guest Services Sovereign and a Tern pull into the truck stop: `spawnCar` `gs_car1` (`sovereign`) and `gs_suv` (`tern`) at `cinder_truckstop`, drivers `to: 'pip_car'`. gs_staff on a loudhailer: **(keep)** "Good afternoon! We're here to tidy up." Teddy: "Tidy what?" gs_staff: "Everything you've seen, Mr Castellane. Starting with your friends." Pip grabs Teddy's sleeve: "You're with us. Move."
8. `join: ['teddy']`. `getIn: 'pip_car'`, objective "Get Pip and Teddy out of there". `music: 'action'`, `checkpoint: true`.
9. `goto: 'speedway_pits'`, vehicle `pip_car`, `stop: true`, objective "Back to the Speedway pits, with the teal cars behind you". The Guest Services cars ram and shoot. `say`: Teddy in the back seat, in shock and then in a racing driver's fury: "They're shooting at me. I'm a Castellane. They work for me. (beat) Do they work for me?" Pip: "They work for whoever's paying." Teddy, watching Jay drive: "You brake late." Jay: "You brake early." Teddy: "...I do brake early." Pip: "He's going to start taking notes. Teddy, stop taking notes."
10. `music: 'hope'`. `leave: ['pip', 'teddy']`. `scene` at `speedway_pits`, cast pip, teddy, jay. Teddy, ashamed, sitting on a tyre stack. Pip: "Tell the stewards." Teddy: "Uncle Leo owns the stewards." Pip: "Then tell them loudly. In front of people." Teddy: "(a long pause) Will you be there?" Pip: "I'll be on the grid. I'm always on the grid. I'm just not allowed in a car." Jay, leaving: "Brake later." Teddy: "Right."

**Scripter notes:**
- *Earlier flags:* none required. If `d20_the_gorse_file` is done (Pip has seen proof the race fifty years ago was stolen), Pip at the lock-up: "Castellanes. Fifty years of cheating and they still can't do it quietly." Else: "Castellanes. Of course it's Castellanes."
- *Retry:* a lost or spotted tail fails it; restart at step 3. The escape has its own `checkpoint` (step 8).
- *Laugh:* "a different engine... down the back of a sofa", the banned turbo "in three countries and a theme park", Teddy asking whether Guest Services work for him.

## dsr4_southbay_classic: The Southbay Classic

- **id** `dsr4_southbay_classic` · **title** The Southbay Classic · **giver** `pip` · **start** `speedway_pits` · **requires** `dsr3_dirty_air` · **time** 18 · **estMinutes** 11
- **reward** `{ money: 4000 }` plus Pip's spare Drifter (see DECISIONS) · **failIf** `['wrecked:pip_car']` · completion flag: the job id `dsr4_southbay_classic` (bible 7: in d30 Pip and Teddy drive alongside the Firecrest as a guard; Ending B variant: they lead the parade lap)
- **summary** "The series finale. Ten laps, the whole field, and a licence handed back on the grid."
- **Core:** Speedway race (10 laps, 7 rivals). **Cast:** jay, pip, teddy, monty (PA), marshal.

1. `spawnCar` `pip_car` at `speedway_grid`; `castellane_racer` ×3 (Teddy and two works cars) and `privateer1..4` at `speedway_grid`. `music: 'off'`.
2. `camera: 'southbay_speedway'`, 4 s, caption "The Southbay Classic. The last round of the Summer Series. 6 p.m."
3. `scene` at `speedway_grid`, cast pip, teddy, marshal, jay. Teddy has told the stewards, loudly, in front of people. The chief steward (unseen; "the lamppost") has sent the marshal down. The marshal hands Pip a laminated card on the grid: her racing licence, reinstated. Marshal: "Stewards' apologies, Miss Marlow. They'd like you to know they're embarrassed." Pip: "Good. Tell them to stay embarrassed. It suits them."
4. Pip holds out the Drifter's keys to Jay anyway. **(keep)** Pip: "You got us here. Finish it." Jay: "You've got your licence back." Pip: "And next season I'll use it. This one's yours." Teddy, fair this time, to Jay: "Old engine. Same as yours, near enough. No more two seconds." Jay: "Brake later." Teddy: "I've been practising."
5. `if: 'd23_odie_wren'` then: Pip, quietly: "Gran's watching. On the little telly in the lighthouse. She says take turn three wider." Jay: "Is she right?" Pip: "She's always right. It's unbearable." `else`: Pip looks up at the honours board on the winners' enclosure wall: "One day there's going to be a Marlow on that board who gets to stay there."
6. `getIn: 'pip_car'`, objective "Grid slot four. Ten laps". `music: 'action'`, `checkpoint: true`.
7. `race: { checkpoints: [oval], rivals: [teddy zephyr, two works zephyrs, four privateers], laps: 10 }`, objective "Win the Southbay Classic". `say` across the race (spread them; ten laps is long): Monty: "Jack Mackerel for Marlow Racing! Jake Murphy! Joe Mercury! He's had more names this summer than wins, and he's had a lot of wins!"; Pip on the radio, getting her own back on the season ("That's a nine. That's a nine and a half. Don't let it go to your head, it's going to my head"); mid-race Teddy and Jay side by side for a lap, clean, Monty: "That is fair racing, ladies and gentlemen, and I've seen a lot of the other kind!"; last lap: Pip, very quiet on the radio: "Go on, Jay."
8. `music: 'triumph'`. `scene` at `speedway_grid`, cast pip, teddy, monty, jay. Pip and Teddy shake hands on the line, both pretending it's nothing. Monty, on the PA, so close: **(keep)** "Jay... Mer... Murphy!" Jay, under his breath: "Close." Teddy: "Next season. Me and you, Pip. No uncles." Pip: "No uncles."
9. Pip hands Jay a set of keys on a prawn keyring: "Team's spare Drifter. It's got fewer stickers. One fewer. The wart clinic dropped us." Jay: "Why?" Pip: "We won too much. Bad for their image. They want to look like they need customers." Jay, to the old Drifter, patting the roof: "Good car." Pip: "And mind the road." `if: 'd23_odie_wren'` then add Jay: "You know where that's from now." Pip: "Gran. Apparently it's genetic. Like the temper." `else`: Pip: "(frowning) I keep saying that."

**Scripter notes:**
- *Earlier flags:* `d23_odie_wren` (steps 5 and 9). If `dsf4_check_ride` is done, a yellow Skylark flies over the start (caption) and Pip: "Is that Hob? Is he waving the wings? He's waving the wings."
- *Retry:* restart at step 6 (`checkpoint`); ten laps is long, so the scripter may add a mid-race note that the engine's race restart covers it.
- *Laugh:* Monty's run of wrong names, then "Jay... Mer... Murphy!" so close; the wart clinic dropping the team for winning.

---
# DUAL CONTROL (`dside_lessons`)

`D.side.push({ id: 'dside_lessons', title: 'Dual Control', giver: 'june', unlockAfter: 'd09_minor_fault', missions: [...] })`. June has decided Jay "needs supervision" and is going to provide it. Every job has June's clipboard and a mark. June knows (from d09) that her daughter is hunting "racing car rubbish" with this man and that her mother "died in a racing car; that's the end of the story". She does not know Dess is alive until d25 (told) or d27/d30 (wait), so **no line in this chain refers to Dess as living** except one line in dsl3 guarded by `if: 'dlc_june_told'` (by then June knows): June's lessons are about June, Jay and driving. She never says "And mind the road" here (that's d25's moment). She says "Minor fault", never "Serious fault". **Reads:** nothing required; one optional line on `dlc_june_told` in dsl3. Speakers: `jay june rosa dougie caption` (`dougie` is a new minor speaker: see DECISIONS).

## dsl1_three_point_turn: Three-Point Turn

- **id** `dsl1_three_point_turn` · **title** Three-Point Turn · **giver** `june` · **start** `june_house` · **requires** none (chain opens after `d09_minor_fault`) · **time** 10 · **estMinutes** 9
- **reward** `{ money: 1200 }` · **failIf** `['wrecked:learner']`
- **summary** "Rosa Lindqvist is on her twelfth three-point turn. Somebody else has stolen the car she's doing it in."
- **Core:** chase (`chase: 'learner', mode: 'catch'`). **Cast:** jay, june (scene, then phone), rosa, a car thief (generic, no lines).

1. `spawnCar` `learner` at `verde_culdesac`, color 0x78b8e8. `spawnCar` `neighbour_car` (`vireo`, beige 0xcbbd9c) parked at `verde_culdesac`. `music: 'off'`.
2. `camera: 'verde_culdesac'`, 4 s, caption "Vista Verde. A cul-de-sac. Saturday, 10 a.m. Rosa Lindqvist's twelfth three-point turn."
3. `scene` at `verde_culdesac`, cast june, rosa, jay. Rosa in the driver's seat of the learner (lines through the window), June on the pavement with the clipboard. June, to Jay, without turning round: "Mr Mercer. You've been driving my daughter about. I'm going to supervise you. You can start by watching how it's done." Rosa: "I've failed this eleven times." June: "Twelve is a lucky number, Rosa." Rosa: "Is it?" June: "For somebody."
4. Rosa does it (caption: "(Seven points.)"). June: "Minor fault. Minor fault. That was a hedge." Rosa gets out to swap seats with June for "a demonstration", leaving the engine running and June's clipboard on the passenger seat. `spawn` a thief `{ id: 'thief', faction: 'civilian' (hostile: false), at: 'verde_culdesac', behavior: 'drive', car: 'learner', to: 'verde_mall' }`: a man in a tracksuit jumps in and drives off.
5. June, very calm: "My clipboard." Rosa: "...The car, Mrs Marlow." **(keep-ish)** June: "The car is insured. The clipboard has thirty years on it." Jay is already moving.
6. `getIn: 'any'`, objective "Get in a car" (`neighbour_car` is right there; its owner on the lawn: caption "(A man with a hose watches his car leave and sighs like it's happened before.)"). `music: 'action'`, `checkpoint: true`.
7. `chase: 'learner', mode: 'catch'`, objective "Catch June's learner car. Box it in, gently: it's June's". Through the cul-de-sacs, sprinklers, the `verde_mall` car park. `phone: 'june'` throughout (she's stayed with her pupil: "I don't abandon pupils, Mr Mercer"): she marks the thief, not Jay: **(keep)** "He hasn't indicated once." / "Wrong way round the mini-roundabout. That's a fail. That's an instant fail." Jay: "Should I tell him?" June: "Box him in. Gently. That car has dual controls and a box of my good pencils." Rosa, in the background: "Can I watch? Can we follow? Mrs Marlow, can I drive us?" June: "No."
8. When the learner stops: the thief jumps out and runs (`leave` with `vanish` after a few metres, or `flee`). `music: 'hope'`.
9. `goto: 'june_house'`, vehicle `learner`, `stop: true`, objective "Bring June's car home. Drive it like she's watching". (She is: caption on arrival.) Banter: Jay alone in the learner, to the car: "Easy. She'll know if we scratch you. She'll know if we think about scratching you." He finds the clipboard; on it, today's sheet for Rosa ends "Twelve. Lucky."
10. `scene` at `june_house`, cast june, rosa, jay. June checks the car's corners with her pencil like a vet, takes the clipboard, writes. **(keep)** Rosa, watching where the thief ran: "At least I've never done THAT." June hands Jay the sheet she's filled in for him: "Boxing in: good. Mirror checks: none. Mounting a verge: minor fault. Returning the car: I'll allow it." Jay: "That's a pass?" June: "That's a sheet. You'll get more."

**Scripter notes:**
- *Earlier flags:* none needed. If `d25_junebug` is done (June has given Jay her lesson), June at step 3: "I've marked you once. I'm going to keep marking you until one of us dies, and it won't be me, I indicate."
- *Retry:* if the learner is wrecked the job fails (June's car); a lost chase restarts at step 6.
- *Laugh:* "The clipboard has thirty years on it", June marking the thief, Rosa's "At least I've never done THAT".

## dsl2_school_run: School Run

- **id** `dsl2_school_run` · **title** School Run · **giver** `june` · **start** `vista_verde_school` · **requires** `dsl1_three_point_turn` · **time** 14.5 · **estMinutes** 9
- **reward** `{ money: 1500 }` · **failIf** `['wrecked:school_van']` (the `deliver` step's damage and time limits also fail it)
- **summary** "The school bus has broken down on cup final day. June has volunteered somebody."
- **Core:** careful timed delivery (`deliver: 'school_van', to: 'mariner_stadium', maxDamage: 0.2, timeLimit: 240`). **Cast:** jay, june (rides along), dougie (the pelican mascot, 11), the team (a chorus, as `caption` lines).

1. `spawnCar` `school_van` at `vista_verde_school`, color 0xf2c61f. `music: 'off'`.
2. `camera: 'vista_verde_school'`, 4 s, caption "Vista Verde School. The under-twelves are in the cup final at Mariner Stadium in twenty minutes. The bus is not."
3. `scene` at `vista_verde_school`, cast june, dougie, jay. June: "The bus has broken down. I've volunteered you." Jay: "You didn't ask." June: "You'd have said yes. I saved us both the time." In the van: the team's kit, eleven children, a cake shaped like the cup ("Mrs Pell made it. It's a cake. It's a cup. It's a cake cup."), and Dougie Penn in a pelican costume who will not stop flapping. Dougie: "I'm the Pelican. I have to stay in character." June: "Douglas, wings in." Dougie: "Pelicans don't have wings in."
4. `join: ['june']`. `getIn: 'school_van'`, objective "Drive the team to Mariner Stadium. Gently: there's a cake".
5. `music: 'hope'`. `deliver: 'school_van', to: 'mariner_stadium', maxDamage: 0.2, timeLimit: 240`, objective "Get the team to the final: on time, with the cake". Banter, the whole drive (this is the job, so write plenty): June marking ("Speed bump, Mr Mercer." "I saw it." "Then why are we in the air?"); Dougie in the mirror ("Mr Mercer can't see out the back." June: "Douglas, wings DOWN."); the team chorus, as captions, singing a song about pelicans with only one verse, over and over; Dougie: "Are you a racing driver?" Jay: "No." Dougie: "Are you a getaway driver?" Jay: (a pause) "I'm a van driver." **(keep)** June, writing: "Minor fault. Hesitation." (This is the laugh.) Halfway, the cake slides; June steadies it with one hand without looking up from the clipboard.
6. `scene` at `mariner_stadium`, cast june, dougie, jay. The team pile out and run for the players' gate. The cake has survived ("It's a cake cup. It's still a cake cup."). Dougie, last out, solemnly shakes Jay's hand with a wing: "Thank you, driver. The Pelican thanks you." Jay: "Win." Dougie: "The Pelican doesn't play. The Pelican is a symbol."
7. June totals her sheet: "Seven minor faults. And a pelican." Jay: "The pelican's not a fault." June: "Douglas is always a fault. It's not his fault." `leave: ['june']` (she goes in to watch).
8. `text` from `june` a little later (before the job ends, a `wait: 3` then `text`): "Lost 4-1. The cake won. They ate it on the pitch. Your braking at Heron Way was acceptable. J. Marlow"

**Scripter notes:**
- *Earlier flags:* none. If `dst4_the_big_jump` is done, Dougie, at the stadium: "Is this where the bus jump was? My cousin saw a car jump six buses. He said a man in a red jacket screamed the whole way."
- *Retry:* a dented cake (damage over 0.2) or a late arrival fails it: June: "The cake has died. We'll say a few words."
- *Laugh:* "I'm a van driver." / "Minor fault. Hesitation." and the cake cup.

## dsl3_test_day: Test Day

- **id** `dsl3_test_day` · **title** Test Day · **giver** `june` · **start** `verde_mall` · **requires** `dsl2_school_run` · **time** 11 · **estMinutes** 10
- **reward** `{ money: 2000 }` and a certificate (lines) · **failIf** `['heat:1', 'wrecked:learner']` · completion flag: the job id `dsl3_test_day` (bible 7: in Ending A June uses Jay's test sheet to mark her mother, "He got a 94. You can get a 94.")
- **summary** "The Marlow Test. Nobody drives June's daughter about who hasn't passed it."
- **Core:** precision course (cone `goto`s with small radii, an emergency stop, then a parallel park with `maxDamage: 0.05`). **Cast:** jay, june (passenger seat, her own brake), rosa (her real test in the next bay, with an examiner who never speaks).

1. `spawnCar` `learner` at `verde_mall`. `music: 'off'`.
2. `camera: 'verde_mall'`, 4 s, caption "Verde Mall car park. Sunday, 11 a.m. The Marlow Test." Cones are out in a corner of the car park (`mall_cone_slalom` [NEW] and the rest: the district builder or the engine's place props put cones, a trolley bay and two parked cars there).
3. `scene` at `verde_mall`, cast june, rosa, jay. June: "The Marlow Test. Nobody drives my daughter about who hasn't passed it. That includes her." Rosa, in the next bay in her mum's car with a silent examiner, white as paper, waves. June, to Rosa: "Breathe, Rosa. Mirror, signal, breathe." Rosa: "Which comes first?" June: "Breathe. Always breathe first."
4. `join: ['june']`. `getIn: 'learner'`, objective "Get in. June's in the passenger seat, with the other brake". June: "Hands." Jay puts them at ten and two without thinking. June notices. June: "Who taught you that?" Jay: "My grandmother. In a car park." June: "(a beat) Sensible woman."
5. `goto: 'mall_cone_slalom' [NEW], vehicle: 'learner', radius: 5`, objective "Slalom through the cones". Banter (editor: d09 owns "I don't care if they're shooting"; this is its echo): June: "Indicate, Mr Mercer. Even when nobody's shooting." Jay: "Nobody's shooting." June: "Not yet. You're the sort of driver people shoot at. I can tell from your mirrors."
6. `goto: 'mall_reverse_corner' [NEW], vehicle: 'learner', stop: true, radius: 4`, objective "Reverse round the corner and stop by the kerb". June: "Mirror. Mirror. Other mirror. That's three mirrors. Good."
7. `goto: 'mall_trolley_lane' [NEW], vehicle: 'learner', radius: 8`, objective "Drive down the lane at walking pace". `say`: June, conversationally, "Lovely day for it," and then, without warning, as a shopping trolley rolls out from between parked cars (caption: "(A trolley. Out of nowhere. With a pot plant in it.)"):
8. `goto: 'mall_trolley_stop' [NEW], vehicle: 'learner', stop: true, radius: 3`, objective "EMERGENCY STOP!" (the stop point is just short of the trolley; overshooting means hitting it and damage). June: "Good. (She writes for a long time.) Good."
9. `deliver: 'learner', to: 'mall_parallel_bay' [NEW], maxDamage: 0.05`, objective "Parallel park between the two cars. Don't touch either". (`stop` at the bay; radius about 2.5: see DECISIONS.) June says nothing at all for the whole manoeuvre, which is worse. One `say` line: Rosa, from the next bay, through two windows, loudly: "I'M DOING IT TOO."
10. `music: 'triumph'`. `leave: ['june']`. `scene` at `verde_mall`, cast june, rosa, jay. Rosa runs over: "I PASSED! I did a three-point turn in THREE POINTS!" June marks Rosa's sheet with a smile she doesn't let reach her voice: "Three points. I always said twelve was lucky." Then she totals Jay's sheet. `if: 'd25_junebug'`: June: "Ninety-four. Again. That's either very good or very boring." `else`: **(keep)** June: "Ninety-four per cent. Nobody gets a hundred. I didn't." (editor: said once in the DLC, in whichever of d25 and dsl3 comes first) Jay: "What were the six?" June: "Hesitation, at the van. And your face when I said 'emergency'."
11. June hands Jay a certificate, typed, MARLOW SCHOOL OF MOTORING, and keeps the sheet: "I'll keep this. For reference." (Plant for Ending A; no comment.) `if: 'dlc_june_told'` then (she knows her mother is alive): June, quietly, folding the sheet into her pocket: "Somebody I know might need a lesson. Somebody old and very sure of herself." Jay: "She'll hate it." June: "Good." `else`: June: "Now drive my daughter wherever she's going. Carefully. And bring her back."

**Scripter notes:**
- *Earlier flags:* `dlc_june_told` (step 11). If `dsl1`'s sheet exists (always: chain order), June has it on the clipboard under today's: "Last time: mounting a verge. Let's see."
- *Retry:* police heat or a touched car fails it (`failIf: ['heat:1']`, `maxDamage: 0.05`); restart at step 4. June on a fail: "That's a fail, Mr Mercer. Everybody fails once. I failed twice. Again."
- *Laugh:* June's three mirrors, the trolley with a pot plant, Rosa yelling through two windows, and "your face when I said 'emergency'".

---
## NEW PLACES NEEDED

Add to `D.places` in `dlc.js` or the side file's own places map (`Object.assign(D.places, {...})`). Ramps, gaps and bays need the district builder (or the engine's place props) to put the thing there; the place itself only has to resolve to a sensible spot of that kind.

| id | district | kind | desc | used in |
|---|---|---|---|---|
| `subway_ramp` | sunreel | street | on the fake city street set: a camera-department ramp over the fake subway entrance's railings | dst1 (race checkpoint) |
| `fake_bank` | sunreel | bank | the fake bank on the city set, a breakaway sugar-glass window big enough for a car (a crew re-glazes it after every take) | dst1 (race checkpoint) |
| `camera_mark` | sunreel | street | a chalked T on the backlot road beside the camera crane and Chet's deckchair and parasol | dst1 (race finish, goto stop, scene) |
| `stadium_bus_ramp` | thebowl | parking | in the Mariner Stadium car park: a take-off ramp, six parked buses in a row, a landing ramp on the far side (the place resolves to the landing side) | dst4 (camera, goto) |
| `stadium_gate` | thebowl | street | the stadium's big marathon gate, open onto the apron road | dst4 (race checkpoint) |
| `stadium_apron_north` | thebowl | street | the service road round the north side of Mariner Stadium, between the stand and the car park | dst4 (race checkpoint) |
| `stadium_apron_south` | thebowl | street | the service road round the south side of the stadium, past the players' entrance | dst4 (race checkpoint) |
| `power_chimney_gap` | ironside | overlook | the gap between the power station's two tallest chimneys (a `fly` ring at 70 m sits in it); if `ironside_power`'s own point is already between the chimneys, alias it | dsf2 (fly) |
| `clinic_helipad` | palomaheights | rooftop | the H on the roof of the private clinic, reachable by helicopter only; resolves to the roof, not the street | dsf3 (land) |
| `observatory_lawn` | palomaheights | park | the flat lawn beside the observatory dome, clear of trees, big enough to set a helicopter down | dsf3 (land) |
| `truckstop_lockup` | cindercreek | garage | a row of lock-ups behind the Cinder Creek truck stop; one half-open, a gold Zephyr on stands inside | dsr3 (follow target, goto, scene, spawns) |
| `mall_cone_slalom` | vistaverde | parking | a corner of the Verde Mall car park with a line of orange cones for a slalom | dsl3 (goto) |
| `mall_reverse_corner` | vistaverde | parking | a kerbed corner of the car park beside a trolley shelter, for reversing round | dsl3 (goto stop) |
| `mall_trolley_lane` | vistaverde | parking | a lane between rows of parked cars where a trolley can roll out | dsl3 (goto) |
| `mall_trolley_stop` | vistaverde | parking | the point a few metres short of where the trolley rolls out in that lane | dsl3 (goto stop, radius 3) |
| `mall_parallel_bay` | vistaverde | parking | a kerbside gap between two parked cars, one car's length and a bit | dsl3 (deliver) |

Also used, first asked for by `beats-act2.md` (do not define twice): `speedway_grid`, `speedway_turn1`, `speedway_back_straight`, `speedway_turn3` (dsr1, dsr4).

New mission vehicle ids (existing types, not in bible 6.3): `neighbour_car` (`vireo`, beige 0xcbbd9c; dsl1), `privateer1..5` (race rivals' cars: a blue `drifter` 0x2a55d8, a green `vireo` 0x2a6a3a, a brown `ironclad` 0x6b4a32, a white `pipit` 0xefefea, a red `zephyr` 0xc8202a; dsr1, dsr2, dsr4), `teddy_road` (`zephyr`, gold 0xd29a1c; dsr3).

New minor speakers (add to the side file's characters, as story-act2.js adds its minor cast): `tower` ("Vicehaven Tower", the air traffic controller, voice only, male, pitch 1.0, rate 1.1; dsf4) and `dougie` ("Dougie Penn", 11, the Vista Verde School pelican mascot: a white-and-yellow pelican costume (top 0xefefea, bottom 0xf2c500), slim, voice male pitch 1.35 rate 1.15; dsl2). Thief (dsl1), stuntman Vince (dst2), Castellane mechanics (dsr3) and extras are generic spawns with no lines.

## DECISIONS

1. **Side jobs float** between main jobs. Every line that leans on a main-job flag is an `if` whose `else` covers "not chosen yet" (Take Two can be played before d14 sets `dlc_chet_told`/`dlc_chet_kept`, so its `else` branches nest a second `if: 'dlc_chet_kept'`). Dess is mentioned only inside `if: 'd23_odie_wren'` (dsf3, dsf4, dsr4) or `if: 'dlc_june_told'` (dsl3). Pip's "Gran" lines outside those are about the legend (won, painted out), which every player knows from d10 before Summer Series opens.
2. **Side chains do not move the main tallies**: no comment cards (a gs_staff starts to offer one in dst2; Jay declines), no subscriber numbers or scoreboard, no Monty right name, no "Serious fault", no riddles. Hob's marks here are 5, 8, 6, 7, disputed 5 (Milo said 9), then 10 in dsf4: the first ten, as the bible says.
3. **dst2 "shake them before cut".** The engine has no "lose this car" step, so the Guest Services cars are shaken with `heat: 2` (they shoot on the Strand, the police come) and `loseHeat`; their drivers drop the pursuit when the heat is lost (scripter: `leave`/`vanish` them if they linger). The chase's wreck can happen anywhere; Fenella says she'll cut it to look like the fountain.
4. **dst3 timing.** The bible gives `timeLimit: 300` for "the light goes in five minutes". The police must be lost first or the shoot is stopped, and a `loseHeat` can take any time, so the job runs `heat: 2` → `loseHeat` → `deliver ... timeLimit: 240`. Fenella's "five minutes" is the fiction; the player gets four after the heat is gone.
5. **dst3's rain** is a `wait: 20` with lines: the engine can't check the water cannon is on the actors. The objective asks for it anyway; the comedy works whether or not they aim.
6. **dst4 jump.** A `timer` only covers the next step, so the jump is its own `goto` to the landing side of `stadium_bus_ramp` (clearing it is the only way to reach the checkpoint), then a `slowmo` for Chet's line, then `timer: 90` and a solo `race` for the gate and the stadium lap.
7. **Trey's last explosion (dst4)** is a `camera` shot and a caption. If the engine can blow up a spawned car from a step (any existing helper), the scripter uses it on `trey` after Chet has left the car; otherwise the caption carries it. Trey must never be wrecked while the player is in a job (`failIf: ['wrecked:trey']`).
8. **Chet over thirty.** The bible has Chet go over thirty "for the first time in his life" in dst4, and has him confess in d10 he has never *driven* over thirty. Both hold: in dst4 he's the passenger. He drives at thirty in d14 and d24 as before.
9. **dsf2 record.** One `timer` per sector (35, 30, 30 s, tune in playtest) instead of one clock over a chain of `fly` steps; Hob reads them as splits on his stopwatch. The final time Hob announces ("three minutes four") is fiction.
10. **Radio = `phone`.** Hob, Gully, Milo, Toby and the tower talk to Jay in the air through `phone` steps (the game's call UI). Hob rides in the plane only in dsf4 (`join`), with `dead:hob` in `failIf`.
11. **dsf4's airport landing** uses `land: 'vicehaven_international'` then `goto: 'airport_apron'` in the aircraft for the "taxi off", and the next `fly` is the take-off (no runway place is needed). The tower is a new voice-only speaker, `tower`. Landing a light plane at the airport raises no heat.
12. **Rewards that are vehicles** (dsf4's second club Skylark, dsr4's spare Drifter) use whatever the engine offers for vehicle unlocks (e.g. `reward.unlock: ['skylark_paloma']` / `['pip_spare_drifter']` handled like the main game's `lulu` unlock). If there is none, the lines stand and the reward is money only.
13. **Officer Plum (dsr2)** is spawned non-hostile with no police faction, so his chase is comic and raises no heat (unlike d05, where being seen by him fails the job). He chases the wrong car in lines only.
14. **dsr3** is a long tail (The Bowl to Cinder Creek, south-east to west). `max: 120` gives room on the city roads. The escape needs no `kill`: get Pip and Teddy to the pits with the Guest Services cars behind; no heat is set (the shooting may raise it; no `failIf` on heat).
15. **dsr4's Teddy line** "Old engine" makes the fair race explicit; the banned engine story ends here. Teddy in d30 (with `dsr4_southbay_classic`) drives alongside as an ally, which this sets up.
16. **dsl3's parallel park** uses `deliver` for the 0.05 damage check. It needs a small radius (about 2.5 m) and `stop`; if `deliver` doesn't take a radius, the scripter puts a `goto` with `stop: true, radius: 2.5` immediately before it.
17. **June never says "And mind the road" in Dual Control** (her first time is d25, where it has to stop Jay cold). Pip says it in dsr2 and dsr4 as her running habit.
18. **dsl1's car** for the chase is `getIn: 'any'`, with `neighbour_car` parked beside Jay so there is always one. June stays with Rosa ("I don't abandon pupils") and phones.
19. **No Milo in danger:** dsr2 he's on the library steps behind the barrier; dsf3 he's at the edge of the sports field and only spawned after the Sparrow's approach; everywhere else he's on the phone.
20. **Speakers by unlock:** Take Two opens after d04 and uses `gully` (first seen in d11) in dst3. Gully needs no introduction (a lifeguard with a whistle), so this is fine whatever order the player meets him in.

## EDITOR'S CHANGES (story edit, binding)
- dsr2 and dsf4: Milo's clock jokes now use the stopped clock (stopped at 11:14 since d05), not "eleven seconds slow".
- dsl3: June's indicate line is a new echo, not d09's (keep) line; the 94 line branches on `d25_junebug`.
- Estimates: dsf4 11, dsr4 11 (side total 148 min).
- All [NEW] places and the speakers `tower`, `dougie` and `mechanic` (dsr3's lock-up line) are in `dlc.js`.
