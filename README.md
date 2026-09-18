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
| The map    | `N`, or the minimap             | `☰` · Map                      |
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

There is traffic. Sixteen of them, including a learner, three buses and the 41A,
running eight circuits through the same nine junctions on the correct side of the
road. They brake for corners, fall in behind each other, give way at junctions,
stop for anybody on foot, and sound the horn when they have been waiting a while.
They are not scenery: drive into one and both of you will know about it.

They also know where the road is, which sounds like the least a driver could do
and took a while to arrive. A route is a line somebody drew down a lane, and a
car shoved off that line — by you, mostly — used to go on steering for its
target from wherever it had been left, which was frequently the pavement, and on
the pavement it stayed, because forwards was a shop front and forwards was the
only direction it had. So they read the tarmac: they steer away from a kerb
rather than up one, they reverse out of the things a route cannot know about,
and they work out which leg of their route they are actually nearest before
driving back to it.

### What a driver has in front of it

The rest of it changed because of one idea, which is that a driver should have a
PATH and not a heading. Every vehicle out there plots the next two and a half
seconds of its own lane every frame — round however many corners that reaches,
onto the next leg of its route without having to notice that a route has legs —
and then everything else is a question about that path rather than about the
nose of the car.

It is the difference between traffic and a row of cars having a nervous
breakdown, and it is worth saying what it replaced, because all four of these
were visible from the pavement.

**They stopped dead for moving traffic.** The whole speed rule for anything in
front was: if there is something there, stop. A car that caught a slower one
braked to a standstill, sat for four seconds, crept forward at walking pace until
it was moving, found the thing in front had gone out of range and floored it
again. Every queue in this town was that, sixty times a second. It is a following
model now — a gap, a closing speed, and the speed it could still stop from — so
cars slot in behind each other and stay there, and a bus at a stop has a queue
rather than a pile-up.

**They queued behind parked cars they could see past.** Twenty-seven cars are
parked at kerbs out there, each a tile off its lane centre; a car is thirty-five
pixels wide and a tile is thirty-two, so "is it within a tile of my nose" said
yes to every one of them. The whole of Bellhaven Road used to stop for a
hatchback that was not in the road. What matters is how far into the corridor
something reaches: a few pixels is a thing you move over for, and they do, which
is also how a bus gets down Corven Way past the estate on the south kerb — it
cannot do it on the lane centre, and it knows.

**They could not see people they were about to hit.** The check was one POINT a
stopping distance in front of the bumper, so anybody between the bumper and that
point — which is exactly where somebody stepping off a kerb is — was not there at
all. It is the whole corridor now, and there is a floor under it in
`engine/collide.js`: no car may move onto a person, which for the first time
includes the one you are driving. Drive at somebody and you stop against them.

**They found out about junctions by arriving at one.** Priority used to be
settled after two cars had stopped facing each other, by a timer. Now two paths
are compared before either car gets there: whoever arrives first goes, ties are
give way to the right, and a car that decides to wait pulls up far enough back
that the car it is giving way to can actually use what it has been given. That
last clause is not a detail — the 41 spent forty seconds of every lap correctly
giving way to the 12 while parked across the junction it was giving way in.

After a few seconds behind something parked that is plainly never going to move,
one of them will still pull out and go round it — checking now that nothing is
coming the other way, which nobody thought to ask when nothing overtook anything.
Not for a person: nothing out there ever does anything about a person except
stop.

**And they indicate before they turn**, which is the one thing out there that
exists entirely for somebody else to read. The amber used to be taken from where
the steering actually was, so every vehicle in town signalled *during* its turn —
correct to the frame, and not what an indicator is for. A driver signals before
the wheel moves, far enough back that the car behind can do something about it,
and that is a thing a driver can only do if it knows where it is going. They do
now: ninety-three per cent of the turns begun in a three-minute run are
signalled, a median of one and a third seconds before the wheel moves. They also
signal moving out round something and pulling away from a stop, and they do not
signal the six-inch corrections they are making all day round the cars parked on
every kerb in town — a town of cars indicating constantly tells you nothing at
all. The brake lights got the same treatment from the other end: latched for a
quarter of a second, because a car easing along behind a bus sits a hair either
side of the speed it wants and every one of those crossings used to be a flash
of red.

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
Street, and seven tiles around each bus stop. Twenty-seven cars sit in them, one
in every other stretch and never two stretches running — and one more sits on the
zig-zags outside the new crossing on the High Street, which is where that one was
always going to end up. Two came off Fenn Street with the paint when the crossing
there took the kerb.

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

**The doors open.** `15 Panel Door A` is not a door, it is a fourteen-frame
SWING in eight wood tones — and every door in this game used to be frame eleven
of it, standing at forty-five degrees, for ever. A door caught mid-open and
left there, twenty times along one parade.

Four frames of it are cropped per tone now, from shut and flat in its own
opening round to wide, and `R.swingDoors()` runs them: a shop door opens when
you walk within a tile and a half of it and closes a little slower behind you,
at a fixed rate so it takes the same third of a second whatever the frame rate
is doing. Only for a unit with something behind it — **seventeen of the town's
frontages have no interior**, and the cash and carry does not open for anybody.

The frames are padded into one box to make that work. Upstream's get narrower
and taller as the door turns away from you, and they are drawn hinged on the
left; blit them centred, the way everything else is, and the door does not
swing, it shrinks into its own middle and grows out of the floor.

**The windows are shopfronts.** `shopwin` has been wrong twice: first the
office's `wall.mirror`, which on a two-tile wall read as exactly what it was,
then a tall sash off a castle-window sheet, which filled the wall and read as
the front of a terraced house — because a sash IS the front of a terraced
house. Neither kit had a shopfront in it. One does now
(`tools/sheets/frontage.mjs`): two tiles across, mullioned, on a stall riser,
with a painted timber frame and a lintel, in **four colourways picked off the
tile** so no two units in a row wear the same paint.

**And the light is drawn, not swapped.** The parade used to come on at dusk by
exchanging every window for a second copy of itself with yellow behind the
panes: one hard-coded brightness, no falloff, and a sheet carrying two of every
window so that one of them could be on. `R.lamps()` draws it now, as what a lit
window actually is — a warm room seen through glass, brightest at the middle of
the pane — which works on any window in any colourway, and let three of the
four arrive for free. The same tile hash decides whose lights are on, so a
parade at eight o'clock is twenty units lit and ten dark.

The doorways do the other half. How much light comes out of one is a function
of how far its door is open: a shut shop with its lights on leaks a line round
the leaf, and the same shop with the door swinging back **throws a wedge of its
own inside across the pavement** — a slot-shaped light, because a doorway is a
slot. Walking up a parade at night is worth doing now.

