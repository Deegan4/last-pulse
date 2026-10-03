// ===== Donations (Stripe) =====
// PASTE YOUR STRIPE PAYMENT LINK HERE to turn on the "Support the game" button.
// Create it in your Stripe Dashboard → Payment Links (set "Customers choose what to pay" for
// tip-jar style), then drop the https://buy.stripe.com/... URL below. Backend-free: the button
// just opens Stripe's own secure hosted page in a new tab — no keys or card data live in this file.
// Leave it blank and the button politely explains donations aren't set up yet.
const STRIPE_DONATE_URL = 'https://buy.stripe.com/00wdR9aBb19v2oXgmwgQE08';   // creator's Stripe Payment Link

// ===== Version / what's-new =====
// Bump GAME_VERSION and add an entry at the TOP of CHANGELOG when shipping player-visible
// changes; returning players get a one-time "Game Updated!" popup with the newest entry.
const GAME_VERSION = '2.69.0';
const CHANGELOG = [
  { v:'2.69.0', items:[
    ['🔦','Watchtower upgrades','survivor banners and searchlights now mark the two Horde towers; activate a searchlight at the ladder to slow nearby zombies for a short scan window'],
  ]},
  { v:'2.68.0', items:[
    ['🧰','Interactive field assets','caches, clinics, fuel barrels and radio relays now reward close exploration, while wooden barricades break under fire and create temporary cover'],
  ]},
  { v:'2.67.0', items:[
    ['⛑','Co-op revive','when your Player 2 partner goes down they stay where they fell — stand next to them for about 2.5 seconds to bring them back at half health'],
    ['🎮','Controller upgrade','circular stick dead-zones, analog walking, aim assist, heavier vibration, and new Aim assist / Vibration toggles in Settings'],
    ['💥','Hits land harder','zombies stagger from every shot, the screen drains of colour near death, and clearing a wave lingers in slow-mo'],
  ]},
  { v:'2.66.0', items:[
    ['🏆','Weekly challenge','a harder 7-day challenge now sits under the daily on the home screen — complete it for 200 🪙, resets every Monday'],
    ['🧛','4 new perks','Bloodthirst (heal on kill), Sharpshooter (20% double-damage shots), Quick Hands (-30% reload) and Scavenger (+40% scrap) join the perk picker'],
  ]},
  { v:'2.65.0', items:[
    ['📱','One game across iOS and web','the iOS app now builds from the same organized game sources, including the new enemies, character customization and run perks'],
  ]},
  { v:'2.64.0', items:[
    ['👹','The horde reborn','19 redesigned enemies: plague villagers, scarfed hunters, acid carriers, masked casters and crowned armored bosses — with sculpted faces, distinct silhouettes and cel-shaded equipment'],
  ]},
  { v:'2.63.0', items:[
    ['⚡','Build-changing perks','Ricochet rounds, explosive reloads, every-fourth-kill lightning, and damaging grapple swings join the perk picker'],
    ['🧰','Bounded builds','Stat perks cap at three ranks; special perks are one-time picks. Fully upgraded builds receive a healing break instead'],
  ]},
  { v:'2.62.0', items:[
    ['🎨','Character expression studio','personalize your fighter with saved outfit palettes, hair silhouettes, accessories, and facial traits — visible in the menu and during every run'],
    ['✨','Sharper hero read','custom accent lighting, accessory silhouettes, and an expressive player ring make your chosen fighter easier to read in the swarm'],
  ]},
  { v:'2.61.0', items:[
    ['🔓','Biome grounds are a paid perk','desert, snow, volcanic ash, stone ruins and swamp ground textures now require "Unlock Everything" — free runs always use the classic grass ground'],
  ]},
  { v:'2.60.0', items:[
    ['🌍','Biome ground scenes','new maps now rotate between grass, desert sand, snow, volcanic ash, stone ruins and swamp textures so the arena backdrop changes from run to run'],
  ]},
  { v:'2.59.0', items:[
    ['🏠','3D building assets','houses, shops, barns and cabins now have matching low-poly GLB props in the progressive 3D layer — the canvas art still takes over automatically anywhere WebGL is unavailable'],
  ]},
  { v:'2.58.0', items:[
    ['🪙','Coin top-up (iOS)','the app version now offers a real-money 500-coin pack in the Shop — a second in-app purchase alongside Unlock Everything, for players who want to skip the grind on cosmetics without buying everything at once'],
  ]},
  { v:'2.57.0', items:[
    ['🔓','Unlock Everything (iOS)','the app version now offers a real in-app purchase to unlock every fighter and weapon instantly, replacing the external donate link Apple doesn\'t allow inside native apps'],
    ['🎯','Sniper rebalance','damage 250→190 — still drops almost anything in one shot, but no longer trivializes the burst-vs-DPS gap against the rest of the arsenal'],
    ['🦸','Roster strip on the home screen','a horizontal row of every fighter now sits under your card — tap any unlocked hero to switch instantly, no need to open the full avatar picker'],
    ['🧟','More enemy variants','every existing horde family now has a new sibling threat: Grunt, Skitter, Crusher, Venomspine, Rottank, Wraith, Shaman, and Colossus join the wave mix'],
    ['👹','Enemy visual upgrade','every zombie type now has a stronger in-game silhouette: runners are leaner and red-streaked, spitters carry glowing acid sacs, bloaters pulse with blisters, stalkers bristle with quills, brutes show bone spikes, and juggernauts wear heavier armor'],
  ]},
  { v:'2.56.0', items:[
    ['🎴','Perk picks every 3rd wave','the run now pauses on a 3-card choice (Extended Clip, Adrenaline, Heavy Rounds, Thick Skin, Regeneration, Second Wind) before waves 3, 6, 9… spawn — a mid-run lever for build variety, stacking with repeated picks'],
    ['🎲','3 new match mutators','Glass Cannon (+60% damage dealt and taken), Rich Vein (+70% scrap drops), and Blood Moon (+50% XP and coins) join the mutator pool announced at drop-in'],
  ]},
  { v:'2.55.0', items:[
    ['👹','3 new late-game enemies','Howler (violet screamer that hastes nearby zombies — kill it first), Carapace (rust-armored tank that shrugs off chip damage), and Husk (pale bone husk that periodically drops weaker adds) unlock at waves 9/11/13, each with its own color family and silhouette so the horde keeps evolving deep into a run instead of just scaling numbers'],
  ]},
  { v:'2.54.0', items:[
    ['🎯','Shots fire from the gun, not the hip','bullets, muzzle sparks and ejected shells now spawn from the actual drawn gun tip/hand — previously they left from a fixed radius around the character’s centre regardless of weapon length, so long guns like the Rifle and Sniper visibly fired from the hip'],
  ]},
  { v:'2.53.0', items:[
    ['👻','Invisible joysticks','the on-screen move/aim sticks no longer draw a visible base, knob, or resting hint — the touch zones still work exactly the same, just with nothing cluttering the view'],
    ['🔫','Brighter tracers','Pistol/Rifle bullets got a thicker, glowing tracer so shots read clearly against the grass instead of a barely-visible dash'],
  ]},
  { v:'2.52.0', items:[
    ['🧱','The map gets meaner as waves climb','every boss wave (5th, 10th, 15th…) also drops 2 new buildings onto the arena — more cover, more chokepoints — on top of the elites, up to 6 times per match'],
  ]},
  { v:'2.51.0', items:[
    ['🧹','Decluttered pause menu','the pause Settings screen now leads with Shop, audio/aim sliders, and controller status — profile editing, save codes, and the screen-fit check collapse behind a new "More options" toggle so pausing mid-fight is a quick glance, not a scroll'],
  ]},
  { v:'2.50.0', items:[
    ['🎗️','Nameplate banners','4 new colored banners (crimson, azure, gold, violet) join the trail shop — a cosmetic pill behind your name in-match, buy & equip from Shop → Nameplate Banner'],
    ['☠️','Boss polish','Juggernauts now have a visible hp banner while alive, a telegraphed ground-slam AoE attack on top of their normal contact damage, and a guaranteed loot drop (bonus scrap + a pickup) on death'],
  ]},
  { v:'2.49.0', items:[
    ['🛒','Shop while paused','the pause menu now has a Shop button so you can spend coins on trails and Extended Magazines mid-match, without quitting to the main menu'],
  ]},
  { v:'2.48.0', items:[
    ['🌙','Back to the midnight-forest look','removed the wood/parchment "village" reskin (v2.46-2.47) — dated, cluttered, and off-palette per feedback. Menus and cards are frosted glass again: dark layered gradients, blurred panels, soft green/gold glow accents'],
  ]},
  { v:'2.47.0', items:[
    ['👑','More 3D village title','the main logo now has gold beveling and deeper stacked shadows, closer to a fantasy strategy splash screen'],
    ['🔩','Bolted village cards','weapon cards, menu panels and headers gained metal corner bolts, thicker trim and deeper button press states'],
    ['🧱','Battlefield props rethemed','loot caches, barrels, signal posts and med tents now use wood, stone, gold and red-banner details to match the village UI'],
  ]},
  { v:'2.46.0', items:[
    ['🏰','Village-style menus','menus and windows now use chunky stone panels, carved wood frames, gold trim and red banners for a Clash-inspired fantasy look'],
    ['🛡️','Beveled game UI','buttons, cards, HUD rows and popups got heavier borders, raised shadows and warm village colors for better mobile readability'],
    ['📸','Cleaner screenshots','the headless visual driver serves the game over local HTTP so optional module loading no longer trips the file:// CORS path'],
  ]},
  { v:'2.45.0', items:[
    ['💥','Comic poster menus','menus and windows now use thick ink borders, pulp ribbons, hard shadows and brighter survival-comic cards instead of the glass console style'],
    ['🧰','Chunkier world props','caches, barrels, antennas and med tents were redrawn with stronger outlines and toy-like silhouettes for better phone readability'],
    ['📸','Cleaner screenshots','the headless visual driver now serves the game over local HTTP so optional module loading no longer trips the file:// CORS path'],
  ]},
  { v:'2.44.0', items:[
    ['✨','Visual asset overhaul','menus, windows and HUD panels now use a sharper neon survival-console skin with scanner lines, glass edges and richer button depth'],
    ['📦','New field props','supply caches, relay antennas, med tents and hazard barrels now decorate the arena with readable silhouettes and minimap pings'],
    ['🌊','Objects got more detail','ponds, rocks and map landmarks gained stronger highlights, shadows and tiny animated touches so the world reads cleaner in motion'],
  ]},
  { v:'2.43.2', items:[
    ['📱','iOS rotation enabled','the iOS wrapper now declares portrait and landscape orientations so the app can rotate with the device'],
    ['🔫','Weapons sized down again','held weapons are slightly smaller for a cleaner fit in the upgraded fighters’ hands'],
  ]},
  { v:'2.43.1', items:[
    ['🎯','Weapon arms centered','live aiming arms now attach at the fighter chest instead of drifting low on the new v2 character sprites'],
  ]},
  { v:'2.43.0', items:[
    ['🦸','Roster art upgraded','all 15 fighters now use polished v2 sprites with stronger silhouettes, cleaner outlines, and richer costume detail'],
    ['🔫','Held weapons tuned','in-hand weapon scale is slightly smaller while keeping the corrected transparent-padding crop'],
  ]},
  { v:'2.42.5', items:[
    ['🎯','Weapon art trimmed correctly','held weapons and weapon cards now crop transparent padding so the guns are no longer tiny or offset'],
  ]},
  { v:'2.42.4', items:[
    ['🔎','Bigger fighters & in-hand weapons','characters are larger on the field and held weapons are scaled up so the new art reads clearly during gameplay'],
  ]},
  { v:'2.42.3', items:[
    ['🎨','Weapon cards show the real art','weapon select now redraws with the PNG art for upgraded and new guns as soon as assets load'],
  ]},
  { v:'2.42.2', items:[
    ['🔫','New weapons up front','Pulse SMG, Arc Rifle, Frost Blaster & Rocket Launcher are unlocked from Lv 1 and featured first in weapon select'],
  ]},
  { v:'2.42.1', items:[
    ['🔫','New weapons restored','Pulse SMG, Arc Rifle, Frost Blaster & Rocket Launcher now appear in the weapon grid and keep their special projectile behavior'],
  ]},
  { v:'2.42.0', items:[
    ['🔫','Real weapon art, in-hand','all 12 guns now render as painterly sci-fi art in your fighter\'s hands instead of flat vector shapes — falls back to the old drawn look automatically if art fails to load'],
  ]},
  { v:'2.41.0', items:[
    ['🎮','Local 2-player co-op','plug in a 2nd controller mid-match and Player 2 drops in automatically, fighting side by side with their own health/ammo, weapon, and minimap dot — the camera keeps both of you in view as long as you stay reasonably close together'],
  ]},
  { v:'2.40.2', items:[
    ['🎮','Controller status in Settings','Settings now shows whether a controller is connected (and its name) live, plus how to pair one via your device\'s Bluetooth settings — there was previously nothing in the UI about controller support at all'],
  ]},
  { v:'2.40.1', items:[
    ['🎮','Full gamepad menu coverage + DualSense rumble','Achievements, Shop, Support, Add-to-Home-Screen and What\'s New are all controller-navigable now, Settings sliders (SFX volume, aim sensitivity) adjust with left/right, and taking a hit or landing a kill now pulses your controller — DualSense rumble works the same over Bluetooth as wired, no special-casing needed'],
  ]},
  { v:'2.40.0', items:[
    ['🎮','Gamepad menu navigation','fighter/weapon select, settings, and results are now fully controller-navigable — d-pad or left stick to move, A to confirm, X/B to back out of settings — a controller player can finally get in a match without touching the screen'],
  ]},
  { v:'2.39.3', items:[
    ['🗺️','Minimap is now collapsible','tap the pill in its top-right corner to tuck it away — it was sitting right over the "GET READY" banner at match start on some screens'],
  ]},
  { v:'2.39.2', items:[
    ['🔧','SMG got a suppressor', 'a chunky ribbed cylinder now sits along the barrel — the SMG was the plainest gun left, now it has real silhouette'],
  ]},
  { v:'2.39.1', items:[
    ['🪵','Rifle got a wood stock','the starter Rifle was the only long gun with no wood furniture — now it looks the part'],
  ]},
  { v:'2.39.0', items:[
    ['🔫','Weapon detail pass','the Minigun now feeds from a visible ammo belt with a heat-vent grille, and the Pistol has a proper hammer — the last two guns that read as generic barrels now have real character'],
  ]},
  { v:'2.38.0', items:[
    ['👹','Distinct monster silhouettes','stalkers now have a leaner build with a quilled spine ridge, and juggernauts wear visible armor plating — no more mistaking them for a recolored zombie'],
  ]},
  { v:'2.37.0', items:[
    ['🎮','Deeper controller support','grapple (L3) and pause (Start) now work on gamepad, plus a quiet 🎮 HUD indicator once a controller is detected'],
  ]},
  { v:'2.36.0', items:[
    ['🗺️','A bigger world','the arena is ~80% larger, with more buildings, ponds and greenery to explore'],
    ['🪦','New landmark: graveyard','a weathered plot of tombstones joins campfires, wells and statues at level 20'],
    ['📍','Sharper minimap','bigger, now shows ponds and landmarks, plus a facing tick so you know which way you’re looking'],
  ]},
  { v:'2.35.2', items:[
    ['📱','Screen fit, take two','the installed app was leaving a gap at the bottom of the screen on some phones — fixed'],
  ]},
  { v:'2.35.1', items:[
    ['📱','Fixed a portrait/landscape mixup','the installed app could size itself sideways on launch, clipping the title — fixed'],
  ]},
  { v:'2.35.0', items:[
    ['🎲','Match mutators','occasional Horde runs drop in with a twist — Swarm Night, Deep Fog, or Low Gravity bombs'],
  ]},
  { v:'2.34.2', items:[
    ['🩸','Walls remember','a hit near a house wall now leaves a drip streak behind — the building carries the fight'],
  ]},
  { v:'2.34.1', items:[
    ['📱','No more black bars','Safari’s top & bottom bars now blend into the game instead of framing it in near-black'],
  ]},
  { v:'2.34.0', items:[
    ['🔊','Real gunfire','every shot is now a firing pin, a muzzle blast, a rolling report and brass hitting the ground'],
    ['🎧','Sounds have a direction','enemies, shots and explosions pan left/right and go muffled with distance'],
    ['🧟','Zombies have throats','growls & death rattles are voice-modelled now, not beeps — and hits sound wet'],
    ['💥','Explosions that echo','blasts roll out across the field with debris raining down after them'],
    ['📏','Screen Fit gives a verdict','the diagnostic now says whether your fit is correct, not just the raw numbers'],
  ]},
  { v:'2.33.0', items:[
    ['🧟','All-in on the horde','Battle Royale & Squads are retired — Last Pulse is now a pure zombie-survival game. PLAY drops you straight toward the waves'],
    ['💀','Kills finally count','zombie kills now feed your kill counter, streaks, coins & XP (they used to count humans only — the horde was working for free)'],
    ['🏅','Achievements & dailies reworked','win-based goals became wave-based (already-earned trophies stay), and the menu stats now show your best wave'],
  ]},
  { v:'2.32.3', items:[
    ['💾','Save codes','copy your save as a code and load it on any device or browser — your progress can finally travel (Settings → Copy Save Code)'],
    ['⚠️','Save-loss warning','the game now tells you when a browser (private tabs, TikTok/Instagram in-app browsers) can’t save progress'],
    ['📏','Screen Fit check','a diagnostic in Settings that reports exactly how the game fits your screen — helps us squash device-specific bars fast'],
  ]},
  { v:'2.32.2', items:[
    ['📏','iPhone bars: the real fix','iOS was reporting a zero-size notch to the game; we now detect the lie and use true hardware insets — field edge-to-edge, title clear of the clock'],
  ]},
  { v:'2.32.1', items:[
    ['📏','True edge-to-edge','the field now paints under the status bar and home indicator — no more dark strips framing the menus on iPhone'],
  ]},
  { v:'2.32.0', items:[
    ['🎨','Living menu backdrop','the menus now sit over the real field with a live horde shambling — and runners sprinting — past behind them'],
  ]},
  { v:'2.31.5', items:[
    ['📏','Black bar at the bottom — fixed','the game now fills the whole screen on iPhones (especially the installed Home Screen app), reclaiming the dead strip above the home indicator'],
  ]},
  { v:'2.31.4', items:[
    ['📱','New app icon','Last Pulse has a fresh icon — a glowing pulse in a shooter reticle — for your Home Screen, browser tab & installs'],
  ]},
  { v:'2.31.3', items:[
    ['📲','Add to Home Screen','iPhone & iPad players get a quick guide to install Last Pulse to the Home Screen — it launches fullscreen like a real app'],
  ]},
  { v:'2.31.2', items:[
    ['💜','Support the game','if you’re enjoying Last Pulse, you can now tip the dev right from the results screen — every bit helps keep the updates coming'],
  ]},
  { v:'2.31.1', items:[
    ['🏳️','Quit to main menu','you can now leave a match anytime — tap the ⚙ gear and hit “Quit to Main Menu”'],
  ]},
  { v:'2.31.0', items:[
    ['📦','Extended Magazines','a new Shop upgrade — spend coins to permanently widen every weapon’s magazine (up to +60%), so you reload less and shoot more'],
  ]},
  { v:'2.30.0', items:[
    ['🎛️','Tidier action buttons','the four abilities now tuck into a single push-button in the corner — tap it to fan them out, tap again to hide; buttons are smaller too, so the field stays clear'],
  ]},
  { v:'2.29.0', items:[
    ['🌊','Horde waves fixed & harder','a wave now advances only when you fully clear it (stranded stragglers get pulled back in so it never stalls), and each wave throws more, tougher zombies'],
  ]},
  { v:'2.28.0', items:[
    ['🏃','Punchier movement','fighters now accelerate with weight, lean into their run, and their stride speeds up the faster they move — plus the camera leads the way you’re heading'],
  ]},
  { v:'2.27.0', items:[
    ['🎛️','Compact ability buttons','the four action buttons are now a tidy 2×2 cluster in the corner instead of a tall strip — more of the map stays in view'],
  ]},
  { v:'2.26.0', items:[
    ['🧍','Bigger fighters','characters are drawn a little larger on the field — easier to read at a glance'],
    ['🏘️','Tidier village','buildings now spread out with more breathing room and keep well clear of the ponds'],
  ]},
  { v:'2.25.0', items:[
    ['🏘️','New building types','the world now mixes shops (striped awning + sign), red barns (X-brace doors + hayloft) and log cabins alongside the classic houses — all still enterable with loot inside'],
  ]},
  { v:'2.24.1', items:[
    ['📱','No more black bar (for real)','the status-bar / notch strip now shows the game’s green instead of a black band on iPhone'],
  ]},
  { v:'2.24.0', items:[
    ['🔇','Music removed','the looping soundtrack is gone — the game is now sound-effects only (guns, hits & UI still play)'],
    ['💜','Tidier menu','the “Support the game” button now matches the Achievements / Shop pill styling'],
  ]},
  { v:'2.23.0', items:[
    ['💜','Support the game','a new Donate button on the main menu — tip the creator via Stripe’s secure checkout to fuel more updates'],
  ]},
  { v:'2.22.1', items:[
    ['🎵','Smoother soundtrack','the in-game music now rides the audio clock — no more stutter or timing drift, especially on mobile'],
  ]},
  { v:'2.22.0', items:[
    ['🔨','Build mode','tap 🔨 (or press B) to cycle Wall → Spikes → Turret, then fire to drop it — build cover on the fly'],
    ['🔩','Scrap to build','zombies drop scrap and caches are scattered around the map — spend it on structures'],
    ['🔫','Auto-turrets','plant a turret and it guns down nearby zombies for you; walls block them, spikes shred them'],
  ]},
  { v:'2.21.1', items:[
    ['📱','No more black bar','the game now paints all the way up under the iPhone notch / status bar'],
  ]},
  { v:'2.21.0', items:[
    ['🧟','Bigger, meaner hordes','waves now throw more enemies and ramp harder — HP, damage & speed climb every wave'],
    ['🤢','New horrors in the mix','Spitters & Bloaters now actually spawn, plus fast Stalkers that swarm you'],
    ['☠️','Elite waves','every 5th wave sends armored Juggernaut mini-bosses'],
  ]},
  { v:'2.20.1', items:[
    ['🪜','Ladders fixed','the watchtower climb now actually works — walk onto the south ladder to hop up onto the roof'],
  ]},
  { v:'2.20.0', items:[
    ['🗼','Climb the towers','Endless Horde now has 2-story watchtowers — walk onto the ladder to hold the roof & shoot down'],
    ['🤢','Two new horrors','Spitters lob acid from range (they can hit you on the roof) and Bloaters burst into acid on death'],
  ]},
  { v:'2.19.0', items:[
    ['💀','Beatdown soundtrack','the music is now downtuned metalcore — chromatic chugs, dissonant stabs & crushing half-time breakdowns'],
  ]},
  { v:'2.18.0', items:[
    ['🤘','Metal soundtrack','a driving, distorted riff — galloping chugs, power chords & double-bass drums'],
    ['🔊','Meatier guns','every gun got extra crunch & low-end punch — overdriven bodies and a deeper thump'],
  ]},
  { v:'2.17.0', items:[
    ['🌌','Brand-new menus','a living aurora-mesh background — drifting neon light, a soft tech grid & glowing embers'],
  ]},
  { v:'2.16.0', items:[
    ['🧟','Nastier enemies','the zombies got a full redraw — glowing eyes, gaping fanged maws, exposed ribs & raking claws'],
    ['💀','Distinct horrors','lean red-eyed Runners, a hulking bone-spiked Brute, and rotting Shamblers — each reads at a glance'],
  ]},
  { v:'2.15.0', items:[
    ['🌈','Signature auras','Shade, Nova, Blaze, Reaper, Onyx & Titan now glow with their own color in-match'],
    ['⚡','Quicker unlocks','the new heroes now unlock Lv 16–26 (was 16–32); Full Roster caps at Lv 26'],
  ]},
  { v:'2.14.0', items:[
    ['🦹','6 new heroes','Shade, Nova, Blaze, Reaper, Onyx & Titan — assassins, a commando, a reaper & armored tanks'],
    ['🔓','Deeper unlocks','the new roster joins the lineup for you to unlock and play'],
  ]},
  { v:'2.13.0', items:[
    ['🔊','Guns hit harder','every weapon got a punchier, layered gunshot — crack, body & tail, tuned per gun'],
    ['💥','Signature sounds','Magnum booms like a hand-cannon, the Sniper cracks with a distant echo, rockets thump'],
  ]},
  { v:'2.12.0', items:[
    ['🔫','Weapon cards leveled up','each gun shows a Power rank (#1 = strongest you own) and a rarity-tinted card'],
    ['✨','Legendary sheen','Legendary weapons sweep a shimmer across their rarity chip'],
    ['🎯','Loadout shows in-match','your name now carries a rarity accent line in the color of your gun'],
  ]},
  { v:'2.11.0', items:[
    ['🏃','Heroes come alive','characters now bob, sway & step — legs and body animate as you run, not just the arm'],
    ['🏅','New achievements','Full Roster, Iron Wall (win as Sarge) & Blur (win as Lila)'],
  ]},
  { v:'2.10.1', items:[
    ['🔓','Faster unlocks','the whole roster is now yours by Lv 15 (Cypher), not Lv 26'],
  ]},
  { v:'2.10.0', items:[
    ['✨','Fresh roster','the nine heroes are all-new — Kai, Milo, Chip, Lila, Yuki, Vex, Sarge, Finn & Cypher'],
    ['🔫','Weapon in-hand','every hero now holds their gun and aims it a full 360° as you shoot'],
    ['🔓','Unlock from Lv 1','Kai & Milo are ready at the start; the rest unlock quickly as you level'],
  ]},
  { v:'2.9.0', items:[
    ['🦸','9 new heroes','Kai, Milo, Chip, Lila, Yuki, Vex, Sarge, Finn & Cypher join the roster'],
    ['🔫','Weapon in-hand','the new heroes hold their gun and aim it a full 360° as you shoot'],
    ['🔓','More to unlock','fresh sprite fighters gated from Lv 30 all the way to Lv 62'],
  ]},
  { v:'2.8.0', items:[
    ['🥷','Onyx','a hooded assassin joins the roster (Lv 22)'],
    ['🐸','Hopper','a sharp-dressed frog with a fast trigger (Lv 26)'],
  ]},
  { v:'2.7.0', items:[
    ['🦸','5 new fighters','Bjorn, Zane, Wraith, Ace & Nova — unlock as you level up'],
    ['🎨','Illustrated heroes','all sprite-art, each with their own look & stats'],
  ]},
  { v:'2.6.1', items:[
    ['🔄','Turn to shoot','your fighter now faces the way you aim, even while running'],
  ]},
  { v:'2.6.0', items:[
    ['🎨','Hand-drawn heroes','Blaze & Rose now use crisp illustrated sprites'],
    ['🌳','New scenery art','illustrated grass, trees & bushes across the map'],
    ['🖼','Fresh look','the whole battlefield got an art upgrade'],
  ]},
  { v:'2.5.0', items:[
    ['🚀','Rocket Launcher','a new weapon that fires explosive splash rockets (Lv 12)'],
    ['🐍','Vipers','twin-barrel SMG — double the lead downrange (Lv 15)'],
    ['😇','Seraph & Diablo','two new fighters: an angel (Lv 28) and a demon (Lv 32)'],
  ]},
  { v:'2.4.0', items:[
    ['🔫','Bigger, crisper guns','weapon art rendered large & sharp on the select cards'],
    ['💎','Rarity tiers','Common → Legendary, with colored accents on each gun'],
    ['📊','Compare at a glance','each gun shows its DPS vs your equipped weapon'],
  ]},
  { v:'2.3.0', items:[
    ['🏅','Rank ladder','climb Rookie → Fighter → … → Immortal well past level 25'],
    ['🪙','Level-up payouts','every level up now rewards coins (more at higher levels)'],
    ['🎯','Always a goal','results show your next rank once everything else is unlocked'],
  ]},
  { v:'2.2.0', items:[
    ['🏕','Campfire healing','stand near a campfire to slowly recover health'],
    ['🧟','Smarter zombies','they path to the door when you hole up in a house'],
    ['🚪','Bigger houses','large buildings now have a second door — no dead ends'],
    ['🎯','Fairer BR start','enemy aim also eases in over the first ~18s'],
  ]},
  { v:'2.1.2', items:[
    ['⬆️','Tighter menu','trimmed the empty space above the title'],
    ['🎯','Easier start','Battle Royale eases you in — enemies warm up over the first ~18s'],
  ]},
  { v:'2.1.1', items:[
    ['👁','Clearer fighters','characters no longer look faded at dusk & night'],
  ]},
  { v:'2.1.0', items:[
    ['🏠','New main menu','a proper home screen — pick your mode on its own page'],
    ['🎯','Choose Mode screen','Battle Royale / Horde / Squads with a back button'],
  ]},
  { v:'2.0.1', items:[
    ['🕹','Landscape fix','power buttons no longer float over your fighter'],
    ['📐','Menu spacing','PLAY button no longer overlaps the Daily Challenge card'],
  ]},
  { v:'2.0.0', items:[
    ['✨','Interface overhaul','frosted-glass panels, smoother motion & a deeper look'],
    ['📱','Notch-friendly HUD','controls & panels respect phone safe areas'],
    ['🎨','Polished menus','glowing selections, hero-button shine, springier taps'],
  ]},
  { v:'1.10.0', items:[
    ['🏘','Growing world','more houses, ponds & greenery appear as you level up'],
    ['🏕','New landmarks','campfires (Lv3), fences (Lv6), wells (Lv10), statues (Lv15)'],
    ['🎁','More loot','every extra house hides another pickup inside'],
    ['🩸','Bloodier battles','directional blood spray & ground splatter on every hit'],
  ]},
  { v:'1.9.0', items:[
    ['🚪','Enterable buildings','walk in through the door — loot hides inside every house'],
    ['🛡','Real cover','walls block bullets, doorways don\'t — fight room to room'],
    ['🔫','Weapon detail pass','wood grain, muzzle caps, gold-trim magnum & rotary barrels'],
  ]},
  { v:'1.8.0', items:[
    ['⚡','Kill combos','chain kills inside 3s for up to 3× XP — with slow-mo hits'],
    ['🪙','Coins & Shop','earn coins from kills, wins & badges — buy cosmetic trails'],
    ['🥇','Tiered achievements','23 badges in bronze / silver / gold, each pays coins'],
    ['📅','Daily challenge','a fresh feat every day, worth 60 coins'],
    ['🧟','Zombies came alive','lurching, clawing, lunging jaws — glowing eyes at night'],
    ['🔓','Next unlock teaser','results show exactly what you unlock next'],
  ]},
  { v:'1.7.0', items:[
    ['🏅','Achievements','14 badges to unlock — track them from the menu'],
    ['🧍','Livelier fighters','two-handed grips, blinks, run lean & foot dust'],
    ['🪝','Grapple hook','fire at a building and swing with momentum (F)'],
    ['📱','Small-screen fixes','settings & results now scroll — nothing cut off'],
  ]},
];
