export interface FieldMeta {
  id: string;
  description?: string | undefined;
  error?: string | undefined;
}

/** Ids and aria wiring shared by every form field component. */
export function fieldIds({ id, description, error }: FieldMeta) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = `${id}-error`;
  const describedby = [descriptionId, errorId].filter(Boolean).join(" ");
  return {
    descriptionId,
    errorId,
    describedby,
    invalid: error ? ("true" as const) : undefined,
  };
}
