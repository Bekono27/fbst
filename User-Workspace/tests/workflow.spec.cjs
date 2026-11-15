const { test, expect } = require('@playwright/test');

test('seed, rehearse and persist a locally recorded Page', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Load 200 mock users'}).click();
  await expect(page.locator('tbody tr')).toHaveCount(200);
  await page.getByLabel('Filter by portfolio').selectOption('Portfolio 1');
  await expect(page.locator('tbody tr')).toHaveCount(50);
  await page.getByRole('button',{name:'Manage',exact:true}).first().click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button',{name:'Rehearse creation'}).click();
  await expect(page.getByText('Rehearsed',{exact:true}).first()).toBeVisible();
  await page.reload();
  await expect(page.locator('tbody')).toContainText('Rehearsed');
});

test('rehearse a rename and updated bio after creation', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button',{name:'New user'}).click();
  await page.getByLabel('Display name',{exact:true}).fill('Бат Dorj');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button',{name:'Rehearse creation'}).click();
  await page.getByRole('button',{name:'Manage'}).click();
  await page.getByLabel('Display name',{exact:true}).fill('Batuna');
  await page.getByLabel('Bio',{exact:true}).fill('Keeps a weekend photo diary.');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button',{name:'Rehearse update'}).click();
  await expect(page.locator('tbody')).toContainText('Batuna');
  await page.reload();
  await page.getByRole('button',{name:'Manage'}).click();
  await expect(page.getByLabel('Bio',{exact:true})).toHaveValue('Keeps a weekend photo diary.');
});
