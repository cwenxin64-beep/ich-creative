import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createCustomizeOrderModalStyles = (theme: Theme) => {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      flex: 0.95,
      backgroundColor: theme.backgroundRoot,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalBody: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    modalButton: {
      flex: 1,
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
    },
    modalButtonCancel: {
      backgroundColor: theme.backgroundDefault,
    },
    modalButtonConfirm: {
      backgroundColor: theme.primary,
    },
    modalButtonDisabled: {
      opacity: 0.5,
    },
    section: {
      marginBottom: Spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
      paddingBottom: Spacing.sm,
      borderBottomWidth: 2,
      borderBottomColor: theme.primary,
    },
    formRow: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    formHalf: {
      flex: 1,
    },
    formItem: {
      marginBottom: Spacing.lg,
    },
    formLabel: {
      marginBottom: Spacing.sm,
    },
    formHint: {
      marginBottom: Spacing.xs,
    },
    formInput: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      fontSize: 14,
      lineHeight: 20,
    },
    formInputMultiline: {
      minHeight: 100,
    },
    tagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    tagButton: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tagButtonActive: {
      borderColor: theme.primary,
    },
    sizeInputs: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    sizeInputWrapper: {
      flex: 1,
    },
    sizeInput: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      fontSize: 14,
      textAlign: 'center',
    },
    dateInputs: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    dateInput: {
      flex: 1,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      fontSize: 14,
      textAlign: 'center',
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      marginTop: Spacing.sm,
    },
    toggleIndicator: {
      width: 44,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.border,
      position: 'relative',
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.lg,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundTertiary,
    },
  });
};
