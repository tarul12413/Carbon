import type { Page } from "@playwright/test";

/**
 * Screenshots go to tests/screenshots/latest (gitignored). At the end of a
 * milestone, `npm run screenshots:keep -- mN` copies them into a committed folder.
 */
export const shot = (page: Page, name: string, project: string, fullPage = false) =>
  page.screenshot({ path: `tests/screenshots/latest/${name}-${project}.png`, fullPage });
