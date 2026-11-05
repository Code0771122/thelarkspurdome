// THE LARKSPUR DOME — the party game.
// Argyll, the night of 12 August 1952. Ten guests, seven women and three men. One of them killed Professor Edmund Vale.
// Everything a phone may see about its own character is in CAST. CLUES are the envelopes. SOLUTION is opened only at the end.
// The story is the one from the original Larkspur party game; Bridie Fenwick, the parlourmaid, was added to make ten.

const CAST = [
  // ------------------------------------------------------------------ THE LADIES
  {
    key: 'celia', gender: 'F', name: 'Celia Vale', archetype: 'The Wife',
    public: 'The Professor’s elegant wife and hostess. Sings after dinner. Has been married to Edmund for eleven years and says so rather often.',
    costume: 'A silk evening gown, long gloves, a string of pearls. Wear a ring at the start of the night, and take it off quietly before Round III (The Discovery).',
    voice: 'Low, warm and a little theatrical. A singer’s voice. You hum when you are nervous.',
    entrance: 'Welcome to Larkspur, darlings. Edmund is up in his dome with his stars, as usual. We shall just have to amuse ourselves.',
    mannerisms: [
      'Hum a few bars of a French song whenever the conversation turns awkward.',
      'Touch your ring finger when anyone mentions Edmund.',
      'Call everybody “darling”, except Dr Pryce, whom you call “Hugh”.'
    ],
    secret: 'You are leaving Edmund tonight. A Paris jazz club, Le Perroquet Bleu, has offered you a season singing. Your suitcase is packed in the main bedroom and your ticket is for the 6 a.m. boat to Oban and the boat train to Paris.',
    defend: 'If anyone mentions a suitcase or a ticket, laugh and say you “always keep a bag packed, darling. One never knows when one will be invited somewhere amusing.”',
    danger: 'You may have been the last person to see Edmund alive. If you admit it, you look guilty. If you hide it and it comes out, you look worse.',
    where: 'The dome, 11.44 to 11.47 p.m.',
    claim: 'You were in the drawing room with a gin and the gramophone from half past eleven until the cocoa came round. You never went near the dome.',
    truth: 'At 11.44 you climbed to the dome to tell Edmund you were leaving. He looked pale and grey and said, “I’ve had the doctor’s powder. It will settle my stomach.” He went down the stairs at 11.47, alone, holding his middle. Left by yourself in the dome, you took off your wedding ring and threw it out of the open roof slot, into the sea.',
    saw: 'At 11.44 Edmund told you he had already had “the doctor’s powder”. He was alive, and writing in his logbook when you arrived.',
    goals: [
      'Keep the Paris ticket secret until Round V (The House at Midnight).',
      'Find out who emptied the cook’s savings tin, so that you can quietly repay her.',
      'Get the whole table to drink a toast “to Paris” without anybody knowing why.'
    ],
    diary: [
      'Tues. Telegram from Monsieur Delorme: the season is mine if I can be in Paris by Friday. I read it four times in the bath.',
      'Wed. Edmund didn’t notice the new dress. He noticed the price. Bought the boat ticket in Oban while he was at the bank.'
    ],
    relations: {
      kitty: 'Glamorous and nosy. You rather like her, but she photographs everything. Keep her camera away from your bedroom.',
      pryce: 'Hugh is Edmund’s oldest friend and your favourite dinner guest. He always makes you laugh. Lean on him tonight.',
      agnes: 'The cook has been with you for years and you are fond of her. You suspect Edmund has wronged her somehow.'
    },
    ask: ['Where were you between half past eleven and midnight, Mrs Vale?', 'Why aren’t you wearing your wedding ring?', 'Were you happy with the Professor?'],
    beats: {
      1: 'Sing a line or two of a French song after the toast, whether anyone asks or not.',
      2: 'When the body is found, nearly faint. Then ask, very quietly, who was with him last.',
      3: 'Somebody is going to read out a clue about a suitcase. Decide now: deny it, or laugh it off.',
      4: 'If anyone has noticed your bare finger, tell them the truth about the dome, or a beautiful lie.',
      5: 'Before the vote, stand up and say one thing you are certain of about Edmund’s last evening.'
    },
    sightline: 'Edmund, alive at 11.44 in the dome, blaming the doctor’s powder.'
  },
  {
    key: 'olive', gender: 'F', name: 'Olive Marsh', archetype: 'The Assistant',
    public: 'The Professor’s shy, brilliant assistant. Always ink on her fingers and a pencil behind her ear. Knows every star in the sky by name.',
    costume: 'A cardigan, spectacles, sensible shoes, and a notebook you carry everywhere. Ink on your fingers if you dare.',
    voice: 'Quiet and quick, with long thoughtful pauses. You get very fast and very precise when you talk about the sky.',
    entrance: 'Oh. Hello. Sorry. I was looking at the sky. Did you know the Perseids are bits of a comet older than Scotland?',
    mannerisms: [
      'Write down things people say in your notebook, quite openly, and read them back to them later.',
      'Correct anyone who gets a time or a number wrong. Gently, but always.',
      'Hold your handbag on your lap all night. Never put it down.'
    ],
    secret: 'You discovered the comet that made Edmund famous last spring. He scratched out your name, O. Marsh, on the photographic plate and wrote his own over it in red ink. Tonight you tore three pages out of his private notebook to prove it. They are in your handbag.',
    defend: 'If anyone asks about the comet, say “Professor Vale was very generous with his time,” and change the subject to the weather.',
    danger: 'Stolen pages from a dead man’s notebook are in your handbag. If anyone searches it, you look like a thief, or worse.',
    where: 'The library, 11.00 to 11.45 p.m.',
    claim: 'You were in the library copying the observatory logbook, and nobody came past except Mrs Vale’s cat.',
    truth: 'You were in the library copying the observatory logbook, that part is true. At 11.15 you saw Jasper Crane slip out of the study, looking shifty, with something square under his jacket. You also slipped into the study yourself at about 10.50, before any of that, to tear your pages out of Edmund’s notebook.',
    saw: 'Edmund crosses his sevens, the continental way. You are the only person here who knows it: any entry in the dome logbook with crossed sevens is in his own hand.',
    goals: [
      'Get Jasper Crane to agree, out loud, to sign a joint letter with you to the Royal Astronomical Society.',
      'Stop anyone searching your handbag before Round V (The House at Midnight).',
      'Be the first person tonight to say the word “forgery” out loud.'
    ],
    diary: [
      'March. Plate 114: a smudge moving against the stars. I checked it three nights running. I KNEW.',
      'April. The Royal Society letter came addressed to him. “Vale’s Comet.” I went for a long walk on the cliff.'
    ],
    relations: {
      jasper: 'Edmund’s rival. You suspect Edmund stole from him too. He might be the only ally you have.',
      kitty: 'The photographer keeps asking you questions. You don’t know whether she is a friend or a danger.',
      seraphine: 'A spiritualist. You think she is a fraud and you can’t stop yourself saying so.'
    },
    ask: ['What exactly did you find in the logbook tonight, Miss Marsh?', 'What is in your handbag?', 'Did the Professor treat you fairly?'],
    beats: {
      1: 'At dinner, correct somebody’s fact about the stars. Then apologise far too much.',
      2: 'When the doctor gives his time of death, write it down in your notebook. Very visibly.',
      3: 'Find Jasper and tell him, in a whisper, what you saw at 11.15. Watch his face.',
      4: 'If the logbook clue comes out, tell the room about the crossed sevens. This is your moment.',
      5: 'Read back to the room the most important thing you wrote in your notebook tonight.'
    },
    sightline: 'Jasper Crane leaving the study at 11.15 with something under his jacket.'
  },
  {
    key: 'honoria', gender: 'F', name: 'Lady Honoria Larkspur', archetype: 'The Patron',
    public: 'The rich patron whose family fund built the observatory and still pays for it. Mad about horse racing. Owns half the county and talks as if she owns the rest.',
    costume: 'Pearls, a fur stole (real or not), a brooch, and the racing pages folded in your handbag.',
    voice: 'Grand, loud and confident. Everything is a wager. You call the men by their surnames.',
    entrance: 'Evening, everyone. Ten guineas says that wretched dome is colder than my sister’s welcome. Who’ll take the bet?',
    mannerisms: [
      'Offer to bet on everything: the time, the weather, who is lying.',
      'Mention your family’s fund at least once every conversation. “My fund.” “My observatory.”',
      'Drum your fingers when anyone mentions money.'
    ],
    secret: '£4,000 is missing from the Larkspur Fund. You took it to buy a racehorse called Shooting Star, then crossed out the entry in the ledger so that it would look like Edmund’s doing. He found out. He said he would mention it at midnight, at his toast to honesty.',
    defend: 'If the ledger comes up, say “Edmund was hopeless with figures. I shall have the accountants look at it on Monday,” and offer someone a drink.',
    danger: 'You had the second best reason in the house to want Edmund silent before midnight.',
    where: 'The terrace, 11.30 p.m. to midnight.',
    claim: 'You were on the terrace with Angus McBride, setting up rockets to celebrate the meteor shower. Angus will vouch for you.',
    truth: 'You were on the terrace with Angus from 11.30, that is quite true, and he never left your sight. At about 11.30, through the hall window, you saw Dr Pryce cross the hall from the kitchen towards the study, carrying a glass of water carefully in front of him, “like a waiter”.',
    saw: 'Dr Pryce, about 11.30, crossing the hall from the kitchen with a glass of water.',
    goals: [
      'Get at least three different people to bet on something with you (anything, any stake).',
      'Keep your racehorse a secret all night.',
      'Decide whether Angus deserves his job back. If he does, give it to him, in front of everyone.'
    ],
    diary: [
      'Ascot. Shooting Star by four lengths. Worth every penny of somebody else’s money.',
      'Edmund rang. “We must talk about the ledger before Friday, Honoria.” I hung up on him.'
    ],
    relations: {
      angus: 'The groundskeeper. Handsome, useful and sacked today. You spent the evening with him and he owes you.',
      bridie: 'The parlourmaid. Far too observant for a parlourmaid. Tip her generously and keep her sweet.',
      kitty: 'A magazine photographer. Never, ever let her photograph your handbag.'
    },
    ask: ['How much money is in the Larkspur Fund, Lady Honoria?', 'What did you see from the terrace?', 'Do you like horses?'],
    beats: {
      1: 'At dinner, bet somebody that the Professor won’t come down for his own toast.',
      2: 'When the body is found, say loudly that this would never have happened if he’d listened to you.',
      3: 'Somebody may read out a page of your ledger. Blame Edmund, then bet them they can’t prove otherwise.',
      4: 'Offer Angus his job back, or tell him plainly why you won’t.',
      5: 'Before the vote, bet the whole table on who did it. Name your odds.'
    },
    sightline: 'Dr Pryce carrying a glass of water across the hall at 11.30.'
  },
  {
    key: 'agnes', gender: 'F', name: 'Mrs Agnes Dunlop', archetype: 'The Cook',
    public: 'The cook at Larkspur these twelve years. From Glasgow. Warm, sharp-tongued and afraid of nobody, least of all her employers.',
    costume: 'An apron over your best dress. A rolling pin or a wooden spoon if you can find one. Flour on your sleeve.',
    voice: 'Broad Glasgow, quick and cheeky. You call everybody “hen” or “son”. Nobody frightens you.',
    entrance: 'Right, I’ll say this once: nobody touches my trifle till the Professor’s made his toast. Sit yourselves down.',
    mannerisms: [
      'Offer everybody food, constantly. Real or imaginary.',
      'Tut loudly whenever anyone lies. You can always tell.',
      'Never sit down for long. There’s always something on the stove.'
    ],
    secret: 'Edmund “borrowed” your £340 life savings last winter and left an IOU in your tin. And Madame Seraphine is really your sister, Sadie Briggs, from Glasgow. The two of you planned a fake seance tonight where “the spirits” would order Edmund to pay you back.',
    defend: 'If anyone mentions money or your tin, fold your arms and say “My savings are my own business, thank you very much.” If anyone links you to Seraphine, laugh: “Her? I’ve never set eyes on her before tonight.”',
    danger: 'At 12.05 you carried cocoa to the study and found the body. The finder is always the first one they suspect.',
    where: 'The kitchen, all evening.',
    claim: 'You were in your kitchen making the cocoa, as you are every night. Nobody came in. You found him at five past twelve.',
    truth: 'You were in the kitchen making cocoa. At 11.30 Dr Pryce came in for a glass of water and a teaspoon, and took the brown jar of bicarbonate of soda off your shelf, “for the Professor’s indigestion”. He said not to trouble you. At 12.05 you carried the cocoa to the study and found Edmund dead in his armchair.',
    saw: 'Dr Pryce took the brown jar of bicarbonate, a glass of water and a teaspoon from your kitchen at 11.30.',
    goals: [
      'Never let anybody discover that Madame Seraphine is your sister.',
      'Get your IOU back from wherever it has ended up.',
      'Make at least one person eat or drink something you “cooked” (snacks count).'
    ],
    diary: [
      'Nov. Himself came down to the kitchen all smiles. “Just till the spring, Agnes.” It’s August.',
      'Our Sadie’s coming up on the Tuesday train. The turban’s in her suitcase. God help us all.'
    ],
    relations: {
      seraphine: 'Your sister Sadie, playing a medium. Help her, protect her, and for heaven’s sake don’t laugh during the seance.',
      pryce: 'The doctor is always in and out of your kitchen. Friendly enough. Likes his biscuits.',
      bridie: 'Your parlourmaid. A good girl, but she reads letters she shouldn’t. You keep an eye on her.'
    },
    ask: ['Who came into your kitchen tonight, Mrs Dunlop?', 'How much does a cook earn at Larkspur?', 'What did you see when you opened the study door?'],
    beats: {
      1: 'Serve something to someone during dinner, real or pretend, and insist they finish it.',
      2: 'You find the body. When the host says so, scream, or stand up and announce it in your own words.',
      3: 'Somebody may read out what’s in your savings tin. Get angry. Very angry. At the dead man.',
      4: 'During the seance, help your sister without anyone noticing. Gasp at the right moments.',
      5: 'Before the vote, tell the room exactly who came into your kitchen tonight, and when.'
    },
    sightline: 'Dr Pryce in the kitchen at 11.30 taking the bicarbonate jar, a glass and a spoon.'
  },
  {
    key: 'kitty', gender: 'F', name: 'Kitty Fairweather', archetype: 'The Photographer',
    public: 'A glamorous photographer from Picture Post magazine, here to shoot the meteor shower over Larkspur. Knows everybody in London.',
    costume: 'A trench coat or smart jacket, red lipstick, and a camera round your neck (a phone will do).',
    voice: 'Bright, quick and London. Every sentence sounds like a caption. You call everyone by their first name at once.',
    entrance: 'Don’t move, darling, the light’s gorgeous. There. You’ll be in Picture Post on Thursday.',
    mannerisms: [
      'Pretend to take photographs of people at awkward moments. Say “Click!”',
      'Write down quotes in a little notepad and read the juiciest ones back.',
      'Ask everyone the same question: “And what do you really think of the Professor?”'
    ],
    secret: 'You are not really here for the meteors. You are writing an exposé called The Stargazer Who Stole the Stars, and Jasper Crane is your secret source.',
    defend: 'If anyone asks what you are really writing, say “Shooting stars, darling. Strictly the sky,” and take their photograph.',
    danger: 'You came here to destroy the Professor’s reputation. Somebody may think you came to do more than that.',
    where: 'The terrace, 11.30 to 11.50 p.m.',
    claim: 'You were on the terrace with your camera, taking pictures of the meteors. Lady Honoria and the groundskeeper were there too.',
    truth: 'You were on the terrace from 11.30 to 11.50 taking a single twenty-minute exposure of the meteors over the west wing of the house. The camera was pointing straight at the lit study window the whole time. You haven’t developed the plate yet.',
    saw: 'Your camera’s shutter was open from 11.30 to 11.50, pointing at the house. Whatever happened in the lit windows is on the plate. In Round V you will be given the developed print.',
    goals: [
      'Collect three juicy quotes for your story and write them on a notepad (real paper).',
      'Develop your photograph, then choose the perfect moment to reveal it.',
      'Never name your source. Not even under oath, if you can wriggle out of it.'
    ],
    diary: [
      'The Stargazer Who Stole the Stars. Two thousand words, pictures across four pages. Editor says yes if I can prove it.',
      'J.C. says the 1948 notebook is in the study, second shelf. Tonight, then.'
    ],
    relations: {
      jasper: 'Your secret source. Protect him in public, squeeze him for the story in private.',
      celia: 'The wife. Gorgeous, unhappy and hiding something. You’d love to know what.',
      olive: 'The assistant. You suspect she knows more about Edmund’s discoveries than anyone.'
    },
    ask: ['Why is Picture Post really interested in Larkspur, Miss Fairweather?', 'What did your camera see tonight?', 'Who told you to come here?'],
    beats: {
      1: 'Take everyone’s picture at dinner. Make each person pose in character.',
      2: 'When the body is found, reach for your camera first and your manners second.',
      3: 'Corner somebody and get a quote you can use. Write it down where they can see.',
      4: 'Your print is ready. Keep it until the moment it will do the most damage, then read it out.',
      5: 'Before the vote, hold up your notepad and read the best quote of the night.'
    },
    sightline: 'A twenty-minute exposure of the lit study window, 11.30 to 11.50.'
  },
  {
    key: 'seraphine', gender: 'F', name: 'Madame Seraphine', archetype: 'The Spiritualist',
    public: 'A celebrated medium “from Budapest”, engaged by Mrs Vale for a midnight seance. Speaks to the departed. Charges by the hour.',
    costume: 'A turban or headscarf, a shawl, rings on every finger. A crystal ball (any round thing) if you have one.',
    voice: 'A thick, wobbly “Hungarian” accent that slips back to Glasgow when you’re cross. Keep it going all night.',
    entrance: 'Good evening. The spirits are very restless in this house. Very. Restless. Somebody here has a guilty heart.',
    mannerisms: [
      'Close your eyes and “feel the vibrations” whenever someone tells a lie.',
      'Talk to an invisible spirit called “Little Ferenc”, who whispers things to you.',
      'Shiver dramatically whenever anyone mentions the study.'
    ],
    secret: 'You are not from Budapest. You are Sadie Briggs, from Glasgow, the cook’s sister, and you have never seen a ghost in your life. You and Agnes planned tonight’s seance so that “the spirits” would order the Professor to repay her savings.',
    defend: 'If anyone doubts you, say “The spirits forgive you, darlink,” and hum ominously. Never, ever drop the accent.',
    danger: 'You were hiding in the ballroom, next to the study, at the time that matters. If you admit it, everyone will want to know why.',
    where: 'The ballroom, from 11.15 p.m.',
    claim: 'You were in your room meditating, preparing yourself for the seance. The spirits need silence.',
    truth: 'At 11.20 you were hidden under the dust sheets in the ballroom, rigging “ghost lights” with fishing line, a torch and glow paint. Through the connecting door to the study you heard Edmund say, clear as a bell: “At midnight, Hugh, I tell them your diploma is a forgery. Honesty, remember.”',
    saw: 'At 11.20 you heard Edmund, in the study, tell “Hugh” that at midnight he would reveal Hugh’s diploma was a forgery.',
    goals: [
      'Hold your seance at the start of Round V (The House at Midnight), with the lights low and everyone’s hands on the table.',
      'Keep your accent going all night, even when you are cross.',
      'Help your sister get her money back.'
    ],
    diary: [
      'Bought the turban in Argyle Street. Practised “darlink” on the train. A man gave me his seat.',
      'Agnes says the doctor and the Professor are thick as thieves. We’ll see what the spirits make of that.'
    ],
    relations: {
      agnes: 'The cook is your sister. Nobody must know. Treat her like a servant in public; it hurts you both.',
      olive: 'The assistant keeps calling you a fraud. Curse her, mysteriously.',
      pryce: 'A doctor. Men of science never believe in the spirits. You know something about him that nobody else does.'
    },
    ask: ['Where in Budapest are you from, Madame?', 'What do the spirits say about the Professor?', 'Where were you at twenty past eleven?'],
    beats: {
      1: 'At dinner, announce that the spirits have a message for someone at the table. Choose them carefully.',
      2: 'When the body is found, say you “felt it happen”. Shiver.',
      3: 'Hint that the spirits know about a forgery. Don’t say who. Yet.',
      4: 'Hold your seance now. Lights low. Then deliver the overheard words as a message from beyond.',
      5: 'Before the vote, the spirits name the killer through you. Be dramatic. You may be wrong.'
    },
    sightline: 'Edmund threatening “Hugh” about a forged diploma, at 11.20, through the ballroom door.'
  },
  {
    key: 'bridie', gender: 'F', name: 'Bridie Fenwick', archetype: 'The Parlourmaid',
    public: 'The parlourmaid at Larkspur. Nineteen, quick, quiet, and everywhere at once. Nobody notices her, which is exactly how she likes it.',
    costume: 'A black dress with a white apron, or a plain dark dress and a little white collar. A duster in your pocket.',
    voice: 'Soft Highland voice. “Yes, madam. No, sir.” Very polite, very fast, eyes down, ears open.',
    entrance: 'Good evening, madam, sir. May I take your coat? Mind the step, it’s been wet all day.',
    mannerisms: [
      'Offer to take things from people: coats, glasses, plates. Then keep them a little too long.',
      'Listen to every conversation you pass. Pretend to dust nearby.',
      'Curtsey whenever Lady Honoria speaks to you, a little too low.'
    ],
    secret: 'You married Angus McBride, the groundskeeper, at Oban registry office in June, and nobody knows. And for weeks you have been steaming open the Professor’s letters, to find out whether he meant to sack your husband. Last week you read one from Edinburgh University that said they “hold no record” of somebody qualifying. The name was on the torn half.',
    defend: 'If anyone mentions the letters, go pink and say “I only ever take the post up, sir. I never read a word of it.” If anyone mentions Angus, say “Mr McBride? He’s very kind to everybody.”',
    danger: 'A bundle of the Professor’s letters, steamed open and stuck down again, is hidden in your apron pocket. If somebody finds it, you look like a spy.',
    where: 'Up and down the house, 11.30 to midnight.',
    claim: 'You were in the servants’ hall polishing the silver for tomorrow, and you didn’t see a thing.',
    truth: 'At 11.50 you went into the card room to bank up the fire. Dr Pryce had been playing patience there after dinner. Now the game lay on the table, half finished, with the chair pushed back, and there was nobody in the room.',
    saw: 'At 11.50 the card room was empty: a half-finished game of patience, the chair pushed back, no Dr Pryce.',
    goals: [
      'Keep your marriage to Angus secret until Round V (The House at Midnight).',
      'Get Angus his job back, by persuading Lady Honoria or anyone else with the power to give it.',
      'Get the Professor’s letters out of your apron and into someone else’s hands without them knowing where they came from.'
    ],
    diary: [
      'June. Mrs Bridget McBride. I wrote it on the back of my hand and scrubbed it off before tea.',
      'Letter from Edinburgh: “We regret that we hold no record of a Dr ______ qualifying in 1925.” Torn. Why would he keep half a letter?'
    ],
    relations: {
      angus: 'Your husband, though nobody knows it. Sacked today. You are furious with the Professor on his behalf.',
      honoria: 'Lady Honoria’s fund pays half the wages in this house. Be charming. Be useful. Get Angus’s job back.',
      agnes: 'The cook is like a mother to you, and she knows you read letters. She won’t tell. Probably.'
    },
    ask: ['Where were you at ten to twelve, Bridie?', 'Do you ever read the post you carry up?', 'Who in this house is kindest to you?'],
    beats: {
      1: 'Take someone’s glass at dinner before they have finished it. Apologise. Keep it.',
      2: 'When the body is found, you are the one who tries to telephone for help. The line is dead. Tell the room.',
      3: 'Somebody may read out a clue about letters in an apron. Deny it, blush, then blame someone else.',
      4: 'Now is the time to tell somebody, quietly, what you saw in the card room at ten to twelve. Choose wisely.',
      5: 'Before the vote, curtsey, and tell the room one thing a maid sees that the gentry never notice.'
    },
    sightline: 'The empty card room at 11.50: patience half laid out, no doctor.'
  },
  // ------------------------------------------------------------------ THE GENTLEMEN
  {
    key: 'pryce', gender: 'M', name: 'Dr Hugh Pryce', archetype: 'The Doctor',
    public: 'The jolly local doctor and the Professor’s oldest friend. Everybody’s favourite guest. Never without a pack of cards in his pocket, and wears his bowler hat indoors and out.',
    costume: 'A bowler hat and a dark suit. A doctor’s bag if you can find one. A pack of cards in your pocket.',
    voice: 'Hearty, warm, Edinburgh. Laughs at his own jokes. Says “old thing” and “my dear” a great deal.',
    entrance: 'Evening, all! Take two of these cards and don’t tell me what they are. I’m a doctor. I can tell when people are lying.',
    mannerisms: [
      'Shuffle a pack of cards whenever you are thinking.',
      'Take people’s pulse “for fun” while they talk to you.',
      'Clap people on the shoulder and say “Steady on, old thing.”'
    ],
    secret: 'You are not a real doctor. You failed your final examinations at Edinburgh in 1925 and forged your diploma, and you have been practising ever since. Edmund found out. You also owe him £900 from cards. At midnight, at his toast to honesty, he was going to tell everyone.',
    defend: 'If anyone questions your qualifications, roar with laughter: “Edinburgh, class of 1925, my dear. Ask anyone.” Then offer to take their pulse.',
    danger: 'Everything. Read your sealed page.',
    where: 'The card room, 11 p.m. to midnight. Or so you say.',
    claim: 'You were in the card room from eleven until midnight playing patience by yourself. You heard nothing and saw nothing.',
    truth: 'You were not in the card room the whole time. Read your sealed page, alone, where nobody can see the screen.',
    saw: 'When you “examined” the body you told everybody he died of his heart at about eleven o’clock. Keep everyone believing it.',
    goals: [
      'Get someone else accused. Jasper Crane would be ideal.',
      'Keep everyone believing the Professor died at about eleven o’clock.',
      'Win at least one hand of cards during the evening (any game, any opponent).'
    ],
    diary: [
      'Edmund at the club: “I wrote to Edinburgh, Hugh. Just curious.” He smiled. I didn’t.',
      'The larkspur in the walled garden is going to seed beautifully this year. Must remember my gloves.'
    ],
    relations: {
      celia: 'Edmund’s wife. Charming. You have always rather liked her. She trusts you completely.',
      jasper: 'The bitter rival. The perfect suspect. Be kind to his face.',
      agnes: 'The cook. Her kitchen is always open to you. Make sure she remembers you as a friend.'
    },
    ask: ['How did the Professor die, Doctor?', 'Where did you study medicine?', 'Where exactly were you between eleven and midnight?'],
    beats: {
      1: 'Lead the laughter at dinner. Tell a joke. Do a card trick for somebody.',
      2: 'When the body is found, examine him in front of everyone. Announce: “His heart gave out at about eleven o’clock, poor fellow.”',
      3: 'Steer the table towards Jasper Crane. Gently. A doctor is only concerned.',
      4: 'If anyone mentions a forgery, make a joke of it. Then quietly ask who they heard it from.',
      5: 'Before the vote, make a heartfelt speech about your oldest friend, and who you are sure did this.'
    },
    sightline: 'The time of death. You chose it.'
  },
  {
    key: 'jasper', gender: 'M', name: 'Jasper Crane', archetype: 'The Rival',
    public: 'A rival astronomer from Glasgow University. Rumpled, bitter and very funny with it. He and the Professor have been at war in the journals for years.',
    costume: 'A crumpled tweed jacket, an untied bow tie hanging round your neck, and something square and flat buttoned inside your jacket.',
    voice: 'Dry, sarcastic and clever. Every compliment has a knife in it. You laugh at your own bitterness.',
    entrance: 'Ah, Larkspur. The only observatory in Scotland built entirely out of other people’s work. Lovely to be back.',
    mannerisms: [
      'Pat your jacket pocket whenever anyone mentions the study. Stop when you notice.',
      'Make a sarcastic remark about the Professor’s “discoveries” every chance you get.',
      'Refuse to sit in any armchair. Stand, or perch on the arm.'
    ],
    secret: 'Edmund stole your discovery, the Lorn Variable star, straight out of your 1948 notebook, and published it as his own. You came tonight to steal the notebook back. You have it now, buttoned inside your jacket.',
    defend: 'If anyone asks what is in your jacket, say “My heart, dear lady, such as it is,” and change the subject.',
    danger: 'You were in the room where he died, and someone saw you leave it. You are the obvious suspect, and you know it.',
    where: 'The study, 11.05 to 11.15 p.m.',
    claim: 'You were out on the cliff path having a cigarette and a sulk, from about eleven until the cocoa came round.',
    truth: 'You crept into the study at 11.05 to find your notebook. When Edmund came in you hid behind the curtains, and you slipped out at 11.15 with the notebook under your jacket. Before you left you noticed two things: the brandy decanter on the side table was full, and the desk was bare: no jar, no glass, no spoon.',
    saw: 'At 11.15 the brandy decanter in the study was full, and Edmund’s desk was bare: no jar, no glass, no spoon.',
    goals: [
      'Keep the 1948 notebook hidden until Round V (The House at Midnight).',
      'Win Olive Marsh and Kitty Fairweather to your side.',
      'Make the whole table laugh at least once.'
    ],
    diary: [
      '1948. Lorn Variable: period 3.1 days. My best work. Showed it to Edmund over whisky. Idiot.',
      '1951. “Vale’s Variable.” Royal Society medal. I bought a bottle and didn’t open it.'
    ],
    relations: {
      olive: 'The assistant. You suspect Edmund stole from her too. Together you could finish him. Well, his reputation.',
      kitty: 'The photographer is writing your story. Never let anyone see you talking to her alone.',
      pryce: 'The jolly doctor. Everybody likes him. You find him a little too jolly.'
    },
    ask: ['What’s in your jacket, Mr Crane?', 'Where were you at a quarter past eleven?', 'Do you hate the Professor?'],
    beats: {
      1: 'Propose your own toast at dinner: “To borrowed work.” See who laughs.',
      2: 'When the body is found, say something unforgivably funny. Then look genuinely shaken.',
      3: 'You will be accused tonight. Decide now how much of the truth you will tell, and when.',
      4: 'Bring out the notebook at the right moment, and tell the room what you saw on the desk.',
      5: 'Before the vote, make the closing argument for the defence. Your own.'
    },
    sightline: 'A full brandy decanter and a bare desk, 11.15.'
  },
  {
    key: 'angus', gender: 'M', name: 'Angus McBride', archetype: 'The Groundskeeper',
    public: 'The groundskeeper at Larkspur. Gruff, handsome and good with his hands. The Professor sacked him this afternoon, in the rain, in front of everybody.',
    costume: 'A wax jacket or a waistcoat, a flat cap, and a big ring of keys. Mud on your boots if you like.',
    voice: 'Low, slow Highland. Few words, and every one of them meant. You never raise your voice.',
    entrance: 'Evening. Don’t mind me. I’m only here till the end of the week, seemingly.',
    mannerisms: [
      'Jangle a set of keys when you’re thinking.',
      'Look out of the window often, as if you are expecting someone.',
      'Answer questions with as few words as possible. One word, if you can manage it.'
    ],
    secret: 'Edmund sacked you today with a week’s notice, and you threw your keys down on the wet step. You also run a small whisky-smuggling sideline: the midnight “rockets” are really flares, signalling your boat in the bay. And you married Bridie, the parlourmaid, in June. Nobody knows.',
    defend: 'If anyone mentions whisky, say “I’m a Free Kirk man, I don’t touch the stuff.” If anyone mentions Bridie, say “The maid? Good worker.”',
    danger: 'You had every reason to hate the Professor today, and you were outside all night where nobody could see you clearly.',
    where: 'The terrace, from 11.30 p.m.',
    claim: 'You were on the terrace with Lady Honoria from half past eleven, setting up rockets for the meteor shower.',
    truth: 'You were on the terrace with Lady Honoria from 11.30, true enough, and she never left your sight. At about 11.48 you saw something small and glinting fall from the dome’s roof slot into the sea. And this afternoon you found the larkspur bed in the walled garden snipped bare of its seed pods, with a handkerchief embroidered “H.P.” lying in the soil. It is in your pocket.',
    saw: 'Something small and shiny fell from the dome into the sea at about 11.48. And you have a handkerchief embroidered “H.P.” that you found in the snipped larkspur bed this afternoon.',
    goals: [
      'Fire the flares at midnight without anybody finding out about the whisky.',
      'Get your job back.',
      'Work out what fell from the dome.'
    ],
    diary: [
      'Boat in tonight, half eleven, flares at midnight. Red, red, white. Don’t be late.',
      'Bed of larkspur stripped bare. Who’d want the seeds? They’re poison. Kept the hanky.'
    ],
    relations: {
      bridie: 'Your wife, secretly. Protect her. If anyone frightens her tonight, deal with them.',
      honoria: 'Lady Honoria spent the evening with you on the terrace. She could give you your job back. Or ruin you.',
      jasper: 'The professor from Glasgow. Talks too much. You don’t trust men who talk.'
    },
    ask: ['Why were you sacked today, Mr McBride?', 'What were the rockets for?', 'What did you see from the terrace?'],
    beats: {
      1: 'Stand at the edge of the dinner. Say nothing for as long as you can. Then one devastating sentence.',
      2: 'When the body is found, go and stand by the window. Say: “Someone should look at the walled garden.”',
      3: 'Somebody may read out a note about your keys on the step. Admit it. You’re not ashamed.',
      4: 'Bring out the handkerchief, or keep it in your pocket. Your choice. It could hang a man.',
      5: 'Before the vote, say what you saw fall from the dome, and what you think it was.'
    },
    sightline: 'Something glinting falling from the dome at 11.48; the “H.P.” handkerchief in the larkspur bed.'
  }
];

