# Orrery language 1: reference for AI agents

Orrery describes mechanisms as parts, the connections between them and a few motion rules.
The compiler places the parts, solves joints, gear trains and closed loops, and renders video, GIF or a 3D player.
Write relations, not coordinates, wherever you can.

A project has three files:

- `.scene`: what exists (parts, groups, connections, camera, lights)
- `.style`: how it looks
- `.motion`: how it moves

## Workflow

1. Write the three files, or one `.orrery` file with `@scene`, `@style` and `@motion` sections.
2. Run `orrery check <project> --json`, or call the MCP tool `orrery_check`, and fix every error. Each diagnostic has a `code`, a `line`, a `message` and a `fix`.
3. Verify the motion with numbers: `orrery sample <project> --at 0,1 --points Crank.end.b`, or the MCP tool `orrery_sample`.
4. Render with `orrery render <project> -o out.gif`, or the MCP tool `orrery_render`.

## Versions and stability

This is version 1 of the language. A project may say which version it was written for in its first line:

```
@orrery 1
```

The line is optional (the studio and `orrery join` write it). This is the 1.0 beta: details may still change before 1.0. From 1.0 on, within version 1:

- A project that compiles keeps compiling, and keeps moving the same way. New properties, shapes, sounds and warnings may be added; existing ones keep their meaning.
- Error and warning codes are stable: a code always means the same mistake, so tools and AI agents can rely on them. New codes may appear; old ones are not reused.
- A project written for a newer major version gets warning W0100.
- Rendering details (lighting, anti-aliasing) may improve; positions and timing do not change.

## One file or three

A project can be three files (`.scene`, `.style`, `.motion`) or one `.orrery` file in which a line `@scene`, `@style` or `@motion` starts each section (after the optional `@orrery 1` line). Both describe exactly the same thing, and the tools convert either way.

```
@orrery 1

@scene
Crank::Link { length: 40mm; hinge: end.a on (0, 0, 0); }

@style
Crank { color: #b8442e; }

@motion
Crank { forever: rotate: 180deg/s; }
```

- The single file is the easiest to review and edit in one pass. Diagnostics report lines in the single file, with `"file": "project"` and a `"section"` field.
- A marker stands alone on its line; a comment may follow it. Each section appears once. Parts before the first marker are read as `@scene` with W0148, which offers to add the line (the same under `@common` or a `@chapter` line); other text before the first marker is error E0105, an unknown section E0106, a repeated section E0107.
- Conversion: `orrery join <folder> -o project.orrery` and `orrery split project.orrery <folder>`. The MCP tools accept `project` (the single file) in place of `scene`, `style` and `motion`.

## Chapters

A longer video is a project with chapters, always one `.orrery` file. Each chapter is a complete animation with its own `@scene`, `@style` and `@motion`, its time starting at 0 s. Chapters and single animations have no length limit. The studio's Film mode plays them in order and the export joins them into one video.

```
@orrery 1
@common
@scene
Scene { frame: youtube; sky: studio; }        // what every chapter shares
Narrator::Voice { voice: en-GB; }

@chapter Intro "Two gears" fade 0.8s
@scene
G1::Gear { teeth: 36; }
G2::Gear { teeth: 12; mesh: G1; }
@motion
G1 { 0s..4s: rotate: 0deg/s -> 40deg/s; say: Narrator "Two gears, one driving the other."; }

@chapter Ratio extends Intro crossfade 1s fade-out 1s
- A reply or paste with chapters is merged into a project with chapters by chapter name: a chapter with a name already there replaces it, a new name is added after the pasted chapter before it, chapters the paste leaves out are kept, and `@common` is replaced only when the paste has one. The studio lists the chapters first when a paste would change more than one.
@scene
Observer { position: (0, 60mm, 420mm); look-at: G2; }
@motion
G1 { forever: rotate: 40deg/s; }
```

