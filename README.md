# coby.lk

Source for [coby.lk](https://coby.lk), the personal site of Coby Kassner. It is built on [Quartz](https://quartz.jzhao.xyz/), a static-site generator that turns a folder of Markdown notes into a website; this repository is a fork of [jackyzha0/quartz](https://github.com/jackyzha0/quartz) with custom components, styles, and content layered on top.

Site content lives in `content/` and is authored as an Obsidian vault. The Quartz source itself lives in `quartz/`, with site-specific components such as the folio under `quartz/components/`. The `booking-worker/` directory contains a separate Cloudflare Worker that backs the booking page (see its own README), and `booking-preview/` is a local harness for developing against it with mocked data.

To run the site locally:

```sh
npm ci
npx quartz build --serve
```

This serves the site at `http://localhost:8080` and rebuilds on changes.
