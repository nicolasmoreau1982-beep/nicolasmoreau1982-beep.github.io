// Applique le thème avant le rendu des trois pages, sans dépendance réseau.
try {
  const theme = localStorage.getItem("ecosim-theme");
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
} catch {
  // Le site reste utilisable si le stockage local est indisponible.
}
