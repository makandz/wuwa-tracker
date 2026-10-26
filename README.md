# Wuwa Tracker

A small Next.js app for keeping track of Wuthering Waves character builds.

It pulls the current character and weapon catalog from Encore, then lets you track the stuff that is easy to lose in notes: assigned weapons, up to three echo sets per character, per-set scoring and ER, checklist progress, and weapon inventory overlap.

Progress is saved in the browser's local storage. You can also export the tracker data as JSON from the app.

## Running it

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

## Notes

This is a personal tracker, not an official Wuthering Waves tool. Catalog images and names come from the live Encore API, so the app needs network access for the initial character and weapon lists.