- `@common` comes before the first chapter. Each chapter compiles from `@common`, then the chapters it extends, then its own sections.
- The chapter line: `@chapter Name ["Title"] [extends Other] [cut | fade [time] [#colour] | crossfade [time]] [fade-out [time] [#colour]]`. The name starts with a capital letter. The transition says how the chapter starts: `cut`, `fade` (through black or the colour, 0.8 s by default) or `crossfade` (blends over the end of the chapter before, 1 s by default, so the two overlap). `fade-out` fades the chapter's end.
- `extends Other` takes Other's scene and style, not its motion. A later `Observer` replaces the inherited one, and later style rules win.
- One video has one shape: put `Scene { frame: … }` in `@common` (W0147 when chapters differ).
- A title written without quotes (`@chapter Atomic Numbers`) is read as the title with W0149, which offers `@chapter Atomic "Atomic Numbers"`. Each chapter sees only `@common`, the chapters it extends and its own sections: a part, Voice or style rule from another chapter is unknown there.
- Errors: E0140 a missing or bad chapter name, E0141 an unknown word on the chapter line, E0142 two chapters with one name, E0143 extends a chapter that does not exist, E0144 chapters that extend each other in a circle, E0145 a second or late `@common`, E0146 `@common` without a chapter.
- Diagnostics report lines in the `.orrery` file, with `"chapter"` (or `"@common"`) and `"section"` fields. `orrery check` covers every chapter, `orrery sample --chapter Name` samples one, `orrery test` snapshots every chapter, and `orrery render` makes the whole film. `orrery prompt --chapters` gives the reply format for chapters.

## Lexical rules

- Comments are `// to the end of the line` or `/* … */` blocks, as in CSS. `#` followed directly by letters or digits is a colour (`#38bdf8`) or an id (`#G2`). A line that starts with `# ` is read as a comment with warning W0108, which `orrery check --fix` turns into `//`.
- Part names start with a capital letter (`Crank`). `let` names and parameters are lower case.
- Every property ends with `;`. As in CSS, the last property in a block may leave it out.
- Some other names are understood with warning W0203 and a fix: `position` → `at` and `rotation` → `orient` in the scene, `colour` → `color` and `font-color` → `text-color` in style, `rotation` → `rotate` and `translate` → `move` in motion. Easings written `ease_in_out` or `easeInOut` get W0513 and become `ease-in-out`.
- A problem (warning or error) that can be corrected by machine carries an `edit` in `orrery check --json`: replace `del` characters at `line`:`col` with `ins`. A **sure** edit writes what is read anyway (a `#` comment, another name for a property, an ignored property, `true` for `on`). An edit with `"guess": true` is a likely correction: the message ends with *Did you mean …?* (exactly one known name within one or two letters, a swap counting as one; a name declared further down is not treated as a typo), or a value outside its range written back inside it, or as a percentage when that fits (`opacity: 40` → `40%`). An edit with `old` names the text it replaces; when that text is not at `line`:`col`, the same word elsewhere on the line is used, and otherwise the edit is skipped. An edit that removes a whole property also removes the line when it leaves it empty.
- Parse slips carry sure edits too: `Door:Box` and `Door Box {` become `Door::Box`; a near-miss symbol is replaced (`,` for `;` between properties, `=` for `:`); a `;`, `}` or `)` missing at the end of a line is added after the last token; a `:` missing after a property name is added; a `;` missing between two properties on one line (`teeth: 10 module: 2mm`) is added. A block never closed gets a guess that closes it at the end.
- `orrery check --fix` applies sure edits, round after round; `--fix --suggestions` also applies guesses, after the sure ones in each round. The studio's Problems panel has a **Fix** button with the same choices (Fix all, Apply suggestions, Fix as much as possible).
- Numbers carry units, with no space before the unit.

## Units decide meaning

| Unit | Kind |
|---|---|
| `mm`, `cm`, `m` | position or length |
| `mm/s`, `m/s` | speed |
| `mm/s2`, `m/s2` | acceleration |
| `deg`, `rad`, `turn` | angle |
| `deg/s`, `turn/s` | spin rate |
| `deg/s2` | angular acceleration |
| `s`, `ms` | time |

- Dividing by a time also makes a rate: `360deg / 12s`.
- Axes: x is right, y is up, z is towards the viewer.
- A vector is written `(x, y, z)`.

## Scene

