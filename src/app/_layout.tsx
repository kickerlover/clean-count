import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PickerHost } from '@/components/DatePicker';
import { ClockProvider, readNow } from '@/hooks/clock';
import { useLanguage } from '@/hooks/useLanguage';
import { t } from '@/i18n';
import { useAppStore } from '@/store/appStore';
import { colors, createStyles, fonts } from '@/theme';
import { fontAssets } from '@/theme/fonts';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const status = useAppStore((s) => s.status);
  const load = useAppStore((s) => s.load);
  useLanguage();

  useEffect(() => {
    load(readNow().today);
  }, [load]);

  const ready = (fontsLoaded || !!fontError) && status !== 'loading';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ClockProvider>
          <StatusBar style="dark" />
          {status === 'error' ? (
            <View style={styles.error}>
              <Text style={styles.errorTitle}>{t.errors.title}</Text>
              <Text style={styles.errorText}>{t.errors.dbOpen}</Text>
            </View>
          ) : (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" options={{ animation: 'none' }} />
              <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="main" options={{ animation: 'fade', gestureEnabled: false }} />
            </Stack>
          )}
          <PickerHost />
        </ClockProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = createStyles({
  root: { flex: 1, backgroundColor: colors.background },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8, backgroundColor: colors.background },
  errorTitle: { fontFamily: fonts.display700, fontSize: 20, color: colors.textPrimary, textAlign: 'center' },
  errorText: { fontFamily: fonts.text400, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
});
