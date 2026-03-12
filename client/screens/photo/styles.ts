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
    uploadSection: {
      marginBottom: Spacing.xl,
    },
    uploadButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    uploadButton: {
      flex: 1,
      padding: Spacing.xl,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 140,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 8,
    },
    uploadButtonText: {
      marginTop: Spacing.sm,
      textAlign: 'center',
    },
    previewContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      borderRadius: BorderRadius.xl,
      backgroundColor: theme.backgroundTertiary,
    },
    previewLabel: {
      flex: 1,
    },
    reselectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    reselectText: {},
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
    typeButtons: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    typeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    fileInfo: {
      flex: 1,
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
      gap: Spacing.lg,
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
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    resultLabel: {
      marginBottom: 0,
    },
    favoriteButton: {
      padding: Spacing.xs,
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
    resultImagesContainer: {
      flexDirection: 'column',
      gap: Spacing.md,
    },
    resultImage: {
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
    imagePreview: {
      height: 200,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    videoPreview: {
      height: 240,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
    },
    videoThumbnail: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    playIcon: {
      position: 'absolute',
    },
    videoText: {},
    analysisCard: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.xl,
      backgroundColor: theme.backgroundTertiary,
    },
  });
};
