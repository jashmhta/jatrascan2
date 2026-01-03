export type Language = "en" | "hi" | "gu";

export interface Translations {
  // App
  appName: string;
  appTagline: string;
  
  // Tabs
  tabScan: string;
  tabCheckpoints: string;
  tabPilgrims: string;
  tabReports: string;
  tabSettings: string;
  
  // Scanner Screen
  tapToScan: string;
  manual: string;
  search: string;
  recentScans: string;
  noScansYet: string;
  enterBadgeNumber: string;
  recordCheckpoint: string;
  searchPilgrim: string;
  searchPlaceholder: string;
  noPilgrimsFound: string;
  typeToSearch: string;
  
  // Checkpoints
  checkpoint: string;
  checkpoints: string;
  aamli: string;
  gheti: string;
  checkpointX: string;
  aamliDesc: string;
  ghetiDesc: string;
  checkpointXDesc: string;
  jatraCompletion: string;
  today: string;
  total: string;
  
  // Participants
  pilgrims: string;
  registeredPilgrims: string;
  all: string;
  descending: string;
  completedJatras: string;
  sortBy: string;
  badgeNumber: string;
  name: string;
  jatras: string;
  showing: string;
  of: string;
  
  // Reports
  reports: string;
  statistics: string;
  totalJatras: string;
  totalScans: string;
  pilgrimsToday: string;
  currentlyDescending: string;
  checkpointBreakdown: string;
  topPilgrims: string;
  
  // Settings
  settings: string;
  customize: string;
  language: string;
  feedback: string;
  soundEffects: string;
  playSounds: string;
  hapticFeedback: string;
  vibrateOnScan: string;
  dataManagement: string;
  syncNow: string;
  pendingScans: string;
  offlineWillSync: string;
  clearCache: string;
  redownloadData: string;
  localData: string;
  pending: string;
  about: string;
  version: string;
  
  // Scan Results
  scanSuccess: string;
  scanError: string;
  duplicateScan: string;
  pilgrimNotFound: string;
  jatraCompleted: string;
  alreadyScanned: string;
  tapToDismiss: string;
  
  // Sync Status
  online: string;
  offline: string;
  syncing: string;
  lastSync: string;
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  never: string;
  
  // Participant Detail
  personalInfo: string;
  age: string;
  years: string;
  bloodGroup: string;
  emergency: string;
  scanHistory: string;
  scans: string;
  noScansRecorded: string;
  jatra: string;
  
  // Misc
  cancel: string;
  confirm: string;
  goBack: string;
  loading: string;
  error: string;
  success: string;
  warning: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // App
    appName: "Palitana Yatra Tracker",
    appTagline: "Pilgrims • Checkpoints",
    
    // Tabs
    tabScan: "Scan",
    tabCheckpoints: "Checkpoints",
    tabPilgrims: "Pilgrims",
    tabReports: "Reports",
    tabSettings: "Settings",
    
    // Scanner Screen
    tapToScan: "Tap to Scan",
    manual: "Manual",
    search: "Search",
    recentScans: "Recent Scans",
    noScansYet: "No scans yet",
    enterBadgeNumber: "Enter Badge Number",
    recordCheckpoint: "Record Checkpoint",
    searchPilgrim: "Search Pilgrim",
    searchPlaceholder: "Search by name or badge number",
    noPilgrimsFound: "No pilgrims found",
    typeToSearch: "Type to search...",
    
    // Checkpoints
    checkpoint: "Checkpoint",
    checkpoints: "Checkpoints",
    aamli: "Aamli",
    gheti: "Gheti",
    checkpointX: "X",
    aamliDesc: "Midway point on Gheti route",
    ghetiDesc: "Bottom of Gheti route (Jatra completion)",
    checkpointXDesc: "Front Side route",
    jatraCompletion: "Jatra completion checkpoint",
    today: "Today",
    total: "Total",
    
    // Participants
    pilgrims: "Pilgrims",
    registeredPilgrims: "registered pilgrims",
    all: "All",
    descending: "Descending",
    completedJatras: "Completed Jatras",
    sortBy: "Sort by",
    badgeNumber: "Badge #",
    name: "Name",
    jatras: "Jatras",
    showing: "Showing",
    of: "of",
    
