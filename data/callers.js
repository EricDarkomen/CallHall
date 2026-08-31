'use strict';
/* CALLHALL — the callers, and the turn-based argument you have with them.
 *
 * Each turn a caller has a NEED and gives a TELL. MOVES are the replies; a move
 * that answers the need lands properly and builds rapport. BOSSES are the
 * multi-phase ones.
 */

/* ---------------- Callers ---------------- */
const CALLERS = [
  { id: 'normal', name: 'Ordinary Member of the Public', face: '🧑', w: 22, frus: 45, agg: 6, pat: 100,
    issues: ['a bill that is £4 more than expected', 'a password that has stopped working', 'an appointment nobody wrote down', 'a direct debit with opinions'],
    open: ["Hiya. Sorry to bother you. Bit of a boring one, this."],
    mid: ["Right. Yeah, that makes sense.", "No, no, you’re fine, take your time.", "Sorry, is it me being thick?"],
    hot: ["I don’t want to be difficult, but this is the third time.", "I just want it to work, really."],
    win: ["Oh, brilliant. Thanks ever so much. You’ve been really good, actually."] },
  { id: 'angry', name: 'Absolutely Livid Caller', face: '😡', w: 18, frus: 85, agg: 14, pat: 70,
    issues: ['THREE DAYS of waiting', 'a promise made by “a lad called Ryan”', 'being cut off twice', 'a charge from 2019'],
    open: ["I’ve been waiting THREE DAYS for this!", "Right. RIGHT. Before you say anything —"],
    mid: ["Don’t you dare put me on hold.", "I want to speak to somebody who can actually DO something.", "Is this being recorded? Good. GOOD."],
    hot: ["This is an absolute joke.", "I want your name. And your manager’s name. And the company’s name.", "I know my rights."],
    win: ["...Right. Well. That’s sorted then. ...Sorry for shouting. Been a week."] },
  { id: 'confused', name: 'Deeply Confused Caller', face: '🫠', w: 16, frus: 40, agg: 4, pat: 120,
    issues: ['a product we may not sell', 'a device described only as “the box”', 'a letter that may be from a different company', 'the internet, generally'],
    open: ["Hello? Hello. Is that the... the people?"],
    mid: ["It’s the one with the light on it. The light’s off now.", "My son set it up. My son lives in Perth.", "What’s a router?"],
    hot: ["I don’t understand what you’re asking me.", "Can you speak to my son? He’s in Perth."],
    win: ["Oh, that’s it! That’s the one! You’re very patient, aren’t you."] },
  { id: 'tech', name: 'Caller Who Knows More Than You', face: '🤓', w: 12, frus: 55, agg: 8, pat: 90,
    issues: ['packet loss on your side, not theirs', 'a firmware bug you have never heard of', 'an outage your system says is not happening', 'DNS. It is always DNS.'],
    open: ["Before we start — I’ve already power-cycled, swapped cables, and run a traceroute. So let’s skip that bit."],
    mid: ["That’s not what your status page says.", "I’ve got a packet capture. Would you like the timestamps?", "Please don’t read me the script."],
    hot: ["You’re reading the script.", "I can hear you reading the script."],
    win: ["Right, good. You escalated it properly. That’s all I wanted. Cheers."] },
  { id: 'elderly', name: 'Very Nice Elderly Caller', face: '👵', w: 12, frus: 30, agg: 2, pat: 150,
    issues: ['a bill she has already paid twice, to be safe', 'a leaflet that arrived and worried her', 'her late husband’s account', 'wanting to check someone real still works there'],
    open: ["Hello love. I hope I’m not being a nuisance."],
    mid: ["You sound busy. I can ring back.", "Are you having your dinner? You should have your dinner.", "My husband used to deal with all this."],
    hot: ["I do feel silly ringing.", "I don’t want to be any trouble."],
    win: ["You’ve been ever so kind. I’ll let you get on. Take care of yourself, love."] },
  { id: 'corporate', name: 'Passive-Aggressive Business Caller', face: '🕴️', w: 12, frus: 65, agg: 10, pat: 95,
    issues: ['an SLA breach they have documented', 'a “quick question” with eleven parts', 'a meeting they would like you to attend', 'an invoice, and a tone'],
    open: ["Hi — hoping you can help. Just following up on my follow-up."],
    mid: ["I’ll be honest with you, and I say this respectfully —", "I’ve copied in your manager. Not as a threat. Just for visibility.", "Per my previous email."],
    hot: ["I’d hate for this to become a formal complaint.", "Happy to escalate if that’s easier for you?"],
    win: ["Great. I’ll consider that closed. I’ll confirm in writing. Obviously."] },
  { id: 'mystery', name: 'Unknown Caller', face: '📟', w: 4, frus: 50, agg: 5, pat: 200, mystery: true,
    issues: ['a call reference of 000001', 'hold music, from their end', 'nothing they are willing to state'],
    open: ["...", "(hold music, faintly, from their end)", "Is that CALLHALL?"],
    mid: ["I was told someone would be with me shortly.", "What year is it, at your end?", "I only put the kettle on."],
    hot: ["Please don’t transfer me.", "PLEASE don’t transfer me."],
    win: ["...Thank you. Nobody’s picked up before."] },
  /* ---------------- the expansion ---------------- */
  { id: 'car', name: 'Caller On Speakerphone In A Car', face: '🚗', w: 13, frus: 60, agg: 9, pat: 85,
    issues: ['something they cannot check because they are driving', 'a reference number written on a receipt in the boot', 'a fault they will describe entirely in terms of roundabouts', 'an account in their wife’s name and their wife is asleep'],
    open: ["HIYA — sorry — you’re on speaker, I’m driving — CAN YOU HEAR ME?", "Sorry mate, one sec — SECOND EXIT — right, go on."],
    mid: ["Sorry, say again? Bit of a lorry.", "Can you hold on, I’m coming up to a — YOU’RE ALRIGHT MATE — sorry, go on.",
      "I haven’t got the reference on me, it’s at home, on the side.", "SORRY — that was the kids."],
    hot: ["I’m going into a tunnel.", "You’re breaking up. YOU’RE BREAKING UP.", "Right I’m going to have to pull over. Hang on. HANG ON."],
    win: ["Brilliant, that’s sorted, cheers pal — YOU GO, MATE, GO ON — cheers, bye, bye, bye, bye."] },
  { id: 'silent', name: 'Caller Who Says Nothing', face: '🤫', w: 6, frus: 40, agg: 3, pat: 220,
    issues: ['nothing, so far', 'breathing, mainly', 'a television, in another room', 'something they cannot get to the start of'],
    open: ["...", "(a television, somewhere behind them)", "...hello?"],
    mid: ["...", "(they take a breath as though about to start, and do not start)", "...sorry.", "...it’s a bit difficult, this."],
    hot: ["...sorry. Sorry.", "...", "I’ll ring back."],
    win: ["...thanks. Sorry. I don’t ring people usually. Thanks for waiting for me."] },
  { id: 'regular', name: 'Barry (rings most days)', face: '🧓', w: 9, frus: 35, agg: 4, pat: 200,
    issues: ['nothing in particular', 'the same thing as Tuesday', 'a question he already knows the answer to', 'the weather, primarily'],
    open: ["Hello! Is that — no, you’re new. Where’s the girl with the voice? Never mind. Barry.", "It’s Barry! You won’t know me. Everyone else does."],
    mid: ["Now while I’ve got you —", "Did you get the rain up there? We had it here Tuesday.", "I’ll not keep you. I know you’re busy. Are you busy?",
      "The last one told me to ring back if it happened again. It hasn’t. I thought I’d ring anyway."],
    hot: ["I know I ring a lot.", "It’s just — there’s nobody in the house, see.", "I’ll go. I’ll let you get on. I will go."],
    win: ["Right. Lovely. Same time Thursday then. ...I’m joking. ...Am I?"] },
  { id: 'cancel', name: 'Caller Who Wants To Cancel', face: '✂️', w: 12, frus: 70, agg: 11, pat: 75,
    issues: ['cancelling, and nothing else', 'a better offer from your competitor, in writing', 'thirty days’ notice they have already given twice', 'the retention team, whom they refuse to be passed to'],
    open: ["I want to cancel. That’s it. That’s the whole call.", "Before you start: I am not interested in an offer. I want to cancel."],
    mid: ["No.", "That’s a very good deal and I want to cancel.", "I’ve heard the offer. I’ve heard the improved offer. Cancel it.",
      "Every month you don’t cancel it, you take the money, and every month I ring."],
    hot: ["Do NOT transfer me to retentions.", "This is the fourth time I have said the word cancel.", "I will do a chargeback. I have done one before. I know the form."],
    win: ["Right. Cancelled. Confirmation email. ...Thank you. You’re the first one who just did it."] },
  { id: 'insider', name: 'Caller Who Is Actually A Colleague', face: '🙃', w: 7, frus: 45, agg: 7, pat: 110,
    issues: ['an internal transfer that has looped twice', 'a question only your own department can answer', 'the fact that they are on the fourth floor, forty feet away'],
    open: ["Hiya — it’s Karen. From upstairs. I’ve come through the main queue because the internal line does that thing.",
      "Sorry — is that the phones team? It’s Priya. I’m two rows away. I waited eleven minutes."],
    mid: ["I can see you. I can see you from here. I’m waving.", "Just do the thing you’d do for a normal person, it’s fine.",
      "I know. I KNOW. But the process is the process.", "This is faster than walking over, apparently."],
    hot: ["Do not transfer me to myself again.", "I have now been in this queue longer than the actual meeting was."],
    win: ["Cheers. See you in the kitchen. This never happened."] },
  { id: 'social', name: 'Caller Who Has Already Posted About You', face: '📱', w: 9, frus: 80, agg: 13, pat: 80,
    issues: ['a post with 400 shares', 'a screenshot of a previous conversation', 'the tagged account, which is not your account', 'a thread. There is a thread.'],
    open: ["Hi. Just so you know before we start, this is going on my page either way.", "I’ve already posted about this. Four hundred shares. Just so we’re aware."],
    mid: ["I’m going to read out what people are saying.", "Someone in the comments says I should go to the ombudsman.",
      "I’m typing this as we speak.", "Your social team replied within four minutes. FOUR. And I’ve been on hold for thirty."],
    hot: ["This is going to be an update.", "People are watching this now. I mean actually watching it.", "Say that again — slowly — I want to get it right."],
    win: ["...Right. Well. I’ll post that you sorted it. ...It won’t do the numbers the other one did, mind."] },
  { id: 'small', name: 'Small Business Owner, 6am–9pm', face: '🧑‍🌾', w: 10, frus: 75, agg: 10, pat: 90,
    issues: ['a card machine that has been down for two days', 'a line that is also the shop’s line', 'an outage during their only busy hours', 'money, actual money, today'],
    open: ["Right. I’ve got the shop open, I’ve got a queue at the till, and your machine’s down. Go.",
      "I’m going to be quick because I’m on my own here. Two days. Card machine. Nothing."],
    mid: ["Every hour of this is about eighty quid.", "I can’t hold, I’ve got customers — no, sorry, you’re alright, go on.",
      "I’ve run this place eleven years. I have never once been late paying you.", "Don’t tell me it’s been escalated. Tell me when."],
    hot: ["I will lose the shop. Do you understand that? Not dramatically. Actually.", "Give me a time. Any time. A wrong time is better than no time."],
    win: ["Four o’clock tomorrow. Right. That I can work with. ...Sorry for the tone. It’s been a fortnight."] },
  { id: 'test', name: 'Mystery Shopper (unidentified)', face: '🕵️', w: 5, frus: 55, agg: 6, pat: 130,
    issues: ['a scenario that does not quite exist', 'an account that checks out but should not', 'a question phrased exactly like a training slide'],
    open: ["Good morning. I have a query regarding my account. Could you take me through your standard process, please.",
      "Hello. Before we begin — could you confirm you’ve branded the call?"],
    mid: ["And what would you normally do at this point?", "Mm. And is that what the policy says, or what you do?",
      "Interesting. Could you say that again for me.", "No, no — carry on exactly as you would with anyone."],
    hot: ["I’m noting that.", "And you’re confident that’s correct?", "That’s a departure from process. Is it a helpful one?"],
    win: ["Thank you. That was — genuinely, that was very good. I’ll be honest with you: I’m not a customer. Full marks. Don’t tell the others."] },
  { id: 'grief', name: 'Caller Closing Someone’s Account', face: '🕊️', w: 6, frus: 50, agg: 2, pat: 240,
    issues: ['an account in a name they have to keep saying out loud', 'a bill addressed to someone who died in March', 'a direct debit that will not stop', 'paperwork nobody warned them about'],
    open: ["Hello. I need to close an account. It’s — sorry. It’s my mum’s.",
      "Hi. I’ve got a letter here addressed to my husband. He died in March. Could you stop them, please."],
    mid: ["Sorry. Give me a second.", "I’ve got the certificate here. I’ve got about nine copies. Nobody tells you you need nine.",
      "You’re the fourth person I’ve had to say it to today.", "No, it’s alright. You’re only doing your job."],
    hot: ["Please don’t make me say it again.", "I just want it to stop coming through the door."],
    win: ["Thank you. That’s — you’ve been very kind. Nobody else asked what she was like. Thank you for asking."] }
];