// ------------------------------------------------------------------ the sealed pages
const KILLER_PAGE = {
  headline: 'YOU KILLED PROFESSOR EDMUND VALE.',
  account: [
    'This afternoon you went into the walled garden with your gloves on and snipped the larkspur bed bare of its seed pods. Larkspur seeds are poison. You dropped your handkerchief there and never noticed.',
    'At 11.20, in the study, Edmund told you to your face: “At midnight, Hugh, I tell them your diploma is a forgery. Honesty, remember.”',
    'At 11.30 you went to the kitchen for a glass of water and a teaspoon, and took the brown jar of bicarbonate of soda off the cook’s shelf, “for the Professor’s indigestion”. You stirred the crushed seeds into it.',
    'At 11.32, in the study, you gave Edmund the glass. He drank it all, thanked you, and went up to the dome.',
    'At 11.47 he came down from the dome, sat in his armchair by the fire, poured a brandy and fell asleep for good before he could drink it. You took the telephone in the card room off the hook so that nobody could ring the mainland for a real doctor.',
    'At 12.05 the cook found him. You examined him in front of everyone and said he died of his heart, at about eleven o’clock, when most of the others have no alibi.'
  ],
  rules: [
    'You may lie about anything at all, all night, even under oath. You are the only person who may.',
    'Keep the time of death at eleven o’clock. If anyone proves he was alive later, look surprised and say a doctor can be out by an hour.',
    'Somebody at this table saw you with the glass. Somebody else heard Edmund say your name. Find out who, and make them doubt themselves.',
    'You win if the vote goes against anybody else.'
  ]
};
const INNOCENT_PAGE = {
  headline: 'YOU DID NOT KILL PROFESSOR EDMUND VALE.',
  account: [
    'Somebody at this table did. You have your own secret, and every reason not to want the police looking at you too closely.',
    'You may lie about your secret and about where you were. You may never lie about a clue card you hold. If someone asks to see it, you must show it.',
    'Everyone has one oath token. When someone spends theirs on you, you must answer their one question truthfully. Only the murderer may lie under oath.',
    'Points at the end: 5 for naming the killer, 3 for the right method, 3 for the right motive, 2 for each of your goals, 2 for the time of the fatal dose, 2 for the exhibit that proves it, 1 for each of Corvin’s whispers you carry out, and 3 for the best performance of the night.'
  ],
  rules: []
};
const KILLER = 'pryce';