```
let r = 40mm;                                          // named value, usable in all files
Name::Type.class1.class2 { prop: value; ... }          // a part
Name::Group { member: Type { ... }  anchor tip: (0, 10mm, 0);  at: (...); }
define Tyre(r = 50mm, mount) :: Wheel { radius: r; hinge: axis on mount; }   // reusable type
FL::Tyre(mount: Car.axle1.end.b);                      // positional or named values
Observer { position: (x, y, z); look-at: Part; zoom: 1; fov: 40deg; }
Light    { kind: directional; direction: (-1, -2, -1); power: 0.85; }
Scene    { duration: 4s; grid: floor; background: #070a10; }   // background: transparent keeps it clear in PNG, GIF and the 3D player
Scene    { sky: dusk; ground: #2c3328; stars: 900; }          // a glowing sky sphere round everything, and a floor that fades into it
Scene    { sky: sunset; sun: (5deg, -30deg) #ffb36b; }         // a sun on the sky that also aims the main light
```

`sky` is a preset (`day`, `dawn`, `dusk`, `sunset`, `night`, `space`, `overcast`, `studio`), `none`, or one to three colours from the top through the horizon to below (`sky: #1d3b70 #f2b38a #2a2030;`). It is a hollow, glowing sphere that travels with the camera, so it is never reached or clipped, and it tints the ambient light. `night` and `space` come with stars; `stars: N` sets how many. `ground: colour` lays a wide floor at the foot of the model that fades into the sky and catches shadows. Glowing parts (`luminosity`) and fixed parts do not push it down, so a lamp below the ground stays hidden and its light is dimmed. `ground: #3d4a35 at 0mm;` sets the height. The sky shows when the preview background is *From the scene* (the default); the right-click menu's **Sky** item writes a preset into the Scene block. `sun: (height, direction) [colour]` draws a sun on the sky: the height is above the horizon (−30° to 90°), the direction is 0° looking into the scene along −z and 90° towards +x. It sits beyond the scene, so it never rests on the ground, is hidden below the visible horizon, and shines the first directional light (adding one if there is none) from its direction, dimming as it sets. In motion, `Scene { 0s..8s: sun: -5deg -> 10deg ease-in-out; }` changes its height (E0221, E0222, W0223).

### Placement

- `at: point;` puts the part's centre at the point.
- `align: face.bottom;` puts that anchor on the `at` point instead of the centre.
- `orient: 90deg about x;` sets the starting rotation.
- `repeat: 4 step (100mm, 0, 0);` makes copies `Name1` to `Name4`. `i` (0, 1, 2 …) can be used in any expression.
- `scatter: 40 in plane xz (600mm, 400mm) seed 7 spin 360deg vary 20% apart;` makes 40 copies at random places, the same on every build. Areas: `in plane xz|xy|yz (w, d)`, `in plane "2x + y - z = 100mm" (w, d)` (any plane as an equation; the copies centre on the point of it nearest the part's `at`), `in plane normal (a, b, c) (w, d)` (a tilted plane through `at`), `along x|y|z length`, `in box (x, y, z)`, `in disc r`, `on circle r`, `in sphere r` (disc and circle take an optional `plane xy`). Options: `seed` (another layout), `spin` (a random turn about the plane's normal, up to the angle), `vary` (sizes vary by up to that share), `apart` (copies kept from touching; W0124 when there is no room). Flat shapes lie in the plane. A plane takes an optional third size, `(w, d, depth)`, that also spreads the copies along its normal, so they fill a slab instead of a sheet. Copies are `Name1` … `NameN` and keep the part's classes, so style and motion can target them as a `.class`.
- `fixed: top-left;` keeps the part at one place on the screen, whatever the Observer does: `top-left`, `top`, `top-right`, `left`, `center`, `right`, `bottom-left`, `bottom` or `bottom-right`, then an optional margin written as a bare percentage (`fixed: bottom 8%;`, 5% by default; `fixed: bottom margin 8%;` and a separate `margin: 8%;` are read the same way with W0232, which offers the fix), or `fixed: (x%, y%)` for the part's centre measured from the top-left corner. The part is drawn just in front of the camera at the size it has at the Observer's starting distance, so titles, logos and step counters stay readable while the camera moves, orbits, follows or zooms. It keeps its own motion (a spin, a fade) and casts no shadow. It goes on a whole part (E0231 on a group member) and takes no connection (E0231); fixed parts do not count in the scene's size, the overlap check or exploded views. E0230 for an unknown place.
- `fixed: band;` puts a part at the top of the caption band (the bottom when there is none). Parts at the same named place that are showing at the same time stack: down from the top and the middle, up from the bottom. A part faded to opacity 0 leaves its place free.
- `Scene { caption-band: 18%; }` keeps a strip at the bottom of the picture clear: the Observer's view is drawn smaller (zoom × (1 − band)) and raised by half the band, in the preview and in exports (the Free camera ignores it). 0 to 40%; `on` is 18%, `off` is 0; outside the range, W0624. Narration captions sit at the bottom of the band.
- Points can be anchor arithmetic: `Frame.face.top + (0, 10mm, 0)`.

