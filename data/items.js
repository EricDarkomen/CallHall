'use strict';
/* CALLHALL — items, skills, jobs, achievements and the vending machine. */

/* ---------------- Items ---------------- */
const ITEMS = {
  pen:      { n: 'Corporate Pen', e: '🖊️', d: 'Taken from a meeting room in 2024. Still slightly warm with ambition.', v: 0.4, r: 'common', slot: 'trinket', eff: { bullshit: 2 } },
  notepad:  { n: 'Branded Notepad', e: '📓', d: 'Forty pages. Two used. Both say “ring back”.', v: 1.2, r: 'common', slot: 'trinket', eff: { knowledge: 2 } },
  stress:   { n: 'Stress Ball (perished)', e: '🎾', d: 'From the 2018 wellbeing initiative. It no longer returns to shape. Relatable.', v: 0.8, r: 'common', slot: 'trinket', eff: { patience: 2 } },
  headset:  { n: 'Noise-Cancelling Headset', e: '🎧', d: 'The only way to survive Gary.', v: 45, r: 'rare', slot: 'headset', eff: { patience: 10 } },
  headset0: { n: 'Standard Headset', e: '🎙️', d: 'One ear works. It is not the ear you want.', v: 5, r: 'common', slot: 'headset', eff: { patience: 3 } },
  goldset:  { n: 'The Golden Headset', e: '🏆', d: 'Awarded 2011 to “Kevin”. Nobody has claimed it since.', v: 250, r: 'legendary', slot: 'headset', eff: { patience: 20, empathy: 3 } },
  mug:      { n: 'Plain White Mug', e: '☕', d: 'Marjorie is aware of this mug at all times.', v: 2, r: 'common', slot: 'mug', eff: { energy: 5 } },
  terrymug: { n: "Terry’s Mug", e: '🍵', d: 'Brown. Cracked. Beloved. Absorbed by Marjorie in a dispute nobody remembers.', v: 0, r: 'rare', quest: true },
  keycard:  { n: 'Management Keycard', e: '🪪', d: 'Opens the fourth-floor door. Photo is of a man who left in 2013.', v: 0, r: 'rare', quest: true },
  coffee:   { n: 'Emergency Coffee', e: '☕', d: 'Not a drink. A decision.', v: 1.2, r: 'common', use: 'drinkCoffee' },
  double:   { n: 'Double Coffee', e: '☕', d: 'Two coffees in a trench coat.', v: 2.2, r: 'rare', use: 'drinkDouble' },
  biscuit:  { n: 'Communal Biscuit', e: '🍪', d: 'From the tin. The tin is a commons and the commons is a tragedy.', v: 0.3, r: 'common', use: 'eatSmall' },
  crisps:   { n: 'Crisps (cheese & onion)', e: '🍟', d: 'Lunch, technically.', v: 1.1, r: 'common', use: 'eatMid' },
  sandwich: { n: 'Meal Deal Sandwich', e: '🥪', d: 'Chicken and stuffing. Not Sarah’s. Definitely not Sarah’s.', v: 3.5, r: 'common', use: 'eatBig' },
  energy:   { n: 'Energy Drink', e: '🥤', d: 'Tastes of blue. Legally a beverage.', v: 2, r: 'common', use: 'drinkEnergy' },
  pizza:    { n: 'Slice of Free Pizza', e: '🍕', d: 'Free pizza is the highest form of corporate love.', v: 0, r: 'rare', use: 'eatBig' },
  plant:    { n: 'Small Desk Plant', e: '🪴', d: 'Something in your care that is still alive.', v: 6, r: 'common', slot: 'trinket', eff: { patience: 4, empathy: 1 } },
  lanyard:  { n: 'Spare Lanyard', e: '🎫', d: 'Says GRANT. You are not Grant. Nobody checks.', v: 0.5, r: 'common', slot: 'trinket', eff: { chaos: 2 } },
  toner:    { n: 'Toner Cartridge', e: '🧴', d: 'Ordered in 2023 for a printer model we have never owned.', v: 30, r: 'common' },
  paper:    { n: 'Ream of Paper', e: '📄', d: '500 sheets. Compliance packs are 501 pages.', v: 4, r: 'common' },
  shard:    { n: 'Cell Fragment', e: '📊', d: 'A single cell, prised loose. It still recalculates when you are not looking.', v: 0, r: 'legendary', quest: true, slot: 'trinket', eff: { bullshit: 5, knowledge: 3 } },
  badge:    { n: 'Employee of the Month Badge', e: '🥇', d: 'The month is not specified. The photograph is not you.', v: 0, r: 'rare', slot: 'trinket', eff: { empathy: 2, patience: 3 } },
  tape:     { n: 'Roll of Beige Tape', e: '📼', d: 'Facilities issue. Holds this building together, spiritually.', v: 1, r: 'common' },
  voucher:  { n: 'Coffee Voucher', e: '🎟️', d: 'Redeemable for one free coffee. Expires yesterday.', v: 0, r: 'common', use: 'drinkCoffee' },
  /* ---- the expansion ---- */
  goodbiscuit: { n: 'Foil-Wrapped Biscuit', e: '🍫', d: 'From the meeting plate. The good tin. The one with the foil. You have crossed a line and it was delicious.', v: 1.4, r: 'rare', use: 'eatMid' },
  teabag:   { n: 'Herbal Tea Sachet', e: '🍵', d: 'From the Wellbeing Box. Flavour: “Evening Calm”. Nobody in this building has ever had an evening calm.', v: 0.3, r: 'common', use: 'drinkTea' },
  brolly:   { n: 'Unclaimed Umbrella', e: '☂️', d: 'One of nineteen. Somewhere, its owner is standing in the rain being philosophical.', v: 3, r: 'common', slot: 'trinket', eff: { patience: 3 } },
  torch:    { n: 'Emergency Torch', e: '🔦', d: 'Taken from the emergency bracket. You are now the emergency.', v: 4, r: 'common', slot: 'trinket', eff: { chaos: 2, knowledge: 1 } },
  vape:     { n: "Somebody’s Vape", e: '💨', d: 'Blue raspberry. Half charged. Found on the fire escape, which is where all found objects come from.', v: 2, r: 'common', slot: 'trinket', eff: { chaos: 3, patience: 2 } },
  feather:  { n: 'The Pigeon’s Feather', e: '🪶', d: 'Given, not taken. Nobody will believe you and that is fine, because you were there.', v: 0, r: 'legendary', slot: 'trinket', eff: { patience: 8, empathy: 4, chaos: 2 } },
  form:     { n: '30/60/90 Day Plan', e: '📝', d: 'Three boxes. Thirty days: survive. Sixty days: survive. Ninety days: be the sort of person who fills in the ninety box.', v: 0, r: 'common', slot: 'trinket', eff: { bullshit: 3 } },
  printout: { n: 'A Row, Printed', e: '🖨️', d: 'One line of a spreadsheet on one sheet of A4. Your name. Dated three weeks before you started.', v: 0, r: 'legendary', quest: true },
  goldstar: { n: 'Gold Star Sticker', e: '⭐', d: 'From a sheet Janet bought herself in 2014. Worth nothing. Worth everything. Both, at once, permanently.', v: 0, r: 'rare', slot: 'trinket', eff: { empathy: 3, patience: 3 } },
  invite:   { n: 'A Printed Calendar Invite', e: '📅', d: 'FLOOR 4 CATCH-UP · 08:00 Tuesday · recurs: never ends. Printed once, in 2022, and folded and unfolded so many times it has gone soft at the creases.', v: 0, r: 'legendary', slot: 'trinket', eff: { empathy: 4, patience: 4 } },
  cert:     { n: 'Your Certificate', e: '🎓', d: '“CUSTOMER SERVICE EXCELLENCE — LEVEL 1”. Your name, spelled correctly, which somebody checked.', v: 0, r: 'rare', slot: 'trinket', eff: { knowledge: 2, empathy: 2 } },
  earplugs: { n: 'Foam Earplugs', e: '🦻', d: 'From the box in the server room. Not for the calls. For between them.', v: 1, r: 'common', slot: 'headset', eff: { patience: 8 } },
  cardigan: { n: 'Cardigan Left On A Chair', e: '🧥', d: 'It has been on that chair since before you started. It is nobody’s. It is now yours. It is warm.', v: 0, r: 'rare', slot: 'trinket', eff: { patience: 5, empathy: 1 } },
  stapler:  { n: 'The Heavy Stapler', e: '📎', d: 'Metal. Cold. Correct. Staples 40 sheets and could stop a door or a man.', v: 6, r: 'rare', slot: 'trinket', eff: { chaos: 4 } },
  clipboard:{ n: 'A Clipboard', e: '📋', d: 'Carry one and you may go anywhere in any building on Earth and nobody will ever ask you a single question.', v: 3, r: 'rare', slot: 'trinket', eff: { bullshit: 5 } },
  hivis:    { n: 'Hi-Vis Vest', e: '🦺', d: 'Size L. Says CALLHALL on the back in cracked vinyl. Grants total immunity from being questioned.', v: 5, r: 'rare', slot: 'trinket', eff: { bullshit: 4, chaos: 2 } },
  squash:   { n: 'Diluted Squash', e: '🥛', d: 'Orange. Warm. From the jug in Meeting Room 2. Tastes of every children’s party you have ever attended.', v: 0.4, r: 'common', use: 'drinkSquash' },
  complaint:{ n: 'The Formal Complaint', e: '📮', d: 'Four pages. Eleven days of silence between contact three and contact four. That is where the anger lives.', v: 0, r: 'rare', quest: true },
  castor:   { n: 'A Castor From The Good Chair', e: '⚙️', d: 'One of five. Without it the chair lists to port. You are not proud of this and you will not put it back.', v: 0, r: 'rare', quest: true },
  lunch:    { n: 'An Actual Proper Lunch', e: '🍲', d: 'Hot. Eaten sitting down. Away from the desk. Legally yours. Ron was right.', v: 5, r: 'rare', use: 'properLunch' },
  survey:   { n: 'A Completed Survey', e: '📄', d: '“5. The lady on the phone actually listened.” They never know it was you.', v: 0, r: 'legendary', quest: true },
  cushion:  { n: 'The Good Cushion', e: '🛏️', d: 'Memory foam, contoured, bought by somebody with their own money for their own spine. The chair was never the point.', v: 12, r: 'legendary', slot: 'trinket', eff: { patience: 12, empathy: 2 } },
  biscuits: { n: 'A Box of Biscuits (bought)', e: '🎁', d: 'The good ones. The foil ones. Bought with your own money for people who will never know it was you.', v: 4, r: 'rare' }
};