// ------------------------------------------------------------------ the envelopes
// act: the act in which the envelope may be opened. by: the character who reads it aloud (and holds it on their phone).
// scene: the Blender scene that goes on the big screen with it (newest render first, then older stills).
const CLUES = [
  { id: 'D1', act: 2, by: 'pryce', kind: 'statement', title: 'The doctor’s verdict', star: true,
    text: 'Dr Pryce, kneeling by the armchair: “His heart gave out at about eleven o’clock, poor fellow. Nothing anybody could have done.”',
    scene: ['N3_the_discovery', 'armchair'] },
  { id: 'D2', act: 2, by: 'agnes', kind: 'report', title: 'The brandy glass',
    text: 'His brandy has been poured, but not a drop has been drunk: the glass is full to the brim. The decanter is down by exactly one glass.',
    scene: ['05_his_chair', 'armchair'] },
  { id: 'D3', act: 2, by: 'bridie', kind: 'report', title: 'The telephone', star: true,
    text: 'The telephone in the card room is off the hook. The line to the mainland is dead. Nobody can ring for a doctor, or the police, until morning.',
    scene: ['10_card_table', 'v_phone'] },

  { id: 'R2-1', act: 3, by: 'olive', kind: 'report', title: 'A gap on the shelf',
    text: 'A gap on the study shelf where a notebook marked 1948 used to stand. Beside it, the Professor’s famous paper on “Vale’s Variable” star, with exactly the same curve drawn in it.',
    scene: ['06_the_rival', 'v_rival'] },
  { id: 'R2-2', act: 3, by: 'jasper', kind: 'report', title: 'The comet plate',
    text: 'A glass photographic plate of last spring’s comet. In the corner, “O. Marsh” has been scratched out, and “E. Vale” written over it in red ink.',
    scene: ['07_the_comet', 'v_comet'] },
  { id: 'R2-3', act: 3, by: 'kitty', kind: 'ledger', title: 'The fund ledger',
    text: 'A page from the Larkspur Fund ledger: “£4,000 withdrawn.” The entry has been struck through in a different ink.',
    scene: ['08_the_ledger', 'v_ledger'] },
  { id: 'R2-4', act: 3, by: 'celia', kind: 'letter', title: 'Keys on the step',
    text: 'A big ring of estate keys lying on the wet front step, with a note in the Professor’s hand: “One week’s notice. E.V.”',
    scene: ['09_the_keys', 'v_keys'] },
  { id: 'R2-5', act: 3, by: 'honoria', kind: 'letter', title: 'An IOU', star: true,
    text: 'From the Professor’s desk drawer: a card-room IOU. “Owed to E. Vale, £900, gaming debts. H. Pryce.”',
    scene: ['10_card_table', 'v_phone'] },
  { id: 'R2-6', act: 3, by: 'angus', kind: 'report', title: 'The savings tin',
    text: 'The cook’s savings tin from the kitchen dresser, empty except for a slip of paper: “Loan, £340. E.V.”',
    scene: ['11_the_tin', 'v_tin'] },
  { id: 'R2-7', act: 3, by: 'agnes', kind: 'report', title: 'In the main bedroom',
    text: 'In the main bedroom: a suitcase, packed and strapped. Tucked in the lid, a ticket for the 6 a.m. boat to Oban and the boat train to Paris, tomorrow.',
    scene: ['N5_packed_suitcase', 'F_bedroom'] },
  { id: 'R2-8', act: 3, by: 'seraphine', kind: 'lab', title: 'The walled garden', star: true,
    text: 'The larkspur bed in the walled garden has been snipped bare of its seed pods. Every part of the larkspur plant is poisonous. The seeds most of all.',
    scene: ['N4_walled_garden'] },
  { id: 'R2-9', act: 3, by: 'pryce', kind: 'letter', title: 'Letters in an apron',
    text: 'In the pocket of a maid’s apron hanging in the servants’ hall: a bundle of the Professor’s letters, every one steamed open and stuck down again.',
    scene: ['LH_servants_hall', 'C_kitchen'] },

  { id: 'R3-1', act: 4, by: 'olive', kind: 'report', title: 'The dome logbook', star: true,
    text: 'The observing logbook in the dome. The last entry reads: “12 Aug. 23:40. Perseids, 57 per hr. Seeing 7.” The sevens are crossed.',
    scene: ['N7_the_logbook'] },
  { id: 'R3-2', act: 4, by: 'jasper', kind: 'lab', title: 'The brown jar', star: true,
    text: 'Pushed behind the books at the back of the study desk: the brown jar from the kitchen, labelled “Bicarbonate of Soda” in the cook’s writing. Dark seeds are mixed through the white powder. A teaspoon and an empty water glass stand beside it.',
    scene: ['N8_the_brown_jar', 'A_study_desk'] },
  { id: 'R3-3', act: 4, by: 'kitty', kind: 'photo', title: 'The developed print', star: true,
    text: 'Kitty’s twenty-minute exposure, developed in the darkroom. Meteors streak across the sky over the west wing. In the lit study window, two faint, ghostly figures: one raising a glass to his lips, the other wearing a bowler hat.',
    scene: ['N9_the_photograph', 'E_darkroom'] },
  { id: 'R3-4', act: 4, by: 'celia', kind: 'letter', title: 'A torn page', star: true,
    text: 'Torn from a printed list, found in the Professor’s blotter: “University of Edinburgh. Final Examinations, 1925. Pryce, H. ....... FAIL.”',
    scene: ['N10_the_confession'] },
  { id: 'R3-5', act: 4, by: 'pryce', kind: 'report', title: 'Under the dust sheets',
    text: 'Under the dust sheets in the ballroom: a reel of fishing line, an electric torch and a tin of luminous paint.',
    scene: ['12_ballroom', 'ballroom'] },
  { id: 'R3-6', act: 4, by: 'honoria', kind: 'report', title: 'Behind the balustrade',
    text: 'Behind the terrace balustrade: a crate of unlabelled whisky bottles and a box of red signal flares.',
    scene: ['D_terrace'] },
  { id: 'R3-7', act: 4, by: 'agnes', kind: 'letter', title: 'A bloodstock receipt',
    text: 'A bloodstock receipt, folded small: “Shooting Star, chestnut colt. Purchased for £4,000. Lady H.L.”',
    scene: ['08_the_ledger', 'v_ledger'] },
  { id: 'R3-8', act: 4, by: 'bridie', kind: 'report', title: 'The receiver', star: true,
    text: 'In the card room, the telephone receiver lies off its cradle. A playing card, the ace of spades, has been wedged under the hook to keep the line dead. The pack on the patience table is complete: this ace has a different back.',
    scene: ['LH_card_room', '10_card_table'] }
];

