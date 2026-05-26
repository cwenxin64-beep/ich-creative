import { StyleSheet, Dimensions } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: Spacing.md,
      padding: Spacing.xs,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      marginBottom: Spacing.xs,
    },
    headerSubtitle: {
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

    // 音乐卡片样式
    musicCardInner: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    musicCoverContainer: {
      width: 100,
      height: 100,
      justifyContent: 'center',
      alignItems: 'center',
      margin: Spacing.md,
      borderRadius: BorderRadius.lg,
    },
    musicCoverInfo: {
      position: 'absolute',
      bottom: Spacing.xs,
      left: Spacing.xs,
      right: Spacing.xs,
      alignItems: 'center',
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: Spacing.xs,
    },
    cardActions: {
      position: 'absolute',
      top: Spacing.md,
      right: Spacing.md,
      flexDirection: 'row',
      gap: Spacing.md,
      zIndex: 5,
    },
    cardActionBtn: {
      padding: Spacing.xs,
    },

    // 详情弹窗样式
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: SCREEN_WIDTH - 48,
      maxHeight: '80%',
      borderRadius: BorderRadius["2xl"],
      padding: Spacing.xl,
      overflow: 'hidden',
    },
    modalCloseBtn: {
      position: 'absolute',
      top: Spacing.md,
      right: Spacing.md,
      zIndex: 10,
      padding: Spacing.sm,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundTertiary,
    },
    detailMusicCover: {
      width: '100%',
      height: 180,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: BorderRadius.xl,
      marginBottom: Spacing.lg,
    },
    detailTitle: {
      marginBottom: Spacing.md,
      textAlign: 'center',
    },
    detailMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    detailTag: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.full,
    },
    detailDescription: {
      textAlign: 'center',
      marginBottom: Spacing.md,
      lineHeight: 22,
    },
    detailImage: {
      width: '100%',
      height: 250,
      borderRadius: BorderRadius.xl,
      marginBottom: Spacing.lg,
    },
    detailSubImages: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    detailSubImage: {
      width: (SCREEN_WIDTH - 48 - Spacing.xl * 2 - Spacing.sm) / 2,
      height: 100,
      borderRadius: BorderRadius.md,
    },
    detailActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.md,
      marginTop: Spacing.lg,
    },
    detailActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
    },

    // 底部面板
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
