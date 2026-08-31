'use strict';
/* CALLHALL — the twenty people and everything they say.
 *
 * A person is a definition plus a dialogue tree. Dialogue.choose() resolves a
 * choice's `to` as a node id or an object and never as a function, so a branch
 * that depends on game state is two choices with the same `t` and mutually
 * exclusive `if:` guards.
 */

/* ---------------- NPCs, personalities, dialogue trees ---------------- */
const NPCS = [
{
  id: 'dave', name: 'Dave', face: '🧔', role: 'Senior Agent · 17 years served',
  desk: [21, 19], colour: '#4da3ff',
  schedule: [[540,'desk'],[615,'coffee'],[630,'desk'],[720,'breakTable'],[765,'looDoor'],[780,'desk'],[900,'coffee'],[915,'desk']],
  lines: ["Mm.", "Have you tried not caring? It works.", "That’ll be the printer.", "It’s always the printer.", "Seventeen years.", "No, I don’t want the team leader job."],
  entry() {
    if (G.flags.finalDone) return 'after';
    if (Q.active('q_spreadsheet') && G.flags.sawSpreadsheet && !G.flags.daveTold) return 'spread';
    if (Q.active('q_headset') && !G.flags.askedDave) return 'headset';
    if (G.flags.metDave) return 'again';
    return 'first';
  },
  nodes: {
    first: { text: ["Morning."], choices: [
      { t: "Morning.", to: 'first2' },
      { t: "You alright?", to: 'first_no' },
      { t: "Hi! I’m new! I’m so excited to be here!", to: 'first_keen' }] },
    first_no: { text: ["No.", "Fair enough though. Nobody is. Dave."], do() { Rel.add('dave', 1); }, to: 'first2' },
    first_keen: { text: ["...", "Give it till eleven.", "Dave. Senior agent. Seventeen years."], do() { Rel.add('dave', -1); }, to: 'first2' },
    first2: { text: ["Right. Three things and then I’m going back to pretending to work.",
      "One: the phones. Answer them or they never stop.",
      "Two: the printer. Don’t.",
      "Three: if Karen asks you to ‘pop into Meeting Room 2’, you’ve got about four minutes to invent a reason you can’t."],
      do() { G.flags.metDave = true; Player.xp(15); Rel.add('dave', 1); UI.objective("Answer a ringing phone (☎️) on the main floor."); },
      choices: [
        { t: "Seventeen years? Why don’t you go for management?", to: 'why' },
        { t: "What’s wrong with the printer?", to: 'printer' },
        { t: "Thanks, Dave.", to: null }] },
    why: { text: ["Management is just more emails.",
      "They offered me team leader in 2019. I asked what changes. They said ‘the emails’.", "So."],
      do() { Rel.add('dave', 1); Ach.get('a_dave'); }, to: null },
    printer: { text: ["Nothing’s wrong with it. That’s the frightening part."], to: null },
    again: { text: () => pick([
      "Alright.", "Phones are quiet. That’s never good.",
      "If a caller says ‘I know my rights’, they don’t.",
      "Somebody’s put a passive-aggressive note on the microwave again.",
      "You’ll be fine. Everyone’s fine. That’s the problem.",
      "Seventeen years and I’ve never once been to the Wellbeing Room. I’m told there’s a beanbag. I’m told.",
      "New lad’s asked me twice now if it gets better. I keep saying yes. One of these days he’s going to notice how I say it.",
      "Alan’s had a four-page one in the red tray since Monday. He’ll do it Thursday. He always does them Thursday.",
      "Push your chair in. Bev asks for one thing.",
      "Tomasz doesn’t take his break Tuesday mornings. Never has. I asked him once and he said ‘I have a commitment’, and I thought, fair enough, and I have thought about it roughly weekly since.",
      "If you want to know anything about this building, ask Bev. If you want to know anything about the building, ask Terry. They’re different questions."]),
      choices: [
        { t: "Any advice?", to: 'advice' },
        { t: "What actually happens on the management floor?", to: 'mgmt' },
        { t: "Dave — why are you still here?", to: 'why2', if: () => Rel.get('dave') >= 3 },
        { t: "Nothing, just saying hello.", to: null }] },
    why2: { text: ["...",
      "Because on my third day here, in 2008, I had a call that went badly and I put the phone down and I was going to walk out.",
      "And a woman called Pauline, who I had spoken to twice, came over with a cup of tea and sat on the edge of my desk and didn’t say anything for about four minutes.",
      "Then she said ‘right’, and went back to her desk.",
      "Pauline left in 2011. I never told her. And every time somebody has a bad one on this floor I go and stand near them with a cup of tea, and I don’t say anything, and they think I’m being odd.",
      "That’s why I’m still here. It’s not the job. It was never the job."],
      do() { Rel.add('dave', 4); Player.xp(70); Player.mod({ patience: 20, rep: 5 }); G.flags.davePauline = true; Ach.get('a_pauline'); }, to: null },
    advice: { text: () => pick([
      "Never say ‘I’ll definitely sort that today’. Say ‘I’ll get that moving’. Moving is not a promise.",
      "If you don’t know the answer, ask them to confirm their postcode. Buys you forty seconds and a think.",
      "Drink the coffee before you need it. That’s the whole system."]),
      do() { P.stats.bullshit += 0.5; UI.float("+0.5 Bullshit", '#ffb347'); }, to: null },
    mgmt: { text: ["Charts, mostly. And a spreadsheet nobody admits to writing.",
      "Every quarter the targets change and nobody signs the email that changed them.",
      "You start to wonder who’s actually doing it."],
      do() { G.flags.daveHint = true; Q.start('q_spreadsheet'); }, to: null },
    headset: { text: ["Kevin’s headset?", "No. Ask Marjorie. Marjorie knows where everything is, including things that don’t exist."],
      do() { G.flags.askedDave = true; Q.step('q_headset'); }, to: null },
    spread: { text: ["You’ve seen it then.", "Don’t tell Karen you’ve seen it. Karen thinks she writes it.",
      "It updates at 03:00. Nobody’s here at 03:00. I checked, once, out of spite."],
      do() { G.flags.daveTold = true; Q.step('q_spreadsheet'); }, to: null },
    after: { text: ["So you sorted it, then.", "Good. Kettle’s on.", "...", "It’ll be back by Q4, mind."], to: null }
  }
},
{
  id: 'karen', name: 'Karen', face: '👩‍💼', role: 'Team Leader · 47 tabs open',
  desk: [33, 19], colour: '#ff5f56',
  schedule: [[540,'desk'],[600,'mgmt'],[660,'desk'],[720,'breakTable2'],[750,'desk'],[840,'mgmt'],[900,'desk']],
  lines: ["I’m in back-to-backs today.", "Can we take this offline?", "Just circling back on that.", "I haven’t had a chance to look at it.", "Really quick question —"],
  entry() {
    if (!G.flags.metKaren) return 'first';
    if (G.flags.calls1 && !G.flags.karenReview) return 'review';
    /* The 2022 booking. She has been carrying it for four years and mentions it
       in passing in `again`; once you have been reviewed she is comfortable
       enough to actually ask. It fires once whether or not you take it on. */
    if (Q.active('q_recurring') && G.flags.knowTuesday) return 'tuesday';
    if (Q.active('q_recurring')) return 'nagging';
    if (Q.complete2('q_recurring')) return 'settled';
    if (G.flags.karenReview && !G.flags.recurringAsked) return 'confess';
    return 'again';
  },
  nodes: {
    first: { text: ["Hiya! You’re the new one. Lovely. Really quick — do you know how to use the system?"],
      choices: [
        { t: "No, I started forty minutes ago.", to: 'first2' },
        { t: "Yes.", to: 'first_lie' },
        { t: "I completely understand your frustration.", to: 'first_bs' }] },
    first_lie: { text: ["Brilliant! Great. That’s so helpful.", "So you’ll be fine on the queue then."],
      do() { P.stats.bullshit += 1; G.flags.karenThinksYouCan = true; UI.float("+1 Bullshit", '#ffb347'); }, to: 'first2' },
    first_bs: { text: ["...I’m not frustrated?", "Are you doing the phrases at me? You are. Someone’s been in the training room."],
      do() { P.stats.bullshit += 1; Rel.add('karen', 1); }, to: 'first2' },
    first2: { text: ["Right, well. I’m in back-to-backs until three so I’ll just say this quickly.",
      "Answer the phones, log the calls, and if anything goes wrong, escalate it to me and I’ll escalate it to Nigel and Nigel will escalate it to a chart.",
      "Lovely. Thanks. So good."],
      do() { G.flags.metKaren = true; Player.xp(10); UI.objective("Answer three calls. Karen is watching. Allegedly."); }, to: null },
    review: { text: ["So — your numbers.", "They’re numbers! Which is more than some people manage.",
      "Just keep the average handle time down and the satisfaction up. And the volume up. And the time down."],
      choices: [
        { t: "Those two things are in direct conflict.", to: 'conflict' },
        { t: "Absolutely. I’ll manage expectations.", to: 'bs' },
        { t: "What do you actually do, Karen?", to: 'what' }] },
    conflict: { text: ["Yes! Well spotted. That’s the challenge.", "That’s why it’s a target and not a plan."],
      do() { G.flags.karenReview = true; Player.xp(20); }, to: null },
    bs: { text: ["Ooh. Ooh, that’s good. Where did you get that?",
      "You can have that one. Don’t use it on Nigel, he invented it."],
      do() { G.flags.karenReview = true; P.stats.bullshit += 2; Item.give('pen'); }, to: null },
    what: { text: ["I’m across everything.", "...", "I’m across it."],
      do() { G.flags.karenReview = true; Rel.add('karen', -1); Ach.get('a_karen'); }, to: null },
    /* ---- The recurring meeting of 2022 ----
       Karen → Steve → Bev → the room → Tomasz → Karen, each holding exactly one
       piece of it. Six endings; the `dialogue` suite walks all of them. */
    confess: { text: ["Right — while you’re here. This is nothing. This is a nothing thing and I want that on the record before I say it.",
      "In 2022 I booked Meeting Room 2 for a Floor 4 catch-up. Eight o’clock, Tuesday mornings.",
      "We did it twice. Then Nigel moved his one-to-ones onto Tuesdays, so I stopped going, and I meant to cancel it, and I want you to hear the whole number: that was four years ago."],
      do() { G.flags.recurringAsked = true; },
      choices: [
        { t: "Karen. It’s a calendar. You click it and you click delete.", to: 'clickdelete' },
        { t: "Four years. Has anybody been going?", to: 'anyone' },
        { t: "Why are you telling me and not IT?", to: 'whyme' },
        { t: "That is the saddest thing I have ever heard in a workplace.", to: 'tragic' }] },
    clickdelete: { text: ["Yes. Yes! That is what I said. To myself. In 2022.",
      "It says: “You are not the organiser of this meeting.”",
      "I organised it. I am, definitionally, the organiser. I have the email in which I organised it.",
      "The computer says I am not the organiser, and I have not been able to look at that room in the room list since."],
      do() { Rel.add('karen', 1); }, to: 'ask' },
    anyone: { text: ["No! No. It’s an empty room. That’s why it’s embarrassing rather than serious.",
      "...",
      "I don’t actually know. I’ve never checked. I have actively not checked, the way you don’t look at a bank balance."],
      do() { Rel.add('karen', 1); }, to: 'ask' },
    whyme: { text: ["Because IT is Steve, and Steve will fix it, and then Steve will know.",
      "You’re new. You haven’t got a version of me yet. Everybody else in this building settled on theirs about six years ago and I can hear it in how they say “Karen”."],
      do() { Rel.add('karen', 2); P.stats.empathy += .5; Player.xp(15); }, to: 'ask' },
    tragic: { text: ["It IS. Thank you.",
      "Everybody I have nearly told has said “oh, that’s nothing”. And it is nothing. And it has been in my chest since 2022."],
      do() { Rel.add('karen', 1); P.stats.chaos += .5; }, to: 'ask' },
    ask: { text: ["So. Would you? Quietly.",
      "Not as a task. There’s no ticket. If anybody asks, you’re doing something else."],
      choices: [
        { t: "I’ll sort it.", to: 'take' },
        { t: "Karen — honestly, just let it run.", to: 'letrun' }] },
    take: { text: ["Thank you. Genuinely. And I’m now going to say something corporate to make that stop happening.",
      "...Great. Really good. Lovely."],
      do() { Q.start('q_recurring'); Rel.add('karen', 2); Player.xp(25); }, to: null },
    letrun: { text: ["...Yes. Probably.",
      "That is what I have decided every Tuesday for four years. I’m very consistent. It’s in my objectives."],
      do() { Rel.add('karen', 1); }, to: null },
    nagging: { text: () => pick([
      "Any joy with the — the Tuesday thing? No rush. Four years, so, no rush.",
      "I saw it in the room list again this morning. FLOOR 4 CATCH-UP. Bold as anything.",
      "Don’t make it a whole thing. If it becomes a whole thing, leave it, honestly.",
      "You haven’t mentioned it to Nigel? ...No. No, you wouldn’t. Sorry."]),
      choices: [
        { t: "Who was originally invited?", to: 'origlist', if: () => !G.flags.oldList },
        { t: "Working on it.", to: null }] },
    origlist: { text: ["Everybody on the floor. It was 2022. We invited everyone to everything, it was a whole culture, there were pastries.",
      "There was a distribution list — FLOOR4-ALL. They tidied the lists up in 2023 and nobody can get back into the old ones.",
      "So the invitation goes to whoever was on that list in 2022. Not who’s here now. Who was on it then.",
      "Every week. Forever. To a list that doesn’t exist any more."],
      do() { G.flags.oldList = true; Player.xp(20); }, to: null },
    tuesday: { text: ["You’ve got a face on. What is it. Has Steve made it a project? Steve makes things projects."],
      choices: [
        { t: "Somebody has been attending it. Every Tuesday. For four years.", to: 'who' },
        { t: "It’s a room booking held by a room. Sandra would call that a finding.", to: 'end_audit', if: () => G.flags.metSandra },
        { t: "It’s handled. Don’t think about it again.", to: 'end_quiet' }] },
    who: { text: ["...Who.",
      "No — don’t. Don’t say a name yet. Let me have four seconds of it being nobody.",
      "...",
      "Right. Who."],
      choices: [
        { t: "Tomasz. It is the only invitation he has ever been sent.", to: 'told' },
        { t: "I’m not telling you. Leave the booking alone.", to: 'end_quiet' }] },
    told: { text: ["Tomasz.",
      "Tomasz who has been here six years on a three-month contract. Who isn’t on the intranet. Who doesn’t get the all-staff emails.",
      "He gets the 2022 list, because the 2022 list is the one nobody tidied. So he gets that. One thing. Every Tuesday. Eight o’clock.",
      "And I booked it, and then I didn’t come."],
      choices: [
        /* The same sentence, two destinations. Whether Karen can walk into that
           room depends on whether you ever asked her what she was like before
           this job — three conversations ago, with no sign it would matter. */
        { t: "So go. Eight o’clock. Tuesday.", to: 'end_go', if: () => G.flags.karenBefore },
        { t: "So go. Eight o’clock. Tuesday.", to: 'end_panic', if: () => !G.flags.karenBefore },
        { t: "Delete it and never tell him it was you.", to: 'end_delete' }] },
    end_go: { text: ["...",
      "You asked me last week what I was like before this. Nobody asks that. I’ve thought about it every day since, which is embarrassing, and I’m telling you anyway.",
      "I was somebody who turned up.",
      "Right. Eight o’clock. I’ll bring the pastries, because it was 2022 and there were pastries, and I am going to sit in that room with him for half an hour every Tuesday until one of us leaves this company.",
      "And I’m not renaming it. It can say FLOOR 4 CATCH-UP. That’s what it is. There are two of us and we are on floor 4 and we are catching up."],
      do() {
        G.flags.recurringKept = true; G.flags.karenAttends = true;
        Rel.add('karen', 4); Rel.add('tomasz', 4); Player.mod({ rep: 15, patience: 20 });
        P.stats.empathy += 2; Ach.get('a_attendees'); Ach.get('a_recurring');
        Q.complete('q_recurring', 'attends');
      }, to: null },
    end_panic: { text: ["I can’t.",
      "I cannot walk into a room at eight o’clock on a Tuesday and be the woman who booked it and didn’t come. Not with him sat there. Not with the chair already out.",
      "Delete it. Please. Do it from your machine, so it isn’t from me."],
      choices: [
        { t: "No. I’m leaving it exactly where it is.", to: 'end_refuse' },
        { t: "Alright, Karen.", to: 'end_delete' }] },
    end_refuse: { text: ["...You can’t just refuse. I’m your team leader.",
      "...",
      "No. You’re right. Leave it. Leave it, and don’t tell me when it happens, and if it comes up in my objectives I will say it is under review.",
      "It is under review. It has been under review since 2022. That is the first true thing I’ve put in that box."],
      do() {
        G.flags.recurringKept = true;
        Rel.add('karen', 2); Rel.add('tomasz', 2); Player.mod({ rep: 8 });
        P.stats.empathy += 1; P.stats.chaos += 1; Ach.get('a_recurring');
        Q.complete('q_recurring', 'kept');
      }, to: null },
    end_delete: { text: ["Thank you.",
      "...",
      "Don’t tell me when it’s gone. Just — don’t mention Tuesday to me again."],
      do() {
        G.flags.recurringDeleted = true;
        Rel.add('karen', 3); Rel.add('tomasz', -3); Player.mod({ rep: 4 });
        Ach.get('a_recurring');
        Q.complete('q_recurring', 'deleted');
      }, to: null },
    end_quiet: { text: ["Is it gone?",
      "...You’ve done that face again. Fine. Fine! I don’t need to know. I asked you to handle it quietly and you are handling it quietly at me.",
      "Thank you. I think. Yes. Thank you."],
      do() {
        G.flags.recurringKept = true; G.flags.recurringSecret = true;
        Rel.add('karen', 1); Player.mod({ rep: 5 }); P.stats.bullshit += 1;
        Ach.get('a_recurring'); Q.complete('q_recurring', 'quiet');
      }, to: null },
    end_audit: { text: ["...Sandra.",
      "Yes. Yes, that’s — that’s actually the correct route. Raise it properly. A resource mailbox holding an unowned recurring booking, that’s a governance thing, she’ll love it.",
      "She did love it. It took eleven days and an email chain with fourteen people on it and at the end of it the booking was removed by Facilities under a change reference.",
      "Everything was done correctly. Everybody behaved impeccably. Terry has the paperwork.",
      "Bev says Tuesdays sound like every other day now. I don’t know why she keeps telling me that."],
      do() {
        G.flags.recurringDeleted = true; G.flags.recurringAudit = true;
        Rel.add('karen', 1); Rel.add('sandra', 2); Rel.add('tomasz', -4);
        Player.xp(40); P.stats.knowledge += 1; Ach.get('a_recurring');
        Q.complete('q_recurring', 'audit');
      }, to: null },
    settled: { text: () => {
        const out = (G.quests.q_recurring || {}).out;
        if (out === 'attends') return pick([
          "Two of us this morning. Half an hour. He does an agenda, you know. He brings a printed agenda.",
          "He said “thank you for coming” to me. To ME. I booked it.",
          "I’ve put it in my objectives as “stakeholder engagement”. It isn’t. It’s a cup of tea with Tomasz."]);
        if (out === 'audit') return pick([
          "It’s all been closed off properly. There’s a change reference and everything.",
          "Sandra was very pleased. I have never seen Sandra pleased before and I don’t want to again.",
          "Tomasz has been perfectly normal with me. Perfectly, perfectly normal."]);
        if (out === 'deleted') return pick([
          "It’s gone, then. Good. Great.",
          "I looked at the room list this morning out of habit. Tuesday’s just white now.",
          "You never said who it was. I’ve decided I’m grateful. Most days I’m grateful."]);
        return pick([
          "Still there, is it. In the list. Bold as anything.",
          "It’s under review. It’s been under review since 2022. I’m at peace with it. I’m not, but I’m saying it.",
          "Don’t tell me. I mean it. Don’t tell me."]);
      }, to: null },
    again: { text: () => pick([
      "Sorry — I’ve got a hard stop in two minutes. What is it?",
      "Have you seen my mug? It’s the one that says WORLD’S OKAYEST.",
      "I’ve got 47 tabs open and one of them is playing music and I can’t find it.",
      "Can you pop into Meeting Room 2? ...Actually no. Forget it. Forget I said that.",
      "I booked Meeting Room 2 once, in 2022, and I cannot work out how to unbook it and I am too embarrassed to ask.",
      "I’ve started a #wins channel. Dave posted ‘got in’. I don’t know if that’s a win or a cry for help and I’ve decided it’s a win.",
      "I put a card round for Marcus every year and every year I mean to actually take it to him and every year it’s four o’clock.",
      "Do you know what I did today? Eleven meetings. Eleven. About what? About the meetings."]),
      choices: [
        { t: "Is there anything I should be doing?", to: 'task' },
        { t: "That meeting you booked in 2022. Shall I deal with it?", to: 'take',
          if: () => G.flags.recurringAsked && !G.quests.q_recurring },
        { t: "Can I get access to the management floor?", to: 'access', if: () => Q.active('q_spreadsheet') },
        { t: "Karen — what were you like before this job?", to: 'before', if: () => Rel.get('karen') >= 2 },
        { t: "No, you’re alright.", to: null }] },
    before: { text: ["...That’s a question.",
      "I was on the phones. Six years. I was very good. Sandra still has one of my calls from 2017 that she plays to new starters.",
      "Then they made me a team leader, which is what they do to people who are good at the thing, so that they stop doing the thing.",
      "And now I am ‘across it’. I am across all of it. I am across it so hard that I have not had a single conversation with a customer in four years, and I used to be — ",
      "...",
      "Sorry. Hard stop. Meeting. Lovely though. Really good chat."],
      do() { Rel.add('karen', 3); Player.xp(50); G.flags.karenBefore = true; }, to: null },
    task: { text: () => pick([
      "Phones. Always phones. The phones are the job.",
      "There’s a survey. Don’t do the survey. I have to say do the survey. Don’t.",
      "Someone needs to fix the printer but it isn’t going to be either of us."]), to: null },
    access: { text: ["Management floor? You need a keycard.", "Terry has the keycards. Terry has everything.",
      "Terry is in the archive. Terry is always in the archive."],
      do() { Q.start('q_keycard'); }, to: null }
  }
},
{
  id: 'steve', name: 'Steve', face: '🧑‍🔧', role: 'IT · appears when things break',
  desk: [53, 32], colour: '#5ad48a',
  schedule: [[540,'serverRoom'],[600,'printer'],[615,'serverRoom'],[720,'breakTable'],[750,'serverRoom'],[900,'printer'],[930,'serverRoom']],
  lines: ["Have you tried restarting it?", "It’s not a network issue.", "That’s a hardware thing, that.", "I’ve logged it."],
  entry() {
    if (Q.active('q_printer') && !G.flags.askedSteve) return 'printer';
    if (Q.active('q_recurring') && !G.flags.steveRecurring) return 'recurring';
    return G.flags.metSteve ? 'again' : 'first';
  },
  nodes: {
    first: { text: ["Alright. Steve. IT.", "Have you tried restarting it?"],
      choices: [
        { t: "Restarting what? I haven’t said anything yet.", to: 'what' },
        { t: "Yes.", to: 'yes' }] },
    what: { text: ["Whatever it is. It’s usually that.", "...", "It’s usually that."],
      do() { G.flags.metSteve = true; Player.xp(10); Rel.add('steve', 1); }, to: null },
    yes: { text: ["Then it’s a hardware thing. I’ll log it."],
      do() { G.flags.metSteve = true; Player.xp(10); }, to: null },
    printer: { text: ["The printer.", "Right. Have you tried restarting it?",
      "...I’m not going up there. I went up there in March."],
      choices: [
        { t: "What happened in March?", to: 'march' },
        { t: "So what do I do?", to: 'do' }] },
    march: { text: ["It made a noise.", "Not an error noise. A noise."], to: 'do' },
    do: { text: ["Honestly? Hit it. Not hard. Sort of a firm encouragement, side panel, left of the tray.",
      "Don’t tell anyone I said that. Officially: I’ve logged it."],
      do() { G.flags.askedSteve = true; G.flags.knowHitPrinter = true; Q.step('q_printer'); }, to: null },
    /* Steve holds exactly one piece of the Tuesday thread: he can see that
       somebody accepts it, and he cannot see who, because they are not in the
       directory — which is Tomasz's whole situation, stated as a database
       problem by a man who has never met him. */
    recurring: { text: ["Karen’s Tuesday. Right. I wondered when somebody’d come down about that.",
      "I can’t delete it. Before you ask: not won’t. Can’t.",
      "She booked it off the panel on the wall in the room itself. So the organiser isn’t Karen. The organiser is Meeting Room 2."],
      choices: [
        { t: "The organiser is the room?", to: 'theroom' },
        { t: "Can’t you just force it?", to: 'force' }] },
    theroom: { text: ["The organiser is the room. Meeting Room 2 has a mailbox. I haven’t got a mailbox, I’ve got a shared one.",
      "Only the organiser can cancel a series. So that meeting ends when the room says it ends, and the room has never said anything to anybody.",
      "I find that funny about one day in three and quite bad the rest of the time."],
      do() { Player.xp(25); P.stats.knowledge += 1; Ach.get('a_organiser'); }, to: 'attendee' },
    force: { text: ["I could. I’d have to go in as the room, which is a thing I can technically do and have technically done, once, in 2021, and I still think about it.",
      "But I’d want it in writing from the organiser. And the organiser is the room. So I’d need it in writing from the room.",
      "That’s not me being awkward. That’s genuinely where the process ends."],
      do() { Player.xp(20); Ach.get('a_organiser'); }, to: 'attendee' },
    attendee: { text: ["Anyway. Before you go and tell Karen it can’t be done — there’s a thing.",
      "It’s not empty. Somebody accepts it. Every instance. Two hundred and something in a row, four years, never once declined.",
      "And I can’t tell you who, because the display name comes back blank. They’re not in the staff directory.",
      "Which means either they don’t work here, or they work here and they’re not in the directory, and I know which of those this building is more likely to have done."],
      do() { G.flags.steveRecurring = true; G.flags.oneAttendee = true; Player.xp(35); Rel.add('steve', 1); Q.step('q_recurring'); }, to: null },
    again: { text: () => pick([
      "Have you tried restarting it?",
      "Server room’s at 31 degrees. It’s fine. It’s been fine for six years.",
      "I’ve got a ticket open from 2021 that I’m emotionally attached to.",
      "If you hear a beeping, that’s normal. If it stops, tell me."]),
      choices: [
        { t: "What’s the oldest thing running in there?", to: 'oldest', if: () => G.flags.metSteve },
        { t: "Nothing’s broken. I just wanted to say hello.", to: 'hello' }] },
    oldest: { text: ["Call handler v2. 2009. Can’t turn it off.",
      "There’s one call still open on it. Been open since launch day. Call zero-zero-zero-zero-zero-one.",
      "I assume it’s a glitch. I assume that quite loudly, at night."],
      do() { G.flags.knowOldCall = true; Q.start('q_kevin'); }, to: null },
    hello: { text: ["...", "Right.", "Nobody’s ever done that before."],
      do() { Rel.add('steve', 2); Player.xp(15); }, to: null }
  }
},
{
  id: 'marjorie', name: 'Marjorie', face: '👩‍🦰', role: 'Agent · custodian of fourteen mugs',
  desk: [29, 23], colour: '#ffb347',
  schedule: [[540,'coffee'],[560,'desk'],[620,'coffee'],[640,'desk'],[720,'breakTable'],[780,'desk'],[870,'coffee'],[890,'desk']],
  lines: ["That’s my mug.", "That one’s also mine.", "Don’t use the blue one.", "Fourteen. I counted."],
  entry() {
    if (Q.active('q_keycard') && !G.flags.marjorieMug) return 'mug';
    if (Q.active('q_headset') && G.flags.askedDave && !G.flags.askedMarjorie) return 'headset';
    return G.flags.metMarjorie ? 'again' : 'first';
  },
  nodes: {
    first: { text: ["Oh, hello! New?", "Right — mug policy. You get the plain white one. Not the blue one, not the one with the cat, not the one that says NOT A MORNING PERSON, that’s aspirational and it’s mine."],
      choices: [
        { t: "How many mugs do you have, Marjorie?", to: 'how' },
        { t: "Understood. Plain white.", to: 'ok' }] },
    how: { text: ["Fourteen.", "...", "I don’t want to talk about the fourteenth."],
      do() { G.flags.metMarjorie = true; Rel.add('marjorie', 1); Player.xp(10); Ach.get('a_marjorie'); }, to: null },
    ok: { text: ["Good. You’ll go far. Most people go for the cat one immediately and then we have a fortnight of atmosphere."],
      do() { G.flags.metMarjorie = true; Rel.add('marjorie', 2); Player.xp(10); Item.give('mug'); }, to: null },
    headset: { text: ["Kevin’s headset. Hmm.", "It’s not in lost property, because lost property is a drawer and the drawer is full of chargers for devices nobody owns.",
      "Ask Kevin what he was doing when he last had it. Kevin’s answers are always more interesting than the question."],
      do() { G.flags.askedMarjorie = true; Q.step('q_headset'); }, to: null },
    mug: { text: ["Terry’s mug? The brown one? With the crack?", "...I may have absorbed it.",
      "It’s on the shelf. Third from the left. Take it, but Terry has to know I gave it willingly."],
      do() { G.flags.marjorieMug = true; Item.give('terrymug'); Q.step('q_keycard'); }, to: null },
    again: { text: () => pick([
      "Someone’s put a mug in the dishwasher lid-down. I know who. I’m saying nothing.",
      "There’s a yoghurt in that fridge older than my marriage.",
      "You look tired. That’s day two energy on day one. Slow down.",
      "I gave Tomasz a mug. Six years he’d been drinking out of the ones by the sink. Six years.",
      "The biscuit rota has said MARJORIE since February. I have not said anything. I am not going to say anything. I am simply going to continue not saying anything, indefinitely, at everyone.",
      "Somebody filled the kettle and left it. That’s a kind thing that costs nothing and I notice every single time."]),
      choices: [
        { t: "Can I have a mug, Marjorie?", to: 'askmug', if: () => !Item.has('mug') },
        { t: "Tell me about the fourteenth mug.", to: 'fourteenth', if: () => Rel.get('marjorie') >= 4 && !G.flags.mug14 },
        { t: "Nice chatting.", to: null }] },
    fourteenth: { text: ["...The one facing the wall.",
      "It says WORLD’S BEST GRANDAD. It isn’t mine. It was Ken’s. Ken sat where Marcus sits now.",
      "He retired in 2016 and left it on the shelf and I have washed it every Friday for nine years.",
      "I turn it to the wall because I don’t want anybody using it and I don’t want to explain why, and now you’ve made me explain why, and I’d like you to go and answer a phone please, love.",
      "...",
      "Thank you for asking, though. Nobody’s ever asked."],
      do() { G.flags.mug14 = true; Rel.add('marjorie', 4); Player.xp(60); Player.mod({ rep: 4 }); Ach.get('a_fourteenth'); }, to: null },
    askmug: { text: ["...Fine. Plain white. Bring it back.", "I will know."],
      do() { Item.give('mug'); Rel.add('marjorie', 1); }, to: null }
  }
},
{
  id: 'gary', name: 'Gary', face: '🧑‍🦱', role: 'Agent · leaving (est. 2022)',
  desk: [37, 19], colour: '#b48cff',
  schedule: [[540,'desk'],[590,'coffee'],[610,'desk'],[720,'breakTable2'],[790,'desk'],[880,'looDoor'],[900,'desk']],
  lines: ["I’m off in a couple of months anyway.", "This place, honestly.", "I’ve got an interview lined up.", "I’ve had it up to here."],
  entry() {
    if (G.flags.gotGoodChair) return 'chairdone';
    if (Q.active('q_chair') && G.flags.garyChairTerms) return 'chairdeal';
    if (Q.active('q_chair')) return 'chair';
    return G.flags.metGary ? 'again' : 'first';
  },
  nodes: {
    chair: { text: ["The chair.", "Everyone asks about the chair eventually. You’ve lasted longer than most, I’ll give you that."],
      choices: [
        { t: "Where did it come from?", to: 'chairfrom' },
        { t: "What would it take?", to: 'chairterms' }] },
    chairfrom: { text: ["2019 refresh. They ordered forty of the cheap ones and one of the good ones, by mistake, and it came on the same pallet.",
      "I was the only one in that Monday. Everyone else was on the training day. I have never been so glad to have missed a training day in my life.",
      "I’ve had it five years. It’s the only thing in this building that’s mine."], to: 'chairterms' },
    chairterms: { text: ["What would it take?", "...",
      "Honestly? Nothing. There’s no price. I’m not being awkward, there just isn’t one.",
      "But — and I’m going to be straight with you because you’ve been alright with me — the chair’s not the thing, is it.",
      "The chair is the thing I’ve got instead of leaving. Five years of ‘two months’ and the only evidence I was ever here is a chair with my name on it in marker.",
      "So. If you can get me something better than the chair, you can have the chair."],
      choices: [
        { t: "What would be better than the chair?", to: 'chairwhat' }] },
    chairwhat: { text: ["An interview. A real one. For a real job. Somewhere else.",
      "I’ve not applied for anything in three years. Not once. I say I’ve ‘looked’.",
      "If you sit with me at lunch and we do one application — one, all the way, submitted, sent — the chair’s yours before you get back to your desk."],
      do() { G.flags.garyChairTerms = true; Q.step('q_chair'); UI.objective('Sit with Gary at lunch and actually submit one application.'); }, to: null },
    chairdeal: { text: ["You came back.", "...Nobody comes back."],
      choices: [
        { t: "Right. Laptop out. One application. All the way.", to: 'chairdo' },
        { t: "Actually, keep the chair.", to: 'chairkeep' }] },
    chairkeep: { text: ["...Yeah.", "Yeah, alright.", "Cheers. Genuinely.", "Two months, mind."],
      do() { Rel.add('gary', 2); Player.mod({ rep: 3 }); Q.complete('q_chair', 'kept'); }, to: null },
    chairdo: { text: ["Right. Right. Okay.",
      "...It wants a covering letter. Of course it wants a covering letter.",
      "‘Why do you want this role.’ Because I have been saying I’m leaving for three years and a new person watched me say it and didn’t laugh.",
      "...Don’t put that.",
      "...Put that.",
      "SUBMITTED. That’s — that’s it. That’s it gone.",
      "Right. Take the chair. Take it now before I think about it. Go on. GO."],
      do() {
        G.flags.gotGoodChair = true; Q.complete('q_chair', 'applied');
        Rel.add('gary', 5); Player.mod({ rep: 8 }); Player.xp(90); Ach.get('a_chair');
        Item.give('cushion'); G.minutes += 35;
        Chat.push('#general', 'Gary', '🧑‍🦱', 'ive applied for something. an actual thing. with a covering letter and everything');
        Chat.push('#general', 'Dave', '🧔', 'Good.');
        Chat.push('#general', 'Marjorie', '👩‍🦰', 'GARY');
        Chat.push('#general', 'Gary', '🧑‍🦱', 'i know');
      }, to: null },
    chairdone: { text: () => pick([
      "How’s the chair? Don’t answer that.",
      "Heard anything back? No. No, me neither. It’s only been a day. It’s been a day.",
      "I’ve applied for two more. It gets easier. That’s the horrible bit — it gets easier.",
      "You know the funny thing? I don’t miss the chair. I thought I would."]),
      choices: [
        { t: "You alright, Gary?", to: 'garyok' },
        { t: "Sound. See you.", to: null }] },
    garyok: { text: ["Yeah.", "...", "Yeah, actually. First time in about three years, genuinely, yeah."],
      do() { Rel.add('gary', 2); Player.mod({ patience: 10 }); }, to: null },
    first: { text: ["New, are you? Don’t get comfortable.", "I’m off in a couple of months anyway. Got things in the pipeline."],
      choices: [
        { t: "Where are you going?", to: 'where' },
        { t: "How long have you been ‘off in a couple of months’?", to: 'howlong' }] },
    where: { text: ["Somewhere better. Loads of options.", "It’s about being strategic, isn’t it."],
      do() { G.flags.metGary = true; Player.xp(10); }, to: null },
    howlong: { text: ["...Three years.", "But this time I’ve updated the CV."],
      do() { G.flags.metGary = true; Player.xp(15); Rel.add('gary', 1); Ach.get('a_gary'); }, to: null },
    again: { text: () => pick([
      "Did you see the email? Unbelievable. I’m not doing it.",
      "I would leave, but I’ve got the good chair now.",
      "Two months. Three tops.",
      "Do you want my headset when I go? ...Not yet. Soon."]),
      choices: [
        { t: "Have you actually applied anywhere?", to: 'applied' },
        { t: "Tell me about the chair.", to: 'chair', if: () => !Q.active('q_chair') && !Q.complete2('q_chair'), do() { Q.start('q_chair'); } },
        { t: "Sound. See you.", to: null }] },
    applied: { text: ["I’ve looked.", "Looking is the first stage. Everyone forgets that."],
      do() { P.stats.chaos += 0.5; }, to: null }
  }
},
{
  id: 'sarah', name: 'Sarah', face: '👩', role: 'Agent · keeper of #general',
  desk: [25, 23], colour: '#5ad48a',
  schedule: [[540,'desk'],[600,'fridge'],[615,'desk'],[720,'breakTable'],[780,'desk'],[900,'coffee'],[920,'desk']],
  lines: ["Whose yoghurt is that?", "I’m going to send a message about it.", "It had my NAME on it.", "I’m not angry, I’m documenting."],
  entry() {
    if (Q.active('q_fridge') && G.flags.fridgeClues >= 3) return 'solve';
    if (Q.active('q_fridge')) return 'during';
    if (G.flags.metSarah) return 'again';
    return 'first';
  },
  nodes: {
    first: { text: ["Hiya. Sorry, quick question — did you take a lunch out of the fridge this morning?"],
      choices: [
        { t: "No, I’ve only just arrived.", to: 'no' },
        { t: "Define ‘take’.", to: 'define' }] },
    define: { text: ["...Interesting.", "I’m going to write that down."], to: 'no' },
    no: { text: ["Right. It’s a wrap. Chicken and stuffing. In a bag with my name on it. MY NAME.",
      "There are eleven people on this floor and one of them is a monster.",
      "Would you help me look into it? Nobody else takes it seriously and I have a spreadsheet."],
      choices: [
        { t: "I’ll help.", to: 'accept' },
        { t: "You have a spreadsheet?", to: 'sheet' },
        { t: "It’s a sandwich, Sarah.", to: 'sandwich' }] },
    sheet: { text: ["Everyone here has a spreadsheet. That’s the thing about this place.", "Mine’s just about lunch."], to: 'accept' },
    sandwich: { text: ["It’s a WRAP.", "...", "Will you help or not."], to: 'accept' },
    accept: { text: ["Brilliant. Check the fridge, check the bins, and talk to people. Someone always slips up.",
      "Especially Gary. Gary slips up constantly and gets away with it because he’s leaving."],
      do() { G.flags.metSarah = true; Q.start('q_fridge'); Player.xp(10); }, to: null },
    during: { text: ["Anything? Anything at all?", "I’ve stopped eating lunch. On principle. I’m having crisps out of the machine like an animal."], to: null },
    solve: { text: ["Go on then. Who was it."],
      choices: [
        { t: "It was me. I ate it. I don’t remember doing it.", to: 'itwasyou' },
        { t: "Gary. Definitely Gary.", to: 'blame' },
        { t: "The fridge has no record of the event and neither do I.", to: 'bs' }] },
    itwasyou: { text: ["...", "You’re the monster.", "You know what, at least you said. Nobody ever says.",
      "Right. We never speak of this. I’m putting ‘unresolved’ in the spreadsheet."],
      do() { Q.complete('q_fridge', 'honest'); Ach.get('a_monster'); Rel.add('sarah', 3); }, to: null },
    blame: { text: ["I KNEW it. Gary. GARY.", "...He’s going to deny it and I’m going to believe him and we’ll be back here in a fortnight."],
      do() { Q.complete('q_fridge', 'gary'); P.stats.chaos += 2; Rel.add('gary', -2); }, to: null },
    bs: { text: ["That is the single most corporate sentence I have ever heard from a human being.",
      "You’re going to do so well here. That frightens me for you."],
      do() { Q.complete('q_fridge', 'bs'); P.stats.bullshit += 3; }, to: null },
    again: { text: () => pick([
      "Did you see what Dave put in #general? Nothing. He never puts anything. It’s eerie.",
      "I’ve started labelling my labels.",
      "Someone microwaved fish. In this economy."]), to: null }
  }
},
{
  id: 'kevin', name: 'Kevin', face: '🧑‍💻', role: 'Agent · wearing a headset',
  desk: [41, 19], colour: '#4da3ff',
  schedule: [[540,'desk'],[640,'coffee'],[655,'desk'],[720,'breakTable2'],[780,'desk'],[900,'desk']],
  lines: ["Has anyone seen my headset?", "I definitely had it.", "It’s not in the drawer.", "I can hear you, weirdly."],
  entry() {
    if (Q.complete2('q_headset')) return 'after';
    if (Q.active('q_headset') && G.flags.askedDave && G.flags.askedMarjorie) return 'reveal';
    if (Q.active('q_headset')) return 'during';
    return 'first';
  },
  nodes: {
    first: { text: ["Sorry — sorry — you’re new, aren’t you, sorry — have you seen a headset?",
      "Black one. Bit of tape on the left ear. I’ve looked everywhere."],
      choices: [
        { t: "I’ll help you look.", to: 'accept' },
        { t: "Kevin. Mate.", to: 'mate' },
        { t: "Have you tried lost property?", to: 'lost' }] },
    mate: { text: ["What?", "...What?"], to: 'accept' },
    lost: { text: ["Lost property is a drawer with nine chargers in it and a single glove.", "I’ve been through it twice."], to: 'accept' },
    accept: { text: ["Would you? That’s — honestly, thank you. Ask Dave, ask Marjorie, they know things.",
      "I need it for the two o’clock. I can’t do the two o’clock without it."],
      do() { Q.start('q_headset'); Player.xp(10); Rel.add('kevin', 1); }, to: null },
    during: { text: ["Any luck?", "I keep hearing hold music and I don’t know where from. It’s doing something to me."], to: null },
    reveal: { text: ["Anything?"],
      choices: [
        { t: "Kevin. It’s on your head.", to: 'onhead' },
        { t: "Kevin, where do you think sound is coming from right now?", to: 'socratic' }] },
    socratic: { text: ["From the... from the...", "...", "Oh."], to: 'onhead' },
    onhead: { text: ["...", "It’s on my head.", "It’s been on my head.", "I’ve had three conversations. Nobody said.",
      "I’ve been ON A CALL this entire time. There’s a man in Swindon who has heard everything."],
      do() { Q.complete('q_headset'); Ach.get('a_headset'); Rel.add('kevin', 3); }, to: null },
    after: { text: () => pick([
      "Please don’t tell the two o’clock.",
      "I’ve got a lanyard now. For the headset. So it can’t happen again. It could still happen again.",
      "The man in Swindon sent a compliment, actually. About my honesty."]),
      choices: [
        { t: "Kevin — have you ever heard of call 000001?", to: 'call1', if: () => G.flags.knowOldCall },
        { t: "Glad you’re sorted.", to: null }] },
    call1: { text: ["Zero-zero-zero-zero-zero-one?", "That’s not a call number. That’s the first one. That’s launch day.",
      "My uncle worked here at launch. Also Kevin. Everyone here is called Kevin eventually, it’s statistics.",
      "He went to take one call and he never — well. He retired. Officially he retired.",
      "The graffiti in the toilets isn’t about me, is what I’m saying."],
      do() { G.flags.kevinLore = true; Q.step('q_kevin'); }, to: null }
  }
},
{
  id: 'priya', name: 'Priya', face: '👩‍💻', role: 'Subject Matter Expert · knows everything, tells no one',
  desk: [45, 19], colour: '#b48cff',
  schedule: [[540,'desk'],[600,'printer'],[620,'desk'],[720,'breakTable'],[770,'desk'],[860,'archive'],[900,'desk']],
  lines: ["That’s a known issue.", "It’s in the knowledge base. Nobody reads the knowledge base.", "I wrote that article. In 2021.", "Escalate it to me and I’ll do it properly."],
  entry() {
    if (Q.complete2('q_printer') && !G.flags.priyaThanked) return 'thanks';
    if (Q.active('q_printer')) return 'during';
    return G.flags.metPriya ? 'again' : 'first';
  },
  nodes: {
    first: { text: ["You’re new. Good. Listen carefully, because I’m only going to do this once and then I’m going to be busy for eleven years.",
      "Everything you need is in the knowledge base. Nobody reads it. Therefore, everything you need is in me. Therefore I am the knowledge base. Therefore I am tired."],
      choices: [
        { t: "Can you teach me anything useful?", to: 'teach' },
        { t: "What’s the knowledge base?", to: 'kb' }] },
    kb: { text: ["Exactly.", "Exactly."], to: 'teach' },
    teach: { text: ["Rule one: read the account notes before you speak. Half of angry is ‘nobody read the notes’.",
      "Rule two: never guess a timescale.",
      "Rule three: the printer is not fixable by policy, only by violence. Which brings me to a favour."],
      do() { G.flags.metPriya = true; P.stats.knowledge += 2; Player.xp(20); UI.float("+2 Knowledge", '#4da3ff'); },
      choices: [
        { t: "Go on.", to: 'quest' },
        { t: "I’m going to pretend I didn’t hear the violence part.", to: 'quest' }] },
    quest: { text: ["The printer’s been refusing to print the compliance packs for a fortnight.",
      "Try everything. Paper, toner, restart, IT. Try all of it. And when all of it fails, come back and I’ll tell you what actually works.",
      "It’s important that you fail at the sensible options first. It’s character-building, and also I want a witness."],
      do() { Q.start('q_printer'); }, to: null },
    during: { text: ["Have you hit it yet?", "Sorry — have you *exhausted the documented remediation steps* yet."], to: null },
    thanks: { text: ["You hit it.", "Everybody hits it. I hit it. Steve hits it. The regional director hit it in front of an auditor.",
      "And the compliance packs printed, and nobody asked how, and that is CALLHALL, in one machine."],
      do() { G.flags.priyaThanked = true; Rel.add('priya', 2); }, to: null },
    again: { text: () => pick([
      "Read the notes.", "It’s a known issue. Everything is a known issue. Knowing is not fixing.",
      "If you ever get access to the management floor, look at the source of the KPI figures. Just look at it."]),
      choices: [
        { t: "What’s wrong with the KPI figures?", to: 'kpi' },
        { t: "Thanks, Priya.", to: null }] },
    kpi: { text: ["Nobody enters them.", "I’ve checked the audit log. There’s no user. The cells just... change.",
      "I raised a ticket. The ticket was closed. By nobody."],
      do() { Q.start('q_spreadsheet'); G.flags.priyaKPI = true; }, to: null }
  }
},
{
  id: 'terry', name: 'Terry', face: '👴', role: 'Facilities · has every key ever made',
  desk: [6, 9], colour: '#ffb347',
  schedule: [[540,'archive'],[660,'coffee'],[680,'archive'],[720,'breakTable2'],[780,'archive'],[900,'training'],[930,'archive']],
  lines: ["Mind the boxes.", "That door’s not a door.", "I’ve got a key for that.", "Nobody comes down here.", "I’m not replacing that flap a third time."],
  entry() {
    if (G.flags.keycard) return 'after';
    if (Item.has('terrymug')) return 'gotmug';
    if (Q.active('q_keycard')) return 'quest';
    return G.flags.metTerry ? 'again' : 'first';
  },
  nodes: {
    first: { text: ["Oh! Someone’s come down. That’s nice.", "Terry. Facilities. Thirty-one years, on and off.",
      "Mostly on. Off was 2004. We don’t discuss 2004."],
      choices: [
        { t: "What happened in 2004?", to: 'y2004' },
        { t: "What’s in all these boxes?", to: 'boxes' }] },
    y2004: { text: ["Restructure.", "They restructured me into a cupboard for five months. I kept coming in. Nobody stopped me.",
      "Turns out I wasn’t on the system at all. Hadn’t been since 1998. Still got paid, mind."],
      do() { G.flags.metTerry = true; Player.xp(20); Rel.add('terry', 2); Ach.get('a_terry'); }, to: null },
    boxes: { text: ["Everything. Headsets, monitors, the old Christmas decorations, a whole department from 2011.",
      "Not the people. The department. The paperwork of it. Feels like people though, in the dark."],
      do() { G.flags.metTerry = true; Player.xp(15); }, to: null },
    quest: { text: ["Keycard for the management floor? I’ve got a spare, aye.",
      "Thing is, I can’t find my mug, and I don’t do favours before tea. That’s not stubbornness, that’s policy. My policy."],
      choices: [
        { t: "Brown mug? Cracked?", to: 'yes' },
        { t: "I’ll find it.", to: 'yes' }] },
    yes: { text: ["That’s the one. Somebody’s ‘absorbed’ it. I have a suspicion. Fourteen suspicions, in fact."],
      do() { Q.step('q_keycard'); }, to: null },
    gotmug: { text: ["My mug!", "...She gave it willingly? She’s never given anything willingly. You’ve got a gift, you have.",
      "Right. Keycard. Management floor. Don’t let Nigel see it, he’ll want a process for it.",
      "And listen — while you’re up there. Look at the far monitor. The one in the corner that nobody sits at."],
      do() { Item.take('terrymug'); Item.give('keycard'); G.flags.keycard = true; Q.complete('q_keycard'); Q.start('q_spreadsheet'); }, to: null },
    after: { text: () => pick([
      "Mind the boxes.", "Cup of tea in me and I’m unstoppable. For nine minutes.",
      "That square of carpet by the wall’s never sat right. Never has."]),
      choices: [
        { t: "The odd square of carpet?", to: 'carpet' },
        { t: "See you, Terry.", to: null }] },
    carpet: { text: ["Aye. It’s not carpet, is it. It’s a lid.", "I’ve never lifted it. Thirty-one years.",
      "Not scared. Just — some things you leave for the young."],
      do() { G.flags.knowHatch = true; }, to: null }
  }
},
{
  id: 'janet', name: 'Janet', face: '👩‍🏫', role: 'Learning & Development',
  desk: [7, 32], colour: '#5ad48a',
  schedule: [[540,'training'],[720,'breakTable'],[770,'training']],
  lines: ["Smile while being insulted!", "That’s a learning opportunity.", "Let’s put a pin in that.", "There are no wrong answers. There are wrong answers."],
  entry() { return G.flags.trained ? 'again' : 'first'; },
  nodes: {
    first: { text: ["Welcome to Learning and Development! I’m Janet. This is the training room. Nobody comes here after week one, which is a shame, because this is where the truth is.",
      "Shall we do the induction? It takes four minutes and it will change how you speak forever."],
      choices: [
        { t: "Let’s do it.", to: 'mod1' },
        { t: "Is it compulsory?", to: 'compulsory' }] },
    compulsory: { text: ["It’s voluntary.", "It’s tracked.", "Shall we do the induction?"], to: 'mod1' },
    mod1: { text: ["MODULE ONE: SMILE WHILE BEING INSULTED.",
      "They can hear a smile. They can also hear a scream, so we prefer the smile.",
      "Now — a customer says ‘you people are useless’. What do you say?"],
      choices: [
        { t: "“I completely understand your frustration.”", to: 'mod2', do() { P.stats.empathy += 1; } },
        { t: "“I’m sorry you feel that way.”", to: 'mod1b' },
        { t: "“Which of us specifically?”", to: 'mod1c', do() { P.stats.chaos += 1; } }] },
    mod1b: { text: ["Ooh. That’s a non-apology apology and it will get you a complaint by Thursday.",
      "‘Sorry you feel that way’ means ‘your feelings are a design flaw’. Try again in your head. I’ll allow it."], to: 'mod2' },
    mod1c: { text: ["...", "I’m writing that down for the Christmas do."], to: 'mod2' },
    mod2: { text: ["MODULE TWO: SAY ‘I COMPLETELY UNDERSTAND.’",
      "You don’t have to understand. That is the beauty of the phrase. It is load-bearing and hollow, like most of this building."],
      do() { P.stats.bullshit += 1; }, to: 'mod3' },
    mod3: { text: ["MODULE THREE: DO NOT ACTUALLY SAY WHAT YOU ARE THINKING.",
      "This module has no content. It is simply the sentence. We repeat it annually.",
      "MODULE FOUR: THE ESCALATION LADDER. You go up it. Nobody comes down it."],
      to: 'done' },
    done: { text: ["And that’s induction! You’re now qualified to be shouted at by members of the public.",
      "Here — a corporate pen. Everyone gets one. Nobody knows where they come from. They simply arrive, like weather."],
      do() { G.flags.trained = true; Player.xp(40); Item.give('pen'); P.stats.bullshit += 1; Ach.get('a_trained'); Sk.grant(1); }, to: null },
    again: { text: () => pick([
      "Refresher? MODULE ONE: SMILE WHILE BEING INSULTED.",
      "I used to be on the phones. Eleven years. I don’t talk about the Tuesday.",
      "The trick isn’t patience. It’s pacing. Anyone can be patient for a minute."]),
      choices: [
        { t: "Tell me about the Tuesday.", to: 'tuesday' },
        { t: "Any tips for difficult calls?", to: 'tips' },
        { t: "Just passing through.", to: null }] },
    tuesday: { text: ["No.", "...", "There were four hundred and twelve calls and one of me."],
      do() { Rel.add('janet', 2); P.stats.patience += 1; }, to: null },
    tips: { text: ["Let them finish. All of it. The whole speech.",
      "Ninety per cent of anger is someone rehearsing a speech in a car park and needing to deliver it.",
      "Let them deliver it. Then say ‘right’. Just ‘right’. It’s devastating."],
      do() { P.stats.empathy += 1; UI.float("+1 Empathy", '#5ad48a'); }, to: null }
  }
},
{
  id: 'mo', name: 'Mo', face: '🧑‍🎓', role: 'Trainee · started the same day as you',
  desk: [17, 19], colour: '#4da3ff',
  schedule: [[540,'desk'],[600,'looDoor'],[615,'desk'],[720,'breakTable2'],[780,'desk'],[840,'coffee'],[860,'desk']],
  lines: ["Do we get lunch? Like, an actual lunch?", "I’ve just been shouted at about a boiler.", "Is it always like this?", "I like it here. Is that bad?"],
  entry() { return G.flags.metMo ? 'again' : 'first'; },
  nodes: {
    first: { text: ["Oh thank God, another new one. Mo. Started today. Have you found the toilets? I haven’t found the toilets.",
      "I’ve had four calls. One of them was fine. That’s a twenty-five per cent fine rate."],
      choices: [
        { t: "It gets better, apparently.", to: 'better' },
        { t: "Toilets are past the desks, on the right.", to: 'loo' }] },
    better: { text: ["Dave said that. Dave said it in a way that suggested it doesn’t.",
      "Right. Solidarity. If you get an absolute nightmare of a call, wave at me and I’ll wave back and that’ll be our thing."],
      do() { G.flags.metMo = true; Rel.add('mo', 2); Player.xp(15); }, to: null },
    loo: { text: ["You’re a hero. Genuinely.", "Right — solidarity. We’re in this together. Day one club."],
      do() { G.flags.metMo = true; Rel.add('mo', 3); Player.xp(15); }, to: null },
    again: { text: () => pick([
      "A man just asked me to explain the internet. The whole internet.",
      "I said ‘let me check that for you’ and then I just... sat there. For a minute. It worked?",
      "Do you think we’ll be like Dave one day? Be honest.",
      "I’ve started nodding at people on the phone. They can’t see me. I do it anyway."]),
      choices: [
        { t: "You’re doing great, Mo.", to: 'nice' },
        { t: "We’re going to be exactly like Dave.", to: 'dave' },
        { t: "Mo — are you actually alright?", to: 'actually', if: () => Rel.get('mo') >= 4 }] },
    actually: { text: ["...",
      "No. Not really. I cried in the accessible toilet on Wednesday and then I came out and did four more calls and nobody said anything and I don’t know if that’s good or bad.",
      "Everyone here is so — fine. Dave’s fine. Karen’s fine. Everyone’s FINE and I’m sat here at twenty-three having a bit of a moment about a boiler.",
      "...",
      "Sorry. Sorry. That was a lot. You asked and I just — nobody asks."],
      choices: [
        { t: "Nobody here is fine, Mo. That’s the joke.", to: 'notfine' },
        { t: "Go and sit on the step for ten minutes. I’ll cover.", to: 'cover' }] },
    notfine: { text: ["...Really?",
      "...Dave’s not fine?",
      "Right. Right, that’s — honestly, that helps enormously and I’m aware of how bleak that is."],
      do() { Rel.add('mo', 4); Player.xp(50); Player.mod({ rep: 4 }); G.flags.moTalked = true; Ach.get('a_mo'); }, to: null },
    cover: { text: ["...You’d do that?",
      "...",
      "Right. Ten minutes. I’ll be on the step.",
      "...Thanks. Genuinely. I’ll get you back."],
      do() {
        Rel.add('mo', 5); Player.xp(60); Player.mod({ rep: 6, patience: -8 }); G.minutes += 10;
        G.flags.moTalked = true; Ach.get('a_mo'); Phones.ringRandom(true);
        UI.toast('📞', 'You take Mo’s queue for ten minutes. It is worse than yours. He has been doing this all week without saying anything.', 'bad');
      }, to: null },
    nice: { text: ["...Cheers. Nobody’s said anything like that today.", "Right. Back on the queue. Wave if it’s bad."],
      do() { Rel.add('mo', 2); Player.xp(10); Ach.get('a_kind'); }, to: null },
    dave: { text: ["Yeah.", "Yeah, alright.", "Honestly? Dave’s never once been upset. I could do worse."],
      do() { Rel.add('mo', 1); }, to: null }
  }
},
{
  id: 'colin', name: 'Colin', face: '🧑‍💼', role: 'Synergy',
  desk: [60, 6], colour: '#b48cff',
  schedule: [[540,'synergy'],[720,'breakTable'],[760,'synergy']],
  lines: ["Synergy.", "We’re aligning.", "There are four of us. There have always been four of us.", "Circling."],
  entry() { return G.flags.metColin ? 'again' : 'first'; },
  nodes: {
    first: { text: ["Hello. You’re not on the invite.", "...That’s alright. We can align.",
      "I’m Colin. Synergy."],
      choices: [
        { t: "What does the Synergy department do?", to: 'what' },
        { t: "How many people are in Synergy?", to: 'many' }] },
    what: { text: ["We identify opportunities for the business to work with itself.",
      "Last quarter we identified eleven.", "We are not permitted to say what they were."],
      do() { G.flags.metColin = true; P.stats.bullshit += 2; Player.xp(20); }, to: null },
    many: { text: ["Four.", "There have always been four of us.",
      "When one of us leaves, another one is already here. It’s very efficient."],
      do() { G.flags.metColin = true; P.stats.bullshit += 1; G.flags.colinCreepy = true; Player.xp(20); }, to: null },
    again: { text: () => pick([
      "We’re taking that offline.", "It’s been actioned.", "There is no meeting. There is only the invite.",
      "Have you met the spreadsheet? It’s met you."]),
      choices: [
        { t: "What do you mean, it’s met me?", to: 'met', if: () => Q.active('q_spreadsheet') },
        { t: "Right. Bye, Colin.", to: null }] },
    met: { text: ["Your handle time is 4 minutes 12. Your satisfaction is trending. Your utilisation is 61 per cent and it would like that to be higher.",
      "I didn’t look that up.", "It’s just — available. To me. Now."],
      do() { G.flags.colinSpread = true; Q.step('q_spreadsheet'); Sfx.bad(); }, to: null }
  }
},
{
  id: 'ron', name: 'Big Ron', face: '💂', role: 'Security · sees everything',
  /* Behind the counter, not in front of it. The counter stops people now, and
     it stopped Ron too — he spawned on the visitors' side and spent the
     morning shouldering his own desk. */
  desk: [30, 37], colour: '#ffb347',
  schedule: [[540,'lobby'],[720,'lobby'],[780,'lobby']],
  lines: ["Morning.", "Lanyard.", "In or out, don’t hover.", "Nothing happens in this lobby I don’t know about."],
  entry() { return G.flags.metRon ? 'again' : 'first'; },
  nodes: {
    first: { text: ["First day?"],
      choices: [{ t: "Yeah.", to: 'sorry' }, { t: "Is it that obvious?", to: 'obvious' }] },
    obvious: { text: ["You’re holding the lanyard like it’s a passport.", "First day?"], to: 'sorry' },
    sorry: { text: ["Sorry.", "...", "Fourth floor. Lifts are decorative, use the stairs, they’re quicker and they always will be.",
      "And listen — whatever they say up there, you get a full lunch. Full. Legally.",
      "They don’t tell the new ones that."],
      do() { G.flags.metRon = true; Player.xp(10); Rel.add('ron', 2); }, to: null },
    again: { text: () => pick([
      "Nobody’s left through that door before five in six years. Not once. Think about that.",
      "You look better than you did this morning. Marginally.",
      "There’s a man comes in at 3am. Says he’s IT. Isn’t IT."]),
      choices: [
        { t: "Who comes in at 3am?", to: 'threeam' },
        { t: "Can I just... leave? Now?", to: 'leave' },
        { t: "Alright, Ron.", to: null }] },
    threeam: { text: ["Badge says Synergy.", "There’s four of them and they come in one at a time and I have never once seen one leave."],
      do() { G.flags.ronThreeAM = true; Q.step('q_spreadsheet'); }, to: null },
    leave: { text: ["You can do what you like. Door’s there. It’s a job, not a submarine.",
      "But if you go now you’ll never know how it ends. And it does end. Something’s ending, I can feel it in the lifts."], to: null }
  }
},
{
  id: 'nigel', name: 'Nigel', face: '👔', role: 'Area Manager',
  desk: [46, 3], colour: '#ff5f56',
  schedule: [[540,'mgmt'],[660,'corridor'],[690,'mgmt'],[720,'breakTable2'],[780,'mgmt'],[900,'printer'],[930,'mgmt']],
  lines: ["Can I have a quick word?", "It’s not a criticism, it’s a conversation.", "I’m going to need you to be honest with me. Not too honest.", "Everything alright?"],
  entry() {
    if (G.flags.nigelBeaten) return 'beaten';
    if (!G.flags.metNigel) return 'first';
    return 'quickword';
  },
  nodes: {
    first: { text: ["Ah. New starter. Nigel. Area Manager. I’m across four sites and none of them are happy, which tells me the problem is systemic and therefore not mine.",
      "Everything alright?"],
      choices: [
        { t: "Yes, all good.", to: 'good' },
        { t: "Honestly? No.", to: 'honest' }] },
    good: { text: ["Good. Good.", "That’s what I like to hear and also what I’ve been told to hear."],
      do() { G.flags.metNigel = true; Player.xp(10); }, to: null },
    honest: { text: ["...Right. Yes. Well.", "I’ll be honest with you — I’m going to note that as ‘engaged with feedback culture’ and we’ll both move on.",
      "That’s not dismissiveness. That’s how it survives contact with a spreadsheet."],
      do() { G.flags.metNigel = true; Player.xp(20); Rel.add('nigel', 1); G.flags.nigelHint = true; }, to: null },
    quickword: { text: ["Can I have a quick word?"],
      choices: [
        { t: "Go on then.", to: 'meeting' },
        { t: "How quick?", to: 'howquick' },
        { t: "No.", to: 'no' },
        { t: "Nigel — who writes the KPI figures?", to: 'kpi' }] },
    howquick: { text: ["Four minutes. It’ll be twenty-five.", "It’s about your utilisation. Which is fine. Which is why we need to talk about it."],
      choices: [
        { t: "Fine. Meeting Room 2.", to: 'meeting' },
        { t: "Nigel — who writes the KPI figures?", to: 'kpi' },
        { t: "Another time.", to: null }] },
    meeting: { text: ["Lovely. Meeting Room 2 — I’ve got it booked till four, which tells you something.",
      "Shall we? It’s not a criticism. It’s a conversation."],
      done() { Combat.startBoss('nigel'); }, to: null },
    no: { text: ["...", "Nobody’s ever said no.", "I don’t have a process for no."],
      do() { G.flags.metNigel = true; Player.xp(30); P.stats.chaos += 2; Ach.get('a_no'); }, to: null },
    kpi: { text: ["I don’t write them. Karen doesn’t write them. Head office doesn’t write them.",
      "I asked, once, in 2022. I sent an email to the reporting mailbox.",
      "It replied in eleven seconds. At 3am. With a chart of my own performance.",
      "So no, I don’t ask any more. And neither should you, and I’m saying that as a friend, and we are not friends, and that’s a boundary I’m modelling."],
      do() { G.flags.metNigel = true; G.flags.nigelKPI = true; Q.step('q_spreadsheet'); }, to: null },
    beaten: { text: ["You went into the reporting dimension.", "...How were the numbers?", "...Were they mine?"], to: null }
  }
},
{
  id: 'alan', name: 'Alan', face: '🧓', role: 'Escalations · takes the ones nobody else can',
  desk: [37, 23], colour: '#5ad48a',
  schedule: [[540,'desk'],[610,'fireEsc'],[625,'desk'],[720,'step'],[755,'desk'],[880,'fireEsc'],[900,'desk']],
  lines: ["Mm. Yes. Go on.", "No, you’re quite right to be angry.", "I’ve got all day.", "Let’s start at the beginning.", "It’s not a technique. It’s just listening."],
  entry() {
    if (G.flags.complaintBeaten) return 'after';
    if (Q.active('q_complaint') && G.flags.readComplaint) return 'ready';
    if (Q.active('q_complaint')) return 'during';
    if (G.flags.metAlan) return 'again';
    return 'first';
  },
  nodes: {
    first: { text: ["Hello. Alan. Escalations.",
      "That means when a call has been through three people and got worse each time, it comes to me, and I say hello, and then I am quiet for eleven minutes."],
      choices: [
        { t: "Eleven minutes of nothing?", to: 'quiet' },
        { t: "How do you not lose your temper?", to: 'temper' },
        { t: "That sounds like the worst job here.", to: 'worst' }] },
    quiet: { text: ["Not nothing. Listening.",
      "There’s a difference between being quiet because you’ve run out of script and being quiet because you want them to keep going.",
      "They can hear which one it is. Everyone can. It’s the only thing on this floor that can’t be faked, and management have tried."],
      do() { G.flags.metAlan = true; P.stats.empathy += 2; Player.xp(25); UI.float("+2 Empathy", '#5ad48a'); }, to: 'offer' },
    temper: { text: ["Oh, I do. Constantly. On the inside I am a bin fire.",
      "The trick isn’t not feeling it. The trick is knowing it’ll pass in ninety seconds and they’ll still be there in ninety-one, so you might as well use the time."],
      do() { G.flags.metAlan = true; P.stats.patience += 2; Player.xp(25); }, to: 'offer' },
    worst: { text: ["It’s the best one. Genuinely.",
      "Everyone else gets forty short conversations where nobody says anything true. I get four long ones where somebody eventually does.",
      "Last week a man shouted at me for nine minutes about a router and then told me his wife had died in March. The router was fine. The router was never the thing. The router is never the thing."],
      do() { G.flags.metAlan = true; P.stats.empathy += 2; Player.xp(35); Rel.add('alan', 2); Ach.get('a_alan'); }, to: 'offer' },
    offer: { text: ["Anyway. You’ll be sent to me eventually and I’d rather we’d met.",
      "There’s a formal complaint in the tray with your floor’s name on it. Not yours specifically. Yet.",
      "Fancy it? You’d learn more in twenty minutes than in a month of induction, and Janet would agree with me, which she’d hate."],
      choices: [
        { t: "Give me the complaint.", to: 'quest' },
        { t: "Absolutely not.", to: 'no' }] },
    quest: { text: ["Good. It’s in the red tray on my desk. Read it properly — all of it, including the dates.",
      "Then come back and we’ll take it together. I’ll be on the line. I won’t say anything. That is the entire point of me."],
      do() { Q.start('q_complaint'); }, to: null },
    no: { text: ["Fair enough. It’ll still be there.", "They always are. That’s the reassuring bit and the other bit."], to: null },
    during: { text: ["Red tray. On my desk. All of it, including the dates."],
      choices: [{ t: "What am I looking for in the dates?", to: 'dates' }, { t: "Right.", to: null }] },
    dates: { text: ["How long they waited between each contact. That’s where the anger actually lives.",
      "Nobody is furious about a broadband fault. People are furious about eleven days of silence with a broadband fault in it."], to: null },
    ready: { text: ["You’ve read it.", "Then you know it isn’t about the £38.",
      "Right. I’ll dial. You talk. I’ll be here, saying nothing, which you will find enormously annoying and enormously helpful."],
      choices: [
        { t: "Let’s take it.", to: null, do() { setTimeout(() => Combat.startBoss('complaint'), 400); } },
        { t: "Give me five minutes.", to: null }] },
    after: { text: ["That was a good call.",
      "Not a good outcome — the outcome was always going to be a partial refund and an apology. A good call.",
      "You’ll get about one a fortnight. Bank them. They’re the wage."],
      do() { Rel.add('alan', 2); }, to: null },
    again: { text: () => pick([
      "Somebody’s just been transferred to me with the words ‘good luck’. Lovely.",
      "Nine minutes of shouting, then: ‘sorry, I’ve had a week’. Every time. Every single time.",
      "If you ever hear yourself say ‘as I’ve already explained’, stop, and have a biscuit, and start again.",
      "I’ve got a man on hold who’s been rehearsing since Tuesday. I’m going to let him do the whole thing.",
      "Nobody rings a call centre because their day is going well."]),
      choices: [
        { t: "Teach me something.", to: 'lesson' },
        { t: "Have you ever actually lost it?", to: 'lost' },
        { t: "Just saying hello.", to: 'hello' }] },
    lesson: { text: () => pick([
      "Say their name once. Not four times, that’s a technique and they can smell it. Once, at the point it stops being a transaction.",
      "Never say ‘calm down’. Nobody in the history of the species has calmed down.",
      "‘I don’t know, but I’ll find out and I’ll ring you back at four’ — and then ring at four. That’s it. That’s the whole of trust.",
      "If you have to give bad news, give it in the first thirty seconds. Making them wait for it is the cruelty, not the news."]),
      do() { P.stats.empathy += .5; P.stats.patience += .5; Player.xp(10); }, to: null },
    lost: { text: ["Once. 2018.", "A man was rude about a colleague of mine who was, at that moment, standing next to me, hearing it.",
      "I said something short and true and I put the phone down and I went outside and sat on the step for an hour and nobody came to get me.",
      "Karen wrote it up as ‘call quality incident’. Nigel wrote it up as ‘resolved locally’. Sandra wrote it up as ‘correct’.",
      "That’s the only time anyone in this building has agreed on anything."],
      do() { Rel.add('alan', 3); Player.xp(40); G.flags.alanStory = true; }, to: null },
    hello: { text: ["Hello.", "...", "Go on then. Off you go. The phones aren’t going to ignore themselves."],
      do() { Rel.add('alan', 1); Player.mod({ patience: 8 }); }, to: null }
  }
},
{
  id: 'sandra', name: 'Sandra', face: '👩‍⚖️', role: 'Quality & Compliance · has heard you',
  desk: [29, 27], colour: '#b48cff',
  schedule: [[540,'desk'],[600,'booth'],[660,'desk'],[720,'breakTable'],[760,'booth'],[840,'desk'],[930,'booth']],
  lines: ["I’m scoring, not judging.", "It’s a framework, not an opinion.", "You did say ‘no worries’ eleven times.", "That was a good call, actually."],
  entry() {
    if (Q.complete2('q_survey')) return 'after';
    if (Q.active('q_survey')) return 'during';
    if (G.flags.metSandra) return 'again';
    return 'first';
  },
  nodes: {
    first: { text: ["Hello. Sandra. Quality and Compliance.",
      "I listen to six of your calls a month and score them against nineteen criteria, one of which is ‘used the customer’s name appropriately’, and none of which is ‘solved the problem’."],
      choices: [
        { t: "None of them is ‘solved the problem’?", to: 'solved' },
        { t: "Have you listened to any of mine yet?", to: 'mine' },
        { t: "Please don’t listen to any of mine.", to: 'please' }] },
    solved: { text: ["Correct. That’s measured elsewhere, by someone else, against a different target, and the two are never compared.",
      "I have raised this. I raise it annually. It is minuted annually. It is a lovely tradition and we should probably get a cake for it."],
      do() { G.flags.metSandra = true; Player.xp(20); Rel.add('sandra', 1); }, to: 'brief' },
    mine: { text: ["Two. Yesterday’s.",
      "You were kind to a confused gentleman and you scored 71%, because you didn’t brand the call at the opening and you said ‘bear with’ instead of ‘thank you for holding’.",
      "It was one of the best calls I have heard this month. It scored 71%. I want you to hold both of those facts at once, because that is the job."],
      do() { G.flags.metSandra = true; Player.xp(30); Rel.add('sandra', 2); Ach.get('a_sandra'); }, to: 'brief' },
    please: { text: ["I have to. Nineteen criteria. It’s not personal, it’s statutory.",
      "...I do skip past the bits where you swear at the screen after the call ends. That isn’t in the framework and it isn’t anybody’s business."],
      do() { G.flags.metSandra = true; Rel.add('sandra', 3); Player.xp(25); }, to: 'brief' },
    brief: { text: ["Now. A favour, and it’s a real one.",
      "The satisfaction survey. We ask every caller to stay on the line and press 1 to 5. Almost nobody does. Our CSAT is built on about four responses a week and one of those is a man who presses 1 for everything as a hobby.",
      "Get me one. One genuine completed survey, from a caller who actually wanted to give it. Then I can show a real number to a real person and something might, conceivably, change."],
      choices: [
        { t: "I’ll get you a survey.", to: 'accept' },
        { t: "How do I get someone to do a survey?", to: 'how' }] },
    how: { text: ["Be good at the call. Then ask. Properly — not the script line.",
      "‘There’s a short survey at the end. It genuinely comes to me and I genuinely read it.’ That’s all. It works about one time in nine."], to: 'accept' },
    accept: { text: ["Resolve a call well — really well, with something of yourself left in it — and ask them.",
      "Come and find me when you’ve got one."],
      do() { Q.start('q_survey'); }, to: null },
    during: { text: ["Any luck with the survey?",
      "It’s harder than it sounds. It sounds like nothing. It’s the hardest metric in the building because it’s the only one you can’t manufacture."],
      choices: [
        { t: "I’ve got one for you.", to: 'got', if: () => surveyReady() },
        { t: "Not yet.", to: null }] },
    got: { text: ["Go on.", "...",
      "‘5. The lady on the phone actually listened. First time in three weeks anyone has. Thank her.’",
      "It says ‘the lady’. It’s you. They never know. They never, ever know.",
      "Right. This is going in front of Nigel on Thursday, printed, in colour, on its own slide."],
      do() { Q.complete('q_survey'); Ach.get('a_survey'); Rel.add('sandra', 3); }, to: null },
    after: { text: () => pick([
      "Your survey is on slide 4. Nigel called it ‘anecdotal’. I called it ‘data’. We’re both right and only one of us is annoyed.",
      "I scored you 68% this week and you deserved 90 and I want you to know I know that.",
      "Somebody used the phrase ‘as per my previous’ on a live call. I have had to write a note."]),
      choices: [
        { t: "What’s the nineteenth criterion?", to: 'nineteen' },
        { t: "Fine, Sandra.", to: null }] },
    nineteen: { text: ["‘Left the customer feeling valued.’",
      "There is no way to measure it, so I mark it by ear, so it is the only honest score in the building, so obviously it is the one they want to automate.",
      "They asked me last month whether the model could do it. I said the model can detect whether you said the word ‘value’.",
      "They wrote that down as a yes."],
      do() { G.flags.sandraModel = true; if (Q.active('q_spreadsheet')) Q.step('q_spreadsheet'); Player.xp(25); }, to: null },
    again: { text: () => pick([
      "I’m scoring, not judging. I say that so often I’ve started saying it to my family.",
      "Nineteen criteria. Nineteen. There used to be six and everybody was better at their job.",
      "The framework was written in 2011 by a consultancy that no longer exists. We renew it annually. We renew it in memory of them, essentially."]),
      choices: [
        { t: "Score me now. Be honest.", to: 'score' },
        { t: "Carry on.", to: null }] },
    score: { text: () => pick([
      "Warmth: good. Pace: fast — you rush the endings because you want the call over, and they can hear it.",
      "You apologise too early. Apologise once, at the right moment, and mean it. Four sorries is just noise with a face on it.",
      "You’re better than you were on Monday, and Monday was your first day, so that is either enormous progress or a very low bar and I decline to say which."]),
      do() { P.stats.empathy += .5; Player.xp(15); }, to: null }
  }
},
{
  id: 'fiona', name: 'Fiona', face: '👩‍🦳', role: 'People Partner · 0.6 FTE · the entire People Team',
  desk: [26, 12], colour: '#ffb347',
  schedule: [[540,'hrCorner'],[620,'corridor'],[660,'hrCorner'],[720,'breakTable2'],[780,'meetRoom'],[840,'hrCorner'],[930,'lobby']],
  lines: ["I’m only in Tuesdays and Thursdays.", "That’s a conversation for your line manager.", "I don’t have an office, no.", "Have you done your 30/60/90?"],
  entry() {
    if (G.flags.fionaPlan) return 'after';
    if (G.flags.metFiona) return 'again';
    return 'first';
  },
  nodes: {
    first: { text: ["Oh — hello! You’re the new starter. Fiona. People Partner.",
      "I’m the People Team. All of it. Point six of a full-time equivalent, which means I am, mathematically, three fifths of a person, and I feel it."],
      choices: [
        { t: "Where’s your office?", to: 'office' },
        { t: "What does a People Partner actually do?", to: 'do' },
        { t: "Point six of a person is a strange thing to say out loud.", to: 'strange' }] },
    office: { text: ["This is it. This chair, this bit of corridor, and a laptop I carry in a bag for life.",
      "HR used to have a room. It became a store room, then a Wellbeing Room, and I got a chair by a window that doesn’t open.",
      "People do still tell me things. They tell me more here, actually. Nobody has to be seen going into a room."],
      do() { G.flags.metFiona = true; Player.xp(20); Rel.add('fiona', 1); }, to: 'plan' },
    do: { text: ["Two things, honestly.",
      "One: I make sure the company doesn’t do anything illegal, which takes about a day a month and is mostly saying ‘no, Nigel’.",
      "Two: I sit with people on the worst day of their working life and I am the only person in the building whose job that is, and it is not in my objectives, and it is nearly all of the job."],
      do() { G.flags.metFiona = true; Player.xp(30); Rel.add('fiona', 2); Ach.get('a_fiona'); }, to: 'plan' },
    strange: { text: ["...Yes. It is.",
      "I was full-time until 2021. They didn’t make me part-time, they made the role part-time, which is different, apparently, in a way that took forty minutes to explain and no minutes to understand."],
      do() { G.flags.metFiona = true; Player.xp(25); Rel.add('fiona', 2); }, to: 'plan' },
    plan: { text: ["Now — housekeeping. Your 30/60/90 day plan is due Friday.",
      "It asks what you want to achieve in your first thirty, sixty and ninety days. Nobody reads it. I file it. It is filed forever."],
      choices: [
        { t: "What should I put?", to: 'what' },
        { t: "What did other people put?", to: 'others' },
        { t: "I’ll do it tonight. (You will not.)", to: 'later' }] },
    what: { text: ["Something achievable in thirty, something ambitious in sixty, and something in ninety you can quietly abandon.",
      "That’s not cynicism, that’s just how ninety-day plans work, and everybody who reads them knows it, and nobody reads them."],
      do() { G.flags.fionaPlan = true; P.stats.bullshit += 2; Item.give('form'); Player.xp(25); }, to: null },
    others: { text: ["Dave wrote ‘answer the phones’ in all three boxes. In 2008. It is still on file.",
      "Gary wrote ‘progress into a leadership position’, which was ambitious, and then he wrote it again the following year, and the year after.",
      "Kevin wrote ‘find my headset’ and I assumed it was a joke and I have recently learned that it was not."],
      do() { G.flags.fionaPlan = true; Item.give('form'); Player.xp(35); Rel.add('fiona', 1); }, to: null },
    later: { text: ["You will not.", "That’s fine. Nobody does. I put ‘submitted’ in the tracker on the Friday regardless, for everybody, and I have done for four years.",
      "Do not tell Nigel. He would call it a control weakness. It is the single kindest system in this company."],
      do() { G.flags.fionaPlan = true; Rel.add('fiona', 3); Player.xp(30); Ach.get('a_plan'); }, to: null },
    again: { text: () => pick([
      "I’m only in Tuesdays and Thursdays. It is Tuesday, or Thursday, or you are imagining me.",
      "Somebody has raised a grievance about a chair. I want you to know it is a good grievance and I am taking it seriously.",
      "The exit interview form has nine questions and the last one is ‘would you recommend CALLHALL as an employer?’ and I have stopped reading the answers.",
      "If anyone ever tells you HR is not your friend — they’re right, technically, and I would still like you to come and talk to me."]),
      choices: [
        { t: "What happened to HONESTY on the Wall of Values?", to: 'honesty', if: () => G.flags.metFiona },
        { t: "Can I ask you something off the record?", to: 'offrecord' },
        { t: "Nothing, just saying hello.", to: null }] },
    honesty: { text: ["Ah. You’ve seen the paint.",
      "It came down in 2019, three weeks after a staff survey in which ninety-one per cent of people said they did not feel able to speak honestly.",
      "The decision, and I am quoting the minute, was to ‘remove the value to avoid dissonance with lived experience’.",
      "They took the word off the wall instead of the thing off the floor. I keep the minute. I keep a lot of minutes."],
      do() { G.flags.knowHonesty = true; Player.xp(45); Rel.add('fiona', 2); Ach.get('a_honesty'); P.stats.knowledge += 1; }, to: null },
    offrecord: { text: ["Nothing is off the record. I have to say that. It is the first thing they teach you and it is the worst sentence in the language.",
      "...Go on though."],
      choices: [
        { t: "Is this a normal place to work?", to: 'normal' },
        { t: "Should I leave?", to: 'leave' }] },
    normal: { text: ["Yes.", "...", "That’s the answer that upsets people. Yes. It is entirely normal.",
      "There are four hundred buildings like this one within an hour of here, and the printer is broken in every single one of them, and in every single one there is a Terry, and a step outside where the real conversations happen."],
      do() { Player.xp(30); }, to: null },
    leave: { text: ["I can’t answer that and you know I can’t.",
      "What I will say is: people who leave here mostly go somewhere with better chairs and the same phone calls. And people who stay mostly stay for the person sitting next to them.",
      "Neither of those is a bad reason. Just know which one you’re using."],
      do() { Rel.add('fiona', 2); Player.xp(35); G.flags.fionaAdvice = true; }, to: null },
    after: { text: () => pick([
      "Your 30/60/90 is filed. It is in a folder. The folder is in a folder.",
      "Somebody has asked whether the Wellbeing Room can be booked as a meeting room. I have said no. It is the only no I have won this quarter.",
      "Tuesdays and Thursdays. Write it down. Everybody asks me on a Wednesday."]),
      choices: [
        { t: "What happened to HONESTY on the Wall of Values?", to: 'honesty', if: () => !G.flags.knowHonesty },
        { t: "Thanks, Fiona.", to: null, do() { Rel.add('fiona', 1); } }] }
  }
},
{
  id: 'tomasz', name: 'Tomasz', face: '🧑‍🍳', role: 'Agency · 3-month contract (since 2019)',
  desk: [21, 23], colour: '#4da3ff',
  schedule: [[540,'desk'],[600,'desk'],[720,'fireEsc'],[750,'desk'],[860,'coffee'],[880,'desk']],
  lines: ["I don’t get the emails.", "I’m agency, so.", "It’s fine. It’s a job.", "Do not ask me about the pension.", "I have no lanyard. Nobody has noticed."],
  entry() {
    if (Q.active('q_recurring') && G.flags.sawChair && !G.flags.knowTuesday) return 'tuesday';
    if (Q.complete2('q_recurring')) return 'settled';
    return G.flags.metTomasz ? 'again' : 'first';
  },
  nodes: {
    first: { text: ["Hello. Tomasz. I am agency.",
      "This means I do the same job as you, at the next desk, for less money, and I do not exist on the intranet."],
      choices: [
        { t: "How long have you been here?", to: 'long' },
        { t: "You don’t exist on the intranet?", to: 'intranet' },
        { t: "That’s not right.", to: 'notright' }] },
    long: { text: ["Six years.", "On a three-month contract.",
      "It is renewed every three months by an email from an agency, which arrives, on average, four days after it has expired.",
      "For four days, four times a year, I am here voluntarily. Those are my favourite days. I do exactly the same work and I feel like a ghost with opinions."],
      do() { G.flags.metTomasz = true; Player.xp(30); Rel.add('tomasz', 2); Ach.get('a_tomasz'); }, to: 'best' },
    intranet: { text: ["No. No photograph, no profile, no birthday in the calendar.",
      "I do not get the all-staff emails. I have never received a single one. For six years.",
      "It is, and I want to be clear about this, the greatest privilege available in this company. Karen would kill for it."],
      do() { G.flags.metTomasz = true; Player.xp(25); Rel.add('tomasz', 1); }, to: 'best' },
    notright: { text: ["No.", "...", "It is not right. It is legal, which is a different word that people use when they mean right.",
      "Thank you for saying it. Most people say ‘oh, agency, right’ and then look at their screen."],
      do() { G.flags.metTomasz = true; Player.xp(35); Rel.add('tomasz', 3); }, to: 'best' },
    best: { text: ["Anyway. Practical matters. I am the best agent on this floor.",
      "This is not arrogance, it is Sandra’s spreadsheet. Highest resolution, lowest escalation, best surveys.",
      "I am also the only one who cannot be promoted, because I am not staff, so my scores go into the site average and make everybody else look better. It is a beautiful system. I admire it the way you admire a shark."],
      choices: [
        { t: "Teach me how you do it.", to: 'teach' },
        { t: "Why are you still here?", to: 'why' }] },
    teach: { text: ["Two things and they are both boring.",
      "One: I read the whole account before I speak. Every time. It costs forty seconds and saves nine minutes.",
      "Two: I never say ‘I’ll try’. I say what I will do and when, or I say I cannot. People do not want hope. They want a time."],
      do() { P.stats.knowledge += 2; P.stats.patience += 1; Player.xp(30); UI.float("+2 Knowledge", '#4da3ff'); }, to: null },
    why: { text: ["The people.", "That is the whole answer and it is embarrassing and it is true.",
      "Marjorie gave me a mug. Not a mug to use. A mug. Mine. On the shelf, with the fourteen.",
      "You do not leave a building where somebody has given you a mug."],
      do() { Rel.add('tomasz', 3); Rel.add('marjorie', 1); Player.xp(40); G.flags.tomaszMug = true; }, to: null },
    /* The payoff. He is not lonely at you and he does not want rescuing: he is
       precise about it, the way he is precise about everything, and that is
       what makes it land. */
    tuesday: { text: ["You have been in the room.",
      "I know because the chair is pushed in and I do not push it in. I leave it out. It is the only thing in this building that is where I left it."],
      choices: [
        { t: "You go every week.", to: 'everyweek' },
        { t: "Tomasz — nobody else is coming.", to: 'nobody' },
        { t: "Sorry. I’ll put it back.", to: 'putback' }] },
    putback: { text: ["...Thank you.",
      "That is a strange thing to be thanked for. I am aware. Sit down, I will tell you, and then you will go and do whatever it is you have been sent to do."],
      do() { Rel.add('tomasz', 2); P.stats.empathy += 1; }, to: 'everyweek' },
    nobody: { text: ["No.",
      "I know that. I have known that since the third week. I am agency, I am not stupid, those are different things although the building often gets them confused."],
      do() { Rel.add('tomasz', 1); }, to: 'everyweek' },
    everyweek: { text: ["Two hundred and eleven Tuesdays.",
      "In 2022 an invitation arrived. FLOOR 4 CATCH-UP, oh eight hundred, recurring. It came to a list I was on, briefly, before somebody tidied the lists.",
      "It is the only invitation I have ever received from this company. Not the only meeting — I am told about meetings, in corridors. The only invitation.",
      "So on Tuesday I come in at half seven, and I write an agenda, because if you are going to hold a meeting you hold a meeting, and at eight I sit down."],
      choices: [
        { t: "And then what?", to: 'thenwhat' },
        { t: "Four years, on your own, in a room.", to: 'ownroom' }] },
    thenwhat: { text: ["Then, for half an hour, I am a person who was invited to something.",
      "At half past I wash the cup and I put the marker back and I go to my desk and I am agency again until the following Tuesday.",
      "It is not sad. Everybody makes the face you are making. It is not sad. It is thirty minutes a week that were given to me by an administrative error, and I have never missed one, and I never will."],
      do() { G.flags.knowTuesday = true; Rel.add('tomasz', 3); Player.xp(90);
        P.stats.empathy += 2; Player.mod({ rep: 6 }); Q.step('q_recurring');
        UI.objective('Tell Karen what to do about the 08:00.'); }, to: 'dontdelete' },
    ownroom: { text: ["On my own in a room with the door shut and an agenda I wrote, yes.",
      "You are thinking: that is a man who has lost it slightly. Perhaps. But consider the alternative, which is a man who checks his calendar on a Monday night and there is nothing in it at all.",
      "I know which of those two men I would rather be, and I have been both."],
      do() { G.flags.knowTuesday = true; Rel.add('tomasz', 3); Player.xp(90);
        P.stats.empathy += 2; Player.mod({ rep: 6 }); Q.step('q_recurring');
        UI.objective('Tell Karen what to do about the 08:00.'); }, to: 'dontdelete' },
    dontdelete: { text: ["Now. You have been sent by Karen, because Karen has finally said out loud the thing she booked in 2022, and you are going to go back to her.",
      "I am not going to ask you for anything. I want to be clear. I have never asked anybody in this building for anything and I am not going to start with a room.",
      "...",
      "But you know now. So whatever happens next, it happens with somebody knowing. That is already more than I had on Monday."],
      do() { Rel.add('tomasz', 2); }, to: null },
    settled: { text: () => {
        const out = (G.quests.q_recurring || {}).out;
        if (out === 'attends') return pick([
          "She came. Eight o’clock, with pastries, like it was 2022.",
          "We did the agenda. All three items. Item three was not “nothing” this week.",
          "I have added her to the invitation properly. She is now an attendee of her own meeting. I have not told her that this is funny.",
          "Two hundred and twelve Tuesdays. The first one with somebody in it."]);
        if (out === 'audit') return pick([
          "There was a change reference. I read it. It was very well written.",
          "It is fine. It was an administrative error and it has been administratively corrected. That is the correct outcome and I am not going to say anything else about it.",
          "My calendar is empty now. It is very tidy. Everybody says how tidy it is. Nobody says that. I am being unpleasant. Sorry."]);
        if (out === 'deleted') return pick([
          "It went on a Thursday. I saw it disappear while I was looking at it.",
          "Do not apologise. You were asked to do a thing and you did the thing. That is the job.",
          "I still come in at half seven on a Tuesday. Habit. I sit at my desk instead. It is fine. It is a desk."]);
        return pick([
          "It is still there. Tuesday. Eight o’clock.",
          "You did not delete it. I noticed on the Tuesday, when it did not not-happen.",
          "I do not know what you said to her and I am not going to ask. Thank you for the thing I am not asking about."]);
      }, to: null },
    again: { text: () => pick([
      "There was a fire drill. I was not on the list. I stood outside anyway, next to the list, being warm.",
      "Christmas party: staff only. I went. Nobody checked. Ron held the door for me and said ‘alright, Tomasz’.",
      "Somebody asked me today how long I have been ‘covering’. Six years. Six years of covering.",
      "My contract is renewed on Friday. It is always renewed. I still do not sleep on Thursday.",
      "You get a pay review. I get an email that says the rate is unchanged. It is the same email. I have eleven of them."]),
      choices: [
        { t: "Have you asked to go permanent?", to: 'perm' },
        { t: "Want a coffee? My round.", to: 'coffee', if: () => P.money >= 1 },
        { t: "See you, Tomasz.", to: null }] },
    perm: { text: ["Four times. Each time there is a freeze.",
      "The freeze has been on since 2019. It is not a freeze, it is a climate.",
      "Karen has supported it every time, genuinely, in writing. It goes to Nigel, who supports it, genuinely, in writing. Then it goes to the numbers, and the numbers say no.",
      "Nobody says no. The numbers say no. You cannot argue with a number, there is nobody in it."],
      do() { Player.xp(30); G.flags.tomaszFreeze = true; if (Q.active('q_spreadsheet')) Q.step('q_spreadsheet'); }, to: null },
    coffee: { text: ["...Yes. Alright. Yes.", "Nobody buys the agency a coffee. I want you to know I have noticed and I will remember this for years."],
      do() { Player.mod({ money: -1 }); Rel.add('tomasz', 4); Player.xp(35); Ach.get('a_round'); Player.mod({ rep: 4 }); }, to: null }
  }
},
{
  id: 'bev', name: 'Bev', face: '👩‍🔧', role: 'Cleaning · in at six · sees everything',
  desk: [9, 18], colour: '#5ad48a',
  schedule: [[540,'kettle'],[560,'corridor'],[600,'trolleyPark'],[660,'looSink'],[720,'breakTable'],[780,'archive'],[860,'corridor'],[920,'tin']],
  lines: ["Mind your feet, love.", "I’ve done that floor twice.", "Six o’clock start, me.", "I know whose that is.", "Don’t worry about it, I’ll get it."],
  entry() {
    if (Q.active('q_recurring') && G.flags.oneAttendee && !G.flags.bevTuesday) return 'tuesday';
    if (Q.complete2('q_bev')) return 'after';
    if (Q.active('q_bev')) return 'during';
    if (G.flags.metBev) return 'again';
    return 'first';
  },
  nodes: {
    first: { text: ["Mind your feet, love, I’ve done that bit.",
      "Bev. I do this floor and the fourth. Six till nine, then two till four. You’ll not see me much in between, I’m at the school."],
      choices: [
        { t: "Six in the morning?", to: 'six' },
        { t: "What’s it like in here at six?", to: 'sixlike' },
        { t: "Sorry — I’ll walk round.", to: 'round' }] },
    six: { text: ["Six. Lights on, kettle on, radio on till the first one comes in at half seven.",
      "Best three hours in this building and there’s nobody in it. That’s not a coincidence, that’s the finding."],
      do() { G.flags.metBev = true; Player.xp(20); Rel.add('bev', 1); }, to: 'know' },
    sixlike: { text: ["Quiet. Warm. The phones aren’t on yet, so the whole floor just — hums.",
      "You can hear the building. It’s got a note. Low one. Same note every morning.",
      "...Except Tuesdays. Tuesdays it’s a different note and I don’t like Tuesdays."],
      do() { G.flags.metBev = true; Player.xp(30); Rel.add('bev', 2); G.flags.bevNote = true; }, to: 'know' },
    round: { text: ["Ooh, he walks round. He walks ROUND.",
      "Nobody walks round, love. Four hundred people in this building and you’re the second in nine years."],
      do() { G.flags.metBev = true; Player.xp(30); Rel.add('bev', 3); Player.mod({ rep: 3 }); Ach.get('a_bev'); }, to: 'know' },
    know: { text: ["Right. Since you’re alright — I’ll tell you how it works.",
      "I do the bins. That means I know who eats at their desk, who cries in the accessible toilet, who’s job-hunting on the printer, and who’s been in at three in the morning.",
      "I don’t say anything. Ever. But I know."],
      choices: [
        { t: "Who’s in at three in the morning?", to: 'threeam' },
        { t: "You’re not going to tell me any of it, are you.", to: 'notell' }] },
    notell: { text: ["Not a word.", "That’s why they tell me things. That’s the whole trick and it isn’t a trick."],
      do() { Rel.add('bev', 2); }, to: null },
    threeam: { text: ["...Hm.", "Right. You’ll not laugh?",
      "There’s a fella comes in about three. Badge says Synergy. Suit. Very polite, holds the door.",
      "I’ve seen him four times. Four different times, four different men, and here’s the thing — same face.",
      "And they never leave. I’m here till nine and I never see one leave and I’m by the door.",
      "So. If you want to know what’s in this building, don’t ask upstairs. Ask the bins. Come with me tomorrow at six and I’ll show you what I empty out of that little room."],
      do() { Q.start('q_bev'); G.flags.bevThreeAM = true; Player.xp(50); if (Q.active('q_spreadsheet')) Q.step('q_spreadsheet'); }, to: null },
    /* Bev's Tuesday note is set up in `sixlike` and never explained. This is
       the explanation — and she still cannot give you the name, because she is
       on the fourth floor by eight and because she does not say things. */
    tuesday: { text: ["Tuesdays.", "You’ve come to ask me about Tuesdays.",
      "I told you the building makes a different note on a Tuesday and you’ve gone away and thought about it. Nobody thinks about what I say. Sit down. Well — stand down. You can’t sit, I’ve done that chair."],
      choices: [
        { t: "What’s the note?", to: 'note' },
        { t: "Who’s in here on a Tuesday morning?", to: 'whoin' }] },
    note: { text: ["It’s a door. That’s all it is, when you work it out — it’s a door being shut at ten to eight when every other door in this building is open.",
      "Meeting Room 2. Ten to eight, every Tuesday, since about 2022.",
      "And I don’t like it, and I’ll tell you exactly why I don’t like it: because it shuts, and then nothing happens. No talking. Four years and I’ve never once heard talking."],
      do() { G.flags.bevTuesday = true; Player.xp(30); Rel.add('bev', 1); Q.step('q_recurring'); }, to: 'chair' },
    whoin: { text: ["I’m up on the fourth by half seven, love, so I only get the door.",
      "But I do that room out on a Tuesday dinnertime, and I’ll tell you what I find, every week, without fail."],
      do() { G.flags.bevTuesday = true; Player.xp(30); Rel.add('bev', 1); Q.step('q_recurring'); }, to: 'chair' },
    chair: { text: ["One chair pulled out. Not eight. One.",
      "One cup, washed up and turned over on the drainer, which nobody in this building has ever done in their lives.",
      "And the marker back in the tray with the lid on.",
      "Whoever it is tidies up after himself in a room he’s sat in on his own. That’s not a meeting, love. That’s a man keeping an appointment."],
      do() { Player.xp(20); P.stats.empathy += 1; Rel.add('bev', 1); }, to: null },
    during: { text: ["You want to see the Synergy bin.",
      "It’s in the corridor cupboard by my trolley — I bag it separate because it’s never got anything in it worth bagging and yet it’s always full.",
      "Go on. Have a look in the bag. I’ll be over here, seeing nothing."],
      /* She has offered it, so the bag is the job now. Flagged because this is
         her entry node while the job is open and you can walk off and come
         back — and a step that re-announces itself every time reads as the
         tracker having lost its place. */
      do() { if (!G.flags.bevOffered) { G.flags.bevOffered = true; Q.step('q_bev'); } },
      choices: [
        { t: "Look in the bag.", to: 'bag' },
        { t: "Actually, no.", to: null }] },
    bag: { text: ["...",
      "It’s all printouts. Same page, over and over. Hundreds of them.",
      "Each one’s a single row from a spreadsheet, printed on its own sheet, with a name on it. Staff names. Handle time, satisfaction, utilisation.",
      "Yours is in there. Dated three weeks before you started.",
      "And underneath the lot, at the bottom of the bag: one page with no name on it at all, just a row of figures and, at the end, in the last column, the word AVAILABLE."],
      do() { Q.complete('q_bev'); Player.xp(60); Sfx.bad(); FX.shake(6); G.flags.bevBag = true; if (Q.active('q_spreadsheet')) Q.step('q_spreadsheet'); Item.give('printout'); }, to: null },
    after: { text: () => pick([
      "I put the bag back exactly as it was. Force of habit. Same as you did with that printer plug, I expect.",
      "You’ve gone quiet on me since the bag. That’s alright. Everybody does.",
      "I still do that little room. Somebody’s got to. It’s on the list."]),
      choices: [
        { t: "Bev — does it ever frighten you?", to: 'frighten' },
        { t: "Alright, Bev.", to: null }] },
    frighten: { text: ["No, love.", "It’s a building. I’ve cleaned a hospital.",
      "Whatever’s in that room, it’s never once put a cup in the sink or blocked a toilet, and until it does, it’s the best-behaved thing on this floor."],
      do() { Rel.add('bev', 2); Player.mod({ patience: 12 }); Player.xp(25); }, to: null },
    again: { text: () => pick([
      "Somebody’s put a teabag in the recycling. I know who. I’ve known for a year.",
      "There’s a lad on the fourth floor cries Tuesdays. I leave a cup of tea on his desk Wednesdays. He’s never said. I’ve never said.",
      "You lot leave your screens on. Every night. Forty screens, all night, saying WELCOME to nobody.",
      "That plant on the main floor’s dying because Terry’s schedule is wrong and he won’t be told. I water it Fridays. Don’t you dare.",
      "I’ve been in this building longer than everyone except Terry and nobody’s ever asked me anything about it till you."]),
      choices: [
        { t: "What’s the worst thing you’ve ever found?", to: 'worst' },
        { t: "Can I do anything to make your job easier?", to: 'help' },
        { t: "Alright, Bev.", to: null }] },
    worst: { text: ["Resignation letters. In the bin. Written, printed, not handed in.",
      "I’ve found eleven. Eleven people sat here and wrote the whole thing and then binned it and stayed.",
      "That’s the worst thing in this building. Not the mouse. Not the fridge. That."],
      do() { Player.xp(35); Rel.add('bev', 1); G.flags.bevLetters = true; }, to: null },
    help: { text: ["Push your chair in. That’s it. That’s the whole list.",
      "Forty chairs. If they’re pushed in I do the floor in twenty minutes. If they’re not it’s an hour and I don’t get the hour back."],
      do() { G.flags.pushChairs = true; Player.mod({ rep: 4 }); Rel.add('bev', 3); Player.xp(25); Ach.get('a_chairs'); UI.toast('🪑', 'You will push your chair in every day for the rest of your life now. Bev has done this to you deliberately.', 'gold'); }, to: null }
  }
},
{
  id: 'marcus', name: 'Marcus', face: '🧔‍♂️', role: 'Agent · it is, apparently, his birthday',
  desk: [45, 31], colour: '#ffb347',
  schedule: [[540,'desk'],[720,'desk'],[780,'desk'],[900,'desk']],
  lines: ["...", "Morning.", "It’s fine.", "No, nobody’s said anything.", "I did get the card, yeah."],
  entry() {
    if (G.flags.marcusResolved) return 'after';
    /* Meeting him comes first, whatever else is true. The job can be started
       from the card without ever having spoken to him, and this used to send
       that player straight to `during` — "...Nobody's ever gone on about the
       card before", said to somebody he has not met. */
    if (!G.flags.metMarcus) return 'first';
    if (Q.active('q_marcus') && G.flags.signedCard) return 'reveal';
    if (Q.active('q_marcus')) return 'during';
    return 'again';
  },
  nodes: {
    first: { text: ["Oh — hiya.", "...", "Sorry, did you need something? Nobody usually comes down this end."],
      choices: [
        { t: "Sorry — what’s your name?", to: 'name' },
        { t: "How long have you worked here?", to: 'howlong' },
        { t: "Just doing a lap. Ignore me.", to: 'lap' }] },
    name: { text: ["Marcus.", "...", "Marcus. It’s — there’s a card going round with my name on it, actually. So."],
      do() { G.flags.metMarcus = true; Player.xp(25); Rel.add('marcus', 1); }, to: 'sad' },
    howlong: { text: ["Nine years.", "Same desk. This one. I’ve never moved.",
      "They did the hot desking thing and everyone shuffled about for a fortnight and then went back to where they were, and I was already here, so."],
      do() { G.flags.metMarcus = true; Player.xp(25); }, to: 'sad' },
    lap: { text: ["Right. Yeah.", "...", "It’s alright. You can stop if you want. I don’t mind."],
      do() { G.flags.metMarcus = true; Rel.add('marcus', 2); }, to: 'sad' },
    sad: { text: ["Can I say something a bit odd?",
      "There’s a birthday card going round the floor for me. There is every year. Thirty-odd signatures.",
      "It’s lovely. Genuinely. And every year I sit here and watch it go past my desk, three rows over, and come back the long way, and nobody brings it to me, because bringing it to me would ruin the surprise.",
      "And then at four o’clock Karen puts it on my desk and says 'from all of us' and goes into a meeting.",
      "That’s nine years of that."],
      choices: [
        { t: "Marcus, that’s genuinely sad.", to: 'sadyes' },
        { t: "Is it actually your birthday?", to: 'actually' }] },
    sadyes: { text: ["It’s fine. It’s a nice card.", "...", "It is a bit sad, yeah."],
      do() {
        Rel.add('marcus', 2); Player.xp(20);
        if (!Q.active('q_marcus') && !Q.complete2('q_marcus')) Q.start('q_marcus');
        /* You have just found out who the card is for, which is step one — and
           if you signed it on the way here, step two as well. Reached once: the
           entry above sends you elsewhere the moment you have met him. */
        Q.step('q_marcus');
        if (G.flags.signedCard) Q.step('q_marcus');
      }, to: null },
    actually: { text: ["No.", "It’s in March. The card’s always in October.",
      "Somebody put the wrong date in the calendar in 2016 and it’s just — carried on. It’s a recurring event. Nobody can edit it because the person who made it has left.",
      "So every October the whole floor wishes me a happy birthday and every March nobody says anything at all."],
      do() {
        Rel.add('marcus', 3); Player.xp(35); G.flags.marcusDate = true;
        if (!Q.active('q_marcus') && !Q.complete2('q_marcus')) Q.start('q_marcus');
        Q.step('q_marcus');
        if (G.flags.signedCard) Q.step('q_marcus');
        Ach.get('a_marcus');
      }, to: null },
    during: { text: ["You’re still going on about the card.", "...Nobody’s ever gone on about the card before."], to: null },
    reveal: { text: ["You’ve signed it then. Everyone does.", "..."],
      choices: [
        { t: "(Hand him the card yourself, now, in person.)", to: 'hand' },
        { t: "(Say nothing. Let the system work.)", to: 'system' }] },
    system: { text: ["Right.", "See you at four then, I suppose."],
      do() { Rel.add('marcus', -1); Q.complete('q_marcus', 'system'); }, to: null },
    hand: { text: ["...", "You’re supposed to give it to Karen.", "...", "It’s got everyone on it. Look, that’s Dave. Dave signed it. Dave doesn’t sign things.",
      "And you’ve — you’ve written the date. The right one. March.",
      "Nobody’s ever asked when it actually was.",
      "Right. Well. Thanks. That’s — yeah. Thanks."],
      do() {
        G.flags.marcusResolved = true; Q.complete('q_marcus', 'hand'); Ach.get('a_card');
        Rel.add('marcus', 5); Player.mod({ rep: 10 }); Player.xp(80); Item.give('goldstar');
        Chat.push('#general', 'Marcus', '🧔‍♂️', 'thanks for the card everyone. genuinely. best one yet');
        Chat.push('#general', 'Dave', '🧔', 'Marcus posts in #general. Note the date.');
      }, to: null },
    after: { text: () => pick([
      "Somebody said 'alright Marcus' in the lift this morning. By name. I’ve thought about it four times since.",
      "I’ve moved my desk two rows in. Nobody’s said anything but I can hear people now.",
      "March, by the way. If you’re about."]),
      choices: [
        { t: "I’ll be about in March, Marcus.", to: 'march' },
        { t: "Alright, Marcus.", to: null, do() { Rel.add('marcus', 1); } }] },
    march: { text: ["...Right.", "Right.", "Cheers."],
      do() { Rel.add('marcus', 3); Player.mod({ rep: 5 }); Player.xp(30); Ach.get('a_march'); }, to: null },
    again: { text: () => pick([
      "Morning.", "It’s fine. It’s a Tuesday.",
      "Nobody’s said anything about the card yet. They will at four.",
      "I’ve got the second-best chair, actually. Nobody knows that either."]), to: null }
  }
}];
