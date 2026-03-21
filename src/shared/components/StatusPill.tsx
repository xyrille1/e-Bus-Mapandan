import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme/tokens';

type StatusTone = 'online' | 'offline' | 'syncing';

const toneStyles: Record<StatusTone, { bg: string; text: string }> = {
  online: { bg: colors.greenBg, text: colors.green },
  offline: { bg: colors.redBg, text: colors.red },
  syncing: { bg: colors.blueBg, text: colors.blue }
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
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start'
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    fontFamily: typography.fontBody
  }
});
