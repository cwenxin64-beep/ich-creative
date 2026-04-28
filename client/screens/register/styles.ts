import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing["5xl"],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    backButton: {
      marginRight: Spacing.md,
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
      marginBottom: Spacing.xs,
    },
    formSection: {
      marginBottom: Spacing.xl,
      gap: Spacing.lg,
    },
    inputGroup: {
      gap: Spacing.sm,
    },
    inputLabel: {
      marginLeft: Spacing.xs,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.md,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 4,
    },
    inputIcon: {
      marginRight: Spacing.md,
    },
    textInput: {
      flex: 1,
      paddingVertical: Spacing.md,
      fontSize: 16,
      lineHeight: 24,
    },
    registerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.xl,
      borderRadius: BorderRadius.xl,
      marginBottom: Spacing.lg,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 8,
    },
    registerButtonText: {},
    termsSection: {
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    artisanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.xl,
      borderWidth: 2,
    },
    artisanButtonText: {},
    roleContainer: {
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
    },
    roleButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    roleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderWidth: 2,
      borderColor: theme.borderDefault,
      backgroundColor: theme.backgroundDefault,
    },
    roleButtonText: {},
  });
};
