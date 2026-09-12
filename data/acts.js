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
    /* Out of hours this used to `return` — nothing happened at all, because
       there was nothing on the other side of five o'clock to walk out into.
       There is now. Clocking off does not lock the doors and it does not make
       leaving a decision: you have finished, so you go. */
    if (!Sky.working()) {
      const dark = Sky.dark();
      return insp('🚪', 'The way out', 'It is ' + clockStr(G.minutes), [
        dark ? 'The door. Dark on the other side of it, and the car park lights doing what they can.'
             : 'The door. Whatever is left of the day on the other side of it.',
        Sky.kind().fall ? 'You can hear it on the canopy from here.'
                        : 'Nobody is on the desk. The barrier is up. Nobody is looking, because there is nobody.'],
        [{ t: 'Go.', to: null, do() { Levels.take('exit'); } },
         { t: 'Not yet.', to: null }]);
    }
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
    /* Not `G.minutes >= DAY_END` any more. That was true from five o'clock
       until midnight and then quietly false again from midnight until nine,
       which would have had the screen logging you back in at 00:01 and out
       again at 09:00. Sky.working() is the question that was always meant. */
    if (!Sky.working()) {
      return insp('🖥️', 'Your workstation', 'Shift over',
        ['The shift is over. The screen has already logged you out. It did that at 17:00:00.',
         Sky.smallHours() ? 'The clock in the corner of it says ' + clockStr(G.minutes) + '. It is not wrong.'
                          : 'The monitor has gone to the bouncing logo. It is still not going to hit the corner.'],
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
  paperTray() {
    if (Item.has('pack')) {
      return insp('📄', 'Paper tray', 'Full', ['Full. It is always full. People add paper to it as a form of prayer.',
        'The compliance packs are on the shelf under it. There are nine left, which is eight more than anybody is ever going to read.']);
    }
    insp('📄', 'Paper tray', 'Full', ['Full. It is always full. People add paper to it as a form of prayer.',
      'Underneath it: the compliance packs, printed for a session that was moved and then moved again. Five hundred and one pages each. Ten of them.'],
      [{ t: 'Take one. Roll it up.', to: null, do() {
        Item.give('pack');
        UI.toast('📜', 'Five hundred and one pages, rolled, with a band round it. It is a document and it is also, now, a length of pipe.');
      } },
       { t: 'Take one. Read it.', to: null, do() {
         G.minutes += 6; Player.mod({ patience: -4 }); P.stats.knowledge += .5;
         UI.toast('📜', 'Six minutes and eleven pages. Page eleven defines “colleague”. You put it back.');
       } },
       { t: 'Leave them. They are for a session that has been moved twice.', to: null }]);
  },
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

  /* THE AWAY-DAY BOX. The one place in the building the three guns come from,
     and the reason they are in a building at all: somebody's budget, a Friday
     in 2019, and a box that came back on the coach and went into the archive
     because there was nowhere else for it. Taking the lot is the point — they
     are a set and they have been in the dark for six years. */
  awayday() {
    const got = Item.has('blaster') || Item.has('bandgun') || Item.has('squirter');
    if (got) {
      return insp('📦', 'The away-day box', 'Marketing, 2019', [
        'The lid is off it now. What is left is a banner, a bag of branded pens that have all dried up, and a laminated sheet of the values.',
        'Four values. One of them is “Fun”.']);
    }
    insp('📦', 'The away-day box', 'Marketing, 2019', [
      'A box with AWAY DAY 2019 on the side in marker, under a laminated sheet of the values.',
      'Inside: a foam dart blaster with six darts in it, a water pistol with the price sticker still on, a foam sword with LOOK ALIVE printed down it, and a thing somebody made out of a post tray and four elastic bands — which is, on the evidence, the only object in this building anyone has ever built for pleasure.',
      'Nobody has opened this since the coach got back.'],
      [{ t: 'Take all four. It is a set.', to: null, do() {
        Item.give('blaster', true); Item.give('bandgun', true); Item.give('squirter', true); Item.give('noodle', true);
        /* Found. The pin in zoneCheck() stops pointing at it now, and so does
           the toast the first time you walk in. */
        G.flags.awayBox = true;
        if (typeof Guide !== 'undefined' && Guide.label === 'The away-day box') Guide.clear();
        Ach.get('a_awayday');
        Player.xp(25);
        P.stats.chaos += 1;
        UI.toast('📦', 'Four things out of the away-day box. '
          + (TOUCH ? 'The stick on the ' + Hand.btnSide() + ' aims, and fires where you push it.'
                   : '<b>G</b> takes one out. The mouse or the arrow keys aim it.'), 'gold');
        Chat.push('#general', 'Gary', '🧑‍🦱', 'someone has been in the archive');
        Chat.push('#general', 'Marjorie', '👩‍🦰', 'the box?');
        Chat.push('#general', 'Gary', '🧑‍🦱', 'the box');
      } },
       { t: 'Close it. There is a reason it is in here.', to: null, do() {
         /* Closed is an answer too, and the guide stops nagging about it — the
            box is still there, and so is the line in the chat, for whenever
            you change your mind. */
         G.flags.awayBox = true;
         if (typeof Guide !== 'undefined' && Guide.label === 'The away-day box') Guide.clear();
         Player.mod({ rep: 2 });
       } }]);
  },

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
    insp('🪧', 'The car park', 'Twenty-two spaces, forty staff', [
      'STAFF PARKING ONLY. PERMIT HOLDERS. UNAUTHORISED VEHICLES MAY BE CLAMPED. There has never been a permit and there has never been a clamp.',
      'Twenty-two spaces, painted, numbered once and never renumbered. The building has forty staff on the fourth floor alone. Nobody has ever raised this, because raising it would identify you as somebody who drives.',
      'The spaces are taken by ten past eight. What the rest of them do is park on Aldergate Rise and walk round, and say nothing about it, for years.']);
  },
  nigelSpace() {
    insp('🪧', 'RESERVED — N. GRIMSHAW', 'The best space', [
      'The space nearest the door, painted with his name. His actual name is Nigel Grimshaw and it is painted in full, both words, as though there might be another one.',
      'It is empty. He parks in the street, because somebody once keyed the car and he has never been able to prove it was about the space.']);
  },
  barrier() {
    insp('🚧', 'The barrier', 'Raised since 2019', [
      'A car park barrier, raised, and rusted into the raised position.',
      'It cost eleven thousand pounds. Terry has the remote. The remote has no battery and Terry has stopped mentioning it, on the grounds that a barrier nobody can lower is the same as a barrier nobody has.',
      'Which is why anything with wheels can be driven straight out of here onto Bellhaven Road, and why nobody has ever needed to ask whether they were allowed to.']);
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
  assemblyPoint() {
    insp('🪧', 'Assembly point', 'Laminated, unofficial, correct', [
      'A sheet of A4 in a plastic wallet, cable-tied to the wall at the end of the bays. ASSEMBLY POINT, 48pt, centred, with a printed arrow underneath pointing at the tarmac you are standing on.',
      'It is not on the fire notice upstairs. It is not on any drawing. Somebody in this building printed it, laminated it at their own expense and put it up, because the notice inside sends forty people to a car park that has been a Greggs since 2021 and somebody had to.',
      'It has been here through two audits. Nobody has ever asked who did it, which is the only reason it is still here.'],
      [{ t: 'Stand on the spot, briefly, for no reason.', to: null, do() {
          Player.mod({ patience: 3 });
          UI.toast('🪧', 'You stand on the assembly point. Nothing is on fire. It is a Tuesday. You feel, very slightly, accounted for.');
        } },
       { t: 'Leave it be.', to: null }]);
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
      /* There is a floor behind that frontage now. Going in used to BE the
         transaction — twelve minutes and a panel; it is a door to somewhere,
         and the buying happens at the counter like it does in a shop. */
      [{ t: 'Go in.', to: null, do() { Ach.get('a_greggs'); Levels.take('greggsDoor'); } },
       { t: 'Not today.', to: null }]);
  },
  /* --- inside the Greggs --- */
  greggsOut() { Sfx.door(); Levels.take('greggsOut'); },
  greggsCounter() {
    insp('\ud83e\uddfe', 'The counter', 'Serving', [
      'The counter, and behind it somebody moving at a speed the fourth floor has never once managed.',
      'The queue is four deep and moving. It is always four deep and it is always moving, and nobody has ever worked out how both of those are true at once.'],
      [{ t: 'Buy something. (12 min.)', to: null, do() {
          G.minutes += 12; Player.mod({ energy: 4 }); Shop.open('greggs');
        } },
       { t: 'Just looking.', to: null }]);
  },
  greggsTill() {
    insp('\ud83d\udcb3', 'The till', 'Card only, today', [
      'A card reader with a handwritten note taped under it: CARD ONLY TODAY, SORRY. The tape has gone amber, which puts today some time last year.']);
  },
  greggsCabinet() {
    insp('\ud83e\udd50', 'The hot cabinet', 'Warm', [
      'Steel trays under a heat lamp, and the smell that has been doing more for this parade\u2019s footfall than any of the signage.',
      'The sausage rolls are at the front. They are always at the front. This is not an accident and somewhere there is a person whose job it was.']);
  },
  greggsFridge() {
    insp('\ud83e\uddca', 'The drinks fridge', 'Chilled', [
      'Cans, bottles, and the meal-deal shelf, which is the only place in Bellhaven where a decision gets made quickly.']);
  },
  greggsBoard() {
    insp('\ud83d\udccb', 'The menu board', 'Above the counter', [
      'A lit board with everything on it and the prices in a font chosen to be read from the door.',
      'Nobody in the queue is looking at it. Everybody in the queue already knows.']);
  },
  greggsAllergens() {
    insp('\ud83d\udcc4', 'The allergen folder', 'Ask a colleague', [
      'A laminated folder on a chain, which is the most seriously anybody in this postcode takes documentation.',
      'The fourth floor has a policy folder too. Nobody has ever opened it, and it is not on a chain, and it is not laminated.']);
  },
  greggsTable() {
    insp('\ud83e\ude91', 'The table by the window', 'Two seats', [
      'A small table by the window with two seats, wiped recently enough that you can see where the cloth went.',
      'From here you can see the office. You can see your own floor. You can see, from a seat in a bakery, the window you spend your day beside.'],
      [{ t: 'Sit for a minute.', to: null, do() {
          G.minutes += 6; Player.mod({ patience: 7, energy: 3 });
          UI.float('A minute.', '#ffb347');
        } },
       { t: 'Stand.', to: null }]);
  },
  greggsBin() {
    insp('\ud83d\uddd1\ufe0f', 'The bin', 'Bags and bags', [
      'A swing bin with a paper bag balanced on the flap, because the flap is full of paper bags.']);
  },
  greggsWindow() {
    insp('\ud83e\ude9f', 'The window onto the High Street', 'From the inside', [
      'The High Street from the inside, which is the same street and a different thing entirely.',
      'A bus goes past. Somebody you half recognise from the second floor walks by without looking in.']);
  },
  /* --- inside the Bellhaven Arms --- */
  pubOut() { Sfx.door(); Levels.take('pubOut'); },
  pubBar() {
    /* The second line is about LUNCHTIME and always was, and from ten past five
       there are five or six of them standing at this bar — see `out:` in
       data/npcs.js. So after the shift it gets the other half of the same
       sentence, which is the half that makes the first half mean anything. */
    insp('🍺', 'The bar', 'Open 12–11', [
      'A bar with the pumps at the near end and a landlord who has already read what you are here for and is not going to say anything about it either way.',
      'Nobody from the fourth floor drinks here at lunchtime. Everybody has agreed on that without it ever having been discussed, and it is broken about twice a year, spectacularly.',
      ...(Sky.working() ? [] : ['After five it is a different room and the same people, and nobody has ever agreed anything about that at all.'])],
      [{ t: 'One, quickly. (25 min.)', to: null, do() {
          G.minutes += 25; Player.mod({ patience: 10, energy: -4, money: -4.60 });
          P.stats.bullshit += 1;
          UI.toast('🍺', 'Twenty-five minutes and £4.60. You go back up in the lift rehearsing a sentence about the traffic.');
        } },
       { t: 'Not at this hour.', to: null }]);
  },
  pubOptics() {
    insp('🥃', 'The optics', 'Behind the bar', [
      'Bottles upside down in their brackets, and three of them are the same brand at three different prices depending on which shelf you are told they came from.']);
  },
  pubBoard() {
    insp('📝', 'The chalkboard', 'Today’s specials', [
      'A pie and a pint for the price of a pie and a pint in 2014, written in a hand that has written it a thousand times.',
      'Under it, smaller: QUIZ TUES 8PM. £1 ENTRY. NO PHONES. The NO PHONES is underlined twice and enforced by a man called Ray.']);
  },
  pubTelly() {
    insp('📺', 'The telly', 'Sound off', [
      'Mounted in the corner at an angle that suits nobody sitting down, showing a match with the sound off and the subtitles on and half a second behind.']);
  },
  pubTable() {
    insp('🪑', 'A table', 'Quiz corner', [
      'A table with a beermat under one leg, which is the correct number of beermats and has been for years.'],
      [{ t: 'Sit down for a bit.', to: null, do() {
          G.minutes += 10; Player.mod({ patience: 9, energy: 2 });
          UI.float('Ten minutes.', '#ffb347');
        } },
       { t: 'Stand.', to: null }]);
  },
  pubBench() {
    insp('🛋️', 'The bench along the wall', 'Upholstered, once', [
      'A padded bench along the wall in a red that was chosen to hide things and has been asked to.']);
  },
  pubFruit() {
    insp('🎰', 'The fruit machine', '£100 jackpot', [
      'A fruit machine in the corner with its volume turned most of the way down, which somehow makes it worse.',
      'The jackpot is £100. It has been £100 for as long as anybody has looked, which suggests either great luck or none at all.']);
  },
  pubGlass() {
    insp('🪟', 'The etched glass', 'Original, allegedly', [
      'Etched glass with the name of a brewery that was bought in 1987 by a brewery that was bought in 2004 by a company that does not brew.',
      'Through it, the High Street, in pieces, at the wrong sizes.']);
  },

  /* --- inside the bookmakers --- */
  bookiesOut() { Sfx.door(); Levels.take('bookiesOut'); },
  bookiesScreens() {
    insp('📺', 'The screens', 'Sound off', [
      'Four screens, all on, all silent, showing prices from meetings in four towns nobody in here is going to.']);
  },
  bookiesWolves() {
    insp('📺', 'Wolverhampton', '2:40', [
      'A man is watching a race in Wolverhampton with the sound off and total concentration.',
      'He does not look up when you come in and he does not look up when you leave, and both of those are the correct amount of attention to pay a stranger in a bookmaker’s.']);
  },
  bookiesChairs() {
    insp('🪑', 'The chairs', 'Free', [
      'A row of chairs facing the screens, warm, upholstered and free. You can sit in them without buying anything and nobody will come over.',
      'This is a fact about the high street and not about gambling, and it is the reason this room matters more than anything sold in it.'],
      [{ t: 'Sit down where it is warm. (15 min.)', to: null, do() {
          G.minutes += 15; Player.mod({ patience: 12, energy: 5 });
          UI.toast('🪑', 'Fifteen minutes in the warm, watching a race in a town you have never been to. Nobody asked you for anything.');
        } },
       { t: 'Stay standing.', to: null }]);
  },
  bookiesCounter() {
    insp('🧾', 'The counter', 'Behind glass', [
      'A counter behind glass with a tray under it, and a woman doing a crossword who will stop the second anybody actually wants serving.']);
  },
  bookiesSlips() {
    insp('🖊️', 'The slips and the pens on strings', 'Free to take', [
      'Betting slips in a rack and four biros on strings, three of which work, which is the best working-biro ratio of any counter in this postcode including the one on the fourth floor.']);
  },
  bookiesBin() {
    insp('🗑️', 'The bin of torn slips', 'Mostly torn', [
      'A bin of torn slips, and every one of them was a plan.']);
  },

  /* --- inside the launderette --- */
  laundOut() { Sfx.door(); Levels.take('laundOut'); },
  laundWasher() {
    insp('🧺', 'A washing machine', '£4.20 a load', [
      'One of eight, numbered in marker pen, and the numbering skips six for a reason the woman behind the counter will tell you if you ask and which you will not forget.',
      'It is running. Something in it goes round, and round, and round.']);
  },
  laundDryer() {
    insp('🌀', 'A dryer', '20p for eight minutes', [
      'Twenty pence for eight minutes, and everybody puts in forty and everybody is wrong about how long that is.']);
  },
  laundBench() {
    insp('🛋️', 'The bench', 'While you wait', [
      'A bench facing the machines, which is the only seat in Bellhaven where doing nothing is not just permitted but structural.'],
      [{ t: 'Watch the drum go round. (10 min.)', to: null, do() {
          G.minutes += 10; Player.mod({ patience: 11, energy: 3 });
          UI.toast('🧺', 'Ten minutes of watching a drum go round. You could not tell anybody what you thought about, and you feel better.');
        } },
       { t: 'Not today.', to: null }]);
  },
  laundCounter() {
    insp('🧾', 'The counter', 'Service washes', [
      'Behind the counter, the woman who has run this place for nineteen years and knows more about this street than the council does.',
      'She knows which unit is being refitted and by whom, what the bookmaker’s was before it was a bookmaker’s, and that somebody from the offices up the road brings tea towels in twice a year and has never once claimed it back.']);
  },
  laundPrices() {
    insp('📋', 'The price list', 'Since March', [
      'A price list with the old prices showing faintly under the new ones, which is the most honest pricing document in the county.']);
  },
  laundService() {
    insp('🧺', 'The service washes', 'Ready by 4', [
      'Bags of service washes on a shelf with names on them in marker pen. One of them says TERRY — TEA TOWELS, and has done, on and off, for years.']);
  },
  /* --- inside the post office ---
     The counter is at the back past everything you did not come in for, the
     queue is four people long, and between one and two it is none of your
     business because the counter is shut. That last one is the clock's, not a
     flag's: Sky.m() is minutes past midnight and this reads it like the notice
     on the door does. */
  postoffOut() { Sfx.door(); Levels.take('postoffOut'); },
  postCounter() {
    const m = Sky.m();
    if (m >= 780 && m < 840) {
      return insp('\ud83c\udfe4', 'The counter', 'CLOSED 1–2', [
        'The shutter is down and the notice is up, and the notice is correct: the counter closes between one and two.',
        'Four people are waiting anyway. Not queuing — waiting. There is a difference and everybody in this room understands it perfectly.']);
    }
    insp('\ud83c\udfe4', 'The counter', 'Position 1 of 1', [
      'A counter behind glass with a tray under it, staffed by a man who can do anything the state requires of a person and is currently doing all of it, one customer at a time.',
      'Behind him: a safe, a kettle, and a wall chart of stamp prices going back far enough to be upsetting.'],
      [{ t: 'Join the queue. (22 min.)', to: null, do() {
          G.minutes += 22; Player.mod({ patience: -4, energy: -3 });
          Ach.get('a_postqueue');
          if (!Item.has('stamps')) Item.give('stamps');
          UI.toast('\ud83c\udfe4', 'Twenty-two minutes. You are served in ninety seconds. Nothing about the ratio is anybody’s fault and everybody has made their peace with it.');
        } },
       { t: 'Look at the kites instead.', to: null }]);
  },
  postScales() {
    insp('\u2696\ufe0f', 'The scales', 'Large letter', [
      'A set of scales and a slotted plastic template for deciding whether a thing is a Large Letter or a Small Parcel, which is the only genuinely tense measurement in British life.',
      'A woman ahead of you is posting something that is four millimetres too thick and does not know it yet.']);
  },
  postNotice() {
    insp('\ud83d\udd50', 'The notice about 1 till 2', 'Since 2011', [
      'CLOSED 1–2. Laminated, in a font that means it, taped to the glass at a height that means everybody has read it and nobody has absorbed it.',
      'Underneath, in biro, on a Post-it that has outlived three Post-its: “THIS INCLUDES BANK HOLIDAYS”.']);
  },
  postQueue1() {
    insp('\ud83e\uddcd', 'First in the queue', 'Being served', [
      'A man posting a passport application by a method the internet has been offering for nine years, because he does not trust the internet with his face.',
      'He is right, is the thing. He is completely right.']);
  },
  postQueue2() {
    insp('\ud83e\uddcd', 'Second in the queue', 'Two parcels', [
      'A woman with two parcels, one of which is a return and one of which is a gift, and she has already worked out that they need different queues at the same counter.']);
  },
  postQueue3() {
    insp('\ud83e\uddcd', 'Third in the queue', 'Not sure', [
      'Somebody who is not certain they are in the right place and is not going to ask, because asking would cost the position and the position is the only thing they are sure of.']);
  },
  postQueue4() {
    insp('\ud83e\uddcd', 'Fourth in the queue', 'Just came in for a card', [
      'Somebody who came in for a card, found themselves at the back of four, and has decided that as long as they are here they may as well see what happens.',
      'You are about to be fifth. The queue is four people long at any hour of any day: it is always four people, and it is never the same four people, and the only way to observe the mechanism is to become part of it.']);
  },
  postCards() {
    insp('\ud83d\udc8c', 'The card carousel', 'Sorry For Your Loss / 40 Today', [
      'A carousel of greetings cards arranged so that Sympathy is directly above Congratulations On Your New Home, which is either an accident or the truest thing on this street.',
      'The 40 Today section is four times the size of the 30 Today section. Somebody did the research.']);
  },
  postStationery() {
    insp('\ud83d\udcce', 'The stationery', 'Also sold here', [
      'Envelopes in nine sizes, none of which is the size of the thing you have, and a display of pens that would furnish the fourth floor for a decade.',
      'A sign says WE HAVE MOVED THE SELLOTAPE. It does not say where.']);
  },
  postKites() {
    insp('\ud83e\ude81', 'The kites', 'For reasons lost to everyone', [
      'Six kites, hung high, in a shop four hundred metres from the nearest open ground and eleven miles from the sea.',
      'They have been here since before the current staff. Nobody has ever seen one sold and nobody has ever suggested taking them down, and both of those facts are, by now, the reason for the other.']);
  },
  postParcels() {
    insp('\ud83d\udce6', 'The parcel shelf', 'Awaiting collection', [
      'Parcels awaiting collection, each with a card slip on it, one of them addressed to a business at this postcode that closed in 2019 and which nobody is willing to be the person who bins.']);
  },
  postPen() {
    insp('\ud83d\udd8a\ufe0f', 'The pen on a chain', 'Works', [
      'A biro on a chain, which works, which is a small miracle, and which is chained up precisely because it works.']);
  },

  /* --- inside the charity shop --- */
  charityOut() { Sfx.door(); Levels.take('charityOut'); },
  charityTill() {
    insp('\ud83e\uddfe', 'The till', 'Cash preferred', [
      'A till from a previous business, operated slowly and correctly, and a card machine that is produced from under the counter like a concession.']);
  },
  charityPoster() {
    insp('\ud83d\ude91', 'The air ambulance poster', 'Every penny', [
      'A poster showing the helicopter, the crew, and a number that is what one flight costs, printed in a size that makes the number the whole poster.']);
  },
  charityMugs() {
    /* The one shelf in this game that changes because somebody else did
       something, rather than because you did — see marjorie's `shop_buy` in
       data/npcs.js, which happens whether or not you are standing in here. */
    if (G.flags.marjorieBought) {
      return insp('☕', 'The shelf of mugs', 'One short', [
        'A shelf of mugs, and a gap in it at the near end where something was taken this afternoon.',
        'Fifteen now. Well — fourteen, and one of them three times, which is not the same fourteen, and the woman who did it knows it is not the same fourteen better than anybody alive.',
        'Everything else on this shelf came out of a cupboard in a house where somebody has died or has moved or has finally admitted they have too many mugs, and the one that left today is going back into a cupboard it came out of nine years ago.']);
    }

    insp('\u2615', 'The shelf of mugs', 'Fourteen, once', [
      'Two shelves of mugs, which is the single most reliable shelf in the whole of the retail sector: everybody donates mugs and nobody stops owning them.',
      'Marjorie donated fourteen here in 2016 and has bought four of them back since, twice knowingly. The one facing the wall is facing the wall for a reason, and the reason is on the other side of it.'],
      [{ t: 'Buy a mug. (£1.50)', to: null, if: () => P.money >= 1.5, do() {
          Player.mod({ money: -1.5 }); Item.give('mug'); Ach.get('a_boughtback');
          UI.toast('\u2615', 'A plain white mug, one pound fifty, to a good cause. Marjorie will notice it on Monday and will say nothing on Monday.');
        } },
       { t: 'Turn the one facing the wall around.', to: null, do() {
          G.flags.turnedTheMug = true;
          insp('\u2615', 'The one facing the wall', 'WORLD’S OKAYEST BOSS', [
            'On the other side, in a font from 2009: WORLD’S OKAYEST BOSS.',
            'Somebody in this postcode was given this. Somebody in this postcode kept it for years, and then did not.']);
        } },
       { t: 'Leave the mugs alone.', to: null }]);
  },
  charityShirts() {
    insp('\ud83d\udc54', 'The rail of work shirts', 'Size 16, mostly', [
      'A rail of work shirts that have all been worn to the same job: the collar goes first, then the cuffs, then the person.',
      'Three of them still have the lanyard clip mark on the left placket, in the same place, which means three people in this town stood the same way for years.']);
  },
  charityBooks() {
    insp('\ud83d\udcda', 'The book table', 'All 50p', [
      'A table of paperbacks at 50p, on which there are four copies of the same thriller, because in 2011 everybody in Bellhaven was given it and in 2013 everybody in Bellhaven finished with it.',
      'Underneath: a hardback about a war, a book about a cathedral, and a diet book from a year when that diet was legal.']);
  },
  charityJigsaw() {
    insp('\ud83e\udde9', 'The jigsaw', '1000 pieces', [
      'A thousand-piece jigsaw of a harbour, with a note taped to the lid in careful capitals: 1 PIECE MISSING (SORRY).',
      'Somebody did that. Somebody finished it, found the gap, and rather than say nothing, wrote a note and apologised to a stranger they will never meet. That is the whole of the case for the species and it is on a table in Bellhaven for fifty pence.']);
  },
  charityElectrical() {
    insp('\ud83d\udcfa', 'The electricals corner', 'PAT tested', [
      'Three kettles, a DVD player, and a bread maker, each with a green sticker saying it has been tested and is safe, which is not the same as saying anybody should.',
      'The bread maker will be bought. Bread makers are always bought. Bread makers always come back.']);
  },
  charityBricabrac() {
    insp('\ud83d\udd6f\ufe0f', 'The bric-a-brac', 'Everything 80p', [
      'Candlesticks, a carriage clock, and a small brass thing that everybody picks up and nobody can identify, which is why it is still here and why it will outlast the shop.']);
  },
  /* --- inside the kebab shop, which you can only ever be in at night --- */
  kebabOut() { Sfx.door(); Levels.take('kebabOut'); },
  kebabSpit() {
    insp('\ud83e\udd59', 'The vertical spit', 'On since four', [
      'The spit, turning, going quietly about the only continuous manufacturing process left in Bellhaven.',
      'It has been on since four in the afternoon and it will be on until three in the morning, which makes it the longest shift on this street by a distance and nobody has ever thanked it.']);
  },
  kebabSalad() {
    insp('\ud83e\udd57', 'The salad tray', 'Six compartments', [
      'Six compartments, of which four are used, and the two that are not used are cucumber and jalapeños, in a town that has strong opinions about both and expresses neither.']);
  },
  kebabCounter() {
    insp('\ud83e\uddfe', 'The counter', 'Cash, card, whatever', [
      'A counter, a menu board above it with photographs of everything, and a man who has been asked what he recommends nine thousand times and has answered honestly nine thousand times.'],
      [{ t: 'Order something. (£7.50, 15 min.)', to: null, if: () => P.money >= 7.5, do() {
          G.minutes += 15; Player.mod({ money: -7.5, energy: 22, patience: 6 });
          Ach.get('a_kebab');
          UI.toast('\ud83e\udd59', 'Seven fifty. You eat it walking, which is the correct way, and it is the best thing that has happened since about eleven.');
        } },
       { t: 'Just looking at the photographs.', to: null }]);
  },
  kebabFridge() {
    insp('\ud83e\udd64', 'The drinks fridge', 'Cans, mostly', [
      'A fridge of cans, arranged by nobody, in which the third shelf is entirely one flavour because in 2021 a delivery went wrong and it has been quietly working through it ever since.']);
  },
  kebabPhoto() {
    insp('\ud83d\uddbc\ufe0f', 'The photograph', 'Framed, by the till', [
      'A framed photograph on the wall by the counter: eleven people from an office Christmas party, in this doorway, at an hour the photograph does not disclose.',
      'Nigel is in the middle of it, and Nigel is doing something with his arms that has never been explained to anybody on the fourth floor and never will be. It is framed. Somebody in this shop framed it.'],
      [{ t: 'Ask about the photograph.', to: null, do() {
          G.flags.askedAboutNigel = true;
          insp('\ud83e\udd59', 'The man behind the counter', 'Remembers', [
            '“Two thousand and nineteen,” he says, without looking up, without being told which year you meant.',
            '“He come back the week after and apologised. Only one who ever did.” He turns the spit a quarter turn. “Good lad.”',
            'You are going to have to go back up to the fourth floor tomorrow and look at Nigel, and know this.']);
        } },
       { t: 'Leave it alone.', to: null }]);
  },
  kebabSign() {
    insp('\ud83e\udea7', 'UNDER NEW MANAGEMENT', 'Since 2014', [
      'A sign saying UNDER NEW MANAGEMENT, which went up in 2014 and has stayed up through two further changes of management, at which point the sign became true again twice and nobody had to do anything.']);
  },
  kebabStools() {
    insp('\ud83e\ude91', 'The two stools nobody sits on', 'Fixed to the floor', [
      'Two stools bolted to the floor at a shelf, provided in good faith, used by no human being in the history of this unit.',
      'Everybody eats standing up or walking home. The stools are not for sitting on. The stools are for making it a place that has stools.']);
  },
  kebabBin() {
    insp('\ud83d\uddd1\ufe0f', 'The bin by the door', 'Emptied nightly', [
      'The bin by the door, emptied every night, which means it is the only bin in Bellhaven that is ever actually empty and the only one you never see empty.']);
  },

  /* --- inside Vapour Trail, which is three shops in a trenchcoat --- */
  vapourOut() { Sfx.door(); Levels.take('vapourOut'); },
  vapourCounter() {
    insp('\ud83e\uddfe', 'The counter', 'Was a repair counter', [
      'A glass-topped counter with the current business laid out inside it and a strip of masking tape along the back edge with SCREENS FROM £45 still written on it in marker.',
      'It is a good counter. It has outlasted three businesses and it will outlast this one, and whoever comes next will keep it too.']);
  },
  vapourMat() {
    insp('\ud83d\udd27', 'The screwdriver mat', 'Still there', [
      'A magnetic mat with numbered wells for the screws out of a phone, still taped down beside the till, three businesses later.',
      'There are two screws in well number four. They have been in well number four since a Tuesday in 2021 and they belong to a phone that was collected, paid for, and is now itself two phones ago.']);
  },
  vapourLiquids() {
    insp('\ud83e\uddf4', 'The wall of liquids', 'Buy 2 get 1', [
      'A wall of bottles in flavours that describe things rather than taste: Blue Ice, Wild Fruit, Heisenberg, and one called Bakery which everybody who works on this street finds funnier than the shop intends.']);
  },
  vapourGhostSign() {
    insp('\ud83d\udcf1', 'The old sign showing through', 'Three coats', [
      'High on the back wall, under the current paint and coming through it the way these things always do, the top half of the previous signage — and under that, fainter, the one before.',
      'The parade is written on top of itself. If you stand at the right angle you can read a phone number that would now ring a launderette.']);
  },
  vapourBasin() {
    insp('\ud83d\udc85', 'The nail bar basin', 'Still plumbed in', [
      'A nail bar basin, low, moulded, and still plumbed into the wall, because taking it out would mean a plumber and a plumber would mean a landlord.',
      'There is a box of till roll in it. It has been the till roll shelf for longer than it was ever a basin.']);
  },
  vapourTiles() {
    insp('\ud83c\udf5e', 'The bakery tiling', 'Under the vinyl', [
      'By the door, where the vinyl has lifted and been taped rather than replaced, you can see the floor under it: small white hexagonal tiles with a black border, which is a bakery floor, and everybody in this town still says “where the bakery was”.',
      'Four businesses have stood on it. The tiles are the only one of them that was built to last, and they were never once the business.']);
  },
  vapourChair() {
    insp('\ud83e\ude91', 'The chair from the nail bar', 'Reupholstered once', [
      'A padded chair on a chrome base, which is not the sort of chair a shop like this buys, because it is not the sort of chair a shop like this buys.',
      'It is very comfortable. Everybody who sits in it says so, and nobody ever asks why a vape shop has it.'],
      [{ t: 'Sit in the chair from the nail bar.', to: null, do() {
          G.minutes += 8; Player.mod({ patience: 8, energy: 2 });
          UI.float('Eight minutes.', '#b48cff');
        } },
       { t: 'Stand.', to: null }]);
  },
  vapourSmell() {
    insp('\ud83d\udca8', 'The smell', 'All four of them', [
      'The current smell is the liquids. Under it is acetone, which is the nail bar. Under that is warm solder, which is the phone repair.',
      'And under all of it, faintly, on a warm day, with the door shut: bread. There is no bread. There has been no bread since 2009. The building is doing it from memory.']);
  },
  /* ---- THE 41 ----------------------------------------------------------
     Two poles, one route, and a bus that actually pulls up at them — see
     `stops:` on the 41 in data/levels.js and Cars.serveStop().

     The two stops are a four-minute walk apart and eleven minutes by bus, and
     everybody takes the bus, and that is not a joke about Bellhaven; that is
     every town. Acts.ride() is the whole of it: the same six lines from either
     end, because a bus is a bus. */
  /* `at` is the pole, `to` is where you are put down at the OTHER end — and
     both halves of that have to be a bit of pavement. Getting off a bus into
     a live carriageway is a thing this game will let you do all day and a
     thing no bus has ever done to anybody. */
  BUSSTOPS: [{ at: [26, 15], name: 'the stop outside the office', to: [47.5, 58.5] },
             { at: [46, 58], name: 'the stop on Corven Way', to: [27.5, 15.5] }],
  /* Is the 41 standing here with its doors open. The 41A never is, which is
     the entire point of the 41A. */
  busHere(i) {
    const st = Acts.BUSSTOPS[i];
    return typeof Cars !== 'undefined' && Cars.stoppedAt ? Cars.stoppedAt(st.at[0], st.at[1]) : null;
  },
  ride(i) {
    const st = Acts.BUSSTOPS[i];
    G.minutes += 11;
    P.x = st.to[0] * TILE; P.y = st.to[1] * TILE;
    if (typeof Cam !== 'undefined' && Cam.snap) Cam.snap();
    Player.mod({ energy: 3, patience: 4 });
    if (!G.flags.rodeThe41) { G.flags.rodeThe41 = true; Ach.get('a_the41'); }
    UI.toast('\ud83d\ude8c', pick([
      'Eleven minutes. It is a four-minute walk. You sat upstairs at the front like a child and you would do it again.',
      'Eleven minutes, and for nine of them the driver and one other passenger conducted an entire conversation about a roundabout.',
      'Eleven minutes. Nobody asked you for anything. Nobody could reach you. It was the best part of the day and it cost £2.40.',
    ]), 'gold');
  },
  busStop() {
    const on = Acts.busHere(0);
    insp('🚏', 'The bus stop', on ? 'The 41 is here' : 'The 41 and the 41A', [
      'The 41 and the 41A. The 41A is the same route as the 41 except that it does not stop here, which is not indicated anywhere at this stop.',
      'The timetable is behind scratched perspex and has been superseded twice.',
      on
        ? 'And here it is. Green one. Doors open, engine running, indicator already on, in the way that means you have about nine seconds to decide something.'
        : 'You could stand here. You could just stand here, and a bus would come, and it would take you somewhere that is not this.'],
      on ? [{ t: 'Get on. (£2.40)', to: null, if: () => P.money >= 2.4, do() { Player.mod({ money: -2.4 }); Acts.ride(0); } },
            { t: 'Let it go.', to: null, do() {
                UI.toast('\ud83d\ude8c', 'It goes. There is not another one for a while and you knew that when you did it.'); } }]
        : [{ t: 'Read the timetable.', to: null, do() {
              insp('\ud83d\uddd3\ufe0f', 'The timetable', 'Superseded twice', [
                'Two timetables in one frame, the newer one taped over the older one and coming away at three corners, so both are legible and they disagree.',
                'Where they disagree, everybody in Bellhaven goes with the older one, and everybody in Bellhaven is right, because the 41 has never once run to the new one.']);
            } },
           { t: 'Walk.', to: null }]);
  },
  corvenStop() {
    const on = Acts.busHere(1);
    insp('🚏', 'The stop on Corven Way', on ? 'The 41 is here' : 'The 41, and the railway behind you', [
      'The other end of the 41: a pole, a frame with no timetable in it at all, and a bench that is not a bench but a leaning rail, installed by somebody who had read a document about loitering.',
      'Behind it, through the fence, the railway. Two things pass this spot on a schedule and only one of them stops.',
      on
        ? 'The green one is here, and the driver has seen you, and is doing the thing with the eyebrows that means get on or do not but decide.'
        : 'Nobody waits here in the afternoon. At ten to eight in the morning there are eleven people at this rail and not one of them is talking.'],
      on ? [{ t: 'Get on. (£2.40)', to: null, if: () => P.money >= 2.4, do() { Player.mod({ money: -2.4 }); Acts.ride(1); } },
            { t: 'Let it go.', to: null }]
        : [{ t: 'Lean on the rail that is not a bench.', to: null, do() {
              G.minutes += 4; Player.mod({ patience: 5 });
              UI.float('Four minutes.', '#9fb3c8');
            } },
           { t: 'Walk back.', to: null }]);
  },
  streetBin() {
    insp('🗑️', 'The council bin', 'Emptied Thursdays', [
      'A council bin, emptied on Thursdays, full by Tuesday.',
      'On top of it, balanced with some care, a takeaway cup from the coffee machine on the fourth floor. Somebody carried it all the way down here rather than use the bin by the lift, and there is no explanation for that which is not slightly sad.']);
  },
  /* The one act in this file that reads the calendar. Sky.season() already
     decides what the verge and the tree are wearing; this is the same fact
     said out loud, so walking up to it in February and in May is not the same
     two lines with a different picture behind them. */
  streetTree() {
    const lines = {
      spring: ['A tree, in blossom, on a verge outside a call centre. Nobody planted it as a gesture — it is on the site plan as SOFT LANDSCAPING, and it has outlived two of the companies that leased this building.',
               'The blossom is all over the bonnets of the cars parked under it. Somebody has written WASH ME in it.'],
      summer: ['A tree in full leaf, and the only shade in the car park. The spaces under it are taken by half past eight every day of the summer and the ones at the far end are empty at noon.',
               'A crisp packet has been in the fork of it since roughly April.'],
      autumn: ['A tree going over to red. The leaves are on the tarmac, in the gutter, and trodden into the lobby carpet, which Facilities have sent an all-staff email about.',
               'It is a nicer thing to look at in October than the building it stands outside.'],
      winter: ['A bare tree with a fortnight of snow still lying along the branches. It looks dead. It is not, and the same thing could be said of most of the fourth floor.',
               'Somebody has hung a single strand of tinsel on the lowest branch. It has been there since before it was seasonal and will be there after.']
    };
    insp('\ud83c\udf33', 'The tree', Sky.seasonName(), lines[Sky.season()] || lines.autumn);
  },
  giveWay() {
    insp('\u26a0\ufe0f', 'Give way', 'Junction ahead', [
      'A give way sign at the top of the street, with the triangle painted on the road under it to match.',
      'The traffic out here does actually yield at these, and to the right where two of them want the junction at once, which makes this the best-observed rule in Bellhaven by a distance nobody wants to think about.']);
  },
  streetTyres() {
    insp('\ud83d\udede', 'The tyres', 'Nobody\u2019s', [
      'A stack of tyres against the wall of the unit that is always being refitted, with two more leaning off it.',
      'They are not the right size for anything parked on this street, which raises a question about how they got here that nobody has ever asked out loud.']);
  },
  streetRecycling() {
    insp('\ud83d\uddd1\ufe0f', 'The recycling', 'Collected fortnightly', [
      'The green bin, out beside the bottle bank. It goes out on a Tuesday, or a Wednesday, on a fortnightly cycle that the council publishes as a PDF and that nobody on this street has ever successfully predicted.',
      'Somebody has put a pizza box in it. Somebody always has.']);
  },
  shopWindow(o) {
    insp('\ud83e\ude9f', o.name, 'Shopfront', [
      'A single sheet of plate glass in a frame that predates every business that has ever traded behind it. Cleaned on the outside by a man with a ladder on a Thursday and on the inside by nobody.',
      'There is a sticker in the corner from an alarm company, a faded card for a taxi firm, and a smaller one for a locksmith who is either very good or has been putting cards up for twenty years.']);
  },
  cones() {
    insp('\ud83d\udea7', 'The cones', 'Unattended', [
      'Three traffic cones in a row outside the unit that is always being refitted. No van, no barrier, no hole, and no one working.',
      'They have been here long enough that the shop next door has started putting its A-board inside them, which is the closest thing this parade has to planning permission.']);
  },
  manhole() {
    insp('\u26ab', 'A manhole cover', 'Surface water', [
      'A manhole cover, sitting a few millimetres proud of the road, which is why every car that goes over it makes the same noise.',
      'Cast into it, around the edge, is the name of a foundry in a town forty miles away that closed in 1987.']);
  },
  lamppost() {
    insp('💡', 'Lamppost', 'Council-maintained', [
      'A council lamppost, one of a matching pair, both working — which the fourth floor’s own lighting has not managed in a decade of maintenance tickets.',
      'A faded sticker near the base advertises a covers band that split up before this lamppost was installed.']);
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

  /* ---- NAILED IT ------------------------------------------------------
     Not a shop act. A room with three people in it who work with you, and a
     state that goes one way: nobody has seen anybody, then somebody has, then
     everybody has, and then it is never mentioned again by any party for the
     rest of the game. The three flags below are that, and Acts.nailsRoom() is
     how many of them are set. */
  nailsRoom() {
    return (G.flags.sawKaren ? 1 : 0) + (G.flags.sawSarah ? 1 : 0) + (G.flags.sawGary ? 1 : 0);
  },
  /* Called by all three the moment they clock you. The achievement is for the
     full set, because two people who have seen each other can pretend and
     three cannot. */
  nailsSpotted(who) {
    G.flags[who] = true;
    if (Acts.nailsRoom() === 3 && !G.flags.nailsAll) {
      G.flags.nailsAll = true;
      Ach.get('a_caught');
      UI.toast('💅', 'All three of them. Nobody will ever raise it. It will simply be true now, for years.', 'gold');
    }
  },
  nailsOut() { Sfx.door(); Levels.take('nailsOut'); },
  nailsColours() {
    insp('🎨', 'The wall of colours', 'Two hundred and eleven of them', [
      'A rack of bottles arranged by nothing, named by somebody with a completely free hand and no supervision: Office Party, Second Interview, Sensible Beige, and one called Tuesday that is the exact grey of the fourth-floor carpet.',
      'Somebody has put a small dot of every colour on the underside of the shelf, which is the only honest colour chart in the retail sector and is deliberately where the customer cannot see it.']);
  },
  nailsPrices() {
    insp('📋', 'The price list', 'Laminated, once', [
      'Gel £22. Acrylic £26. Infill £18. Repair of one nail, £4, which is the kindest line item in Bellhaven.',
      'At the bottom, in a different font, added later and never removed: “WE DO NOT DO FEET. PLEASE STOP ASKING.”']);
  },
  nailsPhoto() {
    insp('📷', 'The photograph of a hand', 'Blu-tacked', [
      'A large photograph of a hand, taken professionally, lit like a watch advertisement, resting on a piece of grey velvet.',
      'It is the owner’s own hand. She will tell you this if you ask and she will not tell you if you do not, and she has never once been asked.']);
  },
  nailsBook() {
    insp('📖', 'The appointment book', 'Paper. Still paper.', [
      'A hardback diary, biro, with the whole of next week already gone and Thursday lunchtime crossed through twice.',
      'Reading upside down, which is a skill this job has given you and which you did not ask for, you can make out four names you recognise and one you very much do.']);
  },

  /* The three of them. Each one has a before and an after, and the after is
     not embarrassment — it is the far more British thing, which is an
     agreement arrived at in total silence and honoured for years. */
  /* THE CHAIRS. Empty most of the day, and between twelve and one they have
     Karen, Sarah and Gary in them — who are not acts, because they are people:
     see `out:` in data/npcs.js and NPCM.runErrands(). A person standing on a
     chair tile is drawn sitting in it and beats the chair for the E key, so
     this is only ever read when the chair is genuinely empty. */
  nailsChair() {
    if (Sky.m() >= 720 && Sky.m() < 780) {
      return insp('🪑', 'The chairs', 'All three taken', [
        'All three are occupied. You know all three of them. Two of them have not looked up and one of them very much has.']);
    }
    insp('🪑', 'The chairs', 'Empty until twelve', [
      'A padded chair on a chrome base with a small table beside it and a lamp on a hinged arm, all of it pointed at where a hand would be.',
      'Empty. The lunchtime lot are not in yet, and if you have never been in here at lunchtime then you do not know who the lunchtime lot are, and there is an argument that you are better off.']);
  },
  nailsBasin() {
    insp('🚰', 'The basin', 'Warm water, twice', [
      'A small basin with a dish of white pebbles in it that are not there for any reason a pebble has ever been anywhere.',
      'It is the only warm water on this street that comes out warm the first time you ask it to.']);
  },
  nailsBench() {
    const room = Acts.nailsRoom();
    insp('🛋️', 'The bench you wait on', room === 3 ? 'Fully occupied, socially' : 'Empty', [
      'A padded bench along the window wall with three magazines and a cushion on it, and nobody has ever sat here, because everybody who comes in here has an appointment and everybody who has an appointment goes straight to a chair.',
      room === 3
        ? 'You could sit down. From here you would be looking at the backs of three heads, all of which know exactly where you are and none of which is going to turn round.'
        : 'From it you would be able to see the whole room, which is the one thing nobody in the whole room wants.'],
      [{ t: 'Sit on the bench. (10 min.)', to: null, do() {
          G.minutes += 10; Player.mod({ patience: 5, energy: 3 });
          UI.float('Ten minutes.', '#ff5f56');
        } },
       { t: 'Stay standing.', to: null }]);
  },
  nailsMags() {
    insp('📰', 'The magazines', 'March', [
      'Three magazines. One is from March, one is from a March, and one is a free supermarket magazine about pies which everybody in this room has read cover to cover and nobody has ever taken home.']);
  },
  nailsTips() {
    insp('🫙', 'The tip jar', 'Honesty in a jam jar', [
      'A jam jar with a slot cut in the lid by somebody who owned a Stanley knife and no patience.',
      'It has £2.40 in it and a euro. There is always a euro. Nobody has ever seen a euro go in.'],
      [{ t: 'Put a pound in.', to: null, if: () => P.money >= 1, do() {
          Player.mod({ money: -1, patience: 3 });
          UI.toast('🫙', 'A pound in a jar. Nobody sees you do it, which is the only condition under which it counts.');
        } },
       { t: 'Leave it.', to: null }]);
  },

  /* ---- BELLHAVEN TYRE & EXHAUST ---------------------------------------
     A room with no counter in it and one thing worth looking at, which is
     above your head and belongs to your employer. */
  tyreOut() { Sfx.door(); Levels.take('tyreOut'); },
  tyreChart() {
    insp('📊', 'The chart of tyre pressures', 'To 2009', [
      'A laminated wall chart of recommended pressures by make and model, going up to 2009, curling at three corners and load-bearing.',
      'Every car built since is dealt with by a man looking at the car for two seconds and saying a number. He has never been wrong. The chart stays up because it is the sort of thing a wall should have on it.']);
  },
  tyreCalendar() {
    insp('📅', 'The calendar from the parts supplier', 'February', [
      'A free calendar from a parts wholesaler, still on February, showing a photograph of an exhaust manifold on a black background lit like it is being sold to a jury.',
      'February of which year is not printed anywhere on it, and this is the single most researched question anybody from the fourth floor has ever brought back from this street.']);
  },
  tyreCerts() {
    insp('📜', 'The certificates', 'Framed, four of them', [
      'Four certificates in clip frames: two trade qualifications, one health and safety, and a fourth that on close inspection is a swimming award from 1988 belonging to somebody with the same surname.',
      'It has been on that wall longer than the business has been at this address. It came off the wall of the last unit and it will go on the wall of the next one.']);
  },
  /* THE RADIO. The one object on this map with a running order rather than a
     random pick: it walks the same six-step cycle a station walks, so standing
     here long enough is the joke, and the joke is that it is EXACTLY like
     standing in a tyre place long enough. The song is at the end because the
     song is always at the end. */
  tyreRadio() {
    const n = G.flags.radioAt || 0;
    G.flags.radioAt = n + 1;
    const bit = [
      ['The travel. There is a delay on the A-road out of town, which there is, and which there has been since a set of temporary lights went up in a month nobody can now name.',
       'The presenter reads the name of the road slightly wrong. Nobody in the bay reacts. It is not their road.'],
      ['A phone-in. A man called Baz is explaining, at length, why the bins have gone to three-weekly, and he is broadly correct and completely unbearable, and the presenter agrees with him in a voice that is trying to get to a jingle.',
       'One of the lads says “he’s not wrong” to nobody in particular. Nobody in particular does not answer.'],
      ['An advert for a sofa warehouse that has been closing down since the second Blair government. Four seconds of a man shouting a percentage.',
       'Then an advert for a funeral plan, immediately, with no gap. The station does this all day and has never once noticed.'],
      ['The travel again. The same road. The same lights. The presenter reads it with slightly less conviction this time, like somebody being made to repeat themselves in an argument they have already lost.'],
      ['The phone-in again, different man, same bins. He gets ninety seconds. Baz got four minutes. Somewhere in this town Baz is furious about that and nobody will ever know.'],
      ['And then, without warning, THE SONG. The one that has been on this station since the unit opened, that everybody in the bay knows every word of and nobody would admit to owning.',
       'Two of the lads sing the third line. Not the chorus — the third line. It is completely involuntary and they are both slightly annoyed about it.',
       'This is the correct way to hear music and nobody has done it on purpose since about 1994.'],
    ][n % 6];
    if (n % 6 === 5 && !G.flags.radioSong) { G.flags.radioSong = true; Ach.get('a_radio'); }
    insp('📻', 'The radio', 'Same station since the unit opened', bit);
  },
  tyrePartWorns() {
    insp('🛞', 'The part-worns', 'Legal, mostly', [
      'A wall of second-hand tyres stacked to head height and sorted by a system that is real, is not written down anywhere, and would take a stranger about four years to learn.',
      'Chalked on the side of one of them, in the shorthand of a man who is not expecting to be read by you: “PLD 4 THU — DO NOT.” Nobody has touched it. Nobody is going to.']);
  },
  tyreRamp() {
    insp('🚗', 'The pool car, up on the ramp', 'Vehicle 1 of 1', [
      'It is the pool car. It is eight feet in the air with its wheels off, its sills going brown in a way that is being described to somebody on the phone right now as “an advisory”, and a magnetic light hanging off its floorpan.',
      'From underneath, a voice you do not know says a number, and a voice at the door says a different, smaller number back, and neither of them is talking to you.',
      'It will be back in its bay by four. It always is. Nobody on the fourth floor has ever once wondered how.']);
  },
  /* The spike. Eleven invoices, none paid, and the only thing in this game you
     can settle out of your own pocket for somebody who did not ask. */
  tyreSpike() {
    if (G.flags.paidInvoice) {
      return insp('🧾', 'The invoice spike', 'Ten outstanding', [
        'Ten now. The one you paid is folded over the top of the spike rather than on it, because he did not know where else to put a thing that had been dealt with.',
        'He has not mentioned it to anybody and he is not going to. Neither of you has said the word “favour” and neither of you is going to do that either.']);
    }
    insp('🧾', 'The invoice spike', 'Eleven outstanding', [
      'A steel spike on a shelf by the door with eleven yellow carbon copies on it, and every single one of them says CALLHALL SERVICES at the top in a hand that has got worse each time.',
      'The oldest is four years old. The MOT, twice. Two exhausts. A wheel bearing. A tyre, and then the same tyre again, six weeks later, which tells its own story about a kerb on Aldergate Rise.',
      'Nobody has chased them. Terry sends a card at Christmas. That is the arrangement, and both parties have been quietly furious about it for so long that it has become a friendship.'],
      [{ t: 'Pay the oldest one yourself. (£48)', to: null, if: () => P.money >= 48, do() {
          G.flags.paidInvoice = true;
          Player.mod({ money: -48, patience: -2, rep: 6 });
          Item.give('invoice');
          Ach.get('a_invoice');
          UI.toast('🧾', 'He looks at the money, then at you, then at the money. He does not ask which department. He writes PAID across it and gets the date wrong by a year.', 'gold');
        } },
       { t: 'Take a photograph of it for Terry.', to: null, do() {
          UI.toast('📷', 'You will not send it. You know you will not send it. You take it anyway, which is what everybody does with evidence of something that is nobody’s fault.');
        } },
       { t: 'Look at something else.', to: null }]);
  },
  tyreCompressor() {
    insp('🌬️', 'The compressor', 'On, always', [
      'It cuts in about every ninety seconds, for eleven seconds, at a volume that would stop a meeting dead.',
      'Nobody in this building has heard it for years. You will hear nothing else for the rest of the time you are in here, and on the way out you will realise you had stopped hearing it too, about four minutes ago.']);
  },
  tyreGranules() {
    insp('📦', 'The bag of granules', 'For spills', [
      'A split paper sack of absorbent granules, the smell of which is the smell of every garage, every school corridor after an incident, and one specific Tuesday in 2003 you had entirely forgotten until this second.']);
  },
  tyreDrum() {
    insp('🛢️', 'The oil drum', 'Waste', [
      'A blue drum of waste oil with a funnel in the top and a tide mark, collected by a man in a tanker on a schedule nobody here has ever had to think about.',
      'It is the single best-run waste stream on this map, it costs this business nothing, and the council has spent four years failing to do the same thing with cardboard.']);
  },

  /* ---- UNIT 6 ---------------------------------------------------------
     No staff, no counter, no transaction. The room is a stratigraphy and the
     acts are read back to front: everything nearest the door is now, and
     everything at the back is 2011. The gag is that the current business is
     never stated by anything except one line on one clipboard. */
  sixOut() { Sfx.door(); Levels.take('sixOut'); },
  sixConservatory() {
    insp('🪟', 'The conservatory sample panel', 'Anthracite grey', [
      'A three-foot square of double-glazed unit in an aluminium frame, screwed to the back wall at the height of a man’s chest so that a man could tap it and say “that’s your twenty-eight mil, that is”.',
      'Nobody has tapped it since 2011. You are absolutely going to tap it.'],
      [{ t: 'Tap it.', to: null, do() {
          Player.mod({ patience: 2 });
          UI.toast('🪟', 'It goes “tok”. It is an extremely satisfying “tok”. You understand, briefly and completely, the entire conservatory industry.');
        } },
       { t: 'Do not tap it.', to: null, do() { UI.float('You will be back.', '#9fb3c8'); } }]);
  },
  sixLaminate() {
    insp('📄', 'A laminated sheet', 'Sorry!', [
      'A4, laminated, in a hand that slopes: “OUT OF ORDER — sorry!”',
      'There are nine of these in this unit. One is on a wall. One is on the floor. One is on a door that has no lock, no handle and no other side.',
      'And one of them, and you will need a moment with this, is laminated over the top of another laminated sheet that also says OUT OF ORDER — sorry!']);
  },
  sixFireExit() {
    insp('🚪', 'The fire exit sign', 'Green, running man', [
      'A running man, an arrow, and forty years of building regulations, pointing confidently and directly at a wall.',
      'Behind that wall is Bellhaven Tyre & Exhaust. In the event of a fire the correct procedure, as signed, is to become a tyre place.']);
  },
  sixTimetable() {
    insp('🗓️', 'The class timetable', 'Blank', [
      'A whiteboard grid, professionally printed, Monday to Sunday, six slots a day, ruled off in permanent marker.',
      'Every cell is empty except Wednesday at seven, which says “WED 7” in the same permanent marker, which is not information.']);
  },
  sixGlazing() {
    insp('📦', 'The offcuts of double glazing', 'Stacked, 2011', [
      'Nine offcuts of sealed unit stood on edge against the back wall with a bit of carpet under them so they do not chip.',
      'Whoever put the carpet under them was being careful with something they were about to walk away from forever, and that is the single most human object in this unit.']);
  },
  sixBrochures() {
    insp('📕', 'The brochure stand', 'Please take one', [
      'A wire stand of glossy brochures for conservatories, sun lounges and orangeries, with a photograph on the front of a family sitting in weather Britain has had twice.',
      'The finance table on the back page quotes an APR that makes you put it down and then, four seconds later, pick it up again to check.'],
      [{ t: 'Take one.', to: null, do() {
          UI.toast('📕', 'You take a brochure for a conservatory you cannot afford for a house you do not own. It will live in the pool car for two years.');
        } },
       { t: 'Please take none.', to: null }]);
  },
  sixBall() {
    insp('🔵', 'One ball', 'Blue', [
      'One soft play ball, blue, alone, forty feet from anything, in a unit that has not had a ball pit in it since 2019.',
      'It is not in a corner. It is in the middle of the floor. Somebody has swept round it, repeatedly, over a period of years.'],
      [{ t: 'Kick it.', to: null, do() {
          Player.mod({ patience: 4 });
          UI.toast('🔵', 'You kick it. It goes about nine feet and stops, and you look at where it has stopped, and you go and put it back where it was.');
        } },
       { t: 'Leave the ball.', to: null }]);
  },
  sixNetting() {
    insp('🥅', 'The netting', 'Still bolted', [
      'A run of soft play netting, the good stuff, rated and certificated, still bolted to the floor with resin anchors that would take an angle grinder and an afternoon.',
      'Everything cheap about that business left in a van. Everything expensive about it is still here, which is how you can date every unit on this street: look for what was too much trouble to remove.']);
  },
  sixDumbbell() {
    insp('🏋️', 'A dumbbell, 4kg', 'The evidence', [
      'One dumbbell. Four kilograms. Pink. In a unit whose vinyl says, on the outside, in letters three feet high, BELLHAVEN STRENGTH & CONDITIONING.',
      'It is the only piece of gym equipment in this unit that is not a rowing machine, and there is one rowing machine.']);
  },
  sixRower() {
    insp('🚣', 'The rowing machine', 'Plugged in', [
      'A rowing machine, quite a good one, plugged into a wall socket and switched on at the wall, with a monitor showing a single flashing zero.',
      'The seat runs freely. The chain is oiled. Somebody looks after this and is not here.'],
      [{ t: 'Have a go. (6 min.)', to: null, do() {
          G.minutes += 6; Player.mod({ energy: -6, patience: 6 });
          UI.toast('🚣', 'Six minutes. Five hundred metres. You get off it feeling wildly better than you expected and slightly worse than you have admitted.');
        } },
       { t: 'You are in work clothes.', to: null }]);
  },
  sixTable() {
    insp('🪑', 'The folding table', 'Reception', [
      'A wallpaper pasting table with a card reader taped to it, a roll of blue paper towel, and a plastic tub with £15 of float in it, entirely unattended, in an unlocked unit, on a Tuesday afternoon.',
      'Nothing has ever been taken. Everybody who could take it drinks in the club four doors down and would have to keep doing that afterwards.']);
  },
  /* The one line in this unit that says what the unit currently is, and it is
     on a clipboard, in biro, at knee height. */
  sixSheet() {
    if (!G.flags.knowUnitSix) {
      G.flags.knowUnitSix = true;
      Ach.get('a_unitsix');
      return insp('📋', 'The signing-in sheet', 'Please sign in', [
        'A clipboard. Columns for NAME, TIME IN, TIME OUT. Twenty-two lines, four of them filled, all four this morning, all four in the same biro.',
        'And along the top, printed, small, the only place in this entire unit where the current business writes its own name down:',
        '“BELLHAVEN BARBELL CLUB (formerly Bellhaven Strength & Conditioning) (formerly Fitness Unit 6) — members only, keycode on the group chat, PLEASE do not tell the landlord we are open.”',
        'The vinyl on the front is a gym. The unit is a club. It has been a club, quietly, under four different signs, for eleven years, and every single one of those signs was true for about a fortnight.']);
    }
    insp('📋', 'The signing-in sheet', 'Four in this morning', [
      'Four names, all in one biro, none of them in the same handwriting as the last four, which means one person signs everybody in and that person got here first and has already gone.',
      'You could put your name down. You would then be a member of a club whose keycode you do not have, in a unit that officially sells conservatories.'],
      [{ t: 'Sign in.', to: null, do() {
          Player.mod({ patience: 4 });
          UI.toast('📋', 'You write your name, the time, and — after a pause you will think about later — a time out that is four minutes from now. It is the most optimistic thing you have written all year.');
        } },
       { t: 'Do not join the club.', to: null }]);
  },

  /* ---- THE WORKING MEN'S CLUB -----------------------------------------
     A gate, then a wall. Getting in costs a name and any name will do; being
     in is a reading exercise, and the thing being read is a committee. */
  clubOut() { Sfx.door(); Levels.take('clubOut'); },
  clubBooth() {
    insp('🪟', 'The doorman’s booth', 'Manned 12 till 12', [
      'A hardboard booth the size of a wardrobe, with a hatch, a stool, a fan heater and a folded newspaper on the ledge, folded to the bit he is doing rather than the bit he is reading.',
      'He is not security. There is nothing here to secure. He is the mechanism by which this room knows who is in it, which is a completely different job and a much older one.']);
  },
  clubBook() {
    insp('📖', 'The signing-in book', 'Guests must be signed in by a member', [
      'A hardback ledger, ruled columns, GUEST and SIGNED IN BY, going back to a first entry in 1974 which is in fountain pen.',
      'You run your eye down the current page. Then the page before. Then, with a growing feeling, the page before that.',
      'Every guest in this book for the last four years has been signed in by Terry. Every one. Hundreds. In eleven different handwritings, because Terry does not personally do the writing, and in one case in what is unmistakably a child’s.',
      'Terry has not been here since March.']);
  },
  /* Seven items, chained rather than paged, because minutes are a thing you
     are made to go THROUGH. Item 7 is the payload and the achievement. */
  clubMinutes() {
    const item = (n, lines, next) => ({
      text: lines,
      choices: [next
        ? { t: 'Item ' + (n + 1) + '.', to: next }
        : { t: 'Close the folder.', to: null, do() {
            if (!G.flags.readMinutes) { G.flags.readMinutes = true; Ach.get('a_minutes'); }
          } },
        { t: 'Stop reading the minutes.', to: null }],
    });
    const seven = item(7, [
      'ITEM 7: THE CEILING TILES IN THE FUNCTION ROOM.',
      '“Carried forward to the next meeting.” Under it, in a different pen: “Carried forward to the next meeting.” Under that, in a third pen and slightly larger, as if to settle it: “CARRIED FORWARD.”',
      'You count back through the folder. Item 7 has been carried forward at every meeting since March 2019, which is forty-eight meetings, which is more times than this committee has discussed anything it has ever resolved.',
      'The ceiling tiles are fine. You looked at them on the way in. The ceiling tiles have always been fine. Item 7 is not about the ceiling tiles and everybody on this committee knows exactly what item 7 is about and not one of them is ever going to say it out loud, and so it will be carried forward until the last of the six of them dies.',
    ], null);
    const six = item(6, ['ITEM 6: RAFFLE.', '“Agreed to continue the raffle.” The raffle has continued since 1974 and has never been on any agenda as anything other than continuing.'], seven);
    const five = item(5, ['ITEM 5: THE STEPS.', '“Agreed to get a price for the steps.” A price was got for the steps in 2016, 2018 and 2021. Three prices exist. The steps do not know about any of this and continue to be steps.'], six);
    const four = item(4, ['ITEM 4: SNOOKER.', '“The league has asked about Wednesdays. Agreed to say we would look at Wednesdays.” They did not look at Wednesdays.'], five);
    const three = item(3, ['ITEM 3: CORRESPONDENCE.', '“One letter, from the brewery. Read out. No action.” Nobody has ever recorded what was in the letter from the brewery, at any meeting, in fifty years.'], four);
    const two = item(2, ['ITEM 2: MATTERS ARISING.', '“Matters arising from the previous minutes: none arising.” This has been the entirety of item 2 for four years, which means either nothing has arisen since 2021 or item 2 has quietly become a ceremony.'], three);
    const one = item(1, ['ITEM 1: APOLOGIES.', '“Apologies received from D. Apologies received from R. Apologies from B accepted with regret.”', 'Nobody is ever named. The committee is six people and has been the same six people since before this building was wired, and they use initials, and they use them for each other, in a room they are all in.'], two);
    insp('📌', 'The committee minutes', 'Pinned, in a plastic folder', [
      'A plastic display folder on the noticeboard containing the minutes of the last four years of committee meetings, printed one side, in a font somebody chose in about 1998 and has defended since.',
      'Seven items. It is always seven items. The seventh is the one.'],
      [{ t: 'Read them properly.', to: one },
       { t: 'You have your own meetings.', to: null }]);
  },
  clubFixtures() {
    insp('🗓️', 'The fixture list', 'Snooker · Darts · Doms', [
      'Three leagues, home and away, printed in a grid with the away teams in italics and the cup rounds in bold, and the whole thing folded twice at some point and never flattened.',
      'The dominoes league has eleven teams in it. Eleven. In this town. There are more competitive dominoes players within a mile of this room than there are people on your floor, and you have never met one of them, and one of them almost certainly sold you a car.']);
  },
  clubHonours() {
    insp('🏆', 'The honours board', 'Gold leaf on black', [
      'Two columns of names in gold on a black board, hand-painted, one line per year, going back to 1961.',
      'The same surname appears in 1974, 1998 and 2019, which is a grandfather, a father and a daughter, and the daughter’s line is the only one on the board that has been painted by somebody who was clearly being paid properly.',
      'There is one blank line at the bottom, primed and ready. There always is. That is how you keep a board like this alive: you leave room.']);
  },
  clubBanned() {
    insp('🚫', 'The banned list', 'By order of the committee', [
      'A single sheet in a frame, which tells you the committee expected it to be a long list and it never was.',
      'One name. Struck through with a single line, and then — you have to get quite close to the glass for this — the strike-through has itself been crossed out.',
      'So he was barred, and then he was unbarred, and then somebody rebarred him, and the frame has not been opened since, which means it has been settled that way for so long that everybody has stopped knowing which state is current, including him, who drinks here on Fridays.']);
  },
  clubRaffle() {
    if (Item.has('raffle')) {
      return insp('🎟️', 'The raffle', 'Blue book, number 47', [
        'You have 47. The draw is at the Christmas do. You are not going to the Christmas do.',
        'The prize this month is a meat hamper, a bottle of something amber and, third prize, a voucher for a hand car wash four doors down, which will be won by somebody who does not drive.']);
    }
    insp('🎟️', 'The raffle', '£1 a strip', [
      'A blue cloakroom-ticket book and a jam jar, unattended, on the ledge under the noticeboard, in a room that has been leaving a jam jar of money out since 1974.',
      'The prizes are written on an envelope: a meat hamper, a bottle of something amber, and — third prize, and somebody has thought hard about this — a voucher for the car wash on the corner.'],
      [{ t: 'Buy a strip. (£1)', to: null, if: () => P.money >= 1, do() {
          Player.mod({ money: -1, patience: 4 });
          Item.give('raffle');
          UI.toast('🎟️', 'You tear off a strip and put a pound in a jar in an empty room. Nobody will ever check that you did. That is not the same as nobody knowing.');
        } },
       { t: 'Not your raffle.', to: null }]);
  },
  clubMeter() {
    insp('🎛️', 'The meter for the light over table two', '20p · 30 min', [
      'A coin meter on the wall, twenty pence for half an hour of light over table two. It is the only object in Bellhaven that still wants a coin and it is completely unashamed about it.',
      'Table one’s light is on a switch and has been since 2004. Nobody has ever moved table two onto the switch. There is a reason and it is item 7.'],
      [{ t: 'Put 20p in.', to: null, if: () => P.money >= 0.2, do() {
          Player.mod({ money: -0.2 });
          G.flags.clubLightOn = true;
          UI.toast('🎛️', 'A clunk, a hum, and half an hour of light over an empty snooker table, in an empty room, in the middle of a Tuesday. It is one of the best things you have ever bought.');
        } },
       { t: 'Leave it dark.', to: null }]);
  },
  clubTableOne() {
    insp('🎱', 'Table one', 'Lit', [
      'Full size, re-clothed within living memory, ironed, brushed and covered with a fitted sheet everywhere except where somebody has turned the sheet back to look at it.',
      'The rest is under the cushion at the bottom right, where the rest lives, where it has always lived, and where every single person who plays here would find it in the dark.']);
  },
  clubTableTwo() {
    insp('🎱', 'Table two', G.flags.clubLightOn ? 'Lit, for thirty minutes' : 'Dark', [
      G.flags.clubLightOn
        ? 'Lit. Twenty pence of light on a cloth that has a shine down one side from forty years of the same shot, and a fine even layer of chalk dust you can see because there is finally something to see it in.'
        : 'Dark, because the light over it is on a meter, and it is a Tuesday, and nobody has put twenty pence in a meter in this room since Sunday night.',
      'The cloth is worse than table one’s and everybody plays on it anyway, because table one is table one, and this is exactly the same arrangement as the good chair on the fourth floor, and the same six people are enforcing it.']);
  },
  clubBar() {
    insp('🍺', 'The bar', 'Opens at six', [
      'Nine feet of it, wiped, with the towels on the pumps and the optics turned to the wall, and a laminated card by the till that says CARD MACHINE IS BACK — with a small hand-drawn party hat next to it.',
      'The price list behind is written in chalk and the top figure on it is lower than the cheapest thing on the Bellhaven Arms’ chalkboard by ninety pence, which is the entire economic explanation for this room’s continued existence.']);
  },
  clubTill() {
    insp('💷', 'The till, which is a drawer', 'Not a till', [
      'It is a drawer. It has a cutlery insert in it. The tenners are under the insert and the float is in the bit for teaspoons.',
      'Fifty-one years of accounts have gone through a cutlery insert and been correct to the penny every single time, which is more than can be said for the reconciliation system on your floor, which cost eleven thousand pounds.']);
  },
  clubChairs() {
    insp('🪑', 'The chairs nobody moves', 'Four, in a row', [
      'Four chairs against the wall, facing the room, spaced the way chairs get spaced when the same four people have sat in them for years and each one has quietly optimised.',
      'The second from the left has a cushion on it that nobody else uses. It is not marked. It does not need to be.']);
  },
  clubFloor() {
    insp('🕺', 'The dance floor', 'Sprung', [
      'A rectangle of parquet in a sea of carpet, sprung underneath, and it gives about four millimetres when you step on it, which you can feel through work shoes and which is the entire reason it exists.',
      'It has been danced on at eleven hundred functions and it will be danced on at your leaving do, by nine people, badly, to a song chosen by somebody in the office who has never been in this building.']);
  },
  clubFunction() {
    insp('🚪', 'The function room', 'Available for hire', [
      'Double doors with a laminated card: AVAILABLE FOR HIRE — NO CHARGE FOR MEMBERS’ FAMILY FUNERALS. That second clause has never been amended and is doing more good in this postcode than any policy on your intranet.',
      'Through the crack: forty stacked chairs, a wallpaper table, a hatch to a kitchen, and eleven feet of bunting nobody has taken down since something in the summer.']);
  },
  clubStack() {
    insp('🪑', 'The stack of chairs', 'Forty', [
      'Forty stacking chairs in four stacks of ten, and one stack of eleven, which is either a mistake from a leaving do or the way somebody has decided it is now done.',
      'These are the chairs of every retirement, every wake and every eighteenth this town has had since 1974, and they have never been anywhere else, and they never will be.']);
  },

  /* ---- SUNSEEKERS -----------------------------------------------------
     A corridor. Everything that happens here happens behind a door. */
  tanOut() { Sfx.door(); Levels.take('tanOut'); },
  tanWarning() {
    insp('⚠️', 'The warning notice', 'Statutory', [
      'The statutory notice, in the smallest legal size, about skin type, exposure and the under-eighteens, next to a hand-written sign in marker four times the size that says PLEASE WIPE THE BED.',
      'Everybody in this building obeys the second one.']);
  },
  tanPrices() {
    insp('📋', 'The price list', 'Per minute', [
      'Priced by the minute, in three tiers, with a fourth column of package deals whose arithmetic rewards buying an amount of ultraviolet light that is difficult to defend.',
      'At the bottom: SPRAY — BOOTH 3 — ASK. Booth 3 has a laminated sheet on it. You are ahead of me.']);
  },
  tanBeach() {
    insp('🏝️', 'The photograph of a beach', 'Adhesive vinyl', [
      'A vinyl panel of a beach, applied to the wall of a corridor with no window in it, and starting to lift at the top left corner where somebody has picked at it while waiting.',
      'The beach is in Thailand. Nobody who has ever stood in this corridor has been to Thailand. That is not a joke about anybody; it is simply true and quite sad and the panel is doing its best.']);
  },
  tanDesk() {
    insp('🧾', 'The desk', 'Back in 5 mins', [
      'A desk with a card machine, a jar of pens, a tub of goggles, and a folded sign that says BACK IN 5 MINS in a way that suggests the sign is load-bearing and permanent.',
      'The chair behind it is warm. There is a mug on the desk with tea in it that is not cold. Somebody is forty feet away doing something and will be back long after you have gone.']);
  },
  tanBell() {
    const n = (G.flags.tanBell || 0) + 1;
    G.flags.tanBell = n;
    const lines = n === 1
      ? ['You ring the bell. It is a good bell, the shopkeeper kind, with a proper single note to it.', 'Nothing happens. Somewhere behind a door, a timer runs.']
      : n === 2
        ? ['You ring it again. The note is identical. It is a very well-made bell.', 'Still nothing. You become aware that you are now a person who has rung a bell twice.']
        : n === 3
          ? ['Three times. From behind booth two, a voice you cannot identify the gender or age of says, pleasantly, muffled through a door and a fan: “WON’T BE A SEC.”', 'It will be a sec. It will be several thousand secs.']
          : ['You do not ring it a fourth time. You have decided this about yourself, standing in a corridor, alone, in front of a bell, and it is possibly the only decision you will make all day that holds.'];
    insp('🔔', 'The bell', n >= 3 ? 'Won’t be a sec' : 'Please ring for service', lines);
  },
  /* Three doors. One is running, one has somebody's life outside it, and one
     is out of order, and you can only ever go in the one that is free —
     which is booth one, and which shows you nothing at all. */
  tanBoothOne() {
    if (G.flags.usedBooth) {
      return insp('🚪', 'Booth one', 'Yours, twelve minutes ago', [
        'The door is ajar and the fan is still running itself down, which it does for four minutes afterwards, which is longer than anybody stays to hear.',
        'You wiped the bed. You did not need to be told twice.']);
    }
    insp('🚪', 'Booth one', 'Free', [
      'A door with a green light over it, and behind the door a room you cannot see into, containing a machine you cannot see, in a building whose entire proposition is that you will not be looking at any of it.',
      'Twelve minutes is the shortest they sell. Twelve minutes of light, alone, in a box, with a fan, for six pounds.'],
      [{ t: 'Have twelve minutes. (£6)', to: null, if: () => P.money >= 6, do() {
          G.flags.usedBooth = true;
          G.minutes += 16; Player.mod({ money: -6, energy: 4, patience: 10 });
          if (!Item.has('loyalty')) Item.give('loyalty');
          Ach.get('a_booth');
          UI.toast('🌞', 'The door shuts. The fan comes on. Nothing else is visible for twelve minutes and it is, without any competition at all, the most restful thing that has happened to you this week.', 'gold');
        } },
       { t: 'Look at the other doors.', to: null }]);
  },
  tanBoothTwo() {
    insp('🚪', 'Booth two', 'Red light · 4 min remaining', [
      'Red light. A fan. A digital timer above the door reading down through four minutes in a corridor with nobody in it to watch it.',
      'And, faintly, through the door and under the fan, somebody singing. Not performing — the other kind, the kind people do when they are certain they are alone, badly, half the words, to something that is not playing in the room.',
      'You are going to be somewhere else when that door opens. You owe them that.']);
  },
  tanBoothThree() {
    insp('🚪', 'Booth three', 'Spray · out of order', [
      'The spray booth. A4, laminated, sloping hand: “OUT OF ORDER — sorry!”',
      'It is the same laminator, the same font and the same apology as the nine sheets in Unit 6, four doors down.',
      'One person on this street owns a laminator. Everything that has ever gone wrong on Fenn Street has been announced by that one person, apologising, on behalf of businesses they have nothing to do with, for years.']);
  },
  tanThings() {
    insp('🧳', 'Somebody’s things outside booth two', 'Not yours', [
      'A coat, a lanyard face-down, a set of car keys, a phone screen-down, and a supermarket bag with a pint of milk in it, all in a neat pile on the floor outside a door with a red light over it.',
      'Every object in that pile is a decision to trust a corridor, and the corridor has never once let anybody down, and none of them knows that about it.']);
  },
  tanGoggles() {
    insp('🗑️', 'The bin of used goggles', 'Sterilised, allegedly', [
      'A tub of small plastic goggles, and beside it a second tub for used ones, and between the two tubs a distance of about four inches and an enormous amount of faith.']);
  },

  /* ---- THE STREET, REVISITED ------------------------------------------
     Six frontages that used to be a paragraph and are now a door, plus one
     skip. */
  theFortyOne() {
    insp('\ud83d\ude8c', 'The 41', 'Stops here', [
      'The green one. It stops. It has always stopped. Every argument anybody in this town has ever had about the buses is downstream of the fact that one of the two stops and they are the same shape from a distance.',
      'Through the windows: four people, all of whom are sitting on their own, all of whom could have sat together, all of whom have made the correct decision.']);
  },
  refitSkip() {
    const load = pick([
      'Today it contains: a bath, four lengths of skirting, a door, and a rolled carpet that has been rained on and is now a geological feature.',
      'Today it contains: the same bath. The skirting has gone. Nobody saw it go and nobody took it, and the bath is now demonstrably lower in the skip than it was, which is not physically possible.',
      'Today it contains: almost nothing, and a single radiator, laid diagonally, in a way that says somebody emptied it at six this morning and immediately started again.',
      'Today it contains: somebody else’s kitchen. It is not from this unit. It is not from this street. It got here in the night and it will be gone in the night.',
    ]);
    insp('🚛', 'The skip', 'Permit displayed (2019)', [
      'A yellow skip on the road outside the unit that is always being refitted, with a permit cable-tied to it that expired in 2019 and a hi-vis vest tied to the corner nearest the traffic.',
      load,
      'It has never been full and it has never been empty. Two men come, and it goes, and an identical one is there the following morning, and this has now happened enough times that it has stopped being a coincidence and started being the business.']);
  },

  /* ---- THE FLATS ABOVE THE PARADE -------------------------------------
     A landing, six doors, and the outside of three homes belonging to people
     you work with or buy things from. Nothing in here is a transaction and
     nothing in here is open, which is the point: this is the amount of
     somebody's home you are entitled to, and it turns out to be quite a lot.

     Acts.homeOf() is the one join: a person's `home.where` in data/npcs.js is
     written once and read here, so a door and a profile panel can never
     disagree about where somebody lives. */
  homeOf(id) {
    const d = typeof NPCS !== 'undefined' && NPCS.find(p => p.id === id);
    return (d && d.home && d.home.where) || '';
  },
  flatsDoorway() {
    insp('\ud83d\udeaa', 'The door beside the launderette', 'Nos. 1\u20136', [
      'Not a shop. A door, between two shops, painted a colour that was chosen and has not been chosen since, with six bells beside it and no sign anywhere saying what it is.',
      'Every parade in this country has one of these and nobody who does not live behind one has ever once looked at it.',
      'Three of the bells have names on. Two have had names on and now have the shape of a name on. The sixth has never had anything on it at all.'],
      [{ t: 'Go up.', to: null, do() { Levels.take('flatsDoor'); } },
       { t: 'It is not your building.', to: null }]);
  },
  flatsOut() { Sfx.door(); Levels.take('flatsOut'); },

  /* THE SIX DOORS. Three are somebody's and three are the parade's. */
  flat1() {
    insp('\ud83d\udeaa', 'Flat 1', 'Nineteen years', [
      'A mat that has been hoovered. Nobody hoovers a communal mat.',
      'Through the door, very faintly, a radio that is not the tyre place\u2019s station, and underneath the radio, through the floor, the sound of eight machines on the last cycle of the day.',
      'Pat lives four stairs and a fire door above her own launderette. ' + Acts.homeOf('pat').replace(/^./, c => c.toUpperCase()) + '.']);
  },
  flat2() {
    insp('\ud83d\udeaa', 'Flat 2', 'Nobody\u2019s, for two years', [
      'No mat. Four screw holes where a mat used to be gripped down, which is a thing you only do if somebody keeps moving your mat.',
      'A card from a letting agent wedged in the frame, curled, with a date on it from a spring that is not this one.',
      'Flat 2 has been empty for two years and is advertised at a rent that would take somebody on the fourth floor eleven days of every month.']);
  },
  flat3() {
    insp('\ud83d\udeaa', 'Flat 3', 'Do not knock', [
      'A laminated sheet at eye height: NIGHTS \u2014 PLEASE DO NOT KNOCK BETWEEN 9 AND 4. It is laminated in the same laminator as everything else on this street.',
      'Underneath it, in biro, on a Post-it, in different handwriting: \u201cwe never do x\u201d.',
      'Nobody on this landing has met them. Everybody on this landing is extremely careful on the stairs.']);
  },
  flat4() {
    insp('\ud83d\udeaa', 'Flat 4', 'Steve, IT', [
      'Four parcels. Four. On a Tuesday. Stacked with the labels turned in, which is either security-mindedness or shame and is, knowing him, both.',
      'A smell of solder that this landing has smelled every evening for six years and has stopped noticing.',
      'Steve from IT lives eleven feet above a vape shop that was a phone repair shop, and has never once mentioned that he could have done the phone repair shop\u2019s entire job, because Steve does not mention things.']);
  },
  flat5() {
    insp('\ud83d\udeaa', 'Flat 5', 'Still being written to', [
      'The busiest door on this landing and nobody has lived behind it since 2014.',
      'The post is redirected, then it stops being redirected, then it starts again, and somewhere a computer has this address as true and will have it as true for ever.',
      'Today: a bank, a dentist, a garden centre, and one addressed to a business that shut in 2011, which is being written to at a flat above a shop that was never its premises. There is no explanation and there is not going to be one.']);
  },
  flat6() {
    if (!G.flags.knowMoFlat) {
      G.flags.knowMoFlat = true;
      Ach.get('a_flat6');
      return insp('\ud83d\udeaa', 'Flat 6', 'Mo', [
        'A mat, new, still with the fold in it from the packaging.',
        'One letter, opened and put back, which is what people do when a letter is good.',
        'And on the door itself, at exactly the height of a person\u2019s eye, a small brass number 6, screwed on, straight, by somebody who bought a screwdriver for it.',
        'Nobody on the fourth floor knows this is his first place. He has not said. He has done the number, and he has done the mat, and he is twenty-three and he is doing it entirely on his own, and neither of you is ever going to raise it.']);
    }
    insp('\ud83d\udeaa', 'Flat 6', 'Mo', [
      'The number is still straight. It is going to stay straight, because he checks it, because it is his.']);
  },
  flatsWindow() {
    insp('\ud83e\ude9f', 'The window over the High Street', 'Sash, painted shut', [
      'A sash window painted shut by four separate landlords, looking straight down the High Street at the whole parade at once: the awnings, the bins, the bench, the one lit shopfront.',
      'This is the view somebody has had every morning for nineteen years. From here you can see six businesses that have changed hands and one that has not.',
      'It is, from up here, quite a good street. That is a genuinely surprising thing to find out about it.']);
  },
  /* THE POST. The mechanism of this room: a pile on a windowsill that reads
     the whole parade backwards. Different letter every time and it never
     repeats the KIND of thing — same idea as the tyre place's radio and a
     different shape, because a pile is not a running order. */
  flatsPost() {
    const bit = pick([
      'A brown envelope for a man who moved out in 2016, which the whole landing has agreed, without discussing it, not to write NOT KNOWN on, because writing NOT KNOWN on it would end something.',
      'A wedding invitation, addressed by hand, to Flat 2, which has been empty for two years. Somebody has stood it upright against the glass so it can be seen from the stairs. It has been standing there a while.',
      'A takeaway menu for a takeaway that is four doors down and has been four doors down for eleven years, delivered by hand, by somebody who could have shouted.',
      'A letter from the council to \u201cThe Occupier\u201d, which is the only piece of post on this sill addressed to somebody who definitely exists.',
      'A postcard. Actual postcard, actual stamp, a beach nobody in this building has been to, and four lines of handwriting that end \u201canyway. see you tuesday\u201d, and it is not addressed to any of the six flats.',
      'Two bank letters for Flat 5, one dentist for Flat 5, and a garden centre for Flat 5, who has not lived here since 2014 and whose name everybody on this landing could tell you.',
    ]);
    insp('\ud83d\udcec', 'The post on the windowsill', 'Since about 2015', [
      'A drift of post on the sill by the window, propped, stacked and fanned by eleven years of people picking through it for their own and putting everybody else\u2019s back tidily.',
      bit,
      'Nobody throws any of it away. Six people have independently decided that throwing away somebody else\u2019s post is a thing they are not prepared to be.']);
  },
  flatsBike() {
    insp('\ud83d\udeb2', 'The bike', 'Nobody\u2019s', [
      'A bike against the wall of the landing with two flat tyres and a chain the colour of the radiator.',
      'It belonged to somebody in Flat 3, or Flat 5, or to the man who moved out in 2016. Nobody remembers. Everybody squeezes past it.',
      'Moving it would require a decision about whose it is, and nobody is going to be the one who makes that, so it will be here when the building comes down.']);
  },
  flatsMeters() {
    insp('\u26a1', 'The meters', 'Six, and a seventh', [
      'Six electricity meters in a cupboard with a door that does not shut, labelled 1 to 6 in three different hands.',
      'There is a seventh. It is not labelled. It is not on any of the six bills and it has never been on any of the six bills, and it is going round.',
      'Every tenant since 2009 has noticed the seventh meter, decided to look into it, and not looked into it.']);
  },
  flatsTimer() {
    insp('\ud83d\udd58', 'The light on the timer', 'Eleven seconds short', [
      'A push-button timer for the landing light, set to a duration that is, by common agreement, eleven seconds shorter than the walk from the street door to Flat 6.',
      'Everybody who lives here knows exactly where on the stairs it goes out. Nobody has ever adjusted it. Two of them have got quite good at the last bit in the dark.'],
      [{ t: 'Press it.', to: null, do() {
          Player.mod({ patience: 2 });
          UI.toast('\ud83d\udd58', 'It comes on with a clunk you can feel through the wall. You have eleven seconds fewer than you need and you are not going anywhere, so for once it is plenty.');
        } },
       { t: 'Leave it.', to: null }]);
  },
  flatsRad() {
    insp('\u2668\ufe0f', 'The radiator', 'Communal', [
      'A radiator on a communal landing, which is a radiator nobody pays for and therefore a radiator nobody controls.',
      'It is on. It is October and it is on and it has been on since August, and it will be on in June, and the valve is painted into the position it was painted into.']);
  },
  flatsBags() {
    insp('\ud83d\uddd1\ufe0f', 'The bin bags by the stairs', 'Going down tonight', [
      'Two bags at the top of the stairs, tied properly, put where somebody will trip over them, which is exactly where you put a bag you intend to take down and exactly where you put a bag you do not.',
      'One of them has been there since Sunday. One of them is going down tonight. They are identical and everybody on this landing knows which is which.']);
  },

  /* --- THE HIGH STREET --- */
  nailedIt() {
    insp('💅', 'Nailed It', 'Open till six', [
      'A nail bar with a name the owner clearly enjoyed choosing, and a laminated price list that has not changed since it opened.',
      'Half the fourth floor gets their lunch-break gel done in here. The other half pretends not to know that.',
      /* The twenty minutes used to be spent out here on the pavement. They are
         spent in there now, on a bench, in front of three people, which is a
         different twenty minutes entirely. */
      Acts.nailsRoom() === 3
        ? 'Through the glass, three heads you know, in a row, none of them facing the window.'
        : 'Through the glass: three chairs, all occupied, and a shape in the first one that is either a stranger or is going to make this afternoon much more interesting.'],
      [{ t: 'Go in.', to: null, do() { Levels.take('nailsDoor'); } },
       { t: 'Not today.', to: null }]);
  },
  shopSign() {
    insp('🪧', 'The sign above Nailed It', 'Weathered', [
      'A painted board, faded enough that the name reads better on the awning below it than up here.',
      'Underneath, in smaller letters nobody repaints: EST. LAST TUESDAY. Terry says it is a joke. Terry says that about several things that are not jokes.']);
  },
  bench2() {
    insp('🪑', 'Another bench', 'Also donated', [
      'A second bench, further along, with a plaque in the same hand as the first one. IN MEMORY OF DOREEN, WHO ALSO LIKED IT HERE.',
      'Either Doreen liked it here twice as much as one plaque could hold, or somebody on the committee could not remember commissioning the first one.'],
      [{ t: 'Sit with Doreen again.', to: null, do() {
          G.minutes += 5; Player.mod({ patience: 6, energy: 2 });
          UI.toast('🪑', 'Five minutes. It is a slightly better view than the other bench, which is either the point or a coincidence.');
        } },
       { t: 'One Doreen bench was enough.', to: null }]);
  },
  highStreetBin() {
    insp('🗑️', 'Bin, High Street', 'Council', [
      'A council bin outside Nailed It, mostly cotton pads and the little foil pouches nail varnish remover comes in.',
      'Nobody from the fourth floor has ever admitted to using this one either.']);
  },

  /* --- THE PEOPLE ON THE STREET ---
     Strangers, and written as strangers: one exchange, no follow-up, nothing
     remembered on either side. Half of them work in this building on a floor
     you have never been to, which is the honest answer to why they look
     faintly familiar — there is one set of composited character rows in the
     atlas and they all borrow from it. See engine/peds.js. */
  passerby(ped) {
    insp('🧑', ped.name, 'Passing', [
      pick(['They nod. You nod. Nobody breaks stride. This is the whole of it and it was correct.',
        'A half-smile of the kind exchanged by two people who have decided, separately and at the same moment, not to have a conversation.',
        'You have seen them in the lift. They have seen you in the lift. Neither of you will ever mention the lift.'])]);
  },
  pedGreggs(ped) {
    insp('🥐', ped.name, 'Eleven twenty', [
      'A bag held level with both hands, the way you carry something that is still hot through a wind.',
      pick(['“Don’t.” They are smiling. They keep walking.',
        'They catch you looking at the bag. They shift it fractionally away. Fair enough.',
        '“There’s a queue,” they say, in the tone of somebody reporting from a front line.'])]);
  },
  pedPhone(ped) {
    insp('📱', ped.name, 'On a call', [
      pick(['“…no, no, I’m outside now. I can talk. I’m outside.”',
        '“…so I said, if that’s the process, that’s the process. And he went quiet.”',
        '“…yeah. Yeah. No. Yeah.”']),
      'They half-raise a hand at you: the universal signal for *I am on a call, I have seen you, I am sorry, please do not*.']);
  },
  pedSmokers(ped) {
    insp('🚬', ped.name, 'Not going back in yet', [
      'Nobody out here is smoking. Two people are standing near a bin holding phones, having a conversation that is not being minuted.',
      'You know this manoeuvre. You have performed this manoeuvre. On the fourth floor it is performed at a bin exactly like this one, four storeys up and forty feet to the left.']);
  },
  pedHiVis(ped) {
    insp('🦺', ped.name, 'Between jobs', [
      'High-vis, a lanyard on a retractable reel, and the walk of somebody who has to be somewhere at a particular time and will be.',
      'They give you the nod that one person in a lanyard gives another. It is not much. It is more than the fourth floor manages most mornings.']);
  },
  pedTrolley(ped) {
    insp('🛒', ped.name, 'Retail park', [
      'Pushing a trolley along the pavement, away from the retail park, with the wholly untroubled air of somebody who intends to bring it back.',
      'This is how it starts. This is exactly how every trolley on this map started.']);
  },
  pedDog(ped) {
    insp('🐕', ped.name, 'Corven Way', [
      'A dog of no identifiable make, entirely delighted, towing a woman who has clearly had this argument before and lost it years ago.',
      'The dog looks at you. You are, for four seconds, the most interesting thing that has ever happened on Corven Way.'],
      [{ t: 'Say hello to the dog.', to: null, do() {
          Player.mod({ patience: 6 });
          UI.toast('🐕', 'The dog is thrilled. The woman says “he’s alright, he’s alright”, which is a thing people say about dogs who are, in fact, alright. You go back to work slightly better.');
        } },
       { t: 'You have a shift.', to: null }]);
  },
  pedCommuter(ped) {
    insp('🚶', ped.name, 'Parked on Aldergate', [
      'Walking in from the direction of Aldergate Rise at twenty past, at the pace of somebody who has parked where they always park and knows exactly how long it takes.',
      'Twenty-two spaces, forty staff. This is the other thirty-eight.']);
  },
  pedStopped(ped) {
    insp('🧍', ped.name, 'Stopped', [
      'A man who has stopped outside the bookmakers, for no reason that is visible from here, and shows no sign of starting again.',
      'He is not waiting for anybody. He is not looking at anything. He has simply stopped, in the middle of a Tuesday, on a pavement, and there is something about it that is either very sad or the single wisest thing anybody has done in this postcode today.']);
  },

  /* --- THE CARS ---
     A car is not furniture and does not come through Interact's object path —
     it has its own list, its own `use`, and Interact.go() looks it up here by
     the same name. Which means one of these can offer to be got into and the
     rest can explain, at length, why they will not be. */
  parkedCar(car) {
    insp('🚗', car.name, 'Somebody’s', [
      'A parked car. It is locked, and it is not yours, and both of those are the same sentence.']);
  },
  poolCar(car) {
    insp('🚗', 'The pool car', 'CALLHALL Services plc · vehicle 1 of 1', [
      'A silver estate with a magnetic door sign that slid four inches down the panel at some point in 2021 and has stayed exactly there, so that it now reads CALLHALL SERVIC across the top of the wheel arch.',
      'The key is in the ignition. It has been in the ignition since the year the barrier broke, on the reasoning — never stated, never challenged — that nobody would take it and everybody might need it.',
      'Inside: a milk crate of leaflets for a service that was withdrawn, a road atlas, and a paper cup from a coffee place that left the retail park in 2016.'],
      [{ t: 'Get in.', to: null, do() { Cars.take(car); } },
       { t: 'Leave it. You are on the phones at ten.', to: null }]);
  },
  someHatchback() {
    insp('🚗', 'A hatchback', 'Baby on board', [
      'A hatchback with a BABY ON BOARD sign in the back window and no baby seat in the car.',
      'The sign has been there four years. Somewhere out there is a child old enough to read it.']);
  },
  roofBox() {
    insp('🚙', 'An estate car with a roof box', 'In a car park. In August.', [
      'A roof box. On an estate car. In a car park. In August. Eleven miles from the sea.',
      'It has not been off the roof since the holiday it went on for, because getting it off is a two-person job and the other person has moved to Leeds.']);
  },
  someoneElsesCar(car) {
    insp('🚗', car.name, 'Not yours', [
      pick(['Locked. A lanyard on the passenger seat, face down, which is either modesty or shame.',
        'Locked. A high-vis on the parcel shelf, folded, never worn.',
        'Locked. Three parking tickets in the footwell, none of them opened.',
        'Locked. A phone charger, an ice scraper, and forty-one pence.']),
      'It is somebody’s. Everything in this car park is somebody’s, which is the entire reason there are twenty-two spaces and forty staff.']);
  },
  contractorVan() {
    insp('🚐', 'The contractor’s van', 'Across two spaces since March', [
      'A white van, parked across two bays at an angle that took some doing, belonging to a contractor who is not here and has not been here since March.',
      'On the back door, in the dust, somebody has written CLEAN ME and somebody else has written NO. Both hands are neat. Neither is signed.',
      'Terry has raised it twice. Facilities have logged it as a facilities matter and passed it to Terry.']);
  },
  nigelsCar() {
    insp('🚙', 'A silver estate, half on the pavement', 'N. GRIMSHAW', [
      'Nigel’s. Two wheels up on the footway outside the nail bar, on the double yellows, forty feet from the space with his name painted on it.',
      'He has parked here every working day since somebody keyed the other one, which he has never been able to prove was about the space, and which he brings up in a way that makes it clear he thinks about it daily.',
      'There is a ticket under the wiper. There is always a ticket under the wiper. It is, by any measure anybody has ever run, cheaper than the alternative.']);
  },
  passingCar(car) {
    insp('🚗', car.name, 'Going round again', [
      'A car, going past, on the road, doing what cars do.',
      'It comes round the block again about every minute and a half. You have started to recognise it. This is what happens to people who take their break outside.']);
  },

  /* --- THE STREETS ---
     Everything that is not the car park and not the parade. Aldergate Rise
     down one side, Fenn Street along the bottom, Cargate Lane back up the
     other — which between them are the reason there is a loop to drive round
     rather than a road that stops. */
  carParkDrain() {
    insp('🕳️', 'The drain in the car park', 'Blocked, in a settled sort of way', [
      'A gully in the corner of the car park, entirely blocked with grit, cigarette ends and one bottle top.',
      'The permanent puddle is nine metres away and has never been connected to this in anybody’s mind, out loud, in eleven years.']);
  },
  streetDrain() {
    insp('🕳️', 'A drain', 'Council-maintained', [
      pick(['A road gully with a takeaway lid across half of it, which is the most work anything has done to that lid.',
        'A road gully. Somebody’s keys went down it in 2019 and the story is still told with the wrong ending.',
        'A road gully, freshly jetted, which is the single most competent thing in the postcode.'])]);
  },
  strayTrolley() {
    insp('🛒', 'The trolley', 'Two hundred yards from any shop that owns one', [
      'A supermarket trolley, upright, empty, and nowhere near a supermarket.',
      'Nobody has ever seen one being moved. They are only ever already somewhere new, like herons.'],
      [{ t: 'Push it somewhere more sensible.', to: null, do() {
          P.stats.chaos += .5; Player.mod({ rep: 1 });
          UI.toast('🛒', 'You push it up against the wall, out of the way. By Thursday it will be somewhere else entirely and you will know, and be unable to prove, that it was not you.');
        } },
       { t: 'It has earned its place.', to: null }]);
  },
  cashpoint() {
    insp('🏧', 'The cashpoint', '£1.99 per withdrawal', [
      'The only cash machine on this stretch, on the wall between the Greggs and the shutters. It charges £1.99, which it announces on a screen after you have already put your card in.',
      'The fourth floor uses it anyway, on the eleventh of the month, in a queue, and complains about it in a way that has become a form of small talk.']);
  },
  hoarding() {
    insp('🖍️', 'The hoarding', 'A DEVELOPMENT OF 42 APARTMENTS', [
      'A board across the front of the unit next to the Greggs, showing an artist’s impression of forty-two apartments and a landscaped square with couples walking through it carrying nothing.',
      'The board went up in 2019. The planning notice cable-tied to the lamppost beside it expired in 2020. The unit behind it has not been touched.',
      'Somebody has drawn a very good pigeon on the artist’s impression, standing in the landscaped square, at scale.']);
  },
  bookies() {
    insp('🎰', 'Bellhaven Bookmakers', 'Open till ten', [
      'Carpet, screens, and a man watching a race in Wolverhampton with the sound off and total concentration.',
      'It is the warmest building on this street and the only one with chairs you can sit in without buying anything, which is a fact about the high street and not about gambling.'],
      [{ t: 'Go in.', to: null, do() { Levels.take('bookiesDoor'); } },
       { t: 'Walk on.', to: null }]);
  },
  charityShop() {
    insp('🧦', 'The charity shop', 'Air ambulance', [
      'Books, a shelf of mugs, and a rail of work shirts that have all been worn to the same job.',
      'Marjorie donated fourteen mugs here in 2016 and has bought four of them back since, twice knowingly.'],
      [{ t: 'Go in.', to: null, do() { Levels.take('charityDoor'); } },
       { t: 'Walk on.', to: null }]);
  },
  vapeShop() {
    insp('💨', 'Vapour Trail', 'Was three other things', [
      'A vape shop that was a phone repair shop, which was a nail bar, which was a bakery that everybody still gives directions by.',
      'The signage has been changed four times and the awning has not been changed once, so the awning is still bakery-coloured, which is how the whole street tells you what used to be here.'],
      [{ t: 'Go in.', to: null, do() { Levels.take('vapourDoor'); } },
       { t: 'Walk on.', to: null }]);
  },
  refit() {
    insp('🚧', 'The unit that is always being refitted', 'Opening soon', [
      'Boarded, papered over, with a laminated sheet in the window that says OPENING SOON and has been in that window under three different fonts.',
      'Something is definitely happening in there. There is a skip, and there has always been a skip, and it has never once been full or empty.']);
  },
  toLet() {
    insp('🪧', 'TO LET', 'Enquiries: 01– (rest obscured)', [
      'A commercial letting board, screwed to the brick, with the agent’s number weathered off at the fourth digit.',
      'Underneath it somebody has cable-tied a smaller board advertising the same unit through a different agent, and underneath that a third, which is either competition or a queue.']);
  },
  bottleBank() {
    insp('♻️', 'The bottle bank', 'Emptied fortnightly, filled hourly', [
      'Three banks: brown, green, and one whose label came off years ago and now takes everything.',
      'Around them, in a neat and blameless ring, the bottles that would not fit through the hole.']);
  },
  aldergateWall() {
    insp('🖍️', 'The wall on Aldergate Rise', 'Painted over four times', [
      'The back wall of the parade, painted over so many times that the paint is the only structural element anybody would testify to.',
      pick(['Under the last coat, still legible in the right light: BELLHAVEN 4EVA.',
        'Under the last coat, still legible in the right light: a phone number with the last digit gone.',
        'Under the last coat, still legible in the right light: an extremely accurate drawing of the building you work in.']),
      'Nobody has ever tagged the front of the parade. There are rules, and they are observed.']);
  },
  tyres() {
    insp('🛞', 'Bellhaven Tyre & Exhaust', 'Unit 4', [
      'A roller shutter, up, and past it a bay with more empty floor in it than anywhere else on this street, because the thing that goes in it is not people.',
      'They do the pool car’s MOT. They have done it eleven times. They have never once been paid on time, and they have never once mentioned it, and Terry sends them a card at Christmas.'],
      [{ t: 'Go in.', to: null, do() { Levels.take('tyreDoor'); } },
       { t: 'Walk on.', to: null }]);
  },
  unitSix() {
    insp('🏋️', 'Unit 6', G.flags.knowUnitSix ? 'Currently a club' : 'Currently a gym', [
      'Unit 6 is a gym. Before that it was a soft play, before that a gym, before that a place that sold conservatories, and before that a gym.',
      'The sign is always vinyl and always new. The unit is always the unit.',
      G.flags.knowUnitSix
        ? 'It is not a gym. You have been in and you have read the clipboard and you know exactly what it is, and the vinyl on the front of it is still, magnificently, a lie.'
        : 'The door is on the latch. There is nobody at the front of it, and there is nobody at the back of it, and this is apparently fine.'],
      [{ t: 'Go in.', to: null, do() { Levels.take('sixDoor'); } },
       { t: 'Walk on.', to: null }]);
  },
  /* THE ONE FRONTAGE ON THIS STREET WITH NO DOOR IN IT, on purpose. A hand
     car wash is not a shop: it is a lane, and the entire transaction is
     conducted through a window you never wind all the way down. So this act
     has two halves and which one you get is decided by whether you are sitting
     in something — see the `fromCar` furnishing in data/levels.js and
     Interact.scan, which takes the E key off the door handle when you pull up
     alongside. On foot there is nothing here for you and the lads know it. */
  carWash() {
    if (!Cars.driving) {
      return insp('🧼', 'The hand car wash', 'On foot', [
        'Six lads, four jet washes, one length of Astroturf, and a laminated price list with three tiers that nobody has ever been offered a choice between.',
        'You have arrived at a car wash without a car. Two of them look up. One of them looks at the space beside you where a car would be. Nobody says anything, because there is nothing to say, and the sponge does not stop moving for a second.',
        'The pool car has been through here twice. Both times it came out cleaner than anything else in the car park and was, within a fortnight, indistinguishable.']);
    }
    if (G.flags.washedToday) {
      return insp('🧼', 'The hand car wash', 'Already done', [
        'The same lad walks out, sees the same car, and performs a small physical gesture that means “you have literally just had this done” without using any part of his face.',
        'You raise a hand. He raises a sponge. The negotiation is complete and neither of you has spoken.']);
    }
    insp('🧼', 'The hand car wash', '£6 · £9 · £12', [
      'You pull onto the Astroturf and a lad is at your window before the handbrake is fully on, which is a level of service the company you work for has spent four years and eleven thousand pounds failing to reproduce.',
      '“Six, nine or twelve?” The price list is on a board behind him with three tiers on it. Nobody has ever been told what the difference is. Everybody says nine.'],
      [{ t: '“Nine.” (Everybody says nine.)', to: null, if: () => P.money >= 9, do() {
          G.flags.washedToday = true;
          G.minutes += 14; Player.mod({ money: -9, patience: 8 });
          Ach.get('a_carwash');
          UI.toast('🧼', 'Fourteen minutes with the engine off, four men working round a car you do not own, and a small towel moment at the end that you did not know you needed. Nine pounds.', 'gold');
        } },
       { t: '“Six.”', to: null, if: () => P.money >= 6, do() {
          G.flags.washedToday = true;
          G.minutes += 9; Player.mod({ money: -6, patience: 5 });
          Ach.get('a_carwash');
          UI.toast('🧼', 'Six. It is identical to the nine. It has always been identical to the nine. Somewhere behind you a man is being charged nine.');
        } },
       { t: '“Twelve,” you say, wildly.', to: null, if: () => P.money >= 12, do() {
          G.flags.washedToday = true;
          G.minutes += 20; Player.mod({ money: -12, patience: 12, energy: -2 });
          Ach.get('a_carwash');
          UI.toast('🧼', 'They do the sills. Nobody does the sills. Two of them stop and look at what the other two are doing to the sills. This is the best the pool car has looked since 2019 and it is on your card.', 'gold');
        } },
       { t: 'Wind the window back up and drive off.', to: null, do() {
          UI.toast('🧼', 'You drive off a car wash forecourt without buying a car wash, which is a thing you can do, and which nobody stops you doing, and which you will think about at half past nine tonight.');
        } }]);
  },
  sandwichVan() {
    insp('🥪', 'The sandwich van’s pitch', 'Half eleven to one', [
      'A painted rectangle on the tarmac and a sign asking that it be kept clear between half eleven and one.',
      'The van is not here now. When it is here, the queue is eleven people long and contains, on any given day, at least four of your colleagues who told you they had brought something in.']);
  },
  yardFence() {
    insp('🚧', 'The fence round the yard', 'Herras, hired, permanent', [
      'Temporary fencing panels round a yard, wired together, standing in concrete feet, with a hire company’s name on a plate that has faded to a shape.',
      'The hire has been running since before anybody currently on the fourth floor was hired. Somewhere there is a direct debit that is older than your job.']);
  },
  gulls() {
    insp('🐦', 'Gulls', 'Eleven miles from the sea', [
      'Four gulls on the flat roof of the units, watching Fenn Street with the flat professional interest of a supervisor.',
      'They are here because the Greggs is here. Everything on this street is here because the Greggs is here.']);
  },
  greggsBins() {
    insp('🗑️', 'The bins behind the Greggs', 'Emptied at six', [
      'The back of the parade: three bins, a fire door propped with a milk crate, and a smell of sausage roll that has soaked into the brick and become part of the building.',
      'This is the loading side, the smoking side, the crying side and the phone-call side of every shop on this street, all at once, which is what a back lane is.']);
  },
  flatBoxes() {
    insp('📦', 'Flattened boxes', 'Awaiting collection', [
      'Cardboard, flattened and stacked against the wall with real care, weighted down with a brick.',
      'Somebody in one of these shops does this properly every single evening and nobody has ever thanked them for it. You are, at this moment, the only person who has ever stood here and noticed.']);
  },

  /* --- THE HIGH STREET, EAST END --- */
  thePub() {
    insp('🍺', 'The Bellhaven Arms', 'Open 12–11, quiz Tuesdays', [
      'Etched glass, a carpet that has seen things, and a chalkboard outside offering a pie and a pint for the price of a pie and a pint in 2014.',
      'Nobody from the fourth floor drinks here at lunchtime, which everybody has agreed on without it ever having been discussed, and which is broken about twice a year, spectacularly.'],
      /* The twenty-five minutes have moved to the bar. Going in is a door
         now; what it costs is decided in there, by you, at the pumps. */
      [{ t: 'Go in.', to: null, do() { Levels.take('pubDoor'); } },
       { t: 'It is twenty past ten.', to: null }]);
  },
  pubSign() {
    insp('🪧', 'The pub sign', 'Repainted 2003', [
      'A hanging sign showing a coat of arms nobody in Bellhaven has ever been entitled to, with a motto underneath in a Latin that is not Latin.',
      'It swings. It is the only thing on this street that makes a noise nobody minds.']);
  },
  launderette() {
    insp('🧺', 'The launderette', 'Service washes · 8 till 7', [
      'Eight machines, four dryers, a bench, and a woman who has run it for nineteen years and knows more about this street than the council does.',
      'Terry brings the tea towels from the fourth floor here twice a year. He has never claimed it back and has never mentioned it, and this is the entirety of the building’s cleaning contract.'],
      [{ t: 'Go in.', to: null, do() { Levels.take('laundDoor'); } },
       { t: 'Walk on.', to: null }]);
  },
  postOffice() {
    insp('📮', 'The post office', 'Counter closes 1–2', [
      'A counter at the back of a shop that also sells greetings cards, stationery and, for reasons lost to everyone, kites.',
      'The queue is four people long at any hour of any day. It is the same four people in the sense that it is always four people; it is never the same four people.'],
      [{ t: 'Go in.', to: null, do() { Levels.take('postoffDoor'); } },
       { t: 'Another time.', to: null }]);
  },
  /* The one shopfront on this street whose door depends on the clock, and it
     depends on it because that was always the joke: a building that has never
     once been open at nine in the morning. It opens at four, when the spit
     goes on. Sky.m() is minutes past midnight. */
  kebab() {
    if (Sky.m() < 960) {
      return insp('🌯', 'Bellhaven Kebab', 'Opens at four', [
        'Shut. It is the middle of a working day and this is a building that has never once been open in the middle of a working day, or at nine in the morning, or at any hour that appears on a timesheet.',
        'Through the glass: the spit, cold and still, and the chairs up on the shelf. Come back when it is dark.',
        'The Christmas party ended here in 2019, 2021 and 2022. There is a photograph on the fourth floor of Nigel in this doorway that has never been explained and never will be.']);
    }
    insp('🌯', 'Bellhaven Kebab', 'Open till 3am, obviously', [
      'Open. The spit is turning, the bottom corner of the window has fogged, and the light coming out of this doorway is doing more for this end of the High Street than the streetlights are.',
      'The Christmas party ended here in 2019, 2021 and 2022. There is a photograph on the fourth floor of Nigel in this doorway that has never been explained and never will be — and there is, it turns out, a second copy of it, and it is not on the fourth floor.'],
      [{ t: 'Go in.', to: null, do() { Levels.take('kebabDoor'); } },
       { t: 'Not tonight.', to: null }]);
  },
  phoneBox() {
    insp('📞', 'The phone box', 'Adopted', [
      'A red phone box with no phone in it. On the door, a laminated notice: THIS BOX HAS BEEN ADOPTED BY THE COMMUNITY.',
      'Inside is a defibrillator and a shelf of paperbacks. It is the single most useful object in this postcode and it used to be a telephone.']);
  },
  bench3() {
    insp('🪑', 'The third bench', 'No plaque', [
      'A third bench, this one with the screw holes where a plaque used to be and no plaque.',
      'Nobody knows whose it was. Somebody took it, or somebody took it back.']);
  },

  /* --- FENN STREET, EAST --- */
  /* THE ONE DOOR OUT HERE WITH A CONDITION ON IT, and the condition is not a
     clock, an item or a quest — it is a name. Any name. The doorman is not
     checking, has never checked, and could not check; what he needs is for
     somebody to have said one, out loud, to him, in the doorway, because that
     is what a signing-in book is FOR and it never was about the names. The
     punch line is the book itself and it is inside — see Acts.clubBook. */
  club() {
    const inside = [{ t: 'Go in.', to: null, do() { Levels.take('clubDoor'); } },
                    { t: 'Another time.', to: null }];
    if (G.flags.clubSignedIn) {
      return insp('🎱', 'The Working Men’s Club', 'Signed in', [
        'Two snooker tables, a function room, and a committee that has been the same six people since before the building you work in was built.',
        'He is in the booth. He does not ask you again. He is never going to ask you again, because he has written you down once, and to this room that is now simply a fact about the world.'], inside);
    }
    const signed = who => ({
      text: ['“' + who + ',” he says, and writes it in the book, without looking at the book, or at you, or at the pen.',
        'He does not check. There is no list to check against. He has been doing this for nineteen years and what he is actually verifying — the only thing anybody in this doorway has ever verified — is that you were prepared to say a name to a man in a booth.',
        'The hatch stays where it is. He nods at the inner door. You are in.'],
      choices: [{ t: 'Go in.', to: null, do() {
          if (!G.flags.clubSignedIn) { G.flags.clubSignedIn = true; Ach.get('a_signedin'); }
          Levels.take('clubDoor');
        } }],
      done() { if (!G.flags.clubSignedIn) { G.flags.clubSignedIn = true; Ach.get('a_signedin'); } },
    });
    insp('🎱', 'The Working Men’s Club', 'Members and signed-in guests', [
      'Two snooker tables, a function room, and a committee that has been the same six people since before the building you work in was built.',
      'It is where the leaving dos happen, because it is the only room in Bellhaven that holds forty people and does not charge for it.',
      'The door is on the latch. Behind a hatch in a booth the size of a wardrobe, a man lowers a folded newspaper and asks, with no hostility whatsoever and no particular interest either: “Who’s signing you in?”'],
      [{ t: '“Terry.”', to: signed('Terry') },
       { t: '“Marjorie.”', to: signed('Marjorie') },
       { t: '“…Nigel?”', to: signed('Nigel') },
       { t: 'Admit that nobody is.', to: {
          text: ['“Right,” he says.',
            'That is the entirety of it. No rule is quoted, no offence is taken, nothing is explained and nothing is refused, because refusing would require a decision and no decision has been made. He goes back to the newspaper.',
            'You are not barred. You are not anything. You are a person standing in a doorway who has not said a name, and the door will keep being on the latch for exactly as long as that remains true.'] } }]);
  },
  tanning() {
    insp('🌞', 'Sunseekers', 'Sunbeds · nails · spray', [
      'A shopfront in a colour not otherwise found in this town, offering three services of which the second is also available forty feet away on the High Street.',
      'The two proprietors are civil about this in the way that two people are civil about something for eleven years.',
      'You cannot see in. There is no window into a tanning shop, anywhere, ever, and until this second you had never once noticed that.'],
      [{ t: 'Go in.', to: null, do() { Levels.take('tanDoor'); } },
       { t: 'Walk on.', to: null }]);
  },
  cashAndCarry() {
    insp('📦', 'The cash and carry', 'Trade only', [
      'TRADE ONLY, on the door, under a sign advertising catering-size everything to a street with four caterers on it.',
      'The biscuits for the fourth floor come from here. Nobody has a trade card. Terry has a trade card.']);
  },

  /* --- MARLOW STREET --- */
  multiStorey() {
    insp('🅿️', 'The multi-storey', 'Closed', [
      'Four floors of car park with a chain across the ramp and a notice about structural survey works that is dated and is not recent.',
      'It has been closed for two years. Every single parking problem in this town, including the twenty-two spaces, is downstream of this chain.']);
  },
  marlowWall() {
    insp('🖍️', 'The wall on Marlow Street', 'Unpainted', [
      'The only wall in Bellhaven nobody has bothered to paint over, which has made it the one everybody writes on.',
      pick(['Halfway up, in silver, beautifully done and completely illegible.',
        'At head height: a phone number, a name, and an opinion about the name.',
        'In small biro at the bottom, out of everybody’s way: “i was here at 4am and it was alright”.'])]);
  },
  marlowBins() {
    insp('♻️', 'The bins on Marlow Street', 'Trade waste', [
      'Six trade bins in a row, each with a different company’s lock on it, and one with the lid tied down with rope.',
      'A fox has worked out which of the six is the kebab shop’s. The fox is not here now. The fox has been here.']);
  },

  /* --- CORVEN WAY --- */
  superstore() {
    insp('🛒', 'The superstore', 'Open 7 till 10', [
      'The reason the retail park exists and the reason Corven Way has traffic on it at all.',
      'Everybody on the fourth floor shops here and everybody on the fourth floor describes it as “the big one”, which is how you can tell who is local: local people call it by the name of the shop that was here before it.'],
      [{ t: 'Do a shop. (18 min.)', to: null, do() {
          G.minutes += 18; Player.mod({ energy: 3, money: -12.40 });
          UI.toast('🛒', 'Eighteen minutes and £12.40, of which £9 was things you did not come in for. This is the correct outcome and everybody achieves it.');
        } },
       { t: 'Not on work time.', to: null }]);
  },
  screwfix() {
    insp('🔩', 'Screw & Fix', 'Trade counter', [
      'A shop with nothing in it: a counter, a catalogue, and a warehouse behind a door that men in vans speak to through a screen.',
      'Facilities order everything for the building from here. The ergonomic chairs did not come from here. Nothing that has ever been announced in a wellbeing email came from here, and everything that has ever actually been fixed did.']);
  },
  petStore() {
    insp('🐕', 'The pet superstore', 'Dogs welcome', [
      'An enormous shed containing an aisle of dog food longer than the fourth floor’s main office.',
      'Bev’s dog has been here. Bev’s dog is, by common consent, the best thing anybody on the fourth floor has ever brought into a conversation.']);
  },
  retailSign() {
    insp('🪧', 'BELLHAVEN RETAIL PARK', 'Units 1–6 · 3 hours free', [
      'A totem sign listing six units of which four are let, one is the superstore and one has been THIS UNIT AVAILABLE since it was built.',
      'THREE HOURS FREE PARKING, in letters twice the size of anything else, which is the actual product this entire development sells.']);
  },
  carpets() {
    insp('🧶', 'The carpet warehouse', 'CLOSING DOWN', [
      'CLOSING DOWN SALE, in the window, in the same vinyl letters, faded to a different colour from the rest of the window.',
      'It has been closing down since 2017. Somewhere in there is a business model and nobody has ever worked out what it is.']);
  },
  driveThru(o) {
    if (!Cars.driving) {
      return insp('☕', 'The drive-thru', 'Vehicles only', [
        'A window, a speaker post, and a painted lane running past both of them.',
        'A laminated sign on the window says NO PEDESTRIAN SERVICE AT THIS WINDOW, and under it, in biro, on a Post-it: “sorry — insurance”.',
        'The person inside gives you a look that contains no malice at all and absolutely no coffee.']);
    }
    if (G.flags.driveThruToday) {
      return insp('☕', 'The drive-thru', 'You have been already', [
        'The same person. The same window. A flicker of recognition that neither of you acknowledges.',
        'You could go round again. You are not going to go round again.']);
    }
    insp('☕', 'The drive-thru', 'Two cars ahead of you', [
      'You pull up level with the window. The speaker post is nine feet behind you and you have already gone past it, which is what everybody does and what the lane is shaped to make everybody do.',
      'It comes out of the window in a cardboard tray with a lid that is not on properly.'],
      [{ t: 'Order it. (£3.10)', to: null, do() {
          if (P.money < 3.10) { Sfx.deny(); UI.toast('☕', 'You are 30p short. You drive on, and everybody in the queue behind you watches you do it.'); return; }
          G.flags.driveThruToday = true;
          G.minutes += 6; Player.mod({ money: -3.10, energy: 8, patience: 6 });
          count('coffee'); Ach.get('a_drivethru');
          UI.toast('☕', 'Six minutes and £3.10. It is better than the fourth floor’s and you will never say so out loud.');
        } },
       { t: 'Drive on. You have a coffee machine.', to: null, do() {
          UI.toast('☕', 'You drive on. You do have a coffee machine. That is not the same thing and you know it is not the same thing.');
        } }]);
  },
  railway() {
    insp('🚃', 'The railway', 'Behind the fence', [
      'Palisade fencing, a bank of buddleia, and two tracks. Every eleven minutes something goes through at a speed that suggests it has considered Bellhaven and decided against.',
      'The last train that stopped here stopped in 1967. The platform is still there under the brambles and the sign is still on it, and everybody in this town can tell you that and nobody can tell you why they know it.']);
  },
  subway() {
    insp('🕳️', 'The subway', 'Pedestrian underpass', [
      'A tiled underpass beneath the railway, lit, dry, and swept — which is not what anybody expects and is why everybody mentions it.',
      'There is a mural in there of the town as it was, painted by a school in 1998. Two of the children in the mural work in your building.']);
  },
  corvenWall() {
    insp('🖍️', 'The wall on Corven Way', 'Retaining', [
      'The railway’s retaining wall, blue engineering brick, forty feet of it, and it will outlast every building on this map.',
      'Somebody has painted BELLHAVEN across it in three-foot letters, correctly spelled, evenly spaced, and level. It took planning. Nobody has ever removed it and nobody is going to.']);
  },

  /* --- THE RETAIL PARK --- */
  trolleyBay() {
    insp('🛒', 'The trolley bay', 'Please return your trolley', [
      'A steel corral with a sign asking that trolleys be returned to it, and eleven trolleys in it, which is a hit rate this town should be prouder of than it is.']);
  },
  recycling() {
    insp('♻️', 'The recycling point', 'Glass · cans · textiles', [
      'Four banks and a clothing bin, on a square of tarmac that is swept about as often as it is filled, which is not the same interval.',
      'The textile bank has a hand-written sign asking for no more duvets. There are three duvets beside it.']);
  },
  retailRules() {
    insp('🪧', 'The retail park sign', '3 hours max · ANPR in operation', [
      'THREE HOURS MAXIMUM STAY. ANPR IN OPERATION. PARKING CHARGE NOTICES ISSUED.',
      'Under it, smaller: THIS CAR PARK IS PRIVATE LAND. Under that, in a different font entirely, as though added later by somebody who had lost an argument: CUSTOMERS ONLY.'],
      [{ t: 'Note the three hours.', to: null, do() {
          UI.toast('🅿️', 'Three hours. You are on a shift. You will be back upstairs in twenty minutes and you will still think about this at half four.');
        } },
       { t: 'It is a car park.', to: null }]);
  },
  waitingVan() {
    insp('🚐', 'A van, waiting', 'Engine off, been here a while', [
      'A van in the aisle rather than in a bay, facing the way out, with a man in it eating a sandwich and looking at nothing.',
      'This is the middle of his day and he is entitled to it, and the fact that you can tell that from thirty feet away is the only genuinely restful thing on this entire map.']);
  },
  learner() {
    insp('🚗', 'A driving school car', 'Please allow', [
      'Roof sign, dual controls, and two people in it having the calmest and most stressful conversation available to humans.',
      'It is doing thirty-eight in a forty, which is entirely within its rights, and there are four cars behind it, which is entirely predictable.']);
  },
  theBus() {
    insp('🚌', 'The 41A', 'Does not stop here', [
      'The 41A, going past the bus stop at the speed of something that has no intention of stopping at it, because the 41A does not stop here.',
      'This is written down nowhere at the stop. It is written down here, on this bus, on the front of it, on a screen, going past at twenty-eight miles an hour.']);
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