    // Reports
    reports: "Reports",
    statistics: "Pilgrimage statistics and insights",
    totalJatras: "Total Jatras",
    totalScans: "Total Scans",
    pilgrimsToday: "Pilgrims Today",
    currentlyDescending: "Currently on hill",
    checkpointBreakdown: "Checkpoint Breakdown",
    topPilgrims: "Top Pilgrims by Jatras",
    
    // Settings
    settings: "Settings",
    customize: "Customize your app experience",
    language: "Language",
    feedback: "Feedback",
    soundEffects: "Sound Effects",
    playSounds: "Play sounds on scan",
    hapticFeedback: "Haptic Feedback",
    vibrateOnScan: "Vibrate on scan",
    dataManagement: "Data Management",
    syncNow: "Sync Now",
    pendingScans: "pending scans",
    offlineWillSync: "Offline - will sync when connected",
    clearCache: "Clear Local Cache",
    redownloadData: "Re-download data from server",
    localData: "Local Data",
    pending: "Pending",
    about: "About",
    version: "Version",
    
    // Scan Results
    scanSuccess: "Scan recorded successfully",
    scanError: "Failed to record scan",
    duplicateScan: "Duplicate scan",
    pilgrimNotFound: "Pilgrim not found",
    jatraCompleted: "Jatra completed!",
    alreadyScanned: "Already scanned at this checkpoint within 10 minutes",
    tapToDismiss: "Tap anywhere to dismiss",
    
    // Sync Status
    online: "Online",
    offline: "Offline",
    syncing: "Syncing...",
    lastSync: "Last sync",
    justNow: "Just now",
    minutesAgo: "m ago",
    hoursAgo: "h ago",
    daysAgo: "d ago",
    never: "Never",
    
    // Participant Detail
    personalInfo: "Personal Information",
    age: "Age",
    years: "years",
    bloodGroup: "Blood Group",
    emergency: "Emergency",
    scanHistory: "Scan History",
    scans: "scans",
    noScansRecorded: "No scans recorded yet",
    jatra: "Jatra",
    
