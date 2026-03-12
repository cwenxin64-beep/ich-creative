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
      marginBottom: Spacing.lg,
    },
    backButton: {
      marginRight: Spacing.md,
    },
    section: {
      marginBottom: Spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.lg,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
      gap: Spacing.md,
    },
    sectionTitle: {},
    formRow: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    formHalf: {
      flex: 1,
      gap: Spacing.sm,
    },
    formThird: {
      flex: 1,
      gap: Spacing.sm,
    },
    formItem: {
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
    },
    formLabel: {},
    formInput: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      fontSize: 14,
      lineHeight: 20,
    },
    genderButtons: {
      flexDirection: 'row',
      gap: Spacing.sm,
      height: 44,
    },
    genderButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundTertiary,
    },
    genderButtonActive: {
      backgroundColor: theme.primary,
    },
    tagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    tagButton: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tagButtonActive: {
      borderColor: theme.primary,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
    },
    toggleIndicator: {
      width: 44,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.border,
      position: 'relative',
    },
    submitButton: {
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
    submitButtonText: {},
  });
};
