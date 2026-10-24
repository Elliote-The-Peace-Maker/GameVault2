# Third-party asset and rights notes

## Rockstar Games imagery

The Grand Theft Auto VI landscape cover shown in the local GameVault prototype is official Rockstar Games art. Its source is listed at [Rockstar Games GTA VI Media](https://www.rockstargames.com/VI/media).

**Rights status: pending written permission from Take-Two Interactive.**
This is a local, noncommercial prototype reference only. Rockstar's [fan content policy](https://support.rockstargames.com/articles/7bNaeoMFTV0iUDGhStTXvz/policy-on-posting-copyrighted-rockstar-games-material) describes limited noncommercial use by individual members of the fan community and says material may be taken down. It does not grant GameVault a reproduction license for an app, service, or promotion. Do not publish, deploy, advertise, monetize, or ship this image unless Take-Two grants permission for GameVault's intended use. Replace it with cleared artwork if permission is not granted.

## Real GTA game screenshots

The catalog now uses locally cached screenshots from the games, plus a cover for GTA VI, rather than original GameVault city art as the primary image. Two collection entries use collages made from their included games' screenshots. Each title's exact local path, source page, and source URL are recorded in [`data/game-image-assets.json`](../data/game-image-assets.json); `data/media-assets.json` marks all 19 entries as **pending written permission**, prototype-only, and not allowed for public release.

These captures remain copyrighted Rockstar game material even when found in an image archive or gameplay database. Source links are included on each game detail page for traceability. Do not publish, deploy, advertise, monetize, or ship these images without written permission from Take-Two for GameVault's intended use. Replace them with cleared images if permission is not granted.

## Original GameVault visual assets

The 19 fallback GTA catalog illustrations under `public/assets/games/{gta-slug}.svg` and 12 player portraits under `public/assets/avatars/` are original GameVault SVG artwork generated for this project. The fallback illustrations use abstract city scenes; they are not Rockstar screenshots, official covers, characters, logos, or game assets. The new player portraits depict original GTA-world roles and settings, not Rockstar characters or real people. They are optional profile art and do not create demo accounts.

The generated assets can be rebuilt with `node scripts/generate-visual-assets.mjs`. The script also updates the local GTA catalog's `artwork_path` fields.

## Lucide icons

The bundled navigation and interface SVG symbols are adapted from Lucide, Copyright (c) 2026 Lucide Icons and Contributors. Source: [lucide-icons/lucide](https://github.com/lucide-icons/lucide), license: ISC.

ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

## Simple Icons

The Discord, Twitch, YouTube, Instagram, and X marks are from [simple-icons/simple-icons](https://github.com/simple-icons/simple-icons) and are dedicated to the public domain under [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md). Simple Icons does not grant trademark rights. The marks are used only to identify the corresponding external social links; each platform retains its own brand rights. See the project's [trademark disclaimer](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md).