    // Misc
    cancel: "Cancel",
    confirm: "Confirm",
    goBack: "Go Back",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    warning: "Warning",
  },
  
  hi: {
    // App
    appName: "पालीताना यात्रा ट्रैकर",
    appTagline: "यात्री • चेकपॉइंट",
    
    // Tabs
    tabScan: "स्कैन",
    tabCheckpoints: "चेकपॉइंट",
    tabPilgrims: "यात्री",
    tabReports: "रिपोर्ट",
    tabSettings: "सेटिंग्स",
    
    // Scanner Screen
    tapToScan: "स्कैन करें",
    manual: "मैनुअल",
    search: "खोजें",
    recentScans: "हाल के स्कैन",
    noScansYet: "अभी तक कोई स्कैन नहीं",
    enterBadgeNumber: "बैज नंबर दर्ज करें",
    recordCheckpoint: "चेकपॉइंट रिकॉर्ड करें",
    searchPilgrim: "यात्री खोजें",
    searchPlaceholder: "नाम या बैज नंबर से खोजें",
    noPilgrimsFound: "कोई यात्री नहीं मिला",
    typeToSearch: "खोजने के लिए टाइप करें...",
    
    // Checkpoints
    checkpoint: "चेकपॉइंट",
    checkpoints: "चेकपॉइंट",
    aamli: "आमली",
    gheti: "घेटी",
    checkpointX: "X",
    aamliDesc: "घेटी मार्ग पर मध्य बिंदु",
    ghetiDesc: "घेटी मार्ग का तल (यात्रा पूर्ण)",
    checkpointXDesc: "सामने का मार्ग",
    jatraCompletion: "यात्रा पूर्णता चेकपॉइंट",
    today: "आज",
    total: "कुल",
    
    // Participants
    pilgrims: "यात्री",
    registeredPilgrims: "पंजीकृत यात्री",
    all: "सभी",
    descending: "उतरते हुए",
    completedJatras: "पूर्ण यात्राएं",
    sortBy: "क्रमबद्ध करें",
    badgeNumber: "बैज #",
    name: "नाम",
    jatras: "यात्राएं",
    showing: "दिखा रहे हैं",
    of: "में से",
    
    // Reports
    reports: "रिपोर्ट",
    statistics: "तीर्थयात्रा आंकड़े और अंतर्दृष्टि",
    totalJatras: "कुल यात्राएं",
    totalScans: "कुल स्कैन",
    pilgrimsToday: "आज के यात्री",
    currentlyDescending: "वर्तमान में पहाड़ी पर",
    checkpointBreakdown: "चेकपॉइंट विवरण",
    topPilgrims: "शीर्ष यात्री",
    
    // Settings
    settings: "सेटिंग्स",
    customize: "अपना ऐप अनुभव अनुकूलित करें",
    language: "भाषा",
    feedback: "प्रतिक्रिया",
    soundEffects: "ध्वनि प्रभाव",
    playSounds: "स्कैन पर ध्वनि बजाएं",
    hapticFeedback: "हैप्टिक फीडबैक",
    vibrateOnScan: "स्कैन पर कंपन",
    dataManagement: "डेटा प्रबंधन",
    syncNow: "अभी सिंक करें",
    pendingScans: "लंबित स्कैन",
    offlineWillSync: "ऑफलाइन - कनेक्ट होने पर सिंक होगा",
    clearCache: "स्थानीय कैश साफ़ करें",
    redownloadData: "सर्वर से डेटा पुनः डाउनलोड करें",
    localData: "स्थानीय डेटा",
    pending: "लंबित",
    about: "के बारे में",
    version: "संस्करण",
    
    // Scan Results
    scanSuccess: "स्कैन सफलतापूर्वक रिकॉर्ड हुआ",
    scanError: "स्कैन रिकॉर्ड करने में विफल",
    duplicateScan: "डुप्लिकेट स्कैन",
    pilgrimNotFound: "यात्री नहीं मिला",
    jatraCompleted: "यात्रा पूर्ण!",
    alreadyScanned: "इस चेकपॉइंट पर 10 मिनट के भीतर पहले ही स्कैन हो चुका है",
    tapToDismiss: "बंद करने के लिए कहीं भी टैप करें",
    
    // Sync Status
    online: "ऑनलाइन",
    offline: "ऑफलाइन",
    syncing: "सिंक हो रहा है...",
    lastSync: "अंतिम सिंक",
    justNow: "अभी",
    minutesAgo: "मि. पहले",
    hoursAgo: "घं. पहले",
    daysAgo: "दि. पहले",
    never: "कभी नहीं",
    
    // Participant Detail
    personalInfo: "व्यक्तिगत जानकारी",
    age: "उम्र",
    years: "वर्ष",
    bloodGroup: "रक्त समूह",
    emergency: "आपातकालीन",
    scanHistory: "स्कैन इतिहास",
    scans: "स्कैन",
    noScansRecorded: "अभी तक कोई स्कैन रिकॉर्ड नहीं",
    jatra: "यात्रा",
    
    // Misc
    cancel: "रद्द करें",
    confirm: "पुष्टि करें",
    goBack: "वापस जाएं",
    loading: "लोड हो रहा है...",
    error: "त्रुटि",
    success: "सफलता",
    warning: "चेतावनी",
  },
  
  gu: {
    // App
    appName: "પાલીતાણા યાત્રા ટ્રેકર",
    appTagline: "યાત્રાળુઓ • ચેકપોઇન્ટ",
    
    // Tabs
    tabScan: "સ્કેન",
    tabCheckpoints: "ચેકપોઇન્ટ",
    tabPilgrims: "યાત્રાળુઓ",
    tabReports: "રિપોર્ટ",
    tabSettings: "સેટિંગ્સ",
    
    // Scanner Screen
    tapToScan: "સ્કેન કરો",
    manual: "મેન્યુઅલ",
    search: "શોધો",
    recentScans: "તાજેતરના સ્કેન",
    noScansYet: "હજુ સુધી કોઈ સ્કેન નથી",
    enterBadgeNumber: "બેજ નંબર દાખલ કરો",
    recordCheckpoint: "ચેકપોઇન્ટ રેકોર્ડ કરો",
    searchPilgrim: "યાત્રાળુ શોધો",
    searchPlaceholder: "નામ અથવા બેજ નંબરથી શોધો",
    noPilgrimsFound: "કોઈ યાત્રાળુ મળ્યા નથી",
    typeToSearch: "શોધવા માટે ટાઇપ કરો...",
    
    // Checkpoints
    checkpoint: "ચેકપોઇન્ટ",
    checkpoints: "ચેકપોઇન્ટ",
    aamli: "આમલી",
    gheti: "ઘેટી",
    checkpointX: "X",
    aamliDesc: "ઘેટી માર્ગ પર મધ્ય બિંદુ",
    ghetiDesc: "ઘેટી માર્ગનો તળ (યાત્રા પૂર્ણ)",
    checkpointXDesc: "આગળનો માર્ગ",
    jatraCompletion: "યાત્રા પૂર્ણતા ચેકપોઇન્ટ",
    today: "આજે",
    total: "કુલ",
    
    // Participants
    pilgrims: "યાત્રાળુઓ",
    registeredPilgrims: "નોંધાયેલા યાત્રાળુઓ",
    all: "બધા",
    descending: "ઉતરતા",
    completedJatras: "પૂર્ણ યાત્રાઓ",
    sortBy: "ક્રમબદ્ધ કરો",
    badgeNumber: "બેજ #",
    name: "નામ",
    jatras: "યાત્રાઓ",
    showing: "બતાવી રહ્યા છે",
    of: "માંથી",
    
    // Reports
    reports: "રિપોર્ટ",
    statistics: "તીર્થયાત્રા આંકડા અને આંતરદૃષ્ટિ",
    totalJatras: "કુલ યાત્રાઓ",
    totalScans: "કુલ સ્કેન",
    pilgrimsToday: "આજના યાત્રાળુઓ",
    currentlyDescending: "હાલમાં ટેકરી પર",
    checkpointBreakdown: "ચેકપોઇન્ટ વિગતો",
    topPilgrims: "ટોચના યાત્રાળુઓ",
    
    // Settings
    settings: "સેટિંગ્સ",
    customize: "તમારો એપ અનુભવ કસ્ટમાઇઝ કરો",
    language: "ભાષા",
    feedback: "પ્રતિસાદ",
    soundEffects: "ધ્વનિ અસરો",
    playSounds: "સ્કેન પર અવાજ વગાડો",
    hapticFeedback: "હેપ્ટિક ફીડબેક",
    vibrateOnScan: "સ્કેન પર વાઇબ્રેટ",
    dataManagement: "ડેટા મેનેજમેન્ટ",
    syncNow: "હમણાં સિંક કરો",
    pendingScans: "બાકી સ્કેન",
    offlineWillSync: "ઓફલાઇન - કનેક્ટ થયા પછી સિંક થશે",
    clearCache: "સ્થાનિક કેશ સાફ કરો",
    redownloadData: "સર્વરથી ડેટા ફરીથી ડાઉનલોડ કરો",
    localData: "સ્થાનિક ડેટા",
    pending: "બાકી",
    about: "વિશે",
    version: "સંસ્કરણ",
    
    // Scan Results
    scanSuccess: "સ્કેન સફળતાપૂર્વક રેકોર્ડ થયું",
    scanError: "સ્કેન રેકોર્ડ કરવામાં નિષ્ફળ",
    duplicateScan: "ડુપ્લિકેટ સ્કેન",
    pilgrimNotFound: "યાત્રાળુ મળ્યા નથી",
    jatraCompleted: "યાત્રા પૂર્ણ!",
    alreadyScanned: "આ ચેકપોઇન્ટ પર 10 મિનિટની અંદર પહેલેથી જ સ્કેન થયેલ છે",
    tapToDismiss: "બંધ કરવા માટે ક્યાંય પણ ટેપ કરો",
    
    // Sync Status
    online: "ઓનલાઇન",
    offline: "ઓફલાઇન",
    syncing: "સિંક થઈ રહ્યું છે...",
    lastSync: "છેલ્લું સિંક",
    justNow: "હમણાં જ",
    minutesAgo: "મિ. પહેલાં",
    hoursAgo: "ક. પહેલાં",
    daysAgo: "દિ. પહેલાં",
    never: "ક્યારેય નહીં",
    
    // Participant Detail
    personalInfo: "વ્યક્તિગત માહિતી",
    age: "ઉંમર",
    years: "વર્ષ",
    bloodGroup: "રક્ત જૂથ",
    emergency: "કટોકટી",
    scanHistory: "સ્કેન ઇતિહાસ",
    scans: "સ્કેન",
    noScansRecorded: "હજુ સુધી કોઈ સ્કેન રેકોર્ડ નથી",
    jatra: "યાત્રા",
    
    // Misc
    cancel: "રદ કરો",
    confirm: "પુષ્ટિ કરો",
    goBack: "પાછા જાઓ",
    loading: "લોડ થઈ રહ્યું છે...",
    error: "ભૂલ",
    success: "સફળતા",
    warning: "ચેતવણી",
  },
};

export function getTranslation(lang: Language): Translations {
  return translations[lang] || translations.en;
}
