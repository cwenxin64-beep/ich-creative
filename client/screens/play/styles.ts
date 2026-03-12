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
      padding: Spacing.sm,
    },
    ichTypeSection: {
      marginBottom: Spacing.xl,
    },
    interactionTypeSection: {
      marginBottom: Spacing.xl,
    },
    productTypeSection: {
      marginBottom: Spacing.xl,
    },
    marketSection: {
      marginBottom: Spacing.xl,
    },
    sectionLabel: {
      marginBottom: Spacing.md,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    typeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundDefault,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    inputSection: {
      marginBottom: Spacing.xl,
    },
    inputLabel: {
      marginBottom: Spacing.md,
    },
    textInput: {
      minHeight: 120,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      fontSize: 16,
      lineHeight: 24,
    },
    generateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing["2xl"],
      borderRadius: BorderRadius.xl,
      marginBottom: Spacing["2xl"],
      gap: Spacing.sm,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 8,
    },
    generateButtonText: {},
    resultsSection: {
      gap: Spacing.md,
    },
    resultsTitle: {
      marginBottom: Spacing.sm,
    },
    resultCard: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.xl,
      backgroundColor: theme.backgroundDefault,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 4,
    },
    resultType: {
      marginBottom: Spacing.sm,
    },
    resultActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.md,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundTertiary,
    },
    actionButtonText: {
      fontSize: 12,
    },
    resultPreview: {
      height: 240,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      position: 'relative',
      marginBottom: Spacing.sm,
    },
    resultMedia: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    playIcon: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginTop: -24,
      marginLeft: -24,
    },
    resultImages: {
      flexDirection: 'column',
      gap: Spacing.md,
    },
    resultMainImageWrapper: {
      width: '100%',
      position: 'relative',
    },
    resultMainImage: {
      width: '100%',
      height: 200,
      borderRadius: BorderRadius.lg,
      resizeMode: 'cover',
    },
    resultSubImages: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    resultSubImage: {
      flex: 1,
      height: 100,
      borderRadius: BorderRadius.lg,
      resizeMode: 'cover',
    },
    previewPlaceholder: {
      height: 180,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.backgroundRoot,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.xl,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalBody: {
      padding: Spacing.lg,
      maxHeight: 400,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: Spacing.md,
      padding: Spacing.xl,
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
      backgroundColor: theme.backgroundTertiary,
    },
    modalButtonConfirm: {
      backgroundColor: theme.primary,
    },
    modalButtonDisabled: {
      opacity: 0.5,
    },
    loadingContainer: {
      paddingVertical: Spacing["2xl"],
      alignItems: 'center',
      gap: Spacing.md,
    },
    loadingText: {},
    emptyContainer: {
      paddingVertical: Spacing["3xl"],
      alignItems: 'center',
      gap: Spacing.md,
    },
    emptyText: {},
    materialItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      backgroundColor: theme.backgroundDefault,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    materialItemSelected: {
      borderColor: theme.primary,
    },
    materialItemImage: {
      width: 60,
      height: 60,
      borderRadius: BorderRadius.lg,
      resizeMode: 'cover',
    },
    materialItemVideo: {
      width: 60,
      height: 60,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
    },
    materialPlayIcon: {
      position: 'absolute',
      top: 18,
      left: 18,
    },
    materialItemPlaceholder: {
      width: 60,
      height: 60,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    materialItemInfo: {
      flex: 1,
      marginLeft: Spacing.md,
    },
    materialSection: {
      marginBottom: Spacing.xl,
    },
    materialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.xl,
      backgroundColor: theme.backgroundDefault,
      borderWidth: 1,
      borderColor: theme.borderLight,
      position: 'relative',
    },
    materialButtonText: {
      flex: 1,
    },
    selectedMaterialIndicator: {
      position: 'absolute',
      top: Spacing.sm,
      right: Spacing.sm,
    },
    selectedMaterialCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      marginTop: Spacing.md,
      backgroundColor: theme.backgroundDefault,
    },
    selectedMaterialImage: {
      width: 50,
      height: 50,
      borderRadius: BorderRadius.lg,
      resizeMode: 'cover',
    },
    selectedMaterialInfo: {
      flex: 1,
      marginLeft: Spacing.md,
    },
  });
};
