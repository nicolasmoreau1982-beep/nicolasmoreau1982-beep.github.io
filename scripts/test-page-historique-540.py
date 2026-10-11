"""Test de rendu de la page de recherche 5.4 sans JavaScript (pas un audit WCAG)."""
import asyncio,pathlib,re
from playwright.async_api import async_playwright
DIST=pathlib.Path(__file__).resolve().parent.parent/'dist'
async def test():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in [1365,375]:
   page=await browser.new_page(viewport={'width':width,'height':812})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   html=(DIST/'validation-historique-540.html').read_text()
   html=re.sub(r'<script\s+src="[^"]+"\s*defer></script>','',html)
   html=re.sub(r'<script\s+src="[^"]+"></script>','',html)
   await page.set_content(html)
   await page.add_style_tag(content=(DIST/'styles.css').read_text())
   await page.add_style_tag(content=(DIST/'guides.css').read_text())
   assert await page.locator('h1').count()==1
   assert await page.locator('table').count()==2
   assert await page.locator('a[href="validation/tva-540-comparaison.json"]').count()==1
   assert await page.locator('a[href="validation/golden-531-for-540.json"]').count()==1
   assert '-11,789' in await page.locator('main').inner_text()
   dims=await page.evaluate('({w:innerWidth,sw:document.documentElement.scrollWidth})')
   assert dims['sw']<=dims['w']+2,dims
   assert errors==[],errors
   print('PAGE HISTORIQUE 5.4 OK :',width,'px ; sans JS ; 2 tableaux ; pas de débordement')
   await page.close()
  await browser.close()
asyncio.run(test())
