// Maps snake_case DB rows to the camelCase shapes the frontend's
// TypeScript types (Wishlist / WishlistItem in App.tsx) expect.

export function serializeItem(row) {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    selectedImage: row.selected_image,
    availableImages: row.available_images ?? [],
    price: row.price === null ? null : Number(row.price),
    originalPrice: row.original_price === null ? null : Number(row.original_price),
    onSale: row.on_sale,
    salePercent: row.sale_percent === null ? null : Number(row.sale_percent),
    store: row.store,
    addedAt: row.added_at,
    notifyOnSale: row.notify_on_sale,
    priority: row.priority,
  };
}

export function serializeList(row, items) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    createdAt: row.created_at,
    items: items.map(serializeItem),
  };
}