**And there are roofs on it now**, which is the largest single thing on this map
that was not there. Everything solid outdoors that no floor can see is a roof —
the middle of a block, and the whole of the town past the edge of what is drawn.
That used to be one baked slate texture in two variants with a black square on a
quarter of them standing for a vent. On one tile it is a decent piece of drawing.
On the four hundred tiles between Cargate Lane and the retail park it is a
swatch, and the one thing a swatch cannot do from above is say where one
building stops and the next one starts.

So the roof is derived in three steps and the first is the one that matters.
**The mass is cut into plots** — `R.roofPlots()` floods the roof mass four ways,
and every connected piece of it is a BLOCK: not a building, a row of buildings
that share party walls. Where those walls fall is the whole job, because
everything else about a roof is a fact about the building and not about the
tile.

The first version of this asked the COORDINATE — the map banded in runs of three
to five, each run banded front to back differently from the run behind it. Tidy
arithmetic, and wrong in the one way that matters: it knows nothing about the
mass it is cutting. A block eleven deep and seventy wide came out as sixty-odd
plots of three by four, each drawing its own material, and what that is from
above is not a town, it is a quilt. A high street whose roof changes colour
every three metres in both directions reads as a rendering fault, which is what
it was.

A block is cut the way a terrace is actually built. **Down the short axis,
always** — the frontage is on the long side and the building runs back from it,
so a block seventy wide and eleven deep is units three to five wide and eleven
deep, and cutting it the other way puts a party wall across the middle of a
building. **Between the shops, where there are shops**: a frontage is a door,
the doors are in `data/levels.js`, and halfway between one door and the next is
where the wall between two shops is. Cut on a hash instead and the Bellhaven
parade's six-tile units wore a new roof every three. **And back to back only
when there are frontages on both sides** — a block with a street each side is
two terraces meeting down the middle, a block whose far side is the edge of the
map is one terrace running all the way through, and telling them apart by depth
alone gave the backs of the buildings party walls in different places from their
fronts. Mass with no door on it anywhere keeps the hashed three-to-five rule,
which is a terrace nobody has drawn a frontage on yet.

**Then the tile** — thirteen per
material off `art/sprites/roofs.png` (`tools/sheets/roofs.mjs` — sixty-five
crops off the [LPC] Roofs submission), a corner-matched set of field, edges, outer corners and inner
corners, picked by which of this tile's four corners are inside the same plot.
That is what puts a coping all the way round every building, mitred at the
corners and returned into the inner ones, without anybody drawing one. Two
pixels outside that coping are clear, and what shows through them is the gutter
between two parapets — the single line doing the most work in the whole pass.
**Then what is on it,** because a flat roof is never empty: a mushroom vent, a
wired-glass rooflight, an air-handling unit with a duct off the side, a water
tank on a gantry, a stair-and-lift overrun with its own little parapet, an
H aerial and a dish pointing two different ways, a chimney stack with four pots
on it and nothing lit under any of them since the clean air acts. Those are
drawn in code and baked into the same tile, so a roof with a lift overrun on it
still costs one blit.

**Five materials, and a terrace is roofed all at once.** Slate, lead, felt,
pantile and oxblood, drawn from a weighted bag — and drawn from once per
TERRACE, not once per building. Twelve houses go up together and are covered
together; what varies along a real run is one or two of them, where somebody
took the slate off in 1988 and had it felted. So the block draws, each unit has
about a chance in seven of having been done since, and a run of six or more
always has at least one, because the exception is the point. A unit that has
been re-roofed is a different plane and gets a parapet of its own, which is what
a change of material at a boundary actually is; the rest of the run is one roof
with **party walls drawn on it** — two pixels of dark on the boundary, from both
sides — and one boundary in five has none at all, because a covering laid over
your neighbour's wall as well as your own leaves nothing on top to see. The
decision is taken for the boundary rather than for the tile, so it is invisible
down its whole length rather than flickering along it.

The one region that is not a terrace is the **rim**: the outermost ring of the
map, which is the town carrying on past the view. It wraps the whole map, so
roofing it in one go put one colour on every edge of the world — including both
sides of a railway the southern half of this map exists to be four hundred years
older than. Out there every unit draws its own, from the bag for the part of the
map it is standing on. The fill does not cross the rim either, or every block
that touches the border comes back round the top of the map as one nine-hundred
tile building.

The bag is weighted so that a street is mostly slate with a couple of felts and
one red one rather than an even split between five colours, which would read as
deliberate — and nothing about a roofscape is deliberate.
North of row 60 that is the default bag, which is what a town centre rebuilt
between 1958 and 1971 is roofed in. South of it a level may say otherwise:
`roofs:` is a list of rectangles and palettes, the same shape of thing as
`surfaces:` and doing the same kind of job, and the old town's says pantile and
oxblood and slate and **no felt at all**, because there is a conservation area
officer in this town whose entire job, as far as anybody on Priorygate can tell,
is that. The minster gets a line of its own and one material: a building that
size is roofed in lead.

A plot one tile deep has no honest coping to draw and no kit has a piece for it
— the terrace of warehouses along the quay is one, and so is the nave. Those get
a **party wall** instead, a line of the gutter's own dark down each side the
plot does not carry on into, which is the difference between a row of little
buildings and a stripe.

### The front of a shop

Four things about the street were wrong in ways you could see from the pavement
and nobody had written down.

**The doors were half a door.** `tools/sheets/town.mjs` crops the shop doors out
of a sheet called `32x64px Doors`, in four colourways and four frames of swing,
and every one of the sixteen crops was short by exactly thirty-two pixels — one
tile — so what got packed into the atlas was the top two-thirds of a door. On
screen that is a door a head shorter than the person walking through it, on a
parade where the wall behind it is two tiles high. The crops take the whole door
now: a shut leaf is fifty-eight pixels against a fifty-six pixel person, which
is a door. Nothing else changed — same source, same licence, same swing.

**The roof was drawn under the wall.** A wall you can see the face of is drawn
two tiles high, and the second tile is drawn over the tile above it — which was
roof, and which was in the same plot as the roof behind it. So the parapet that
finishes the top of a building was drawn a row too low and then covered up, and
the roof plane started a row further back with no edge on it at all. The
building had no top. `R.roofAt()` calls that tile wall now, and the coping lands
where the building actually stops.

**And it went transparent when you walked past it.** The wall fade answers
"which side of this wall is the player on", which is worth the loss of a solid
wall for an interior partition with a room behind it and worth nothing at all
for a shop front with a building behind it. Walking up the pavement north of the
parade faded the whole row to fifteen per cent. Solid mass behind means no fade.

**The parking bays had no heads.** Every bay in both car parks was two parallel
lines and an open end, because the line closing the head was laid exactly on the
boundary of the bay rectangle — which is the boundary with the car park wall,
which is drawn after the paint and over the top of it. Half a line of three
pixels survived, under a wall. Drawn two pixels in, it is a bay.