const BRIEF = {
  kind: 'brief',
  title: 'LARKSPUR HOUSE — ARGYLL',
  sub: 'Tuesday 12th August 1952 · The night of the Perseids',
  body: [
    'Professor Edmund Vale, astronomer, has gathered his household and his guests to watch the finest meteor shower in a generation from his clifftop observatory.',
    'He has promised a toast at midnight. “To honesty,” he says. “Some of us will need a great deal of it.”',
    'The house stands alone on the cliff. The nearest police are across the water in Oban. The telephone is the only way to reach them.',
    'Ten people under one roof. Ten secrets. And somewhere above them, in the dark of the dome, a raven that nobody has ever seen clearly.'
  ]
};

// ------------------------------------------------------------------ the evening
// script: Corvin reads it aloud. host: what to press. phone: what everyone does now. orders: party challenges for the host to set.
const ACTS = [
  { n: 'I', title: 'The Arrival', scene: ['N1_title_card', '01_exterior', 'exterior'],
    script: 'I am Corvin. You will not see me; nobody ever does. A shape on the chimney pots, a wingbeat in the dark. I live in the dome, and I see everything. It is the twelfth of August, 1952, the night of the Perseids. Tonight the Professor has promised honesty at midnight. Ravens know that honesty is the most dangerous thing you can promise. Let us meet the guests.',
    host: 'Press “Introduce the guests”. As each card fills the screen, that guest stands and says their opening line, in character.',
    phone: 'When your card is on the big screen, stand up and say your opening line. It’s on the Part tab.',
    orders: [] },
  { n: 'II', title: 'Dinner', scene: ['N2_the_toast', '02_dining', 'dining'],
    script: 'Dinner is served. Salmon, candles, and a great deal of polite hatred. The Professor is up in his dome with his stars and will not come down, so his chair at the head of the table stays empty. Raise your glasses for him anyway. To honesty.',
    host: 'Let dinner run. Set the party challenges below one at a time. Tap “Corvin interrupts” whenever the table goes quiet.',
    phone: 'Mingle in character. Chase your goals. Choose your alibi from the four on the Midnight tab.',
    orders: [
      { k: 'The toast', t: 'Everyone raise a glass, any drink will do. The host gives the Professor’s toast: “To honesty. Some of us will need a great deal of it at midnight.” Everybody watches who is slow to drink.' },
      { k: 'Least trusted', t: 'Everyone writes, in secret, the name of the guest they trust least on a scrap of paper. Fold it and keep it. You will open them all at the very end.' },
      { k: 'Whispers', t: 'Each guest whispers one true fact from their dossier to the guest on their left. The listener decides whether to repeat it to the room. The murderer may whisper a lie.' }
    ] },
  { n: 'III', title: 'The Discovery', scene: ['N3_the_discovery', '05_his_chair', 'armchair'],
    script: 'Lights down, please. At five past midnight, the cook carried a tray of cocoa to the study. The Professor was in his armchair by the fire, his brandy poured and untouched. He did not wake up.',
    host: 'Dim the lights if you can. Mrs Dunlop announces the body. Then open the three envelopes, one at a time: the doctor’s verdict, the brandy glass, the telephone.',
    phone: 'Stay in character. Choose your alibi on the Midnight tab: it locks when round IV begins. Read your envelope aloud when the screen says so.',
    orders: [
      { k: 'Turn out your pockets', t: 'The house is a crime scene. Every guest turns out their pockets and handbag onto the table, in character. Anyone may refuse, but the whole table will remember who did.' },
      { k: 'Nobody leaves', t: 'Bridie reports the telephone is dead. The host declares the house sealed until morning: from now on nobody may leave the room without saying where they are going and why.' },
      { k: 'Where were you?', t: 'Go round the table. Each guest stands and says, in one sentence, where they were between half past eleven and midnight. Use “What you tell people”. Anyone may fire ONE question after each answer.' }
    ] },
  { n: 'IV', title: 'Everyone Had a Reason', scene: ['04_library', 'library'],
    script: 'Nobody can leave. The telephone is dead and the boat does not come until morning. While you wait, the house gives up its secrets, one envelope at a time. Every one of you had a reason. Only one of you did it.',
    host: 'Open the envelopes one by one. Each one goes to its guest’s phone and they read it aloud. Between envelopes, put somebody in the hot seat, or set a challenge.',
    phone: 'Your envelope arrives on the Clues tab. Read it aloud when the screen shows your name. Question each other in pairs.',
    orders: [
      { k: 'Split interrogation', t: 'Pick two guests whose stories touch. One leaves the room. Ask the other three questions: what was on the table, who spoke first, what time it was. Bring the first back and ask the same three. Every difference is a crack.' },
      { k: 'Swap seats', t: 'Everyone stands up and swaps seats with the guest they trust least. Tell them why, in character.' },
      { k: 'The reconstruction', t: 'Inspectors walked the scene. Mark the corners of the room as the study, the kitchen, the terrace and the dome. The host calls out “Half past eleven”, “A quarter to twelve”, “Five past twelve”. At each time every guest walks to where they claim to have been. Anyone who should have seen someone else, and didn’t, must say so.' },
      { k: 'The timeline', t: 'Together, the table builds the night on a sheet of paper: every time anyone has mentioned, in order, from dinner to the cocoa. Leave a gap wherever nobody can account for the Professor.' },
      { k: 'Best liar', t: 'On three, everyone points at the guest who has told the most convincing story so far, true or not. Most fingers takes a bow.' }
    ] },
  { n: 'V', title: 'The House at Midnight', scene: ['N6_the_seance', '12_ballroom', 'ballroom'],
    script: 'It is very late. The dust sheets in the ballroom stir in a draught that should not be there. Madame Seraphine says the spirits are ready to speak. Then the last envelopes will be opened, and the darkroom will give up its photograph.',
    host: 'Press “The seance” first: lights low, hands on the table. Then open the last envelopes. Remind everyone they can spend their oath token now.',
    phone: 'Hands on the table for the seance. Then read your envelope when your name comes up. Spend your oath token if you need the truth.',
    orders: [
      { k: 'Lights out', t: 'If it’s safe, dim the lights for thirty seconds. When they come back on, on the count of three, everyone points at their prime suspect at once. Nobody may change where they are pointing. Count the fingers.' },
      { k: 'Identity parade', t: 'The three gentlemen stand in a row by the wall. Each lady, in turn, says which of them she would least like to meet on the dome stairs at midnight, and gives one reason from tonight.' },
      { k: 'Oath tokens', t: 'Anyone with an oath token left may spend it now, from their phone. The guest they choose must answer one question truthfully. Only the murderer may lie.' }
    ],
    hint: 'Corvin whispers: “Ask yourselves who decided what time he died.”' },
  { n: 'VI', title: 'The Accusation', scene: ['04_library', 'library'],
    script: 'You have everything I have. Every clue was in plain sight. One last argument, then each of you names the killer, the method and the motive, in secret, on your own phone. The murderer votes too, and will try to hang somebody else.',
    host: 'The vote is open on every phone. Give everyone a few minutes to argue and choose. When the count is full, go on to the last act.',
    phone: 'Accuse on the Accuse tab: the killer, how, and why. Vote for the best performance too. You can change it until the seal is broken.',
    orders: [
      { k: 'Closing speeches', t: 'Each guest gets twenty seconds, standing, to say who they think did it and why. The host keeps time. Then everybody votes.' },
      { k: 'The accused speaks', t: 'Whoever has the most suspicion on them right now stands and has one minute to name the person they think really did it, and why. Nobody may interrupt.' },
      { k: 'The papers', t: 'Unfold the papers you wrote at dinner and read them out. Did anyone trust the right person least?' }
    ] },
  { n: 'VII', title: 'The Truth', scene: ['15_the_ring', 'ring'],
    script: 'The envelope was sealed the moment the dossiers went out. Nobody has seen inside it. Not even me. Well. Perhaps me. You never did see me, did you? That is rather the point of a raven.',
    host: 'Hold “Break the seal” for three seconds. Corvin tells the truth, and the scores appear.',
    phone: 'Look at the big screen.',
    orders: [] }
];

