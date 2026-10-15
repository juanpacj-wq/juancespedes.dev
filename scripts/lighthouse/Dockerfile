# Lighthouse with the Chromium of the Playwright image, for `pnpm lighthouse:local`
# (scripts/lighthouse-local.mjs). Built once; installing Lighthouse on every run through a
# Windows bind mount took about four minutes. Keep the tag on the @playwright/test version.
FROM mcr.microsoft.com/playwright:v1.64.0-noble
RUN npm install --global lighthouse@12 \
  && ln -s "$(ls -d /ms-playwright/chromium-*/chrome-linux*/chrome | head -1)" /usr/local/bin/chrome-lighthouse
ENV CHROME_PATH=/usr/local/bin/chrome-lighthouse
