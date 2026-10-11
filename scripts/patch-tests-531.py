from pathlib import Path
root=Path(__file__).resolve().parent.parent
scripts=root/'scripts'
for p in scripts.glob('test-*.mjs'):
    s=p.read_text().replace("'5.3.0'","'5.3.1'").replace('version: "5.3.0"','version: "5.3.1"')
    s=s.replace("index.includes('Version 5.3')", "index.includes('Version <span data-ecosim-version>5.3.1</span>')")
    s=s.replace("html.includes('Version 5.3')", "html.includes('Version <span data-ecosim-version>5.3.1</span>')")
    s=s.replace("prov.includes('EcoSim France · v5.3 · paquet')", "prov.includes('EcoSim France · v<span data-ecosim-version>5.3.1</span> · paquet')")
    s=s.replace("file('provenance-politique.html').includes('v5.3')", "file('provenance-politique.html').includes('data-ecosim-version')")
    s=s.replace("(sitemap.match(/<lastmod>/g)||[]).length,13", "(sitemap.match(/<lastmod>/g)||[]).length,14")
    s=s.replace("prov.includes('Version 5.3 · registre généré')", "prov.includes('Version 5.3.1 · registre généré')")
    p.write_text(s)
p=root/'dist/provenance-politique.html';s=p.read_text();s=s.replace('Version 5.3 · registre généré','Version 5.3.1 · registre généré');p.write_text(s)
# Mettre à jour la version dans le registre lors d'une régénération future.
p=scripts/'export-provenance-420.mjs';s=p.read_text().replace('Version 5.3 · registre généré','Version 5.3.1 · registre généré').replace('EcoSim France · v5.3 · paquet','EcoSim France · v<span data-ecosim-version>5.3.1</span> · paquet')
p.write_text(s)
# Build version is part of the delivery metadata. Its JS script is deliberately excluded from package digest.
p=scripts/'stamp-build.mjs';s=p.read_text().replace('window.ECOSIM_BUILD_ID = "${id}";','window.ECOSIM_BUILD_ID = "${id}";\\nwindow.ECOSIM_VERSION = "5.3.1";').replace('Version 5.3 —','Version 5.3.1 —')
p.write_text(s)
p=scripts/'make-manifest-520.mjs';s=p.read_text().replace("'521','530'","'521','530','531'").replace('Manifeste 5.3 :','Manifeste 5.3.1 :');p.write_text(s)
