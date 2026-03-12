import { StyleSheet, Platform } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    message: {
      marginBottom: Spacing.lg,
    },
    permissionButton: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing['2xl'],
      borderRadius: BorderRadius.lg,
    },
    cameraContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    camera: {
      flex: 1,
    },
    controlsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: Spacing.xl,
      paddingBottom: Platform.OS === 'web' ? Spacing.xl : Spacing.xl + 34,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    controlButton: {
      alignItems: 'center',
      gap: Spacing.xs,
    },
    controlText: {
      fontSize: 12,
    },
    captureButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureInner: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
  });
};
