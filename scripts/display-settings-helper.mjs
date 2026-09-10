export async function toggleFx(page) {
  const settings=page.locator('.obs-fx-settings');
  if(await settings.getAttribute('aria-expanded')!=='true')await settings.click();
  await page.locator('.ambient-fx-toggle').click();
  await page.keyboard.press('Escape');
}