The graffiti moved with the same pass. A tag is two or three tiles of WIDE, and
on Aldergate Rise and Marlow Street the wall it is sprayed on runs north to
south — so it lay across the street instead of along the wall, a third of it on
the pavement and a third on the carriageway. `paint` turns with its wall now:
east and west get a quarter turn, and a wall to the south is already the right
way round.

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
of temporary traffic lights. The lights are fixed on red, and that was honesty
rather than laziness: when they were cropped, nothing in this game phased a
signal and nothing in `engine/cars.js` knew what one was. Bellhaven has working
lights now — see **Three sets of lights** below — and this sprite did not become
wrong, it became specific. It is the one head in this town that has never shown
anything but a red: temporary three-way lights round a hole with nobody working
in it, stuck since March, with the lane behind them coned off and no route in the
level going down it.

Seven more achievements are down there. Not one of them is an achievement in the
ordinary sense: every single one is somebody spending four minutes and about a
pound on the wrong side of a railway line in the middle of a working day. That is
the whole of what the old town is for.

## Three sets of lights

Everything on this map is geometry. A car stops because there is a car in the
way; it gives way because the other one is on its right; a pedestrian goes round
a bin because the bin is there. All of it is a fact about where things are,
which is why none of it needed a clock.

**A red light is not a fact about where anything is.** It is an instruction, it
comes from somewhere else, and obeying it means stopping at a painted line in
front of an empty junction. It is the first rule out there that has to be told
to the traffic rather than discovered by it, and that is why `engine/signals.js`
is a file rather than a paragraph in `engine/cars.js`.

**The junction is the High Street and Cargate Lane**, which is a T because
Cargate does not go north of the shops, and which is the busiest piece of road
on this map: everything that laps the west block or the east block comes through
it and both buses go straight over. It was a give way sign. What a give way sign
cannot do is the thing you can now stand on the corner and watch — a car coming
up Cargate used to wait for the 41, and then for the 41A, and then for the car
behind the 41A, because giving way means waiting for a gap and there is no gap
on the High Street between ten past nine and four. **The lights make a gap
instead of waiting for one.**

Green, amber, all red, red-and-amber, green, and the periods are the real ones —
three seconds of amber and about two of red-and-amber, which is a detail nobody
would notice if it were missing and everybody notices when it is wrong, because
they have been watching it from a driving seat since they were seventeen.

**And they are vehicle-actuated,** which is the part that matters in a town with
sixteen vehicles in it. A fixed cycle would stop the High Street for an empty
lane twice a minute. This one rests on the main road and only changes because
something came up Cargate and asked; having served a minimum green it changes at
the first break in its own traffic rather than the instant the clock runs out,
so the car eight feet from the line goes and the one twelve tiles back does not
get to hold the side road up for it; and it gives up at the maximum whatever is
still coming, which is what stops a solid stream keeping Cargate waiting until
five. The car being driven counts as traffic, so sitting at a red in the pool
car is a thing the lights are actually waiting for rather than a punishment.

**The other two are pelican crossings**, and both of them are exactly where
somebody was already crossing without one. The man on the phone has walked over
the High Street at that point every lap since the day there were people out
here, and the hi-vis has crossed Fenn Street at that one; the level's own
comments have said so for months, in a note about the difference between
jaywalking and walking into a car. A crossing goes on the desire line or it goes
nowhere. The Fenn Street one is four tiles from a junction mouth and is
therefore too close to the junction, which is where people cross, and which is
an argument every highway authority in England has had and most have lost in the
same direction.

A pelican has the button, the **WAIT** plate, the green man, the bleeper at
2.5kHz because that is where the ear is sharpest, and five seconds of flashing
amber at the end. That last one is the only aspect in this game that means *go
if you can* — and it needed no code at all, because a car in Bellhaven has
stopped for anybody in front of it since long before there was a crossing to do
it on. The oldest rule out there turned out to be the one that made the newest
phase work.

The people press it themselves. That is the difference between a crossing and a
decoration: walk up the High Street at any point in a shift and one of them is
mid-cycle for somebody who is not you. You can press it as well, and if it is
already lit you will press it again anyway, as will everybody, for ever.

### What the cars had to be told

Four rules in `engine/cars.js` had to be told that a queue at a red is not a
fault, because every one of them was written for a car that is stopped for no
good reason and a car at a red light has the best reason there is. Without it,
four vehicles waiting out a phase creep into the back of each other one at a
time from the fourth second on, go round each other down the oncoming lane, and
sound the horn about it. The stuck detector sits it out, the deadlock-breaker
sits it out, the pull-round sits it out, and nobody sounds the horn at a traffic
light — they sound it at the car in front of them a second after the light has
changed, which is a different game and not one this town plays.

The stop itself is shaped like the bus stop rule above it, which is the piece of
this that was already written: a vehicle brought to a halt by a ramp over the
last few metres arrives at a line, and a vehicle that reads a boolean and sets
its speed to nothing arrives at the line by emergency-braking on top of it.

And which arm is holding a car is **latched onto the car** rather than asked
fresh every frame. A car creeping up to a line arrives with a few pixels of it
in front and then a few pixels of it behind; a question asked again on the frame
it drifted past releases it, and what you have then is a car in the middle of a
junction on a red with no reason left to stop. A real driver does not re-derive
whether the light applies to them either.

### The markings

`stop` and `pelican` are two new words in the road paint vocabulary, which takes
it to ten. A stop line is not a give-way line — one is the thin one you may
cross when the road is clear and the other is the fat one you may not cross at
all — and putting the wrong one under a signal is the same class of error as a
centre line painted through a zebra.

`pelican` is one word for the whole marking because on the ground it is one
marking: the two rows of square studs across the road *and* the zig-zags up both
approaches. You can tell a pelican from a zebra at fifty yards, before you have
seen a single lamp, and it is the zig-zags that do it. They are also the reason
a run of kerbside parking came off Fenn Street and another was cut short on the
High Street — nothing may be left on a zig-zag, which is a rule the white van
outside the new crossing has considered carefully and rejected.

The heads are drawn rather than cropped, for the same reason the cars are: the
whole of what a signal does is change. A black board with a white border, a hood
over each lens, and the two lenses that are off drawn as what they are — dark
coloured glass, not grey holes, because an unlit head is three dark circles and
a head with holes in it reads as broken. Lighting one puts a bloom round it over
the sky grade rather than under it, exactly as `R.lamps()` does the streetlights,
which is why a red light has something round it at eight o'clock and nothing
round it at two in the afternoon.

### Proving it

`tools/lightjam.mjs` is the third of the headless harnesses and it asks the
three questions a signal introduces, none of which you can answer by driving
around and looking:

```sh
node tools/lightjam.mjs          # five minutes of Bellhaven, nobody watching
SEED=7 MINS=20 node tools/lightjam.mjs
node tools/lightjam.mjs path/to/signals.js   # some other copy of the lights
```

**Does anybody run a red** — measured as a car *crossing* a stop line during a
red, per car, per arm, every frame, with the geometry done again from the arm's
own numbers by something that does not know what a latch is. A harness that asks
the code under test whether the code under test is happy is not a harness.
**Does the town still move** — the holds, and the shunts, pull-rounds and horns
that must all be zero at a red. **And does anybody ever get across**, because
two of the three installations do nothing at all unless a pedestrian asks.

It exits non-zero on any of them, so a change to the lights cannot land quietly.

`tools/carjam.mjs` runs the lights too now — they are part of the driving rather
than scenery a car is stubbed against — and its first scenario, the undisturbed
control, is the argument for the whole thing. Signalising that junction took it
from **1.67% of car-frames off the road to 0.05%**, and the longest any vehicle
went nowhere from **53 seconds to 28**. The give-way scramble at the mouth of
Cargate Lane was the single largest source of beached traffic in the town, and
the fix for it turned out to be the thing every real junction that busy already
has.

Giving the drivers a path rather than a heading, and the collision one shape
rather than two, is the next column of the same table. Seed 12345, the same four
scenarios:

| | before | after |
|---|---|---|
| left alone: vehicles stalled over 12s | 5/16, longest 28s | **2/16, longest 20s** |
| twelve sustained shoves: off the road | 3.50% (67 car-seconds) | **0.00%** |
| twelve sustained shoves: still off the road at the end | 3 | **0** |
| a car left across a lane: stalled over 12s | 1/16, longest 28s | **0/16, longest 10s** |
| all nine put on the footway: off the road | 24.88% | **20.10%** |
| all nine put on the footway: still stranded at the end | 1 | **0** |

The last of those is close to its floor rather than close to nothing, and that is
on purpose: a car beached where no lane can reach it waits half a minute before
it is allowed to rejoin its route, and it is only allowed to do it off camera.
Nine cars times thirty seconds is most of what is left in that row. A lost driver
is a better thing to watch than a car that was not there when you looked.

Five minutes of `lightjam.mjs` over the same change: **58 stop lines crossed
instead of 53**, nobody through a red in either, the same 217 car-seconds held,
and 224 horns instead of 249.

There is a fifth scenario now, and it is there because of a fault none of the
other four can see. A car steers at a point on its own lane; a car turns in a
circle of radius speed-over-lock; and when the point is nearer than the circle it
does not converge on it, it **orbits** it. A car shoved a tile and a half
sideways at a junction mouth has exactly that — the nearest bit of its lane is
ninety degrees off its nose — and it is not off the road, not stopped and not
stuck. It is doing forty pixels a second, round and round, in a circle the width
of a bus, with a queue building behind it, and every number above calls it
healthy. So scenario five leaves four cars across junction mouths and is read on
**legs completed**: a town whose vehicles are all driving and none of which is
arriving anywhere is not a working town.

It earns its place immediately. Three plausible cures for the orbit were written
and all three were thrown out on these numbers — rounding the route's corners
into arcs, lengthening the look-ahead for a displaced car, and slowing hard when
pointing the wrong way — along with a fourth change, settling merges in the
give-way rule, that looked like an improvement on the control and cost four
vehicles' worth of legs here. A harness is only worth having if it is allowed to
say no.

### What it costs per frame

The traffic, the people and the lights, measured headless over six thousand
frames of the real town:

| | before | after |
|---|---|---|
| the whole street, per frame | 5050 µs | **1302 µs** |
| the cars | 2575 µs | **1144 µs** |
| the people | 2462 µs | **147 µs** |

Nothing in the driving changed to get that — `carjam` comes out identical on all
five scenarios, to the second, which is the point. Four things were wrong and all
four were the same kind of wrong, which is arithmetic being done again that was
done last frame:

- **A car's rectangle was rebuilt for every test.** It is two numbers off a
  model in `CARS`, and the fit test asks for them once per vehicle on the map
  every time anything moves — sixteen hundred throwaway arrays a second for the
  length and width of a saloon, which is the same length and width it was last
  frame. Cached on the model: the collision test went from 49 µs to 5.5 µs.
- **Every step every person took was tested against all sixty vehicles**, in
  full rotated-box arithmetic, including the ones parked on the other side of
  the railway — and a pedestrian takes several steps' worth of tests, because
  going round a lamppost is a ladder of candidate angles. Two subtractions and a
  compare throw out fifty-nine of them.
- **The tile scans took a ring of neighbours they did not need.** A footprint
  cannot leave the tile it is keyed to, which `foot()` now guarantees rather
  than merely manages, so the ring was forty-nine map lookups per test for a
  bus of which thirty-four could never match.
- **The tiles a parked car covers were recomputed sixty times a second.** Fifty
  of the sixty vehicles out there have not moved since the level was built.

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

## A queue has a front

Twenty colleagues share about a dozen destinations between them and most of the
ways between those destinations are one square wide. That is the whole of the
crowd problem in this building, and `engine/npc.js` already had the good half
of the answer: routes that price a person standing still at six squares of
walking, so a knot of people is gone round rather than walked into; a wait on
the square in front of you rather than a shove; and a doorway that holds one
person, because a doorway holds one person.

What it did not have was an answer to the failure those three make TOGETHER.
`tools/doorjam.mjs` is where it shows: twelve people shuttling both ways through
one door for three minutes. The door was empty for ninety-two per cent of a run
in which somebody wanted through it the whole time, and from forty seconds to a
hundred and sixty the twelve of them stood in one unchanging arrangement — the
same people on the same squares waiting for the same people.

Four things, and the first is the one you would see:

**The person at the front of the queue could not move.** `canGo` refuses any
step that closes the gap with anybody, which is right for two people passing and
wrong for ten packed round a doorway: with somebody on every side there is no
step at all that opens every gap at once. So the one at the front — walking,
with the doorway empty and its turn to use it — was frozen solid. `doorClear()`
has always promised that somebody facing a wall of people turns sideways and
edges out of a doorway; nobody ever extended that to the person trying to get
INTO one, who is the person the entire queue is behind. They do now, on the same
terms and one square earlier: a third of a second of trying and failing to move,
and the square they want is a doorway that is theirs to take.

**A ring is not a queue.** The long wait — hold the line, because a queue clears
from the front — was granted whenever the person in front was themselves waiting
for somebody. In a ring everybody is, so everybody held, for twenty-five
seconds, and the longest frozen stretch in the harness was half a minute of
people being immaculately polite at each other. The question is now asked
properly: follow the chain of who is waiting for whom and see what it ends at. A
person waiting for nobody is a front and the line will clear. A circle anywhere
in the chain is not, and everybody in it takes the short wait instead.