### Shapes and their anchors

Every shape also has the anchors `center` and `com`, its true centre of mass for a uniform solid (`center-of-mass` is the long name). `com.x`, `com.y` and `com.z` are lines through it, so `hinge: com.z on Base.axis` pivots a part at its balance point. A group's `com` weighs its members by volume. A line anchor has a direction; a point anchor does not.

| Type | Properties | Anchors |
|---|---|---|
| Box | size (x, y, z) | face.top/bottom/left/right/front/back, edge.<face>, edge.<f1>-<f2>, corner.<x>-<y>-<z>, axis (y) |
| Sphere | radius | pole.top, pole.bottom, axis (y) |
| Cylinder | radius, height | axis (y), face.top, face.bottom |
| Cone | radius, height | axis, face.top, face.bottom, apex |
| Rod | length, radius | axis (y), end.a (bottom), end.b (top); all lines along y |
| Link | length, width, thickness | end.a, end.b, mid, axis: all lines along z (pin axles); line (along x) |
| Gear | teeth, module (2mm), width | axis (z), face.front, face.back |
| Pulley, Wheel | radius, width | axis (z), face.front, face.back |
| Disc | radius, thickness | axis (z), face.front, face.back |
| Torus | radius, tube | axis (z) |
| Spring | radius, length, turns, wire | axis (y), end.a, end.b |
| Rect | size (w, h), thickness | like Box |
| Line, Arrow | from, to, stroke | start, end, mid |
| Curve | domain: u in 0..1; point: (f(u, t), …); stroke | start, mid, end |
| Tube | radius, inner, height | axis (y), face.top, face.bottom |
| Capsule | radius, length | axis (y), end.a, end.b |
| Prism, Pyramid | sides, radius, height | axis (y), face.top, face.bottom (Pyramid: apex) |
| Dome | radius | axis (y), face.bottom, pole.top |
| Wedge | size (x, y, z) | like Box, plus slope |
| Plate | size (w, h), thickness, corner, hole | like Box, plus normal, hole |
| Beam | length, height, width, thickness (an I-beam along x) | like Box, plus end.a, end.b, line |
| Ring | radius, inner, thickness | axis (z), face.front, face.back |
| Nut | radius, thickness, hole | axis (z), face.front, face.back |
| Bolt | radius, length, head | axis (y), end.a, end.b, head (at end.b) |
| Cam | radius, lift, width | axis (z), face.front, face.back, nose |
| Star | points, radius, inner, thickness | axis (z), face.front, face.back |
| Mesh | src "file.stl" / "file.glb", size (x, y, z), fit: contain or stretch | like Box |

2D shapes lie in the x-y plane facing +z (thickness defaults to 1mm; angles go anticlockwise from +x):

| Type | Properties | Anchors |
|---|---|---|
| Triangle | size (w, h), apex, thickness | like Box, plus normal, apex, corner.left, corner.right |
| Ellipse | size (w, h), thickness | like Box, plus normal |
| Polygon | sides, radius, thickness | axis (z), normal, face.front, face.back |
| Sector | radius, angle (90deg), start, inner, thickness: a pie slice or ring segment | axis, normal, tip, mid, edge.start, edge.end |
| Arc | radius, angle (180deg), start, stroke: a curved line | start, mid, end, axis |
| Path | points: (x, y) (x, y) …; thickness | axis, normal, start, end |
| Text | text: "Two lines\nof text"; size (letter height, 20mm); facing: camera (default) \| front | like Box, plus normal |
| Plot | size (w, h); function of x (and t) or data: (x, y) …; kind: line \| bars \| points \| area; x-axis / y-axis: 0..10 step 2 "label"; x-label, y-label; stroke; reveal (0 to 1, may use t); axes: none; grid: none | like Box, plus normal, origin (the point (0, 0) of the chart), end |