/* ---- What the caller actually wants ----
   Each turn the caller has a NEED and gives a TELL, announced a turn ahead as
   something they do rather than as a number. A move that serves the need lands
   properly and builds rapport; one that serves a different need lands short.
   Moves with no `serves` are neutral — hold, mute and the transfers are about
   you, not them. */
const NEEDS = {
  heard:   { e: '👂', n: 'to be heard' },
  answer:  { e: '🧾', n: 'a straight answer' },
  speed:   { e: '⏱️', n: 'this to be over with' },
  respect: { e: '🎩', n: 'to be taken seriously' }
};
const TELLS = {
  heard: [
    'They keep going back to the beginning of the story.',
    'They have said “anyway” twice now, and carried on both times.',
    '“It’s not even about the money, really.”',
    'A long breath. They came in ready for a fight and have not had one.',
    'They mention, in passing, that they have not spoken to anybody today.'
  ],
  answer: [
    'They read the reference number out again. They have it written down.',
    '“Just tell me yes or no. I don’t mind which.”',
    'They are reading something back to you, off a letter, slowly.',
    'They ask twice what the actual figure is.',
    '“I’ve been given three different answers and they can’t all be right.”'
  ],
  speed: [
    'A child is shouting something in another room and being ignored.',
    '“I’m due back in in four minutes.”',
    'You can hear an indicator ticking. They are parked somewhere they should not be.',
    'They keep saying “so what happens now”.',
    'Typing. They are doing something else and would like to keep doing it.'
  ],
  respect: [
    'They give you their full title, unprompted.',
    '“I’ve already explained all this to two other people.”',
    'They ask for your name, and you hear a pen.',
    'They mention, lightly, that they used to work in this industry.',
    '“I’d like it noted that I rang about this in March.”'
  ]
};

