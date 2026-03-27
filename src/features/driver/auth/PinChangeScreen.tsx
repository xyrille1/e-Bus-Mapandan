import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  colors,
  radii,
  spacing,
  typography,
} from "../../../shared/theme/tokens";
import { usePinChange } from "./usePinChange";

type Props = {
  onClose: () => void;
};

export function PinChangeScreen({ onClose }: Props) {
  const { phase, error, changePin, reset } = usePinChange();

  // Controlled inputs — kept as local state here since they're view-only
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const isSubmitting = phase === "submitting";

  async function handleSubmit() {
    await changePin(currentPin, newPin, confirmPin);
  }

  function handleClose() {
    reset();
    onClose();
  }

  if (phase === "success") {
    return (
      <View style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.title}>PIN Changed</Text>
          <Text style={styles.subtitle}>
            Your PIN has been updated successfully.
          </Text>
          <Pressable style={styles.primaryButton} onPress={handleClose}>
            <Text style={styles.primaryText}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.badge}>SECURITY</Text>
        <Text style={styles.title}>Change PIN</Text>
        <Text style={styles.subtitle}>
          Enter your current PIN, then your new PIN twice.
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Current PIN</Text>
          <TextInput
            value={currentPin}
            onChangeText={setCurrentPin}
            placeholder="Enter current PIN"
            placeholderTextColor={colors.ink3}
            secureTextEntry
            keyboardType="numeric"
            maxLength={16}
            style={styles.input}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>New PIN</Text>
          <TextInput
            value={newPin}
            onChangeText={setNewPin}
            placeholder="Enter new PIN (min 6 digits)"
            placeholderTextColor={colors.ink3}
            secureTextEntry
            keyboardType="numeric"
            maxLength={16}
            style={styles.input}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Confirm New PIN</Text>
          <TextInput
            value={confirmPin}
            onChangeText={setConfirmPin}
            placeholder="Re-enter new PIN"
            placeholderTextColor={colors.ink3}
            secureTextEntry
            keyboardType="numeric"
            maxLength={16}
            style={styles.input}
            editable={!isSubmitting}
          />
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.primaryButton,
            isSubmitting ? styles.buttonDisabled : null,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryText}>
            {isSubmitting ? "Updating PIN..." : "Update PIN"}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.secondaryButton,
            isSubmitting ? styles.buttonDisabled : null,
          ]}
          onPress={handleClose}
          disabled={isSubmitting}
        >
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.md,
    justifyContent: "center",
  },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: "flex-start",
    color: colors.blue,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    fontFamily: typography.fontBody,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    fontFamily: typography.fontDisplay,
  },
  subtitle: {
    color: colors.ink2,
    fontSize: 13,
    fontFamily: typography.fontBody,
    marginTop: -4,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    color: colors.ink2,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: typography.fontBody,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderMd,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 15,
    fontFamily: typography.fontBody,
    letterSpacing: 4,
  },
  errorBanner: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.redBorder,
    backgroundColor: colors.redBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  errorText: {
    color: colors.red,
    fontSize: 12,
    fontFamily: typography.fontBody,
  },
  primaryButton: {
    borderRadius: radii.md,
    backgroundColor: colors.green,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  primaryText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800",
    fontFamily: typography.fontBody,
  },
  secondaryButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryText: {
    color: colors.ink2,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: typography.fontBody,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  successIcon: {
    fontSize: 48,
    textAlign: "center",
    color: colors.green,
  },
});