For a head-on 2D view use `Observer { projection: orthographic; position: (0, 0, 1000mm); look-at: (0, 0, 0); }`.

A Mesh uses a 3D model the user added to the project (STL, GLB or glTF), fitted inside its size box, so its anchors work like a Box. Without the file, a box stands in and you get warning W0611.

A Link lies along x, from end.a at -length/2 to end.b at +length/2. Use Link for linkages.

## Connections (written inside the moving part's block)

| Write | Effect |
|---|---|
| `attach: own-anchor to Other.anchor;` or `attach: Other.anchor;` | fuses the parts; they move as one |
| `hinge: own-line on Other.line;` or `hinge: Other.line;` (uses own `axis`) | turns about that line; the part rides on Other |
| `hinge: end.a on (0, 0, 0);` | hinge on a fixed point; turns about its own line (z for a Link) |
| `slider: axis on Other.axis;` | slides along that line |
| `range: -45deg..45deg;` | limits a hinge or slider |
| `mesh: G1;` or `mesh: G1 at 60deg;` | gear mesh: places the gear, aligns the teeth, ratio = -teeth1/teeth2 |
| `couple: Hub 1/12;` | turns at that ratio of Hub |
| `belt: Motor;` | belt drive, same direction, ratio = radius ratio |
| `pin: own-point to Other.point;` | keeps two points together, which closes a loop (four-bar, slider-crank) |

### Closed loops

Drive one joint, such as the crank. Hinges and sliders in the loop that have no motion rule are solved every frame so that every pin holds. Example:

```
Crank::Link   { length: 40mm;  hinge: end.a on (0, 0, 0); }
Coupler::Link { length: 120mm; hinge: end.a on Crank.end.b + (0, 0, 6mm); pin: end.b to Rocker.end.b; }
Rocker::Link  { length: 90mm;  orient: 90deg about z; hinge: end.a on (110mm, 0, 0); }
// motion:  Crank { forever: rotate: 180deg/s; }
```

- A pin is an axle, so layering parts in z (the `+ (0, 0, 6mm)`) is fine.
- The starting pose picks the branch (elbow up or down): orient the rocker roughly where it should be.
- `E0352` means the loop cannot close (check the lengths). `E0353` means the linkage locks during the motion (the driven joint asks for an impossible pose).

## Style

Selectors work like CSS: `Gear` (a type or a define), `Door` (a part, including all its members), `Door.knob` (one member), `.class`, `#Name`, `*` (every part), and comma lists. Later rules win.

