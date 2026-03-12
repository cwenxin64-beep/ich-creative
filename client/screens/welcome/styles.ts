import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing["2xl"],
      paddingBottom: Spacing["5xl"],
      justifyContent: 'space-between',
    },
    logoSection: {
      alignItems: 'center',
      marginTop: Spacing["4xl"],
    },
    logoContainer: {
      width: 160,
      height: 160,
      borderRadius: BorderRadius["3xl"],
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.xl,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 12,
    },
    title: {
      marginBottom: Spacing.sm,
    },
    subtitle: {
      textAlign: 'center',
    },
    featuresSection: {
      marginVertical: Spacing["2xl"],
    },
    featuresTitle: {
      marginBottom: Spacing.lg,
      textAlign: 'center',
    },
    featureList: {
      gap: Spacing.md,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      borderRadius: BorderRadius.xl,
      backgroundColor: theme.backgroundDefault,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 4,
    },
    featureIcon: {
      width: 56,
      height: 56,
      borderRadius: BorderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    featureText: {
      flex: 1,
    },
    actionSection: {
      gap: Spacing.md,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.xl,
      borderRadius: BorderRadius.xl,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 8,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xl,
      borderRadius: BorderRadius.xl,
      borderWidth: 2,
    },
    footer: {
      alignItems: 'center',
      paddingVertical: Spacing.lg,
    },
  });
};
