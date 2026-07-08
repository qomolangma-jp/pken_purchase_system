export const getSelectedSizeLabel = (item = {}) => {
  return (
    item.selectedSize ||
    item.size ||
    item.selected_size ||
    item.size_label ||
    item.product?.size ||
    item.product?.selected_size ||
    item.product?.size_label ||
    null
  );
};

export const getSizePriceAdjustment = (sizeOptions = [], selectedSize) => {
  if (!Array.isArray(sizeOptions) || !selectedSize) return 0;

  const normalizedSelectedSize = String(selectedSize).trim();
  const selectedOption = sizeOptions.find((opt) => String(opt?.label || '').trim() === normalizedSelectedSize);

  if (!selectedOption) return 0;

  if (selectedOption.price_adjustment !== undefined && selectedOption.price_adjustment !== null && selectedOption.price_adjustment !== '') {
    return Number(selectedOption.price_adjustment) || 0;
  }

  if (selectedOption.price !== undefined && selectedOption.price !== null && selectedOption.price !== '') {
    return Number(selectedOption.price) || 0;
  }

  return 0;
};