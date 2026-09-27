import { ProductItem, StoreCategoryItem } from '../types';

/**
 * Checks if a given product belongs to a specific store category item.
 * Evaluates slug, exact Arabic/English names, category id, and standard scholarly fallbacks.
 */
export function productMatchesCategory(product: ProductItem, category: StoreCategoryItem): boolean {
  if (!product || !category) return false;

  const prodCat = (product.category || '').toLowerCase().trim();
  const slug = (category.slug || '').toLowerCase().trim();
  const nameAr = (category.nameAr || '').toLowerCase().trim();
  const nameEn = (category.nameEn || '').toLowerCase().trim();
  const catId = (category.id || '').toLowerCase().trim();

  // 1. Direct match with product's assigned category
  if (prodCat) {
    if (prodCat === slug || prodCat === nameAr || prodCat === nameEn || prodCat === catId) {
      return true;
    }
  }

  // 2. Keyword & semantic fallbacks for Books & Monographs
  if (slug === 'books' || slug.includes('book') || nameAr.includes('كتاب') || nameAr.includes('كتب') || nameAr.includes('مؤلف')) {
    if (
      product.type === 'physical' || 
      prodCat.includes('كتاب') || 
      prodCat.includes('كتب') || 
      prodCat.includes('مؤلف') || 
      prodCat.includes('book') || 
      prodCat.includes('monograph')
    ) {
      return true;
    }
  }

  // 3. Keyword fallbacks for Documentaries & Visual Media
  if (slug === 'media' || slug.includes('media') || slug.includes('video') || nameAr.includes('مرئي') || nameAr.includes('وثائقي')) {
    if (
      (product.type === 'digital' || !product.type) && 
      (prodCat.includes('وثائقي') || prodCat.includes('مرئي') || prodCat.includes('فيديو') || prodCat.includes('media') || prodCat.includes('video'))
    ) {
      return true;
    }
  }

  // 4. Keyword fallbacks for Academic Research Papers
  if (slug === 'research' || slug.includes('research') || nameAr.includes('بحث') || nameAr.includes('دراسة')) {
    if (
      prodCat.includes('بحث') || 
      prodCat.includes('دراسة') || 
      prodCat.includes('أبحاث') || 
      prodCat.includes('paper') || 
      prodCat.includes('research')
    ) {
      return true;
    }
  }

  // 5. Keyword fallbacks for Consultations, Advisory & Lectures
  if (slug === 'consultations' || slug.includes('advisory') || slug.includes('service') || nameAr.includes('استشار') || nameAr.includes('محاضر')) {
    if (
      product.type === 'service' || 
      prodCat.includes('استشار') || 
      prodCat.includes('محاضر') || 
      prodCat.includes('خدمة') || 
      prodCat.includes('advisory') || 
      prodCat.includes('lecture')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Filters a list of products to those matching a category item.
 * Excludes archived or unpublished items.
 */
export function getProductsForCategory(
  products: ProductItem[] = [], 
  category: StoreCategoryItem,
  includeAllStatus: boolean = false
): ProductItem[] {
  if (!products || !category) return [];
  return products.filter(p => {
    if (!p) return false;
    if (!includeAllStatus) {
      if (p.isArchived || p.status === 'archived') return false;
      if (p.status !== 'published') return false;
    }
    return productMatchesCategory(p, category);
  });
}