**Somebody who has arrived is not waiting for anybody.** `waitingFor` was set
and cleared inside the walk, and a person who has arrived does not walk again —
so the last person they ever queued behind stayed written on them for the rest
of the day, and anybody who came up behind them read a standing ornament as the
middle of a moving queue.

**And not moving at all is not progress.** The clock that gives up on a hopeless
walk counts steps-left-to-walk, which is the right measure and is a number about
a map with people in it: eight of them shuffling round a doorway move the count
by a step or two a second, and every new low resets the clock. Somebody wedged
among them, who had not moved a pixel in nine and a half seconds, read frame
after frame as a walk that was getting somewhere.

Twenty runs of `tools/doorjam.mjs`, before and after:

| | crossings | never got through | longest frozen stretch |
| --- | --- | --- | --- |
| before | 430 | 50/240 | 5.8s |
| after | 546 | 38/240 | 2.5s |

All four are dead code until something jams, which is the point and is also
checked: a working day on the real fourth floor, and the lunchtime rush at the
break room with somebody standing in its doorway, come out identical to the
frame. The break room has a wide way in and never needed any of this. The
one-square doors are where people live.

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

## The view from above

There is a minimap in the corner and a map screen behind `N`, and they are the
same picture at two sizes. `engine/map.js` draws both.

They were not, and that was most of what was wrong with them. The minimap
rasterised the whole level into a 168×118 canvas with **a scale per axis** —
`cv.width / MAPW` by `cv.height / MAPH` — which is right for exactly one shape
of map and a lie about every other. The office is 64×44 and came out about
right. The town is 114×120 and came out half as wide again as it is: a square
of streets drawn as an oblong. The outskirts is 384×384 and came out at four
tenths of a pixel a tile, where a house is a third of a pixel and the dot for
the player covers eight tiles. It cost 58 ms to build, it was thrown away and
built again on every walk through a door and every turn of the season, and
there was no map screen at all — so on a phone, where the corner of the HUD is
a thumb rest and the minimap is not drawn, there was no map of any kind.

Three ideas, and they are the whole file.

**One raster per level, at a pixel a tile.** Not at the size of the minimap —
at the size of the map. A level is `MAPW` by `MAPH` pixels of ground, built
once, kept, and drawn at whatever scale anybody asks for. It is laid down in
RUNS rather than in tiles, which is the difference between a call per tile and
a call per stretch of the same colour: the outskirts is **6,574 fills for
147,456 tiles**, twenty-two tiles a call, because four hundred acres of field
is four hundred identical rectangles a row and one of them is enough. Keyed by
level and by season, so the turn of a season costs one rebuild and re-entering
a level costs nothing.

| | before | after |
|---|---|---|
| the outskirts, built | 57.7 ms | **8.5 ms** |
| ...and built again, walking back in | 57.7 ms | **0 ms** |
| the town | 2.8 ms | **1.1 ms** |
| the town's aspect ratio | 1.47 × 0.98 px a tile | **one scale, both axes** |
| the outskirts at a glance | 0.44 px a tile | **1.6, and a window that follows you** |

**One projection, asked by both.** `fit()` answers where a tile lands on a
canvas, and everything that draws a dot goes through what it returns. The
minimap and the map screen cannot disagree about where you are, because neither
of them works it out.

**And a scale floor.** A map is a thing you read at a glance and there is a
size below which there is nothing to read. If the whole map will not fit at
nine tenths of a pixel a tile the minimap stops trying to show it whole and
shows a WINDOW around the player instead, at a pixel and a half — clamped to
the edges, and centred rather than clamped when the map is smaller than the
window, which is the same rule `Cam.bound()` uses on the world itself because
it is the same problem one level up. The same reasoning drops the markers that
have stopped being markers: under two pixels a tile a doorway is smaller than
its own dot, and a town with two hundred doors on it comes out as a rash rather
than as a town, so at that size the doors and the parked cars are left off and
the shape of the streets is what you are reading.

The map screen is the same picture with room to say what things are called, and
everything on it is derived from what is already there. **The names** are the
centroid of each zone's floor, snapped to the nearest tile actually in that
zone — the snap is the whole of it, because the centre of mass of a street that
bends, or of the ring of pavement round the minster, is a point in the middle of
a building, and a name written there is a name on the wrong thing. **The ways
out** are the level's own `links`, drawn where the thing that offers them
stands: a signpost that names a link is found on its own, and `EXITS` in
`data/world.js` is the two-line table for the exception — a lift is four links
and one lift, a stairwell is three. Nobody wrote a map of the estate out east
and nobody is going to: it comes out with its avenues named because it has
zones and they have names.

What cannot both fit is decided by **size** — how many tiles a place has, and
how many tiles there are at the other end of a way out — biggest first. That
one rule puts the road east to four hundred acres over the door of a vape shop,
and Corven Way over both. A place whose name will not fit inside the place
itself is left as a shape, and a way out that loses its label keeps its marker.
The one thing the map will not tell you is the thing the building is keeping
from you: a level may declare itself `secret` and name the achievement that
stops it being one, so the square of carpet in the archive is a square of
carpet until you have lifted the corner of it.

`tools/mapjam.mjs` is the harness, and the reason it exists is that a map is
the one thing in this game that is wrong *quietly*. A level you cannot walk
across fails `levelcheck`. A level whose mass moved fails `fidelity`. A level
whose map comes out blank, or squashed, or with THE ARCHIVE written across the
break room, fails nothing at all — the game runs, the level is correct, and the
only thing wrong is the picture nobody is looking at while they play. So it
asks four things of all twenty-five: how much of the level is drawn at all,
whether the projection is true at a dozen canvas sizes (one scale for both
axes, the window inside the map, the player inside the window, the window
inside the canvas), whether every name sits on the zone it names, and whether
every link a level declares is offered by something the map can point at.

```sh
node tools/mapjam.mjs            # every level
node tools/mapjam.mjs outside    # one of them, in detail
```

## Repository layout

This is the **private** repository: full history and staging. The public repo is
rebuilt from it as a single commit containing only the released files — see
`scripts/release.sh`. Nothing else here is ever published.

The game is `index.html` — the engine — plus the files it loads:

| | |
| --- | --- |
| `data/*.js` | The content: people and dialogue, items, callers, the office, the streets, and what happens when you press E. |
| `data/outskirts.js` | The one level that is not written down: 800 lines of rules and a hash that build an estate, a wood, a hamlet and four hundred acres of field. See **A place nobody wrote down**. |
| `art/sprites/*.png` | The character, world, street and roof art. Third-party, separately licensed. |
| `art/sprites/manifest.js` | Generated: the rectangles that describe those PNGs. |
| `tools/build-sprites.mjs` | Builds the sheets and the manifest, and touches nothing else. |
| `tools/fidelity.mjs` | Dev-time only: every level built and digested to one number per level, so a change that is not supposed to change anything can be proved not to. `--save` then `--check`. |
| `tools/levelcheck.mjs` | Dev-time only: every level in the catalogue built with the real builder and walked, headless, so that "you can get from the front door to the lift" is a check rather than a thing somebody noticed. Run by `release.sh`. |
| `tools/carjam.mjs` | Dev-time only: the traffic put through the five things that break it, headless, so a change to the driving can be measured rather than driven into. |
| `tools/streamjam.mjs` | Dev-time only: the level cache and the prefetcher stood on every level in the catalogue, headless, with the idle time simulated, so that what standing still costs is a count of builds rather than an impression. Run by `release.sh`. |
| `tools/mapjam.mjs` | Dev-time only: every level's map built and measured, headless — how much of it is drawn, whether the projection is true at a dozen canvas sizes, whether every name is on the thing it names, and whether every way out is on it. Run by `release.sh`. |
| `tools/doorjam.mjs` | Dev-time only: two crowds through one doorway, headless, so a change to the walk can be measured rather than watched. |
| `tools/lightjam.mjs` | Dev-time only: the traffic and the crossings put through three sets of lights, headless, so that "nobody ran a red" is a number rather than an impression. |
| `engine/faces.js` | What a person's face is doing: blinking, and the expression they are wearing. |
| `engine/map.js` | The view from above: one raster per level at a pixel a tile, the minimap that reads a window out of it, and the map screen that reads all of it. Nothing in it knows what a level is. |
| `engine/sky.js` | The clock past five, the light, the weather and the season. Everything that draws asks it what time it is; nothing that draws knows. |
| `engine/signals.js` | The lights: the cycle, the demand, and the two questions everything else asks of it — how far in front of you is a line you may not cross, and may you step off this kerb. The only rule outside that is an instruction rather than a fact about where something is. |
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

Five more tables exist for the streets, and they are all optional — a level that
declares none of them is exactly the level it always was.

| | |
| --- | --- |
| `surfaces:` | Rectangles of `SURFACES` (data/world.js) painted over the rooms. What a tile is MADE of, where that differs from what its room is made of: a street is one zone with one name and a carriageway down the middle. `R.kerbs()` derives the kerb from wherever two of them meet. A surface that says `open` is ground you can see and cannot stand on — the river, the ballast — still solid, still uncollidable, and drawn as itself rather than as the roof the wall pass gives every other piece of wall mass. `{ s: null, r: [...] }` takes a surface back off again, which is how a platform is a platform and the ballast beside it is not. |
| `roofs:` | What the buildings here are roofed in, where that differs from the default mix. `{ m: ['pantile', 'slate'], r: [...] }` — a bag of material names for a rectangle, read by `R.roofMatsAt()` and asked of a plot's north-west corner rather than of the tile, so a building that straddles the edge of one is a whole building in one material. A level that declares none gets `R.ROOF_MATS`, which is the mix of a town that grew normally. Like `surfaces:`, it is art and nothing else. |
| `paint:` | The markings. `dash`, `line`, `yellow`, `zebra`, `bays`, `text`, `rails`, all in tiles, all drawn by `R.roadPaint()` rather than cropped — a marking is position-dependent and a tile is not, and a running line least of all. |
| `cars:` | What is parked, and what is driving. A car is not furniture: it is at a pixel, at an angle, at a speed, so it lives here and in `engine/cars.js` rather than in `furnish()`. `model:` names an entry in `CARS`; `body:`/`roof:` repaint that model for one car; `drive: true` lets you in; `route:` makes it traffic. |
| `peds:` | Who is walking about. Same shape as a traffic car and for the same reason — a pixel, a route, a speed — and deliberately not the machinery in `engine/npc.js`, which is twenty colleagues with schedules and a grudge about a doorway. A route is `[x, y]` waypoints in tiles, with an optional third number to stand there for that many seconds. See `engine/peds.js`. |
| `signals:` | The lights. One entry per installation, `junction` or `pelican`. An arm is one approach: `at` is the tile its post stands on, `go` is the direction the traffic it holds is travelling, `stop` is the point on the lane the line is painted across, and `g` groups the arms that get the road together. A crossing adds `over`, the piece of carriageway people walk on. The posts are real furniture — `World.build` makes them from this table rather than from `furnish()`, so a set of lights and the poles holding it up cannot drift apart. See `engine/signals.js`. |

Two flags on a furnishing are read by the engine and are worth knowing about:
`sprite:` names a rect in the atlas to draw instead of the emoji, and `fromCar:`
means the thing is meant to be reached without getting out — which is all a
drive-thru is, and all the next one will have to be.

One table is not a level's at all. `FLOORS` in `data/world.js` is the buttons in
the lift car, in the order they are in it, and each row names a `via` — a link,
exactly as every other way out of every other room does it. That is the whole of
how a lift knows where it goes, and it is why `Acts.lift()` does not know what a
floor is.

The editor has no tools for any of the five and carries all five through
untouched, which is the next best thing — see `Doc.surfaces`.

### How big a map can be, and what it costs

A person is 56px and a tile is 32px, so a tile is about a metre and this town —
114 by 120 — is about 0.0137 km². Going a great deal bigger than that used to
mean going nowhere: `World.build()` made four arrays of arrays of boxed numbers,
strings and nulls, which V8 keeps at roughly ten bytes a tile EACH, and the
contact shadows made a fifth. Fine for sixty-four by forty-four. Seventy-five
bytes a tile is a hundred and seventy megabytes for a map a kilometre and a half
across.

They are flat typed buffers now — one per grid, with a **subarray per row** hung
off it, so every reader in the engine and the editor still says
`World.solid[y][x]` and gets the same answer at the same cost. A view is a
window onto the buffer, not a copy. The two grids that held NAMES hold an index
into a table instead: a zone is two bytes, a surface is one, and index 0 is
"none" in both — which is falsy, which is what `null` was, which is why every
truthiness test in the engine went on working without being told anything. Only
the places that used the value AS a name had to change, and they ask
`World.zoneAt()` and `World.surfAt()`, which is what those were always for.

| | before | after |
| --- | --- | --- |
| 1000×1000 (1 km²) | 67 MB | 23 MB, 150 ms to build |
| 1500×1500 (2.25 km²) | 176 MB | 43 MB, 302 ms |
| per tile | ~75 bytes | ~16 bytes |

Those build times are the ones to trust and the first set was not: the headless
harnesses replace `Math.random` with a seeded closure so that two runs agree,
which is right for a digest and wrong for a stopwatch — it is about thirty times
slower than the engine's own, and `World.build()` calls it once per tile. A CPU
profile of a one-kilometre build put twelve hundred milliseconds in
`Math.random` and five hundred in everything else. Timing the rig instead of the
engine had put a seven-fold tax on every figure.

