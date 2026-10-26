/*
 * data/holdup-lines.js — what people say during a shop hold-up, as data.
 *
 *   VH.Data.holdupLines.clerk    the clerk behind the counter. `start` and
 *                                `filling` are keyed by his personality
 *                                (nervous / steady / stubborn / hero); the
 *                                rest are moments in the hold-up
 *   VH.Data.holdupLines.jay      Jay: the gun comes up, shouts, the grab,
 *                                the safe, a shopper's wallet, the camera
 *   VH.Data.holdupLines.shopper  the people browsing the aisles
 *   VH.Data.holdupLines.guard    the security guard a shop hires after it
 *                                has been robbed twice
 *
 * holdup.js picks a line at random from a list and plays it as an ambient
 * line, so every line is spoken by the browser's speech voice and shown as
 * a subtitle. Keep them short and self-contained: no line may lean on the
 * one before it.
 */
(function () {
  'use strict';

  const VH = window.VH;
  VH.Data = VH.Data || {};

  VH.Data.holdupLines = {
    clerk: {
      // The gun comes up and his hands go up with it.
      start: {
        nervous: [
          'Whoa whoa whoa! Okay! Okay!',
          "Please don't shoot, I just work here!",
          'Oh no. Oh no no no.',
          'Hands up, see? Hands are up!',
          "It's yours, all of it, I swear!",
          "I've got a kid! Well, a cat!",
          'Alright, nobody panic. Mostly me.',
          'Not today, please, I just got promoted!',
          "Easy with that thing! I'm cooperating!",
          'This is literally my third week.',
          "Take whatever! I don't even like this job!",
          "Wait, is that real? It's real. Okay!",
          'Sure! Yes! Absolutely! Money! Coming up!',
          'My manager said this might happen.',
          'Mum said get a job at the library.',
        ],
        steady: [
          "Alright. Easy. I'm not a hero.",
          'Okay. Nobody needs to get hurt.',
          'Understood. Keep your finger off that.',
          "Fine. You'll get the till.",
          "I'm doing it. Slow and simple.",
          'No trouble from me, pal.',
          'Hands where you can see them. Okay.',
          'Just the till, right?',
          "Calm down. You'll get your money.",
          'Right. I did the training for this.',
          "Steady. I'm moving slow.",
          'Got it. Bag and the till.',
          'Sure. Not worth getting shot over.',
          "Whatever's in the drawer. It's yours.",
        ],
        stubborn: [
          'Oh, for crying out loud.',
          'Seriously? I just counted that.',
          'Great. Perfect. Love this job.',
          'You know I get blamed for this, right?',
          "Fine. But I'm not rushing.",
          'Ugh. Do you know what time it is?',
          'Every bloody week, I swear.',
          "Hold your horses, I'm getting there.",
          "Can't a man finish his sandwich?",
          'Boss is gonna dock my pay for this.',
          'Alright, alright. Keep your hair on.',
          'This is coming out of my break.',
          'Typical. Ten minutes to closing, too.',
          "I'm on minimum wage, you know.",
        ],
        hero: [
          "You're making a mistake.",
          'Fine. Your funeral.',
          'Easy. Real easy.',
          "Don't do this, friend.",
          'Sure. Whatever you say.',
          'Hands up. For now.',
          'Think hard about this.',
          'Last guy who tried this regretted it.',
          'Okay. Your move.',
          'Got some nerve, coming in here.',
          "Alright. Don't get twitchy.",
          'Big mistake.',
          "I'll remember your face.",
          'Wrong counter to point that at.',
        ],
      },

      // This shop has been robbed before and he knows Jay's face.
      again: [
        'You again?!',
        'Oh, come on! Not you again!',
        'Seriously? Same guy, same shop?',
        'I knew I recognised that jacket.',
        'Back for more, huh?',
        'This is getting to be a habit.',
        "Twice wasn't enough for you?",
        "My boss thinks I'm making you up.",
        "Didn't you rob us last week?",
        'Should I just start a tab for you?',
        'Every time. Every single time.',
        'They put your picture by the till, you know.',
        "We're on first-name terms now, are we?",
      ],

      // Jay walks in with a gun out but isn't aiming it at him (yet).
      armedEntry: [
        'Uh, sir? The gun?',
        'Is that... thing loaded?',
        "Hey, hey. We don't want trouble.",
        'Mind putting that away, mate?',
        'Oh boy. Please just be buying gum.',
        "You're making me real nervous, pal.",
        'Cool cool cool. Just browsing, right?',
        'Can I help you with... anything?',
        "Okay. I'm just gonna stand very still.",
        "We've got cameras, just so you know.",
        'Nice day. Nice gun. Please leave.',
        'Snacks are on aisle two. Just saying.',
        'No guns in the shop. Sign on the door.',
      ],

      // Jay walks in with no gun out: small talk over the counter.
      greet: [
        'Hey. Let me know if you need anything.',
        'Morning. Or whatever it is.',
        "Slushie machine's working again. Mostly.",
        'Hot one out there, huh?',
        'Welcome in. Mind the wet floor.',
        'Just shout if you need me.',
        'Evening. Cold drinks are in the back.',
        'Two-for-one on the crisps today.',
        "Don't mind the music, the boss picks it.",
        "How's it going? Busy day?",
        'Hi there. Fresh coffee, just brewed.',
        'Careful, the blue slushie stains.',
        'Need a bag? Bags are extra now.',
        "Heard the harbour's packed today.",
        "Boardwalk traffic's a nightmare today.",
        'Yo. Hot dogs are, uh, fairly fresh.',
        'Sunscreen is by the door. You look pink.',
        'Old Market crowd keeps buying all the ice.',
        'Palm Crescent lot are in again. Big spenders.',
        'Sorry, the card machine hates everybody.',
      ],

      // Muttered while stuffing the notes into the bag.
      filling: {
        nervous: [
          "Going, going, it's all going in!",
          'Sorry, sorry, my hands are shaking.',
          'Fives, tens, twenties, everything!',
          "Want the coins too? I'll do coins!",
          'Nearly, nearly, almost, nearly.',
          'Breathe. Just breathe. And stuff the bag.',
          'Oh no, I dropped one. Got it!',
          "Please don't be mad, it's going fast.",
          "Is this enough? It's never enough.",
          'In you go, money. Good money.',
          'Twenties! I found twenties!',
          'Should I fold them? No folding. Okay.',
        ],
        steady: [
          'Twenties first.',
          'Filling it. Keep calm.',
          "That's the tens. Fives next.",
          'Almost done. Stay easy.',
          "Everything's going in.",
          'No tricks. Just cash.',
          "Counting's not my problem today.",
          'Nearly full. Hold on.',
          'Slow hands. See them?',
          'Coins too? Your call.',
          'Doing it by the book.',
        ],
        stubborn: [
          'This drawer always sticks.',
          'Hang on, these are all ones.',
          'Wanna help? No? Then wait.',
          "I'm going as fast as I'm going.",
          'Rubber bands everywhere, honestly.',
          'Who wraps the coins like this?',
          "Bag's got a hole in it. Typical.",
          "Don't rush me, I lose count.",
          'Nobody ever empties the coin tray.',
          'One at a time, mate.',
          'Ugh, the slushie leaked in here.',
        ],
        hero: [
          'Take your time? No? Fine.',
          'Enjoy it while it lasts.',
          "Here's your money. Count it in a cell.",
          "Not much here. Hope it's worth it.",
          "Bag's filling. Happy?",
          "Cops'll love this.",
          'Keep watching me. Go on.',
          "You won't get far.",
          'Every note. Then we see.',
          'Sure. Help yourself.',
          'Smile for the camera, champ.',
        ],
      },

      // A stubborn clerk drags his feet until Jay shouts.
      stall: [
        'The drawer sticks, alright?',
        'Hang on, I need the key.',
        "Where'd I put the bag? Hold on.",
        "Can't open it without a sale. System thing.",
        "Wait, I think I'm on my break.",
        "Hold up, the register's rebooting.",
        'Gotta count it first. Policy.',
        'Ugh, my back. Give me a second.',
        'These coins are all jammed.',
        'Pretty sure the boss took the twenties.',
        "Wrong bag. That's the bin bag.",
        'Just let me finish this text.',
        'Is it this button or that one?',
        'Receipt roll ran out. One sec.',
      ],

      // Jay has just shouted at him.
      hurried: [
        'Okay! Okay! Got it!',
        "Going! I'm going!",
        'Alright, no need to shout!',
        'Yes sir! Right away, sir!',
        'Moving, moving, moving!',
        'Fine! Quick as I can!',
        'Easy, easy! Nearly there!',
        'Jeez! Look how fast I am!',
        "Don't yell, I'm doing it!",
        'Speeding up! See? Speedy!',
        'Hurrying! Really hurrying!',
        "Stop shouting, I'm on it!",
        'Sorry! Faster! Faster is good!',
        'Double time! Got it!',
      ],

      // Too many shouts at a nervous clerk: he locks up.
      panic: [
        "I can't... I can't think!",
        "Stop! Stop yelling! I can't!",
        "My hands won't work!",
        'Oh no, oh no, oh no.',
        'Too much! Too much shouting!',
        'Bags! How do bags work?!',
        "Brain's gone. Totally gone.",
        "Wait, wait, I'm freaking out!",
      ],

      // Jay has fired a shot that didn't hit him.
      warningShot: [
        "Whoa! Okay! I'm faster now!",
        "Holy crap! Don't shoot!",
        'My slushie machine!',
        'Message received!',
        'That was the ceiling tile!',
        'Ears ringing! Still filling!',
        'Point taken! Point very taken!',
        'Damn! Alright, alright!',
        'No more shooting, please!',
        'You nearly hit the lottery tickets!',
        'Bloody hell! Going!',
      ],

      // A hero caught reaching under the counter thinks better of it.
      backDown: [
        "Nothing! I wasn't doing anything!",
        'Hands up. Hands back up.',
        'Fine. Forget it.',
        'Just... scratching my knee.',
        'Alright. Not worth it.',
        "Easy. I'm done being brave.",
        'Was reaching for a tissue. Honest.',
        'You win. Today.',
      ],

      // A hero comes up with the shotgun.
      heroDraw: [
        'Not in my shop!',
        'Surprise, punk.',
        "Now who's holding who up?",
        'Get out of my store!',
        "Bet you didn't see this coming.",
        "Let's dance, tough guy.",
        "Should've robbed somewhere else.",
        'Meet my insurance policy.',
        'Wrong shop, pal!',
      ],

      // The bag is full and he tosses it onto the counter.
      throw: [
        'Take it! Just take it!',
        "There! That's all of it!",
        'Here! Now get out!',
        "Bag's on the counter! Go!",
        "That's everything, I swear!",
        'Done! Please leave now!',
        'All yours. Have a nice day?',
        'Full bag. Happy now?',
        'Go on, take it and go.',
        "Lot's in there. Door's that way.",
        'Every last note. Please go.',
        "Don't come back, okay?",
        'One bag of cash. Anything else? Gum?',
        'Catch! No, wait, it landed. Fine.',
      ],

      // Jay grabs the bag before it's full.
      handOver: [
        "Here! Take what's there!",
        'Fine, take it half full!',
        "It's not full! Okay, whatever!",
        "Yours! It's yours!",
        "That's it? Sure, take it!",
        "Don't you want the rest?",
        "Grab it. I won't stop you.",
        "Bag's yours. Go!",
      ],

      // Told to open the safe.
      safeAgree: [
        'The safe? Okay, okay.',
        "It's in the back. Don't shoot.",
        "Fine. Safe's this way.",
        "I'm not supposed to know the code...",
        'Alright. Walking. Slowly.',
        'You want the safe too? Greedy.',
        'Sure, but it takes a minute.',
        'Boss is gonna kill me. Fine.',
      ],

      // Kneeling at the safe, working the dial.
      safeDial: [
        'Left... right... left again...',
        'Was it twelve or twenty?',
        'Seven... nineteen... hold on.',
        "It's the boss's birthday. I think.",
        'Come on, come on, open.',
        'Wrong way. Starting over.',
        'Dial is sticky. Nearly.',
        'Just one more number.',
        'Shh. I have to hear the clicks.',
      ],

      // The safe door swings open.
      safeOpen: [
        "It's open! Take it!",
        "There. Safe's open.",
        "That's the safe. All of it.",
        'Got it! Go ahead!',
        "Open. Please don't hurt me.",
        'Done. Take it and go.',
        "Click. That's it.",
        "There's your safe. Happy?",
      ],

      // The till was already emptied: nothing to take.
      emptyTill: [
        "I've got nothing left!",
        "Till's empty! Someone beat you to it!",
        "There's nothing! Look, empty!",
        'We got robbed already today!',
        "Sorry! It's all gone!",
        'Just coins and receipts, pal.',
        'Come back later? Is that weird to say?',
        'Empty. Cleaned out. Nada.',
        'Boss took it to the bank already.',
        'All I have is a coupon.',
      ],

      // Jay walks out halfway through.
      abandoned: [
        "Wait, you're leaving?",
        'Uh... thanks for not shooting?',
        'Okay. Bye then!',
        "That's it? Huh.",
        "He's gone? He's gone!",
        "Guess I'll keep this, then.",
        'Changed your mind? Smart.',
        "And don't come back!",
      ],

      // Shot or hit, but still on his feet.
      hurt: [
        'Ow! Okay! Okay!',
        "Argh! I'm doing it!",
        'You shot me! You actually shot me!',
        'Ugh, that hurts! Filling!',
        'Ah! Fine! Faster!',
        'Not again! Please!',
        'Damn it! Alright!',
        'Stings! It stings! Going!',
      ],

      // Shaken, once it's over.
      after: [
        'I need a new job.',
        'Is he gone? Is he gone?',
        'Somebody call my mum.',
        'Okay. Okay. Breathe.',
        "That's my third this month.",
        'Never working nights again.',
        'Can I go home now?',
        "I'm shaking. Look at me shaking.",
        "Who's gonna do the paperwork?",
        'Think I need a slushie.',
      ],
    },

    jay: {
      // The gun comes up.
      start: [
        "Hands up. Nobody's a hero.",
        'You know how this goes.',
        'Till. Bag. Now.',
        'Easy. Fill the bag, I leave.',
        "Stay calm and this'll be quick.",
        "Don't touch anything under there.",
        'Just the money, friend.',
        'This is a hold-up. Sorry.',
        'Nice and slow. Empty the till.',
        'Open the register.',
        "Let's keep this short.",
        "Cash in the bag. That's all.",
        'Morning. Hands where I can see them.',
        "Nobody's getting hurt. Fill it up.",
      ],

      // E with nothing to pick up: hurry him along.
      shout: [
        'Faster!',
        'Fill the bag!',
        'Move it!',
        'Come on, come on!',
        'Quicker than that!',
        "I haven't got all day!",
        'Hurry up!',
        'Stop stalling!',
        "Don't make me ask twice!",
        'Hands in the till, now!',
        'Today, please!',
        'Pick up the pace!',
        'Less talking, more filling!',
        'Did I stutter?',
        'Sirens, mate! Speed it up!',
      ],

      // Taking the bag (full or early).
      grab: [
        "I'll take that.",
        "That'll do.",
        'Good enough. Hand it over.',
        'Thanks. Pleasure doing business.',
        'Got it.',
        'Appreciate it.',
        'Sweet. Stay put.',
        "That's mine now.",
        "Don't follow me.",
        'Cheers. Back to work, you.',
      ],

      // Telling him to open the safe.
      safe: [
        'Now the safe.',
        'Open the safe.',
        "I know there's a safe. Move.",
        "Back room. Safe. Let's go.",
        'Walk me to the safe.',
        'Safe next. Nice and easy.',
        "Don't tell me you forgot the code.",
        'Same deal. The safe this time.',
      ],

      // Taking the cash out of the open safe.
      takeSafe: [
        'Lovely.',
        "Now that's more like it.",
        'Thanks for your service.',
        "That'll keep the lights on.",
        "Rent's paid.",
        'Bless you, little safe.',
        'Okay. Worth the wait.',
        'Shiny.',
      ],

      // Aiming at a cowering shopper and asking nicely.
      wallet: [
        'Wallet. Now.',
        'Drop the wallet on the floor.',
        'Just the wallet, nothing else.',
        'Hand it over. Slowly.',
        'Your wallet. Then you sit.',
        'Cash, please. Keep the cards.',
        'Sorry about this. Wallet.',
        'Nobody gets hurt. Wallet.',
        'Toss it here.',
      ],

      // The CCTV camera has just been shot out.
      camera: [
        'Smile.',
        'No pictures.',
        'Camera shy.',
        "That's off the record.",
        'Nothing to see here.',
        'Sorry. Not my good side.',
        "Show's over.",
        'Footage? What footage?',
      ],

      // Walking out with the money.
      leave: [
        'Have a nice day.',
        "Don't call anyone.",
        'You never saw me.',
        'Count to a hundred.',
        'Thanks. Stay behind the counter.',
        "Pleasure. Don't get up.",
        'Take a break. You earned it.',
        'Sorry about the mess.',
      ],

      // Facing down the shop's security guard.
      guard: [
        'Easy, big man.',
        "Don't be a hero, pal.",
        'Not worth your wage.',
        'Back off, rent-a-cop.',
        'Keep your hand off that holster.',
        'Walk away. Seriously.',
        "You're paid to stand there. So stand.",
        'Think about your pension.',
      ],
    },

    shopper: {
      // Cowering on the floor.
      plead: [
        'Please, I just came for milk!',
        "Don't shoot! I won't move!",
        "I'm not here! I'm not here!",
        'Oh no, not today.',
        "I'll stay down, I promise!",
        'Got a family at home, please!',
        "I didn't see anything!",
        'Just let me go home.',
        "Knew I should've gone to the other shop.",
        'Floor! I love the floor!',
        "Mum's gonna kill me.",
      ],

      // Handing over a wallet.
      wallet: [
        'Here! Take it!',
        "That's all I've got!",
        'Please, just take it!',
        "It's mostly receipts, sorry!",
        'Fine! Keep the photos, though!',
        "Don't hurt me! Here!",
        'Hope you like loyalty cards.',
        'There goes my rent.',
        'I was saving that for lunch!',
        'Cash is in the side pocket!',
      ],

      // Making a run for the door.
      bolt: [
        "I'm out of here!",
        'Screw this!',
        'Run! Everybody run!',
        'Nope. Nope. Nope.',
        'Not dying for crisps!',
        'Help! Somebody help!',
        'Gotta go, gotta go!',
        'Forget the milk!',
      ],

      // Outside, on the phone to the police.
      phone: [
        "Police? There's a robbery!",
        'Yes, a hold-up! Corner shop!',
        "Hello? Someone's got a gun in the shop!",
        'Send someone, quick!',
        "He's still in there! Hurry!",
        "Emergency! The shop's being robbed!",
        "I'm outside! Yes, he's armed!",
        "Please come fast, he's got a gun!",
      ],

      // Idle chatter to themselves while browsing.
      browse: [
        'Where do they keep the batteries?',
        'Hmm. Salt and vinegar or plain?',
        'Four ninety-nine for this? Seriously?',
        'Did I need eggs? I think I needed eggs.',
        'Ooh, mango slushie.',
        'Why is the bread always at the back?',
        'These are out of date. Again.',
        'Sunscreen. Definitely need sunscreen.',
        'Just one chocolate bar. Okay, two.',
        'Who buys this flavour?',
        'No more cold ones. Typical.',
        "Should've made a list.",
        'Pretty sure they moved the cereal.',
        'Beach towels? In a corner shop?',
      ],
    },

    guard: {
      // Jay has drawn a gun in his shop.
      challenge: [
        'Drop it! Now!',
        'Gun down! On the floor!',
        "Don't even think about it!",
        'Security! Drop the weapon!',
        'Hands where I can see them!',
        'Bad idea, pal! Put it down!',
        'Not on my shift!',
        'Last warning! Drop it!',
      ],

      // Trading shots.
      fight: [
        'Take him down!',
        'Shots fired! Shots fired!',
        'You picked the wrong shop!',
        'Get down, everybody!',
        'Stay behind the counter!',
        'Call it in! Now!',
        'I said drop it!',
        'Backup! I need backup!',
      ],

      // Going down.
      down: [
        "Agh! I'm hit!",
        'Not... worth... the wage.',
        "Should've stayed in bed.",
        'Somebody... call it in...',
        'Argh! Man down!',
        'Ugh. Tell my boss I quit.',
        "Can't... get up...",
        "I'm out. I'm out!",
      ],
    },
  };
})();
