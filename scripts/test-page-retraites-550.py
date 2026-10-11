"""Contrôle Chromium direct sans serveur; tests visuels élémentaires, pas audit WCAG."""
import asyncio,pathlib,re
from playwright.async_api import async_playwright
D=pathlib.Path(__file__).resolve().parent.parent/'dist'
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (1365,375):
   page=await b.new_page(viewport={'width':width,'height':812})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   html=(D/'retraites-cohortes-550.html').read_text()
   html=re.sub(r'<script[^>]*></script>','',html)
   await page.set_content(html)
   await page.add_style_tag(content=(D/'styles.css').read_text())
   await page.add_style_tag(content=(D/'guides.css').read_text())
   assert await page.locator('h1').count()==1
   assert await page.locator('table').count()==2
   assert await page.locator('tbody tr').count()==16
   assert not errors,errors
   dims=await page.evaluate('({w:innerWidth,sw:document.documentElement.scrollWidth})')
   assert dims['sw']<=dims['w']+2,dims
   print('PAGE RETRAITES 5.5 OK :',width,'px, sans JS, 2 tableaux, pas de débordement')
   await page.close()
  await b.close()
asyncio.run(main())