Nothing else on a build of that size is close. The three passes that walk the
whole map all run once per level rather than once per frame, and at a million
tiles they cost 9ms for the contact shadows, 17ms for the roof plots and one
rasterise for the minimap, which is cached because the floor plan never changes.

And the pathfinding, which is the thing that actually stops scaling: `Nav.build`
sweeps a Dijkstra over every square anybody could reach, per destination, and
keeps forty-eight of them. On a floor of three thousand squares that is nothing;
on a map a kilometre across it is a million squares swept and four megabytes
held because a colleague decided to put the kettle on. The sweep stops after
`Nav.CAP` squares — forty thousand, which is a hundred and thirteen on a side
and three times the longest walk on the biggest level in this game, so every
field on every level today comes out complete and the number changes nothing at
all. It is a ceiling, not a budget. A field that hits it is marked `partial`,
which matters to one reader: unreachable and not-swept-yet are the same −1 in
the array and the opposite thing on the floor — one is a locked door and a
reason to stand and wait, the other is a long walk and a reason to set off.

`zoneName` and `surfName` are on `Levels.FIELDS` for the reason everything on
that list is: an index means nothing without the table it indexes, and a level
swapped in without its own would read its tiles through the last level's table
and come out painted in somebody else's rooms.

Proving that changed nothing is what `tools/fidelity.mjs` is for. It builds
every level and digests the walls, the zones, the surfaces, the contact shadows,
the per-tile noise, every object and what the build worked out about it, the
doorways, the worktops, the counters, the desks, the cars, the people, the
lights — and the roof plots, which are derived from the mass and are therefore
the most sensitive thing on the list to a change in how the mass is stored. One
number per level, `Math.random()` seeded so two runs of the same code agree
exactly. All twenty-four came out identical.

### A place nobody wrote down

`data/outskirts.js` is 800 lines and builds 147,456 tiles — eleven times the
town — in **17 milliseconds**. It is the first level in this game that is not
authored. `data/levels.js` is three and a half thousand lines for 0.0137 km²,
which is the right way to build somewhere the player is meant to know by heart
and the wrong way to build the twenty minutes of housing estate, wood and field
between one town and the next. Nobody hand-places two thousand trees.

So it is DERIVED, the way `R.roofPlots()` derives a townscape out of the mass
and `R.kerbs()` derives a kerb out of where two surfaces meet: a handful of
rules, a hash of the coordinate for the variation, and a level def at the end
of it. `Math.random()` is not used anywhere in it and could not be — the level
is rebuilt from scratch every time you walk into it, and a wood that is
somewhere else when you walk back is not a wood.

Nothing in the engine knows. `World.build()` is the same builder, collision is
the same collision, and the roof pass floods the same mass — so a semi comes out
as two units under one roof with a party wall drawn between them because that is
what the mass says, and a block of lock-up garages comes out as eight units
under one unbroken roof with two of them re-roofed, and neither of those was
asked for anywhere.

The one thing a derived level has to do that an authored one does not is put its
MASS back. A room carves walkable floor out of a map that starts solid; a house
is the opposite, mass standing in the middle of a garden, and there is no such
thing as an un-room. So the land is carved by `rooms`, and `furnish()` — the one
hook that runs with the map in front of it — puts the houses, the walls and the
pond back into `this.solid`.

**What went in, and what it taught:**

*Grids are the tell.* The first build laid every row of pairs from the same x,
every avenue at the same pitch, the wood as an ellipse and the fields as
identical rectangles, and from the air it read as a spreadsheet. One hash per
band jogs the row; one per wall picks the step; three cosines of the bearing
give the wood a ragged edge and three more give the track through it a wander.
None of that is more than a line, and it is the whole difference between a place
and a diagram. Two of the seven avenues stop rather than going through, in a
turning head — about a third of the streets on any estate do, and the houses
above one still face south into it, so nothing about the wall band's rule
changed and only the tarmac did.

*Mass that touches mass is one plot.* The corner shop and the pub started at the
west end, two tiles from the first row of semis, and the roof pass — which
floods the mass and does not care what anything is called — took the lot as a
single plot and produced one long jagged slate roof with a shop notched into it.
Moved four tiles clear they are their own two-unit parade with a party wall down
the middle. The same rule in the other direction is what gives St Cuthbert's its
roof: nave, chancel and tower are three overlapping rectangles, so the plot pass
copes each step where it finds one and every inner corner on it comes off the
same thirteen tiles as everything else.

*A brook laid one column at a time is a staircase.* The centre line falls most
of a tile per column, so each column's span cleared the last and what you saw
from above was a flight of steps with water in it. Each column fills from the
shallower of its own top and the next column's to the deeper of the two bottoms;
the spans overlap, the notches close, and it reads as a ribbon.

*And the order things are built in is load-bearing.* The fields go in before the
water does, because the water follows the shape of the fields — and a lone oak
or a hedgerow tree is solid, so one dropped where the brook will later run seals
a tile or two behind it against a wall. Anything solid scattered across a field
is held back, the water writes every tile it takes into a set, and the flush at
the end drops whatever landed in it or beside it. Every crossing of the brook is
a ford for the same reason at a larger scale: four fields cut in half is four
fields you cannot get out of.

*A kerb is a MADE edge.* `R.kerbs()` drew four inches of pale concrete down both
sides of a farm track through a wood, because it draws wherever two named
surfaces meet and it had two. `SURFACES` entries now carry `soft`, and two soft
surfaces have no edge between them worth drawing — grass against tarmac is a
verge and keeps its kerb; grass against a track is one sort of ground meeting
another.

*The pavement had to become a surface.* Every street in town is a zone whose own
`tile` is the slab, so the paving beside a road was simply the floor of the room
the road is in. That stops working the moment a road runs across open country,
where the ground under the zone is grass laid as a surface and only another
surface can override it. `slab` and `track` are surfaces now, and the kerbs came
right on their own.

*A house has a pitched roof.* The default material bag is a market town's — six
slates to three leads to two felts — and `lead` and `felt` are both flat roofs,
which is correct for the backs of the shops on the High Street and reads on a
semi as solar panels. The estate declares its own bag and the farm declares
another, split at the road.

*And a house five deep has no roof on it.* The wall band draws the bottom two
rows of any mass as its tall south face and the roof pass puts a mitred coping
round what is left, so five deep gave three rows, all three of them edge, and
every house read as a grey tray with one stripe of slate in it. Seven gives
five, and five gives three of field between the copings.

