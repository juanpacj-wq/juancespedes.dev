# Project images

Images for each project, picked up by file name (`src/ui/project/media.ts`):

- `card.*`: screenshot shown on the home page card. Without it the card draws a placeholder.
- `cover.*`: wide image under the title of the project page.
- `gallery-1.*`, `gallery-2.*`...: more images on the project page, in order.

Any of avif, webp, png or jpg. Astro resizes and converts them at build time, so drop the
original (1600 px wide or more). Screenshots of internal systems must be recreated or
anonymized first (see `CLAUDE.md`).

## Stock placeholders

Until the real screenshots arrive, `cover` and `gallery` hold stock photos from Unsplash
(Unsplash License, free to use, no attribution required), fetched through picsum.photos. Their
names end in `.stock` (`cover.stock.webp`), and the project page labels them as illustrative.
A real image with the same name and no `.stock` (`cover.png`) takes precedence; then delete the
stock file and its line here.

- `plant-telemetry/cover.stock.webp`: Andrea Boldizsar, https://unsplash.com/photos/BwgKUh9tN84
- `plant-telemetry/gallery-1.stock.webp`: Levi Saunders, https://unsplash.com/photos/1nz-KjRdg-s
- `plant-telemetry/gallery-2.stock.webp`: José Martín, https://unsplash.com/photos/RxaN6Bbches
- `operations-logbook/cover.stock.webp`: Galymzhan Abdugalimov, https://unsplash.com/photos/ICW6QYOcdlg
- `operations-logbook/gallery-1.stock.webp`: Alejandro Escamilla, https://unsplash.com/photos/yC-Yzbqy7PY
- `operations-logbook/gallery-2.stock.webp`: Aleksi Tappura, https://unsplash.com/photos/PjH_BkzjxTA
- `corporate-portal/cover.stock.webp`: Charles Forerunner, https://unsplash.com/photos/3fPXt37X6UQ
- `corporate-portal/gallery-1.stock.webp`: Adam Przewoski, https://unsplash.com/photos/umchkHwkdyM
- `corporate-portal/gallery-2.stock.webp`: Thong Vo, https://unsplash.com/photos/g28MgVK85bQ
- `invoice-etl-rescue/cover.stock.webp`: Sergey Zolkin, https://unsplash.com/photos/E0Spm6XXn2Y
- `invoice-etl-rescue/gallery-1.stock.webp`: Rayi Christian Wicaksono, https://unsplash.com/photos/6PF6DaiWz48
- `invoice-etl-rescue/gallery-2.stock.webp`: Alejandro Escamilla, https://unsplash.com/photos/cZhUxIQjILg
- `invoice-parser/cover.stock.webp`: Nadir Balcikli, https://unsplash.com/photos/wE9nUW7tMmk
- `invoice-parser/gallery-1.stock.webp`: Alejandro Escamilla, https://unsplash.com/photos/N7XodRrbzS0
- `invoice-parser/gallery-2.stock.webp`: Aleks Dorohovich, https://unsplash.com/photos/nJdwUHmaY8A
- `event-platform/cover.stock.webp`: Daniel Robert, https://unsplash.com/photos/MRxD-J9-4ps
- `event-platform/gallery-1.stock.webp`: Daniel Ebersole, https://unsplash.com/photos/Q14J2k8VE3U
- `event-platform/gallery-2.stock.webp`: Anna Dziubinska, https://unsplash.com/photos/mVhd5QVlDWw
- `linkedin-pilot/cover.stock.webp`: timothy muza, https://unsplash.com/photos/6VjPmyMj5KM
- `linkedin-pilot/gallery-1.stock.webp`: Jay Wennington, https://unsplash.com/photos/i8CYGnoerR0
- `linkedin-pilot/gallery-2.stock.webp`: Thom, https://unsplash.com/photos/Zdcq3iKly6g
