export function visibleProducts(products = [], sharedCatalogueEnabled = true) {
  if (sharedCatalogueEnabled) return products;
  return products.filter((product) => !product.catalogue);
}