const MOVES = [
  /* The reward for having read them properly. Not a damage move — a way to
     finish, available only once there is enough between you to finish on.
     Alan's "good call": the outcome was always going to be a partial refund
     and an apology, and it is still a good call. */
  { id: 'land', e: '🤝', n: 'Land it.', d: 'Say what you will do, when, and mean it. Ends the call well.',
    show: E => (E.rap || 0) >= 70, cost: {},
    run(E) {
      E.landed = true;
      return { dmg: 999, win: true, txt: pick([
        'You say the thing you are actually going to do, and the day you are going to do it, and you say their name once, at the end, and you do not oversell it. There is a pause. “Right,” they say. “Right. Thanks, that’s — yeah. Thanks.”',
        'No script. You summarise it back to them in their own words, tell them the one bit you cannot fix and why, and give them a time for the rest. They accept it immediately, because it is the first thing all day that has sounded like a person.',
        'You get to the end of the sentence and they have already relaxed. “See, that’s all I wanted.” It is all anybody wanted. It took four minutes and it will not show up in a single one of Sandra’s columns.']) };
    } },
  { id: 'empath', e: '🧘', n: 'I completely understand.', d: 'Empathy. Costs a little of you.', serves: ['heard'], cost: { pat: 3 },
    run(E) {
      const p = 8 + P.eff.empathy * 2.4 + Sk.rank('empathy') * 3;
      const bonus = (E.caller === 'elderly' || E.caller === 'confused') ? 1.5 : E.caller === 'tech' ? 0.6 : 1;
      E.agg = Math.max(1, E.agg - 1.5);
      return { dmg: p * bonus, txt: 'You let them finish. All of it. Then: “Right. That sounds genuinely rubbish. Let’s sort it.”', stat: 'empathy' };
    } },
  { id: 'check', e: '🧐', n: 'Let me check that for you.', d: 'Buy time. Look at the account. Actually read the notes.', serves: ['answer'], cost: { pat: 1, ene: 3 },
    run(E) {
      if (G.flags.itDown && chance(.5)) return { dmg: -4, txt: 'The system is “degraded”. It shows you an account belonging to a Mr Fothergill, deceased 2016.' };
      return { dmg: 7 + P.eff.knowledge * 2.2, txt: 'You read the notes. Nobody has read the notes since March. The answer was in the notes.', stat: 'knowledge' };
    } },
  { id: 'offon', e: '😬', n: 'Have you tried turning it off and on again?', d: 'The oldest prayer.', serves: ['answer'], cost: { pat: 2 },
    run(E) {
      if (E.caller === 'tech') return { dmg: -10, txt: 'A silence with texture. “I said. In my first sentence. That I had done that.”' };
      if (E.caller === 'confused') return { dmg: 24, txt: 'They turn it off. They turn it on. A light comes on. Somewhere, Steve feels vindicated and does not know why.' };
      return { dmg: chance(.55) ? 14 : -5, txt: chance(.5) ? 'It works. It always works. It should not work.' : '“Yes. Obviously. Yes.”' };
    } },
  { id: 'hold', e: '⏸️', n: 'Pop you on hold for two ticks.', d: 'Recover patience. They will not recover anything.', cost: {},
    run(E) {
      Sfx.holdMusic(true);
      Player.mod({ patience: 12 + Sk.rank('breaks') * 4 });
      E.frus += 8; E.agg += 1;
      return { dmg: 0, txt: 'Hold music. Greensleeves, but the machine has never been outdoors. You breathe. It is the best two minutes of your day.' };
    } },
  { id: 'bs', e: '💼', n: 'Deploy corporate phrase.', d: 'Requires Corporate Speak.', need: 'corp', serves: ['speed'], cost: { pat: 1 },
    run(E) {
      const phrase = pick(['“I’ll escalate this.”', '“Let’s circle back once I’ve got clarity.”', '“I completely appreciate your frustration.”',
        '“We’re currently experiencing unprecedented volumes.”', '“That’s definitely something we’re looking into.”',
        '“Let me manage expectations here.”', '“I’ll take this offline and come back to you.”']);
      count('bullshit');
      const p = 6 + P.eff.bullshit * 3.1;
      const flop = E.caller === 'corporate' && chance(.4);
      if (flop) return { dmg: -6, txt: phrase + ' — “Right. I use that one on my own customers, so.”' };
      return { dmg: p, txt: phrase + ' It means nothing. It lands like a warm towel.', stat: 'bullshit' };
    } },
  { id: 'fix', e: '🛠️', n: 'Actually fix it.', d: 'Requires Troubleshooting. Expensive. Effective.', need: 'trouble', serves: ['answer', 'speed'], cost: { ene: 12, pat: 2 },
    run(E) { return { dmg: 16 + P.eff.knowledge * 2 + Sk.rank('trouble') * 6, txt: 'You do the thing that fixes it. Nobody will ever know. The ticket will say “resolved — no fault found”.', stat: 'knowledge' }; } },
  { id: 'policy', e: '📕', n: 'Quote the policy.', d: 'Requires Policy Knowledge. Correct and awful.', need: 'policy', serves: ['answer'], cost: { pat: 2 },
    run(E) { if (!E.boss) E.cpat -= 14; return { dmg: 10 + Sk.rank('policy') * 5, txt: 'You quote clause 8.2. It is true. It is unanswerable. It is one of the saddest things you have ever done.' }; } },
  { id: 'dave', e: '🙈', n: 'Transfer to Dave.', d: 'Requires Blame Shifting. Ends the call. Ends it.', need: 'blame', cost: {},
    run(E) { count('transfers'); Ach.get('a_paygrade'); return { dmg: 999, transfer: true, txt: 'You press the button. Somewhere across the floor, Dave’s phone lights up. He looks at it. He looks at you. He answers it.' }; } },
  { id: 'sarcasm', e: '😏', n: 'Say it slightly wrong.', d: 'Requires Sarcasm. Enormously risky.', need: 'sarcasm', serves: ['heard'], cost: { pat: 4 },
    run(E) {
      if (chance(.42 + Sk.rank('sarcasm') * .12)) return { dmg: 22 + P.eff.chaos * 2, txt: 'You say the correct sentence with the wrong music. They laugh. Something unlocks. You are, briefly, two people having a chat.', stat: 'chaos' };
      return { dmg: -14, txt: 'They did not take it as intended. They have started a sentence with “Right, well —”.' };
    } },
  { id: 'useless', e: '🤷', n: 'Be gently useless.', d: 'Requires Strategic Incompetence.', need: 'incomp', cost: {},
    run(E) { if (!E.boss) E.cpat -= 30; return { dmg: 5, txt: 'You are helpful in a way that helps nobody. You are warm. You are hopeless. You are, technically, still on the call.' }; } },
  { id: 'email', e: '📧', n: 'Follow up in writing.', d: 'Requires Weaponised Email. Devastating to professionals.', need: 'email', serves: ['respect'], cost: { ene: 6 },
    run(E) {
      const b = E.caller === 'corporate' ? 2.2 : 1;
      return { dmg: (12 + P.eff.bullshit * 2) * b, txt: 'You offer to confirm in writing, copying their account manager “for visibility”. The temperature of the call drops eleven degrees.', stat: 'bullshit' };
    } },
  { id: 'postcode', e: '📮', n: 'Can I take your postcode?', d: 'Dave’s gift to the world. Buys forty seconds and a think.', serves: ['answer'], cost: {},
    run(E) {
      Player.mod({ patience: 5 + Sk.rank('breaks') * 2 });
      E.frus += 1;
      const p = 5 + P.eff.knowledge * 1.1;
      if (E.caller === 'tech') return { dmg: -4, txt: '“You have my postcode. It’s on the account you’ve just opened. I can hear you typing it.”' };
      if (E.caller === 'silent') return { dmg: p * 2.2, txt: 'A question with an answer. Something they can actually do. They give it, slowly, and the giving of it starts them talking.', stat: 'empathy' };
      return { dmg: p, txt: 'You ask them to confirm the postcode. They spell it out with the phonetic alphabet they learned from somebody in the RAF. You use the forty seconds to think, which is what it is for.', stat: 'knowledge' };
    } },
  { id: 'weather', e: '☁️', n: 'Talk about the weather.', d: 'Requires Small Talk. Not a delay tactic. The actual job.', need: 'rapport', serves: ['heard'], cost: {},
    run(E) {
      const soft = ['elderly', 'confused', 'regular', 'normal', 'silent', 'grief', 'car'].includes(E.caller);
      if (E.caller === 'corporate' || E.caller === 'test') return { dmg: -3, txt: '“Mm. Shall we come back to the account?”' };
      if (E.caller === 'small') return { dmg: 4, txt: '“It’s been lovely, actually — which is half my problem, everyone’s outside and nobody’s buying.” A crack of light.' };
      const p = (9 + P.eff.empathy * 2 + Sk.rank('rapport') * 4) * (soft ? 1.8 : 0.7);
      return { dmg: p, txt: pick([
        'You mention the rain. They have opinions about the rain. Four minutes later you are both in a much better mood and the account has not moved an inch, and yet.',
        '“Have you had it up there?” — and they have, and they tell you, and somewhere in the telling they stop being a case number.',
        'You ask if it’s brightened up down there. It has. They go to the window to check. They come back different.']), stat: 'empathy' };
    } },
  { id: 'mute', e: '🔇', n: 'Mute. Scream. Unmute.', d: 'Requires The Mute Button. Restores you at their expense of nothing.', need: 'mute', cost: {},
    run(E) {
      const r = 14 + Sk.rank('mute') * 7;
      Player.mod({ patience: r });
      Sfx.noise(0.3, 0.2);
      G.flags.hasMuted = true;
      return { dmg: 2, txt: pick([
        'You press mute. You make a noise that has no name. You unmute. “Sorry about that — bear with me one second.” Your voice is a warm bath.',
        'Mute. A single, silent, full-body scream at a ceiling tile shaped like Wales. Unmute. “Right! So what I can do for you is —”',
        'Mute. You say the actual sentence you are thinking, at volume, to nobody. Unmute. You have never sounded more professional in your life.']) };
    } },
  { id: 'escalate', e: '🪜', n: 'Escalate it properly.', d: 'Requires Escalation Craft. Not a dodge — a handover.', need: 'escal', serves: ['respect', 'speed'], cost: { ene: 8, pat: 2 },
    run(E) {
      if (E.boss) return { dmg: 10 + Sk.rank('escal') * 6, txt: 'You escalate it, properly, in writing, to the correct person, with a summary. It changes nothing today. It changes something in about nine months.' };
      const ready = E.frus < E.maxFrus * 0.55;
      if (!ready) return { dmg: -6, txt: '“You’re passing me on. I’ve been passed on four times.” Escalating too early is just transferring with better grammar, and they can tell.' };
      count('transfers');
      return { dmg: 999, transfer: true, escalated: true, txt: 'You write a real handover: what happened, what you tried, what they need, and their name spelled the way they spell it. Then you warm-transfer to Alan and stay on the line until he says hello. That is the difference and it takes ninety seconds.' };
    } },
  { id: 'goodwill', e: '💷', n: 'Offer a goodwill gesture.', d: 'Requires Goodwill Authority. Comes out of a budget. Sometimes yours.', need: 'goodwill', serves: ['speed', 'respect'], cost: { pat: 1 },
    run(E) {
      const auth = Sk.rank('goodwill'), amount = [0, 5, 15, 40][auth] || 5;
      if (E.caller === 'grief') return { dmg: 6, txt: 'You offer a goodwill credit. There is a pause. “I don’t want money. I want the letters to stop.” You put the credit on anyway, quietly, and you stop the letters, which was always the actual job.' };
      if (E.caller === 'test') return { dmg: -8, txt: '“Interesting. And what’s your authority limit for that?” You do not know your authority limit. Nobody has ever told anybody their authority limit.' };
      const p = 14 + amount * 0.6 + P.eff.empathy;
      return { dmg: p, txt: '“I’m going to put £' + amount + ' on the account as a gesture.” The temperature drops thirty degrees in one second. It is the only word in this building that works every time, and it is not a word.' };
    } },
  { id: 'truth', e: '🙃', n: 'Tell them the actual truth.', d: 'The whole truth. About the system, the targets, all of it.', serves: ['heard', 'respect'], cost: { pat: 6 },
    run(E) {
      if (E.boss) return { dmg: 18 + P.eff.chaos * 2, txt: 'You say the true thing out loud in a meeting. The room does the thing rooms do. Something structural gives way slightly.', stat: 'chaos' };
      if (chance(0.5 + P.eff.empathy * 0.02)) {
        Player.mod({ rep: 1 });
        return { dmg: 30 + P.eff.chaos * 2, txt: pick([
          '“Honestly? The system won’t let me do it, my target says four minutes, and the person who could fix this doesn’t work weekends. Here is what I can actually do.” They go completely quiet. Then: “...right. Thanks for being straight with me.”',
          '“I can’t promise you Thursday because I’ve been told to stop promising days. I can promise you I’ll ring you Thursday and tell you where it is.” It is not what they wanted. It is the first true thing they have heard from this company.']), stat: 'empathy' };
      }
      return { dmg: -16, txt: 'You tell them the truth and the truth is that nobody is coming. They did not want that. Nobody wants that. “So what am I supposed to do?” — and you have no answer, because there isn’t one, and the silence costs you both.' };
    } },
  { id: 'nope', e: '💀', n: 'That’s not my department.', d: 'It might be. Nobody will check.', cost: { pat: 1 },
    run(E) {
      if (chance(.5)) { return { dmg: 999, fail: true, txt: 'They ask which department it is. You do not know. You say the name of a department you invented. They will ring back. They will ask for you by name.' }; }
      return { dmg: 999, transfer: true, txt: 'They accept it. Instantly. The relief is chemical. You have learned something about yourself and it is not good.' };
    } }
];