| Property | Values |
|---|---|
| `color` | #hex, `#rrggbbaa` (alpha), `rgb(r, g, b)`, `rgba(r, g, b, a)`, `hsl(h, s%, l%)`, `hsla(...)`, `transparent`, CSS names, steel brass oak copper aluminium iron rubber walnut glass graphite, or `gradient(#a, #b, axis: x)`. Alpha makes faces see-through; `transparent` hides them and keeps the outline |
| `material` | matte, plastic, metal, brushed, chrome, gold, glass, ghost (an x-ray look: faint faces, clear edges), flat, glow (shorthand for `luminosity: 60%`) |
| `outline` | `1px #2b3138` (an alpha colour gives a faint edge) |
| `opacity` | 0 to 1, or `40%`; faces, outline and label fade together; multiplies with the colour's alpha; animatable in motion (`0s..1s: opacity: 0 -> 1 ease-in;`), on a part or a group |
| `luminosity` | `[level] [colour] [range]`, such as `luminosity: 80%;` or `luminosity: 120% #ffd27a 600mm;`: the part shines and lights parts near it. 100% is a lamp, up to 400%. The colour defaults to the part's; the range is how far the light reaches. Solid parts get a halo; see-through ones add light like a beam. The first 8 light the scene (W0610). Animatable in motion |
| `roughness`, `metalness` | 0 to 1 (or %); override the material |
| `wireframe` | `on` or `off` |
| `shadow` | `none` (casts no shadow) or `cast` |
| `label` | `"text"`: a tag above the part, bare text with a soft halo |
| `label-color`, `label-size` | the label's text colour, and its size (`140%`) |
| `label-background` | a panel behind the label, such as `#10203080`; left out, there is none; `none` removes one |
| `cut` | a section plane in scene coordinates: a direction (`x`, `-x`, `y`, `-y`, `z`, `-z` or a vector) and an offset. The side the direction points to is cut away: `cut: z 0mm;` opens the half towards the viewer. Animatable in motion: `cut: 90mm -> 0mm;` slides the plane (the direction comes from the style) |
| `cut-color` | the colour of the cut faces (a darker shade of the part by default) |
| `explode` | on a part: its weight in an exploded view, `0` (stays put) to `10`; see `Scene { explode }` |
| `trail` | `[anchor] [time] [colour]`, for example `trail: tip 1.5s #c2410c;` draws the path the anchor follows (no time means the whole run) |
| `text` | `"PISTON"`: prints on the part's faces (`\n` starts a new line). On a Text part it replaces the scene's text |
| `text-side` | `front` (default), `back`, `left`, `right`, `top`, `bottom`, several of them, or `all`. Round parts with an upright axis wrap the text round their side |
| `font-family` | `sans` (default), `serif`, `mono`, or any installed font in quotes, `"Avenir Next"`. 3D letters come in sans, serif and mono |
| `font-size` | a length (`24mm`) or a share of the face (`40%`); without it the text fits the face |
| `font-weight` | `normal`, `bold`, or `100` to `900` |
| `font-style` | `normal`, `italic`, `3d` (solid letters with depth, lighting and shadows), or `italic 3d` |
| `text-color` | the letters' colour; a Text part also takes `color`. Default: dark or light, whichever reads on the part |
| `text-depth` | how far 3D letters stand out (`4mm`); setting it implies `font-style: 3d` |
| `text-align` | `left`, `center`, `right` |
| `text-padding` | space between the letters and the face edge or the background panel |
| `text-background` | a panel behind the letters, such as `#10203080`, so they read over anything |
| `line-height` | space between lines as a multiple of the letter height (`1.2`) |

### Named styles and use

```
Metal::Style { material: metal; color: steel; roughness: 0.3; }
Polished::Style { roughness: 0.1; outline: 1px #2b3138; }
Brass::Style { use: Metal; color: brass; }          // a style can build on others

Gear  { use: Brass, Polished; }                       // later styles win: Polished's roughness beats Metal's
Crank { use: Metal; color: #8f99a3; }                 // the rule's own properties win over its styles
```

