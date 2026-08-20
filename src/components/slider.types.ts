export type SliderProps = {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (next: number) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  formatValue?: (value: number) => string;
};
