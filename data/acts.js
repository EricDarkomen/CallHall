'use strict';
/* CALLHALL — what happens when you press E. One entry per object `use:`,
 * looked up by name from Interact.go(). Content that is also code: it may call
 * Q, Ach, Item, Rel and the rest, which live in engine/, and touches none of
 * them until somebody presses the button.
 */

const insp = (face, name, role, pages, choices, done) => Dialogue.say(face, name, role, pages, choices, done);

/* The replies that offer whatever minigames are installed on an object. The
   binding is a table (CABINETS in data/items.js) rather than four choices
   written out here, because a binding written in code is one the editor can
   describe and never change — and putting a game on an object, taking it off
   and saying what it is wired into is the whole point of the arcade being a
   library rather than three special cases.

   Only the WIRING moved. The prose an object opens with is still written out
   below, one entry per `use:`, which is where the writing lives. */
const cab = use => Arcade.cabinets(use).map(c => ({
  t: c.t, to: null, do() { Arcade.open(c.game, c); }
}));

const Acts = {
  generic(o) { insp(o.e, o.name, 'Office fixture', ['It is what it appears to be. That is rare here.']); },

  /* --- doors & movement --- */
  door(o) { Sfx.door(); insp('🚪', o.name, 'Doorway', ['A door. It leads to ' + o.name + '. It has been propped open with a fire extinguisher, which is illegal, and permanent.']); },
  lockedDoor(o) {
    if (G.flags.keycard) { Sfx.door(); insp('🚪', 'Management Floor', 'Fourth floor', ['You tap the keycard. The light goes green. Nothing has ever gone green for you here before.']); }
    else { Sfx.deny(); insp('🔒', 'Management Floor', 'Access restricted', ['The reader glows red.', 'A small sign says: ACCESS BY KEYCARD ONLY. A smaller sign under it says: ASK TERRY.']); }
  },
  /* The three ways off this floor. None of them names where it goes: the link
     table in data/levels.js does, and Levels.take() looks the destination up by
     the handler it was reached through. Moving a level or hanging a second door
     onto it is a change to that table and to nothing here. */
  exit() {
    if (G.minutes >= DAY_END) return;
    insp('🚪', 'The way out', 'It is ' + clockStr(G.minutes), [
      'The door. Daylight on the other side of it. A bus stop. A whole life.',
      'Ron is not looking. Ron is always looking, but he is not looking.'],
      [{ t: 'Step outside. (You are allowed. Probably.)', to: null, do() { Levels.take('exit'); } },
       { t: 'Stay. You have a lanyard now.', to: null },
       { t: 'Leave. Just... leave.', to: null, do() { Ach.get('a_quit'); Endings.show('escape'); } }]);
  },
  frontDoors() { Levels.take('frontDoors'); },
  /* The lift asks the same link table everything else does and finds nothing on
     the other end of it, which is why nothing happens — and the day somebody
     adds a floor to the catalogue and points a link at it, this button starts
     working without a line of it changing. */
  lift() {
    const link = Levels.links('lift');
    if (link) return Levels.take('lift');
    Sfx.door();
    insp('🛗', 'The Lift', 'Decorative', ['You press the button.', 'Nothing happens, in a way that suggests something is happening several floors away, to somebody else.']);
  },
  hatch() {
    Ach.get('a_hatch');
    insp('🕳️', 'Odd square of carpet', 'It is not carpet', [
      'You lift the corner. It comes up as a single rigid panel. It is a lid. Terry was right.',
      'Below: a ladder, a smell of warm dust, and a light that is definitely on.'],
      [{ t: 'Go down.', to: null, do() { G.flags.inSecret = true; Levels.take('hatch'); } },
       { t: 'Put it back. Pretend you never lifted it.', to: null }]);
  },
  ladderUp() { Levels.take('ladderUp'); },

  /* --- the working day --- */
  playerDesk() {
    const sit = { t: 'Sit back for five minutes.', to: null, do() { Acts._sit(); } };
    if (G.minutes >= DAY_END) {
      return insp('🖥️', 'Your workstation', 'Shift over',
        ['The shift is over. The screen has already logged you out. It did that at 17:00:00.'],
        [sit, { t: 'Leave it.', to: null }]);
    }
    insp('🖥️', 'Your workstation', 'Yours, technically', [
      'Your monitor. Your keyboard, still faintly sticky from a previous tenant. A sticky note that says “DO NOT DELETE — Karen” attached to nothing.'],
      [{ t: 'Do some actual work (15 min).', to: null, do() { Acts._work(15); } },
       { t: 'Do some actual work (30 min).', to: null, do() { Acts._work(30); } }]
      .concat(cab('playerDesk'))
      .concat([sit,
        { t: 'Stare at the screen with intent.', to: null, do() { G.minutes += 5; Player.mod({ energy: -2 }); UI.toast('🫥', 'Five minutes pass. You appear extremely busy. This is a skill.'); P.stats.bullshit += .5; } }]));
  },
  _work(mins) {
    G.minutes += mins; G.flags.wasWorking = true;
    const pay = mins * 0.19, xp = Math.round(mins * 1.4);
    Player.mod({ money: pay, energy: -mins * .5, patience: -mins * .1 });
    Player.xp(xp);
    G.todayStats.worked = (G.todayStats.worked || 0) + mins;
    UI.toast('⌨️', 'You clear ' + ri(3, 11) + ' cases from the queue. The queue does not get shorter. The queue is a river.');
    for (let i = 0; i < 6; i++) setTimeout(() => Sfx.key(), i * 90);
    if (chance(.35)) setTimeout(() => Nigel.appear(), 1400);
    setTimeout(() => { G.flags.wasWorking = false; }, 9000);
  },
  pc() { insp('🖥️', 'Workstation', 'Somebody else’s', [pick([
    'Eleven windows open. One is a spreadsheet. One is a spreadsheet about the spreadsheet.',
    'Screensaver: the CALLHALL logo, bouncing. It has never hit the corner. Someone has been watching for six years.',
    'A post-it on the monitor: “password is the same as before”.',
    'The account system is open on a customer record from 2014. It is still loading.'])]); },
  chair() { Acts._sit(); },
  /* Five minutes off your feet. One place, because it is offered from two: any
     chair in the building, and the desk act at your own — where the chair
     carries the desk's handler so that pressing E at the desk you were sent to
     find opens the desk. */
  _sit() {
    const r = 6 + Sk.rank('breaks') * 3;
    G.minutes += 5; Player.mod({ patience: r, energy: r });
    insp('🪑', 'Chair', 'Load-bearing', ['You sit down for five minutes.', 'Nobody comes. Nothing rings. It is the single best thing that happens today.']);
  },
  trainChair() { insp('🪑', 'Training chair', 'Stackable', ['Stacked in rows facing a whiteboard that says GOALS with nothing under it.']); },
  phone(o) {
    if (G.flags.phonesDown) return insp('☎️', 'Desk phone', 'Dead', ['Silence. Beautiful, illegal silence.']);
    /* The last twenty minutes of a shift are their own encounter. */
    if (G.minutes >= 995 && G.minutes < DAY_END && !G.flags.queueBeaten && !G.flags.queueTriedToday) {
      return insp('☎️', 'The queue', clockStr(G.minutes) + ' · it is not going to clear', [
        'The wallboard says 41 CALLS WAITING. It said 41 four minutes ago. It is not the same 41.',
        'Around you, people are doing the thing everybody does at this time: taking one more, and then one more, and then looking at the clock and taking one more.',
        'You could go at five. Everybody is allowed to go at five. Nobody has gone at five since 2019.'],
        [{ t: 'Take the queue. All of it. Until it stops.', to: null, do() { G.flags.queueTriedToday = true; setTimeout(() => Combat.startBoss('queue'), 400); } },
         { t: 'Take one more ordinary call and then go.', to: null, do() { Combat.startCall(false); } },
         { t: 'Go at five. You are allowed to go at five.', to: null, do() { G.flags.leftAtFive = true; Player.mod({ patience: 20 }); Ach.get('a_darts'); UI.toast('🕔', 'You log out at 17:00:00. Ron looks up. Ron says nothing, but something in his face changes, and it is respect.', 'gold'); } }]);
    }
    insp('☎️', o.name, 'Not currently ringing', ['It is not ringing. You could wait. It will ring. It always rings.'],
      [{ t: 'Ring the queue manually. Ask for a call.', to: null, do() { Combat.startCall(false); } },
       { t: 'Leave it.', to: null }]);
  },
  bin() { insp('🗑️', 'Bin', 'General waste', [pick(['A crisp packet, a printout of an email, and a birthday card that never got signed.', 'Someone has thrown away a mug. A whole mug. Marjorie must never know.', 'Empty. Suspiciously empty. Cleaned at 4am by people none of you have met.'])]); },
  plant(o) { insp('🪴', o.name, 'Living, allegedly', [pick(['Plastic. Dusted weekly by someone who knows it is plastic.', 'Real, somehow. Someone waters it in secret and takes no credit.', 'A pen has been planted in the soil, upright, like a small flag.'])]); },
  sadPlant() { insp('🪴', 'Sad office plant', 'Ficus, terminal', ['It has three leaves. Two are brown.', 'A handwritten sign taped to the pot: “PLEASE DO NOT WATER — I AM ON A SCHEDULE”. The handwriting is Terry’s. The schedule is not working.'],
    [{ t: 'Water it anyway.', to: null, do() { Player.mod({ patience: 6 }); Rel.add('terry', -1); UI.toast('🪴', 'You water it. It looks exactly the same. You feel better. That was the point.'); } },
     { t: 'Respect the schedule.', to: null, do() { Rel.add('terry', 1); } }]); },
  cooler() { Player.mod({ energy: 4, patience: 3 }); G.minutes += 2; insp('🚰', 'Water cooler', 'Social infrastructure', ['You take a plastic cone of water. It holds a mouthful and a half.', 'Two people are standing here, not talking about work, ready to talk about work the instant a manager appears.']); },
  noticeboard() { insp('📋', 'Noticeboard', 'Main floor', [
    'FIRE MARSHAL: (name removed)',
    'CHRISTMAS PARTY 2019 — PHOTOS! (fourteen photos, all of the same table, nobody smiling)',
    'PLEASE DO NOT MICROWAVE FISH. (underlined four times, three different pens, three different years)',
    'MENTAL HEALTH FIRST AIDER: Karen. (Karen is in back-to-backs until March.)']); },
  poster(o) { insp('🖼️', o.name, 'Motivational', [pick([
    '“TEAMWORK: NONE OF US IS AS STRONG AS ALL OF US.” A stock photo of rowers. None of them work here.',
    '“EXCELLENCE IS NOT AN ACT, IT IS A HABIT.” Someone has added, in biro: “so is this job”.',
    '“THERE IS NO I IN TEAM.” Underneath, in pencil: “there is an M and an E though”.'])]); },
  extinguisher() { insp('🧯', 'Fire extinguisher', 'Last inspected: 2019', ['Serviced annually, in the sense that a sticker is applied annually.', 'It is currently holding open a fire door.']); },
  stationery() { 
    insp('📦', 'Stationery cupboard', 'Unlocked since 2016', ['Highlighters in eleven colours. Envelopes for a mailing that never happened. A laminator, still in the box.'],
      [{ t: 'Take a pen.', to: null, do() { Item.give('pen'); } },
       { t: 'Take a notepad.', to: null, do() { Item.give('notepad'); } },
       { t: 'Take a lanyard that says GRANT.', to: null, do() { Item.give('lanyard'); } },
       { t: 'Take nothing. You are not that person.', to: null, do() { Player.mod({ rep: 2 }); } }]);
  },
  fax() { insp('📠', 'The Fax Machine', 'Still plugged in', ['A fax machine. In this year.', 'It receives, on average, one fax a month, from a dental practice in Kettering, for someone who has never worked here.',
    'Nobody will unplug it. Everyone is slightly afraid of what stops if they do.']); },
  filing() { insp('🗄️', 'Filing cabinet', 'A–F', ['Drawer one: A–F. Drawer two: A–F. Drawer three: “MISC”. Drawer four is locked and Terry says it is empty and Terry has never lied about anything else.']); },
  cake() { Player.mod({ energy: 12, patience: 6 }); G.minutes += 3; insp('🧁', 'Somebody’s birthday cake', 'Communal', ['Shop-bought, cut badly, on a paper plate.', 'There is a card. You do not know Marcus. You sign it: “Happy birthday Marcus!! From the phones team”.']); },
  table() { insp('🍽️', 'Break table', 'Formica', ['Wiped, technically. A ring from a mug that has been there since the building opened, like a fossil.']); },
  lowTable() { insp('🍽️', 'The low table', 'The Wellbeing Room', [
    'Pale wood, rounded corners, exactly the height at which a table stops being useful.',
    'It has a colouring book on it and a diffuser on it and a thin film of dust on it, and the three of them arrived on the same afternoon.']); },
  faxTable() { insp('🍽️', 'The fax table', 'Load-bearing', [
    'A table whose entire job is to be under the fax machine. It is doing that job.',
    'There is a socket behind it that nothing else can reach, which is the real reason neither of them has ever moved.']); },
  meetingTable() {
    /* Once you know what happens in here on a Tuesday, the room stops being
       scenery. Same table, different thing entirely. */
    if (Q.active('q_recurring') && G.flags.bevTuesday && !G.flags.sawChair) {
      G.flags.sawChair = true; P.stats.empathy += 1; Player.xp(45); Q.step('q_recurring');
      insp('🪑', 'Meeting Room 2', 'One chair out', [
        'Eight chairs. Seven of them square to the table.',
        'The eighth is pulled out, at the end nearest the window, and the carpet under it has gone flat and pale in a way that takes years.',
        'On the whiteboard, still: “WHAT DOES GOOD LOOK LIKE?”',
        'And underneath it, small, bottom right, in handwriting so neat it is almost printing: an agenda. Three items. Dated this Tuesday.',
        'Item one is “Floor 4 — how is everyone”. Item two is “AOB”. Item three has been rubbed out and rewritten enough times that the board has gone grey there, and it currently says “nothing”.'],
        null, () => UI.objective('Ask Tomasz what he does on a Tuesday morning.'));
      return;
    }
    insp('🍽️', 'Meeting Room 2', 'The quick word room', [
      'A long table, eight chairs, one whiteboard marker that works.',
      'On the whiteboard, half-erased: “WHAT DOES GOOD LOOK LIKE?” Nobody answered. The question has been there for two years, load-bearing.']);
  },
  sofa() { G.minutes += 6; Player.mod({ patience: 10, energy: 6 }); insp('🛋️', 'Waiting sofa', 'Reception', ['You sit on the visitor sofa for six minutes like a visitor. It is the most comfortable thing in the building and it is for people who do not work here.']); },
  reception() {
    /* The sign-in book has said "MEETING" since 2023 and nobody has ever
       explained it. Once you know about Tuesdays, you can read the handwriting. */
    if (G.flags.knowTuesday) {
      insp('🛎️', 'Reception desk', 'Unstaffed since the restructure', [
        'A bell. A screen showing today’s visitors: none.',
        'The sign-in book. Last entry: a Tuesday in 2023, purpose of visit “MEETING”.',
        'You have seen that handwriting this morning, on a whiteboard, very small, bottom right.',
        'He signed himself in. As a visitor. To his own place of work. For a meeting he was, in fairness, the only person invited to.']);
      return;
    }
    insp('🛎️', 'Reception desk', 'Unstaffed since the restructure', ['A bell. A screen showing today’s visitors: none. A sign-in book where the last entry is from a Tuesday in 2023 and says only “MEETING”.']);
  },
  fireNotice() { insp('📋', 'Fire evacuation notice', 'Assembly point B', ['In the event of fire, assemble at Point B.', 'Point B is a car park that was sold in 2021. Nobody has updated the notice. In the event of fire, everyone will meet at a Greggs.']); },
  eotm() { insp('📋', 'Employee of the Month', 'Corridor', [
    'A frame. Inside: a photograph of a man in a headset, taken in about 2011, slightly out of focus.',
    'The name plate says: KEVIN.', 'The month is not specified. The month has never been specified.'],
    [{ t: 'Take the badge from the frame.', to: null, do() { if (!Item.has('badge')) { Item.give('badge'); G.flags.tookBadge = true; } } },
     { t: 'Leave Kevin be.', to: null }]); },

  /* --- coffee & the break room --- */
  coffee() {
    if (G.flags.coffeeBroken) return insp('☕', 'Coffee machine', 'ERR: BEANS', ['The display says ERR: BEANS.', 'There are beans. You can see the beans. The beans are right there.']);
    insp('☕', 'Coffee machine', 'Bean-to-cup, spiritually', ['It makes a noise like a small industrial accident and produces something brown and hot and legally coffee.'],
      [{ t: '☕ Coffee — 50p. (+Energy, +Confidence, −Accuracy)', to: null, do() { if (P.money < .5) return Sfx.deny(); Player.mod({ money: -.5 }); Uses.drinkCoffee(); } },
       { t: '☕☕ Double — £1. (+Energy, +Confidence, −Emotional Stability)', to: null, do() { if (P.money < 1) return Sfx.deny(); Player.mod({ money: -1 }); Uses.drinkDouble(); } },
       { t: '☕☕☕ Manager’s Special — press and hold.', to: null, if: () => P.money >= 2, do() { Acts._special(); } },
       { t: 'Take a cup for later.', to: null, if: () => P.money >= 1.2, do() { Player.mod({ money: -1.2 }); Item.give('coffee'); } },
       { t: 'Not now.', to: null }]);
  },
  _special() {
    Player.mod({ money: -2 });
    Sfx.coffee(); FX.shake(8); UI.flash('#ffb347', .4);
    count('coffee', 3);
    Player.mod({ energy: 60, patience: -25 });
    P.stats.bullshit += 2; P.stats.chaos += 3;
    Ach.get('a_coffee');
    insp('☕', 'MANAGER’S SPECIAL', '???', [
      'You hold the button. All the lights come on. The machine makes a sound you have not heard from it before — lower, older.',
      'What comes out is very hot, very dark, and slightly moving.',
      'You drink it.',
      'For ninety seconds you understand the escalation matrix completely. You could redesign it. You could redesign the company.',
      'Then it passes, and you are standing in a break room holding a paper cup, and your hands are shaking, and you have never felt more employable.']);
  },
  mugs() { insp('🍵', 'Marjorie’s mug shelf', 'Fourteen mugs', [
    'Fourteen mugs. Arranged by an order that is not size, colour, or frequency of use.',
    'One is at the back, turned to face the wall. Nobody asks about that one. Marjorie has never explained it and never will.']); },
  microwave() { insp('📻', 'Microwave', 'Est. 2009', [
    'The interior is the colour of a decision that was never taken.',
    'Taped to the door: “PLEASE COVER YOUR FOOD.” Underneath: “I DID COVER IT.” Underneath that: “NOT WELL ENOUGH.”',
    'This is the longest-running conversation in the building.']); },
  fridge() {
    const pages = ['The fridge. Cold, humming, morally complicated.',
      'Inside: eleven yoghurts, four of which are labelled with a name and a date and an exclamation mark. A bag of salad that has become a liquid. A birthday cake from an unclear birthday.'];
    if (Q.active('q_fridge')) {
      pages.push('And a gap. A clean rectangle in the frost where something recently was.');
      if (!G.flags.clueFridge) { G.flags.clueFridge = true; G.flags.fridgeClues = (G.flags.fridgeClues || 0) + 1; Q.step('q_fridge'); UI.toast('🔍', 'Clue: something rectangular was removed from the middle shelf this morning.'); }
    }
    insp('🧊', 'The Fridge', 'Emptied Fridays', pages);
  },
  breakBin() {
    const pages = ['A bin, in a break room, at 11am. Not a place of dignity.'];
    if (Q.active('q_fridge')) {
      pages.push('Near the top: a wrapper. A wrap wrapper. With a name label on it. The name is Sarah’s.',
        'Under the wrapper, folded neatly: a napkin. Folded *neatly*. Whoever ate this was not in a hurry. Whoever ate this was calm.',
        'You do fold napkins. You do that. You have always done that.');
      if (!G.flags.clueBin) { G.flags.clueBin = true; G.flags.fridgeClues = (G.flags.fridgeClues || 0) + 1; Q.step('q_fridge'); UI.toast('🔍', 'Clue: the napkin was folded. Neatly. Like you fold them.'); }
    }
    insp('🗑️', 'Break room bin', 'Emptied at 4am', pages);
  },
  vending() { Shop.open('vending'); },
  rota() { insp('📋', 'The Rota', 'Printed weekly', [
    'Names in a grid. Yours is on it, spelled “GARNT”.',
    'Somebody has written “NO” in the Saturday column and circled it four times. Somebody else has written “yes :)” next to it.']); },

  /* --- printer arc --- */
  printer(o) {
    if (Q.complete2('q_printer')) return insp('🖨️', 'The Printer', 'At peace', ['It prints. Every time. Nobody trusts it and nobody ever will.']);
    if (G.flags.knowHitPrinter) {
      return insp('🖨️', 'The Printer', 'ERROR 47', ['It says ERROR 47. There is no error 47. You have checked. Priya has checked. Error 47 does not exist and yet here it is, in a display, in a building, in your life.'],
        [{ t: 'Hit it. Firm encouragement, side panel, left of the tray.', to: null, do() { setTimeout(() => Combat.startBoss('printer'), 400); } },
         { t: 'Not yet. I’m not ready.', to: null }]);
    }
    if (!Q.active('q_printer')) return insp('🖨️', 'The Printer', 'A recurring boss', ['It is not making a noise. That is worse. Everyone on this floor is aware, at all times, of whether the printer is making a noise.']);
    if (!G.flags.printerTried) {
      G.flags.printerTried = true; Q.step('q_printer');
      return insp('🖨️', 'The Printer', 'ERROR 47', ['You inspect it properly for the first time.',
        'PAPER: full. TONER: 84%. NETWORK: connected. QUEUE: 41 jobs, oldest from February.', 'DISPLAY: ERROR 47.', 'You are going to have to try things.']);
    }
    insp('🖨️', 'The Printer', 'ERROR 47', ['Right. Documented remediation steps.'],
      [{ t: 'Add paper (it is full).', to: null, do() { G.flags.pTry = (G.flags.pTry || 0) + 1; UI.toast('🖨️', 'You add paper to a full tray. ERROR 47.'); Acts._pcheck(); } },
       { t: 'Replace the toner (it is 84%).', to: null, do() { G.flags.pTry = (G.flags.pTry || 0) + 1; UI.toast('🖨️', 'You replace 84% toner with a cartridge for a different model. ERROR 47.'); Acts._pcheck(); } },
       { t: 'Restart it.', to: null, do() { G.flags.pTry = (G.flags.pTry || 0) + 1; Sfx.printer(); UI.toast('🖨️', 'Ninety seconds of booting. A rising hum. Hope. ERROR 47.'); Acts._pcheck(); } },
       { t: 'Unplug it.', to: null, do() { Acts._unplug(); } },
       { t: 'Walk away.', to: null }]);
  },
  _pcheck() { if ((G.flags.pTry || 0) >= 2 && !G.flags.askedSteve) { Q.step('q_printer'); UI.objective('Ask Steve in IT about the printer.'); } },
  _unplug() {
    if (G.flags.unplugged) return UI.toast('🔌', 'Still unplugged. Still, somehow, showing ERROR 47.');
    G.flags.unplugged = true; Player.xp(40); FX.shake(6);
    insp('🔌', 'Behind the printer', 'You should not have looked', [
      'You reach behind it to pull the plug.',
      'There is no plug.',
      'You follow the cable. The cable ends, neatly, in a moulded plastic cap. It has been like this for a long time. There is dust in the shape of it.',
      'This printer has not been connected to power for approximately six months.',
      'It has, in that time, displayed forty-one error messages, jammed twice, and been the subject of nine emails.',
      'You put it back exactly as it was. You tell nobody. Some things hold a building up.']);
    Ach.get('a_printer'); G.flags.knowUnplugged = true;
  },
  paperTray() { insp('📄', 'Paper tray', 'Full', ['Full. It is always full. People add paper to it as a form of prayer.']); },
  oldPrinter() { insp('🖨️', 'Printer (deceased)', 'Archive', ['An older printer, in the archive, facing the wall.', 'A note on it in Terry’s handwriting: “DO NOT REVIVE”.']); },
  mgmtPrinter() { insp('🖨️', 'Management printer', 'Works perfectly', ['It works. Instantly. Silently. Duplex, stapled, warm.', 'You stand looking at it for slightly too long.']); },

  /* --- training room --- */
  module(o) {
    const mods = [
      ['MODULE 1: SMILE WHILE BEING INSULTED', 'A laminated sheet. Diagram of a face. The face is smiling. An arrow points at the smile and says “MAINTAIN”.'],
      ['MODULE 2: SAY “I COMPLETELY UNDERSTAND”', 'You do not have to understand. Understanding is a separate module which does not exist.'],
      ['MODULE 3: DO NOT ACTUALLY SAY WHAT YOU ARE THINKING', 'The module is one page. The page is the title. There is a signature box. It has 400 signatures.'],
      ['MODULE 4: THE ESCALATION LADDER', 'A diagram of a ladder. Every rung points upward. There is no rung marked “resolved”.']];
    const m = mods[o.mod % 4];
    P.stats.bullshit += .25;
    insp('📜', m[0], 'Learning & Development', [m[1]]);
  },
  projector() { insp('📽️', 'Projector', 'Ceiling-mounted', ['Showing slide 4 of 61: “WHAT IS A CUSTOMER?”', 'The answer is on slide 5. Nobody has ever seen slide 5.']); },
  flipchart() { insp('📊', 'Flipchart', 'Page 1 of many', ['Big letters: “WHAT DOES GOOD LOOK LIKE?”', 'Underneath, in a different pen: “quiet”.']); },
  lanyards() { insp('📦', 'Box of lanyards', 'Unclaimed', ['Forty lanyards for people who never started, or started and stopped, or started and are still here but got another one.'],
    [{ t: 'Take one.', to: null, do() { Item.give('lanyard'); } }, { t: 'Leave them.', to: null }]); },

  /* --- archive --- */
  archiveBox(o) { insp('📦', 'Archive box ' + (o.n + 1), 'Marked “MISC 2011–2016”', [pick([
    'Headsets. Forty of them. All with one working ear. Statistically that should not be possible.',
    'Christmas decorations, a tinsel snake, and a Santa hat with a name in it: KEVIN.',
    'Printouts of a website that no longer exists, in a ring binder, in a box, in a basement of an office.',
    'An entire department’s paperwork from 2011. Not the people. The paperwork of them.',
    'A birthday card, signed by thirty people, never given. “Happy retirement Kevin!!”'])]); },
  ancientPC() {
    insp('🖥️', 'Ancient computer', 'Beige, humming, awake', [
      'A beige tower under three inches of dust. The fan is running. It has been running for a very long time.',
      'The monitor shows a login prompt: CALLHALL CALL HANDLER v2.1 (2009).',
      'The username field is filled in already. It says: KEVIN.'],
      [{ t: 'Press enter.', to: null, do() { Acts._ancient(); } },
       { t: 'Turn the monitor off.', to: null, do() { UI.toast('🖥️', 'You turn the monitor off. The fan keeps running.'); } }]);
  },
  _ancient() {
    G.flags.ancient = true; Player.xp(50); Sfx.bad(); FX.shake(6);
    insp('🖥️', 'CALL HANDLER v2.1', 'Session resumed', [
      'The screen redraws in green text.',
      'ACTIVE CALLS: 1',
      'CALL REF: 000001 — DURATION: 6,043,912 minutes — STATUS: ON HOLD',
      'AGENT: KEVIN — STATUS: AVAILABLE',
      'Somewhere above you, in the server room, something clicks over.']);
    Q.start('q_kevin');
  },
  lockedCabinet() {
    if (G.flags.cabinetOpen) return insp('🗄️', 'Cabinet', 'Open', ['Empty now. You have taken everything that was in it. There was not much and it was enormous.']);
    if (Item.has('keycard') || G.flags.keycard) {
      G.flags.cabinetOpen = true; Item.give('goldset');
      return insp('🗄️', 'Locked cabinet', 'Opened', [
        'The keycard also does this door. Of course it does. There is one key for everything and it is Terry.',
        'Inside: a single headset, gold-plated, in a presentation box. Employee of the Month, 2011. Awarded to Kevin.',
        'It was never collected.']);
    }
    insp('🔒', 'Locked cabinet', 'Locked', ['Locked. The lock is decent, which in this building is the most suspicious thing about it.']);
  },
  headsetPile() { insp('🎧', 'Pile of dead headsets', 'One working ear each', ['You could build one good headset from forty bad ones. Nobody ever has. It is the single most representative object in the building.'],
    [{ t: 'Build one good headset.', to: null, if: () => !Item.has('headset'), do() { G.minutes += 20; Item.give('headset'); Player.xp(45); UI.toast('🎧', 'Twenty minutes and forty corpses later: one working noise-cancelling headset.'); } },
     { t: 'Leave the pile.', to: null }]); },
  personnel() { insp('🗃️', 'Personnel files', 'Pre-digitisation', [
    'Paper files. Most are thin. One is enormous, and the tab says: SYNERGY.',
    'Inside the Synergy file: four starter forms, all dated the same day in 2011, all with the same handwriting, all with different names.',
    'There is no leaver form. There has never been a leaver form.']); },

  /* --- management floor --- */
  nigelPC() { insp('🖥️', 'Nigel’s monitor', 'Locked', ['Locked. Post-it on the bezel: “inbox zero by friday”. The post-it has faded. It is from a Friday that has passed.']); },
  charts() { insp('📊', 'Performance charts', 'Printed weekly', ['Four charts. Three go up. One goes down and has been re-labelled so it goes up.']); },
  q3() { insp('📈', 'The Q3 graph', 'A line, rising', ['A single line rising steadily from left to right. No axis labels. No units. No title beyond “Q3”.',
    'It is the most reassuring object in the building and it contains no information whatsoever.']); },
  bigPlant() { insp('🪴', 'Enormous healthy plant', 'Management floor', ['Six feet tall, glossy, thriving. It is watered by a contractor who comes on Tuesdays.', 'The main floor plant has three leaves. This is not a metaphor, it is a purchase order.']); },
  synergy() {
    if (G.flags.sawSynergy) return insp('🚪', 'Synergy Department', 'Please knock', [
      'You know what is in there now.',
      'Four desks. Four chairs. Four monitors, all showing the same spreadsheet, none of them plugged into anything.',
      'And a kettle, which is warm.']);
    insp('🚪', 'Synergy Department', 'Please knock', [
      'A door with four names on it. All four names are printed in the same font, at the same time, on the same day.',
      'Through the frosted glass: four shapes, seated, still, facing the same direction.'],
      [{ t: 'Knock.', to: null, do() {
          Sfx.tone(220, .1, 'square', .3); Sfx.tone(220, .1, 'square', .3, .25);
          UI.toast('🚪', 'Nothing. Then, from inside, four chairs move at once, and then nothing again.', 'bad');
        } },
       { t: 'Open it.', to: null, if: () => G.flags.keycard, do() { Acts._openSynergy(); } },
       { t: 'Do not open it.', to: null }]);
  },
  _openSynergy() {
    G.flags.sawSynergy = true; Player.xp(70); Ach.get('a_synergy'); Sfx.bad(); FX.shake(8);
    insp('🕴️', 'Inside Synergy', 'Four desks', [
      'The keycard works. Of course it works. There is one key for everything and it is Terry.',
      'The room is empty.',
      'Four desks in a row. Four chairs, pushed in — properly in, the way Bev asks and nobody does. Four monitors, all showing the same spreadsheet, scrolling.',
      'None of the monitors are plugged into anything. You check twice. You check a third time.',
      'On the far desk: four lanyards, laid out flat, side by side, in order. And a kettle, which is warm.',
      'And a single sheet of A4, printed today, which reads: “HEADCOUNT: 4. UTILISATION: 100%. NO ACTION REQUIRED.”',
      'You leave. You close the door properly. On the way out you notice you have pushed your chair in without deciding to.']);
    if (Q.active('q_spreadsheet')) Q.step('q_spreadsheet');
  },
  spreadsheet() {
    if (!G.flags.sawSpreadsheet) {
      G.flags.sawSpreadsheet = true; Player.xp(60); Q.step('q_spreadsheet'); Sfx.bad(); FX.shake(5);
      return insp('🖥️', 'THE SPREADSHEET', 'The monitor nobody sits at', [
        'A monitor in the corner. No chair. No cables you can see, which is not the same as no cables.',
        'On the screen: a spreadsheet. Thousands of rows. AHT, CSAT, SLA, Utilisation, Productivity. Every agent. Every call. Every minute of every toilet break.',
        'As you watch, a cell updates. Then another. Nobody is typing.',
        'Down in the corner is a row with your name on it. It was created before you started.']);
    }
    if (Q.active('q_spreadsheet') && G.quests.q_spreadsheet.step >= 3 && !G.flags.finalDone) {
      return insp('📊', 'THE SPREADSHEET', 'It has noticed you', [
        'The cells stop updating. All of them. At once.',
        'A new sheet opens. The tab at the bottom says: ANNUAL PERFORMANCE REVIEW.',
        'Cell A1 populates, letter by letter, as though typed by someone being careful: “ARE YOU AVAILABLE NOW?”'],
        [{ t: 'Yes.', to: null, do() { setTimeout(() => { UI.flash('#fff', .8); Combat.startBoss('review'); }, 500); } },
         { t: 'Can we schedule something for next week?', to: null, do() { UI.toast('📊', 'Cell A1 clears. It types: “I HAVE PUT SOMETHING IN.” Your calendar makes a noise.'); P.stats.bullshit += 2; } }]);
    }
    insp('🖥️', 'THE SPREADSHEET', 'Recalculating', ['It updates. You watch a number about you change, and you do not know which way is good.']);
  },

  /* --- toilets --- */
  toilet(o) {
    if (G.flags.looClosed && o.n === 1) return insp('🚽', 'Cubicle 2', 'OUT OF ORDER', ['A handwritten sign. Nobody knows who wrote it. Nobody will take it down. It has been there, in this state, for what may be years.']);
    insp('🚽', o.name, 'Sanctuary', ['The cubicle. Four walls, a door, a lock, and no telephone.'],
      [{ t: 'Ten strategic minutes.', to: null, do() {
          G.minutes += 10; count('toiletMin', 10);
          Player.mod({ patience: 18 + Sk.rank('breaks') * 6, energy: 5 });
          Ach.get('a_break');
          UI.toast('🚽', 'Ten minutes. You look at your phone. You do not read anything. You just hold it. It is enough.');
        } },
       { t: 'Two minutes and back to it.', to: null, do() { G.minutes += 2; count('toiletMin', 2); Player.mod({ patience: 6 }); } },
       { t: 'Actually, no.', to: null }]);
  },
  sink() { insp('🚰', 'Sink', 'Cold only', ['Cold tap works. Hot tap has been reported. The report has a reference number. The reference number is longer than the sink.']); },
  mirror() {
    insp('🪞', 'Mirror', 'You', [
      'You look at yourself in a work mirror at ' + clockStr(G.minutes) + '.',
      pick(['You look fine. Genuinely. Tired, but fine.',
        'Your lanyard is on backwards. It has been on backwards all day. Four people saw and said nothing, out of kindness.',
        'You practise the face. The one that goes with “I completely understand”. It is very good. That is the frightening part.'])],
      [{ t: 'Right. Back to it.', to: null, do() { Player.mod({ patience: 6 }); } }]);
  },
  graffiti() {
    const g = ['“KEVIN IS STILL ON HOLD.”', '“I WOULD RATHER BE ON HOLD.”',
      '“ERROR 47 IS A STATE OF MIND.”', '“ask terry about 2004”',
      '“the spreadsheet knows how long you have been in here”', '“DAVE WAS RIGHT”',
      '“the poop roll is by cubicle two. this is not the poop roll.”'];
    G.flags.sawGraffiti = true;
    insp('🖊️', 'Graffiti', 'Cubicle wall, biro, years of it', g);
  },
  looCupboard() { insp('🧻', 'Supply cupboard', 'Larger inside than out', ['Enough toilet roll for six years. Ordered once, in a panic, in 2020. It is the only part of this company with a contingency plan.']); },
  /* The building's only listed monument. Everything else on these walls was
     signed off by somebody; this was not, and it is the only one anybody has
     ever read to the end. */
  poopRoll() {
    G.flags.sawPoopRoll = true;
    insp('🧻', 'Toilet roll holder', 'Between cubicles one and two', [
      'A chrome holder with a sprung flap. On the flap, in biro, in small, extremely neat capitals: POOP ROLL. There is an arrow. The arrow points at the toilet roll.',
      'It was written by Harpreet, who was on the phones at the time and who is understood to have been having a Wednesday.',
      'Eleven weeks later Harpreet was promoted to management, and some time after that she stopped working here altogether, and nothing she produced in either capacity has lasted anything like as well.',
      'Facilities have replaced the flap twice. Both times the words were back inside a fortnight, in a different hand, in the same very neat capitals. Terry has stopped replacing the flap. Terry describes this as “a decision”.'],
      [{ t: 'Read it again, properly, like a plaque.', to: null, do() {
          Player.mod({ patience: 8 });
          Ach.get('a_poop');
          UI.toast('🧻', 'Somewhere upstairs there is a slide deck with her name on it that nobody opened. This has been read, aloud, by four hundred people. She will never know.');
        } },
       { t: 'Add to it.', to: null, do() {
          P.stats.chaos += 1;
          UI.toast('🧻', 'You get the pen out. You hold it there for a moment. Then you put it away, because you know — everyone in here knows — that it is finished.');
        } },
       { t: 'Wash your hands and say nothing.', to: null }]);
  },
  otherRoll() { insp('🧻', 'Toilet roll holder (the other one)', 'Between cubicles three and four', [
    'An identical chrome holder with an identical sprung flap.',
    'Nothing is written on it. Nothing has ever been written on it. In eleven years, nobody has so much as tried.',
    'You cannot say why, and neither can anyone else, but it is very clearly not the one.']); },

  /* --- IT --- */
  server() { insp('💽', 'Server rack', '31 degrees', ['Lights. Hundreds of them, blinking in a pattern that is almost, but not quite, regular.', 'A fan is making a noise it should not be making. It has been making it for six years, which makes it a noise it should be making.']); },
  cables() {
    insp('🔌', 'Cable spaghetti', 'Do not pull', [
      'A knot the size of a dog. Somewhere in it, one cable is not connected to anything and has not been for a long time.',
      'Behind the knot, three patch panels. Every port on them is labelled. None of the labels is true.'],
      cab('cables').concat([{ t: 'Leave the dog alone.', to: null }]));
  },
  stevePC() { insp('🖥️', 'Steve’s monitor', 'Ticket queue', ['Open ticket #4471: “Printer”. Raised 2021. Status: In Progress. Last update: 2021.',
    'Below it, 340 more tickets, all “Printer”.']); },
  laptops() { insp('📦', 'Box of “fixed” laptops', 'Awaiting collection', ['Nine laptops with tape on them. The tape says FIXED. Steve applies the tape himself. The tape is the fix, in the sense that it is a decision.']); },
  oldCall() {
    /* The tune is still in the socket after Kevin has gone: the line is clear
       and the hold music is not, because nobody has ever turned it off. */
    if (G.flags.answeredOld) return insp('📟', 'Terminal', 'Line clear',
      ['The line is clear. For the first time since 2009, the display says: ACTIVE CALLS: 0.',
       'The hold music is still going. Nobody has ever found the switch.'],
      cab('oldCall').concat([{ t: 'Leave it be.', to: null }]));
    insp('📟', 'Call 000001 — status: ACTIVE', 'Duration: 6,043,912 minutes', [
      'An old terminal on a shelf, wired into the rack with a cable that is beige where everything else is black.',
      'The display reads: CALL 000001 — ON HOLD — 6,043,912 MINUTES.',
      'There is a headset socket. There is a headset hanging next to it. There is a thin, tinny sound coming out of it.',
      'It is hold music. It has been playing since 2009.'],
      [{ t: 'Put the headset on. Take the call.', to: null, do() { Acts._takeOldCall(); } }]
      .concat(cab('oldCall'))
      .concat([{ t: 'Not today.', to: null }]));
  },
  _takeOldCall() {
    G.flags.answeredOld = true; Sfx.holdMusic(true);
    insp('📟', 'CALL 000001', 'Connected', [
      'You put the headset on. The hold music stops.',
      'A voice, distant and calm: “Oh — hello! Hello. Someone’s picked up.”',
      '“I’ve been holding. I said I’d hold. They said someone would be with me shortly.”',
      '“I only rang to ask about my bill. I only put the kettle on.”',
      '“What year is it, at your end?”'],
      [{ t: '“It’s a long time later, Kevin.”', to: null, do() { Acts._kevinEnd(); } },
       { t: '“I’m so sorry. I’m so sorry you were left.”', to: null, do() { Acts._kevinEnd(); } }]);
  },
  _kevinEnd() {
    Sfx.holdMusic(false); Ach.get('a_kevin');
    G.flags.kevinFound = true;
    Q.complete('q_kevin');
    insp('📟', 'CALL 000001', 'Duration: 6,043,914 minutes', [
      '“...Right. Right, well. That explains the music.”',
      '“Don’t feel bad, love. Someone picked up. That’s all any of us are after, really. Someone picking up.”',
      '“Tell them I got through, would you? Tell them Kevin got through.”',
      'A click. The display changes: CALL 000001 — RESOLVED.',
      'The building is, for about four seconds, completely silent. Every phone. All of them. Then they start again.']);
    setTimeout(() => { FX.burst(P.x, P.y, '📞', 20, '#ffb347'); UI.flash('#fff', .5); }, 600);
  },

  /* --- secret room --- */
  server0() { insp('💾', 'Server 0', 'Not on any inventory', [
    'A single machine, older than the racks upstairs, running warm, connected to the building by one beige cable.',
    'A label, handwritten, peeling: “REPORTING — DO NOT DECOMMISSION — B.T. 2009”.',
    'On the screen, a spreadsheet is open. It is recalculating. It has been recalculating for sixteen years.']); },
  secretCoffee() {
    if (G.flags.stash) return insp('☕', 'The secret coffee stash', 'Depleted', ['You have taken from the stash. The stash forgives you.']);
    G.flags.stash = true; Item.give('double'); Item.give('coffee'); Item.give('biscuit'); Player.xp(30);
    insp('☕', 'The secret coffee stash', 'The real reason Terry comes down here', [
      'Proper coffee. A proper kettle. A tin of proper biscuits, the kind with foil.',
      'A folding chair, facing away from everything, with a cushion on it that has been sat in a great deal.',
      'This is where Terry goes. Thirty-one years, on and off. Mostly on.']);
  },
  doNotOpen() {
    insp('📦', 'Box marked DO NOT OPEN', 'Do not open', ['A cardboard box. On the side, in marker: DO NOT OPEN.'],
      [{ t: 'Open it.', to: null, do() {
          G.flags.opened = true; Player.xp(40); P.stats.chaos += 3;
          insp('📦', 'The box', 'Opened', [
            'Inside: every “employee of the month” certificate from 2009 to the present.',
            'All of them say KEVIN.', 'All of them are printed. None of them were ever collected.',
            'At the bottom, a single sheet of A4 in different handwriting: “he never hung up. keep him on the system. it keeps the numbers even.”']);
        } },
       { t: 'Honour the box.', to: null, do() { Player.mod({ rep: 3 }); UI.toast('📦', 'You honour the box. The box remains closed. This is the correct outcome and you will always wonder.'); } }]);
  },

  /* --- outside ---
     The car park and the road. Everything out here was already referred to from
     inside the building — the view off the fire escape looks down on this car
     park, the way out talks about the bus stop, and the Greggs has been a shop
     you could buy from for months without being a place you could stand. */
  carPark() {
    insp('🚗', 'The car park', 'Twenty-two spaces, forty staff', [
      'Twenty-two spaces. The building has forty staff on the fourth floor alone. Nobody has ever raised this, because raising it would identify you as somebody who drives.',
      pick(['A hatchback with a baby-on-board sign and no baby seat.',
        'An estate car with a roof box, in August, in a car park.',
        'A van belonging to a contractor who is not here and has not been here since March.'])]);
  },
  nigelSpace() {
    insp('🪧', 'RESERVED — N. GRIMSHAW', 'The best space', [
      'The space nearest the door, painted with his name. His actual name is Nigel Grimshaw and it is painted in full, both words, as though there might be another one.',
      'It is empty. He parks in the street, because somebody once keyed the car and he has never been able to prove it was about the space.']);
  },
  barrier() {
    insp('🚧', 'The barrier', 'Raised since 2019', [
      'A car park barrier, raised, and rusted into the raised position.',
      'It cost eleven thousand pounds. Terry has the remote. The remote has no battery and Terry has stopped mentioning it, on the grounds that a barrier nobody can lower is the same as a barrier nobody has.']);
  },
  puddle() {
    insp('💧', 'The permanent puddle', 'Independent of weather', [
      'A puddle in the same place in all weathers, including drought. Nobody knows where it comes from. Facilities have looked at it twice.',
      'Everybody walks round it. There is a worn arc in the tarmac where everybody walks round it, which is a bigger and more permanent thing than the puddle.']);
  },
  pallets() {
    insp('📦', 'Pallets, delivery bay', 'Awaiting collection', [
      'Four pallets, shrink-wrapped, in the delivery bay. The label says they are for the fourth floor.',
      'The top one has been opened. Inside: the ergonomic chairs that were announced in March, in a wellbeing email, with a photograph of somebody sitting in one.']);
  },
  smokingSpot() {
    Player.mod({ energy: 3 });
    insp('🚬', 'The bin everybody stands at', 'Five metres, allegedly', [
      'The bin outside the front door, with a lid you can put a cigarette out on, standing well inside the five metres the sign upstairs insists on.',
      'Nobody out here is smoking. Three people are standing at it holding phones. It is the only place in the building where a conversation is not minuted, which is why it is the most productive room in it.'],
      [{ t: 'Stand at the bin for a bit.', to: null, do() {
          G.minutes += 6; Player.mod({ patience: 6 }); P.stats.bullshit += .5;
          UI.toast('🚬', 'Six minutes. Nobody asks what you are doing, because everybody knows what you are doing, which is nothing, correctly.');
        } },
       { t: 'You have things to do.', to: null }]);
  },
  greggs() {
    insp('🥐', 'Greggs', 'Across the road', [
      'Across the road, lit like an operating theatre, permanently busy.',
      'The whole fourth floor’s opinion of a day is decided somewhere in here, at about half eleven.'],
      [{ t: 'Go in. (12 min.)', to: null, do() {
          G.minutes += 12; Player.mod({ energy: 4 }); Ach.get('a_greggs'); Shop.open('greggs');
        } },
       { t: 'Not today.', to: null }]);
  },
  busStop() {
    insp('🚏', 'The bus stop', 'The 41 and the 41A', [
      'The 41 and the 41A. The 41A is the same route as the 41 except that it does not stop here, which is not indicated anywhere at this stop.',
      'The timetable is behind scratched perspex and has been superseded twice.',
      'You could stand here. You could just stand here, and a bus would come, and it would take you somewhere that is not this.']);
  },
  streetBin() {
    insp('🗑️', 'The council bin', 'Emptied Thursdays', [
      'A council bin, emptied on Thursdays, full by Tuesday.',
      'On top of it, balanced with some care, a takeaway cup from the coffee machine on the fourth floor. Somebody carried it all the way down here rather than use the bin by the lift, and there is no explanation for that which is not slightly sad.']);
  },
  bench() {
    insp('🪑', 'The bench', 'Donated', [
      'A bench with a small brass plaque. The plaque says: IN MEMORY OF DOREEN, WHO LIKED IT HERE.',
      'It faces the car park.'],
      [{ t: 'Sit with Doreen for a minute.', to: null, do() {
          G.minutes += 5; Player.mod({ patience: 8, energy: 2 });
          UI.toast('🪑', 'Five minutes on Doreen’s bench. It is not a good view. She liked it here anyway, which is the part worth taking back upstairs.');
        } },
       { t: 'Leave it for somebody who needs it.', to: null }]);
  },

  /* --- MEETING ROOM 2 --- */
  meetTable() {
    if (G.flags.briefingToday && !G.flags.allhandsBeaten) {
      return insp('📽️', 'THE ALL-STAFF BRIEFING', 'Starting now · “30 mins”', [
        'The room is filling. Forty chairs for thirty-one people and everybody is standing at the back anyway.',
        'A laptop is being connected to the projector. It is not going well. It never goes well. It is going, in fact, exactly as well as it went last time, which everybody predicted and nobody said.',
        'Nigel is at the front holding a clicker. There are, according to the corner of slide one, sixty-one slides.'],
        [{ t: 'Sit at the front. Make eye contact. Ask a question at the end.', to: null, do() { setTimeout(() => Combat.startBoss('allhands'), 400); } },
         { t: 'Stand at the back near the door.', to: null, do() { G.minutes += 40; Player.mod({ patience: -12, energy: -8 }); P.stats.bullshit += 1; UI.toast('📽️', 'Forty minutes. You learn that the company is on a journey and that headcount is not the lever. You have absorbed nothing and lost forty minutes and this is, technically, attendance.'); } },
         { t: 'Do not attend. You are on the phones. That is a real reason.', to: null, do() { P.stats.chaos += 2; Player.mod({ rep: -1 }); UI.toast('📽️', 'You go back to the queue. Later, an email arrives titled “Briefing — for those who couldn’t make it” with the deck attached. The deck is 61 slides. You will not open it.'); } }]);
    }
    insp('🍽️', 'The long table', 'Seats eight, holds four', [
    'A veneered table long enough that the person at the far end is a different conversation.',
    'Under it, a nest of dead extension leads and one shoe. Nobody has ever mentioned the shoe.',
    'A ring of dried coffee marks the exact spot where every difficult conversation in this building has been had.']);
  },
  redTray() {
    if (!Q.active('q_complaint')) return insp('🟥', "The red tray", "Alan’s desk", [
      'A red plastic in-tray with three envelopes in it. The red tray is for formal complaints. There is also a grey tray, which is for everything else, and is empty.',
      'Alan works through the red tray at the rate of about one a day, forever, like a man bailing out a boat he is fond of.']);
    if (G.flags.readComplaint) return insp('📮', 'The complaint', 'Read', ['You have read it. All four pages. Including the dates.', 'It is not about the £38.']);
    G.flags.readComplaint = true; Q.step('q_complaint'); Player.xp(45);
    insp('📮', 'The Formal Complaint', 'Four pages, handwritten, then typed', [
      'Somebody has written this out by hand and then typed it up, which means they wrote it twice, which means they sat with it.',
      'Contact one: the 11th. Told someone would ring back within 24 hours.',
      'Contact two: the 19th. Different agent. Started from the beginning. Told someone would ring back.',
      'Contact three: the 19th, again, forty minutes later. Cut off.',
      'Contact four: the 30th. Eleven days. Eleven days of nothing, in the middle of a document about £38.',
      'The last line: “I do not want the money back. I want somebody to tell me what happened between the 19th and the 30th.”',
      'Nobody has ever answered that question, in the entire history of this industry.']);
    UI.objective('Take the complaint call with Alan.');
  },
  meetChair() {
    G.minutes += 4; Player.mod({ patience: 5 });
    insp('🪑', 'Meeting chair', 'Wheeled, unwilling', ['You sit in a meeting room with no meeting in it. Four minutes.',
      'This is the most senior you will ever feel and nobody is here to see it.']);
  },
  wallChair() { insp('🪑', 'The chair facing the wall', 'Turned away', [
    'One chair has been turned to face the wall. Not pushed in. Turned.',
    'Nobody knows who did it or when. It has been like that longer than most people have worked here.',
    'Every so often somebody turns it back, and by Monday it is facing the wall again.'],
    [{ t: 'Turn it round.', to: null, do() { P.stats.chaos += 1; UI.toast('🪑', 'You turn it round. It will be facing the wall again by Monday. It always is.'); } },
     { t: 'Leave it. It knows something.', to: null, do() { Player.mod({ rep: 1 }); } }]); },
  whiteboard() { insp('🖍️', 'The whiteboard', 'Permanent marker, allegedly not', [
    pick(['“WHAT DOES GOOD LOOK LIKE?” — written in 2023, half-erased, still legible, still unanswered.',
      'A mind map with eleven bubbles. Ten say “comms”. The eleventh says “culture??” and is circled twice.',
      'A drawing of the escalation ladder. Somebody has added a small figure at the bottom, waving.',
      '“Q4 PRIORITIES: 1. Everything. 2. Also everything.”',
      'The words DO NOT ERASE, written in a pen that erases.']),
    'One marker works. It is the black one. It is always the black one, and it is never where the black one lives.']); },
  hdmi() { insp('🔌', 'The HDMI cable', 'The great humbler', [
    'A single HDMI cable, taped to the table, leading up into the ceiling and, from there, into legend.',
    'It has worked twice. Both times were witnessed. Neither can be reproduced.',
    'Beside it, four dongles for four laptops the company has never issued.'],
    [{ t: 'Try it.', to: null, do() {
        if (chance(.15)) { Player.xp(60); P.stats.knowledge += 1; UI.toast('📽️', 'It works. Instantly. First time. You look around for a witness and there is nobody. Nobody will ever believe you.', 'gold'); Ach.get('a_hdmi'); }
        else { Player.mod({ patience: -6 }); UI.toast('📽️', pick(['NO SIGNAL.', 'The projector shows the desktop of a laptop that is not in the room.', 'It works, then stops, then works, then stops, in time with your breathing.'])); }
      } },
     { t: 'Do not try it. You know what it does to people.', to: null }]); },
  meetClock() { insp('🕰️', 'Meeting room clock', 'Seven minutes fast', [
    'The clock in this room is seven minutes fast. Everybody knows. Nobody has fixed it.',
    'It is, as a result, the only room in the building where meetings start on time, and everyone is furious about it.']); },
  booking() { insp('📱', 'Room booking screen', 'Booked', [
    'A tablet on the wall showing the room’s bookings.',
    '09:00–17:00 — K. WHITLOW — “Hold”.',
    'Tomorrow: 09:00–17:00 — K. WHITLOW — “Hold”.',
    'The recurrence ends in 2031. Karen booked it once, in a panic, and does not know how to stop it.'],
    [{ t: 'Book the room for yourself. All day. Forever.', to: null, do() {
        G.flags.bookedRoom = true; P.stats.chaos += 3; Player.xp(30); Ach.get('a_booked');
        UI.toast('📱', 'You set a recurring all-day hold until 2044. You have created a haunting. You feel wonderful.', 'gold');
      } },
     { t: 'Leave it. Karen has enough going on.', to: null, do() { Rel.add('karen', 1); } }]); },
  confPhone() {
    insp('📞', 'The conference phone', 'The spider', [
      'A grey plastic starfish in the middle of the table, with three lights, none of which mean anything.',
      'It has never successfully joined a call. It has, on four occasions, joined a different call.',
      'Once, in 2022, it dialled out on its own during a redundancy consultation. Nobody has ever confirmed who answered.'],
      [{ t: 'Press the green button.', to: null, do() {
          Sfx.ring(); FX.shake(4);
          UI.toast('📞', pick(['It beeps three times and joins a meeting about drainage in Carlisle.',
            'A voice says “...is anyone else on?” Nobody is. You are the only one. You hang up.',
            'Hold music. From 2009. You put it down very carefully.']), 'bad');
          if (G.flags.knowOldCall) { G.flags.confHeard = true; }
        } },
       { t: 'Leave the spider alone.', to: null }]);
  },
  meetBiscuits() {
    if (G.flags.tookMeetBiscuit) return insp('🍪', 'Untouched meeting biscuits', 'Now touched', ['The plate is empty. You are the reason. Nobody will ever say anything, which is worse.']);
    insp('🍪', 'Untouched meeting biscuits', 'For a meeting that finished at 10', [
      'A plate of biscuits ordered for a meeting that ended two hours ago.',
      'Nobody has taken one, because taking the first one means being the sort of person who takes the first one.',
      'They will be thrown away at four. They are always thrown away at four.'],
      [{ t: 'Be the sort of person who takes the first one.', to: null, do() {
          G.flags.tookMeetBiscuit = true; Item.give('goodbiscuit'); Item.give('goodbiscuit'); P.stats.chaos += 1; Player.xp(20);
          UI.toast('🍪', 'You take two. The plate is broken open. By four o’clock there will be none, and the office will have been briefly, quietly happy.');
        } },
       { t: 'Maintain the standoff.', to: null, do() { Player.mod({ rep: 1 }); UI.toast('🍪', 'You maintain the standoff. Somebody has to.'); } }]);
  },
  waterJug() { Player.mod({ energy: 3 }); insp('🫙', 'Water jug', 'Room temperature', [
    'A jug of water and eight upturned glasses, refreshed every morning by somebody nobody has ever seen doing it.',
    'You pour one. It tastes of jug.']); },

  /* --- THE WELLBEING ROOM --- */
  beanbag() {
    G.minutes += 8; Player.mod({ patience: 14 + Sk.rank('breaks') * 4, energy: 6 });
    insp('🛋️', 'The beanbag', 'Procured 2021 · used 3 times', [
      'A large purple beanbag, bought as part of a wellbeing initiative, photographed once for the careers page, and never sat in since.',
      'You sit in it and it accepts you with a long granular sigh, like something agreeing to hold you while reserving the right to reconsider. Getting out will be its own event.',
      'For eight minutes you are horizontal at work and legally allowed to be. This is the most radical thing you have ever done.']);
    Ach.get('a_beanbag');
  },
  yogaMat() { insp('🧘', 'Rolled yoga mat', 'Still in the plastic', [
    'A yoga mat, still in its plastic, standing in the corner like a rolled-up promise.',
    'A sticker on the wrapper: “LUNCHTIME YOGA — THURSDAYS”. It says Thursdays. There have been 200 Thursdays.']); },
  massage() { insp('💆', 'Massage chair', 'OUT OF ORDER (2022)', [
    'A black leather massage chair with a laminated sign taped over the controls: OUT OF ORDER.',
    'Under the sign, a second sign: “IT IS NOT OUT OF ORDER, IT IS UNPLUGGED, PLEASE STOP TAPING SIGNS TO IT.”',
    'Over that, a third sign: OUT OF ORDER.'],
    [{ t: 'Look behind it for the plug.', to: null, do() {
        P.stats.knowledge += 1; Player.xp(25);
        UI.toast('💆', 'It is plugged in. It has always been plugged in. You sit in it. It works. You tell nobody, for the same reason nobody told you.');
        Player.mod({ patience: 12 }); G.minutes += 6;
      } },
     { t: 'Respect the signs.', to: null }]); },
  diffuser() { insp('🕯️', 'Aromatherapy diffuser', 'Empty since March', [
    'A reed diffuser with no liquid in it and reeds that have gone the colour of an old envelope.',
    'The label says “CALM”. Underneath, smaller: “Contains: fragrance.”']); },
  wellPoster() { insp('🖼️', 'Poster: BE KIND TO YOURSELF', 'Wellbeing Room', [pick([
    '“BE KIND TO YOURSELF.” In the corner, a QR code that leads to a 404.',
    '“IT’S OK NOT TO BE OK.” Beneath, in biro: “is it though”. Beneath that, different pen: “yes”.',
    '“TAKE FIVE MINUTES FOR YOU.” The room is booked out as overflow storage from 12 to 4.',
    '“TALK TO SOMEONE.” The number listed is the main switchboard. The main switchboard is you.'])]); },
  tracker() { insp('📊', 'The Wellbeing Tracker', 'How are you feeling today?', [
    'A screen with five faces on it, from a big green smile to a small red frown. Press one. It is anonymous.',
    'Under the screen, printed and laminated: “LAST MONTH’S RESULTS: 3.8/5 — thank you for your honesty!”'],
    [{ t: 'Press the big green smile.', to: null, do() { P.stats.bullshit += 1; UI.toast('📊', 'It says “Thanks!” It does not ask why. It has never asked why.'); } },
     { t: 'Press the small red frown.', to: null, do() {
        Player.mod({ patience: 4 }); G.flags.pressedFrown = true; Ach.get('a_frown');
        UI.toast('📊', 'It says “Thanks!” — the same “Thanks!”, in the same font, at the same speed. Nothing else happens. Nothing was ever going to.');
      } },
     { t: 'Press all five, in order, very fast.', to: null, do() { P.stats.chaos += 2; UI.toast('📊', 'You press all five. The screen says “Thanks!” five times. Somewhere, a monthly average moves by nothing at all.'); } }]); },
  suggestions() {
    if (G.flags.openedSuggestions) {
      return insp('🗳️', 'The Suggestion Box', 'Read once, by you', ['You have already read them. You think about them more than you would like.'],
        [{ t: 'Put a suggestion in.', to: null, do() { Acts._suggest(); } }, { t: 'Leave it.', to: null }]);
    }
    G.flags.openedSuggestions = true; Player.xp(35);
    insp('🗳️', 'The Suggestion Box', 'Emptied: never', [
      'A wooden box with a slot, screwed to the wall in 2014. It has no lock, because it has no back.',
      'You tip it and eleven years of suggestions come out.',
      '“More parking.” “Fix the printer.” “Fix the printer.” “Fix the printer.”',
      '“Could we have a window that opens.” — this one is on good paper, and folded twice, and it is heartbreaking.',
      '“Please stop calling us the family. My family knows my birthday.”',
      'And at the very bottom, in handwriting that matches the label on Server 0: “please stop giving me the numbers to do. i do not want to do the numbers. — B.T. 2009”'],
      [{ t: 'Put your own suggestion in.', to: null, do() { Acts._suggest(); } },
       { t: 'Put them all back exactly as they were.', to: null, do() { Player.mod({ rep: 2 }); G.flags.knowBT = true; } }]);
    G.flags.knowBT = true;
  },
  _suggest() {
    insp('🗳️', 'Your suggestion', 'One slip of paper', ['There is a pad and a pencil on a string. What do you write?'],
      [{ t: '“Fix the printer.”', to: null, do() { P.stats.chaos += 1; UI.toast('🗳️', 'You add it to the pile. The pile receives it like the sea receives a stone.'); } },
       { t: '“A window that opens.”', to: null, do() { Player.mod({ rep: 3 }); UI.toast('🗳️', 'You write it on the good paper. You fold it twice. You do not know why you folded it twice.'); } },
       { t: '“Everyone here is doing their best. Tell them.”', to: null, do() { Player.mod({ rep: 5 }); Player.xp(30); Ach.get('a_suggest'); UI.toast('🗳️', 'Nobody will read it. You wrote it anyway. That is, on balance, the whole job.', 'gold'); } }]);
  },
  colouring() { insp('🖍️', 'Mindfulness colouring book', 'Pages 1–3 completed', [
    'A mindfulness colouring book. The first three pages are done, beautifully, in one sitting, in 2021.',
    'Page four is half done and stops mid-leaf, as though the person was called away and never came back.',
    'They were. That is exactly what happened. Nobody has had the heart to finish it.'],
    [{ t: 'Finish the leaf.', to: null, do() { G.minutes += 10; Player.mod({ patience: 15 }); Player.xp(25); Ach.get('a_leaf'); UI.toast('🖍️', 'You finish the leaf. It takes ten minutes. It is the only thing you complete today that stays completed.', 'gold'); } },
     { t: 'Leave it as it is.', to: null }]); },
  wellBox() { insp('📦', 'The Wellbeing Box', 'Contents: as procured', [
    'A cardboard box marked WELLBEING. Inside: forty perished stress balls, a leaflet on sleep hygiene, and a bag of herbal tea nobody will drink.'],
    [{ t: 'Take a stress ball.', to: null, do() { Item.give('stress'); } },
     { t: 'Take the herbal tea.', to: null, do() { Item.give('teabag'); } },
     { t: 'Read the leaflet on sleep hygiene.', to: null, do() { Player.mod({ patience: -3 }); UI.toast('📄', '“Avoid screens for an hour before bed.” You look at the screen you are reading this on. It looks back.'); } }]); },
  deadPlant() { insp('🪴', 'Wellbeing plant', 'Deceased', [
    'The plant in the wellbeing room is dead. Comprehensively. It is the driest object in the building.',
    'A small card in the soil reads: “LIVING WALL — PHASE ONE”. There was no phase two.']); },
  usageLog() { insp('📋', 'Wellbeing room usage log', 'Please sign in', [
    'A clipboard by the door. Please sign in when using the room, so we can demonstrate uptake.',
    'Entries: 14 March 2021 — “J. Okonkwo — 20 mins”. 14 March 2021 — “J. Okonkwo — 20 mins (again)”.',
    'Then nothing. Then, in a different pen, dated last month: “someone was crying in here at 2pm and i didnt know what to do. sorry. i shut the door.”'],
    [{ t: 'Sign in.', to: null, do() { G.flags.signedWell = true; Player.mod({ rep: 2 }); UI.toast('📋', 'You sign in. Uptake has doubled. Head office will be told and will not care.'); } },
     { t: 'Use the room without signing in, like a criminal.', to: null, do() { P.stats.chaos += 1; } }]); },

  /* --- FIRE ESCAPE --- */
  noSmoking() { insp('🚭', 'NO SMOKING WITHIN 5 METRES', 'Facilities', [
    'A sign stating that smoking is not permitted within five metres of the building.',
    'The sign is bolted to the building. Everyone stands directly under it, five metres from a different part of the building, and considers the matter settled.',
    'Terry made the sign. Terry stands under it.']); },
  ashtray() { insp('🪣', 'The bin that is an ashtray', 'Neither, functionally', [
    'A steel bin that has become an ashtray by consensus rather than design.',
    'Balanced on the rim: half a vape, three cigarette ends, and a paper cup with a spoon still in it — the sediment of every honest conversation this company has ever had.'],
    [{ t: 'Take the vape. Somebody left it.', to: null, if: () => !Item.has('vape'), do() { Item.give('vape'); P.stats.chaos += 1; } },
     { t: 'Leave it.', to: null }]); },
  theStep() {
    G.minutes += 7; Player.mod({ patience: 16 + Sk.rank('breaks') * 5, energy: 4 });
    G.flags.satOnStep = true; Ach.get('a_step');
    insp('🪜', 'The step everyone sits on', 'Concrete, cold, correct', [
      'One concrete step, worn smooth in two places by fifteen years of people sitting on it.',
      'You sit down. Outside air. A wall. A bin. A pigeon at a distance it has decided is safe.',
      pick(['Nobody says anything for a while, and it is not awkward, and that almost never happens indoors.',
        'Somebody left half a conversation out here and you can still feel the shape of it.',
        'From here you can hear the phones, faintly, through the door. From here they sound like weather.']),
      'Seven minutes. Then back in. But seven minutes.']);
  },
  theView() { insp('🌆', 'The view', 'North-east, over the bins', [
    'From the fire escape you can see: the bins, a wall, a strip of car park, and — if you lean — actual sky.',
    'It is not a good view. It is the only one, and people say “not bad, this” about it every single day, and mean it.',
    pick(['Somebody has scratched a small tally into the handrail. Forty-one marks. Nobody knows what they are counting.',
      'The Greggs is directly below. You can smell what everyone downstairs is about to have for lunch.',
      'A man in the car park has been sitting in his car with the engine off for eleven minutes. You know exactly what that is. You have been that car.'])]); },
  pigeon() {
    G.flags.pigeonMet = (G.flags.pigeonMet || 0) + 1;
    if (G.flags.pigeonMet === 1) { Player.xp(20); return insp('🐦', 'The pigeon', 'Non-staff', [
      'A pigeon regards you with the flat confidence of something that has never been asked for a reference number.',
      'It has one and a half feet and the bearing of a middle manager. It does not move when you approach. Why would it. It works here more than you do.',
      'Somebody has been feeding it. Everybody has been feeding it and each of them thinks they are the only one.']); }
    if (G.flags.pigeonMet >= 5 && !G.flags.pigeonFriend) {
      G.flags.pigeonFriend = true; Player.xp(60); Ach.get('a_pigeon'); Item.give('feather');
      return insp('🐦', 'The pigeon', 'Colleague', [
        'The pigeon walks towards you. This has never happened to anyone.',
        'It stands beside your foot for a while, looking out over the bins, in what is unmistakably companionable silence.',
        'Then it leaves a single grey feather on the step, and goes, and you are aware that you have been given something.',
        'You will tell people about this. They will not react correctly. Nobody ever does.'], null);
    }
    insp('🐦', 'The pigeon', 'Non-staff', [pick([
      'The pigeon is here again. Or a pigeon. You are not certain there is a difference and you are not certain it matters.',
      'It has found a chip. It is not eating the chip. It is guarding the chip. There is a lesson here about ownership.',
      'It looks at you. You look at it. Neither of you has anywhere to be, which is a lie, and both of you know whose.',
      'It coos once, which in this building counts as a full and frank exchange of views.'])]);
  },
  wetCardboard() { insp('📦', 'Wet cardboard', 'Since the spring', [
    'A stack of flattened cardboard boxes, put out to be recycled, rained on, and thereby promoted to permanent architecture.',
    'One box is still legible: “MASSAGE CHAIR — THIS WAY UP”.']); },
  propExtinguisher() { insp('🧯', 'Fire extinguisher', 'Propping the fire door', [
    'A fire extinguisher is holding the fire door open.',
    'This is a fire safety violation being committed by fire safety equipment, and everybody on this floor knows it, and the door stays open, because if it shuts you cannot get back in without going round the front past Ron.',
    'Terry calls this “the arrangement”.']); },

  /* --- new main-floor & corridor fixtures --- */
  goodChair() {
    if (G.flags.gotGoodChair) {
      G.minutes += 5; Player.mod({ patience: 12, energy: 8 });
      return insp('💺', 'The Good Chair', 'Yours now', ['Lumbar support. Working gas lift. All five castors. You sit in it and your spine writes you a thank-you note.']);
    }
    insp('💺', 'The Good Chair', 'Gary’s', [
      'It has arms. It has a working gas lift. It has all five castors, and one of them is not from a different chair.',
      'There is exactly one of these in the building and Gary is sitting in it, and Gary is leaving in two months, and has been for three years.',
      'A strip of masking tape on the back says GARY in permanent marker, which is not a company system, which is precisely why it works.'],
      [{ t: 'Sit in it while he is at lunch.', to: null, do() {
          G.minutes += 4; Player.mod({ patience: 10 }); Rel.add('gary', -1); P.stats.chaos += 1;
          UI.toast('💺', 'Four minutes of genuine lumbar support. You will think about this on your deathbed.');
        } },
       { t: 'Ask Gary about the chair.', to: null, if: () => !Q.active('q_chair') && !Q.complete2('q_chair'), do() { Q.start('q_chair'); UI.objective('Ask Gary about The Good Chair.'); } },
       { t: 'Look at it and want.', to: null }]);
  },
  firstAid() { insp('🩹', 'First aid box', 'Checked monthly', [
    'A green box on the wall. Inside: eleven blue plasters, a triangular bandage nobody can fold, and a form.',
    'The form is for recording what you took. The form is longer than the injury.',
    'The accident book beside it has one entry, from 2018: “trapped finger — meeting room door — no further action”. The finger was Nigel’s. He filled it in himself, in the third person.']); },
  /* Signing the card is step two of Who Is Marcus — but only once you know who
     he is. The job can be started from this card by somebody who has never met
     him, and in that order finding him out is still step one. Marcus's own
     dialogue catches up the other way round. */
  _signed() {
    if (G.flags.signedCard && Q.active('q_marcus') && G.flags.metMarcus) Q.step('q_marcus');
  },
  birthdayCard() {
    if (G.flags.signedCard) return insp('🎂', 'The birthday card', 'Signed', ['You have signed it. It is now three desks further along and travelling.']);
    insp('🎂', 'The birthday card, circulating', 'For Marcus', [
      'A card in a brown envelope with a name on it: MARCUS.',
      'Thirty-one signatures. Twenty-eight of them are just names. Two say “Happy Birthday!”. One says “Happy Birthday Marcus — from the phones team” in your own handwriting from a previous week you cannot remember.',
      'You do not know Marcus. You are not sure anybody does.'],
      [{ t: 'Sign it: “Happy birthday!”', to: null, do() { G.flags.signedCard = true; Player.mod({ rep: 1 }); Acts._signed(); UI.toast('🎂', 'You add a name to a card for a man you have never met. This is how community works and it is fine.'); } },
       { t: 'Sign it: “Marcus — I hope you are real.”', to: null, do() { G.flags.signedCard = true; G.flags.cardWeird = true; P.stats.chaos += 2; Player.xp(15); Acts._signed(); UI.toast('🎂', 'You write it before you can stop yourself. It is going to be read out. It is always read out.'); } },
       { t: 'Find out who Marcus actually is.', to: null, if: () => !Q.active('q_marcus') && !Q.complete2('q_marcus'), do() { Q.start('q_marcus'); } },
       { t: 'Pass it on unsigned. Someone else’s problem.', to: null, do() { Player.mod({ rep: -1 }); } }]);
  },
  wallboard() { insp('📊', 'The wallboard', 'Live queue statistics', [
    'A television bolted high on the wall showing the queue in real time, in colours designed by somebody who has never taken a call.',
    'CALLS WAITING: ' + Phones.waiting() + '. LONGEST WAIT: ' + ri(4, 19) + ':' + String(ri(10, 59)) + '. SERVICE LEVEL: ' + ri(31, 68) + '%.',
    'The number is red. The number has been red since the wallboard was installed. Red was chosen because it stands out, and it does, and now nobody sees it.',
    'Below, a scrolling banner: “GREAT WORK TEAM — REMEMBER TO SMILE, THEY CAN HEAR IT”.']); },
  trophies() { insp('🏆', 'Trophy shelf', 'Main floor', [
    'A glass shelf with four trophies on it.',
    '“REGIONAL CONTACT CENTRE OF THE YEAR — HIGHLY COMMENDED — 2013.”',
    '“BEST NEWCOMER — 2014 — awarded to the site, not a person, which was noted at the time.”',
    'Two identical crystal blocks engraved “EXCELLENCE”. Nobody knows what they were for. They are dusted weekly by Bev, who also does not know, and who dusts them anyway, because they are on the list.']); },
  aircon() { insp('🧊', 'Air conditioning unit', 'Two modes', [
    'The air conditioning has two settings: off, and Baltic.',
    'The controls are in a locked box. The key is on Terry’s ring. Terry sets it to Baltic on the first warm day of the year and then goes on leave.',
    'Four people at this end of the floor work in coats. Two people at the far end have a fan. Between them lies a border, patrolled without violence for six years.']); },
  window() { insp('🪟', 'The window', 'Sealed unit', [
    'A window. Sealed. Not painted shut — engineered shut, deliberately, at manufacture, by somebody who had thought about it.',
    'Outside: a car park, a wall, and about four inches of sky if you put your face against the glass, which people do, and which everybody pretends not to see.']); },
  hotDesk() { insp('🪧', 'HOT DESKING sign', 'New ways of working', [
    '“THIS IS A HOT DESK ZONE. PLEASE CLEAR YOUR DESK AT THE END OF EACH DAY.”',
    'Every desk in the zone has a photograph, a plant, a cardigan on the back of the chair, and in one case a small ceramic owl.',
    'The hot desking policy was introduced four years ago. It was won, comprehensively, by the owl.']); },
  doorNowhere() { insp('🚪', 'Door to nowhere', 'Fire door, sealed', [
    'A fire door in the middle of the wall with a bar across it and a sign reading ALARMED.',
    'Behind it, according to the floor plan, is the outside of the building at the fourth floor.',
    'It has a doormat. Somebody, at some point, put a doormat in front of a door that opens onto a four-storey drop, and that person had a whole reason for it, and has left.']); },
  values() { insp('🖼️', 'The Wall of Values', 'Corridor', [
    'Five words in a serif font, one metre tall each: INTEGRITY. PASSION. TOGETHERNESS. EXCELLENCE. AGILITY.',
    'There were six. The sixth has been removed and the paint behind it is a slightly different white, so you can still read it if the light is right.',
    'The sixth one was HONESTY. Nobody will tell you why it came down and everybody knows.']); },
  floorPlan() { insp('🗺️', 'Floor plan', 'Rev. 4 · 2016', [
    'A laminated plan of the floor. It shows: a canteen (closed 2017), a smoking shelter (removed), and a room marked simply “PLANT”.',
    'The Wellbeing Room is drawn in biro, freehand, by somebody who did their best.',
    'You are here. The YOU ARE HERE arrow points at the men’s toilets.']); },
  corridorBoxes() { insp('📦', 'Boxes that have been there a year', 'Awaiting collection', [
    'Six boxes stacked against a corridor wall, wrapped in pallet film, with a delivery note dated fourteen months ago.',
    'They are addressed to a department that no longer exists, in a building that does.',
    'Everybody walks round them. Nobody has ever walked into them. The building has grown a new shape around these boxes.'],
    [{ t: 'Open one.', to: null, do() { Player.xp(20); P.stats.chaos += 1; UI.toast('📦', 'Inside: 4,000 branded pens. All say CALLHALL SERVICES — LISTENING TO YOU SINCE 2009. None of them work.'); Item.give('pen'); } },
     { t: 'Walk round them like everybody else.', to: null }]); },
  wayToMgmt() { insp('🪧', 'THIS WAY TO MANAGEMENT', 'Corridor sign', [
    'A sign pointing to the management floor. Underneath it, an older sign, painted over but visible: “THIS WAY TO CANTEEN”.',
    'Somebody has taped a card underneath reading “↑ IN CASE OF GENUINE EMERGENCY USE THE OTHER STAIRS”. It is not clear whether it is a joke. It has been there for years, which is how you can tell it is.']); },
  trolley() {
    /* Step one of Ask The Bins is finding this, so finding it is where the job
       moves on. Flagged: you can come back and look at it as often as you like,
       and a tracker that advanced each time would run off the end of the job. */
    if (Q.active('q_bev') && !G.flags.sawTrolley) { G.flags.sawTrolley = true; Q.step('q_bev'); }
    insp('🧽', "Bev’s trolley", 'Parked, not abandoned', [
      'A cleaning trolley: mop, blue roll, four sprays, and a bin bag holder with a bag in it, ready.',
      'On the handle, a hair bobble and a photograph of two children, laminated by somebody who cared enough to laminate it.',
      'Everything on this trolley is where it should be. It is the only object in this building of which that is true.']);
  },

  /* --- break room additions --- */
  biscuitTin() {
    if (Item.has('biscuits') && Q.active('q_biscuit')) {
      return insp('🍪', 'The Biscuit Tin', 'You are holding a box of the good ones', [
        'The tin is empty. You have a box of the good ones in a carrier bag. Nobody is in the break room.'],
        [{ t: 'Fill the tin. Say nothing. Ever.', to: null, do() {
            Item.take('biscuits'); Q.complete('q_biscuit', 'silent'); Ach.get('a_tin'); Ach.get('a_biscuits');
            Player.mod({ rep: 10 }); Player.xp(60); G.flags.filledTin = true;
            Chat.push('#general', 'Marjorie', '👩‍🦰', 'somebody has filled the biscuit tin. with the GOOD ones. i want a name.');
            Chat.push('#general', 'Dave', '🧔', 'No.');
            Chat.push('#general', 'Sarah', '👩', 'im starting a spreadsheet');
            UI.toast('🍪', 'You fill the tin and put the empty box in the recycling under something else. This is the single most competent thing you have done all week.', 'gold');
          } },
         { t: 'Fill the tin and mention it, once, casually.', to: null, do() {
            Item.take('biscuits'); Q.complete('q_biscuit', 'mentioned');
            Player.mod({ rep: 4 }); Player.xp(40);
            Chat.push('#general', 'Karen', '👩‍💼', 'Lovely gesture with the biscuits!! 🙌 Might be one for the wins channel!!');
            UI.toast('🍪', 'You mention it once, casually. It goes in #wins. Karen calls it a “lovely gesture”. It has been converted into content. You will not do this again.');
          } }]);
    }
    if (G.flags.tinOpened) {
      return insp('🍪', 'The Biscuit Tin', 'Empty. As foretold.', ['Empty. Somebody has left the empty tin in the cupboard rather than deal with the emptiness, which is the single most human act performed in this building this week.'],
        [{ t: 'Put a pound in the tin for the next one.', to: null, if: () => P.money >= 1, do() { Player.mod({ money: -1, rep: 4 }); Player.xp(25); Ach.get('a_tin'); UI.toast('🍪', 'You put a pound in the empty tin. Nobody sees. Next Tuesday there are biscuits, and nobody knows why, and everyone is slightly nicer.', 'gold'); } },
         { t: 'Close the lid on it.', to: null }]);
    }
    G.flags.tinOpened = true;
    insp('🍪', 'The Biscuit Tin', 'A commons', [
      'The communal biscuit tin. A tragedy with a lid.',
      'Inside: crumbs, one broken bourbon, and the plastic tray from a packet of custard creams, empty, replaced, as a message.',
      'Taped inside the lid, a rota for who buys the biscuits. The last name filled in is from February. The name is MARJORIE. It has been MARJORIE for nine months. Marjorie has said nothing.'],
      [{ t: 'Take the broken bourbon.', to: null, do() { Item.give('biscuit'); UI.toast('🍪', 'You eat a broken bourbon over a bin at 11am like everybody else in this country.'); } },
       { t: 'Write your name on the rota for next week.', to: null, do() { Player.mod({ rep: 5 }); Player.xp(30); G.flags.biscuitRota = true; Q.start('q_biscuit'); } },
       { t: 'Say nothing to anybody about any of this.', to: null }]);
  },
  kettle() {
    G.minutes += 4; Player.mod({ energy: 8, patience: 6 });
    insp('🫖', 'The kettle', 'Limescale, structural', [
      'A kettle that takes four minutes and sounds, at the end, like a plane leaving.',
      'You make a tea. Somebody comes in while it is boiling and asks if you are making one, and you say yes, and now you are making two, and this is correct and you would do the same.',
      pick(['There is a rule about the last of the milk. Nobody has ever stated the rule. Everybody obeys it.',
        'Somebody has descaled it. This is an act of unrewarded heroism and they will never be identified.',
        'The teaspoon on the string was Terry’s idea after the Great Teaspoon Disappearance of 2019. It has held.'])]);
  },
  washingUp() { insp('🧽', 'The washing up', 'Ongoing', [
    'Four mugs in the sink, in water that has gone cold, in a building with a dishwasher two metres away.',
    'A sign above the taps: “YOUR MOTHER DOES NOT WORK HERE.” Under it, in biro: “she does actually, she’s in accounts”. Under that: “that’s Jean and she is lovely, leave Jean out of this”.'],
    [{ t: 'Do the washing up.', to: null, do() { G.minutes += 6; Player.mod({ rep: 6 }); Player.xp(35); Ach.get('a_washup'); Rel.add('marjorie', 2); UI.toast('🧽', 'You do everybody’s washing up. Nobody sees. Nobody thanks you. You feel, briefly, like the load-bearing wall of civilisation.', 'gold'); } },
     { t: 'Add your mug to the pile and leave.', to: null, do() { Player.mod({ rep: -2 }); P.stats.chaos += 1; UI.toast('🧽', 'You become part of the problem in under four seconds. It was easy. That is the frightening part.'); } }]); },
  notes() { insp('📋', 'Passive-aggressive notes', 'Break room wall', [pick([
    '“PLEASE WASH YOUR OWN MUG. 🙂” The smiley face is doing the heaviest lifting of any punctuation mark in Britain.',
    '“Whoever keeps taking the good spoon — I know it is you and I am not angry, I am simply aware.”',
    '“The microwave is not a bin.” No context. No date. Deeply, deeply earned.',
    '“Milk in the door is EVERYONE’S. Milk on the shelf is SOMEONE’S. If you do not know which you are, you are the problem.”',
    '“Reminder: the fridge is emptied Fridays.” Beneath, four separate people have written “EVERYTHING?” and Terry has written, once, “EVERYTHING.”'])]); },
  breakTV() { insp('📺', 'Break room television', 'Muted, always', [
    'A television permanently on a news channel with the sound off and the subtitles on, three seconds behind and slightly wrong.',
    'Right now it says: “PRIME MINISTER SAYS SITUATION IS ONE HUNDRED AND FOUR PER SENT.”',
    'Nobody watches it. Everybody looks at it. This is a different thing and this room needs it.']); },
  handCream() { insp('🧴', 'Communal hand cream', 'Provenance unknown', [
    'A bottle of hand cream that arrived on the counter in 2019 and has been used by everyone and bought by no one.',
    'It is at exactly the level it has always been at. It will outlive the company.']); },
  charityPot() { insp('🎣', 'The office charity pot', 'For the marathon', [
    'A jar with a photograph of Kevin taped to it, from the year he did the marathon, or said he would.',
    'Inside: £4.31, a Euro, a button, and an IOU from Gary dated 2022.'],
    [{ t: 'Put a pound in.', to: null, if: () => P.money >= 1, do() { Player.mod({ money: -1, rep: 4 }); UI.toast('🎣', 'You put a pound in. The jar accepts it. Kevin, in the photograph, has never looked more tired.'); } },
     { t: 'Read Gary’s IOU.', to: null, do() { UI.toast('🎣', '“IOU £2 — G. Will sort. Leaving soon anyway.”'); Rel.add('gary', -1); } },
     { t: 'Leave it be.', to: null }]); },

  /* --- toilets, IT, archive, lobby, training additions --- */
  handDryer() { insp('🖐️', 'Hand dryer', 'Jet-force', [
    'A hand dryer so powerful it moves the skin on your hands into shapes you have not seen before.',
    'It is also louder than a call. People have been observed hiding in here and running it repeatedly, which Facilities has recorded as “high usage” and cited as evidence of a hygiene culture.'],
    [{ t: 'Run it and stand there for a bit.', to: null, do() { G.minutes += 3; Player.mod({ patience: 8 }); UI.toast('🖐️', 'Ninety decibels of white noise. For three minutes there is nothing in your head at all. It is the closest thing to meditation on this floor.'); } },
     { t: 'Use the paper towels like a normal person.', to: null }]); },
  accessibleLoo() { insp('🚪', 'The accessible toilet', 'Also the changing room, also storage', [
    'The accessible toilet, which is also where people take private phone calls, and where the Christmas decorations live in January.',
    'Right now it contains: a mop bucket, a stack of chairs, and — behind the door — a stationery order from 2022 nobody signed for.',
    'It is, obviously, meant to contain none of these things. Terry moves them out on the first of every month. They come back.']); },
  washHands() { insp('🪧', 'NOW WASH YOUR HANDS', 'Statutory', [
    'A statutory sign. Underneath, someone has added a laminated card: “AND THEN GO BACK OUT THERE. YOU CAN DO IT. — anonymous”.',
    'It is the single most useful piece of internal communication this company has ever produced and nobody knows who wrote it.']); },
  goodCubicle() {
    insp('🚽', 'Cubicle 4', 'The good one', [
      'The far cubicle. The one with the working lock, the hook that has not come off the door, and a light that does not flicker.',
      'It is universally understood to be the good one. Nothing is written down. No one has ever said it aloud.'],
      [{ t: 'Fifteen minutes. You have earned it.', to: null, do() {
          G.minutes += 15; count('toiletMin', 15);
          Player.mod({ patience: 26 + Sk.rank('breaks') * 6, energy: 8 });
          Ach.get('a_break'); Ach.get('a_goodcubicle');
          UI.toast('🚽', 'Fifteen minutes in the good cubicle. Your utilisation drops. Your soul returns. It is an even trade and you would make it again.');
        } },
       { t: 'Just checking it is still the good one.', to: null, do() { Player.mod({ patience: 3 }); } }]);
  },
  thermostat() { insp('🌡️', 'Server room thermostat', 'Reading: 31°C', [
    'The thermostat reads 31 degrees. Beside it, a printed note in Steve’s handwriting: “THIS IS FINE. DO NOT ADJUST. IT HAS BEEN 31 FOR SIX YEARS. IF IT DROPS, COME AND FIND ME IMMEDIATELY.”',
    'Underneath, a second note, older, different pen: “if it rises, do not come and find me.”'],
    [{ t: 'Adjust it.', to: null, do() { P.stats.chaos += 3; FX.shake(6); Sfx.bad(); Rel.add('steve', -2); UI.toast('🌡️', 'You nudge it one degree. Somewhere in the rack, something changes note. Steve looks up from two rooms away.', 'bad'); } },
     { t: 'Do not adjust it.', to: null, do() { Rel.add('steve', 1); } }]); },
  steveChair() { insp('🪑', 'Steve’s chair', 'Fully reclined', [
    'Steve’s chair is reclined to an angle that is either ergonomic or a lifestyle.',
    'From this position you can see the ceiling tile Steve has been looking at since 2019. It has a water stain shaped like Wales.']); },
  torch() { insp('🔦', 'Emergency torch', 'Charged, allegedly', [
    'A torch in a wall bracket labelled EMERGENCY. It has a small green light to show it is charged. The small green light is off.'],
    [{ t: 'Take the torch.', to: null, if: () => !Item.has('torch'), do() { Item.give('torch'); Rel.add('steve', -1); } },
     { t: 'Leave it for the emergency.', to: null }]); },
  discs() { insp('💿', 'A tower of unlabelled discs', 'Spindle, 100 count', [
    'A spindle of blank CD-Rs and, beneath it, eleven discs written on in marker.',
    'Two say “BACKUP”. One says “BACKUP (GOOD)”. One says “DO NOT USE — 2011”. One says, simply, “SOUNDS”.',
    'There is no machine in this building that can read any of them.']); },
  xmas() { insp('🎄', 'Christmas decorations', 'Boxed, mostly', [
    'Six boxes of decorations for a party that gets smaller every year.',
    'Tinsel, a snowman with a caved-in face, and forty-one paper hats. There have not been forty-one people here since 2014.',
    'On top, a Santa hat with a name inked into the band: KEVIN.']); },
  oldPhoto() { insp('🖼️', 'The old company photograph', '2009 · launch day', [
    'A framed photograph of the whole company on launch day, 2009. Sixty-odd people squeezed onto the main floor, all doing the face people do in company photographs.',
    'Front row, third from the left: Terry, unmistakably, with more hair and the same expression.',
    'Back row, far right, half out of frame, wearing a headset: a man you have seen before, slightly out of focus, in a frame in the corridor.',
    'And at the end of the second row, a face you do not recognise at all, and yet you have absolutely seen it. Recently.'],
    [{ t: 'Look closer at the unrecognised face.', to: null, do() { G.flags.sawPhoto = true; Player.xp(30); Sfx.bad(); UI.toast('🖼️', 'It is Colin. Same suit. Same posture. Same age.', 'bad'); if (Q.active('q_spreadsheet')) Q.step('q_spreadsheet'); } },
     { t: 'Put it back on the shelf, face down.', to: null }]); },
  vhs() { insp('📼', 'Training videos (VHS)', 'Learning & Development, 1998–2006', [
    'A shelf of VHS tapes with typed labels: “TELEPHONE MANNER”, “THE ANGRY CALLER”, “DEALING WITH DEATH ON THE LINE (SENSITIVE)”.',
    'The last one has been watched considerably more than the others. The tape is worn. Somebody kept coming back to it.']); },
  oldChair() { insp('🪑', 'The chair from 2011', 'Archive', [
    'A chair from the old furniture, upholstered in a blue that was chosen by somebody who had feelings about blue.',
    'It is far more comfortable than anything upstairs. It was replaced in a refresh, along with everyone’s.'],
    [{ t: 'Sit in it.', to: null, do() { G.minutes += 5; Player.mod({ patience: 12, energy: 5 }); UI.toast('🪑', 'It is better. It is plainly, obviously better. Somebody was paid to decide otherwise.'); } },
     { t: 'Wheel it upstairs.', to: null, do() { G.minutes += 12; P.stats.chaos += 2; Player.xp(25); UI.toast('🪑', 'You get it as far as the corridor before you think about what you are doing, and you leave it there, and it will be there in a year.'); } }]); },
  cardIndex() { insp('📇', 'The card index', 'Pre-2004', [
    'A wooden drawer of index cards, one per customer, handwritten, filed by surname.',
    'Each card has a name, an address, and a line for notes. The notes are things like “prefers mornings”, “husband poorly”, “do not ring before nine, works nights”.',
    'The system that replaced this has 41 mandatory fields and no line for any of that.']); },
  visitorsBook() { insp('📖', 'The visitors’ book', 'Reception', [
    'A hardbound book with columns: NAME, COMPANY, VISITING, TIME IN, TIME OUT.',
    'The TIME OUT column has been empty since 2019. Not blank — empty. People sign in. Nobody signs out. Ron has never once chased it.',
    'The last entry: “C. — Synergy — visiting: Synergy — in: 03:04”.']); },
  directory() { insp('🏢', 'Building directory', 'Ground floor', [
    'FLOOR 1–2: A dental practice, a company called NORTHGATE (nobody has ever seen anyone go in), and a Greggs.',
    'FLOOR 3–5: CALLHALL SERVICES.',
    'FLOOR 6: (blank strip, adhesive residue in the shape of letters, unreadable except the last one, which is a Y.)']); },
  awards() { insp('🥇', 'Award cabinet', 'Lobby', [
    'Framed certificates arranged for visitors who do not come.',
    '“INVESTORS IN PEOPLE — 2012.” “ISO 9001 — expired.” “BEST PLACE TO WORK (MIDLANDS, MEDIUM EMPLOYERS) — 2015 — FINALIST.”',
    'The 2015 one is the biggest frame by a considerable margin.']); },
  umbrellas() { insp('☂️', 'Lost umbrellas', 'Reception bin', [
    'Nineteen umbrellas in a bin by the door. Four work.',
    'Every one of them belongs to somebody who is standing in the rain right now, four years later, thinking “I had an umbrella once”.'],
    [{ t: 'Take one.', to: null, if: () => !Item.has('brolly'), do() { Item.give('brolly'); } },
     { t: 'Leave them to their long wait.', to: null }]); },
  bike() { insp('🚲', 'The bike nobody claims', 'Lobby, since 2021', [
    'A bicycle chained to a radiator in the lobby. Two flat tyres and a saddle that has gone grey.',
    'Facilities have attached three increasingly firm notices to it. The most recent says: “THIS BIKE WILL BE REMOVED ON 1 MARCH.” It does not say which March.',
    'Ron knows whose it is. Ron will not say. Ron says it is “not for the lobby to decide”.']); },
  booth() { insp('🎧', 'The call-listening booth', 'Quality assurance', [
    'A padded cubicle with a chair, a headset, and a screen listing recorded calls by date, agent and duration.',
    'A note taped to the screen: “calls are recorded for training purposes”. Underneath, in Sandra’s handwriting: “they are genuinely used for training. I use them. — S.”'],
    [{ t: 'Listen to one of your own calls.', to: null, do() {
        Player.mod({ patience: -6 }); Player.xp(30); G.flags.heardSelf = true; Ach.get('a_hearself');
        insp('🎧', 'Your own voice', 'Call recording', [
          'You put the headset on and listen to yourself.',
          'Your voice is higher than you think it is. You say “no worries” eleven times in four minutes. You apologise for something that is not your fault, twice.',
          'And then — at 3:41 — you say something genuinely kind to a stranger, in a voice you do not recognise as yours, and they say “oh, thank you”, and they mean it.',
          'You take the headset off. You will think about the eleven “no worries” for a week and about the other bit for the rest of your life.']);
      } },
     { t: 'Listen to a call from 2009.', to: null, do() {
        G.flags.heard2009 = true; Player.xp(40); Sfx.bad();
        insp('🎧', 'Recording 000001', 'Launch day', [
          'The oldest recording on the system. Two minutes long. It is all hold music.',
          'At 1:52 a voice, off-mic, cheerful, says: “Someone’ll be with you shortly, sir. Won’t keep you.”',
          'And a voice on the line says: “No rush at all. I’ll hold.”',
          'The recording ends. The call does not.']);
        if (Q.active('q_kevin')) Q.step('q_kevin');
      } },
     { t: 'Take the headset off. You are not ready.', to: null }]); },
  ladderPoster() { insp('🖼️', 'THE ESCALATION LADDER', 'Training room', [
    'A large diagram of a ladder. Each rung is a level of escalation: Agent → Team Leader → Area Manager → Head of Operations → Director → ?',
    'The top rung has a question mark on it. In the original artwork it had a name. The name has been covered with a printed sticker, four times, by four different people, over eleven years.',
    'If you pick at the corner you can see the layers. You do not pick at the corner. Today.']); },
  knowledgeBase() { insp('📚', 'The Knowledge Base (printed)', 'Nine ring binders', [
    'Priya printed the entire knowledge base in 2021, on the grounds that nobody reads a screen.',
    'Nine ring binders. Nobody has read those either, but they are dusted, and one is holding up a monitor, so on balance they have been more useful than the website.'],
    [{ t: 'Actually read one.', to: null, do() { G.minutes += 15; P.stats.knowledge += 2; Player.xp(45); Ach.get('a_readkb'); UI.toast('📚', 'Fifteen minutes with binder 4. You now know three things that will save you an hour each. You are the first person to do this. Priya must never find out or she will cry.', 'gold'); } },
     { t: 'Respect the binders from a distance.', to: null }]); },
  certificates() { insp('🎓', 'Certificates nobody collected', 'Training room', [
    'A stack of printed certificates in a tray: “CUSTOMER SERVICE EXCELLENCE — LEVEL 1”, each with a name and a date and a line for a signature that has not been signed.',
    'Forty-one of them. Janet prints one for everybody who completes the induction. Nobody has ever taken theirs.',
    'She keeps printing them. She will keep printing them.'],
    [{ t: 'Find yours and take it.', to: null, if: () => G.flags.trained, do() { Item.give('cert'); Rel.add('janet', 3); Player.xp(30); Ach.get('a_cert'); UI.toast('🎓', 'You take yours. Janet, two rooms away, does not see. But the stack is one shorter, and she counts them, and on Friday she will notice, and she will have a very good day.', 'gold'); } },
     { t: 'Leave them.', to: null }]); }
};