`Name::Style { … }` in the style section names a set of style properties, written like every other declaration (`Knock::Sound`, `Narrator::Voice`). `use: a, b, c;` takes them in order, so when two styles set the same property the later one wins, and properties written in the same block win over all of them. `use` also works in the scene, on a part (`Crank::Link { length: 80mm; use: Metal; }`) or a group. The order, lowest first: the group's `use`, the part's `use`, then every style rule that matches the part, in the order written (each rule's `use` list first, then its own properties). An unknown style is E0612, styles that use each other in a circle E0613.

### Text

Two ways to put words in a scene, both drawn in 3D so they never cover the motion the way a `label` tag can:

```
Title::Text { text: "Four-stroke cycle"; size: 30mm; at: (0, 420mm, 0); }   // a part made of words
Block::Box  { size: (200mm, 120mm, 80mm); }
```
```
Title { color: #ffd27a; font-weight: 600; text-background: #10203080; }
Block { text: "ENGINE BLOCK"; text-side: front top; font-family: serif; font-style: 3d; text-depth: 2mm; }
```

A Text is a part: place it, attach it, move it, fade it (`opacity`) or change its colour (`color: #a -> #b`) like any other. A Text turns to face the viewer by default (`facing: camera`), so it reads straight at any zoom; `facing: front` keeps it fixed in the scene, facing +z. Text never raises the overlap warning. Flat text can use any font installed on the computer; `font-style: 3d` builds solid letters from bundled outlines.

## Motion

```
Target, .class, DefineName { forever: prop: value;   0s..2s: prop: value;   then: ...;   then 3s: ...; }
```

### How values behave over time

- **Position or angle** (`90deg`, `(0, 10mm, 0)`): set from the start of its block. The latest block that has started wins.
- **Change** (`0deg -> 90deg ease-in-out`): moves across its block, then holds the end value.
- **Speed** (`60deg/s`, `(500mm/s, 0, 0)`): moves during its block, and what it moved stays moved. Speeds from several blocks add up.
- **Change of speed** (`(0, 0, 0) -> (600mm/s, 0, 0) ease-in`): speeds up or slows down. It needs a time range, not `forever`.
- **Acceleration** (`(0, -9.81m/s2, 0)`): constant within its block.
- **Function of time**: any expression using `t` in seconds, such as `35deg * sin(t * 3.1416)`.
- **Easings:** linear, ease, ease-in, ease-out, ease-in-out, cubic-bezier(…).

### Properties

| Target | Properties |
|---|---|
| free parts | `rotate: 60deg/s [about x \| y \| z \| Part.axis];`, `orbit: Center 30deg/s;`, `move: vector;` (several move lines add up), `along: CurveName 12s;`, `x:` / `y:` / `z:`, `opacity:`, `color: #a -> #b;`, `luminosity: 0 -> 100%;`, `cut: 90mm -> 0mm;` |
| hinged parts | `rotate:` (an angle such as `0deg -> 90deg`, a rate, or a function of t; no `about`), and `roll: Ground;` (spin = distance / radius); `opacity:`, `color:`, `luminosity:` (they change the look, not the motion) |
| sliding parts | `move:` with a number along the slider, such as `move: -90mm -> 90mm;`; `opacity:`, `color:`, `luminosity:` |
| Observer | `follow: Part offset (x, y, z);`, `orbit: Part 60deg/s;`, `look-at:`, `zoom:`, `move:`, `x:` / `y:` / `z:`, `position:` |
| Scene | `sound:`, `say:`, `sun: -5deg -> 10deg;` (the height of the Scene sun), and `explode: 0 -> 1 [along x \| y \| z];` (an exploded view: each part moves from the middle of the model by its distance times the amount; joints and the camera keep the assembled positions; also as a still value in the scene, `Scene { explode: 1; }`) |

Only drive the parts that start the motion. Everything connected through hinges, meshes, couples, belts and pins follows.

### Sound

Declare `Name::Sound { kind: knock; pitch: 120%; volume: 60%; length: 2s; }` in the scene (only `kind` is required). Play it from any motion rule, including `Observer` and `Scene`: `sound: Knock;` (block start), `sound: Knock at end;`, `sound: Knock at 1.5s;` (after the block starts; outside a block, at that time), `sound: Tick every 1s;`, each with an optional volume like `60%`. A rule with only sounds moves nothing. Kinds: tick, tock, ratchet, clank, latch, gear, spring, rattle; footstep, clang, chug, hiss, rumble; knock, thud, click, snap, pop, tap; whoosh, swish, whirr, servo, slide, creak, squeak; chime, bell, ding, beep, blip, success, alert; hum (gear, rattle, hiss, rumble, the movement kinds and hum take `length`). All are synthesised, so they are free of copyright. MP4 and WebM exports include them; `render -o sound.wav` writes the track alone.

### Frame

`Scene { frame: reel; }` sets the picture's shape and size: the preview shows exactly that frame, and exports default to it. Presets: `youtube` (1920×1080), `youtube-short`, `reel`, `tiktok` (1080×1920, each with its app's safe area), `instagram` and `linkedin` (1080×1350), `square`, `slides` (1920×1080), `4k`, `cinema` (2.39:1), `portrait`, `landscape`. A ratio (`frame: 4:5`) makes the short side 1080 px; pixels (`frame: 1080x1920`) are used as written. A tall frame keeps the Observer's field of view across its width, so turning a scene portrait does not crop it. The dashed safe area shows for phone formats (right-click › Safe area).

### Narration, captions and audio files

```
Narrator::Voice { voice: en-GB; rate: 95%; }              // a language or a voice name installed on the computer
VoiceOver::Sound { src: "intro.mp3"; volume: 90%; }       // an audio file added to the project
```
```
Crank { 0s..3s: rotate: 0deg -> 180deg; say: Narrator "The crank turns half a revolution."; }
Scene { 0s..1s: sound: VoiceOver; }
```

