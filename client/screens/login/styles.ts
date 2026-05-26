import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing["5xl"],
      paddingBottom: Spacing["5xl"],
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: Spacing["2xl"],
    },
    logoContainer: {
      width: 100,
      height: 100,
      borderRadius: BorderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.md,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 8,
    },
    logoTitle: {
      fontSize: 22,
      fontWeight: '700',
      marginBottom: Spacing.xs,
    },
    logoSubtitle: {
      fontSize: 14,
    },
    formSection: {
      marginBottom: Spacing.xl,
      gap: Spacing.lg,
    },
    inputGroup: {
      gap: Spacing.sm,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: Spacing.xs,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      paddingHorizontal: Spacing.md,
      height: 52,
    },
    inputIcon: {
      marginRight: Spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: 16,
      height: 52,
    },
    eyeButton: {
      padding: Spacing.sm,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.xs,
    },
    errorText: {
      color: '#EF4444',
      fontSize: 13,
    },
    loginButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      height: 52,
      borderRadius: BorderRadius.lg,
      marginTop: Spacing.md,
    },
    loginButtonDisabled: {
      opacity: 0.7,
    },
    buttonIcon: {
      marginRight: Spacing.sm,
    },
    loginButtonText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '600',
    },
    footerSection: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.xl,
    },
    footerText: {
      fontSize: 15,
    },
    footerLink: {
      fontSize: 15,
      fontWeight: '600',
    },
  });
};
