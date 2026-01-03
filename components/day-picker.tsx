import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export type DayFilter = 1 | 2 | "all";

interface DayPickerProps {
  selectedDay: DayFilter;
  onDayChange: (day: DayFilter) => void;
  compact?: boolean;
}

export function DayPicker({ selectedDay, onDayChange, compact = false }: DayPickerProps) {
  const colors = useColors();

  const options: { value: DayFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: 1, label: "Day 1" },
    { value: 2, label: "Day 2" },
  ];

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => onDayChange(option.value)}
            style={[
              styles.compactOption,
              selectedDay === option.value && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.compactLabel,
                { color: selectedDay === option.value ? "#fff" : colors.muted },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <IconSymbol name="calendar" size={18} color={colors.muted} />
        <Text style={[styles.headerText, { color: colors.muted }]}>Filter by Day</Text>
      </View>
      <View style={[styles.optionsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => onDayChange(option.value)}
            style={[
              styles.option,
              selectedDay === option.value && { backgroundColor: colors.primary },
              index < options.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.optionLabel,
                { color: selectedDay === option.value ? "#fff" : colors.foreground },
                selectedDay === option.value && styles.selectedLabel,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  optionsContainer: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  option: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedLabel: {
    fontWeight: "600",
  },
  compactContainer: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  compactOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
});