/* ---------------- Skills ---------------- */
const SKILLS = {
  knowledge: { name: '🧠 Knowledge', colour: '#4da3ff', list: {
    product:  { n: 'Product Knowledge', d: 'You know what we sell. Rare.', max: 3 },
    system:   { n: 'System Knowledge', d: 'Unlocks 🧐 Check the account.', max: 3 },
    trouble:  { n: 'Troubleshooting', d: 'Unlocks 🛠️ Actually fix it.', max: 3 },
    policy:   { n: 'Policy Knowledge', d: 'Unlocks 📕 Quote the policy.', max: 3 },
    escal:    { n: 'Escalation Craft', d: 'Unlocks 🪜 Escalate it properly — to Alan, who will actually take it.', max: 3 } } },
  comms: { name: '🗣️ Communication', colour: '#5ad48a', list: {
    empathy:  { n: 'Empathy', d: 'Unlocks 🧘 Let them finish.', max: 3 },
    deesc:    { n: 'De-escalation', d: 'Reduces incoming aggression.', max: 3 },
    persuade: { n: 'Persuasion', d: 'Improves resolution rewards.', max: 3 },
    corp:     { n: 'Corporate Speak', d: 'Unlocks 💼 Deploy phrase.', max: 3 },
    rapport:  { n: 'Small Talk', d: 'Unlocks ☁️ Talk about the weather. Devastating on the right person.', max: 3 } } },
  chaos: { name: '😈 Chaos', colour: '#b48cff', list: {
    sarcasm:  { n: 'Sarcasm', d: 'Unlocks 😏 Say it slightly wrong. High risk.', max: 3 },
    blame:    { n: 'Blame Shifting', d: 'Unlocks 🙈 Transfer to Dave.', max: 3 },
    incomp:   { n: 'Strategic Incompetence', d: 'Unlocks 🤷 Be gently useless.', max: 3 },
    email:    { n: 'Weaponised Email', d: 'Unlocks 📧 Follow up in writing.', max: 3 },
    mute:     { n: 'The Mute Button', d: 'Unlocks 🔇 Mute, scream, unmute, continue warmly.', max: 3 } } },
  survival: { name: '☕ Survival', colour: '#ffb347', list: {
    caffeine: { n: 'Caffeine Tolerance', d: 'Coffee gives more, costs less.', max: 3 },
    breaks:   { n: 'Break Efficiency', d: 'Toilets and chairs restore more.', max: 3 },
    stress:   { n: 'Stress Resistance', d: '+8 max Patience per rank.', max: 3 },
    meeting:  { n: 'Meeting Immunity', d: 'Survive meetings. Gain XP from them.', max: 3 },
    goodwill: { n: 'Goodwill Authority', d: 'Unlocks 💷 Offer a goodwill gesture. Costs the company. Higher ranks, more authority.', max: 3 } } }
};

