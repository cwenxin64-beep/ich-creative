import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing["3xl"],
      paddingBottom: Spacing["5xl"],
    },
    scrollView: {
      flex: 1,
    },
    header: {
      marginBottom: Spacing["2xl"],
      alignItems: 'center',
    },
    headerTitle: {
      marginBottom: Spacing.xs,
    },
    headerSubtitle: {
      textAlign: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Spacing["5xl"],
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: BorderRadius.xl,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    emptyText: {
      marginBottom: Spacing.sm,
      fontSize: 16,
    },
    emptyHint: {
      textAlign: 'center',
    },
    gridContainer: {
      gap: Spacing.lg,
    },
    card: {
      borderRadius: BorderRadius["2xl"],
      overflow: 'hidden',
      // 毛玻璃效果和柔和阴影
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 8,
    },
    selectButton: {
      position: 'absolute',
      top: Spacing.md,
      left: Spacing.md,
      zIndex: 10,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: BorderRadius.sm,
      padding: Spacing.xs,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
      elevation: 4,
    },
    mainImageContainer: {
      position: 'relative',
      height: 200,
    },
    mainImage: {
      width: '100%',
      height: '100%',
    },
    cardOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
    },
    overlayIcon: {
      padding: Spacing.sm,
    },
    subImagesContainer: {
      flexDirection: 'row',
      gap: Spacing.sm,
      padding: Spacing.md,
    },
    subImage: {
      flex: 1,
      height: 80,
      borderRadius: BorderRadius.md,
    },
    cardContent: {
      padding: Spacing.md,
    },
    cardTitle: {
      marginBottom: Spacing.xs,
    },
    cardDescription: {
      marginBottom: Spacing.sm,
      lineHeight: 18,
    },
    cardDate: {
      marginTop: Spacing.xs,
    },
    bottomPanel: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 10,
      backgroundColor: theme.backgroundRoot,
    },
    panelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundTertiary,
    },
    clearButton: {
      backgroundColor: 'transparent',
    },
    panelButtonText: {
      fontSize: 12,
    },
  });
};
