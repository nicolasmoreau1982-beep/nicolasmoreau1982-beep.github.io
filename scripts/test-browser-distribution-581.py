"""Chromium : import CSV local 5.8.1, calcul, confidentialité exports et retour aux profils."""
import asyncio
import json
from pathlib import Path
import importlib.util
_spec=importlib.util.spec_from_file_location("browser580",Path(__file__).with_name("test-browser-distribution-580.py"))
_old=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_old)
ROOT,prepare=_old.ROOT,_old.prepare
from playwright.async_api import async_playwright

async def scenario(page):
    await prepare(page)
    await page.locator('#s-csv-source').fill('Jeu fictif de validation EcoSim')
    await page.locator('#s-csv-year').fill('2026')
    await page.locator('#s-csv-scope').fill('Salariés artificiels sans représentativité : tests sans données individuelles réelles.')
    await page.locator('#s-csv-file').set_input_files(str(ROOT/'examples/distribution-salaires-581-exemple.csv'))
    await page.locator('#s-import').click()
    await page.wait_for_function('document.querySelector("#s-import-status").textContent.includes("5 lignes locales chargées")')
    assert '5 lignes locales chargées' in await page.locator('#s-import-status').inner_text(), await page.locator('#s-import-status').inner_text()
    assert await page.locator('#s-example-details').is_hidden()
    await page.locator('#smic-form button[type=submit]').click()
    assert await page.locator('#s-strata').is_visible()
    assert await page.locator('#s-individual-wrap').is_hidden()
    assert 'taille effective de Kish' in (await page.locator('#s-strata').inner_text())
    async with page.expect_download() as info:
        await page.locator('#s-export').click()
    data=json.loads((await (await info.value).path()).read_text())
    assert data['status']=='REPRESENTATIVITE_NON_ETABLIE',data['status']
    assert not any(k in data for k in ('rows','workers','input','aggregateSampleOnly'))
    assert all(g.get('suppressed',False) for g in data['groups'] if g['observations']<5)
    await page.locator('#s-examples').click()
    assert await page.locator('#s-example-details').is_visible()
    await page.locator('#smic-form button[type=submit]').click()
    assert await page.locator('#s-detail tr').count()==6

    await page.locator('#p-csv-source').fill('Foyers fictifs de validation')
    await page.locator('#p-csv-year').fill('2025')
    await page.locator('#p-csv-scope').fill('Foyers artificiels pour vérification, sans confidentialité réelle ni extrapolation.')
    await page.locator('#p-csv-file').set_input_files(str(ROOT/'examples/distribution-foyers-581-exemple.csv'))
    await page.locator('#p-import').click()
    await page.wait_for_function('document.querySelector("#p-import-status").textContent.includes("4 lignes locales chargées")')
    assert '4 lignes locales chargées' in await page.locator('#p-import-status').inner_text(),await page.locator('#p-import-status').inner_text()
    await page.locator('#p-form button[type=submit]').click()
    assert await page.locator('#p-strata').is_visible()
    assert await page.locator('#p-individual-wrap').is_hidden()
    async with page.expect_download() as info:
        await page.locator('#p-export').click()
    data=json.loads((await (await info.value).path()).read_text())
    assert data['status']=='REPRESENTATIVITE_NON_ETABLIE'
    assert 'F01' not in json.dumps(data)
    assert not any(k in data for k in ('rows','households','input','aggregateSampleOnly'))
    await page.locator('#p-examples').click()
    await page.locator('#p-form button[type=submit]').click()
    assert await page.locator('#p-detail tr').count()==4
    assert not await page.evaluate('document.documentElement.scrollWidth>window.innerWidth+1')

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        try:
            for width,height in ((1365,850),(375,812)):
                page=await browser.new_page(viewport={'width':width,'height':height},accept_downloads=True)
                await scenario(page)
                print('CHROMIUM 5.8.1 OK :',width,'px, CSV local, diagnostic, export masqué, restauration')
                await page.close()
        finally:
            await browser.close()
if __name__=='__main__':asyncio.run(main())
