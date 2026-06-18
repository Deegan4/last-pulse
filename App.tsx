import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Brawl Arena</Text>
      <Text style={styles.subtitle}>Expo Go game — start building in App.tsx</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e1116',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#9aa4b2',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
});
