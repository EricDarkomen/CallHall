# Call of Duty: Customer Service

A call centre RPG. Answer the phones, survive the shift, and find out who writes
the numbers.

You are a new trainee at CALLHALL Services plc. There are thirteen rooms, twenty
colleagues, fourteen mugs, and a fourth floor that is not on the floor plan.
Difficult calls are turn-based: your **Patience** is your health, their
**Frustration** is what you are reducing.

Play it in a browser. A page, its content, and a directory of art — no build
step, no dependencies, no network calls.

## Running it

Open `index.html`, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Controls

|            | Keyboard                        | Touch                          |
| ---------- | ------------------------------- | ------------------------------ |
| Move       | `W A S D` or arrows             | thumb down anywhere bottom-left |
| Interact   | `E`                             | `E` button                     |
| Drive      | `W` go · `S` brake, then reverse · `A D` steer · `H` horn | **two sticks**: left steers, right is the throttle |
| Get out    | `E`                             | `OUT`                          |
| Take it out | `G` · `Q` swaps · `R` reloads   | grab the green stick           |
| Aim, fire, swing | the mouse and its button, or the arrows | **two sticks**: left walks, right aims and fires |
| Dialogue   | `Space`, `1`–`9` to choose      | tap the box, tap a reply       |
| Panels     | `J I K C M P L`, `Esc` for menu | `☰`                            |
| Save/load  | `F5` / `F9`                     | `☰` · Menu                     |

On a phone the movement control is a floating analogue stick: it appears
wherever your thumb lands in the bottom-left of the screen, goes in every
direction rather than four, and how far you push it is how fast you walk. A
four-way d-pad is available instead, and the whole layout mirrors for
left-handers — both are in `☰ · Menu`, along with a fullscreen toggle. Starting
a shift asks for fullscreen on its own.

Get in a car and a **second stick** appears in the other corner, in amber: the
left one steers and the right one is the throttle — push it up to go, pull it
down to brake and then reverse. One stick could not do both. Steering meant
pushing sideways, pushing sideways took the forward component out of the same
vector, and less speed means less steering bite — so the harder you asked it to
turn, the less it turned. Two thumbs, two jobs, neither able to undo the other.
The button you have been pressing all along stays exactly where it is and says
`OUT`.

Find the away-day box and a **third stick** appears in that same corner, in
green, on exactly the throttle's terms: only while there is something in your
pocket, never at the same time as the throttle, and gone again the moment you
get into a car. Push it and you aim; push it past halfway and it goes off —
which is a dart, a band, a jet of water, or a foam sword through ninety degrees
of somebody's morning, depending on what is in your hand. Let go and the thing
goes back in your pocket a couple of seconds later, because a phone has no
spare corner for a holster button and does not need one.

On a keyboard the arrows become the right hand while something is out — `W A S
D` walks you about and the arrows aim and fire, which is how Robotron did it in
1982 and is still the only way two directions fit on one keyboard. The mouse
does the same job more directly: where the pointer is is where you are aiming,
and the button is the trigger. Nobody has to choose: the stick is asked first,
then the arrows, then the mouse, so picking one up never means putting another
down.

The game saves itself, and detects touch devices to show the right controls and
the right instructions.

## Three floors, and a lift that goes to them

For a year this building was one plan. The lobby you walk in through, the floor
you work on, and the Management Floor with a keycard on the door were all drawn
on the same sixty-four by forty-four grid, seven tiles apart, and the first job
the game ever gives you is **"Find the fourth floor"**. You could see it from
where you were standing.

The building's own directory, on the wall of that lobby, has said this the whole
time:

> **FLOOR 1–2:** A dental practice, a company called NORTHGATE (nobody has ever
> seen anyone go in), and a Greggs.
> **FLOOR 3–5:** CALLHALL SERVICES.
> **FLOOR 6:** *(blank strip, adhesive residue in the shape of letters,
> unreadable except the last one, which is a Y.)*

So the map agrees with the directory now. **Ground** is the lobby — reception,
security, the visitors' book, the awards cabinet, the bike nobody claims, and
Ron, who is the only person in this game who does not work on the hub. **Four**
is Operations: the sea of desks, and where the lobby used to be drawn is what is
actually at the bottom of every floor of every office building in the country —
a landing with a lift in it, a cooler, and a noticeboard nobody reads. **Five**
is Management, which is a floor at last instead of a room with a sign on it.

**The lift works.** It has four buttons because the directory lists four floors:
5, 4, 3 and G. Which button is which floor is `FLOORS` in `data/world.js`; where
each one actually goes is the same `links` table every other door in this game
uses, so a floor that moves moves in one place and the act does not know what a
floor is. A button with no link on the level you are standing on is the floor
you are standing on, and is drawn as such.

The **3** button is taped over. CallHall has had the third floor since 2009 and
gave it up in the restructure — the same restructure reception has been
unstaffed since — and taking a button out of a lift is a job for a lift
engineer, whereas putting DYMO tape on one is a job for anybody.

The **5** button lights and does nothing without the keycard. It does not refuse
you; it simply does not go, and you stand there while it does not go. Terry
still has the keycards. Terry has everything.

The car is somewhere. `Lifts.at()` is one variable and it earns its keep: the
light over every set of doors in this building shows it, the indicator beside
them reads it out, and it is true — press 5 and the man waiting on the ground
floor watches it go to 5. Walking up the stairs does not move it, which is the
whole reason it is a variable rather than a lookup.

**And if you need the stairs, you need the stairs.** Every floor has them, they
go one floor at a time, and on the fourth they do a third thing: they go *out*.
That stair is the external fire escape, and it has been an external fire escape
since the day somebody wrote `theView` — *"from the fire escape you can see: the
bins, a wall, a strip of car park, and — if you lean — actual sky"* — because
the only thing you can see all three of at once from is a steel stair bolted to
the back of a building. It comes down by the bins in the car park. It is what the
fire drill walks down, and `NPCM.drillPlan()` finds it the way it has always
found an evacuation: by looking for the level one door away with an assembly
point standing on it.

**Colleagues use it too.** A waypoint in `WP` may now say which floor it is on —
`[x, y, 'five']` — and two elements still means the hub, which is the state every
one of them was already in. Somebody whose day names a floor they are not
standing on walks to the lift and waits at it, and if you are on that floor you
watch them do it. Off your floor it happens without the walk, because a colleague
who took three minutes to cross a landing you were not looking at would be a
colleague who is late for reasons nobody can ever observe. Colin comes down from
Synergy for lunch at twelve. Nigel comes down to the printer at three. Neither of
them could be seen from your desk before and both of them could be seen from
your desk before, which was the problem.

## Outside

Press `E` on the way out and you are in the car park, and Bellhaven is a town.

The half of it you come out into was built between about 1968 and 1994, and it is
six streets on a grid: Bellhaven Road along the front of the building, becoming
the High Street once it reaches the shops; Fenn Street through the middle;
Corven Way along the bottom by the railway; and Aldergate Rise, Cargate Lane and
Marlow Street crossing all three. Nine junctions, four blocks of buildings, the
office car park at one end and the retail park at the other — which is the only
piece of tarmac out there wide enough to find out what a car does sideways.

A grid rather than a circuit, deliberately. A loop is a lap: you go round it and
you have seen it. A grid is a choice at every junction and two ways round to
everywhere.

The pool car is in the car park and the key has been in it since 2019. Press `E`
on it and get in. It steers like a car rather than like a person — the front
wheels only turn it while it is moving, the back end goes where it was already
going, and reversing out of a bay is its own small event. Everything else parked
out there is somebody's, and locked, and will say so.

There is traffic. Nine of them, including a learner and the 41A, running four
circuits through the same nine junctions on the correct side of the road. They
brake for corners, queue behind each other, stop for anybody on foot, and sound
the horn when they have been waiting a while. They are not scenery: drive into
one and both of you will know about it.

