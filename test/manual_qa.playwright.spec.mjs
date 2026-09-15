import { expect, test } from '@playwright/test';

async function connect(page) {
  await page.getByRole('button', { name: /connect secure demo/i }).click();
  // The callback safely scrubs its one-time query parameters and returns to `/`.
  // Assert the restored state, not a transient callback URL that can be missed.
  await expect(page.getByRole('heading', { name: /what type of glass/i })).toBeVisible();
}

test('MQ-01: operational entry point presents the secured client', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/secure operational demo/i)).toBeVisible();
  await expect(page.getByText(/static demo/i)).not.toBeVisible();
});

test('MQ-02 and MQ-04: OAuth return enables a windshield VIN lookup', async ({ page }) => {
  await page.goto('/');
  await connect(page);
  await page.getByRole('button', { name: 'Windshield' }).click();
  await page.getByRole('button', { name: /search compatible windshield/i }).click();
  await expect(page.getByText(/vehicle identified/i)).toBeVisible();
  await expect(page.getByText(/compatible results/i)).toBeVisible();
});

test('MQ-06: door glass requires Year, Make, Model before VIN', async ({ page }) => {
  await page.goto('/');
  await connect(page);
  await page.getByRole('button', { name: 'Door Glass' }).click();
  const continueButton = page.getByRole('button', { name: /continue to vin lookup/i });
  await expect(continueButton).toBeDisabled();
  await page.locator('#year').selectOption({ index: 1 });
  await page.locator('#make').selectOption({ index: 1 });
  await page.locator('#model').selectOption({ index: 1 });
  await expect(continueButton).toBeEnabled();
});

test('MQ-07: invalid VIN is rejected before lookup', async ({ page }) => {
  await page.goto('/');
  await connect(page);
  await page.getByRole('button', { name: 'Back Glass' }).click();
  await page.locator('#vin').fill('BAD');
  await page.getByRole('button', { name: /search compatible back glass/i }).click();
  await expect(page.getByRole('alert')).toContainText(/valid 17-character vin/i);
});

test('client ecosystem hub renders responsively and exports validation', async ({ page }) => {
  await page.goto('/whats-new.html');
  await expect(page.getByRole('heading', { name: /from a shared process map/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /open business blueprint/i })).toHaveAttribute('href', 'blueprint.html');
  await expect(page.getByText(/require the R&R application running on the presenter’s computer/i)).toBeVisible();

  await page.getByLabel('Yes').first().check();
  await page.getByLabel(/reviewer name/i).fill('Client reviewer');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export validation json/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^rr-client-validation-\d{4}-\d{2}-\d{2}\.json$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: /from a shared process map/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