`neural: en_GB-alan-medium;` on a Voice picks the voice for exports (below). `say: Voice "words" [at end | at 1.5s];` speaks a line (the voice can be left out when there is only one) and shows it as a caption until the words are likely spoken or the voice's next line starts; `captions: off;` speaks without them. Lines are spoken with the browser's own voices in the preview and in the 3D player. A video file cannot record those voices, so captions are drawn into MP4, WebM, GIF and PNG exports and the export panel saves them as `.srt` or `.vtt`. For speech in MP4 and WebM, keep **Speak them into the video** ticked, as it is by default (or `orrery render --speak`, which stays opt-in): each line is generated by a Piper neural voice running in the browser (experimental; the voice, 20 to 70 MB, downloads from huggingface.co the first time and is kept for offline use). Or add a voice-over recorded or made with any text-to-speech tool as an audio file. Audio files (MP3, WAV, OGG, M4A, up to 25 MB) are added with Insert › 3D models and audio, play with `sound:` like any Sound, are mixed into video exports and saved in the project `.zip`.
- Captions are shown like subtitles: a spoken line is split into parts of at most about 84 characters (two short lines), at sentence ends, then at clause marks, then between words, with short neighbours joined; each part shows for its share of the line's speaking time, the last until the caption ends. Exports and .srt/.vtt files use the same parts. W0550: a line is still being spoken when the next line of the same voice starts. W0551: a line of more than 40 words. W0625: a Text of more than 16 words.

**Timing lines:** a voice speaks about 2.6 words a second at `rate: 100%`. Leave that long before the next line of the same voice (a new line ends the caption), make the block or `Scene { duration }` long enough for the last line, and keep each line to one idea of 4 to 14 words. W0519 warns when a line takes longer to say than the motion lasts (everything has stopped and no `forever` rule runs), or when it runs past the end of the animation: stretch the motion over the words, rather than a quick move followed by a still picture.

## Tools for AI agents

- `orrery schema` (and the MCP tool `orrery_schema`) prints the language as JSON: every shape with its properties, required properties and anchors, the style, motion and block properties with examples, units, easings, sound kinds, sky and frame presets. `docs/orrery-schema.json` is the same file.
- `orrery check --json` lists every problem with a fix in words, and an `edit` for those that can be applied by machine; `orrery check --fix` applies the sure ones, and `--fix --suggestions` the guesses too.
- `orrery eval evals/tasks.json <answers>` scores a folder of AI answers against the task set.

## Common mistakes

| Mistake | Fix |
|---|---|
| `orient: 90deg;` | `orient: 90deg about x;` (E0206) |
| `mesh`, `attach` or `hinge` outside a part | write them inside the moving part's block: `G2::Gear { ...; mesh: G1; }` |
| `angle:` or `offset:` in a motion rule | two verbs for every motion: `rotate:` (free parts and hinges) and `move:` (free parts and sliders) |
| two parts that pass through each other while one moves | W0560 names them and the moment (parts that both stay still are not checked); move one, connect them, or add `overlap: allow;` to one |
| `hinge: end.b on Pivot.face.bottom` on a Rod for a pendulum | face anchors are lines along their normal. Use a Link, a Box edge, or a fixed point `(x, y, z)`. |
| one piece driven twice (parts fused by attach or in a group that each have a motion rule, or a rule plus a hinge, mesh or belt) | E0400, listing every source; keep one. Several rules for the same part are fine: they add up |
| a capitalised `let`, or a lower-case part name | E0100, W0211 |
| a title that drifts out of view while the Observer moves | `fixed: top-left;` on the Text keeps it on the screen |
| a long spoken line over a one-second move | W0519; make the move last as long as the words |
| a different `Scene { frame }` in each chapter | W0147; put the frame in `@common` |
| a group member written `A::Sphere { … }` | W0109 reads it as `A: Sphere { … }` and offers the fix |
| a block opened inside another block (`Nucleus { … }` in a block) | E0100 says blocks do not nest |
| style rules or timed motion in the scene | E0200 says which section it belongs in |