They also know where the road is, which sounds like the least a driver could do
and took a while to arrive. A route is a line somebody drew down a lane, and a
car shoved off that line — by you, mostly — used to go on steering for its
target from wherever it had been left, which was frequently the pavement, and on
the pavement it stayed, because forwards was a shop front and forwards was the
only direction it had. So they read the tarmac now: they steer away from a kerb
rather than up one, they reverse out of the things a route cannot know about,
they work out which leg of their route they are actually nearest before driving
back to it, and where two of them want the same junction the one with the other
on its right gives way. And after a few seconds behind something parked that is
plainly never going to move, one of them will pull out and go round it. Not for
a person: nothing out there ever does anything about a person except stop.

There are people, too. Eight of them, walking circuits of the pavements: up the
parade and over the zebra by the Greggs, along Fenn Street in a hi-vis, a trolley
back to the retail park, a dog on Corven Way, and two outside the office who are
not going back in yet. They cross at the crossings, go round a lamppost rather
than into it, and have no schedule, no memory and no name of their own — they are
somebody with a Greggs bag. Press `E` and you get a stranger's half-sentence.
Sound the horn at one and you get the entire British response to being honked at.

Going round a lamppost is a lean. Going round a skip is most of a right angle,
and that is what the man on the phone outside the unit that is always being
refitted found out: the footway there is two tiles wide, the skip took one row
and a lamppost took the other, and eleven pixels is not a person. He walked into
it on the first lap of the first shift and stood there for the rest of the day.
The skip is at the kerb now, where a skip goes and where the lorry can get a
chain on it, and the lane in front of the windows is clear the length of the
parade. And nobody can be pinned like that again by any arrangement of street
furniture anybody thinks of next: a stranger who finds no way round at any angle,
or who has not got any closer to where they are going for three seconds, turns
round and walks the loop the other way, which is what a person does and which is
one sign flip on a route that was always a ring.

They are also the other half of the traffic rule. Cars have always stopped for
anybody on foot; until there was somebody on foot, that only ever applied to you.

There is a drive-thru on Corven Way. It will not serve you on foot.

Five achievements are out there. One of them is parking straight.

And then there is a railway along the bottom of it, and the other half of the
town is on the far side.

The roads are the kit's — the tarmac, the paving, the drains and the awnings are
all Liberated Pixel Cup art, fetched and licence-checked by the sprite build like
everything else. The cars are not, and could not be: the set this game pins is
mediaeval-through-Victorian and the only wheeled things in the whole repository
are a wheelchair and a shopping trolley. They are drawn by the renderer instead,
which is also what lets one turn through any angle rather than through the eight
a sprite sheet would give it — and what lets the eight models come out of a table
of numbers and colours rather than out of eight drawings.

They are also the size of cars, which they were not. A hatchback used to be a
tile and three quarters long — very slightly longer than a person is tall — so
the street read as a street with toys parked on it, and standing next to the 41
you were about a fifth of its length rather than a tenth. Everything on four
wheels is half as long again and a third wider now, which is roughly a person to
a third of a car, and that is what a person next to a car looks like. The bays
they park in are three tiles deep and a car very nearly fills one, which is also
what a car in a bay looks like; the contractor's van does not fit in one at all
and sticks out into the aisle, which is the most accurate thing on this map.

Two things in the driving had to be told about it, and both were wrong before and
only got away with it because a car was nearly as wide as it was long. Working
out whether there is room to get past something in front measured that something
by its WIDTH, whichever way round it was lying — so a car abandoned broadside
across a lane, which is its own length wide to anybody coming up behind it, was
measured as a car's width and the town queued behind it until five. And the
pull-out itself always went a flat tile and a half sideways, however far out the
check had said there was room: a car would prove it could get round something and
then steer into it. It goes as far over as the check said, now, and the check
measures the obstacle the way the thing that found it always did.

Each of them is built in layers, and that is what stops a car in plan view being
a lozenge with two dark windows in it. Underneath: a cast shadow that goes soft
at the edge instead of being a copy of the car in black, and a tight contact
shadow under the sills that is what actually puts it on the road. Over the paint:
wheel arches, flanks that fall away from the crown, the panel gaps — a bonnet, a
boot and two doors a side, each a dark line with a lit one against it — and one
raking highlight down the length that comes up hard when the paint is wet,
because the polish is the one part of a car that knows what the weather is doing.
Then the glass, which is a gradient with the sky in the top of it rather than a
flat dark shape, and side windows down each flank so there is a cabin between the
screens.

All of it is baked. Twenty paths per vehicle per frame is the arithmetic that
decides whether this runs on a phone, so a model's body is drawn once into a
small canvas and blitted after that, exactly as the floor tiles are. What is
still drawn live is the four things that actually move: the wheels, because the
front pair steer; the lights, because they come on; the indicators, because they
blink; and whoever is in it. The layered car costs less per frame than the flat
one did.

## Across the line

Corven Way ends at a palisade fence, a bank of buddleia and two running lines.
Forty yards along the verge there is a subway: tiled, lit, dry and swept, which
is not what anybody expects and is why everybody mentions it. Four minutes under
there and you come out on Station Road with a city wall in front of you.

**The town doubled.** It is a hundred and fourteen tiles across and a hundred and
twenty down now, and the seam is the railway at row 60. Nothing above that line
moved to do it: the office's front doors are still at `[20,2]` and the Greggs is
still at `[31,23]`. The town grew off the bottom of itself, the way one does.

What is down there is the town that was here first. It is inside a wall, it has no
cars in it, its main street was pedestrianised in 1988, and it falls away
westward down eight courses of steps to a river with a quay on it that stopped
working in 1962. Everything is red rubble stone instead of brick, nothing is
square to anything else, and the one building made of a different stone is the one
somebody paid for.

Priorygate runs the width of it with ten frontages on it and five that open — a
second-hand bookshop with a cat in it, a coffee place, and The Mitre, which has
been a pub since something in the fourteenth century and has had eleven names.
Off it: the Shambles with a market hall, a fountain and a fish stall; three lanes
where all the bins go; Minster Green with the cathedral standing in the middle of
it as seventeen tiles of solid nothing; the Close; and the castle gardens, which
have a gatehouse, a bandstand and no castle. Round the outside, Quay Road and
Weirbank Road, and at the bottom the quay itself: warehouses, barrels, mooring
rings, a boat that has not moved, and twelve pay-and-display bays you can drive
the pool car down a one-in-seven ramp to get to.

**Fifteen benches, four windows and a clock.** The old town was drawn with a
chair emoji anywhere somebody sits down, a shop window on the minster and a
mantel clock in the market, because there was no kit with any of those in it.
There is now. The benches on the green, on Priorygate, in the gardens, on the
platform and along the quay are one bench, cut down from a piece of wooden
furniture that was nearly three tiles long — see the note in
`tools/sheets/wood.mjs` about where it is spliced and why that is allowed. The
minster has four tall arched windows in stone, assembled in the sheet from the
arched heads and mullioned shafts the kit ships separately so a wall can be
given whatever height of window it has room for. The churchyard and the castle
gardens have wrought-iron railings, cut to join to themselves every two tiles
rather than doubling a post up at each end. And there are flower beds on the
green and in the gardens, planted white and red alternately, which is what stops
a border reading as a stamp.

Two clocks did not get the new art and that is the point of the note beside
each: the lobby's is described in its own act as a plain white battery clock
bought in a multipack, and the minster's is an astronomical dial of 1484. Art
that contradicts the writing is worse than no art.

**Every road on this map is six tiles wide and four of them are driven on.** That
was not a decision, it was an accident of laying the town out as
pavement-carriageway-pavement and being generous with the middle. The traffic
circuits run down the inner lanes — 17.5 and 20.5 on Bellhaven Road, 35.5 and
38.5 on Fenn Street, and so on to the bottom of the map — which left the tile
against each kerb permanently, structurally empty, for a hundred and ten tiles,
on both sides, on every road. It read as a runway with a dashed line down it and
the only thing to do on it was cross it.

Those tiles are **kerbside parking** now, which is what a road that wide has
always been: it was never six lanes, it was two lanes and two rows of parked
cars, and nobody had said so. Nothing about the traffic moved to do it — not one
route changed, and no parked car is within a tile of a lane a moving one uses.
Where the runs stop is where a real one stops: junction mouths, both sides of
every zebra, the length of the double yellows on the north side of the High
Street, and seven tiles around each bus stop. Twenty-nine cars sit in them, one
in every other stretch and never two stretches running.

