const normalizeValue = (value) => String(value ?? '').trim();

const getOptionLabel = (option = {}) => normalizeValue(option.label || option.name || option.size_label || option.size);

const getOptionId = (option = {}) => normalizeValue(option.id ?? option.size_id ?? option.value ?? option.size_option_id);

export const findSizeOption = (sizeOptions = [], selectedSize) => {
  if (!Array.isArray(sizeOptions) || sizeOptions.length === 0 || selectedSize === undefined || selectedSize === null || selectedSize === '') {
    return null;
  }

  if (typeof selectedSize === 'object') {
    const selectedId = normalizeValue(selectedSize.id ?? selectedSize.size_id ?? selectedSize.value ?? selectedSize.size_option_id);
    const selectedLabel = normalizeValue(selectedSize.label ?? selectedSize.name ?? selectedSize.size_label ?? selectedSize.size);

    return sizeOptions.find((opt) => {
      const optionId = getOptionId(opt);
      const optionLabel = getOptionLabel(opt);
      return (selectedId && optionId && optionId === selectedId) || (selectedLabel && optionLabel && optionLabel === selectedLabel);
    }) || null;
  }

  const normalizedSelectedSize = normalizeValue(selectedSize);
  return sizeOptions.find((opt) => {
    const optionId = getOptionId(opt);
    const optionLabel = getOptionLabel(opt);
    return (optionId && optionId === normalizedSelectedSize) || (optionLabel && optionLabel === normalizedSelectedSize);
  }) || null;
};

export const getSelectedSizeId = (item = {}) => {
  const directId = normalizeValue(
    item.selectedSizeId ||
    item.size_id ||
    item.selected_size_id ||
    item.sizeOptionId ||
    item.size_option_id ||
    item.product?.selectedSizeId ||
    item.product?.size_id ||
    item.product?.selected_size_id
  );

  if (directId) {
    return directId;
  }

  const selectedSize = item.selectedSize;
  if (selectedSize && typeof selectedSize === 'object') {
    return normalizeValue(selectedSize.id ?? selectedSize.size_id ?? selectedSize.value ?? selectedSize.size_option_id);
  }

  const sizeOptions = item.product?.size_options || item.size_options || [];
  const directLabel = normalizeValue(
    item.selectedSizeLabel ||
    item.size ||
    item.selected_size ||
    item.size_label ||
    item.product?.size ||
    item.product?.selected_size ||
    item.product?.size_label
  );
  const matchedOption = findSizeOption(sizeOptions, selectedSize || directLabel);
  return matchedOption ? getOptionId(matchedOption) : '';
};

export const getSelectedSizeLabel = (item = {}) => {
  if (item.selectedSizeLabel) {
    return normalizeValue(item.selectedSizeLabel);
  }

  const selectedSize = item.selectedSize;
  if (selectedSize && typeof selectedSize === 'object') {
    const objectLabel = normalizeValue(selectedSize.label || selectedSize.name || selectedSize.size_label || selectedSize.size);
    if (objectLabel) {
      return objectLabel;
    }
  }

  const directLabel = normalizeValue(
    item.size ||
    item.selected_size ||
    item.size_label ||
    item.product?.size ||
    item.product?.selected_size ||
    item.product?.size_label
  );
  if (directLabel) {
    return directLabel;
  }

  const sizeOptions = item.product?.size_options || item.size_options || [];
  const directId = normalizeValue(
    item.selectedSizeId ||
    item.size_id ||
    item.selected_size_id ||
    item.sizeOptionId ||
    item.size_option_id ||
    item.product?.selectedSizeId ||
    item.product?.size_id ||
    item.product?.selected_size_id
  );
  const matchedOption = findSizeOption(sizeOptions, selectedSize || directId);
  return matchedOption ? getOptionLabel(matchedOption) : null;
};

export const getSizePriceAdjustment = (sizeOptions = [], selectedSize) => {
  if (!Array.isArray(sizeOptions) || !selectedSize) return 0;

  const selectedOption = findSizeOption(sizeOptions, selectedSize);

  if (!selectedOption) return 0;

  if (selectedOption.price_adjustment !== undefined && selectedOption.price_adjustment !== null && selectedOption.price_adjustment !== '') {
    return Number(selectedOption.price_adjustment) || 0;
  }

  if (selectedOption.price !== undefined && selectedOption.price !== null && selectedOption.price !== '') {
    return Number(selectedOption.price) || 0;
  }

  return 0;
};