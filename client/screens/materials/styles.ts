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
      marginBottom: Spacing.lg,
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

    // 筛选栏
    filterBar: {
      flexDirection: 'row',
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
    },
    filterButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundTertiary,
    },
    filterButtonActive: {
      backgroundColor: theme.primary,
    },
    filterButtonText: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    filterButtonTextActive: {
      color: theme.buttonPrimaryText,
    },

    // 统计信息
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.lg,
      paddingHorizontal: Spacing.xs,
    },

    // 网格布局
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
    },

    // 素材卡片
    materialCard: {
      width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
      backgroundColor: theme.backgroundDefault,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 4,
    },
    materialImage: {
      width: '100%',
      height: 140,
    },
    musicCardCover: {
      width: '100%',
      height: 140,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
    },
    materialInfo: {
      padding: Spacing.sm,
    },
    materialTitle: {
      fontSize: 13,
      marginBottom: 2,
    },
    materialType: {
      fontSize: 11,
    },

    // 空状态
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
    syncButton: {
      marginTop: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.primary,
    },
    syncButtonText: {
      color: theme.buttonPrimaryText,
      fontSize: 14,
      fontWeight: '600',
    },

    // 详情弹窗
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
    detailImage: {
      width: '100%',
      height: 250,
      borderRadius: BorderRadius.xl,
      marginBottom: Spacing.lg,
    },
    detailMusicCover: {
      width: '100%',
      height: 180,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: BorderRadius.xl,
      marginBottom: Spacing.lg,
      backgroundColor: theme.backgroundTertiary,
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
  });
};
