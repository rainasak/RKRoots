let counter = 0;

export const v4 = (): string => {
  counter++;
  return `mock-uuid-${counter}`;
};

export const v1 = (): string => {
  counter++;
  return `mock-uuid-v1-${counter}`;
};

export default { v4, v1 };