const METHODS = [
  { k: 'seeds', t: 'Larkspur seeds hidden in his indigestion powder' },
  { k: 'brandy', t: 'Poison in the brandy decanter' },
  { k: 'cocoa', t: 'Something slipped into the cocoa' },
  { k: 'blow', t: 'A blow to the head in the dome' },
  { k: 'smother', t: 'Smothered in his armchair' },
  { k: 'heart', t: 'Nobody: his heart simply gave out' }
];
const MOTIVES = [
  { k: 'diploma', t: 'To stop him revealing a forged medical diploma' },
  { k: 'fund', t: 'To stop him revealing the missing £4,000' },
  { k: 'discovery', t: 'Revenge for a stolen discovery' },
  { k: 'marriage', t: 'To escape the marriage' },
  { k: 'savings', t: 'To get back £340 of stolen savings' },
  { k: 'sacked', t: 'Revenge for being sacked' }
];

// ------------------------------------------------------------------ the truth (sealed until the end)
const SOLUTION = {
  killer: 'pryce', method: 'seeds', motive: 'diploma',
  reveal: [
    'The brandy was a red herring, and I should know: I eat herring. The Professor never touched his glass.',
    'His poison came in a spoonful of kindness, from the one man everybody trusted to tell them the time of death.',
    'Doctor Pryce, you snipped the larkspur in the walled garden and dropped your handkerchief in the soil. You took the cook’s brown jar, a glass and a spoon at half past eleven, and Lady Honoria watched you carry the glass across the hall. Kitty’s camera caught your bowler hat in the study window.',
    'You set the clock to eleven. But the Professor was writing in my dome at twenty to twelve, in his own hand, with his sevens crossed, and his wife heard him blame “the doctor’s powder” at a quarter to.',
    'A real doctor would have noticed. But then, you were never a real doctor, were you? Edinburgh, 1925. Fail.'
  ],
  proof: [
    'The time of death: Pryce said eleven. The logbook (R3-1) shows Vale alive at 11.40, Olive can swear to the crossed sevens, and Celia was with him until 11.47. Only the killer gains from a false time.',
    'The method: Agnes saw Pryce take the brown jar, water and spoon at 11.30; Honoria saw him carry the glass. The jar has seeds in it (R3-2). The larkspur pods were snipped (R2-8), and Angus has the “H.P.” handkerchief.',
    'The alibi: Bridie found the card room empty at 11.50, and the receiver was jammed with an ace of spades (R3-8). Kitty’s photograph (R3-3) puts a bowler hat in the study with Vale and his glass.',
    'The motive: Seraphine’s message from the spirits about a forged diploma, the 1925 exam list (R3-4), and the £900 IOU (R2-5).',
    'The untouched brandy (D2) clears Jasper Crane, the obvious suspect. The poison was never in the decanter.'
  ],
  last: 'As for the ring? Some secrets the sea keeps. Goodnight from Larkspur.'
};

