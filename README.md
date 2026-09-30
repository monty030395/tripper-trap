# Tripper Trap

A barcode-scanner-triggered sound & visual installation, built for a live
art event. Scan a barcode → it triggers a sound and a full-screen visual
flash. Inspired by [Electronicos Fantasticos](http://www.electronicosfantasticos.com/)'s
barcode orchestra.

No build step, no dependencies to install — just static HTML/CSS/JS with
[Tone.js](https://tonejs.github.io/) loaded from a CDN.

## Setup

1. Clone or download this repo.
2. Open `index.html` directly in a browser (double-click it, or drag it
   into a browser window).
3. Click **Start** on the opening screen — browsers block audio until a
   user gesture, this unlocks it.

That's it. No `npm install`, no server, no bundler.

## How it works

A USB barcode scanner acts as a HID keyboard: when it reads a barcode, it
"types" the decoded string into whatever has keyboard focus, then sends
`Enter`. This app listens for `keydown` events globally, buffers
characters until `Enter`, and treats the buffered string as one **scan**.

Each scan is looked up in `TRIGGER_MAP` (in `app.js`). A match fires a
Tone.js synth and a colored flash on the full-screen canvas; an unmapped
code still flashes (in grey) and gets logged, so you can see exactly what
came in.

## Testing without a scanner (dev mode)

Check **Dev mode** in the top-right corner — a text box appears. Type a
barcode string and press `Enter` (or click **Send**) to simulate a scan.
This goes through the exact same code path as a real scanner, so anything
you validate here will behave identically once hardware is plugged in.

## Debug overlay

The top-left panel shows the last 8 raw scans with timestamps — green if
matched to a trigger, red if unmapped. Use this to check exactly what
string your real scanner sends for a given barcode before wiring up the
mapping.

## Adding real barcode mappings

Once you've printed test sheets and scanned them to see the real strings
(via the debug overlay above), open `app.js` and add entries to
`TRIGGER_MAP`:

```js
const TRIGGER_MAP = {
  trap_kick: {
    label: 'Kick Drum',
    color: '#ff3b5c',
    power: 1.0, // 0..1, controls flash size/intensity
    sound: () => kickSynth.triggerAttackRelease('C1', '8n'),
  },
  // add your real scanned strings here, same shape
};
```

The four synths (`kickSynth`, `snareSynth`, `hatSynth`, `bassSynth`) are
placeholders. To swap in real samples later, replace a synth with a
`Tone.Player` (or `Tone.Sampler`) and point its `sound()` call at your
audio file.

## Files

| File         | Purpose                                              |
|--------------|-------------------------------------------------------|
| `index.html` | Page structure, loads Tone.js from CDN                |
| `style.css`  | Full-screen canvas + overlay panel styling             |
| `app.js`     | Scan capture, trigger map, synths, canvas visuals      |