/* ---------------- Quests ---------------- */
/* `track` is one entry per step: where the tracker points when a job is being
   followed. `{ npc }` is a colleague, who walks their own schedule and is
   followed live; `{ obj }` is a world object, named by its `use` handler so it
   moves if the floor plan ever does; `{ wp }` is a floor waypoint, for a step
   that means a room rather than a thing.
   `null` is deliberate and load-bearing: a step whose whole point is that you do
   not know where to go — who has the mug, who wrote the numbers — gets no pin.
   The tracker says so rather than inventing a destination, because a compass
   arrow pointing at the answer is the game telling you the answer. */
const QUESTS = {
  q_headset: { n: 'The Missing Headset', giver: 'Kevin', steps: [
      'Ask Dave about the headset.', 'Ask Marjorie about the headset.', 'Go back and look at Kevin. Really look.'],
    track: [{ npc: 'dave' }, { npc: 'marjorie' }, { npc: 'kevin' }],
    rw: { xp: 60, money: 0, item: 'voucher' } },
  q_printer: { n: 'Printer of Doom', giver: 'Priya', steps: [
      'Inspect the printer.', 'Try the sensible remedies (paper, toner, restart).', 'Ask Steve in IT.', 'Apply the documented solution: hit it.'],
    track: [{ obj: 'printer' }, { obj: 'printer' }, { npc: 'steve' }, { obj: 'printer' }],
    rw: { xp: 90, money: 5, item: 'tape' } },
  q_fridge: { n: 'The Great Fridge Incident', giver: 'Sarah', steps: [
      'Search the fridge.', 'Search the break room bin.', 'Interview a colleague about the wrap.', 'Report your findings to Sarah.'],
    track: [{ obj: 'fridge' }, { obj: 'breakBin' }, null, { npc: 'sarah' }],
    rw: { xp: 80, money: 0, item: 'crisps' } },
  q_keycard: { n: 'Terry’s Mug', giver: 'Terry', steps: [
      'Find out who has Terry’s mug.', 'Retrieve the mug from Marjorie.', 'Return the mug to Terry.'],
    track: [null, { npc: 'marjorie' }, { npc: 'terry' }],
    rw: { xp: 70, money: 0, item: null } },
  q_spreadsheet: { n: 'Who Writes The Numbers', giver: 'the building itself', steps: [
      'Get onto the management floor.', 'Look at the monitor nobody sits at.', 'Ask people who writes the KPI figures.',
      'Find the thing under the archive floor.', 'Face what is in the reporting dimension.'],
    track: [{ wp: 'mgmt' }, { obj: 'spreadsheet' }, null, { obj: 'hatch' }, { obj: 'hatch' }],
    rw: { xp: 300, money: 50, item: 'shard' } },
  q_kevin: { n: 'Call 000001', giver: 'Steve', steps: [
      'Ask Kevin about call 000001.', 'Find the terminal still running the call.', 'Answer it.'],
    track: [{ npc: 'kevin' }, null, { obj: 'oldCall' }],
    rw: { xp: 200, money: 0, item: 'goldset' } },
  q_complaint: { n: 'The Formal Complaint', giver: 'Alan', steps: [
      'Read the complaint in the red tray on Alan’s desk. All of it, including the dates.',
      'Go back to Alan and take the call together.'],
    track: [{ obj: 'redTray' }, { npc: 'alan' }],
    rw: { xp: 180, money: 8, item: 'clipboard' } },
  q_survey: { n: 'One Genuine Survey', giver: 'Sandra', steps: [
      'Resolve calls well. Really well.', 'Ask a satisfied caller to complete the survey.', 'Take it to Sandra.'],
    track: [null, null, { npc: 'sandra' }],
    rw: { xp: 140, money: 0, item: 'survey' } },
  q_marcus: { n: 'Who Is Marcus', giver: 'a card in a brown envelope', steps: [
      'Find out who the birthday card is actually for.',
      'Sign the card.',
      'Hand it to him yourself. Do not let it go the long way round.'],
    track: [{ obj: 'birthdayCard' }, { obj: 'birthdayCard' }, { npc: 'marcus' }],
    rw: { xp: 160, money: 0, item: 'goldstar' } },
  q_bev: { n: 'Ask The Bins', giver: 'Bev', steps: [
      'Find Bev’s trolley in the corridor.', 'Go back to Bev and ask about the Synergy bag.',
      'Look in the bag.'],
    track: [{ obj: 'trolley' }, { npc: 'bev' }, { npc: 'bev' }],
    rw: { xp: 190, money: 0, item: 'hivis' } },
  q_chair: { n: 'The Good Chair', giver: 'ambition', steps: [
      'Ask Gary about The Good Chair.',
      'Establish what Gary would want for it.',
      'Acquire The Good Chair by any means the building permits.'],
    track: [{ npc: 'gary' }, { npc: 'gary' }, { obj: 'goodChair' }],
    rw: { xp: 150, money: 0, item: 'cushion' } },
  q_recurring: { n: 'The Meeting That Would Not Die', giver: 'Karen', steps: [
      'Ask Steve in IT to delete Karen’s recurring meeting.',
      'Ask Bev what she hears in this building on a Tuesday.',
      'Look at the table in Meeting Room 2.',
      'Ask Tomasz what he does on a Tuesday morning.',
      'Tell Karen what to do about the 08:00.'],
    track: [{ npc: 'steve' }, { npc: 'bev' }, { obj: 'meetingTable' }, { npc: 'tomasz' }, { npc: 'karen' }],
    rw: { xp: 220, money: 0, item: 'invite' } },
  q_biscuit: { n: 'The Biscuit Tin Accord', giver: 'the tin', steps: [
      'Put your name on the biscuit rota.',
      'Actually buy the biscuits. With your own money. Like a functioning adult.',
      'Tell nobody you did it.'],
    track: [{ obj: 'rota' }, null, { obj: 'biscuitTin' }],
    rw: { xp: 120, money: 0, item: 'goodbiscuit' } }
};