const POINTS = { killer: 5, method: 3, motive: 3, goal: 2, best: 3, getaway: 5 };


// ---------------------------------------------------------------- four alibis per guest, chosen on the phone in round III
// The first one is the story the other guests' dossiers already fit. The other three are cover stories: riskier lies.
const ALIBIS = {
  celia: [
    { t: 'The drawing room, with the gramophone', claim: 'You were in the drawing room with a gin and the gramophone from half past eleven until the cocoa came round. You never went near the dome.', risk: 'The story your dossier was written around.' },
    { t: 'The main bedroom, packing for London', claim: 'You went up to your room at half past eleven to sort out your clothes for a trip to London next week. You heard the rockets from the terrace and nothing else.', risk: 'Risky: someone may ask why a hostess packs in the middle of her own party.' },
    { t: 'The terrace, watching the meteors', claim: 'You stood at the end of the terrace in your wrap, watching the shooting stars on your own. You counted eleven.', risk: 'Risky: three other guests say they were on the terrace. They may not remember you.' },
    { t: 'The library, looking for a book', claim: 'You were in the library looking for a novel to take to bed, and you fell asleep in the window seat until the scream.', risk: 'Risky: another guest says they were working in the library all that time.' }
  ],
  olive: [
    { t: 'The library, copying the logbook', claim: 'You were in the library copying the observatory logbook, and nobody came past except Mrs Vale’s cat.', risk: 'The story your dossier was written around.' },
    { t: 'The dome, checking the telescope', claim: 'You climbed up to the dome at half past eleven to check the telescope was tracking properly for the meteors, and came straight back down.', risk: 'Very risky: you would have to say whether you saw the Professor up there.' },
    { t: 'The kitchen, with the cook', claim: 'You were in the kitchen with Mrs Dunlop, warming some milk and talking about the weather, until about a quarter to twelve.', risk: 'Risky: the cook can say you were never there.' },
    { t: 'The drawing room, by the fire', claim: 'You were curled up by the drawing-room fire writing up your star charts in pencil. You didn’t notice who came and went.', risk: 'Risky: anyone who was in the drawing room can contradict you.' }
  ],
  honoria: [
    { t: 'The terrace, with the rockets', claim: 'You were on the terrace with Angus McBride, setting up rockets to celebrate the meteor shower. Angus will vouch for you.', risk: 'The story your dossier was written around.' },
    { t: 'The drawing room, writing letters', claim: 'You were at the bureau in the drawing room writing letters to your solicitor, from half past eleven until the commotion.', risk: 'Risky: the groundskeeper says you were with him.' },
    { t: 'The conservatory, among the orchids', claim: 'You took a candle to the conservatory to look at Edmund’s night-flowering orchids. You find them more honest than people.', risk: 'Risky: nobody can back you up, and the doors to it creak.' },
    { t: 'The hall, waiting for the telephone', claim: 'You were in the hall waiting for a trunk call from London that never came. You sat by the telephone for half an hour.', risk: 'Risky: the telephone is dead, and someone may know when it went dead.' }
  ],
  agnes: [
    { t: 'The kitchen, making the cocoa', claim: 'You were in your kitchen making the cocoa, as you are every night. Nobody came in. You found him at five past twelve.', risk: 'The story your dossier was written around.' },
    { t: 'The servants’ hall, feet up with the wireless', claim: 'You were in the servants’ hall with your feet up and a cup of tea, listening to the wireless, until it was time for the cocoa.', risk: 'Risky: the maid says she was in the servants’ hall.' },
    { t: 'The larder, counting the stores', claim: 'You were in the larder counting jars and tins for Monday’s order. You keep a list. Every jar is accounted for.', risk: 'Risky: someone may ask you about a particular jar.' },
    { t: 'The kitchen garden, fetching mint', claim: 'You went out to the kitchen garden with a lamp to fetch mint for the morning, and came in when the rockets started.', risk: 'Risky: the gardens are the groundskeeper’s, and he may say he never saw your lamp.' }
  ],
  kitty: [
    { t: 'The terrace, with a camera', claim: 'You were on the terrace with your camera, taking pictures of the meteors. Lady Honoria and the groundskeeper were there too.', risk: 'The story your dossier was written around.' },
    { t: 'The darkroom, developing plates', claim: 'You were in the darkroom under the stairs developing this afternoon’s plates. Nobody opens that door. The light would ruin everything.', risk: 'Risky: someone may ask to see what you developed.' },
    { t: 'The cliff path, alone', claim: 'You walked out along the cliff path with your camera to photograph the lighthouse under the meteors.', risk: 'Risky: another guest says they were on the cliff path.' },
    { t: 'The ballroom, photographing the dust sheets', claim: 'You were in the ballroom photographing the furniture under the dust sheets by candlelight. Ghostly. Perfect for the magazine.', risk: 'Risky: the ballroom was not as empty as you think.' }
  ],
  seraphine: [
    { t: 'A guest room, meditating', claim: 'You were in your room meditating, preparing yourself for the seance. The spirits need silence.', risk: 'The story your dossier was written around.' },
    { t: 'The walled garden, by moonlight', claim: 'You went to the walled garden to commune with the spirits of the flowers by moonlight. The garden spoke to you.', risk: 'Risky: the groundskeeper knows that garden very well.' },
    { t: 'The drawing room, reading cards', claim: 'You were in the drawing room laying out the tarot for yourself. The Tower came up three times. You knew something terrible would happen.', risk: 'Risky: anyone who was in the drawing room can say you were not.' },
    { t: 'The dome stairs, sensing a presence', claim: 'You were drawn to the foot of the dome stairs by “a cold presence” and stood there, eyes closed, for twenty minutes.', risk: 'Very risky: people went up and down those stairs. Who did you hear?' }
  ],
  bridie: [
    { t: 'The servants’ hall, polishing silver', claim: 'You were in the servants’ hall polishing the silver for tomorrow, and you didn’t see a thing.', risk: 'The story your dossier was written around.' },
    { t: 'Turning down the beds', claim: 'You were upstairs turning down the guests’ beds and filling the hot-water bottles, room by room.', risk: 'Risky: anyone who was in their room can say you never came.' },
    { t: 'The dining room, clearing up', claim: 'You were clearing the dining room after dinner and laying the table for breakfast, all on your own.', risk: 'Risky: a long job to explain. Someone may ask what you laid out.' },
    { t: 'The back door, with a young man', claim: 'You slipped out of the back door to meet a young man from the village. You’d rather nobody told the cook.', risk: 'Risky and juicy: the table will want to know his name.' }
  ],
  pryce: [
    { t: 'The card room, playing patience', claim: 'You were in the card room from eleven until midnight playing patience by yourself. You heard nothing and saw nothing.', risk: 'The story your dossier was written around.' },
    { t: 'The library, reading the newspapers', claim: 'You were in the library reading yesterday’s Times and dozing in a leather chair from eleven until the scream.', risk: 'Risky: another guest says she was working in the library.' },
    { t: 'The cliff path, a doctor’s constitutional', claim: 'You took a brisk walk along the cliff path, as you do every night. Doctor’s orders, ha ha. You came back for the cocoa.', risk: 'Risky: another guest says he was on the cliff path.' },
    { t: 'A guest room, writing up case notes', claim: 'You went up to your room to write up your case notes from the week, and came down when you heard the cook scream.', risk: 'Risky: nobody can back you up, and the stairs pass the hall.' }
  ],
  jasper: [
    { t: 'The cliff path, a cigarette and a sulk', claim: 'You were out on the cliff path having a cigarette and a sulk, from about eleven until the cocoa came round.', risk: 'The story your dossier was written around.' },
    { t: 'The billiard table, alone', claim: 'You were knocking balls about on the billiard table in the gun room, alone, trying to forget what Vale said at dinner.', risk: 'Risky: nobody heard the balls click.' },
    { t: 'The drawing room, with the decanter', claim: 'You sat in the drawing room working steadily through the whisky decanter. You can’t be expected to remember much after that.', risk: 'Risky: a drunk man makes a good suspect.' },
    { t: 'The terrace, with the rockets', claim: 'You were on the terrace watching Lady Honoria and the groundskeeper fiddle with their rockets. Very dull.', risk: 'Risky: they may say you were never there.' }
  ],
  angus: [
    { t: 'The terrace, with Lady Honoria', claim: 'You were on the terrace with Lady Honoria from half past eleven, setting up rockets for the meteor shower.', risk: 'The story your dossier was written around.' },
    { t: 'The boathouse, checking the boat', claim: 'You went down to the boathouse to check the boat was tied up properly for the morning. The sea was getting up.', risk: 'Risky: Lady Honoria says you were with her.' },
    { t: 'The walled garden, locking up', claim: 'You did your last round of the gardens, locking the walled-garden gate, from half past eleven to midnight.', risk: 'Very risky: someone may ask what state the garden was in.' },
    { t: 'The stables, with a dram', claim: 'You were in the old stables with a small dram and the dog, out of the way of the gentry.', risk: 'Risky: everyone knows you say you never touch the stuff.' }
  ]
};

