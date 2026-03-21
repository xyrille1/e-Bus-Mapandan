import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../theme/tokens';

type StatusTone = 'online' | 'offline' | 'syncing';

const toneStyles: Record<StatusTone, { bg: string; text: string }> = {
  online: { bg: colors.accentSoft, text: colors.accent },
  offline: { bg: colors.warningSoft, text: colors.warning },
  syncing: { bg: '#e0f2fe', text: '#0369a1' }
};

type StatusPillProps = {
  tone: StatusTone;
  label: string;
};

export function StatusPill({ tone, label }: StatusPillProps) {
  const toneStyle = toneStyles[tone];

  return (
    <View style={[styles.container, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.label, { color: toneStyle.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start'
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2
  }
});
