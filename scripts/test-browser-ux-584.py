"""Tests navigateur sans requête réseau : le HTML/CSS/JS du build est injecté en mémoire.

Pré-requis local (pas de dépendance CI) : playwright + navigateur Chromium installé.
Contrairement à un audit axe/RGAA, il couvre rendu, parcours et noms accessibles.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
import os

ROOT = Path(__file__).resolve().parent.parent / "dist"


def document_inlined():
    content = (ROOT / "index.html").read_text(encoding="utf-8")

    def stylesheet(match):
        path = ROOT / match[1]
        return "<style>" + path.read_text(encoding="utf-8").replace("</style>", "<\\/style>") + "</style>" if path.is_file() else ""

    def script(match):
        path = ROOT / match[1]
        return "<script>" + path.read_text(encoding="utf-8").replace("</script>", "<\\/script>") + "</script>" if path.is_file() else ""

    content = re.sub(r'<link rel="stylesheet" href="([^"]+)"\s*/>', stylesheet, content)
    return re.sub(r'<script src="([^"]+)"></script>', script, content)


def test_page(browser, html, width):
    page = browser.new_page(viewport={"width": width, "height": 844 if width < 600 else 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.set_content(html, wait_until="domcontentloaded", timeout=45000)
    assert not errors, errors
    assert page.locator("#ux-discovery").get_attribute("aria-pressed") == "true"
    assert page.locator("#structural").evaluate("e => e.hidden")
    assert page.locator(".journey-bar").evaluate("e => getComputedStyle(e).position") == "sticky"
    assert page.evaluate("document.documentElement.scrollWidth - window.innerWidth") <= 1
    page.evaluate("window.scrollTo(0, 1200)")
    topbar_height = page.locator(".topbar").evaluate("e => e.getBoundingClientRect().height")
    assert abs(page.locator(".journey-bar").evaluate("e => e.getBoundingClientRect().top") - topbar_height) < 1
    energy = page.locator("#story-reasons .story-reason").filter(has=page.locator('i:text-is("ENE")'))
    assert "variation inférieure à 0,05 Md€" in energy.inner_text()
    assert "Émissions : aucune variation calculée" in energy.inner_text()
    result = page.locator("#structural-outcomes .structural-outcome")
    assert "Inchangé" in result.filter(has=page.locator('small:text-is("Facture énergétique")')).inner_text()
    assert "Inchangé" in result.filter(has=page.locator('small:text-is("Émissions")')).inner_text()
    page.locator('[data-horizon="10"]').first.click()
    assert "à 10 ans" in page.locator("#story-horizon").inner_text()
    assert "Facture énergétique :" in energy.inner_text()
    page.evaluate('document.querySelector(\'a[href="#structural"]\').click()')
    assert not page.locator("#structural").evaluate("e => e.hidden")
    assert page.locator("#ux-expert").get_attribute("aria-pressed") == "true"
    # Inspecter les noms calculés par Chromium ; test heuristique, pas une certification.
    cdp = page.context.new_cdp_session(page)
    nodes = cdp.send("Accessibility.getFullAXTree")["nodes"]
    roles = {"button", "link", "textbox", "combobox", "slider", "spinbutton", "checkbox", "radio", "switch", "searchbox"}
    controls = [node for node in nodes if not node.get("ignored") and node.get("role", {}).get("value") in roles]
    missing = [node for node in controls if not node.get("name", {}).get("value", "").strip()]
    assert not missing, f"Contrôles sans nom accessible : {[n.get('backendDOMNodeId') for n in missing]}"
    print(f"UX browser {width}px OK : pas de débordement global, sticky, énergie, navigation, {len(controls)} noms accessibles")
    page.close()


if __name__ == "__main__":
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROMIUM_EXECUTABLE", "/usr/bin/chromium"), args=["--no-sandbox"])
        html = document_inlined()
        for width in (1350, 390):
            test_page(browser, html, width)
        browser.close()
