"""Essai UI Chromium hors réseau ; ne certifie pas un audit axe/RGAA."""
import asyncio
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('ecosim_browser520', Path(__file__).with_name('test-browser-520.py'))
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
load_page=module.load_page
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        for width,height in [(1365,850),(375,812)]:
            page,errors,_=await load_page(browser,width,height)
            try:
                # Le test de base ne charge pas notre extension : vérifier le chargement après app.js.
                from pathlib import Path
                dist=Path(__file__).parent.parent/'dist'
                await page.add_style_tag(content=(dist/'workforce-ux-582.css').read_text())
                await page.add_script_tag(content=(dist/'workforce-ux-582.js').read_text())
                first=page.locator('#workforce-detail .workforce-panel-wide .public-mission-grid .workforce-row').first
                assert await first.locator(':scope > strong').inner_text() == 'Inchangé'
                text=await first.inner_text()
                assert '200,0 k de référence' in text,text
                assert 'retraités supplémentaires 0,0 k' not in text
                intro=await page.locator('#workforce-detail .workforce-panel-wide > p').first.inner_text()
                assert 'Aucun recrutement supplémentaire demandé' in intro,intro
                assert await page.locator('#workforce-detail .workforce-ux-zero').count() == 15
                assert 'Effectifs publics inchangés' in await page.locator('.workforce-ux-legend').inner_text()
                category = page.locator('.public-summary-grid .workforce-row').filter(has_text='Catégorie A').first
                assert await category.locator(':scope > strong').get_attribute('aria-label') is None
                aria=await first.locator(':scope > strong').get_attribute('aria-label')
                assert 'aucun écart' in aria,aria
                assert await page.locator('.workforce-ux-legend').count()==1
                # Vrai recalcul du simulateur via changement d'horizon.
                await page.locator('[data-horizon="5"]').click()
                await page.wait_for_function("document.querySelector('.workforce-ux-legend')?.textContent.includes('2030')")
                assert await first.locator(':scope > strong').inner_text() == 'Inchangé'
                # Emuler aussi une projection avec petits écarts positifs et négatifs.
                await page.evaluate('''() => {
                  document.querySelector('#workforce-detail').innerHTML = `
                  <article class="workforce-panel workforce-panel-wide">
                    <h3>Armées, sécurité, justice et services publics</h3>
                    <p>Effectifs de référence. À droite : écart d’agents en activité au 2030. Recrutements réalisables cette année : 1,0 k sur 2,0 k demandés.</p>
                    <div class="public-mission-grid">
                      <div class="workforce-row"><span><strong>ARM · Militaires</strong><small>200,0 k de référence · retraités supplémentaires +0,0 k</small></span><strong class="positive">+0,0 k</strong></div>
                      <div class="workforce-row"><span><strong>POL · Police</strong><small>152,2 k de référence · retraités supplémentaires −0,0 k</small></span><strong class="negative">−0,0 k</strong></div>
                      <div class="workforce-row"><span><strong>GEN · Gendarmerie</strong><small>101,7 k de référence · retraités supplémentaires +1,4 k</small></span><strong class="positive">+1,4 k</strong></div>
                      <div class="workforce-row"><span><strong>JUD · Justice</strong><small>37,3 k de référence · retraités supplémentaires 0,0 k</small></span><strong>0,0 k</strong></div>
                    </div>
                    <div class="public-summary-grid"><div class="workforce-row"><span><strong>FPE</strong><small>2,6 M observés</small></span><strong>0,0 k</strong></div></div>
                  </article>`;
                }''')
                await page.wait_for_function("document.querySelector('#workforce-detail .workforce-ux-legend') !== null")
                values=await page.locator('#workforce-detail .public-mission-grid .workforce-row > strong').all_inner_texts()
                assert values == ['Hausse de moins de 50 agents','Baisse de moins de 50 agents','+1,4 k','Inchangé'],values
                new_intro=await page.locator('#workforce-detail .workforce-panel-wide > p').first.inner_text()
                assert '1,0 k réalisables sur 2,0 k demandés' in new_intro,new_intro
                msg=await page.locator('#workforce-detail .public-mission-grid .workforce-row').nth(2).inner_text()
                assert 'écart de retraités : +1,4 k' in msg,msg
                assert await page.locator('.workforce-ux-legend').count()==1
                assert not errors,errors
                print('CHROMIUM UX EFFECTIFS OK:',width,'px, référence, zéro, petits écarts ±, légende, rerendu')
            finally:
                await page.close()
        await browser.close()
if __name__=='__main__': asyncio.run(main())
