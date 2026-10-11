"""Tests Chromium du module 5.8 par véritable serveur HTTP local (modules ESM)."""
import asyncio
import re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent/'dist'
async def prepare(page):
    html=(ROOT/'distribution-ciblee-580.html').read_text()
    html=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>','',html)
    html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>','',html)
    css='\n'.join((ROOT/x).read_text() for x in ['styles.css','guides.css','distribution-ciblee-580.css'])
    html=html.replace('</head>','<style>'+css+'</style></head>')
    await page.set_content(html)
    await page.add_script_tag(content=(ROOT/'fiscal-individuel-570.js').read_text())
    model=(ROOT/'model-distribution-580.mjs').read_text().replace('export function','function')
    model581=(ROOT/'model-distribution-581.mjs').read_text().replace('export function','function').replace('export const','const')
    ui=(ROOT/'distribution-ciblee-580.mjs').read_text()
    ui=ui.replace("import {simulateSmic,simulatePensionAllowance} from './model-distribution-580.mjs';",'')
    ui=ui.replace("import {loadWorkersCsv,loadHouseholdsCsv,checkedProvenance,diagnoseWeights,summarizeWageDistribution,summarizePensionDistribution,aggregatedExport} from './model-distribution-581.mjs';",'')
    await page.add_script_tag(type='module',content=model+'\n'+model581+'\n'+ui)
    await page.locator('#s-workers tr').first.wait_for(state='attached')
    await page.locator('#smic details summary').click()
    await page.locator('#pensions details summary').click()
async def check(page):
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    await prepare(page)
    assert await page.locator('#s-workers tr').count()==6
    assert await page.locator('#p-households tr').count()==4
    assert await page.locator('h1').count()==1
    await page.locator('#s-rise').fill('10')
    await page.locator('#smic-form button[type=submit]').click()
    output=await page.locator('#s-metrics').inner_text()
    assert '2 / 6' in output,output
    assert await page.locator('#s-detail tr').count()==6
    await page.locator('#s-spill').fill('0.35')
    await page.locator('#smic-form button[type=submit]').click()
    output=await page.locator('#s-metrics').inner_text()
    assert '4' in output,output
    # Susceptible: diffusion affects 4 profils beyond new SMIC.
    await page.locator('#p-form button[type=submit]').click()
    assert await page.locator('#p-detail tr').count()==4, str(await page.evaluate('({valid:document.querySelector("#p-form").checkValidity(),html:document.querySelector("#p-detail").innerHTML,invalid:[...document.querySelectorAll("#p-form :invalid")].map(e=>e.outerHTML),error:document.querySelector("#p-error").textContent,hidden:document.querySelector("#p-results").hidden})'))
    out=await page.locator('#p-metrics').inner_text()
    assert 'Échantillon fictif' in out,out
    await page.locator('#p-mode').select_option('cap_above_rfr')
    assert await page.locator('#p-width-label').is_hidden()
    assert await page.locator('#p-cap-label').is_visible()
    await page.locator('#p-form button[type=submit]').click()
    assert await page.locator('#p-detail tr').count()==4
    await page.locator('#p-target').select_option('pensions_total')
    assert 'pensions totales' in await page.locator('#p-threshold-name').inner_text()
    await page.locator('#p-mode').select_option('remove_above_rfr')
    assert await page.locator('#p-width-label').is_hidden()
    await page.locator('#p-form button[type=submit]').click()
    assert await page.locator('#p-detail tr').count()==4
    # Erreur si base salariale sous l'ancien SMIC, au lieu de compter une hausse fictive.
    await page.locator('#s-workers tr').first.locator('[data-field=ratio]').fill('.8')
    await page.locator('#smic-form button[type=submit]').click()
    assert 'sous le SMIC initial' in await page.locator('#s-error').inner_text()
    assert await page.locator('#s-results').is_hidden()
    # Le visiteur ne doit pas avoir besoin d'ouvrir un panneau caché pour comprendre les limites.
    assert await page.get_by_text('aucun chiffrage national',exact=False).count()>0
    overflow=await page.evaluate('document.documentElement.scrollWidth>window.innerWidth+1')
    assert not overflow,'Débordement mobile'
    assert not errors,errors
async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        try:
            for width,height in ((1365,850),(375,812)):
                page=await browser.new_page(viewport={'width':width,'height':height},accept_downloads=True)
                await check(page)
                await page.close()
                print('CHROMIUM 5.8 OK :',width,'px, salaires/pensions, paramètres et erreurs')
            main=(ROOT/'index.html').read_text()
            assert 'id="smic-distribution-link"' in main
            assert 'distribution-ciblee-580.html' in main
            print('INTÉGRATION 5.8 OK : lien accueil et moteur ancien inchangé')
        finally:
            await browser.close()
if __name__=='__main__': asyncio.run(main())
