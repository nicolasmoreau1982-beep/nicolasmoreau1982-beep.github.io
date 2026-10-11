"""Test navigateur réel local, sans serveur, pour le nouvel atelier fiscal 5.7."""
import asyncio
import re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
async def main():
  async with async_playwright() as p:
    browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    try:
      for width,height in [(1365,850),(375,812)]:
        page=await browser.new_page(viewport={'width':width,'height':height})
        errs=[]
        page.on('pageerror',lambda exc:errs.append(str(exc)))
        html=(ROOT/'dist/fiscal-individuel-570.html').read_text()
        html=re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>','',html)
        html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>','',html)
        css=(ROOT/'dist/styles.css').read_text()+'\n'+(ROOT/'dist/guides.css').read_text()
        html=html.replace('</head>','<style>'+css+'</style></head>')
        await page.set_content(html)
        await page.add_script_tag(content=(ROOT/'dist/fiscal-individuel-570.js').read_text())
        await page.locator('#tax570-income').fill('30000')
        await page.get_by_role('button',name='Calculer').click()
        assert '2\u202f103,99' in (await page.locator('#tax570-output').inner_text()) or '2 103,99' in (await page.locator('#tax570-output').inner_text())
        await page.locator('#tax570-income').fill('17370')
        await page.get_by_role('button',name='Calculer').click()
        assert '24,90' in (await page.locator('#tax570-output').inner_text()) or '24,91' in (await page.locator('#tax570-output').inner_text())
        await page.locator('#tax570-type').select_option('couple')
        await page.locator('#tax570-income').fill('34200')
        await page.get_by_role('button',name='Calculer').click()
        assert '274,53' in (await page.locator('#tax570-output').inner_text())
        overflow=await page.evaluate('document.documentElement.scrollWidth > innerWidth+1')
        assert not overflow,f'Overflow {width}px'
        assert not errs,errs
        print('CHROMIUM fiscal 5.7 OK :',width,'px ; IR, décote, sans overflow')
        await page.close()
    finally:
      await browser.close()
asyncio.run(main())
