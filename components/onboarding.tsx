import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from "react-native";

import { IconSymbol } from "./ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useSharedValue, withTiming } from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  icon: any;
  title: string;
  titleHi: string;
  titleGu: string;
  description: string;
  descriptionHi: string;
  descriptionGu: string;
  color: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    icon: "location.fill",
    title: "Welcome to Palitana Yatra Tracker",
    titleHi: "पालीताना यात्रा ट्रैकर में आपका स्वागत है",
    titleGu: "પાલીતાણા યાત્રા ટ્રેકરમાં આપનું સ્વાગત છે",
    description: "Track pilgrims during their sacred journey up Shatrunjaya Hill with ease and precision.",
    descriptionHi: "शत्रुंजय पहाड़ी पर उनकी पवित्र यात्रा के दौरान यात्रियों को आसानी और सटीकता से ट्रैक करें।",
    descriptionGu: "શત્રુંજય ટેકરી પર તેમની પવિત્ર યાત્રા દરમિયાન યાત્રાળુઓને સરળતા અને ચોકસાઈથી ટ્રેક કરો.",
    color: "#FF7F3F",
  },
  {
    id: "2",
    icon: "qrcode.viewfinder",
    title: "Scan QR Codes",
    titleHi: "QR कोड स्कैन करें",
    titleGu: "QR કોડ સ્કેન કરો",
    description: "Each pilgrim has a unique QR code on their ID card. Simply scan it at checkpoints to record their progress.",
    descriptionHi: "प्रत्येक यात्री के आईडी कार्ड पर एक अद्वितीय QR कोड है। उनकी प्रगति रिकॉर्ड करने के लिए बस चेकपॉइंट पर इसे स्कैन करें।",
    descriptionGu: "દરેક યાત્રાળુના ID કાર્ડ પર એક અનન્ય QR કોડ છે. તેમની પ્રગતિ રેકોર્ડ કરવા માટે ચેકપોઇન્ટ પર તેને સ્કેન કરો.",
    color: "#F7931E",
  },
  {
    id: "3",
    icon: "flag.checkered",
    title: "3 Checkpoints",
    titleHi: "3 चेकपॉइंट",
    titleGu: "3 ચેકપોઇન્ટ",
    description: "Aamli (midway), Gheti (bottom - completes Jatra), and X (front side). A Jatra is complete when scanned at Aamli then Gheti.",
    descriptionHi: "आमली (मध्य), घेटी (नीचे - यात्रा पूर्ण), और X (सामने की ओर)। आमली फिर घेटी पर स्कैन करने पर यात्रा पूर्ण होती है।",
    descriptionGu: "આમલી (મધ્યમાં), ઘેટી (નીચે - યાત્રા પૂર્ણ), અને X (આગળની બાજુ). આમલી પછી ઘેટી પર સ્કેન કરવાથી યાત્રા પૂર્ણ થાય છે.",
    color: "#22C55E",
  },
  {
    id: "4",
    icon: "arrow.triangle.2.circlepath",
    title: "Works Offline",
    titleHi: "ऑफलाइन काम करता है",
    titleGu: "ઓફલાઇન કામ કરે છે",
    description: "Scans are saved locally and automatically sync to the server and Google Sheets when you're back online.",
    descriptionHi: "स्कैन स्थानीय रूप से सहेजे जाते हैं और जब आप ऑनलाइन होते हैं तो स्वचालित रूप से सर्वर और Google Sheets में सिंक हो जाते हैं।",
    descriptionGu: "સ્કેન સ્થાનિક રીતે સાચવવામાં આવે છે અને જ્યારે તમે ઓનલાઇન હો ત્યારે સર્વર અને Google Sheets પર આપોઆપ સિંક થાય છે.",
    color: "#0A7EA4",
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const colors = useColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const progress = useSharedValue(0);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
      progress.value = withTiming((currentIndex + 1) / (SLIDES.length - 1));
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => (
    <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 32, justifyContent: "center", alignItems: "center" }}>
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: item.color + "20",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 40,
        }}
      >
        <IconSymbol name={item.icon} size={56} color={item.color} />
      </View>
      
      <Text
        style={{
          fontSize: 26,
          fontWeight: "bold",
          color: colors.foreground,
          textAlign: "center",
          marginBottom: 16,
          lineHeight: 34,
        }}
      >
        {item.title}
      </Text>
      
      <Text
        style={{
          fontSize: 16,
          color: colors.muted,
          textAlign: "center",
          lineHeight: 24,
          paddingHorizontal: 16,
        }}
      >
        {item.description}
      </Text>
    </View>
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      setCurrentIndex(index);
      progress.value = withTiming(index / (SLIDES.length - 1));
    }
  }).current;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Skip button */}
      <View style={{ position: "absolute", top: 60, right: 20, zIndex: 10 }}>
        <TouchableOpacity onPress={handleSkip} style={{ padding: 8 }}>
          <Text style={{ fontSize: 16, color: colors.muted }}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />
      </View>

      {/* Pagination dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 24 }}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={{
              width: currentIndex === index ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: currentIndex === index ? colors.primary : colors.border,
              marginHorizontal: 4,
            }}
          />
        ))}
      </View>

      {/* Bottom buttons */}
      <View style={{ paddingHorizontal: 32, paddingBottom: 48 }}>
        <TouchableOpacity
          onPress={handleNext}
          style={{
            backgroundColor: colors.primary,
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#fff" }}>
            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
