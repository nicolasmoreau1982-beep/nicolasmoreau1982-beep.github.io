"""Browser smoke test via in-memory HTML/CSS/JS (no local HTTP requests).
Load order mimics index.html, excluding analytics network and theme persistence.
Requires chromium + Python playwright. This is NOT a Lighthouse or full WCAG test.
"""
import asyncio, pathlib, re, time
from playwright.async_api import async_playwright

DIST=pathlib.Path(__file__).resolve().parent.parent/'dist'
SCRIPTS=['theme.js','data.js','history.js','insee-projection.js','fiscal.js','sectoral-observations.js','sectoral.js','quality-500.js','build-info.js','guardrails-510.js','political-profiles-530.js','app.js','glossary-520.js']
async def load_page(browser,width,height):
    page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    html=(DIST/'index.html').read_text()
    # Inline scripts are injected explicitly. External resources are not requested.
    html=re.sub(r'<script\s+src="[^"]+"\s*></script>','',html)
    await page.set_content(html,wait_until='domcontentloaded',timeout=20000)
    await page.add_style_tag(content=(DIST/'styles.css').read_text())
    start=time.perf_counter()
    for name in SCRIPTS:
        await page.add_script_tag(content=(DIST/name).read_text())
    elapsed=round((time.perf_counter()-start)*1000)
    return page,errors,elapsed

async def main():
 async with async_playwright() as pw:
    browser=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page,errors,elapsed=await load_page(browser,1365,850)
    await page.screenshot(path=str(DIST.parent/'capture-bureau-520.png'),full_page=False)
    try:
        assert await page.locator('#v52-summary').evaluate('(el)=>el.open')
        assert await page.locator('footer').inner_text() and 'Version 5.3' in await page.locator('footer').inner_text()
        await page.locator('[data-glossary="projection"]').click()
        assert await page.locator('#v52-glossary-dialog').evaluate('(el)=>el.open')
        assert 'Projection conditionnelle' in await page.locator('#v52-glossary-title').inner_text()
        await page.keyboard.press('Escape')
        assert not await page.locator('#v52-glossary-dialog').evaluate('(el)=>el.open')
        print('BUREAU: initialisation et dialogue OK ; injection séquentielle JS:',elapsed,'ms (indicatif, sans réseau)')
        assert not errors,errors[:3]
    finally:
        await page.close()
    mobile,errors,elapsed=await load_page(browser,375,812)
    await mobile.screenshot(path=str(DIST.parent/'capture-mobile-520.png'),full_page=False)
    try:
        assert not await mobile.locator('#v52-summary').evaluate('(el)=>el.open')
        await mobile.locator('#v52-summary summary').click()
        assert await mobile.locator('#v52-summary').evaluate('(el)=>el.open')
        await mobile.locator('#mobile-nav-toggle').click()
        assert await mobile.locator('#mobile-nav-toggle').get_attribute('aria-expanded')=='true'
        await mobile.keyboard.press('Escape')
        assert await mobile.locator('#mobile-nav-toggle').get_attribute('aria-expanded')=='false'
        sizes=await mobile.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
        print('MOBILE: sommaire, menu clavier OK ; viewport/scroll=',sizes)
        assert not errors,errors[:3]
    finally:
        await mobile.close()
    await browser.close()
if __name__ == "__main__":
 asyncio.run(main())