/* Sandra will take a survey off you once enough calls have gone well. Her
   “I’ve got one for you” and the tracker step that says you have one are the
   same question, and a tracker that says you have a survey while she refuses to
   take it is worse than no tracker — so it is asked in one place, named here
   beside the job it belongs to. */
function surveyReady() {
  return (G.todayStats.satisfied || 0) >= 2 || G.totals.satisfied >= 3;
}

/* ---------------- Achievements ---------------- */
const ACHS = {
  a_first:   { n: 'First Day', e: '🏆', d: 'Survive an entire shift.' },
  a_adult:   { n: 'Professional Adult', e: '🎓', d: 'Complete a call without your patience dropping below 50.' },
  a_printer: { n: 'Printer Whisperer', e: '🖨️', d: 'Fix the printer the only way it can be fixed.' },
  a_working: { n: 'Actually Working', e: '👀', d: 'Be caught by a manager while genuinely working.' },
  a_break:   { n: 'Strategic Break', e: '🚽', d: 'Spend ten minutes in a cubicle with no biological justification.' },
  a_paygrade:{ n: 'That’s Above My Pay Grade', e: '🙈', d: 'Successfully redirect responsibility to Dave.' },
  a_legend:  { n: 'Corporate Legend', e: '👑', d: 'Reach 100 reputation.' },
  a_headset: { n: 'It Was On His Head', e: '🎧', d: 'Solve the case of the missing headset.' },
  a_monster: { n: 'The Monster', e: '🥪', d: 'Admit what you did to the wrap.' },
  a_dave:    { n: 'Management Is Just More Emails', e: '🧔', d: 'Learn why Dave stayed.' },
  a_karen:   { n: 'Across It', e: '📊', d: 'Ask Karen what she actually does.' },
  a_marjorie:   { n: 'Fourteen', e: '🍵', d: 'Count the mugs.' },
  a_gary:    { n: 'Two Months', e: '🚪', d: 'Learn how long Gary has been leaving.' },
  a_terry:   { n: 'Off The System', e: '👴', d: 'Hear about 2004.' },
  a_trained: { n: 'Smile While Being Insulted', e: '📜', d: 'Complete the full induction.' },
  a_kind:    { n: 'Somebody Said Something Nice', e: '💚', d: 'Be kind to Mo for no reason.' },
  a_no:      { n: 'There Is No Process For No', e: '🛑', d: 'Refuse a quick word.' },
  a_coffee:  { n: 'Six Coffees', e: '☕', d: 'Drink six coffees in one shift. Feel time bend.' },
  a_bs:      { n: 'Let’s Circle Back', e: '💼', d: 'Resolve a call using nothing but corporate language.' },
  a_hatch:   { n: 'It Was A Lid', e: '🕳️', d: 'Lift the odd square of carpet.' },
  a_boss:    { n: 'Annual Performance Review', e: '📈', d: 'Defeat the thing that writes the numbers.' },
  a_quit:    { n: 'I Quit', e: '🚶', d: 'Walk out of the front door before five.' },
  a_kevin:   { n: 'Still On Hold', e: '📟', d: 'Find out what happened to Kevin.' },
  a_meeting: { n: 'The Quick Word', e: '👔', d: 'Survive a quick word with Nigel. It took twenty-five minutes.' },
  /* ---- the expansion ---- */
  a_alan:    { n: 'The Router Is Never The Thing', e: '🧓', d: 'Learn from Alan why he likes the worst job in the building.' },
  a_sandra:  { n: 'Seventy-One Per Cent', e: '👩‍⚖️', d: 'Hear Sandra score the best call of your life.' },
  a_survey:  { n: 'One Genuine Survey', e: '📄', d: 'Get a real human being to say a real thing about you, on a form.' },
  a_fiona:   { n: 'Three Fifths Of A Person', e: '👩‍🦳', d: 'Find out what the People Team actually does.' },
  a_honesty: { n: 'The Paint Is A Different White', e: '🎨', d: 'Learn which value came off the Wall of Values, and why.' },
  a_plan:    { n: 'Submitted', e: '📝', d: 'Discover the kindest system in the company.' },
  a_tomasz:  { n: 'Six Years, Three Months At A Time', e: '🧑‍🍳', d: 'Learn how long Tomasz has been temporary.' },
  a_round:   { n: 'Nobody Buys The Agency A Coffee', e: '💷', d: 'Buy Tomasz a coffee.' },
  a_bev:     { n: 'He Walks Round', e: '👩‍🔧', d: 'Walk round Bev’s wet floor instead of over it.' },
  a_chairs:  { n: 'Push Your Chair In', e: '🪑', d: 'Ask Bev how to make her job easier. Be changed forever.' },
  a_marcus:  { n: 'It’s Actually In March', e: '📅', d: 'Find out when Marcus’s birthday really is.' },
  a_card:    { n: 'From All Of Us', e: '🎂', d: 'Hand Marcus the card yourself, in person, like a human being.' },
  a_march:   { n: 'I’ll Be About In March', e: '🌱', d: 'Promise Marcus something small and mean it.' },
  a_complaint:{ n: 'It Was Never The £38', e: '📮', d: 'Take a formal complaint all the way, with Alan saying nothing beside you.' },
  a_queue:   { n: 'The 16:55 Queue', e: '📞', d: 'Face the last surge of the day and still be standing at five.' },
  a_allhands:{ n: 'Any Questions?', e: '📽️', d: 'Survive an all-staff briefing. Ask a question. Ask the question.' },
  a_pigeon:  { n: 'Colleague', e: '🐦', d: 'Visit the pigeon five times. Be given something.' },
  a_step:    { n: 'Seven Minutes', e: '🪜', d: 'Sit on the step outside.' },
  a_beanbag: { n: 'Horizontal At Work', e: '🛋️', d: 'Use the beanbag. Legally. On the clock.' },
  a_frown:   { n: 'Thanks!', e: '🙁', d: 'Tell the Wellbeing Tracker the truth. Watch nothing happen.' },
  a_suggest: { n: 'Nobody Will Read It', e: '🗳️', d: 'Put the right thing in the suggestion box anyway.' },
  a_leaf:    { n: 'Finish The Leaf', e: '🖍️', d: 'Complete the one thing in this building that stays completed.' },
  a_tin:     { n: 'The Biscuit Tin Accord', e: '🍪', d: 'Put money in the empty tin for the next person.' },
  a_washup:  { n: 'Load-Bearing', e: '🧽', d: 'Do everybody else’s washing up. Tell nobody.' },
  a_hearself:{ n: 'Eleven “No Worries”', e: '🎧', d: 'Listen to a recording of your own voice. Survive it.' },
  a_readkb:  { n: 'The First Person To Read It', e: '📚', d: 'Actually read the knowledge base. Priya must never know.' },
  a_cert:    { n: 'Somebody Took Theirs', e: '🎓', d: 'Collect the certificate Janet has been printing for everyone for years.' },
  a_goodcubicle: { n: 'The Good One', e: '🚽', d: 'Fifteen minutes in Cubicle 4. An even trade.' },
  a_hdmi:    { n: 'It Worked First Time', e: '📽️', d: 'The HDMI cable works. There are no witnesses. There never are.' },
  a_booked:  { n: 'Recurring Until 2044', e: '📱', d: 'Book Meeting Room 2 for yourself, forever.' },
  a_landed:  { n: 'That’s All I Wanted', e: '🤝', d: 'Build enough rapport on a call to land it properly, instead of winning it.' },
  a_organiser:{ n: 'The Organiser Is The Room', e: '🏢', d: 'Learn who is actually holding the 2022 meeting.' },
  a_recurring:{ n: 'Declined With Comment', e: '📅', d: 'Settle the recurring meeting of 2022, one way or the other.' },
  a_attendees:{ n: 'Attendees: 2', e: '🪑', d: 'Find the one invitation in this building that mattered, and get somebody to turn up to it.' },
  a_lunch:   { n: 'Legally Sixty Minutes', e: '🍲', d: 'Take a full, proper, sitting-down lunch. Ron was right.' },
  a_chair:   { n: 'All Five Castors', e: '💺', d: 'Obtain The Good Chair.' },
  a_darts:   { n: 'Nobody Left Before Five', e: '🕔', d: 'Be the first person out of that door in six years.' },
  a_synergy: { n: 'There Have Always Been Four', e: '🕴️', d: 'Find out what is actually behind the Synergy door.' },
  a_allthree:{ n: 'The Full Tour', e: '🗺️', d: 'Visit every room in the building, including the ones that are not on the plan.' },
  a_pauline: { n: 'Pauline, 2008', e: '🍵', d: 'Get Dave to tell you why he is actually still here.' },
  a_greggs:  { n: 'The Best Thing About This Building', e: '🥐', d: 'Go to the Greggs. Everyone who works here knows.' },
  a_fourteenth: { n: 'The Fourteenth Mug', e: '🍵', d: 'Ask Marjorie about the one facing the wall.' },
  a_biscuits: { n: 'Nobody Will Ever Know It Was You', e: '🎁', d: 'Buy the biscuits with your own money and say nothing.' },
  a_mo:      { n: 'Nobody Asks', e: '🧑‍🎓', d: 'Ask Mo whether he is actually alright, and mean it.' },
  a_poop:    { n: 'Listed Building', e: '🧻', d: 'Pay your respects to the only piece of writing in this building that outlived its author’s career.' },
  /* ---- the arcade ----
     Handed out by minigames/*.js, which each name theirs literally so the
     reward editor's "can this be earned at all" check can see the call. */
  a_holdmusic:{ n: 'Greensleeves, Correctly', e: '🎧', d: 'Play out the hold music that has been running since 2009.' },
  a_inboxzero:{ n: 'Inbox Zero', e: '📭', d: 'Empty the folder. For eleven minutes it was true.' },
  a_nothingread:{ n: 'Sorted, Not Read', e: '🗂️', d: 'Clear thirty emails without one wrong call and without reading a single one.' },
  a_patched: { n: 'It Was Never Plugged In', e: '🔌', d: 'Patch all three racks behind the servers.' },
  a_arcade:  { n: 'Employee Of The Month (Unofficial)', e: '🕹️', d: 'Clear every machine in the building. None of them are machines.' }
};


