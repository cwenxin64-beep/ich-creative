import { StyleSheet, Dimensions } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.sm,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  mainContent: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  videoContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    aspectRatio: 16 / 9,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  mainImage: {
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
  },
  placeholder: {
    width: SCREEN_WIDTH - 32,
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: Spacing.md,
  },
  subImagesContainer: {
    marginBottom: Spacing.xl,
  },
  subImagesTitle: {
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subImagesGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  subImageWrapper: {
    flex: 1,
  },
  subImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
  },
  infoSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  infoTitle: {
    marginBottom: Spacing.sm,
  },
  infoText: {
    lineHeight: 22,
  },
  descriptionSection: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  descriptionLabel: {
    marginBottom: Spacing.xs,
  },
  descriptionText: {
    lineHeight: 18,
  },
});
