type MappingBase = {
  fieldOpid: string;
  memoryId: string | null;
  value: string | null;
  confidence: number;
  reasoning: string;
  alternativeMatches: unknown;
  autoFill: boolean;
};

export const createEmptyMapping = <
  TField extends { opid: string },
  TMapping extends MappingBase,
>(
  field: TField,
  reason: string,
  overrides?: Omit<Partial<TMapping>, "fieldOpid">,
): TMapping => {
  const base: MappingBase = {
    fieldOpid: field.opid,
    memoryId: null,
    value: null,
    confidence: 0,
    reasoning: reason,
    alternativeMatches: [] as TMapping["alternativeMatches"],
    autoFill: false,
  };

  return {
    ...base,
    ...(overrides ?? {}),
    fieldOpid: field.opid,
  } as TMapping;
};

export const roundConfidence = (value: number): number =>
  Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
