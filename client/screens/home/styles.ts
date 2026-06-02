import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing["3xl"],
      paddingBottom: Spacing["5xl"],
    },
    header: {
      marginBottom: Spacing["3xl"],
      alignItems: 'center',
    },
    subtitle: {
      marginTop: Spacing.sm,
      textAlign: 'center',
    },
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      borderRadius: BorderRadius["2xl"],
      marginBottom: Spacing.xl,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 4,
    },
    userAvatar: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      marginBottom: 2,
    },
    featuresGrid: {
      gap: Spacing.lg,
    },
    featureCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      borderRadius: BorderRadius["2xl"],
      // 毛玻璃效果和柔和阴影
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 8,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: BorderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      marginBottom: Spacing.xs / 2,
    },
    featureSubtitle: {
      marginBottom: Spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    featureDescription: {
      lineHeight: 18,
    },
    arrowIcon: {
      marginLeft: Spacing.sm,
    },
    rowButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginTop: Spacing.xl,
      marginBottom: Spacing.lg,
    },
    halfButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      borderRadius: BorderRadius["2xl"],
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 8,
    },
    halfIconContainer: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.sm,
    },
    halfTitle: {
      fontSize: 14,
    },
    footer: {
      marginTop: Spacing["2xl"],
      alignItems: 'center',
      paddingVertical: Spacing.lg,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '80%',
      maxWidth: 340,
      borderRadius: BorderRadius["2xl"],
      padding: Spacing.xl,
      alignItems: 'center',
    },
    modalTitle: {
      marginBottom: Spacing.sm,
    },
    modalMessage: {
      marginBottom: Spacing.xl,
      textAlign: 'center',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: Spacing.md,
      width: '100%',
    },
    modalButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {},
    confirmButton: {},
  });
};
