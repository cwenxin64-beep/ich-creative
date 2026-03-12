import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing["3xl"],
      paddingBottom: Spacing["5xl"],
    },
    header: {
      marginBottom: Spacing["3xl"],
      alignItems: 'center',
    },
    subtitle: {
      marginTop: Spacing.sm,
      textAlign: 'center',
    },
    featuresGrid: {
      gap: Spacing.lg,
    },
    featureCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      borderRadius: BorderRadius["2xl"],
      // 毛玻璃效果和柔和阴影
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 8,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: BorderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      marginBottom: Spacing.xs / 2,
    },
    featureSubtitle: {
      marginBottom: Spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    featureDescription: {
      lineHeight: 18,
    },
    arrowIcon: {
      marginLeft: Spacing.sm,
    },
    favoritesButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      borderRadius: BorderRadius["2xl"],
      marginTop: Spacing.xl,
      marginBottom: Spacing.lg,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 8,
    },
    favoritesIconContainer: {
      width: 60,
      height: 60,
      borderRadius: BorderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    favoritesContent: {
      flex: 1,
    },
    favoritesTitle: {
      marginBottom: Spacing.xs / 2,
    },
    favoritesDescription: {
      lineHeight: 18,
    },
    footer: {
      marginTop: Spacing["2xl"],
      alignItems: 'center',
      paddingVertical: Spacing.lg,
    },
  });
};
