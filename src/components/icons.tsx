import Svg, { Circle, Path } from "react-native-svg";

type IconProps = {
  color: string;
  size?: number;
};

export function SearchIcon({ color, size = 13 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Circle cx={6} cy={6} r={4.6} fill="none" stroke={color} strokeWidth={1.5} />
      <Path d="M9.6 9.6 13 13" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function SlidersIcon({ color, size = 15 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M1 4h14M4 8h8M6.5 12h3" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function DiamondIcon({ color, size = 11 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Path d="M6 0.5 11.5 6 6 11.5 0.5 6z" fill={color} />
    </Svg>
  );
}

export function HeartIcon({ color, size = 14, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path
        d="M8 14S1.5 10 1.5 5.8A3.8 3.8 0 0 1 8 3.2a3.8 3.8 0 0 1 6.5 2.6C14.5 10 8 14 8 14z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={1.4}
      />
    </Svg>
  );
}

export function ChevronLeftIcon({ color, size = 17 }: IconProps) {
  return (
    <Svg width={size * 0.6} height={size} viewBox="0 0 8 14">
      <Path d="M7 1 1 7l6 6" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ArrowUpIcon({ color, size = 17 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M8 13.5V3M8 3 3.5 7.5M8 3l4.5 4.5" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CloseIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

export function PencilIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path
        d="M11.2 1.9 14.1 4.8 5.4 13.5 1.9 14.1 2.5 10.6z"
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
