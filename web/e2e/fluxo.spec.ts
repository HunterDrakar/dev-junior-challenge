import { expect, test } from '@playwright/test';

/**
 * O fluxo inteiro pelo navegador, com API, banco e cadastro de verdade:
 * totem → recepção → painel. Espera a Carla (333.333.333-33) sem check-in
 * hoje, como num `docker compose up` recém-subido.
 */
test('check-in no totem, chamada na recepção e senha no painel', async ({ page }) => {
  const pedidosDoTotem: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'fetch') pedidosDoTotem.push(`${r.method()} ${new URL(r.url()).pathname}`);
  });

  // Totem: o paciente digita o CPF e recebe a senha.
  await page.goto('/totem');
  await page.getByLabel('Digite seu CPF').pressSequentially('33333333333');
  await page.getByRole('button', { name: 'Confirmar check-in' }).click();
  await expect(page.getByText('Tudo certo, Carla.')).toBeVisible();
  const senha = (await page.getByText(/^\d{3}$/).innerText()).trim();

  // O totem é público: não baixa a fila e não leva a outras telas.
  expect(pedidosDoTotem).toEqual(['POST /checkins']);
  await expect(page.getByRole('link')).toHaveCount(0);
  page.removeAllListeners('request');

  // Recepção: a Carla aparece com o CPF mascarado; chama até chegar nela.
  await page.goto('/recepcao');
  const aguardando = page.getByRole('list', { name: 'Pacientes aguardando' });
  await expect(aguardando.getByText('Carla Menezes')).toBeVisible();
  await expect(aguardando).toContainText('***.333.333-**');
  await expect(page.locator('body')).not.toContainText('333.333.333-33');

  const avisoDaCarla = page.getByText(`Senha ${senha} chamada: Carla Menezes`);
  for (let i = 0; i < 10 && !(await avisoDaCarla.isVisible()); i++) {
    await page.getByRole('button', { name: 'Chamar próximo' }).click();
    await expect(page.getByRole('button', { name: /Chamar próximo/ })).toBeVisible();
  }
  await expect(avisoDaCarla).toBeVisible();
  await expect(page.getByRole('list', { name: 'Pacientes chamados' })).toContainText('Carla Menezes');

  // Painel da sala de espera: a senha em destaque, sem o nome.
  await page.goto('/painel');
  await expect(page.getByRole('region', { name: 'Senha chamada' })).toContainText(senha);
  await expect(page.locator('body')).not.toContainText('Carla');
});

test('CPF fora do cadastro: o totem explica o que fazer', async ({ page }) => {
  await page.goto('/totem');
  await page.getByLabel('Digite seu CPF').pressSequentially('00000000000');
  await page.getByRole('button', { name: 'Confirmar check-in' }).click();

  const alerta = page.getByRole('alert');
  await expect(alerta).toContainText('CPF não encontrado');
  await expect(alerta).toContainText('Confira os números ou procure a recepção.');
});