**And the other pavement.** On four of the five long roads, one footway had
everything on it and the other had nothing at all — Fenn Street's southern side
ran a hundred and four tiles with not one object on it. They were empty for a
reason: on two of them, that was the row the pedestrians were walking down. A
footway has a furniture strip at the kerb and a clear strip against the shops,
which is how Station Road and Weirbank Road were already built; Bellhaven and
Fenn had it the other way round. So the furniture went to the kerb rows and two
ped routes moved one tile back, and now all five agree.

**The old town got its own ironwork**, off a Victorian decoration kit that is
CC-BY-SA 4.0 and is therefore `LICENSE` part 4 and a sheet of its own: a pillar
box, fluted cast-iron litter bins in place of wheelie bins on a mediaeval
street, and a public clock on Priorygate that everybody arranges to meet at and
nobody can date. The benches split with the town — painted iron north of the
railway, the wooden settle south of it.

**Three roads that used to stop.** Bellhaven Road ran x 2..111 and Fenn Street
and Corven Way ran x 8..107: six lanes of carriageway that came to an end two
tiles short of the map border and butted into the side of a building, with no
junction, no turning head and no reason. They run to the edge now, both ends,
the way Station Road and Weirbank Road always have — the view stops, the town
does not.

Those two DO stop at their western ends, and they are right to: the river is
there. What was missing was anything saying so. There is a stone parapet across
each of them now, and a sign on it that says ROAD ENDS and, underneath in a
different decade, RIVER BELLHAVEN — DEEP WATER. Two hundred years ago this was a
ford and the road went straight on into it. The road still goes straight on.

**The doors.** Every door in this game — office, flat, shop, cathedral — was the
same leaf standing ajar at forty-five degrees, hinged out onto whatever was in
front of it. Indoors that is right and it is what the kit drew it for. On a
parade of twenty shopfronts it was twenty copies of one sticker lying across
the pavement.

The kit had the answer and nothing had asked for it: `15 Panel Door A` is a
fourteen-frame swing in eight wood tones, and the frames nobody was using are
the ones where the leaf is square to the wall. An **exit** — a way out of a
building — is now drawn as a door IN a wall, in four tones picked off the tile;
a **door** — inside one — keeps the swing. And the two frames say something:
**ajar means you can go in, shut means you cannot.** Seventeen of the town's
frontages have no interior behind them and every one of them was wearing the
same wide-open door as the five that do.

**The windows.** `shopwin` was the office's `wall.mirror` — thirty-two by
twenty-three of landscape glass with a diagonal across it, chosen because the
sash window in the atlas "read as a terraced house". At a fifth of the wall it
was on, it read as a mirror. It is `shop.window` now, which is what it was
always for: tall, in a frame, filling the frontage — and it has a **lit**
variant, so the parade comes on at dusk with the rest of the town.

**Three things join the two halves,** and between them they are the whole shape of
this map: two road bridges over the railway — Cargate Lane and Marlow Street — and
the subway under it. Four more circuits of traffic run down there, two of them
crossing the line twice a lap on different bridges, and a fifth bus, the 12,
which is red so you can tell it from the two green ones and which takes
twenty-two minutes to get you across a railway you can walk under in four.
Everybody knows this. The 12 is full.

**The old station.** The act on the railway has said since long before there was
anything to say it about that the last train stopped here in 1967 and the platform
is still there under the brambles. There are two platforms now and you can stand
on them: a running-in board, a bench, a clock that says eleven minutes past four
and has said so since the eighties, three empty poster cases and one with a
winter timetable in it from 1966. The booking hall on the road side has been
boarded so long that somebody has painted the ply. The only way in is the subway,
which is a public right of way and is the reason it is lit.

**Three things the engine had to learn,** and all three are small:

*Ground you can see and cannot stand on.* Everything solid in this game is a wall
or a building: the renderer gives it a face where a floor can see it and a roof
where none can. A river with slates on it is what that produces. So a surface may
now say `open` — still solid, collision untouched, but drawn as what it is made of
and skipped by the wall pass. The water and the ballast are the two.

*Taking a surface off again.* `{ s: null, r: [...] }` says this ground is made of
whatever its room says it is made of, which is the state 8,043 tiles of that level
were already in and which there was no way back to until one surface covered nine
rows of the whole map with four things standing on top of it. Nothing in the
engine needed telling; every reader already treated a null surface as "ask the
zone". It is the difference between a platform and the ballast beside it.

*A sixth word of road paint.* `rails` draws two rails and the sleepers under them
from a to b. It belongs in that list for the reason the centre lines do: a marking
is linework laid on the ground at a position, and a track that came in 32-pixel
pieces would put a sleeper joint every metre. It stops at the two bridges, because
a bridge deck is on top of a railway; it runs straight over the subway, because
that goes under, and the pale strip of tunnel showing between the rails is the only
thing on the whole embankment that says so.

Eleven new sprites came with it, all through the same fetch-crop-licence-check-pack
pipeline as the rest: the water and the ballast off the four-season terrain sheet,
red rubble and pale ashlar off the castle walls, a drinking fountain, barrels, a
crate, a council trough, a bay of post-and-rail fence, a NO ENTRY sign and a set
of temporary traffic lights. The lights are fixed on red, and that is honesty
rather than laziness: nothing in this game phases a signal and nothing in
`engine/cars.js` knows what one is, so they are the thing they actually are
everywhere in England — temporary three-way lights round a hole with nobody
working in it, stuck on red since March, with the lane behind them coned off and
no route in the level going down it.

Seven more achievements are down there. Not one of them is an achievement in the
ordinary sense: every single one is somebody spending four minutes and about a
pound on the wrong side of a railway line in the middle of a working day. That is
the whole of what the old town is for.

## The away-day box

The game is called Call of Duty: Customer Service, and for eleven months the only
thing in it you could point at anybody was a policy. There is a box in the
archive with AWAY DAY 2019 on the side in marker, under a laminated sheet of the
values, and it has four things in it: a foam dart blaster with six darts, a
water pistol with the price sticker still on the tank, a foam sword with LOOK
ALIVE printed down the blade, and a thing somebody made out of a post tray and
four elastic bands, which is on the evidence the only object in this building
anyone has ever built for pleasure. Nobody has opened it since the coach got
back. There is a fifth thing under the paper tray by the printer: a compliance
pack, five hundred and one pages, which rolls up into a length of pipe.

**How you find out it is there**, because a box in a room with nine identical
boxes in it is not findable by walking past it: Gary asks about it in `#general`
at 09:34, Marjorie tells him where it is and that it is staying there, and Dave
says the quiet part. Walk into the archive after that and the compass points at
the one with the writing on the side until you open it. Nothing else in the game
is signposted this way and nothing else needed to be — everything else is
furniture you can see.

Nothing in any of it hurts anybody. What it does is make twenty adults turn
round, which is the only ammunition this game has ever had. Hit a colleague and they stop dead,
turn round, and say something; hit somebody on the pavement outside and you get
the entire British response to being hit by a stranger, which is "Alright." It
costs you a point of goodwill with that person, once, the first time — a second
dart at Marjorie is the same joke and should not be a second grudge. Five
different colleagues in one shift is an achievement that nobody escalates and
everybody remembers.

They are **drawn rather than fetched**, and for the same two reasons the cars
are. Every pixel in `art/` is third-party, licence-checked by the sprite build,
and the kit this game pins is mediaeval-through-Victorian: there is no blaster in
it and there was never going to be one. And a twin-stick game aims through every
angle rather than through the eight a sprite sheet would give it, so the art has
to be something that can be turned. Each one in `engine/guns.js` is a grid of
characters and a palette to look them up in — the arrays are pictures, and moving
the trigger guard is moving a `g` — baked once at 1:1 into a small canvas and
rotated about its grip after that. Past the vertical it mirrors rather than
carrying on round, because a gun turned a hundred and seventy degrees is a gun
lying on its back and that is not how anybody holds one.

