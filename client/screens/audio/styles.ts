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
    headerText: {
      marginLeft: Spacing.md,
      flex: 1,
    },
    backButton: {
      marginRight: Spacing.md,
      padding: Spacing.sm,
    },
    section: {
      marginBottom: Spacing.lg,
    },
    sectionTitle: {
      marginBottom: Spacing.md,
    },
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      padding: 4,
      marginBottom: Spacing.md,
    },
    modeButton: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputSection: {
      marginTop: Spacing.sm,
    },
    lyricsHint: {
      marginBottom: Spacing.xs,
    },
    textInput: {
      minHeight: 100,
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      fontSize: 16,
      lineHeight: 24,
    },
    lyricsInput: {
      minHeight: 160,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    chip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
    },
    durationContainer: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    durationButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    generateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing["2xl"],
      borderRadius: BorderRadius.xl,
      marginBottom: Spacing.md,
      gap: Spacing.sm,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 8,
    },
    generateButtonText: {},
    progressBarContainer: {
      marginBottom: Spacing.xl,
    },
    progressBarBg: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    progressText: {
      marginTop: Spacing.sm,
      textAlign: 'center',
    },
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
    resultLabel: {
      marginBottom: Spacing.sm,
    },
    audioPlayerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    audioInfo: {
      flex: 1,
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
  });
};