What is out there: Marley Road across the middle; seven avenues of semis, two
of them closes, each avenue its own zone so it announces itself as you turn into
it, with drives, back gardens walled with a gate per plot, and a shed at the
bottom of each; a block of lock-ups, a green, and a two-unit parade with a
corner shop and a pub in it; Prior's Wood and the track that wanders through it;
six cottages and a church along the road east; four hundred acres of field
walled in dry stone with a gate through every wall, half of them ploughed; two
farms, a back lane, two copses, a brook and the pond it feeds. 2,219 objects, 32
parked cars and 8 people walking circuits, and it holds **16.7 ms a frame** — the refresh
rate — with a tighter spread than the town manages on a tenth of the objects,
because the camera culls and there is less on screen out there, which is the
point of somewhere being out there.

`tools/levelcheck.mjs` earns its place here more than anywhere else in the
repository. A derived level fails in ways an authored one cannot: a field wall
laid straight through a cottage garden, a copse dense enough to trap a single
tile of grass inside it, a back garden walled off with no gate, a willow dropped
in the notch where a brook meets a wall, a pond with no ford in it. It found
every one of those by name and by coordinate, and not one of them was ever on
screen — which is the whole argument for the tool. Nobody walks two hundred
thousand tiles.

### What standing still cost

Two numbers above are why this section exists. The outskirts is eleven times the
town and takes a hundred milliseconds to build; the level cache keeps the hub,
the level you are on, and two more. Corven Way has twenty-two ways off it.

The prefetcher took the list of neighbours it had not built, built one in an idle
slot, let `trim()` bound the cache, and asked again. The ask found that the level
the trim had just evicted was unbuilt again. **It never terminated.** On the
fourth floor that had been three small rooms going round and round since the
cache was written, costing a millisecond nobody could see. Outside, once the road
east led somewhere, it was the outskirts rebuilt **eleven times a second** — a
hundred and forty-seven thousand tiles and two thousand two hundred objects,
thrown away and made again, for as long as you stood in the town. Two seconds of
building in every twenty, and a frame lost every few. It was reported as the
driving being choppy, and nothing in the driving was wrong.

Two rules, and both are about the cache rather than about the levels:

**Build only what the cache can keep.** Building a third neighbour does not cache
a third neighbour. It makes the trim throw the first one away, and that work is
not saved for later, it is lost.

**Offer each neighbour once per arrival.** Which is what terminates it, and is
the half that was missing. An arrival is the only thing that changes the answer,
so an arrival is when the offers are made again.

`tools/streamjam.mjs` is the harness for it, and it is the fifth of them because
this machinery fails silently by construction: the map is right, the player is
where they should be, and every other number in this repository is unmoved. The
whole cost is a frame, somewhere else, a moment later. So it counts the one thing
that is not free — a call to `World.build()` — with the idle queue pumped by hand
two hundred times per level, about twenty seconds of a game running at sixty
frames a second. A prefetcher that has finished has nothing to do with the other
hundred and ninety.

```sh
node tools/streamjam.mjs                     # stand on every level in turn
node tools/streamjam.mjs outside             # one of them, in detail
node tools/streamjam.mjs path/to/levels.js   # some other copy of the streamer
```

Standing on each of the twenty-five levels in turn, on a cold cache:

| | before | after |
|---|---|---|
| builds while standing in the town | 200 and counting, 7,593 ms | **2, 117 ms** |
| builds while standing on the fourth floor | 200 and counting, 79 ms | **2, 1 ms** |
| the outskirts, rebuilt while standing in the town | 66 times | **never** |
| levels built and then immediately dropped | 2 | **0** |
| prefetcher still asking after 200 idle slots | 2 levels | **none** |

It exits non-zero on any level built twice while the player stands still, or on a
prefetcher still asking for work when the pumping stops, so neither can land
quietly again. Driving the length of Corven Way, measured in the browser over
thirty seconds: 15 dropped frames instead of 662 builds' worth, and `R.draw` at
2.8 ms a frame with the rest of the budget left alone.

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

**A car is a rectangle**, and that is one sentence because it took two functions
to disagree about it before anybody noticed. A car is the only thing out here
that is not square to the world, and the two halves of its collision each papered
over that differently: "does it fit" sampled the outline at ten points and hoped
nothing was small enough to sit between two of them, and "which way is out" gave
up on the rectangle altogether and used the axis-aligned box drawn AROUND it.
The box round a bus at forty-five degrees is half as big again as the bus, so it
found overlaps with things the bus was nowhere near — and since the push is
applied every frame and the drive is applied every frame, the two cancelled
exactly. The 41A stood at the corner of Aldergate Rise with its engine reading
sixty-four and its position unchanged in the third decimal place, all afternoon,
being shoved backwards by a lamppost it was four feet clear of. Three of the
stalls in the traffic harness were that, and none of them was a traffic bug.
There is one shape and one walk over it now, with two callers: the fit test stops
at the first thing it finds and the push test sums the way out of all of them.
They cannot disagree about where a bus is, because they are the same function.

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

It also parses every shipped script, builds every level and refuses if one of
them is broken, refuses if the level streamer is building anything twice,
refuses if a level's map is blank or misprojected or has a name on the wrong
room, refuses if the sprite atlas or `CREDITS.md` is stale, and refuses if a
page references a file that is not there. It does not publish: the
public repository is built from this one and its remote is not recorded here.

```sh
node tools/levelcheck.mjs          # every level, built and walked
node tools/levelcheck.mjs ground   # one of them
```

`levelcheck` is the editor's own checks with nobody sitting at the editor. It
builds each of the twenty-four levels with `World.build()` and asks the two
questions that have shipped wrong before — how many separate pieces the
walkable floor is in, and whether every arrival point, every waypoint a
colleague walks to and every object carrying a `use:` can be reached from one
of them — and then asks whether the catalogue agrees with itself: links that
name a level or an arrival point that is not there, handlers `data/acts.js`
does not have, sprites the atlas does not describe. The ground floor's lift
lobby was cut off from its own front door for eight releases, and the check
that finds it in half a second existed the whole time — in `editor/validate.js`,
where it only ever ran on whichever level somebody had open.

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

Four parts, because there are four kinds of thing here. See [LICENSE](LICENSE).

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
there are five of them across two parts. `art/sprites/sanitary.png` has always
been one: a CC-BY-SA 3.0 tileset, in a sheet nothing else is packed into, under
its own terms in `LICENSE` part 3. `art/sprites/wood.png` is the second, and it
is the first one the build tool makes rather than carries; `frontage.png` (the
shop windows) and `roofs.png` (the roofs of the whole town) are the third and
fourth, on the same terms in the same part, each in a PNG nothing else is packed
into. `LICENSE` part 4 and `art/sprites/victorian.png` are the fifth, and they
are a **different** ShareAlike: CC-BY-SA 4.0, which that submission offers and
nothing else.

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