const BOSSES = {
  printer: { title: 'The Printer', face: '🖨️', sub: 'Xerox WorkCentre · firmware 2011 · sentient since Tuesday',
    phases: [
      { n: 'THE PRINTER', frus: 55, agg: 6, lines: ['📄 PAPER JAM (there is no paper)', '🖨️ ERROR 47 — no such error exists', 'It makes a noise. Not an error noise. A noise.'] },
      { n: 'THE PRINTER — LOW TONER', frus: 70, agg: 8, lines: ['📢 LOW TONER (the cartridge is full)', '👻 RANDOM OFFLINE', 'It has begun printing something. Nobody sent it. Page 340.'] },
      { n: 'THE PRINTER — FINAL FORM', frus: 45, agg: 11, lines: ['PC LOAD LETTER', 'PC LOAD LETTER', 'PC LOAD LETTER'] }],
    breather: 'The tray slides out, and back in, on its own. In the pause you remember you are a person.',
    win: 'printerBeaten' },
  nigel: { title: 'The Area Manager', face: '👔', sub: 'Quick word · Meeting Room 2 · 4 minutes (25)',
    phases: [
      { n: 'NIGEL — “JUST A CHAT”', frus: 50, agg: 6, lines: ['“It’s not a criticism, it’s a conversation.”', '📊 KPI BLAST', '“Can I have a quick word?” (you are in the quick word)'] },
      { n: 'NIGEL — PERFORMANCE REVIEW', frus: 70, agg: 9, lines: ['📧 EMAIL FLOOD — 40 unread, all “per my last”', '📋 “Where do you see yourself in five years?”', '“I’m going to need you to be honest with me. Not too honest.”'] }],
    breather: 'Nigel checks his phone, says “sorry, one second”, and does not say what it was.',
    win: 'nigelBeaten' },
  review: { title: 'THE ANNUAL PERFORMANCE REVIEW', face: '📊', sub: 'The reporting dimension · gridlines to the horizon',
    phases: [
      { n: 'KPI', frus: 70, agg: 8, lines: ['KPI: TARGET INCREASED.', 'KPI: TARGET INCREASED AGAIN.', 'KPI: YOUR TARGET IS NOW YOUR PREVIOUS RESULT.'] },
      { n: 'SLA & AHT', frus: 85, agg: 10, lines: ['SLA: YOU HAVE 20 SECONDS.', 'AHT: YOU HAVE FEWER SECONDS.', 'AHT: BE FASTER AND ALSO KINDER.'] },
      { n: 'CSAT & UTILISATION', frus: 95, agg: 12, lines: ['CSAT: THEY DID NOT COMPLETE THE SURVEY.', 'UTILISATION: YOU WERE IN THE TOILET FOR 4 MINUTES.', 'UTILISATION: I HAVE THE MINUTES.'] },
      { n: 'THE ANNUAL PERFORMANCE REVIEW', frus: 110, agg: 14, lines: ['MEETS EXPECTATIONS.', 'EXPECTATIONS HAVE BEEN REDEFINED.', 'HUMANS ARE INEFFICIENT. YOU ARE 61% UTILISED. WHERE IS THE REST OF YOU?'] }],
    breather: 'The gridlines stop scrolling. Somewhere a cell is recalculating. You get four seconds, and you take them.',
    win: 'finalDone' },
  complaint: { title: 'The Formal Complaint', face: '📮', sub: 'Four pages · eleven days of silence · Alan is on the line and will say nothing',
    phases: [
      { n: 'THE COMPLAINT — THE RECITAL', frus: 60, agg: 7, lines: [
        '“I want to go through this from the beginning. I’ve written it down.”',
        '“Contact one. The eleventh. Your Ryan said he’d ring back.”',
        '“Contact two. The nineteenth. Different person. Started again from the beginning.”',
        '“I’m not finished. I’ve got two more pages.”'] },
      { n: 'THE COMPLAINT — THE ELEVEN DAYS', frus: 80, agg: 10, lines: [
        '“Eleven days. Nobody rang. Nobody wrote. Eleven days.”',
        '“It’s not the thirty-eight pound. You know it’s not the thirty-eight pound.”',
        '“I took a day off work for the engineer. A day. Off. Work.”',
        '“Don’t apologise again. Four people have apologised. Apologising is free.”'] }],
    breather: 'Alan, who has said nothing for eleven minutes, unmutes and says one word: “Go on.” Then mutes again. You have never felt so held up by so little.',
    win: 'complaintBeaten' },
  queue: { title: 'THE 16:55 QUEUE', face: '📞', sub: 'Friday · four minutes to five · forty-one calls waiting',
    phases: [
      { n: 'THE QUEUE — 16:55', frus: 65, agg: 9, lines: [
        '☎️ 41 CALLS WAITING. LONGEST WAIT: 22:04.',
        '“Oh good, I got through — I’ve been holding since half four —”',
        '☎️ The phone at the empty desk beside you starts ringing.',
        '☎️ And the one after that.'] },
      { n: 'THE QUEUE — 16:58', frus: 80, agg: 12, lines: [
        '☎️ 44 CALLS WAITING. Three people have picked up their coats.',
        '“You close at five, don’t you? You do close at five?”',
        '☎️ Karen is standing at the end of the row, not saying anything, with her bag on her shoulder.',
        '☎️ SERVICE LEVEL: 22%. The wallboard has gone a colour it does not have a name for.'] },
      { n: 'THE QUEUE — 17:00', frus: 95, agg: 14, lines: [
        '☎️ The queue does not close at five. The queue has never closed at five.',
        '“I know it’s gone five. I know. Please.”',
        '☎️ Everyone else has gone. The lights on the far side have gone off on a timer.',
        '☎️ 12 CALLS WAITING. You are the whole of the department.'] }],
    breather: 'You look up. Dave is still there. He did not go. He has taken four while you were not looking and said nothing about it. He does not look over.',
    win: 'queueBeaten' },
  allhands: { title: 'THE ALL-STAFF BRIEFING', face: '📽️', sub: 'Meeting Room 2 · “30 mins” · slide 4 of 61',
    phases: [
      { n: 'THE BRIEFING — CONTEXT', frus: 55, agg: 6, lines: [
        '📊 “Before we get into it, I want to set some context.”',
        '📊 SLIDE 7: A map of the UK with four dots on it.',
        '📊 “Now — I know there’s been some noise about the restructure.”',
        '📊 “It is not a restructure. It is a realignment.”'] },
      { n: 'THE BRIEFING — THE JOURNEY', frus: 75, agg: 9, lines: [
        '📊 “We’re on a journey. I won’t pretend we’re at the end of the journey.”',
        '📊 SLIDE 22: A mountain. You are, apparently, at base camp.',
        '📊 “Headcount is not the lever we’re pulling.” (He has said the word lever four times.)',
        '📊 “Any questions? ...No? Great. Lovely. Really good engagement.”'] },
      { n: 'THE BRIEFING — ANY QUESTIONS?', frus: 90, agg: 12, lines: [
        '📊 “Sorry — was that a hand? At the back?”',
        '📊 The room turns. All of it. Forty faces. This is the single most dangerous moment in corporate life.',
        '📊 “That’s a really good question and I want to give it the time it deserves, so let’s take it offline.”',
        '📊 “Anyone else? ...No. Right. Thanks everyone. Back on the phones.”'] }],
    breather: 'Somebody at the back has quietly started handing out the untouched biscuits. The room shifts one degree towards survivable.',
    win: 'allhandsBeaten' }
};
