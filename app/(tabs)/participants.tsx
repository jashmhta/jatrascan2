import { useState, useMemo, useCallback } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Modal, Platform, Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { CHECKPOINTS, JATRA_COMPLETION_CHECKPOINT } from "@/constants/checkpoints";
import { ScanResultModal } from "@/components/scan-result-modal";
import { Participant, ScanResult, ParticipantWithStatus } from "@/types";

type SortOption = "badge" | "name" | "jatras" | "risk";
type FilterOption = "all" | "descending" | "completed" | "at-risk";

export default function ParticipantsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { 
    participants, 
    isLoading, 
    addScan, 
    getParticipantWithStatus,
    currentCheckpoint,
  } = useOfflineSync();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("badge");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  
  // Quick scan modal state
  const [quickScanParticipant, setQuickScanParticipant] = useState<Participant | null>(null);
  const [showCheckpointPicker, setShowCheckpointPicker] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedCheckpointName, setSelectedCheckpointName] = useState("");
  const [showParticipantDetails, setShowParticipantDetails] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantWithStatus | null>(null);

  // Get participants with safety status
  const participantsWithStatus = useMemo(() => {
    return participants.map(p => getParticipantWithStatus(p));
  }, [participants, getParticipantWithStatus]);

  // Count at-risk pilgrims
  const atRiskCount = useMemo(() => {
    return participantsWithStatus.filter(p => p.isAtRisk).length;
  }, [participantsWithStatus]);

  // Filter and sort participants
  const filteredParticipants = useMemo(() => {
    let result = participantsWithStatus;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.badgeNumber.toString().includes(query)
      );
    }

    // Apply status filter
    switch (filterBy) {
      case "descending":
        result = result.filter(p => p.lastCheckpoint === "Motisha Tuk");
        break;
      case "completed":
        result = result.filter(p => p.currentJatra > 0);
        break;
      case "at-risk":
        result = result.filter(p => p.isAtRisk);
        break;
    }

    // Apply sort
    switch (sortBy) {
      case "name":
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "jatras":
        result = [...result].sort((a, b) => b.currentJatra - a.currentJatra);
        break;
      case "risk":
        result = [...result].sort((a, b) => {
          if (a.isAtRisk && !b.isAtRisk) return -1;
          if (!a.isAtRisk && b.isAtRisk) return 1;
          return (b.minutesSinceLastScan || 0) - (a.minutesSinceLastScan || 0);
        });
        break;
      default:
        result = [...result].sort((a, b) => a.badgeNumber - b.badgeNumber);
    }

    return result;
  }, [participantsWithStatus, searchQuery, sortBy, filterBy]);

  // Handle call button press
  const handleCall = useCallback((contact: string | null, name: string) => {
    if (!contact) {
      Alert.alert("No Contact", `No emergency contact available for ${name}`);
      return;
    }
    
    const phoneNumber = contact.replace(/[^0-9+]/g, '');
    if (Platform.OS === "web") {
      window.open(`tel:${phoneNumber}`, '_blank');
    } else {
      Linking.openURL(`tel:${phoneNumber}`).catch(() => {
        Alert.alert("Error", "Unable to make call");
      });
    }
  }, []);

  const handleQuickScan = (participant: Participant) => {
    setQuickScanParticipant(participant);
    setShowCheckpointPicker(true);
  };

  const handleCheckpointSelect = async (checkpointId: number) => {
    if (!quickScanParticipant) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    const checkpoint = CHECKPOINTS.find(c => c.id === checkpointId);
    setSelectedCheckpointName(checkpoint?.name || "");
    
    const result = await addScan(quickScanParticipant, checkpointId);
    setShowCheckpointPicker(false);
    setScanResult(result);
    setQuickScanParticipant(null);
  };

  const handleViewDetails = (participant: ParticipantWithStatus) => {
    setSelectedParticipant(participant);
    setShowParticipantDetails(true);
  };

  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return "In progress...";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const FilterButton = ({ option, label, count }: { option: FilterOption; label: string; count?: number }) => (
    <TouchableOpacity
      onPress={() => setFilterBy(option)}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: filterBy === option ? (option === "at-risk" ? colors.error : colors.primary) : colors.surface,
        borderWidth: 1,
        borderColor: filterBy === option ? (option === "at-risk" ? colors.error : colors.primary) : colors.border,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      }}
    >
      <Text style={{
        fontSize: 13,
        fontWeight: "500",
        color: filterBy === option ? "#fff" : colors.foreground,
      }}>
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={{
          backgroundColor: filterBy === option ? "rgba(255,255,255,0.3)" : colors.error,
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: 10,
        }}>
          <Text style={{ fontSize: 11, color: "#fff", fontWeight: "bold" }}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="p-4">
      <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.foreground, marginBottom: 4 }}>
        Pilgrims
      </Text>
      <Text style={{ fontSize: 15, color: colors.muted, marginBottom: 16 }}>
        {participants.length} registered • {atRiskCount > 0 ? `${atRiskCount} at risk` : "All safe"}
      </Text>

      {/* At-Risk Alert Banner */}
      {atRiskCount > 0 && (
        <TouchableOpacity 
          onPress={() => setFilterBy("at-risk")}
          style={{
            backgroundColor: colors.error + "15",
            borderWidth: 1,
            borderColor: colors.error,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.error,
            justifyContent: "center",
            alignItems: "center",
          }}>
            <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "bold", color: colors.error }}>
              {atRiskCount} Pilgrim{atRiskCount > 1 ? 's' : ''} At Risk
            </Text>
            <Text style={{ fontSize: 12, color: colors.error }}>
              Incomplete Jatra for more than 6 hours
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={colors.error} />
        </TouchableOpacity>
      )}

      {/* Search Bar */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
      }}>
        <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or badge number"
          placeholderTextColor={colors.muted}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 12,
            fontSize: 16,
            color: colors.foreground,
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <IconSymbol name="xmark" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <FilterButton option="all" label="All" />
        <FilterButton option="at-risk" label="At Risk" count={atRiskCount} />
        <FilterButton option="descending" label="Descending" />
        <FilterButton option="completed" label="Completed" />
      </View>

      {/* Sort Options */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Text style={{ fontSize: 13, color: colors.muted }}>Sort:</Text>
        {(["badge", "name", "jatras", "risk"] as SortOption[]).map(option => (
          <TouchableOpacity
            key={option}
            onPress={() => setSortBy(option)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: sortBy === option ? colors.primary + "20" : "transparent",
            }}
          >
            <Text style={{
              fontSize: 13,
              fontWeight: sortBy === option ? "600" : "400",
              color: sortBy === option ? colors.primary : colors.muted,
            }}>
              {option === "badge" ? "Badge" : option === "name" ? "Name" : option === "jatras" ? "Jatras" : "Risk"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results Count */}
      <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>
        Showing {filteredParticipants.length} of {participants.length} pilgrims
      </Text>

      {/* Participants List */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={filteredParticipants}
          keyExtractor={(item) => item.uuid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{
              marginBottom: 8,
              backgroundColor: item.isAtRisk ? colors.error + "10" : colors.surface,
              borderRadius: 12,
              borderWidth: item.isAtRisk ? 2 : 1,
              borderColor: item.isAtRisk ? colors.error : item.currentJatra >= 7 ? colors.success : colors.border,
              borderLeftWidth: 4,
              borderLeftColor: item.isAtRisk 
                ? colors.error 
                : item.currentJatra >= 7 
                  ? colors.success 
                  : item.lastCheckpoint === "Motisha Tuk" 
                    ? colors.warning 
                    : colors.primary,
              overflow: "hidden",
            }}>
              {/* At Risk Warning */}
              {item.isAtRisk && (
                <View style={{
                  backgroundColor: colors.error,
                  paddingVertical: 4,
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#fff" />
                  <Text style={{ fontSize: 11, color: "#fff", fontWeight: "bold" }}>
                    AT RISK - {item.minutesSinceLastScan ? Math.floor(item.minutesSinceLastScan / 60) : 0}+ hours since last scan
                  </Text>
                </View>
              )}
              
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {/* Main Row - Tap to view details */}
                <TouchableOpacity
                  onPress={() => handleViewDetails(item)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                  }}
                >
                  {/* Badge Number Circle */}
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: item.isAtRisk ? colors.error : item.lastCheckpoint === "Motisha Tuk" ? colors.warning : colors.background,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                    borderWidth: 2,
                    borderColor: item.currentJatra > 0 ? colors.success : colors.border,
                  }}>
                    <Text style={{ 
                      fontWeight: "bold", 
                      fontSize: 15,
                      color: item.isAtRisk || item.lastCheckpoint === "Motisha Tuk" ? "#fff" : colors.foreground,
                    }}>
                      #{item.badgeNumber}
                    </Text>
                  </View>
                  
                  {/* Name and Details */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
                      {item.name}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      {/* Blood Group */}
                      {item.bloodGroup && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <IconSymbol name="drop.fill" size={10} color={colors.error} />
                          <Text style={{ fontSize: 11, color: colors.muted }}>
                            {item.bloodGroup}
                          </Text>
                        </View>
                      )}
                      {/* Age */}
                      {item.age && (
                        <Text style={{ fontSize: 11, color: colors.muted }}>
                          {item.age}y
                        </Text>
                      )}
                      {/* Last Checkpoint */}
                      {item.lastCheckpoint && (
                        <View style={{
                          backgroundColor: item.lastCheckpoint === "Motisha Tuk" ? colors.warning : colors.success,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}>
                          <Text style={{ fontSize: 9, color: "#fff", fontWeight: "700" }}>
                            {item.lastCheckpoint === "Motisha Tuk" ? "↓ DESCENDING" : item.lastCheckpoint}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {/* Jatra Count Badge */}
                  <View style={{ alignItems: "center", marginLeft: 8 }}>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: item.currentJatra >= 7 
                        ? colors.success 
                        : item.currentJatra > 0 
                          ? colors.primary + "20" 
                          : colors.background,
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: item.currentJatra > 0 ? 0 : 1,
                      borderColor: colors.border,
                    }}>
                      {item.currentJatra >= 7 ? (
                        <IconSymbol name="star.fill" size={20} color="#fff" />
                      ) : (
                        <Text style={{ 
                          fontSize: 18, 
                          fontWeight: "bold",
                          color: item.currentJatra > 0 ? colors.primary : colors.muted,
                        }}>
                          {item.currentJatra}
                        </Text>
                      )}
                    </View>
                    <Text style={{ 
                      fontSize: 10, 
                      color: item.currentJatra >= 7 ? colors.success : colors.muted,
                      fontWeight: item.currentJatra >= 7 ? "600" : "400",
                      marginTop: 2,
                    }}>
                      {item.currentJatra >= 7 ? "SAAT" : "Jatra"}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                {/* Call Button */}
                <TouchableOpacity
                  onPress={() => handleCall(item.emergencyContact, item.name)}
                  style={{
                    backgroundColor: colors.success,
                    paddingVertical: 14,
                    paddingHorizontal: 10,
                    justifyContent: "center",
                    alignItems: "center",
                    alignSelf: "stretch",
                  }}
                >
                  <IconSymbol name="phone.fill" size={18} color="#fff" />
                  <Text style={{ fontSize: 8, color: "#fff", marginTop: 2, fontWeight: "600" }}>CALL</Text>
                </TouchableOpacity>
                
                {/* Quick Scan Button */}
                <TouchableOpacity
                  onPress={() => handleQuickScan(item)}
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: 14,
                    paddingHorizontal: 10,
                    justifyContent: "center",
                    alignItems: "center",
                    alignSelf: "stretch",
                  }}
                >
                  <IconSymbol name="qrcode.viewfinder" size={18} color="#fff" />
                  <Text style={{ fontSize: 8, color: "#fff", marginTop: 2, fontWeight: "600" }}>SCAN</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <IconSymbol name="person.2.fill" size={48} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: 12, textAlign: "center" }}>
                No pilgrims found
              </Text>
            </View>
          }
        />
      )}

      {/* Participant Details Modal */}
      <Modal
        visible={showParticipantDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowParticipantDetails(false)}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={() => setShowParticipantDetails(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
              maxHeight: "80%",
            }}
          >
            {selectedParticipant && (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground }}>
                    Pilgrim Details
                  </Text>
                  <TouchableOpacity onPress={() => setShowParticipantDetails(false)}>
                    <IconSymbol name="xmark" size={24} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                {/* Pilgrim Info */}
                <View style={{
                  backgroundColor: colors.surface,
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 16,
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                    <View style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: selectedParticipant.isAtRisk ? colors.error : colors.primary + "20",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}>
                      <Text style={{ fontWeight: "bold", fontSize: 20, color: selectedParticipant.isAtRisk ? "#fff" : colors.primary }}>
                        #{selectedParticipant.badgeNumber}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground }}>
                        {selectedParticipant.name}
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.muted }}>
                        {selectedParticipant.currentJatra} Jatras completed
                      </Text>
                    </View>
                  </View>

                  {/* Contact Info */}
                  <View style={{ gap: 8 }}>
                    {selectedParticipant.bloodGroup && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <IconSymbol name="drop.fill" size={16} color={colors.error} />
                        <Text style={{ color: colors.foreground }}>Blood Group: {selectedParticipant.bloodGroup}</Text>
                      </View>
                    )}
                    {selectedParticipant.age && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <IconSymbol name="person.fill" size={16} color={colors.muted} />
                        <Text style={{ color: colors.foreground }}>Age: {selectedParticipant.age} years</Text>
                      </View>
                    )}
                    {selectedParticipant.emergencyContact && (
                      <TouchableOpacity 
                        onPress={() => handleCall(selectedParticipant.emergencyContact, selectedParticipant.name)}
                        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                      >
                        <IconSymbol name="phone.fill" size={16} color={colors.success} />
                        <Text style={{ color: colors.success, textDecorationLine: "underline" }}>
                          Emergency: {selectedParticipant.emergencyContact}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Jatra Durations */}
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.foreground, marginBottom: 12 }}>
                  Jatra History
                </Text>
                {selectedParticipant.jatraDurations.length > 0 ? (
                  <FlatList
                    data={selectedParticipant.jatraDurations}
                    keyExtractor={(item) => item.jatraNumber.toString()}
                    style={{ maxHeight: 200 }}
                    renderItem={({ item }) => (
                      <View style={{
                        backgroundColor: item.isComplete ? colors.success + "15" : colors.warning + "15",
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: item.isComplete ? colors.success : colors.warning,
                      }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Text style={{ fontWeight: "bold", color: colors.foreground }}>
                            Jatra #{item.jatraNumber}
                          </Text>
                          <Text style={{ 
                            fontWeight: "bold", 
                            color: item.isComplete ? colors.success : colors.warning 
                          }}>
                            {formatDuration(item.durationMinutes)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                          {item.startCheckpoint} → {item.endCheckpoint || "..."}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.muted }}>
                          Started: {item.startTime}
                        </Text>
                        {item.endTime && (
                          <Text style={{ fontSize: 11, color: colors.muted }}>
                            Completed: {item.endTime}
                          </Text>
                        )}
                      </View>
                    )}
                  />
                ) : (
                  <View style={{
                    backgroundColor: colors.surface,
                    padding: 20,
                    borderRadius: 12,
                    alignItems: "center",
                  }}>
                    <IconSymbol name="clock" size={32} color={colors.muted} />
                    <Text style={{ color: colors.muted, marginTop: 8 }}>No Jatras recorded yet</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowParticipantDetails(false);
                      handleCall(selectedParticipant.emergencyContact, selectedParticipant.name);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: colors.success,
                      padding: 14,
                      borderRadius: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <IconSymbol name="phone.fill" size={20} color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setShowParticipantDetails(false);
                      handleQuickScan(selectedParticipant);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: colors.primary,
                      padding: 14,
                      borderRadius: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <IconSymbol name="qrcode.viewfinder" size={20} color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>Scan</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Checkpoint Picker Modal */}
      <Modal
        visible={showCheckpointPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCheckpointPicker(false)}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={() => setShowCheckpointPicker(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.foreground }}>
                Select Checkpoint
              </Text>
              <TouchableOpacity onPress={() => setShowCheckpointPicker(false)}>
                <IconSymbol name="xmark" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>
            
            {quickScanParticipant && (
              <View style={{
                backgroundColor: colors.surface,
                padding: 12,
                borderRadius: 12,
                marginBottom: 20,
                flexDirection: "row",
                alignItems: "center",
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primary + "20",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}>
                  <Text style={{ fontWeight: "bold", color: colors.primary }}>
                    #{quickScanParticipant.badgeNumber}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>
                  {quickScanParticipant.name}
                </Text>
              </View>
            )}
            
            <View style={{ gap: 12 }}>
              {CHECKPOINTS.map(checkpoint => (
                <TouchableOpacity
                  key={checkpoint.id}
                  onPress={() => handleCheckpointSelect(checkpoint.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    backgroundColor: currentCheckpoint === checkpoint.id ? checkpoint.color + "20" : colors.surface,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: currentCheckpoint === checkpoint.id ? checkpoint.color : colors.border,
                  }}
                >
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: checkpoint.color + "20",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 16,
                  }}>
                    <IconSymbol name="location.fill" size={24} color={checkpoint.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: "600", color: colors.foreground }}>
                      {checkpoint.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.muted }}>
                      {checkpoint.description}
                    </Text>
                  </View>
                  {currentCheckpoint === checkpoint.id && (
                    <View style={{
                      backgroundColor: checkpoint.color,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}>
                      <Text style={{ fontSize: 10, color: "#fff", fontWeight: "bold" }}>CURRENT</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Scan Result Modal */}
      <ScanResultModal
        visible={!!scanResult}
        result={scanResult}
        onClose={() => setScanResult(null)}
        checkpointName={selectedCheckpointName}
      />
    </ScreenContainer>
  );
}