/* ---------------- The arcade cabinets ----------------
   WHERE a minigame is played, and what it is wired into. One entry per game
   per object, and every field on it is a string that joins two files nothing
   else joins up:

     game    a minigame in engine/arcade.js's catalogue
     use     an object's `use:` handler in data/acts.js — the thing you press
     t       the reply that offers it, in the dialogue that object opens
     skill   a skill in SKILLS whose rank the game is handed and spends on
             something felt: a wider judgement window, a longer read, one more
             cable already bolted down
     job     a job in QUESTS, stepped once when the game is first cleared
     item    an item in ITEMS, handed over the first time it is cleared
     need    a G.flag that has to be set before the reply is offered at all

   It is a TABLE rather than four hand-written dialogue choices because that is
   the only form the editor can add to, edit and take away from — a minigame
   bound to an object in code is one the tool can describe and never change.
   Acts._cab() turns these into the replies, so the PROSE stays in data/acts.js
   where the writing lives and only the wiring is data.

   Every one of those six joins fails silently and each fails differently: a
   `use` nothing handles is a reply that never appears, a `skill` that is not
   in SKILLS is a rank of zero for ever, an `item` ITEMS has never heard of is
   a reward that quietly does not arrive. editor/games.js checks all six. */
const CABINETS = [
  /* The 2009 terminal in the server room. Stress Resistance is the skill for
     it because the game is surviving hold music, and the cardigan has been
     over the back of that chair since before anybody now working here
     started. */
  { game: 'holdmusic', use: 'oldCall', skill: 'stress', job: null, item: 'cardigan',
    need: null, t: 'Put the headset on and play along with it.' },
  /* Your own workstation. Weaponised Email, obviously. The heavy stapler is in
     the drawer and has been the whole time. */
  { game: 'inbox', use: 'playerDesk', skill: 'email', job: null, item: 'stapler',
    need: null, t: 'Open the folder. Not read it — sort it.' },
  /* The cable spaghetti behind the servers. Troubleshooting tells you which
     one Steve actually fixed, and there is a toner cartridge back there for a
     printer model this company has never owned. */
  { game: 'patch', use: 'cables', skill: 'trouble', job: null, item: 'toner',
    need: null, t: 'Have a go at it. Nobody is watching.' },
];


/* ---------------- Shop ---------------- */
const SHOP = {
  vending: { title: 'Vending machine', note: 'Coin slot jams. Hit the D4 button twice. Everything in row D is stuck and has been since the spring.',
    stock: ['crisps', 'biscuit', 'energy', 'sandwich', 'coffee', 'squash', 'plant', 'notepad', 'earplugs', 'headset'] },
  greggs: { title: 'The Greggs downstairs', note: 'Two floors down. The best thing about this building and everyone who works here knows it. Forty minutes if you go at twelve, four if you go at eleven.',
    stock: ['lunch', 'sandwich', 'coffee', 'goodbiscuit', 'biscuits', 'crisps'] }
};