The two you **swing** are in the same table, on the same controls, drawn by the
same code, because they are the same thing: something in your hands, pointed
where the right stick is pointed. A magazine becomes an arc, a reach and a
quarter of a second, and the trigger sweeps that arc through the aim instead of
sending something down it. The hit test runs per frame rather than at the moment
the button went down, which is the whole difference between a swing and a shot:
the sword arrives at the person on the left of the arc before the person on the
right, it catches each of them once however long it dwells, and it will not
reach round a corner — the same chest-height question a dart asks of the tile it
is in, asked halfway along the reach.

A dart leaves the barrel it is drawn coming out of, which takes two numbers and
not one: how far in front is the muzzle's offset projected onto the aim, in the
ground plane, and how high is whatever is left over, carried on the shot itself.
Take the drawn height at face value instead and a dart fired dead level starts
eight pixels north of the person firing it, which is most of the margin the hit
test has.

A dart goes over a desk, a worktop, a bin and a chair, and stops at a wall, a
cabinet, a vending machine and a shut door. That is one rule and it is measured
rather than listed: it is thrown at chest height, and the size a thing is drawn
at is the only height this game has. Anything solid drawn taller than a desk is
in the way and anything shorter is not. The test the walking uses was the wrong
one to borrow — a foot box is stopped by every bin in the building, none of which
is at chest height.

### People bend in the middle now

This is the part that is not about guns at all.

A character in this game is a sprite sheet with four directions in it, and an aim
is an angle — any angle. For as long as a person was one bitmap the only thing
the game could do with the difference between the two was throw it away: you
would back up a corridor firing at what you were backing away from, with your
whole body turned round to face it, walking backwards at a full run. People do
that exactly never.

So a person is now drawn in two halves with a joint between them. The legs come
from the direction they are **walking**; the chest, shoulders and head come from
the direction they are **looking**; and whatever angle is left over between that
direction and the real bearing — up to about a third of a radian of it — is taken
up as a lean about the hip, with the shoulders shifting a pixel or two the way
the lean is going, because a body twisting at the waist moves sideways as well as
round. One extra blit, and the other three hundred and fifty-six degrees come
back.

**A waist is not a swivel, though**, and the first version of this forgot it.
Letting the legs take the direction of travel whatever the shoulders were doing
drew somebody walking west while aiming east with their top half turned through a
hundred and eighty degrees, which is not a pose, it is an injury. The legs may be
a quarter turn from the shoulders and no more — with four directions, the row
either side and never the one opposite. Ask for the opposite and the feet give up
the argument rather than the spine: they take the aim's own row and the walk
cycle plays **in reverse**, so you back up facing the thing you are pointing at,
which is what a person does and which is one flag to the frame lookup. There is
no reverse walk in the art and there does not need to be: a walk cycle run
backwards is what backing up looks like. Standing still, the feet simply come
round to the aim, because somebody who has stopped to point at something is
facing it.

The blaster used to float in front of all this, in the middle of the chest,
because it was drawn at one height for every direction and in nobody's hand at
all. What fixed that was not a new pose — see below.

### What is holding it: the arm

