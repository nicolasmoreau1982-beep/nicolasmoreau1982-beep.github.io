"""EcoSim 5.8.3 : vérification Chromium locale des parcours, sans réseau ni capture réelle mobile.
Ne remplace pas axe, Lighthouse ou un test sur téléphone physique.
"""
import asyncio,pathlib,re
from playwright.async_api import async_playwright
DIST=pathlib.Path(__file__).resolve().parent.parent/'dist'
SCRIPTS=['theme.js','data.js','history.js','insee-projection.js','fiscal.js','sectoral-observations.js','sectoral.js','quality-500.js','build-info.js','guardrails-510.js','political-profiles-530.js','app.js','workforce-ux-582.js','distribution-link-580.js','ux-parcours-583.js','glossary-520.js']
async def load(browser,width,height):
 page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 html=re.sub(r'<script\s+src="[^"]+"\s*></script>','',(DIST/'index.html').read_text())
 await page.set_content(html,wait_until='domcontentloaded',timeout=30000)
 for css in ['styles.css','workforce-ux-582.css','ux-parcours-583.css']:
  await page.add_style_tag(content=(DIST/css).read_text())
 for js in SCRIPTS:
  await page.add_script_tag(content=(DIST/js).read_text())
 await page.wait_for_timeout(250)
 return page,errors
async def test(page,errors,mobile=False):
 assert await page.locator('#structural').evaluate('(n)=>n.hidden')
 assert await page.locator('#politics').evaluate('(n)=>!n.hidden')
 assert await page.locator('#ux-discovery').get_attribute('aria-pressed')=='true'
 assert not await page.locator('.hero .current-version-531').count()
 assert await page.locator('footer .current-version-531').count()==1
 assert await page.locator('.journey-inner [data-scroll]').count()==7
 assert await page.locator('.ux-methodology-details').count()==1
 assert await page.locator('#ux-mode-status').inner_text()
 assert await page.locator('#workforce-detail .workforce-panel-wide').count()>0
 # Trigger auto-opening of advanced section by sticky jump
 await page.locator('.journey-inner [data-scroll="structural"]').click(force=True)
 await page.wait_for_timeout(200)
 assert not await page.locator('#structural').evaluate('(n)=>n.hidden')
 assert await page.locator('#ux-expert').get_attribute('aria-pressed')=='true'
 assert await page.locator('#workforce-detail a.ux-glossary-link[href="glossaire.html#millesime"]').count()>0
 assert await page.locator('#workforce-detail a.ux-glossary-link[href="glossaire.html#soldes-recales"]').count()>0
 await page.locator('#ux-discovery').click()
 assert await page.locator('#structural').evaluate('(n)=>n.hidden')
 await page.locator('#v52-summary summary').click(force=True)
 await page.locator('#v52-summary a[href="#budget"]').click(force=True)
 assert not await page.locator('#budget').evaluate('(n)=>n.hidden')
 assert await page.locator('#ux-expert').get_attribute('aria-pressed')=='true'
 await page.locator('#ux-discovery').click()
 assert await page.locator('#budget').evaluate('(n)=>n.hidden')
 # A direct deep-link must not strand the user in a hidden section.
 await page.evaluate("location.hash='#structural-outcomes'")
 await page.wait_for_timeout(200)
 assert not await page.locator('#structural').evaluate('(n)=>n.hidden')
 await page.locator('[data-glossary="projection"]').first.click(force=True)
 assert await page.locator('#v52-glossary-dialog').evaluate('(el)=>el.open')
 await page.keyboard.press('Escape')
 assert not await page.locator('#v52-glossary-dialog').evaluate('(el)=>el.open')
 assert not errors,errors[:4]
 if mobile:
  width=await page.evaluate('({page:document.documentElement.scrollWidth, viewport:innerWidth})')
  assert width['page']<=width['viewport']+20,width
 print(('MOBILE' if mobile else 'DESKTOP')+': lecture, raccourcis, URL directe, glossaire, sans erreur JS OK')
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for width,height,suffix in [(1365,850,'desktop'),(375,812,'mobile')]:
   page,errors=await load(browser,width,height)
   await page.screenshot(path=str(DIST.parent/('capture-583-'+suffix+'.png')),full_page=False)
   try:await test(page,errors,width<760)
   finally:await page.close()
  await browser.close()
if __name__=='__main__':asyncio.run(main())
