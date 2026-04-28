export const Colors = {
  light: {
    // 莫兰迪色系 - 新拟态+毛玻璃风格
    textPrimary: "#5D5A58", // 温暖的深灰，替代纯黑
    textSecondary: "#8B8680", // 暖灰棕，柔和
    textDisabled: "#C4BEB6", // 禁用状态 - 更浅的灰
    textMuted: "#A8A098", // 浅暖灰，柔和不刺眼
    primary: "#B8860B", // 古铜金 - 非遗传统色
    accent: "#D4A574", // 暖金棕 - 辅助色
    success: "#7BA05B", // 橄榄绿 - 自然色
    error: "#C75B5B", // 柔和红 - 错误提示
    backgroundRoot: "#FFFCF5", // 古书纸色 - 温暖的米白
    backgroundDefault: "rgba(255, 255, 255, 0.7)", // 半透明白 - 毛玻璃效果
    backgroundTertiary: "rgba(232, 225, 216, 0.5)", // 半透明浅棕 - 去线留白
    buttonPrimaryText: "#FFFCF5", // 按钮文字
    tabIconSelected: "#B8860B", // Tab 选中色
    border: "rgba(184, 134, 11, 0.15)", // 半透明金边
    borderLight: "rgba(139, 134, 128, 0.1)", // 浅边框
    glass: "rgba(255, 252, 245, 0.85)", // 毛玻璃容器背景
    shadow: "rgba(69, 26, 3, 0.08)", // 柔和阴影
  },
  dark: {
    textPrimary: "#E8E3DC", // 暖白
    textSecondary: "#A8A098", // 暖灰
    textDisabled: "#6B6560", // 禁用状态 - 深灰
    textMuted: "#78716C", // 深灰
    primary: "#D4A574", // 暖金棕
    accent: "#B8860B", // 古铜金
    success: "#9CB47A", // 浅橄榄绿
    error: "#E87A7A", // 浅红
    backgroundRoot: "#1C1814", // 深古铜色背景
    backgroundDefault: "rgba(44, 39, 34, 0.7)", // 半透明深棕
    backgroundTertiary: "rgba(69, 61, 53, 0.5)", // 半透明深灰棕
    buttonPrimaryText: "#FFFCF5",
    tabIconSelected: "#D4A574",
    border: "rgba(212, 165, 116, 0.2)",
    borderLight: "rgba(168, 160, 152, 0.15)",
    glass: "rgba(44, 39, 34, 0.85)",
    shadow: "rgba(0, 0, 0, 0.3)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 112,
    lineHeight: 112,
    fontWeight: "200" as const,
    letterSpacing: -4,
  },
  displayLarge: {
    fontSize: 112,
    lineHeight: 112,
    fontWeight: "200" as const,
    letterSpacing: -2,
  },
  displayMedium: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "200" as const,
  },
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "300" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  smallMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  captionMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  labelSmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  labelTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  stat: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "300" as const,
  },
  tiny: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "400" as const,
  },
  navLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "500" as const,
  },
};

export type Theme = typeof Colors.light;
