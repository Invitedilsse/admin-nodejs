export const removeEmptyObject = (value) => {
  if (value && typeof value === "object" && Object.keys(value).length === 0) {
    return undefined;
  }
  return value;
};

export const removeArrayEmptyValues = (value) => {
  const cleaned = value.filter((item) => {
    if (!item) return false;
    return item;
  });

  return cleaned.length === 0 ? undefined : cleaned;
};