**There is no pose in this kit where anybody is holding anything up.** That is
worth stating plainly, because it was not obvious and it took a morning of
fetching to establish. The character art is
[LPC Revised](https://github.com/ElizaWy/LPC), pinned at one commit, and what
that commit ships for a body is Idle, Walk, Run, Sitting, Jump, Climb and
Emotes. The artist's own `Credits.txt` in that same commit lists a one-handed
combat set — *Combat 1h (Idle, Slash, Halfslash, Backslash)* — and the files
are not there, on that commit or on `main`. Her OpenGameArt pack of the same
name ships the same six animations and no combat either. The universal LPC
spritesheet generator does carry that combat set, on a different and larger
body, offered as CC-BY-SA 3.0 or GPL 3.0 — a licence this project will not mix
into OGA-BY art, for the reason set out in LICENSE part 2. So there was never
going to be a shoot row to drop in.

Which left the thing standing to attention with a blaster beside it, and facing
away, both hands at its sides and nothing on the screen holding anything.

**The answer is the arm the kit already drew, turned at the shoulder.** The arm
is a rectangle — seven pixels by twelve — and the kit separates it from the ribs
with a line of its own shading, so the cut follows a line an artist already
drew. Take that rectangle out of the frame and blit it back rotated about the
shoulder joint, and the person is holding something up.

It is the player's OWN sleeve and the player's OWN fist, because it is their own
frame: whatever shirt they picked in the creator, whatever skin, whatever hair.
Nothing is recoloured and nothing is invented, and a shirt added to the wardrobe
tomorrow gets an arm for free. That is paper-doll animation and it is as old as
animation; what makes it affordable here is that it is two canvas operations —
a clip with a hole in it, so the arm does not also hang where it used to, and
the same blit again inside a rotation, clipped to itself. **No pixel is ever
read back**, which matters because this game opens from `file://` and a canvas
with a sprite on it cannot be read from there at all.

The table is in `Guns.ARM`, one entry per arm, and everything in it is measured
off the composed frame:

| | what it is |
|---|---|
| `rect` | the arm in the cell, inclusive |
| `from` | the shoulder joint inside that rectangle — what it turns about |
| `to` | where that joint goes |
| `hand` | the middle of the fist, which is where the grip ends up |
| `base` | where the arm points when the aim is straight along the row |

Two arms on the front and back rows and the aim picks which; front on, a blaster
held out to the right is in the right hand. One on the side rows, because there
is only one arm to have — and on those rows `to` is not `from`, which is the
only fiddly part of this. Side on, the only arm the kit leaves visible is the
FAR one, swung out behind the back; rotate it where it stands and you get a hand
stuck to somebody's chest. Carrying it across to the near shoulder on the way is
the difference between that and an arm reaching forward.

**The top half braces and the legs do the walking**, which is a decision about
the rectangle and not about taste. The walk shifts the arm a pixel or two; the
RUN cycle pitches the whole body forward over a leading leg and tucks both
elbows in, moving it halfway across the cell. Cut the same rectangle out of a
run frame and you take a piece of ribs and blit back a stub. So the torso holds
the standing frame, the shins walk and run underneath it, and one pixel of
breath on the building's own rhythm keeps it from reading as furniture — which
is, as it happens, what a top half carrying something actually does.

**A swing is the same arm**, turned further: the shoulder follows the sweep
instead of the aim, so the arm goes round with the thing in it rather than
holding still while a foam sword describes an arc on its own. Which arm it is
still comes from the AIM, because a forehand that crosses the body is thrown by
the shoulder it started on, and an arm that changed sides halfway through a
swing would be a second person's.

This replaced a baked pose sheet — four mirrored cells a direction, cut from the
run cycle — and it is worth writing down why that went, because it was the
second wrong answer to this question. A run frame is a stride. Measured, the
head sits five pixels from the feet in the side rows, because the body is
pitched forward over a leading leg. Freeze one for somebody standing still and
their legs are not under them; compose the top of it over standing legs and the
hips must disagree with either the head or the feet, because in the original
they disagree with both. There is no arrangement of that drawing that is a
person standing up, and the way to find that out was to build all of them and
put a line down the middle. An arm that turns needs no stride and no mirror.

**The recoil of a shot is in the gun**, not in the body: four pixels back down
its own line and ten degrees of muzzle, both decaying over an eighth of a second
and scaled by the same `kick` number that shakes the screen. A body that lunges
for an eighth of a second three times a second is a body having a fit.

### One pair of hands

Every standing and walking frame in this kit draws them hanging at the hips, rows
36 to 42, which is BELOW the waist. That is the whole reason there are two cut
lines.

When both halves of somebody are the same drawing — standing still, or walking
the way they are pointing — nothing is cut at all: one blit, one frame, and a
lean at the waist over the top of it. Nothing in the figure can disagree with
anything else in it.

When they are genuinely different drawings — strafing, backing away from what
you are aiming at, or simply holding something, because the top half has braced
and the legs have not — the cut is eight rows lower, below every one of those
hands and above every foot. The arms come whole from the half that is holding
something and what swings underneath is shins. Cut at the waist there instead and
the bottom half brings its own pair of hands along, which is one pair too many
and impossible to un-see once seen.

The arm that is holding something is cut out of that top half and put back
turned, so there is still one hand at a hip and one on a grip, and never two of
either.


**Turning between the four** is the one place the four-direction art shows, and
two things soften it. The row is STICKY: it only gives up the one it is on once
the aim is eight degrees past halfway, because an aim sitting exactly on a
diagonal is where a thumb naturally rests and a person who cannot decide which
way they are facing is worse than one facing slightly the wrong way. And the
lean is EASED while the row is not — a row can only change in one step, there
being four of them and no drawing in between, but the lean is what carries most
of the jump, flipping from one extreme to the other in a single frame on top of
the art changing underneath. Smoothing it turns that into something that reads
as somebody turning round.

It is worth saying what cannot be done here, because the obvious idea does not
work: eight facings. Squashing a cardinal frame horizontally to fake a
three-quarter view — the standard trick — makes this character look thin rather
than turned, at every squash from 0.88 down to 0.68, on both the front row and
the side row. It was tried and photographed and thrown away. Eight directions
would mean eight directions of art, which for a pinned third-party kit that
ships four is a different job entirely. What there is instead is a body that
snaps four ways as late as it can, a waist that covers the difference, and a
weapon that points at the true angle regardless.

A swing sweeps its arc, alternates direction every time, and pushes the weapon
two pixels further out at the middle of it. Two, and not nine: the first version
pushed it nine and the sword left the hand entirely, because the arm in the art
does not straighten and nothing the weapon does can pretend it has. The swing is
in the arc; the rest is follow-through.

The waist is at row 35 of a 56-row frame, and that is measured rather than
eyeballed: the character kit ships the body in layers, and `parts-legs` starts on
the row `parts-torso` stops. It is kept as a fraction of the frame, so a sheet
from another project at another size bends in the right place too.

Two things about the cut had to be got right and both were wrong first. The two
halves **overlap by a row**, because two clips butted exactly against each other
leave a seam the width of nothing at all, which on a screen scaled by
`devicePixelRatio` is a bright line across somebody's hips on about half of all
phones. And the torso is **clipped before it is rotated**, not after: a clip
applied after turns with the body, and a tilted cut line takes a wedge out of one
hip and leaves a gap at the other. Clipped first, the line across the body stays
level and whatever rotates below it is simply hidden behind the legs, which is
where it has gone.

Nobody is obliged to use it. The twist is an optional argument to `Sprites.draw`
and every call that does not pass one is the single blit it always was — so a
colleague at a printer costs exactly what they cost last week. The ones who do
use it are you, because you are aiming, and anybody who has just been hit by a
foam dart and is turning round to find out who by. That is the same movement and
the same three lines of code, which is why it lives in one place.

## Nineteen doors, and who is behind them

Fourteen frontages open on the four parades north of the railway, and five more
on Priorygate. A Greggs, a pub, a bookmaker's, a launderette,
a post office, a charity shop, a kebab shop, a vape shop, a nail bar, a tyre
place, an empty unit, a working men's club, a tanning salon — and a door between
the launderette and the post office with six bells and no sign, which is the
stairs up to the flats above the parade. And in the old town: The Mitre, the
second-hand bookshop, the coffee place, the Market Hall and the minster.

**And you can see them now.** For a long time every frontage out here was a brick
wall with a sign hanging on it: the glass was there, the awnings were there, the
way in worked — press `E` — and there was not a door anywhere on any of the four
parades. Somebody standing on the pavement outside fourteen businesses could not
see one. There is a door in every frontage now, cut into the wall course above
it, with the sign moved up onto the fascia where a sign over a door goes. The
ones with a floor behind them stand open; the empty unit, the cash and carry and
the four sheds on Corven Way are shut, because a door you cannot go through is a
shut door rather than a missing one.

The glass beside them is PLATE glass, and it is the office's mirror. Which is not
a joke: the kit's `wall.mirror` is a dark frame round a pale pane with a diagonal
reflection across it, landscape rather than portrait, and that is a shop window.
What was there before was a sash — tall, white, glazing bars — so the parade read
as a terrace somebody had cut doors into. Nothing about the sheets changed to fix
it; the mirror was already packed and already licensed, and this names it.

And there are FOUR awnings on the whole map, where there used to be fourteen. One
on very nearly every frontage is not a street, it is a pattern — and an awning is
opaque, so it replaces the frontage's emoji: fourteen of them meant fourteen
units identified by nothing but the colour of their canopy. The four left are the
ones that would have one — a nail bar, a charity shop, a pub and a takeaway — and
everything else has its sign back. A tyre bay has a roller shutter, a working
men's club has a door, and a retail shed has a fascia the size of a bus.

**The door is the kit's door, and only the kit's door.** The engine has always
had a drawn doorway of its own — two jambs, a frame, a threshold strip and a
leaf — from before there was any door art at all, and it went on drawing all of
it underneath the real one. So every frontage on the parade was a crude open
doorway with a nicely drawn ajar door superimposed on it, the crude one showing
round the edges: a pale bar across the middle, a dark post down each side. It
draws none of that now where the kit has a door, and the pale bar is gone from
every opening that has one. The jambs survive on a doorway you can walk THROUGH,
indoors, where they are doing structural work — the tile there is floor, the wall
run has a tile-wide hole in it, and the jambs are what carry the wall in far
enough for the hole to read as a doorway. On a door set into wall mass the wall
is already there and they were drawing a second one.

The kit has three doors and this uses all three: ajar for a unit you can go into,
shut for one you cannot, and the red one for a door that is locked. They are the
same leaf swung towards you, which is why a shut shop and an open one read as
different doors rather than as the same sticker twice — and each hangs on
whichever jamb its own tile says, so fourteen frontages are not fourteen copies
of one door. A pair of doors is still hinged at opposite jambs and opens
outwards, which was never a choice.

And when you look through an open one you see the room. A doorway cut into wall
mass has brick under it, so what showed between the jambs was brick — the front
doors of your own office were two leaves hung on a car park wall with the same
car park wall behind them. The catalogue already knows where every door goes, so
the renderer asks it, and paints that room's own floor in the gap with the head
of the opening in shadow above it: a foot of dark and then a floor, seen from a
street at noon.

That is also what lights the parade at dusk. It used to light up by swapping
every sash window for a lit one; the sashes have gone, and what comes on now is
the warm light in the doorways of the units that are still open — brightest at
the threshold, which is the way light falls out of a door. Nothing at two in the
afternoon, the same as the streetlights.

Six people work out there and are not your colleagues, which the profile panel is
careful about. Pat has run the launderette for nineteen years and knows more
about this street than the council does. Iris is in the charity shop on Tuesdays
and Fridays and is not paid. Norman has been on the club door since 2006 and
Stan is at the end of its bar. Jules is the hand in the photograph in the nail
bar. Wes has your pool car up on a ramp and eleven unpaid invoices for it on a
spike by the door. They keep their own hours rather than the call centre's: a
launderette opens at eight and a club does not start until noon.

**And your colleagues go out.** A person's day may have windows in it — an hour
somewhere that is not the fourth floor — and there are thirty-seven of them
across twelve of those rooms. Karen, Sarah and Gary are in the nail bar at noon,
each having told the floor something different about where they are. Marjorie is
in front of the shelf of mugs she donated in 2016, losing an argument with
herself. Priya's favourite part of her day is being fourth in a queue in the post
office, because for nine minutes nobody asks her anything. Nigel is in the tyre
place putting it on an account that does not exist. Terry is in the bookmaker's
at lunch and has not put a bet on since 1998 — it is the warmest building on that
street and the only one with chairs you can sit in without buying anything. And
Bev, who has been in since six, takes her break in a Greggs at twenty to eight
with nobody else in it.

They say different things in different rooms, and that is the whole reason the
rooms are worth walking to: six colleagues in a pub still talking about the
printer are six colleagues at their desks.

Three rooms are deliberately empty and stay that way. There is nobody in Unit 6,
and that is the first thing about Unit 6. Sunseekers is a room you cannot see,
because everything that happens in Sunseekers happens behind a door with a light
over it. And Colin does not go anywhere, ever, which is Colin.

## The day, the night, and the weather

The shift runs 09:00 to 17:00. The day does not.

At five o'clock the report goes up, and when you dismiss it you are standing
exactly where you were standing at 16:59. Nothing moves you, nothing is rebuilt,
and nothing is handed back to you: the clock carries on running into the
evening, the phones stop, the light starts going, everybody around you starts
leaving, and the day changes at midnight, like a day. Your patience and your
energy come back across the small hours instead of arriving full at nine, which
means walking round town all night has a price and going home does not.

Time after five is compressed — the hour the floor empties in less so, the small
hours most of all — so the whole of 17:00 to 09:00 is about ninety seconds of
real time. Long enough to walk out to the car park and watch the streetlights
come on; short enough that nobody is sitting through it.

The light is one grade over the finished frame: a multiply colour and a strength,
interpolated along the sun's own arc, and nothing that draws knows what time it
is. Outdoors it goes the whole way; indoors it goes about half, because the
fourth floor has strip lights on a timer nobody has ever found and never goes
fully dark — it just goes gloomy, and at three in the morning it should. The
streetlights come on at dusk and put light back where there is a lamp, one of
them in eight flickers, and anything being driven has headlights.

The weather picks itself each morning out of the season's own bag and drifts
during the day. It dims the light and takes the colour out of it, it falls past
the camera, it wets the road — puddles gather in the same places every time it
rains and dry slowly after it stops — and in winter it lies. Fog is scaled by how
much light there is to catch, because fog at midday is a white sheet and fog at
two in the morning is whatever the lamppost makes of it. Indoors you get none of
it except on the one window on the fourth floor, which is exactly how much of the
weather anybody at that desk sees.

**And the year turns.** A fortnight a season, starting in autumn. The grass
outside is the payoff: the LPC terrain sheets ship the same square of ground in
four seasons at the same pixel, so one crop taken four times gives a verge that
is green in April, gold in October and under snow in January without a line of
the level changing. There is not much of it — both edges of the car park, the
strip under its wall on the road outside the doors, the long verge at the far
side of Corven Way — and that is the correct amount of nature for a business
park.

The season also decides when the sun is up, and that is where it stops being
decoration. In summer it is light until half nine. In winter the sun sets at
16:05 and the shift has fifty-five minutes left to run, so you arrive in the
dark and you leave in the dark, which is the single most accurate thing this
game says about working indoors.

**The floor empties, and the town fills up.** At five they go, and they go at
their own pace and in their own order — the same people first every time, the
same people last. They walk to the lobby, and then out onto the street and off in
their own direction: the bus stop, their own car in the bays, the subway under
the railway, a door above the shops, west past the multi-storey in no hurry
whatsoever. Stand in the car park at five past five and twenty people come out of
that building and go twenty different ways. Six of them wait at the stop, because
the 41 is a bus that stops, and they get on it when it comes and not before.

Not all of them go home. From ten past five there are six in the Bellhaven Arms,
one of them in the only chair; Marjorie is in the launderette with a service wash
on the way to her bus; Steve and Mo are on their own landing above the parade,
one sorting post addressed to people who left years ago and the other stood
outside his own front door for a minute before he goes in. Later there is a man
in the working men's club who was at the meeting where item seven was first
carried forward, and a man in the kebab shop waiting for the last bus, which he
catches every night and has never once caught the first of. When an evening
finishes they go home from where they are — out of that door, onto that pavement
— rather than from a desk they left hours ago.

Between quarter past eight and nine the next morning they come back the same way
and walk to their desks. Two of them never leave: Ron is on the desk, and Bev has
been here since six and will be here at six tomorrow. An empty building is a set;
an empty building with two people still in it is this building.

## Faces

Everybody blinks.

That is the whole of it, most of the time, and it is the thing that stops
twenty-one composited people from reading as furniture with legs. It comes from
the same Liberated Pixel Cup kit as the rest of them: the LPC Revised heads are
drawn with twelve expressions each — eyes closing, closed, looking left, looking
right, rolling, shocked, angry, sad, happy, blushing, ashamed — and the sprite
build brings all eleven of the non-neutral ones in.

An expression is a patch, not a face. Shipping a face per expression would be
two hundred and fifty-two more rows of character sheet, fourteen megapixels of
PNG for a change to somebody's eyebrows; so `tools/build-sprites.mjs` ships the
*difference* between a face and the same face at rest — twenty-two pixels by
ten, per head, per direction — and `engine/faces.js` draws it over the top of a
person who is already on the screen. The whole sheet is 68KB.

Two things had to be measured rather than assumed, and the build measures both
on every run and refuses to produce the sheet if either stops being true. A head
**moves**: it bobs through the walk, drops two pixels when somebody sits down
and rides four high through the run, so the sheet carries a table of where the
head is in every frame of every direction and the patch goes wherever the head
went. And a face belongs to a **person**: the build reads `revised.png` and works
out which of the three heads and which skin each colleague was composited from,
so Bev's mouth is Bev's mouth. The roster in `tools/sheets/faces.mjs` says who
it thinks they are and the build proves it against their own pixels — get one
wrong and nothing is built.

The cast's patches are also **masked against their own hair**, which is baked
into their sheet: nothing is kept that would land on Marjorie's fringe, so what
she can be seen wearing is what she wears. The player's cannot be — the hair is
chosen, not baked — and a heavy fringe takes a pixel or two of an eyebrow with
it, which nobody has ever noticed.

Where it shows:

- **In the dialogue box**, most of all, because that is where you look somebody
  in the eye. The portrait now blinks, and carries how they are with you — the
  same number `Rel.label` puts into words beside it. Only the ends of the scale
  show: the woman who is glad you are back, and the man who has told somebody
  about you. Say something they like and it lands on their face for a couple of
  seconds before handing the conversation back.
- **On the floor**, on anybody standing or walking. Not on a seated colleague:
  a seat faces its desk, and there is no face on the back of a head.
- **On you**, coming off a call. A call won, a call transferred, and a call that
  broke you are three different faces to be wearing on the way back to the desk.

Off with Animation — `Esc · Settings`, or the operating system's reduced-motion
setting — along with the breath and the walk. Nothing is said by a blink.

## The wallboard

Every call centre has one bolted above the desks: how many people are holding,
how long the oldest one has been holding, and how many of you are free to do
anything about it. It is the first thing you see when you walk in. So the title
screen is one.

It is live. Three calls are holding at 08:57 and one colleague is free, and
neither of those numbers is going to improve while you stand there reading them:
the queue grows on its own because nobody is answering it, the oldest call ages
in real time because it is a clock, and the count of people available goes to
nought within about ten seconds and mostly stays there. The service level
underneath degrades to match, and eventually stops being measured. Sitting on
the menu is the joke, and pressing **Start** is the punchline.

Behind it is the switchboard those calls are crossing — a drifting grid of
extensions with pulses routing over it, each one running a few hops and landing
on somebody's phone. The busier the board says it is, the more of them are in
the air, so the backdrop is the queue, drawn. Along the bottom, the noticeboard
by the lift, moving.

It is a menu you can walk now, which it never was: `W`/`S` or the arrows move
between the three buttons, `Enter` takes the one that is marked, and the marker
starts on whatever the buttons themselves say the default is — **Continue** with
a shift in progress, **Start** without one. Before this, the keyboard could do
exactly one thing to this screen, which was start a new shift over the top of
your save and then ask whether you had meant to.

Turn motion off — `Esc · Settings`, or the operating system's own
reduced-motion setting, which the game respects by default — and the drift, the
routing, the ringing handset, the failing strip light and the ticker all stop.
The board stops with them, holding the numbers it opened on. Nothing on this
screen is conveyed by movement alone, which is the test it has to pass. The
setting is read whenever the screen appears, so it is in force from the first
frame rather than switched off after you have already seen it move.

It lives in `css/title.css` and `engine/title.js`, and it animates on the
page's one loop rather than a `requestAnimationFrame` of its own — same `dt`,
same clamp, same stop when the tab goes away — for the same reason the arcade
cabinets do.

## Repository layout

This is the **private** repository: full history and staging. The public repo is
rebuilt from it as a single commit containing only the released files — see
`scripts/release.sh`. Nothing else here is ever published.

The game is `index.html` — the engine — plus the files it loads:

| | |
| --- | --- |
| `data/*.js` | The content: people and dialogue, items, callers, the office, the streets, and what happens when you press E. |
| `art/sprites/*.png` | The character, world and street art. Third-party, separately licensed. |
| `art/sprites/manifest.js` | Generated: the rectangles that describe those PNGs. |
| `tools/build-sprites.mjs` | Builds the sheets and the manifest, and touches nothing else. |
| `tools/carjam.mjs` | Dev-time only: the traffic put through the four things that used to beach it, headless, so a change to the driving can be measured rather than driven into. |
| `tools/doorjam.mjs` | Dev-time only: two crowds through one doorway, headless, so a change to the walk can be measured rather than watched. |
| `engine/faces.js` | What a person's face is doing: blinking, and the expression they are wearing. |
| `engine/sky.js` | The clock past five, the light, the weather and the season. Everything that draws asks it what time it is; nothing that draws knows. |
| `engine/guns.js` | The away-day box: five things drawn from a grid of characters rather than fetched — three you fire and two you swing — what they do to the people they land on, the arm the person holding them raises to do it, and the twist that lets somebody walk one way and point another. |
| `engine/title.js`, `css/title.css` | The title screen: the wallboard, the switchboard behind it, and the menu. |
| `scripts/release.sh` | Checks the build and moves the version string. Run it before you ship. |
| `editor.html`, `editor/` | A level editor. Not the game, and never published. |

They are plain scripts rather than ES modules on purpose. A module is fetched,
and a `file://` page cannot fetch — this way opening the page straight off disk
still works, which is a thing the test suite checks. Nothing reads pixels back
out of a canvas either, for the same reason.

Keep the folder together when you copy the game somewhere. `data/` is the game;
`art/` is required by the licence, and without it everybody in the office turns
back into an emoji.

```sh
cd tools && npm install                 # once, to fetch pngjs — dev-only, never shipped
cd .. && node tools/build-sprites.mjs         # rebuild every managed sheet and the manifest
node tools/build-sprites.mjs town        # rebuild one sheet
node tools/build-sprites.mjs --check     # fail if the committed output is stale
```

Two kinds of sheet, because there are two kinds of history. **Pinned** sheets —
`sanitary`, `world`, `revised`, the `parts-*` character layers — went through a
compositing and curation pass (layers stacked, recoloured, hand-picked seamless
crops) that predates this tool and was never captured as code. It cannot
rebuild them, so it doesn't try: `tools/lib/pinned.mjs` reads their entry
straight out of the committed manifest and carries it forward untouched, with
a checksum of the PNG as a tripwire — the build refuses outright if one of
those files ever changes on disk without this tool having done it.

**Managed** sheets are the rest — declared in `tools/sheets/*.mjs`, one file
per sheet, each sprite naming where its pixels come from and a crop rect.
Adding a sprite to the town, or anywhere else, means adding an entry to one of
these files — never hand-editing `manifest.js` or `CREDITS.md`, both of which
this regenerates and would just overwrite. Picking the crop rect is still a
human job: never take one off a contact sheet without tiling it a few times
over to check for a seam.

A sprite is usually one crop, and may instead be a STACK of them — `layers`,
with a finished `size` and each layer saying where in it to sit. That is for
kits that ship a thing in pieces on purpose: a road sign as a pole and a face,
a cased clock as the case on one layer and the dial on another, a bench too
long for its tile taken in two halves and joined. Doing it in the sheet keeps
the assembly re-derivable, rather than performed once in an image editor and
pasted in as pixels nobody can account for.

A sprite names its source in one of two ways, and a sheet may not mix them,
because a line in `CREDITS.md` names one source per sheet and has to stay true.

| | |
| --- | --- |
| a **repo** source | `repo`, `commit`, `path`, and the asset's display name in that project's own `Credits.txt`. Every build fetches the PNG and that `Credits.txt` fresh and re-checks the licence, so a licence changing upstream stops the build. The town and the faces are these. |
| a **file** source | `url`, `sha256`, `page`, and the credits written out in the sheet — for somewhere with no `Credits.txt` to read and no commit to pin, which is what an OpenGameArt submission is. There is nothing to re-parse there, so what is re-checked every build is the file's bytes: a re-upload under different terms stops the build instead of slipping through it. `CREDITS.md` marks those entries as reported by hand rather than read by the build, the same standing `LICENSE` part 3 already gives the sanitary sheet. |

Either way the licence is checked against what the sheet is allowed to contain,
and that depends on which **part** of `LICENSE` it belongs to. A part-2 sheet
takes OGA-BY 3.0 or CC0 and refuses ShareAlike. `part: 3` takes CC-BY-SA 3.0
and `part: 4` takes CC-BY-SA 4.0 — and each must be a sheet of its own, which
is the whole point: one ShareAlike crop packed in among OGA-BY ones would make
the entire PNG an Adaptation of a ShareAlike work and drag every other artist
in it into a licence they never chose, and the two ShareAlike versions do the
same thing to each other. `assertOnePart()` in `tools/build-sprites.mjs` is
what refuses to write such a sheet. GPL 3.0 is not accepted in any of them: art
offered only under the GPL is refused rather than quietly taken, for the reason
`LICENSE` part 3 gives.

Two kinds of managed sheet, and a sheet says which it is with `kind:`. A sheet
of THINGS is crops — the town — and is what a sheet declares by saying nothing.
The expressions sheet is the other kind: it is measured against the pinned
character sheets rather than cropped, so it says `kind: 'faces'` and is built by
`tools/lib/buildFaces.mjs`. A third kind would be a line in
`tools/build-sprites.mjs` and nothing else; everything downstream of the build
takes the same five things back, whichever built them.

### What a level may declare

A level in `data/levels.js` is its size, its rooms, its doors, its arrival
points and the links out of it. Two flags on it say what it is to the building:
`hub: true` is the floor with the twenty people and the ringing phones on it,
and `arrive: true` is where a shift begins. Both are asked of the catalogue
rather than written into `engine/` — `arrive` was a hard-coded `'office'` in two
places, which was true for exactly as long as the building was one floor.

Four more tables exist for the streets, and they are all optional — a level that
declares none of them is exactly the level it always was.

| | |
| --- | --- |
| `surfaces:` | Rectangles of `SURFACES` (data/world.js) painted over the rooms. What a tile is MADE of, where that differs from what its room is made of: a street is one zone with one name and a carriageway down the middle. `R.kerbs()` derives the kerb from wherever two of them meet. A surface that says `open` is ground you can see and cannot stand on — the river, the ballast — still solid, still uncollidable, and drawn as itself rather than as the roof the wall pass gives every other piece of wall mass. `{ s: null, r: [...] }` takes a surface back off again, which is how a platform is a platform and the ballast beside it is not. |
| `paint:` | The markings. `dash`, `line`, `yellow`, `zebra`, `bays`, `text`, `rails`, all in tiles, all drawn by `R.roadPaint()` rather than cropped — a marking is position-dependent and a tile is not, and a running line least of all. |
| `cars:` | What is parked, and what is driving. A car is not furniture: it is at a pixel, at an angle, at a speed, so it lives here and in `engine/cars.js` rather than in `furnish()`. `model:` names an entry in `CARS`; `body:`/`roof:` repaint that model for one car; `drive: true` lets you in; `route:` makes it traffic. |
| `peds:` | Who is walking about. Same shape as a traffic car and for the same reason — a pixel, a route, a speed — and deliberately not the machinery in `engine/npc.js`, which is twenty colleagues with schedules and a grudge about a doorway. A route is `[x, y]` waypoints in tiles, with an optional third number to stand there for that many seconds. See `engine/peds.js`. |

Two flags on a furnishing are read by the engine and are worth knowing about:
`sprite:` names a rect in the atlas to draw instead of the emoji, and `fromCar:`
means the thing is meant to be reached without getting out — which is all a
drive-thru is, and all the next one will have to be.

One table is not a level's at all. `FLOORS` in `data/world.js` is the buttons in
the lift car, in the order they are in it, and each row names a `via` — a link,
exactly as every other way out of every other room does it. That is the whole of
how a lift knows where it goes, and it is why `Acts.lift()` does not know what a
floor is.

The editor has no tools for any of the four and carries all four through
untouched, which is the next best thing — see `Doc.surfaces`.

### What collides with what

`engine/collide.js` is the one place that answers "can this be here", and it
answers it with three shapes rather than with the tile grid.

**Feet** decide where you can stand: a small box on the ground, tested against
walls (which really are tiles) and against other things' *footprints*, which are
the size of the thing that is drawn and not of the square it stands in. A
lamppost is a post you can walk a trolley round; a poster is flat against the
wall and you can walk along in front of it. `ground` in `FURN` is the override,
in fractions of a tile, and the default is still the whole tile — opt-in kind by
kind, so nothing that was walkable stopped being walkable.

**Bodies** decide what you can touch: a capsule, with a radius that also comes
from the drawn size, and the reach for an event is measured surface to surface.
That is why a copier is reachable from a step further back than a mug. Which one
you get is still ranked by distance between tile centres, because a size-aware
ranking hands every tie to the biggest thing in the room.

**Depenetration** is the rule the old system did not have. Anything already
inside anything else is told the shortest way out and shuffles that way. Being
stuck is a state the collision system has to end, not one it is allowed to
enforce — which is what a car wedged against a wall at an angle used to be,
permanently, because every candidate move was refused including the ones going
the right way.

`World.isSolid` is untouched and still thinks in whole tiles. That is on
purpose: it is what colleagues' pathfinding, the waypoint checks and the
editor's flood fill ask, and a route planned on tiles is still a route a walker
can follow, because the fine shape is always inside the coarse one.

### Shipping

```sh
./scripts/release.sh --check     # parse every script, check the atlas, change nothing
./scripts/release.sh --commit    # ...then move the version string and commit it
```

Every script and stylesheet is loaded with a `?v=` on it, and that string is the
only thing between a player and a cached copy of last week's game. Moving it is
the one thing a release has to do that nothing else does — ship without moving
it and a returning browser serves whichever of the old files it still happens to
have, which is not all of them and not none of them: a new engine reading an old
level, for ten minutes, silently. One string for the whole release, deliberately,
because a per-file hash is what would let a browser hold a mixed set in the first
place.

It also parses every shipped script, refuses if the sprite atlas or `CREDITS.md`
is stale, and refuses if a page references a file that is not there. It does not
publish: the public repository is built from this one and its remote is not
recorded here.

## The level editor

Serve the folder and open `editor.html` — its own page, deliberately, so the game
itself is untouched and loads nothing from it. It draws the level with the game's
own renderer, so what you see is what the player gets.

It is published beside the game, at
<https://ericdarkomen.github.io/CallHall/editor.html>.

Draw rooms, place doors and counters, move the furniture, turn it a quarter at a
time (`T`, or the four buttons in the inspector — art only, nothing about what
is solid or what `E` does), set the arrival points and the links between levels. It checks the level on every edit — the one that
matters counts how many separate pieces the walkable floor is in, which is the
class of fault you cannot see on screen and that has shipped here before. Then it
writes the source back out for you to paste into `data/levels.js` and
`data/world.js`.

What a room is MADE of is the Rooms tab: its colours, and the floor and wall
tiles laid over them. Both are picked as tiles rather than as names — each swatch
is the bitmap the renderer bakes, tinted through that room's own colours, so what
you are choosing between is what the room will be. A room selected on the map
shows its floor and its wall and opens the same page. `▶ Try it in the game`
opens the game in a new tab on a level the room type is painted on.

### Saving, and publishing from a phone

**Publish to GitHub**, on the whole-game sheet, is the one that works anywhere:
the finished files go straight into the repository the page was served from, as
a single commit, and the site rebuilds itself. On a phone there is no folder to
be given and nowhere to put a download, so this is the only way there is — and
it is the reason the editor is published beside the game at all.

It asks once for a repository and a token. On a Pages URL the first three
fields are already filled in — `owner.github.io/repo/editor.html` names both
halves — so the only thing to type is the token. Make a **fine-grained** one at
[github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new):
**this repository only**, **Contents: read and write**, and an expiry date. It
is kept in that browser's storage and sent to `api.github.com` and nowhere else;
"Forget the token" is beside the button that uses it.

Each file is read from the branch it is about to land on rather than from the
served copy, so a deploy running a minute behind cannot put yesterday back. It
is one commit — blobs, a tree, a commit, then the ref moves — so there is no
state in which half a save is on the branch. Pages then takes a minute or two,
and the game may hand you a cached copy for a few minutes after that.

**Save to the game files** is the same work with a different destination: a
folder on the machine you are sitting at. Chrome and Edge ask for the game's
folder once and write there; Safari and Firefox have no folder picker, so it
prepares the same files and downloads them for you to drop into `data/` — and
settles nothing off the bench, because a browser cannot tell whether you moved
them.

Both write each table whole, including the fourth floor's own floor plan, which
lives in `data/world.js` as `ROOM_DEFS`, `DOOR_DEFS` and `WP` rather than in its
catalogue entry. What neither can write, they say by name: a procedural
`furnish()` is the file's, and the Export tab's change list is what to edit it
from. Nothing declined is taken off the bench.

```sh
python3 -m http.server 8000    # then http://localhost:8000/editor.html
```

## Licence

Three parts, because there are three kinds of thing here. See [LICENSE](LICENSE).

**The game** — code, writing, characters, design. Copyright © 2026 Grant van Zyl,
licensed [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) —
share and link it freely, but not commercially and not modified.

**The sprites** — the people, the office kit, the road surface, the pavement,
the awnings — are not ours. They are pixel art from the
[Liberated Pixel Cup](https://lpc.opengameart.org/) community, used under
[OGA-BY 3.0](https://static.opengameart.org/OGA-BY-3.0.txt) and **modified**
(composited, recoloured, cropped). Artists and sources are listed in
[art/CREDITS.md](art/CREDITS.md). That art is *not* covered by the game's
NonCommercial or NoDerivatives terms — the PNGs in `art/sprites/` are the clean
copies to take if you want them.

Most of the sheets above use only assets offered under OGA-BY 3.0 or CC0,
deliberately: neither carries a ShareAlike term, so using them costs
attribution and nothing else. `tools/build-sprites.mjs` re-checks that against
upstream's own licence data on every build and refuses to produce a sheet if it
stops being true.

ShareAlike art is not banned outright — it is kept in files of its own, and
there are three of them across two parts. `art/sprites/sanitary.png` has always
been one: a CC-BY-SA 3.0 tileset, in a sheet nothing else is packed into, under
its own terms in `LICENSE` part 3. `art/sprites/wood.png` is the second, and it
is the first one the build tool makes rather than carries. `LICENSE` part 4 and
`art/sprites/victorian.png` are the third, and they are a **different**
ShareAlike: CC-BY-SA 4.0, which the submission offers and nothing else.

Two ShareAlike parts rather than one, because 3.0 and 4.0 are not the same
licence and a section claiming to cover both would be wrong about one of them —
they differ on how an Adaptation may be relicensed, on how attribution and
notice must be given, and on whether a breach can be cured. Compatibility also
runs one way: merging the two sheets would quietly relicense the part-3 art
under 4.0, which is not ours to do to somebody else's work. So each gets its
own part, its own PNG, and `assertOnePart()` refusing to write a sheet that
mixes anything with anything. `CREDITS.md` marks each non-part-2 sheet in the
list at the top of it, so the OGA-BY sentence underneath is not quietly
covering something it does not cover. See `LICENSE`, and the build section
above.

A work of fiction; CALLHALL Services plc and everyone in it are invented.
"Call of Duty" is a trade mark of Activision Publishing, Inc. — this is an
unaffiliated parody about a call centre.