// ---------------------------------------------------------------- detective work: search warrants, the laboratory, the accusation
// Every result here is TRUE to what happened at Larkspur. Some of it is a red herring: true, but about somebody's other secret.
const SEARCHES = [
  { k: 'study', t: 'The study', find: 'The fire has burned low. The Professor’s armchair still holds the shape of him. The brandy decanter on the side table is down by one glass, and his glass is full and untouched. On the desk, an empty water glass and a teaspoon, and a few grains of white powder by the blotter. His private notebook lies open with three pages freshly torn out.' },
  { k: 'kitchen', t: 'The kitchen', find: 'The cook’s shelf: flour, salt, sugar, cocoa, all labelled in her hand. Between the salt and the sugar is a gap, with a clean circle in the dust where a jar used to stand. The teaspoon drawer is one spoon short. On the dresser, the place where a tin is usually kept is empty.' },
  { k: 'cardroom', t: 'The card room', find: 'A game of patience laid out on the table, half finished, the chair pushed back. The cards are cold. The ashtray is perfectly clean: nobody has smoked in here tonight. The telephone’s receiver is off its cradle.' },
  { k: 'library', t: 'The library', find: 'Pencil copies of the observing logbook, in a neat assistant’s hand, spread across the big table. A cat asleep on the window seat. The library ladder has been moved to the astronomy shelves, and one book, on comets, lies open at last spring’s comet, with “O.M.” pencilled in the margin.' },
  { k: 'dome', t: 'The dome', find: 'Cold. The roof slot is open to the sea and the wind. The telescope points west. The observing logbook lies open on the desk, but the lamp is out and the last lines are too faint to read in the dark: someone who knows the Professor’s hand should look at it. A faint scent of a lady’s expensive perfume hangs near the stairs.' },
  { k: 'ballroom', t: 'The ballroom', find: 'Dust sheets over everything. One sheet has been dragged out of place, and small footprints in the dust lead to the connecting door into the study. That door is unlocked. Through it, every word said in the study can be heard. A faint smell of paint.' },
  { k: 'bedroom', t: 'The main bedroom', find: 'Mrs Vale’s dressing table. Her jewellery box is open, and the ring tray is empty. Under the bed, a suitcase, packed and strapped, with a Paris address on the luggage label.' },
  { k: 'servants', t: 'The servants’ hall', find: 'The silver half polished, a cloth dropped on the floor. A maid’s apron on its peg, the pocket stuffed with something papery. In a prayer book on the windowsill, a small photograph: the maid and the groundskeeper, arm in arm, outside the registry office in Oban.' },
  { k: 'terrace', t: 'The terrace', find: 'Footprints of at least three people by the balustrade, and the three round marks of a camera tripod pointing back at the house, straight at the study window. Behind the balustrade, a heavy crate, nailed shut. It clinks.' },
  { k: 'garden', t: 'The walled garden', find: 'The larkspur bed has been snipped bare. In the soft soil, the deep print of a man’s leather shoe, a town shoe, not a gardener’s boot. Beside it, a small flat hollow where something soft lay until somebody picked it up.' },
  { k: 'pryce_room', t: 'Dr Pryce’s room', find: 'His doctor’s bag: stethoscope, bandages, a pack of playing cards with the ace of spades missing. And, oddly, his framed diploma, carried with him in the bag. The frame is old; the paper inside looks oddly crisp.' },
  { k: 'hall', t: 'The front hall', find: 'Black and white tiles, the long-case clock ticking. The tall hall window looks straight out onto the terrace: anyone out there could see the whole length of the hall, from the kitchen passage to the study door. On the tiles between the two, a short trail of dried water drops, as if someone had carried a full glass very carefully.' },
  { k: 'boathouse', t: 'The boathouse', find: 'At the foot of the cliff steps. The house rowing boat is tied up and dry. But the iron mooring rings by the open sea doors have fresh rope burns on them, as if a second, bigger boat came alongside tonight. Under a tarpaulin, loose straw of the kind bottles are packed in. A tide table is pinned to the wall with “11.30” ringed in pencil.' },
  { k: 'honoria_room', t: 'Lady Honoria’s room', find: 'The racing pages spread across the bed, Ascot results ringed. On the writing desk, a lady’s writing set with a bottle of violet ink, nearly empty. A photograph in a silver frame: a chestnut colt, with “S.S.” written on the back.' },
  { k: 'kitty_room', t: 'Miss Fairweather’s room', find: 'A typewriter with a page still in it: “THE STARGAZER WHO STOLE THE STARS, by our special correspondent.” Below the title, notes: “Source J.C. — 1948 notebook, study, 2nd shelf.” Spare plate holders on the bed. The darkroom key is gone from its hook.' },
  { k: 'seraphine_room', t: 'Madame Seraphine’s room', find: 'A crystal ball that turns out to be a glass fishing float. A Glasgow Corporation tram ticket fallen out of a coat pocket. In the drawer, a postcard: “Dear Sadie, come up on the Tuesday train, he’ll be at his toast by midnight. Love, your Aggie.”' },
  { k: 'crane_room', t: 'Mr Crane’s room', find: 'His overcoat hangs on the door. It is perfectly dry, and there is no mud on his shoes. Whoever wore these tonight did not walk the cliff path tonight: after a day of rain it is mud from end to end.' }
];
const LAB = [
  { k: 'brandy', t: 'The brandy in his glass', minAct: 2, result: 'Ordinary brandy. No poison of any kind. The glass has not been drunk from.' },
  { k: 'cocoa', t: 'The cocoa on the tray', minAct: 2, result: 'Cocoa, milk and sugar. Harmless.' },
  { k: 'cushion', t: 'The armchair and his clothes', minAct: 2, result: 'No blood, no bruising, no fibres pressed into the face, no sign of a struggle. He was not struck, and he was not smothered.' },
  { k: 'lips', t: 'A swab from the Professor’s lips', minAct: 3, result: 'Traces of bicarbonate of soda, and of a bitter plant poison of the delphinium family. It was swallowed, in water, some time before death. Not in brandy.' },
  { k: 'receiver', t: 'Fingerprints on the telephone', minAct: 2, result: 'The receiver and the hook have been wiped clean. Somebody did not want to be traced to that telephone.' },
  { k: 'keys', t: 'Fingerprints on the keys on the step', minAct: 3, result: 'One set of prints only: the groundskeeper’s. The keys were thrown down, not dropped.' },
  { k: 'glass', t: 'The empty water glass on the desk', minAct: 3, result: 'A white film at the bottom: bicarbonate of soda, and the same bitter plant poison of the delphinium family. Whoever drank this glass drank the poison. It has been wiped on the outside; there are no fingerprints at all.' },
  { k: 'jar', t: 'The powder in the brown jar', minAct: 4, result: 'Bicarbonate of soda, with crushed seeds stirred through it: larkspur, a delphinium. A teaspoonful would kill a grown man within the hour. The seeds are fresh, picked within the last day.' },
  { k: 'shoe', t: 'Plaster cast of the print in the walled garden', minAct: 3, result: 'A gentleman’s leather town shoe, about a size ten, smooth soled. Not a gardener’s hobnailed boot, and not a lady’s shoe. Made today: the edges are still sharp in the wet soil.' },
  { k: 'crate', t: 'The crate behind the balustrade', minAct: 4, result: 'Twelve bottles of malt whisky with no duty stamps, and a box of red and white marine flares. Smuggling, not murder. Nothing in it could poison a man.' },
  { k: 'diploma', t: 'Dr Pryce’s framed diploma', minAct: 4, result: 'The University seal on it is printed, not pressed into the paper. Every genuine Edinburgh diploma of that year bears a raised, embossed seal. This is not one of them.' },
  { k: 'ledger', t: 'The ink on the ledger', minAct: 3, result: 'The crossing-out is in violet ink, of the kind sold in ladies’ writing sets. The Professor’s own entries in the ledger are all in his usual black.' }
];
const WHEN = [
  { k: '1100', t: 'About eleven o’clock' }, { k: '1130', t: 'About half past eleven' },
  { k: '1145', t: 'About a quarter to twelve' }, { k: '1200', t: 'Just before midnight' }
];
const KEY_WHEN = '1130';
const KEY_EVIDENCE = ['R3-3', 'R3-8', 'R3-4', 'C1', 'C2', 'C3', 'C4'];
const EPILOGUE = {
  caught: [
    'At first light the police launch came across from Oban, low in the grey water. Corvin watched it from the dome.',
    'Dr Hugh Pryce did not argue. He put on his bowler hat, picked up his bag, and walked down to the jetty between two constables. The guests stood on the terrace and nobody said goodbye.',
    'Some secrets were confessed over breakfast. Some went home in suitcases. The Professor’s toast to honesty was drunk, at last, at nine in the morning, in cold tea.',
    'Justice was done at Larkspur. The raven went back to his dome, and the last of the Perseids burned out over the sea.'
  ],
  escaped: [
    'At first light the police launch came across from Oban. The table had made up its mind, and it had made it up wrongly.',
    'Dr Hugh Pryce shook the Inspector’s hand, signed a certificate saying the Professor’s heart had failed, and walked down to the boat with everyone else.',
    'But a raven never forgets. That night a black feather lay on the Inspector’s notebook, next to the cook’s brown jar. A week later a letter came from Edinburgh University. They held no record of a Dr Pryce.',
    'Justice was late to Larkspur, but it came. The raven went back to his dome, and the last of the Perseids burned out over the sea.'
  ]
};
const POLICE_QS = [
  'Account for your movements between half past eleven and five past twelve.',
  'Who can corroborate that?',
  'When did you last see Professor Vale alive, and where?',
  'Did you go into the study at any time tonight? Why?',
  'What did you have to gain from his death?'
];

module.exports = { CAST, KILLER, KILLER_PAGE, INNOCENT_PAGE, CLUES, BRIEF, ACTS, METHODS, MOTIVES, SOLUTION, POINTS, ALIBIS, SEARCHES, LAB, WHEN, KEY_WHEN, KEY_EVIDENCE, EPILOGUE, POLICE_QS };
